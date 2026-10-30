<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreParcelleRequest;
use App\Http\Resources\Api\ParcelleResource;
use App\Models\Menage;
use App\Models\Parcelle;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class ParcelleController extends Controller
{
    public function index(Menage $menage)
    {
        $parcelles = $menage->parcelles()
            ->orderByDesc('updated_at')
            ->get();

        return ParcelleResource::collection($parcelles);
    }

    public function store(StoreParcelleRequest $request, Menage $menage)
    {
        $data = $request->validated();

        /*
         * Upload de la photo de la pièce justificative
         */
        if ($request->hasFile('piece_justificative_photo')) {
            $data['piece_justificative_photo'] = $request
                ->file('piece_justificative_photo')
                ->store('parcelles/pieces-justificatives', 'public');
        }
            Log::info('POLYGONE BEFORE CREATE', [
                'polygone' => $data['polygone'] ?? null,
            ]);

 Log::info('DATA CREATE', [
                'data' => $data ?? null,
            ]);




        $parcelle = $menage->parcelles()->create($data);

        // Mise à jour de l'activité du ménage
        $menage->update([
            'date_derniere_activite' => now(),
            'enqueteur_id' => auth()->id()
        ]);
        $menage->verifierStatutTermine();

        return (new ParcelleResource($parcelle))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Parcelle $parcelle)
    {
        return new ParcelleResource($parcelle);
    }

    public function update(
        StoreParcelleRequest $request,
        Parcelle $parcelle
    ) {
        $data = $request->validated();

        /*
         * Si une nouvelle photo est envoyée,
         * supprimer l'ancienne puis enregistrer la nouvelle.
         */
        if ($request->hasFile('piece_justificative_photo')) {

            if ($parcelle->piece_justificative_photo) {
                Storage::disk('public')->delete(
                    $parcelle->piece_justificative_photo
                );
            }

            $data['piece_justificative_photo'] = $request
                ->file('piece_justificative_photo')
                ->store('parcelles/pieces-justificatives', 'public');
        }

        $parcelle->update($data);

        $parcelle->menage()->update([
            'date_derniere_activite' => now(),
            'enqueteur_id' => auth()->id()
        ]);
        $parcelle->menage()->verifierStatutTermine();

        return new ParcelleResource(
            $parcelle->fresh()
        );
    }

    public function destroy(Parcelle $parcelle)
    {
        /*
         * Supprimer la photo associée avant de supprimer
         * la parcelle.
         */
        if ($parcelle->piece_justificative_photo) {
            Storage::disk('public')->delete(
                $parcelle->piece_justificative_photo
            );
        }

        $menage = $parcelle->menage;

        $parcelle->delete();

        if ($menage) {
            $menage->update([
                'date_derniere_activite' => now(),
            ]);
        }

        return response()->json(null, 204);
    }
}
