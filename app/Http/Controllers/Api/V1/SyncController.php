<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\MenageResource;
use App\Http\Resources\Api\ParcelleResource;
use App\Models\Menage;
use App\Models\Parcelle;
use App\Models\ReponseQuestionnaire;
use App\Models\SyncLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * Cœur de la connectivité "terrain hors-ligne" pour l'app mobile :
 *
 * - PUSH : l'enquêteur envoie tout ce qu'il a collecté hors connexion
 *   (ménages/parcelles/réponses créés avec des identifiants locaux
 *   temporaires côté téléphone). Le serveur upsert ces données et renvoie
 *   une table de correspondance id_local -> id_serveur pour que l'app
 *   mobile mette à jour sa base SQLite locale.
 *
 * - PULL : l'app mobile demande "que s'est-il passé depuis ma dernière
 *   synchro ?" (ex : un superviseur a modifié un ménage). Le serveur
 *   renvoie uniquement les enregistrements modifiés depuis `since`,
 *   déjà filtrés par la portée territoriale de l'utilisateur.
 *
 * Toute opération est journalisée dans sync_logs (traçabilité par device).
 */
class SyncController extends Controller
{
    public function push(Request $request)
    {
        $donnees = $request->validate([
            'device_id' => ['required', 'string', 'max:255'],
            'menages' => ['sometimes', 'array'],
            'menages.*.id_local' => ['required', 'string'],
            'menages.*.code_menage' => ['required', 'string', 'max:255'],
            'menages.*.nom_chef_menage' => ['nullable', 'string', 'max:255'],
            'menages.*.prenom_chef_menage' => ['nullable', 'string', 'max:255'],
            'menages.*.telephone' => ['nullable', 'string', 'max:50'],
            'menages.*.colline_id' => ['required', 'exists:collines,id'],
            'menages.*.statut' => ['nullable', 'in:a_faire,en_attente,termine'],

            'parcelles' => ['sometimes', 'array'],
            'parcelles.*.id_local' => ['required', 'string'],
            'parcelles.*.menage_id' => ['nullable', 'integer'],
            'parcelles.*.menage_id_local' => ['nullable', 'string'],
            'parcelles.*.nombre_pieds' => ['nullable', 'integer', 'min:0'],
            'parcelles.*.annee_mise_en_place' => ['nullable', 'integer'],
            'parcelles.*.etat_verger' => ['nullable', 'string', 'max:255'],
            'parcelles.*.latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'parcelles.*.longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'parcelles.*.polygone' => ['nullable', 'array'],
            'parcelles.*.mode_positionnement' => ['nullable', 'in:automatique,manuel'],

            'reponses' => ['sometimes', 'array'],
            'reponses.*.menage_id' => ['nullable', 'integer'],
            'reponses.*.menage_id_local' => ['nullable', 'string'],
            'reponses.*.parcelle_id' => ['nullable', 'integer'],
            'reponses.*.parcelle_id_local' => ['nullable', 'string'],
            'reponses.*.question_id' => ['required', 'exists:questions,id'],
            'reponses.*.valeur' => ['required'],
        ]);

        $utilisateur = $request->user();
        $mapping = ['menages' => [], 'parcelles' => []];
        $erreurs = [];

        DB::transaction(function () use ($donnees, $utilisateur, &$mapping, &$erreurs) {

            // 1) Ménages d'abord (les parcelles/réponses en dépendent).
            foreach ($donnees['menages'] ?? [] as $m) {
                $menage = Menage::updateOrCreate(
                    ['code_menage' => $m['code_menage']],
                    [
                        'nom_chef_menage' => $m['nom_chef_menage'] ?? null,
                        'prenom_chef_menage' => $m['prenom_chef_menage'] ?? null,
                        'telephone' => $m['telephone'] ?? null,
                        'colline_id' => $m['colline_id'],
                        'statut' => $m['statut'] ?? 'a_faire',
                        'source' => 'terrain',
                        'enqueteur_id' => $utilisateur->id,
                        'cree_par_id' => $utilisateur->id,
                        'date_derniere_activite' => now(),
                    ]
                );

                $mapping['menages'][$m['id_local']] = $menage->id;

                $this->journaliser($menage, $utilisateur, $donnees['device_id'] ?? null, $m);
            }

            // 2) Parcelles, en résolvant menage_id_local -> id serveur.
            foreach ($donnees['parcelles'] ?? [] as $p) {
                $menageId = $p['menage_id'] ?? ($mapping['menages'][$p['menage_id_local'] ?? ''] ?? null);

                if (! $menageId) {
                    $erreurs[] = ['parcelle_id_local' => $p['id_local'], 'erreur' => 'menage introuvable (id_local inconnu)'];

                    continue;
                }

                $parcelle = Parcelle::create([
                    'menage_id' => $menageId,
                    'nombre_pieds' => $p['nombre_pieds'] ?? null,
                    'annee_mise_en_place' => $p['annee_mise_en_place'] ?? null,
                    'etat_verger' => $p['etat_verger'] ?? null,
                    'latitude' => $p['latitude'] ?? null,
                    'longitude' => $p['longitude'] ?? null,
                    'polygone' => $p['polygone'] ?? null,
                    'mode_positionnement' => $p['mode_positionnement'] ?? null,
                ]);

                $mapping['parcelles'][$p['id_local']] = $parcelle->id;

                $this->journaliser($parcelle, $utilisateur, $donnees['device_id'] ?? null, $p);
            }

            // 3) Réponses, en résolvant menage/parcelle id_local -> id serveur.
            foreach ($donnees['reponses'] ?? [] as $r) {
                $menageId = $r['menage_id'] ?? ($mapping['menages'][$r['menage_id_local'] ?? ''] ?? null);
                $parcelleId = $r['parcelle_id'] ?? ($mapping['parcelles'][$r['parcelle_id_local'] ?? ''] ?? null);

                if (! $menageId) {
                    $erreurs[] = ['question_id' => $r['question_id'], 'erreur' => 'menage introuvable (id_local inconnu)'];

                    continue;
                }

                $reponse = ReponseQuestionnaire::updateOrCreate(
                    ['menage_id' => $menageId, 'parcelle_id' => $parcelleId, 'question_id' => $r['question_id']],
                    ['valeur' => $r['valeur']]
                );

                $this->journaliser($reponse, $utilisateur, $donnees['device_id'] ?? null, $r);
            }
        });

        return response()->json([
            'mapping' => $mapping,
            'erreurs' => $erreurs,
            'synced_at' => now()->toIso8601String(),
        ], $erreurs ? 207 : 200);
    }

