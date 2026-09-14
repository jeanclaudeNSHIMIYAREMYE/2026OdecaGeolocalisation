<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Menage;
use Illuminate\Http\Request;

class AccueilController extends Controller
{
    /**
     * Données nécessaires à l'écran d'accueil de l'application mobile.
     *
     * Un ménage est considéré comme terminé lorsqu'il possède :
     * - au moins une parcelle
     * - au moins une réponse au questionnaire
     *
     * Le ménage à continuer est le dernier ménage qui n'a :
     * - aucune parcelle
     * - aucune réponse au questionnaire
     */
    public function index(Request $request)
    {
        $user = $request->user();

        /*
         * Base des ménages accessibles par l'enquêteur connecté.
         *
         * Si tous les utilisateurs doivent voir tous les ménages,
         * vous pouvez simplement utiliser :
         *
         * $query = Menage::query();
         */
        $query = Menage::query();

        // Si vos ménages sont assignés à un enquêteur :
        if ($user) {
            //$query->where('enqueteur_id', $user->id);
            $query->visiblePour($user);
        }

        /*
         * Total des ménages assignés
         */
        $totalMenages = (clone $query)->count();

        /*
         * Ménages terminés :
         * - au moins une parcelle
         * - au moins une réponse au questionnaire
         */
        $menagesTermines = (clone $query)
            ->whereHas('parcelles')
            ->whereHas('reponses')
            ->count();

        /*
         * Ménages en attente :
         *
         * Pour l'instant, on considère comme "en attente" les ménages
         * qui ont commencé le questionnaire ou enregistré une parcelle,
         * mais qui ne sont pas encore terminés.
         */
        $menagesEnAttente = (clone $query)
            ->where(function ($q) {
                $q->whereHas('parcelles')
                    ->orWhereHas('reponses');
            })
            ->where(function ($q) {
                $q->whereDoesntHave('parcelles')
                    ->orWhereDoesntHave('reponses');
            })
            ->count();

        /*
         * Dernier ménage qui n'a encore :
         * - aucune parcelle
         * - aucune réponse
         *
         * C'est celui que le bouton "Continuer" doit ouvrir.
         */
        $menageAContinuer = (clone $query)
            ->whereDoesntHave('parcelles')
            ->whereDoesntHave('reponses')
            ->latest('id')
            ->first();

        return response()->json([
            'data' => [
                'utilisateur' => [
                    'id' => $user?->id,
                    'nom' => $user?->name,
                ],

                'total_menages' => $totalMenages,

                'menages_termines' => $menagesTermines,

                'menages_en_attente' => $menagesEnAttente,

                'progression' => $totalMenages > 0
                    ? round(($menagesTermines / $totalMenages) * 100)
                    : 0,

                'menage_a_continuer' => $menageAContinuer
                    ? [
                        'id' => $menageAContinuer->id,
                        'code_menage' => $menageAContinuer->code_menage,
                        'prenom_chef_menage' => $menageAContinuer->prenom_chef_menage,
                        'nom_chef_menage' => $menageAContinuer->nom_chef_menage,
                    ]
                    : null,
            ],
        ]);
    }
}
