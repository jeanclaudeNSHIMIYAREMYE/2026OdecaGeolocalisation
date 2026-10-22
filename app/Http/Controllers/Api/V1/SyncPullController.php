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
class SyncPullController extends Controller
{
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

    // Ménages accessibles à l'utilisateur connecté.
    $idsMenagesVisibles = Menage::query()->pluck('id');

    // Récupérer les ménages avec leurs réponses et les questions associées.
   $menages = Menage::query()
    ->with([
        'colline.zone.commune.province',
        'reponses.question',
        'parcelles',
    ])
    ->when(
        $depuis,
        fn ($query) => $query->where('updated_at', '>', $depuis)
    )
    ->get();

    // Récupérer les parcelles visibles.
    $parcelles = Parcelle::query()
        ->whereIn('menage_id', $idsMenagesVisibles)
        ->when(
            $depuis,
            fn ($query) => $query->where('updated_at', '>', $depuis)
        )
        ->get();

    return response()->json([
        'server_time' => $maintenant->toIso8601String(),

        'menages' => MenageResource::collection($menages),

        //'parcelles' => ParcelleResource::collection($parcelles),
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
