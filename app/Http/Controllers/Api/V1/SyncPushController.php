<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Menage;
use App\Models\Parcelle;
use App\Models\ReponseQuestionnaire;
use App\Models\User;
use App\Support\AccesTerritorial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

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

        $user = $request->user();
        $collinesOk = $user->role === 'enqueteur'
            ? $user->collines()->pluck('collines.id')->map(fn ($id) => (int) $id)->all()
            : null; // null = pas de restriction (admin, superviseurs)

        Log::info('Sync push sent data', [
            'menages' => $menages,
            'parcelles' => $parcelles,
            'reponses' => $reponses,
        ]);

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
                    if ($collinesOk !== null) {

                        $collineId = (int) ($m['colline_id'] ?? 0);

                        AccesTerritorial::verifierColline(
                            $user,
                            $collineId
                        );

                        $existant = Menage::withoutGlobalScopes()
                            ->where('code_menage', $m['code_menage'] ?? '')
                            ->first();

                        if (
                            $existant &&
                            !in_array(
                                (int) $existant->colline_id,
                                $collinesOk,
                                true
                            )
                        ) {
                            $affecteACetteColline = $existant->collines()
                                ->whereIn('collines.id', $collinesOk)
                                ->exists();

                            if (! $affecteACetteColline) {
                                throw new \Illuminate\Auth\Access\AuthorizationException(
                                    "Ménage hors de votre périmètre."
                                );
                            }
                        }
                    }

                    $menage = Menage::updateOrCreate(
                        ['code_menage' => $m['code_menage']],
                        [
                            'type_menage'                => $m['type_menage'] ?? null,
                            'nom_chef_menage'            => $m['nom_chef_menage'] ?? null,
                            'prenom_chef_menage'         => $m['prenom_chef_menage'] ?? null,
                            'sexe'                       => $m['sexe'] ?? null,
                            'date_naissance'             => $m['date_naissance'] ?? null,
                            'telephone'                  => $m['telephone'] ?? null,
                            'cni'                        => $m['cni'] ?? null,
                            'photo_proprietaire'         => $m['photo_proprietaire'] ?? null,
                            'photo_piece_identification' => $m['photo_piece_identification'] ?? null,
                            'colline_id'                 => $m['colline_id'] ?? null,
                            'statut'                     => ($m['statut'] ?? 'a_faire') === 'deja_commence'
                                ? 'en_attente'
                                : ($m['statut'] ?? 'a_faire'),
                            'source'                     => in_array(
                                $m['source'] ?? null,
                                ['pre_enregistre', 'terrain'],
                                true
                            )
                                ? $m['source']
                                : 'terrain',
                            'enqueteur_id' => $collinesOk !== null ? $user->id : ($m['enqueteur_id'] ?? null),
                            'cree_par_id'  => $m['cree_par_id'] ?? $user->id,
                            'date_derniere_activite'     => $m['date_derniere_activite'] ?? now(),
                        ]
                    );

                    if ($collinesOk !== null) {
                        $menage->collines()->syncWithoutDetaching([$collineId]);
                    }

                    $mappingMenages[(string) $localId] = $menage->id;
                    Cache::put($this->cleMappingMenage($user, $localId), $menage->id, now()->addDays(30));
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
                        $menageId = $mappingMenages[(string) $menageLocalId] ?? null;
                    }

                    if (!$menageId && $menageLocalId) {
                        $menageId = Cache::get($this->cleMappingMenage($user, $menageLocalId));
                    }

                    if (!$menageId) {
                        throw new \Exception("menage_id introuvable pour la parcelle (local: {$menageLocalId}).");
                    }

                    Menage::findOrFail($menageId);

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
                        'type_parcelle'              => $p['type_parcelle'] ?? $p['type'] ?? null,
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

                    $mappingParcelles[(string) $localId] = $parcelle->id;
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
                        $menageId = $mappingMenages[(string) $menageLocalId] ?? null;
                    }

                    if (!$menageId && $menageLocalId) {
                        $menageId = Cache::get($this->cleMappingMenage($user, $menageLocalId));
                    }

                    if (!$menageId) {
                        throw new \Exception("menage_id introuvable pour la réponse (local: {$menageLocalId}).");
                    }

                    Menage::findOrFail($menageId);

                    $questionId = $r['question_id'] ?? null;

                    if (!$questionId) {
                        throw new \Exception("question_id manquant pour la réponse.");
                    }

                    // Sérialiser la valeur si c'est un tableau/objet
                    $valeur = $r['valeur'] ?? null;
                    if (is_object($valeur)) {
                        $valeur = get_object_vars($valeur);
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

                    $mappingReponses[(string) $localId] = $reponse->id;
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

    private function cleMappingMenage(User $user, string $localId): string
    {
        return "sync:menage:{$user->id}:{$localId}";
    }
}