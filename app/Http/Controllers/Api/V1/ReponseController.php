<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ReponseQuestionnaire;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReponseController extends Controller
{
    /**
     * Enregistre (ou met à jour, s'il existe déjà) la réponse à une question
     * pour un ménage/parcelle donné. La contrainte unique (menage_id,
     * parcelle_id, question_id) permet un upsert idempotent — pratique
     * quand l'app mobile rejoue une soumission après une coupure réseau.
     */
    public function store(Request $request)
    {
        $donnees = $request->validate([
            'menage_id' => ['required', 'exists:menages,id'],
            'parcelle_id' => ['nullable', 'exists:parcelles,id'],
            'question_id' => ['required', 'exists:questions,id'],
            'valeur' => ['required'],
        ]);

        $reponse = ReponseQuestionnaire::updateOrCreate(
            [
                'menage_id' => $donnees['menage_id'],
                'parcelle_id' => $donnees['parcelle_id'] ?? null,
                'question_id' => $donnees['question_id'],
            ],
            ['valeur' => $donnees['valeur']]
        );

        return response()->json(['data' => $reponse], 201);
    }

    /**
     * Enregistre un lot de réponses en une seule requête : c'est le mode
     * utilisé par l'app mobile à la soumission d'un formulaire terrain
     * complet (souvent 15-40 questions d'un coup).
     */
    public function storeLot(Request $request)
    {
        $donnees = $request->validate([
            'reponses' => ['required', 'array', 'min:1'],
            'reponses.*.menage_id' => ['required', 'exists:menages,id'],
            'reponses.*.parcelle_id' => ['nullable', 'exists:parcelles,id'],
            'reponses.*.question_id' => ['required', 'exists:questions,id'],
            'reponses.*.valeur' => ['required'],
        ]);

        $enregistrees = DB::transaction(function () use ($donnees) {
            return collect($donnees['reponses'])->map(
                fn (array $r) => ReponseQuestionnaire::updateOrCreate(
                    [
                        'menage_id' => $r['menage_id'],
                        'parcelle_id' => $r['parcelle_id'] ?? null,
                        'question_id' => $r['question_id'],
                    ],
                    ['valeur' => $r['valeur']]
                )
            );
        });

        return response()->json(['data' => $enregistrees, 'total' => $enregistrees->count()], 201);
    }
}