    /**
     * Renvoie tout ce qui a changé (côté serveur, tous auteurs confondus)
     * depuis `since`, dans la limite de la portée territoriale de
     * l'utilisateur — pour que l'app mobile reste à jour même sur des
     * ménages qu'elle n'a pas créés elle-même.
     */
    public function pull(Request $request)
    {
        $valide = Validator::make($request->all(), [
            'since' => ['nullable', 'date'],
        ])->validate();

        $depuis = $valide['since'] ?? null;
        $maintenant = now();

        // IDs des ménages visibles par l'utilisateur (portée territoriale
        // appliquée automatiquement par le global scope de Menage), sans
        // filtre de date : sert de périmètre pour les parcelles ci-dessous.
        $idsMenagesVisibles = Menage::query()->pluck('id');

        $menages = Menage::query()
            ->with('colline')
            ->when($depuis, fn ($q) => $q->where('updated_at', '>', $depuis))
            ->get();

        // Le global scope de Parcelle filtre déjà via la relation menage,
        // mais on restreint explicitement pour ne renvoyer que des
        // parcelles rattachées à un ménage dans le périmètre de l'utilisateur.
        $parcelles = Parcelle::query()
            ->whereIn('menage_id', $idsMenagesVisibles)
            ->when($depuis, fn ($q) => $q->where('updated_at', '>', $depuis))
            ->get();

        return response()->json([
            'server_time' => $maintenant->toIso8601String(),
            'menages' => MenageResource::collection($menages),
            'parcelles' => ParcelleResource::collection($parcelles),
        ]);
    }

    private function journaliser($modele, $utilisateur, ?string $deviceId, array $payload): void
    {
        SyncLog::create([
            'syncable_type' => $modele::class,
            'syncable_id' => $modele->id,
            'statut' => 'envoye',
            'device_id' => $deviceId,
            'enqueteur_id' => $utilisateur->id,
            'payload' => $payload,
            'synced_at' => now(),
        ]);
    }
}
