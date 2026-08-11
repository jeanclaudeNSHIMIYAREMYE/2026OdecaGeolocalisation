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
    public function arborescence()
    {
        $provinces = Province::with('communes.zones.collines:id,zone_id,nom')
            ->get()
            ->map(fn (Province $p) => [
                'id' => $p->id,
                'nom' => $p->nom,
                'communes' => $p->communes->map(fn (Commune $c) => [
                    'id' => $c->id,
                    'nom' => $c->nom,
                    'zones' => $c->zones->map(fn (Zone $z) => [
                        'id' => $z->id,
                        'nom' => $z->nom,
                        'collines' => $z->collines->map(fn (Colline $col) => [
                            'id' => $col->id,
                            'nom' => $col->nom,
                        ]),
                    ]),
                ]),
            ]);

        return response()->json(['data' => $provinces]);
    }
}
