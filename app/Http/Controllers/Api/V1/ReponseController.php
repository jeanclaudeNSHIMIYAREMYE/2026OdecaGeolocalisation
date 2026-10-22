<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Menage;
use App\Models\Parcelle;
use App\Models\ReponseQuestionnaire;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ReponseController extends Controller
{
    /**
     * Enregistre ou met à jour une réponse à une question pour un ménage.
     *
     * parcelle_id est optionnel. Lorsqu'il n'est pas fourni, la réponse est
     * considérée comme une réponse générale au niveau du ménage.
     * Si parcelle_id est fourni, la parcelle doit appartenir au ménage.
     */
    public function store(Request $request): JsonResponse
    {
        $donnees = $request->validate([
            'menage_id' => ['required', 'exists:menages,id'],

            // La parcelle doit exister ET appartenir au ménage indiqué.
            'parcelle_id' => [
                'nullable',
                Rule::exists('parcelles', 'id')
                    ->where('menage_id', $request->input('menage_id')),
            ],

            'question_id' => ['required', 'exists:questions,id'],
            'valeur' => ['required'],
        ]);

        // Transaction : la réponse et la mise à jour du ménage sont enregistrées
        // ensemble, ou pas du tout.
        $reponse = DB::transaction(function () use ($donnees, $request) {
            $reponse = ReponseQuestionnaire::updateOrCreate(
                [
                    'menage_id' => $donnees['menage_id'],
                    'parcelle_id' => $donnees['parcelle_id'] ?? null,
                    'question_id' => $donnees['question_id'],
                ],
                [
                    'valeur' => $this->normaliserValeur($donnees['valeur']),
                ]
            );

            $this->mettreAJourMenage((int) $donnees['menage_id'], $request->user());

            return $reponse;
        });

        return response()->json([
            'data' => $reponse,
        ], 201);
    }

    /**
     * Enregistre plusieurs réponses en une seule requête.
     *
     * Exemple :
     *
     * {
     *     "reponses": [
     *         { "menage_id": 1, "question_id": 1, "valeur": 5 },
     *         { "menage_id": 1, "question_id": 2, "valeur": ["Fertilisation organique"] }
     *     ]
     * }
     */
    public function storeLot(Request $request): JsonResponse
    {
        $donnees = $request->validate([
            'reponses' => ['required', 'array', 'min:1'],
            'reponses.*.menage_id' => ['required', 'exists:menages,id'],
            'reponses.*.parcelle_id' => ['nullable', 'exists:parcelles,id'],
            'reponses.*.question_id' => ['required', 'exists:questions,id'],
            'reponses.*.valeur' => ['required'],
        ]);

        // Chaque parcelle indiquée doit appartenir au ménage de sa réponse.
        $this->verifierParcellesDesMenages($donnees['reponses']);

        $enregistrees = DB::transaction(function () use ($donnees, $request) {
            // 1) Enregistrer toutes les réponses.
            $reponses = collect($donnees['reponses'])->map(
                fn (array $reponse) => ReponseQuestionnaire::updateOrCreate(
                    [
                        'menage_id' => $reponse['menage_id'],
                        'parcelle_id' => $reponse['parcelle_id'] ?? null,
                        'question_id' => $reponse['question_id'],
                    ],
                    [
                        'valeur' => $this->normaliserValeur($reponse['valeur']),
                    ]
                )
            );

            // 2) Mettre à jour chaque ménage concerné UNE seule fois
            //    (et non une fois par réponse), après l'enregistrement des réponses,
            //    pour que le calcul du statut « terminé » soit juste.
            collect($donnees['reponses'])
                ->pluck('menage_id')
                ->unique()
                ->each(fn ($menageId) => $this->mettreAJourMenage((int) $menageId, $request->user()));

            return $reponses;
        });

        return response()->json([
            'data' => $enregistrees->values(),
            'total' => $enregistrees->count(),
        ], 201);
    }

    /**
     * Met à jour le ménage après une saisie : date de dernière activité,
     * enquêteur et statut « terminé ».
     *
     * L'enquêteur du ménage n'est modifié que si c'est un enquêteur qui saisit.
     * Un superviseur ou un administrateur qui corrige une réponse ne doit pas
     * devenir l'enquêteur du ménage.
     */
    private function mettreAJourMenage(int $menageId, $utilisateur): void
    {
        $menage = Menage::findOrFail($menageId);

        $champs = ['date_derniere_activite' => now()];

        if ($utilisateur && $utilisateur->role === 'enqueteur') {
            $champs['enqueteur_id'] = $utilisateur->id;
        }

        $menage->update($champs);

        // Recalcule le statut du ménage une fois les réponses enregistrées.
        $menage->verifierStatutTermine();
    }

    /**
     * Vérifie que chaque parcelle_id d'un lot appartient bien au menage_id
     * de la même réponse. Une seule requête SQL pour tout le lot.
     *
     * @throws ValidationException
     */
    private function verifierParcellesDesMenages(array $reponses): void
    {
        $parcelleIds = collect($reponses)
            ->pluck('parcelle_id')
            ->filter()
            ->unique();

        if ($parcelleIds->isEmpty()) {
            return;
        }

        // [id_parcelle => menage_id]
        $proprietaires = Parcelle::whereIn('id', $parcelleIds)->pluck('menage_id', 'id');

        foreach ($reponses as $index => $reponse) {
            $parcelleId = $reponse['parcelle_id'] ?? null;

            if ($parcelleId && (int) $proprietaires[$parcelleId] !== (int) $reponse['menage_id']) {
                throw ValidationException::withMessages([
                    "reponses.$index.parcelle_id" => 'Cette parcelle n\'appartient pas à ce ménage.',
                ]);
            }
        }
    }

    /**
     * Normalise la valeur reçue depuis Postman ou l'application mobile
     * en texte, pour l'enregistrer dans une seule colonne.
     */
    private function normaliserValeur(mixed $valeur): string
    {
        if (is_array($valeur)) {
            // Choix unique : {"valeur": "Oui", "indexOption": 0}
            if (array_key_exists('valeur', $valeur)) {
                $valeur = $valeur['valeur'];
            }
            // Choix multiples : {"valeurs": ["Option 1", "Option 2"]}
            elseif (array_key_exists('valeurs', $valeur)) {
                $valeur = $valeur['valeurs'];
            }
        }

        // Une liste de choix multiples reste un tableau JSON.
        // JSON_THROW_ON_ERROR évite que json_encode renvoie false (erreur de type).
        if (is_array($valeur)) {
            return json_encode(
                array_values($valeur),
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
            );
        }

        if (is_bool($valeur)) {
            return $valeur ? 'true' : 'false';
        }

        if ($valeur === null) {
            return '';
        }

        return (string) $valeur;
    }
}
