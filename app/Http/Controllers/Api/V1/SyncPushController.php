<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Menage;
use App\Models\Parcelle;
use App\Models\ReponseQuestionnaire;
use App\Models\User;
use App\Support\AccesTerritorial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class SyncPushController extends Controller
{
    public function push(Request $request)
    {
        $request->validate([
            'menages'   => ['nullable', 'array'],
            'parcelles' => ['nullable', 'array'],
            'reponses'  => ['nullable', 'array'],
        ]);

        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Authentification requise.',
            ], 401);
        }

        $menages   = $request->input('menages', []);
        $parcelles = $request->input('parcelles', []);
        $reponses  = $request->input('reponses', []);

        $mappingMenages = [];
        $mappingParcelles = [];
        $mappingReponses = [];
        $errors = [];

        $collinesOk = in_array(
            $user->role,
            ['enqueteur', 'superviseur_communal'],
            true
        )
            ? array_map('intval', $user->collinesIdsAutorisees())
            : null;

        Log::info('Synchronisation push démarrée', [
            'user_id' => $user->id,
            'nombre_menages' => count($menages),
            'nombre_parcelles' => count($parcelles),
            'nombre_reponses' => count($reponses),
        ]);

        DB::beginTransaction();

        try {
            /*
            |--------------------------------------------------------------------------
            | ÉTAPE 1 : SYNCHRONISATION DES MÉNAGES
            |--------------------------------------------------------------------------
            */

            foreach ($menages as $m) {
                $localId = $m['_local_id'] ?? null;

                if (!$localId) {
                    continue;
                }

                DB::beginTransaction();

                try {
                    if (empty($m['code_menage'])) {
                        throw new \Exception(
                            'Le code du Caféiculteur est obligatoire.'
                        );
                    }

                    $collineId = (int) ($m['colline_id'] ?? 0);

                    if ($collinesOk !== null) {
                        if (!$collineId) {
                            throw new \Exception(
                                'colline_id est obligatoire pour cet utilisateur.'
                            );
                        }

                        AccesTerritorial::verifierColline(
                            $user,
                            $collineId
                        );

                        $existant = Menage::withoutGlobalScopes()
                            ->where('code_menage', $m['code_menage'])
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

                            if (!$affecteACetteColline) {
                                throw new \Exception(
                                    'Ce Caféiculteur appartient à une colline non autorisée.'
                                );
                            }
                        }
                    }

                    $statut = $m['statut'] ?? 'a_faire';

                    if ($statut === 'deja_commence') {
                        $statut = 'en_attente';
                    }

                    $source = in_array(
                        $m['source'] ?? null,
                        ['pre_enregistre', 'terrain'],
                        true
                    )
                        ? $m['source']
                        : 'terrain';

                    $menage = Menage::updateOrCreate(
                        [
                            'code_menage' => $m['code_menage'],
                        ],
                        [
                            'type_menage' => $m['type_menage'] ?? null,
                            'nom_chef_menage' => $m['nom_chef_menage'] ?? null,
                            'prenom_chef_menage' => $m['prenom_chef_menage'] ?? null,
                            'sexe' => $m['sexe'] ?? null,
                            'date_naissance' => $m['date_naissance'] ?? null,
                            'telephone' => $m['telephone'] ?? null,
                            'cni' => $m['cni'] ?? null,
                            'photo_proprietaire' => $m['photo_proprietaire'] ?? null,
                            'photo_piece_identification' => $m['photo_piece_identification'] ?? null,
                            'colline_id' => $m['colline_id'] ?? null,
                            'statut' => $statut,
                            'source' => $source,
                            'enqueteur_id' => $collinesOk !== null
                                ? $user->id
                                : ($m['enqueteur_id'] ?? null),
                            'cree_par_id' => $m['cree_par_id'] ?? $user->id,
                            'date_derniere_activite' =>
                                $m['date_derniere_activite'] ?? now(),
                        ]
                    );

                    if ($collinesOk !== null) {
                        $menage->collines()->syncWithoutDetaching([
                            $collineId,
                        ]);
                    }

                    $mappingMenages[(string) $localId] = $menage->id;

                    Cache::put(
                        $this->cleMappingMenage($user, (string) $localId),
                        $menage->id,
                        now()->addDays(30)
                    );

                    DB::commit();
                } catch (\Throwable $e) {
                    DB::rollBack();

                    $errors[] = [
                        '_local_id' => $localId,
                        'type' => 'menage',
                        'message' => $e->getMessage(),
                    ];
                }
            }

            /*
            |--------------------------------------------------------------------------
            | ÉTAPE 2 : SYNCHRONISATION DES PARCELLES
            |--------------------------------------------------------------------------
            */

            foreach ($parcelles as $p) {
                $localId = $p['_local_id'] ?? null;

                if (!$localId) {
                    continue;
                }

                DB::beginTransaction();

                try {
                    $menageLocalId = $p['_menage_local_id'] ?? null;
                    $menageId = $p['menage_id'] ?? null;

                    // Résolution de l'identifiant du ménage.
                    if (!$menageId && $menageLocalId) {
                        $menageId =
                            $mappingMenages[(string) $menageLocalId]
                            ?? Cache::get(
                                $this->cleMappingMenage(
                                    $user,
                                    (string) $menageLocalId
                                )
                            );
                    }

                    if (!$menageId) {
                        throw new \Exception(
                            "menage_id introuvable pour la parcelle."
                        );
                    }

                    /*
                     * Verrouillage du ménage.
                     * Les contrôles de limites sont effectués sous verrou.
                     */
                    $menage = Menage::whereKey($menageId)
                        ->lockForUpdate()
                        ->firstOrFail();

                    // Vérification des droits territoriaux.
                    AccesTerritorial::verifierMenage(
                        $user,
                        $menage->id
                    );

                    $typeParcelle = $p['type_parcelle'] ?? null;

                    if (!in_array(
                        $typeParcelle,
                        ['verger', 'sous_verger'],
                        true
                    )) {
                        throw new \Exception(
                            'Le type_parcelle doit être verger ou sous_verger.'
                        );
                    }

                    // Validation des données de parcelle.
                    $validator = Validator::make($p, [
                        'nombre_pieds' => [
                            'nullable', 'integer', 'min:0',
                        ],
                        'annee_mise_en_place' => [
                            'nullable',
                            'integer',
                            'min:1900',
                            'max:' . (date('Y') + 1),
                        ],
                        'surface_verger' => [
                            'nullable',
                            'numeric',
                            'min:0',
                        ],
                        'latitude' => [
                            'nullable',
                            'numeric',
                            'between:-90,90',
                        ],
                        'longitude' => [
                            'nullable',
                            'numeric',
                            'between:-180,180',
                        ],
                        'altitude' => [
                            'nullable',
                            'numeric',
                            'between:-500,9000',
                        ],
                        'polygone' => [
                            'nullable', 'array',
                        ],
                        'mode_positionnement' => [
                            'nullable',
                            'in:automatique,manuel',
                        ],
                    ]);

                    if ($validator->fails()) {
                        throw new ValidationException($validator);
                    }

                    $serverId = $p['server_id'] ?? null;

                    // Si le mobile renvoie une synchronisation répétée,
                    // retrouver la parcelle déjà créée grâce au cache.
                    if (!$serverId) {
                        $serverId = Cache::get(
                            $this->cleMappingParcelle(
                                $user,
                                (string) $localId
                            )
                        );
                    }

                    $parcelleExistante = null;

                    if ($serverId) {
                        $parcelleExistante = Parcelle::whereKey($serverId)
                            ->where('menage_id', $menage->id)
                            ->lockForUpdate()
                            ->first();

                        if (!$parcelleExistante) {
                            throw new \Exception(
                                'Parcelle introuvable ou non rattachée à ce ménage.'
                            );
                        }
                    }

                    /*
                     * Contrôle des limites métier.
                     *
                     * Une mise à jour ne doit pas compter la parcelle
                     * elle-même comme une nouvelle création.
                     */
                    $this->verifierLimiteParcelle(
                        $menage,
                        $typeParcelle,
                        $parcelleExistante?->id
                    );

                    $polygone = null;

                    if (!empty($p['polygone'])) {
                        $polygone = is_array($p['polygone'])
                            ? json_encode($p['polygone'])
                            : $p['polygone'];
                    }

                    $donnees = [
                        'menage_id' => $menage->id,
                        'nombre_pieds' => $p['nombre_pieds'] ?? null,
                        'annee_mise_en_place' =>
                            $p['annee_mise_en_place'] ?? null,
                        'surface_verger' => $p['surface_verger'] ?? null,
                        'etat_verger' => $p['etat_verger'] ?? null,
                        'type' => $p['type'] ?? null,
                        'type_parcelle' => $typeParcelle,
                        'latitude' => $p['latitude'] ?? null,
                        'longitude' => $p['longitude'] ?? null,
                        'altitude' => $p['altitude'] ?? null,
                        'polygone' => $polygone,
                        'mode_positionnement' =>
                            $p['mode_positionnement'] ?? null,
                        'mode_acquisition' =>
                            $p['mode_acquisition'] ?? null,
                        'piece_justificative' =>
                            $p['piece_justificative'] ?? null,
                        'piece_justificative_photo' =>
                            $p['piece_justificative_photo'] ?? null,
                        'notes' => $p['notes'] ?? null,
                        'autres_donnees' =>
                            $p['autres_donnees'] ?? null,
                    ];

                    if ($parcelleExistante) {
                        $parcelleExistante->update($donnees);
                        $parcelle = $parcelleExistante;
                    } else {
                        $parcelle = Parcelle::create($donnees);
                    }

                    $mappingParcelles[(string) $localId] = $parcelle->id;

                    Cache::put(
                        $this->cleMappingParcelle(
                            $user,
                            (string) $localId
                        ),
                        $parcelle->id,
                        now()->addDays(30)
                    );

                    DB::commit();
                } catch (\Throwable $e) {
                    DB::rollBack();

                    $errors[] = [
                        '_local_id' => $localId,
                        'type' => 'parcelle',
                        'message' => $e->getMessage(),
                    ];
                }
            }

            /*
            |--------------------------------------------------------------------------
            | ÉTAPE 3 : SYNCHRONISATION DES RÉPONSES
            |--------------------------------------------------------------------------
            */

            foreach ($reponses as $r) {
                $localId = $r['_local_id'] ?? null;

                if (!$localId) {
                    continue;
                }

                DB::beginTransaction();

                try {
                    $menageLocalId = $r['_menage_local_id'] ?? null;
                    $menageId = $r['menage_id'] ?? null;

                    if (!$menageId && $menageLocalId) {
                        $menageId =
                            $mappingMenages[(string) $menageLocalId]
                            ?? Cache::get(
                                $this->cleMappingMenage(
                                    $user,
                                    (string) $menageLocalId
                                )
                            );
                    }

                    if (!$menageId) {
                        throw new \Exception(
                            'menage_id introuvable pour la réponse.'
                        );
                    }

                    $menage = Menage::findOrFail($menageId);

                    AccesTerritorial::verifierMenage(
                        $user,
                        $menage->id
                    );

                    $questionId = $r['question_id'] ?? null;

                    if (!$questionId) {
                        throw new \Exception(
                            'question_id manquant pour la réponse.'
                        );
                    }

                    if (!DB::table('questions')
                        ->where('id', $questionId)
                        ->exists()) {
                        throw new \Exception(
                            'La question indiquée n’existe pas.'
                        );
                    }

                    $valeur = $r['valeur'] ?? null;

                    if (is_object($valeur)) {
                        $valeur = get_object_vars($valeur);
                    }

                    $reponse = ReponseQuestionnaire::updateOrCreate(
                        [
                            'menage_id' => $menage->id,
                            'question_id' => $questionId,
                        ],
                        [
                            'valeur' => $valeur,
                        ]
                    );

                    $mappingReponses[(string) $localId] = $reponse->id;

                    Cache::put(
                        $this->cleMappingReponse(
                            $user,
                            (string) $localId
                        ),
                        $reponse->id,
                        now()->addDays(30)
                    );

                    DB::commit();
                } catch (\Throwable $e) {
                    DB::rollBack();

                    $errors[] = [
                        '_local_id' => $localId,
                        'type' => 'reponse',
                        'message' => $e->getMessage(),
                    ];
                }
            }

            DB::commit();

        } catch (\Throwable $e) {
            DB::rollBack();

            Log::error('Erreur critique SyncPush', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Erreur critique lors de la synchronisation.',
                'error' => $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'message' => 'Synchronisation terminée.',
            'mappings' => [
                'menages' => $mappingMenages,
                'parcelles' => $mappingParcelles,
                'reponses' => $mappingReponses,
            ],
            'errors' => $errors,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | CONTRÔLE DES LIMITES DES PARCELLES
    |--------------------------------------------------------------------------
    */

    private function verifierLimiteParcelle(
        Menage $menage,
        string $typeParcelle,
        ?int $parcelleId = null
    ): void {
        $query = Parcelle::where('menage_id', $menage->id)
            ->where('type_parcelle', $typeParcelle);

        if ($parcelleId) {
            $query->where('id', '!=', $parcelleId);
        }

        $nombreExistant = $query->count();

        // Un seul sous-verger par ménage.
        if ($typeParcelle === 'sous_verger' && $nombreExistant >= 1) {
            throw new \Exception(
                'Un seul sous-verger est autorisé par Caféiculteur. '
                . 'Ce Caféiculteur possède déjà un sous-verger enregistré.'
            );
        }

        // Nombre de vergers limité par la déclaration du questionnaire.
        if ($typeParcelle === 'verger') {
            $nombreDeclare = $this->obtenirNombreDeclare(
                $menage,
                'effectif_vergers'
            );

            if ($nombreDeclare === null) {
                throw new \Exception(
                    'Impossible de déterminer le nombre de vergers déclaré '
                    . 'dans le questionnaire (effectif_vergers).'
                );
            }

            if ($nombreExistant >= $nombreDeclare) {
                throw new \Exception(
                    "Le nombre maximum de vergers autorisé est de "
                    . "{$nombreDeclare}. Ce Caféiculteur possède déjà "
                    . "{$nombreExistant} verger(s)."
                );
            }
        }
    }

    /*
    |--------------------------------------------------------------------------
    | RÉCUPÉRER LE NOMBRE DE VERGERS DÉCLARÉ
    |--------------------------------------------------------------------------
    */

    private function obtenirNombreDeclare(
        Menage $menage,
        string $codeQuestion
    ): ?int {
        $questionId = DB::table('questions')
            ->where('code', $codeQuestion)
            ->value('id');

        if (!$questionId) {
            return null;
        }

        $valeur = DB::table('reponses_questionnaire')
            ->where('menage_id', $menage->id)
            ->where('question_id', $questionId)
            ->value('valeur');

        if ($valeur === null || $valeur === '') {
            return null;
        }

        if (is_string($valeur)) {
            $decode = json_decode($valeur, true);

            if (json_last_error() === JSON_ERROR_NONE) {
                $valeur = $decode;
            }
        }

        if (is_array($valeur)) {
            $valeur = $valeur['valeur'] ?? null;
        }

        if (
            $valeur === null ||
            $valeur === '' ||
            !is_numeric($valeur) ||
            (int) $valeur != $valeur ||
            (int) $valeur < 0
        ) {
            return null;
        }

        return (int) $valeur;
    }

    /*
    |--------------------------------------------------------------------------
    | CLÉS DE CACHE DES IDENTIFIANTS LOCAUX
    |--------------------------------------------------------------------------
    */

    private function cleMappingMenage(
        User $user,
        string $localId
    ): string {
        return "sync:menage:{$user->id}:{$localId}";
    }

    private function cleMappingParcelle(
        User $user,
        string $localId
    ): string {
        return "sync:parcelle:{$user->id}:{$localId}";
    }

    private function cleMappingReponse(
        User $user,
        string $localId
    ): string {
        return "sync:reponse:{$user->id}:{$localId}";
    }
}
