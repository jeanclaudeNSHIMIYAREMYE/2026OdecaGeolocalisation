<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\QuestionnaireVersion;

class QuestionnaireController extends Controller
{
    /**
     * Retourne la version active du questionnaire avec ses questions
     * ordonnées, afin que l'application mobile puisse construire
     * dynamiquement le formulaire.
     */
    public function actif()
    {
        $version = QuestionnaireVersion::where('actif', true)
            ->with('questions')
            ->latest('id')
            ->first();

        if (! $version) {
            return response()->json([
                'message' => 'Aucun questionnaire actif.',
            ], 404);
        }

        return response()->json([
            'data' => [
                'id' => $version->id,
                'nom' => $version->nom,

                'questions' => $version->questions->map(
                    fn ($q) => [
                        'id' => $q->id,
                        'code' => $q->code,
                        'libelle' => $q->libelle,
                        'section' => $q->section,
                        'type' => $q->type,
                        'options' => $q->options,
                        'obligatoire' => $q->obligatoire,
                        'condition' => $q->condition,
                        'autre_option' => $q->autre_option,
                        'termine_si' => $q->termine_si,
                        'ordre' => $q->ordre,
                    ]
                )->values(),
            ],
        ]);
    }
}
