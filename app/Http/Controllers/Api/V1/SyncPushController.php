<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Menage;
use App\Models\Parcelle;
use App\Models\ReponseQuestionnaire;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * POST /v1/sync/push
 *
 * Reçoit en une seule requête tous les ménages, parcelles
 * et réponses en attente de synchronisation depuis le mobile.
 *
 * Traitement dans l'ordre :
 *   1. Ménages   → upsert → mapping _local_id → server_id
 *   2. Parcelles → résolution menage_id via mapping → upsert
 *   3. Réponses  → résolution menage_id via mapping → upsert
 *
 * Réponse :
 * {
 *   "mappings": {
 *     "menages":   { "<_local_id>": <server_id>, ... },
 *     "parcelles": { "<_local_id>": <server_id>, ... },
 *     "reponses":  { "<_local_id>": <server_id>, ... }
 *   },
 *   "errors": [
 *     { "_local_id": "...", "type": "menage", "message": "..." },
 *     ...
 *   ]
 * }
 */
class SyncPushController extends Controller
{
    public function push(Request $request)
    {
        /*
         * IMPORTANT : on utilise $request->input() et NON $request->validate().
         *
         * $request->validate() ne retourne que les champs explicitement
         * listés dans les règles → les autres champs (colline_id,
         * nom_chef_menage, etc.) disparaissent du tableau retourné.
         *
         * On valide uniquement la structure minimale, mais on lit
         * le payload complet via $request->input().
         */
        $request->validate([
            'menages'   => 'nullable|array',
            'parcelles' => 'nullable|array',
            'reponses'  => 'nullable|array',
        ]);

        // Lire le payload complet (tous les champs inclus)
        $menages   = $request->input('menages',   []);
        $parcelles = $request->input('parcelles', []);
        $reponses  = $request->input('reponses',  []);

        $mappingMenages   = [];   // _local_id => server_id
        $mappingParcelles = [];
        $mappingReponses  = [];
        $errors           = [];

        DB::beginTransaction();

        try {
            /*
             * ================================================================
             * ÉTAPE 1 : MÉNAGES
             * ================================================================
             */
            foreach ($menages as $m) {
                $localId = $m['_local_id'] ?? null;

                if (!$localId) continue;

                try {
                    $menage = Menage::updateOrCreate(
                        ['code_menage' => $m['code_menage']],
                        [
                            'type_menage'                => $m['type_menage'] ?? null,
                            'nom_chef_menage'            => $m['nom_chef_menage'] ?? null,
                            'prenom_chef_menage'         => $m['prenom_chef_menage'] ?? null,
                            'telephone'                  => $m['telephone'] ?? null,
                            'cni'                        => $m['cni'] ?? null,
                            'photo_proprietaire'         => $m['photo_proprietaire'] ?? null,
                            'photo_piece_identification' => $m['photo_piece_identification'] ?? null,
                            'colline_id'                 => $m['colline_id'] ?? null,
                            'statut'                     => $m['statut'] ?? 'a_faire',
                            'source'                     => $m['source'] ?? 'terrain',
                            'enqueteur_id'               => $m['enqueteur_id'] ?? null,
                            'cree_par_id'                => $m['cree_par_id'] ?? null,
                            'date_derniere_activite'     => $m['date_derniere_activite'] ?? now(),
                        ]
                    );

                    $mappingMenages[$localId] = $menage->id;
                } catch (\Throwable $e) {
                    $errors[] = [
                        '_local_id' => $localId,
                        'type'      => 'menage',
                        'message'   => $e->getMessage(),
                    ];
                }
            }

            /*
             * ================================================================
             * ÉTAPE 2 : PARCELLES
             * ================================================================
             */
            foreach ($parcelles as $p) {
                $localId = $p['_local_id'] ?? null;

                if (!$localId) continue;

                try {
                    /*
                     * Résoudre le menage_id :
                     *   - Priorité 1 : menage_id fourni directement (ménage déjà sync)
                     *   - Priorité 2 : _menage_local_id → résolu via le mapping étape 1
                     */
                    $menageLocalId = $p['_menage_local_id'] ?? null;
                    $menageId      = $p['menage_id'] ?? null;

                    if (!$menageId && $menageLocalId) {
                        $menageId = $mappingMenages[$menageLocalId] ?? null;
                    }

                    if (!$menageId) {
                        throw new \Exception("menage_id introuvable pour la parcelle (local: {$menageLocalId}).");
                    }

                    $polygone = null;
                    if (!empty($p['polygone'])) {
                        $polygone = is_array($p['polygone'])
                            ? json_encode($p['polygone'])
                            : $p['polygone'];
                    }

                    $donneesCommunes = [
                        'menage_id'                  => $menageId,
                        'nombre_pieds'               => $p['nombre_pieds'] ?? null,
                        'annee_mise_en_place'        => $p['annee_mise_en_place'] ?? null,
                        'surface_verger'             => $p['surface_verger'] ?? null,
                        'etat_verger'                => $p['etat_verger'] ?? null,
                        'type'                       => $p['type'] ?? null,
                        'latitude'                   => $p['latitude'] ?? null,
                        'longitude'                  => $p['longitude'] ?? null,
                        'altitude'                   => $p['altitude'] ?? null,
                        'polygone'                   => $polygone,
                        'mode_positionnement'        => $p['mode_positionnement'] ?? null,
                        'mode_acquisition'           => $p['mode_acquisition'] ?? null,
                        'piece_justificative'        => $p['piece_justificative'] ?? null,
                        'piece_justificative_photo'  => $p['piece_justificative_photo'] ?? null,
                        'notes'                      => $p['notes'] ?? null,
                        'autres_donnees'             => $p['autres_donnees'] ?? null,
                    ];

                    $serverId = $p['server_id'] ?? null;

                    if ($serverId) {
                        $parcelle = Parcelle::findOrFail($serverId);
                        $parcelle->update($donneesCommunes);
                    } else {
                        $parcelle = Parcelle::create($donneesCommunes);
                    }

                    $mappingParcelles[$localId] = $parcelle->id;
                } catch (\Throwable $e) {
                    $errors[] = [
                        '_local_id' => $localId,
                        'type'      => 'parcelle',
                        'message'   => $e->getMessage(),
                    ];
                }
            }

            /*
             * ================================================================
             * ÉTAPE 3 : RÉPONSES
             * ================================================================
             */
            foreach ($reponses as $r) {
                $localId = $r['_local_id'] ?? null;

                if (!$localId) continue;

                try {
                    $menageLocalId = $r['_menage_local_id'] ?? null;
                    $menageId      = $r['menage_id'] ?? null;

                    if (!$menageId && $menageLocalId) {
                        $menageId = $mappingMenages[$menageLocalId] ?? null;
                    }

                    if (!$menageId) {
                        throw new \Exception("menage_id introuvable pour la réponse (local: {$menageLocalId}).");
                    }

                    $questionId = $r['question_id'] ?? null;

                    if (!$questionId) {
                        throw new \Exception("question_id manquant pour la réponse.");
                    }

                    // Sérialiser la valeur si c'est un tableau/objet
                    $valeur = $r['valeur'] ?? null;
                    if (is_array($valeur)) {
                        $valeur = json_encode($valeur);
                    }

                    $reponse = ReponseQuestionnaire::updateOrCreate(
                        [
                            'menage_id'   => $menageId,
                            'question_id' => $questionId,
                        ],
                        [
                            'valeur' => $valeur,
                        ]
                    );

                    $mappingReponses[$localId] = $reponse->id;
                } catch (\Throwable $e) {
                    $errors[] = [
                        '_local_id' => $localId,
                        'type'      => 'reponse',
                        'message'   => $e->getMessage(),
                    ];
                }
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Erreur critique lors de la synchronisation.',
                'error'   => $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'mappings' => [
                'menages'   => $mappingMenages,
                'parcelles' => $mappingParcelles,
                'reponses'  => $mappingReponses,
            ],
            'errors' => $errors,
        ]);
    }
}