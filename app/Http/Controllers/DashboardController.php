<?php

namespace App\Http\Controllers;

use App\Models\Colline;
use App\Models\Commune;
use App\Models\Menage;
use App\Models\Parcelle;
use App\Models\Province;
use App\Models\Zone;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{

private function altitudeParcelle(Parcelle $parcelle): ?float
    {
        $polygone = $parcelle->polygone;

        if (is_array($polygone) && count($polygone) >= 3) {
            $altitudes = array_values(array_filter(
                array_map(
                    fn($s) => isset($s['altitude']) && $s['altitude'] !== null ? (float) $s['altitude'] : null,
                    $polygone
                ),
                fn($v) => $v !== null
            ));

            if (count($altitudes) > 0) {
                return array_sum($altitudes) / count($altitudes);
            }

            return $parcelle->altitude !== null ? (float) $parcelle->altitude : null;
        }

        return $parcelle->altitude !== null ? (float) $parcelle->altitude : null;
    }
    public function index(Request $request): Response
    {
        $utilisateur = $request->user();

        $filtres = $request->only(['province_id', 'commune_id', 'zone_id', 'colline_id']);

        // Les modèles Menage/Parcelle appliquent déjà automatiquement le
        // scope territorial de l'utilisateur connecté (PorteeTerritorialeScope) ;
        // on ajoute ici uniquement les filtres explicites choisis dans l'UI.
        $menages = Menage::query()
            ->when($filtres['colline_id'] ?? null, fn ($q, $v) => $q->where('colline_id', $v))
            ->when($filtres['zone_id'] ?? null, fn ($q, $v) => $q->whereHas('colline', fn ($q) => $q->where('zone_id', $v)))
            ->when($filtres['commune_id'] ?? null, fn ($q, $v) => $q->whereHas('colline.zone', fn ($q) => $q->where('commune_id', $v)))
            ->when($filtres['province_id'] ?? null, fn ($q, $v) => $q->whereHas('colline.zone.commune', fn ($q) => $q->where('province_id', $v)));

        $totalMenages = (clone $menages)->count();
        $menagesTermines = (clone $menages)->where('statut', 'termine')->count();
        $menagesEnAttente = (clone $menages)->where('statut', 'en_attente')->count();
        $menagesAFaire = (clone $menages)->where('statut', 'a_faire')->count();

        $parcelles = Parcelle::query()->whereHas('menage', function ($q) use ($filtres) {
            $q->when($filtres['colline_id'] ?? null, fn ($q, $v) => $q->where('colline_id', $v))
                ->when($filtres['zone_id'] ?? null, fn ($q, $v) => $q->whereHas('colline', fn ($q) => $q->where('zone_id', $v)))
                ->when($filtres['commune_id'] ?? null, fn ($q, $v) => $q->whereHas('colline.zone', fn ($q) => $q->where('commune_id', $v)))
                ->when($filtres['province_id'] ?? null, fn ($q, $v) => $q->whereHas('colline.zone.commune', fn ($q) => $q->where('province_id', $v)));
        });

        $pointsCarte = (clone $parcelles)
            ->with('menage:id,code_menage,nom_chef_menage,statut')
            ->get([
                'id',
                'menage_id',
                'latitude',
                'longitude',
                'altitude',
                'polygone',
                'nombre_pieds',
                'etat_verger',
                'type',
            ])
            ->map(function (Parcelle $parcelle) {
                $superficieHa = $this->superficieHectares($parcelle->polygone);
                $polygone = $parcelle->polygone;
                $estPolygone = is_array($polygone) && count($polygone) >= 3;

                return [
                    'id' => $parcelle->id,

                    'latitude' => $parcelle->latitude !== null
                        ? (float) $parcelle->latitude
                        : null,

                    'longitude' => $parcelle->longitude !== null
                        ? (float) $parcelle->longitude
                        : null,

                    'altitude' => $this->altitudeParcelle($parcelle),

                    'polygone' => $estPolygone ? array_map(fn($s) => [
                    'latitude' => (float) $s['latitude'],
                    'longitude' => (float) $s['longitude'],
                    'altitude' => isset($s['altitude']) && $s['altitude'] !== null ? (float) $s['altitude'] : null,
                ], $polygone) : null,

                    'nombre_pieds' => $parcelle->nombre_pieds,
                    'etat_verger' => $parcelle->etat_verger,
                    'type' => $parcelle->type,
                    'superficie_ha' => $superficieHa,

                    'code_menage' => $parcelle->menage->code_menage,
                    'nom_chef_menage' => $parcelle->menage->nom_chef_menage,
                    'statut_menage' => $parcelle->menage->statut,
                ];
            });

        $kpi = [
            'menages_total' => $totalMenages,
            'menages_termines' => $menagesTermines,
            'menages_en_attente' => $menagesEnAttente,
            'menages_a_faire' => $menagesAFaire,
            'taux_avancement' => $totalMenages > 0 ? round(($menagesTermines / $totalMenages) * 100, 1) : 0,
            'nombre_parcelles' => $pointsCarte->count(),
            'nombre_pieds_cafe' => (int) (clone $parcelles)->sum('nombre_pieds'),
            'superficie_totale_ha' => round($pointsCarte->sum('superficie_ha'), 2),
        ];

        return Inertia::render('Dashboard', [
            'kpi' => $kpi,
            'pointsCarte' => $pointsCarte,
            'filtres' => $filtres,
            'provinces' => Province::orderBy('nom')->get(['id', 'nom']),
            'communes' => Commune::orderBy('nom')->get(['id', 'nom', 'province_id']),
            'zones' => Zone::orderBy('nom')->get(['id', 'nom', 'commune_id']),
            'collines' => Colline::orderBy('nom')->get(['id', 'nom', 'zone_id']),
        ]);
    }

    /**
     * Calcule la superficie approximative (en hectares) d'un polygone
     * défini par des points GPS (latitude/longitude), en tenant compte
     * de la courbure terrestre (formule de l'excès sphérique).
     *
     * Accepte les formats [[lat, lng], ...] ou [{latitude, longitude}, ...].
     */
    private function superficieHectares(mixed $polygone): ?float
    {
        if (! is_array($polygone) || count($polygone) < 3) {
            return null;
        }

        $coords = collect($polygone)
            ->map(function ($point) {
                if (is_array($point) && array_key_exists(0, $point) && array_key_exists(1, $point)) {
                    return [(float) $point[0], (float) $point[1]];
                }

                if (is_array($point) && isset($point['latitude'], $point['longitude'])) {
                    return [(float) $point['latitude'], (float) $point['longitude']];
                }

                return null;
            })
            ->filter()
            ->values();

        if ($coords->count() < 3) {
            return null;
        }

        // Rayon équatorial WGS84 (mètres)
        $rayonTerre = 6378137;
        $aire = 0.0;
        $n = $coords->count();

        for ($i = 0; $i < $n; $i++) {
            [$lat1, $lng1] = $coords[$i];
            [$lat2, $lng2] = $coords[($i + 1) % $n];

            $aire += deg2rad($lng2 - $lng1) * (2 + sin(deg2rad($lat1)) + sin(deg2rad($lat2)));
        }

        $aire = abs($aire * $rayonTerre * $rayonTerre / 2);

        return round($aire / 10000, 2); // m² → hectares
    }
}
