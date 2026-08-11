<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreMenageRequest;
use App\Http\Resources\Api\MenageResource;
use App\Models\Menage;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Le filtrage par portée territoriale (province/commune/enquêteur assigné)
 * est déjà appliqué automatiquement par le global scope du modèle Menage
 * (PorteeTerritorialeScope) : un enquêteur ne voit ici que SES ménages,
 * un superviseur communal ceux de sa commune, etc. Rien à refaire ici.
 */
class MenageController extends Controller
{
    public function index(Request $request)
    {
        $menages = Menage::query()
            ->with('colline')
            ->when($request->filled('colline_id'), fn ($q) => $q->where('colline_id', $request->integer('colline_id')))
            ->when($request->filled('statut'), fn ($q) => $q->where('statut', $request->string('statut')))
            ->when($request->filled('updated_since'), fn ($q) => $q->where('updated_at', '>', $request->date('updated_since')))
            ->orderByDesc('updated_at')
            ->paginate($request->integer('per_page', 50));

        return MenageResource::collection($menages);
    }

    public function store(StoreMenageRequest $request)
    {
        $utilisateur = $request->user();

        $codeMenage = $request->input('code_menage') ?: $this->genererCodeMenage();

        $menage = Menage::create([
            ...$request->validated(),
            'code_menage' => $codeMenage,
            'source' => 'terrain',
            'statut' => $request->input('statut', 'a_faire'),
            'enqueteur_id' => $utilisateur->id,
            'cree_par_id' => $utilisateur->id,
            'date_derniere_activite' => now(),
        ]);

        return (new MenageResource($menage->load('colline')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Menage $menage)
    {
        return new MenageResource($menage->load(['colline', 'parcelles']));
    }

    public function update(StoreMenageRequest $request, Menage $menage)
    {
        $menage->update([
            ...$request->validated(),
            'date_derniere_activite' => now(),
        ]);

        return new MenageResource($menage->fresh(['colline', 'parcelles']));
    }

    public function destroy(Request $request, Menage $menage)
    {
        abort_unless(
            in_array($request->user()->role, ['admin', 'superviseur_national'], true),
            403,
            "Vous n'avez pas les droits pour supprimer ce ménage."
        );

        $menage->delete();

        return response()->json(null, 204);
    }

    private function genererCodeMenage(): string
    {
        do {
            $code = 'MEN-'.strtoupper(Str::random(8));
        } while (Menage::withoutGlobalScopes()->where('code_menage', $code)->exists());

        return $code;
    }
}
