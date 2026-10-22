<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Colline;
use App\Models\Commune;
use App\Models\Province;
use App\Models\Zone;
use Illuminate\Http\Request;

/**
 * Expose la hiérarchie territoriale (province > commune > zone > colline).
 * Ces données changent rarement : l'app mobile est censée les mettre en
 * cache localement (SQLite embarqué) au premier login puis ne les
 * re-synchroniser que ponctuellement.
 */
class GeoReferenceController extends Controller
{
    public function provinces()
    {
        return response()->json(['data' => Province::select('id', 'code', 'nom')->orderBy('nom')->get()]);
    }

    public function communes(Request $request)
    {
        $query = Commune::select('id', 'province_id', 'nom')->orderBy('nom');

        $query->when($request->filled('province_id'), fn ($q) => $q->where('province_id', $request->integer('province_id')));

        return response()->json(['data' => $query->get()]);
    }

    public function zones(Request $request)
    {
        $query = Zone::select('id', 'commune_id', 'nom')->orderBy('nom');

        $query->when($request->filled('commune_id'), fn ($q) => $q->where('commune_id', $request->integer('commune_id')));

        return response()->json(['data' => $query->get()]);
    }

    public function collines(Request $request)
    {
        $query = Colline::select('id', 'zone_id', 'nom')->orderBy('nom');

        $query->when($request->filled('zone_id'), fn ($q) => $q->where('zone_id', $request->integer('zone_id')));

        return response()->json(['data' => $query->get()]);
    }

    /**
     * Arborescence complète imbriquée en un seul appel, utile pour un
     * téléchargement unique en cache au démarrage de l'app mobile plutôt
     * que 4 appels séparés.
     */

    public function arborescence(Request $request)
{
    // 1. Récupérer l'enquêteur connecté.
    $enqueteur = $request->user();

    if (!$enqueteur) {
        return response()->json([
            'message' => 'Authentification requise.',
        ], 401);
    }

    if (!$enqueteur->estEnqueteur()) {
        return response()->json([
            'message' => 'Accès réservé aux enquêteurs.',
        ], 403);
    }

    // 2. Récupérer uniquement les IDs des collines affectées.
    $collinesIds = $enqueteur->collines()->pluck('collines.id');

    // 3. Charger uniquement les provinces, communes, zones et
    //    collines qui correspondent aux affectations de l'enquêteur.
    $provinces = Province::query()
        ->whereHas('communes.zones.collines', function ($query) use ($collinesIds) {
            $query->whereIn('collines.id', $collinesIds);
        })
        ->with([
            'communes' => function ($query) use ($collinesIds) {
                $query->whereHas('zones.collines', function ($q) use ($collinesIds) {
                    $q->whereIn('collines.id', $collinesIds);
                })->with([
                    'zones' => function ($query) use ($collinesIds) {
                        $query->whereHas('collines', function ($q) use ($collinesIds) {
                            $q->whereIn('collines.id', $collinesIds);
                        })->with([
                            'collines' => function ($query) use ($collinesIds) {
                                $query->whereIn('collines.id', $collinesIds)
                                    ->with('menages')
                                    ->orderBy('nom');
                            },
                        ])->orderBy('nom');
                    },
                ])->orderBy('nom');
            },
        ])
        ->orderBy('nom')
        ->get();

    // 4. Construire la réponse JSON.
    $data = $provinces->map(function (Province $province) {
        return [
            'id' => $province->id,
            'nom' => $province->nom,

            'communes' => $province->communes->map(function (Commune $commune) {
                return [
                    'id' => $commune->id,
                    'nom' => $commune->nom,

                    'zones' => $commune->zones->map(function (Zone $zone) {
                        return [
                            'id' => $zone->id,
                            'nom' => $zone->nom,

                            'collines' => $zone->collines->map(function (Colline $colline) {
                                return [
                                    'id' => $colline->id,
                                    'nom' => $colline->nom,
                                ];
                            })->values(),
                        ];
                    })->values(),
                ];
            })->values(),
        ];
    })->values();

    return response()->json([
        'message' => 'Arborescence territoriale récupérée avec succès.',
        'enqueteur_id' => $enqueteur->id,
        'total_collines' => $collinesIds->count(),
        'data' => $data,
    ]);
}
}