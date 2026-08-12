<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ReponseQuestionnaire;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReponseController extends Controller
{
    /**
     * Enregistre ou met à jour une réponse à une question
     * pour un ménage.
     *
     * parcelle_id est optionnel. Lorsqu'il n'est pas fourni,
     * la réponse est considérée comme une réponse générale
     * au niveau du ménage.
     */
    public function store(Request $request)
    {
        $donnees = $request->validate([
            'menage_id' => [
                'required',
                'exists:menages,id',
            ],

            'parcelle_id' => [
                'nullable',
                'exists:parcelles,id',
            ],

            'question_id' => [
                'required',
                'exists:questions,id',
            ],

            'valeur' => [
                'required',
            ],
        ]);

        $reponse = ReponseQuestionnaire::updateOrCreate(
            [
                'menage_id' => $donnees['menage_id'],
                'parcelle_id' => $donnees['parcelle_id'] ?? null,
                'question_id' => $donnees['question_id'],
            ],
            [
                'valeur' => $donnees['valeur'],
            ]
        );

        return response()->json([
            'data' => $reponse,
        ], 201);
    }


    /**
     * Enregistre plusieurs réponses en une seule requête.
     *
     * Exemple:
     *
     * {
     *     "reponses": [
     *         {
     *             "menage_id": 1,
     *             "question_id": 1,
     *             "valeur": 5
     *         },
     *         {
     *             "menage_id": 1,
     *             "question_id": 2,
     *             "valeur": ["Fertilisation organique"]
     *         }
     *     ]
     * }
     */
    public function storeLot(Request $request)
    {
        $donnees = $request->validate([
            'reponses' => [
                'required',
                'array',
                'min:1',
            ],

            'reponses.*.menage_id' => [
                'required',
                'exists:menages,id',
            ],

            'reponses.*.parcelle_id' => [
                'nullable',
                'exists:parcelles,id',
            ],

            'reponses.*.question_id' => [
                'required',
                'exists:questions,id',
            ],

            'reponses.*.valeur' => [
                'required',
            ],
        ]);

        $enregistrees = DB::transaction(function () use ($donnees) {
            return collect($donnees['reponses'])->map(
                function (array $reponse) {
                    return ReponseQuestionnaire::updateOrCreate(
                        [
                            'menage_id' => $reponse['menage_id'],

                            'parcelle_id' =>
                                $reponse['parcelle_id'] ?? null,

                            'question_id' =>
                                $reponse['question_id'],
                        ],
                        [
                            'valeur' =>
                                $reponse['valeur'],
                        ]
                    );
                }
            );
        });

        return response()->json([
            'data' => $enregistrees->values(),
            'total' => $enregistrees->count(),
        ], 201);
    }
}
