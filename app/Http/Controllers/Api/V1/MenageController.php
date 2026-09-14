<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreMenageRequest;
use App\Http\Resources\Api\MenageResource;
use App\Models\Menage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MenageController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $collineIds = $user->collines()->pluck('collines.id');
        $menages = Menage::query()
            ->with('colline')
            //->whereIn('colline_id', $collineIds)
            ->visiblePour($user)
            ->when(
                $request->filled('colline_id'),
                fn ($q) => $q->where(
                    'colline_id',
                    $request->integer('colline_id')
                )
            )
            ->when(
                $request->filled('statut'),
                fn ($q) => $q->where(
                    'statut',
                    $request->string('statut')
                )
            )
            ->when(
                $request->filled('updated_since'),
                fn ($q) => $q->where(
                    'updated_at',
                    '>',
                    $request->date('updated_since')
                )
            )
            ->orderByDesc('updated_at')
            ->paginate(
                $request->integer('per_page', 50)
            );

        return MenageResource::collection($menages);
    }

    public function store(StoreMenageRequest $request)
    {
        $utilisateur = $request->user();

        /*$codeMenage = $request->input('code_menage')
            ?: $this->genererCodeMenage();*/

        $codeMenage = $request->input('code_menage')
            ?: $this->genererCodeMenage(
                $request->integer('colline_id')
            );

        /*
         * Get validated data.
         */
        $data = $request->validated();

        /*
         * Store proprietor photo.
         */
        if ($request->hasFile('photo_proprietaire')) {
            $data['photo_proprietaire'] = $request
                ->file('photo_proprietaire')
                ->store('menages/proprietaires', 'public');
        }

        /*
         * Store identification document photo.
         */
        if ($request->hasFile('photo_piece_identification')) {
            $data['photo_piece_identification'] = $request
                ->file('photo_piece_identification')
                ->store('menages/pieces-identification', 'public');
        }

        /*
         * System-generated fields.
         */
        $data['code_menage'] = $codeMenage;
        $data['source'] = 'terrain';
        $data['statut'] = $request->input('statut', 'a_faire');
        $data['enqueteur_id'] = $utilisateur->id;
        $data['cree_par_id'] = $utilisateur->id;
        $data['date_derniere_activite'] = now();

        $menage = Menage::where(
        'code_menage',
        $data['code_menage']
    )->first();

    if ($menage) {
        return response()->json([
            'message' => 'Ménage déjà enregistré.',
            'menage' => $menage,
            'already_exists' => true,
        ], 200);
    }

        $menage = Menage::create($data);

        return (new MenageResource(
            $menage->load('colline')
        ))
            ->response()
            ->setStatusCode(201);
    }

  public function show(Menage $menage)
{
    return new MenageResource(
        $menage->load([
            'colline.zone.commune.province',
            'parcelles', 'reponses'
        ])
    );
}

    public function update(
        StoreMenageRequest $request,
        Menage $menage
    ) {
        $data = $request->validated();

        /*
         * Replace proprietor photo if a new one was uploaded.
         */
        if ($request->hasFile('photo_proprietaire')) {

            if ($menage->photo_proprietaire) {
                Storage::disk('public')->delete(
                    $menage->photo_proprietaire
                );
            }

            $data['photo_proprietaire'] = $request
                ->file('photo_proprietaire')
                ->store('menages/proprietaires', 'public');
        }

        /*
         * Replace identification document photo if a new one was uploaded.
         */
        if ($request->hasFile('photo_piece_identification')) {

            if ($menage->photo_piece_identification) {
                Storage::disk('public')->delete(
                    $menage->photo_piece_identification
                );
            }

            $data['photo_piece_identification'] = $request
                ->file('photo_piece_identification')
                ->store('menages/pieces-identification', 'public');
        }

        /*
         * Don't allow these fields to be changed through update.
         */
        unset(
            $data['code_menage'],
            $data['source'],
            $data['enqueteur_id'],
            $data['cree_par_id']
        );

        $data['date_derniere_activite'] = now();

        $menage->update($data);

        return new MenageResource(
            $menage->fresh(['colline', 'parcelles'])
        );
    }

    public function destroy(
        Request $request,
        Menage $menage
    ) {
        abort_unless(
            in_array(
                $request->user()->role,
                ['admin', 'superviseur_national'],
                true
            ),
            403,
            "Vous n'avez pas les droits pour supprimer ce ménage."
        );

        /*
         * Delete stored photos.
         */
        if ($menage->photo_proprietaire) {
            Storage::disk('public')->delete(
                $menage->photo_proprietaire
            );
        }

        if ($menage->photo_piece_identification) {
            Storage::disk('public')->delete(
                $menage->photo_piece_identification
            );
        }

        $menage->delete();

        return response()->json(null, 204);
    }

    /*private function genererCodeMenage(): string
    {
        do {
            $code = 'MEN-' . strtoupper(Str::random(8));
        } while (
            Menage::withoutGlobalScopes()
                ->where('code_menage', $code)
                ->exists()
        );

        return $code;
    }*/

        private function genererCodeMenage(int $collineId): string
{
    $colline = \App\Models\Colline::with(
        'zone.commune.province'
    )->findOrFail($collineId);

    $zone = $colline->zone;
    $commune = $zone->commune;
    $province = $commune->province;

    // Administrative codes
    $provinceCode = str_pad(
        $province->code,
        4,
        '0',
        STR_PAD_LEFT
    );

    $communeCode = str_pad(
        $commune->code,
        2,
        '0',
        STR_PAD_LEFT
    );

    $zoneCode = str_pad(
        $zone->code,
        3,
        '0',
        STR_PAD_LEFT
    );

    $collineCode = str_pad(
        $colline->code,
        3,
        '0',
        STR_PAD_LEFT
    );

    do {
        $random = strtoupper(Str::random(5));

        $code = sprintf(
            '%s-%s-%s-%s-%s',
            $provinceCode,
            $communeCode,
            $zoneCode,
            $collineCode,
            $random
        );

    } while (
        Menage::withoutGlobalScopes()
            ->where('code_menage', $code)
            ->exists()
    );

    return $code;
}
}
