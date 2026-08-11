<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\QuestionnaireVersion;

class QuestionnaireController extends Controller
{
    /**
     * Retourne la version active du questionnaire avec ses questions
     * ordonnées, pour que l'app mobile construise le formulaire de collecte
     * localement et fonctionne sans connexion sur le terrain.
     */
    public function actif()
    {
        $version = QuestionnaireVersion::where('actif', true)
            ->with('questions')
            ->latest('id')
            ->first();

        if (! $version) {
            return response()->json(['message' => 'Aucun questionnaire actif.'], 404);
        }

        return response()->json([
            'data' => [
                'id' => $version->id,
                'nom' => $version->nom,
                'questions' => $version->questions->map(fn ($q) => [
                    'id' => $q->id,
                    'code' => $q->code,
                    'libelle' => $q->libelle,
                    'section' => $q->section,
                    'type' => $q->type,
                    'options' => $q->options,
                    'obligatoire' => $q->obligatoire,
                    'autre_option' => $q->autre_option,
                    'ordre' => $q->ordre,
                ]),
            ],
        ]);
    }
}
