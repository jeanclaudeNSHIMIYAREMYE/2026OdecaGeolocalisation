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
    public function index(Request $request): Response
    {
        $filtres = $request->only([
            'province_id',
            'commune_id',
            'zone_id',
            'colline_id',
        ]);

        // ---------------------------------------------------------
        // MENAGES (KPI calculés en SQL)
        // ---------------------------------------------------------
        $menages = Menage::query()
            ->when($filtres['colline_id'] ?? null, fn ($q, $v) => $q->where('colline_id', $v))
            ->when($filtres['zone_id'] ?? null, fn ($q, $v) => $q->whereHas(
                'colline', fn ($q) => $q->where('zone_id', $v)
            ))
            ->when($filtres['commune_id'] ?? null, fn ($q, $v) => $q->whereHas(
                'colline.zone', fn ($q) => $q->where('commune_id', $v)
            ))
            ->when($filtres['province_id'] ?? null, fn ($q, $v) => $q->whereHas(
                'colline.zone.commune', fn ($q) => $q->where('province_id', $v)
            ));

        // Une seule requête pour les 4 compteurs
        $comptes = (clone $menages)
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN statut = 'termine' THEN 1 ELSE 0 END) as termines,
                SUM(CASE WHEN statut = 'en_attente' THEN 1 ELSE 0 END) as en_attente,
                SUM(CASE WHEN statut = 'a_faire' THEN 1 ELSE 0 END) as a_faire
            ")
            ->first();

        $totalMenages = (int) ($comptes->total ?? 0);
        $menagesTermines = (int) ($comptes->termines ?? 0);
        $menagesEnAttente = (int) ($comptes->en_attente ?? 0);
        $menagesAFaire = (int) ($comptes->a_faire ?? 0);

        // ---------------------------------------------------------
        // PARCELLES
        // ---------------------------------------------------------
        $parcelles = Parcelle::query()
            ->whereHas('menage', function ($q) use ($filtres) {
                $q->when($filtres['colline_id'] ?? null, fn ($q, $v) => $q->where('colline_id', $v))
                    ->when($filtres['zone_id'] ?? null, fn ($q, $v) => $q->whereHas(
                        'colline', fn ($q) => $q->where('zone_id', $v)
                    ))
                    ->when($filtres['commune_id'] ?? null, fn ($q, $v) => $q->whereHas(
                        'colline.zone', fn ($q) => $q->where('commune_id', $v)
                    ))
                    ->when($filtres['province_id'] ?? null, fn ($q, $v) => $q->whereHas(
                        'colline.zone.commune', fn ($q) => $q->where('province_id', $v)
                    ));
            });

        // Le polygone complet n'est envoyé que si l'on a restreint le
        // périmètre (colline ou zone). Sinon, seul le point central est
        // envoyé pour garder la page légère.
        $inclurePolygone = ! empty($filtres['colline_id']) || ! empty($filtres['zone_id']);

        // ---------------------------------------------------------
        // POINTS DE LA CARTE (chargés par paquets de 500)
        // ---------------------------------------------------------
        $pointsCarte = [];
        $collinesVues = [];
        $superficieTotale = 0.0;
        $nombrePointsGeographiques = 0;
        $limitePointsCarte = 2000;

        (clone $parcelles)
            ->with([
                'menage:id,enqueteur_id,colline_id,code_menage,nom_chef_menage,statut',
                'menage.enqueteur:id,name',
            ])
            ->select([
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
            ->lazyById(500)
            ->each(function (Parcelle $parcelle) use (
                &$pointsCarte,
                &$collinesVues,
                &$superficieTotale,
                &$nombrePointsGeographiques,
                $limitePointsCarte,
                $inclurePolygone
            ) {
                $polygone = $parcelle->polygone;
                $estPolygone = is_array($polygone) && count($polygone) >= 3;

                // Position pour la carte : centre du polygone ou point GPS
                if ($estPolygone) {
                    $coordonnees = collect($polygone)
                        ->map(function ($sommet) {
                            if (is_array($sommet) && isset($sommet['latitude'], $sommet['longitude'])) {
                                return [(float) $sommet['latitude'], (float) $sommet['longitude']];
                            }

                            if (is_array($sommet) && array_key_exists(0, $sommet) && array_key_exists(1, $sommet)) {
                                return [(float) $sommet[0], (float) $sommet[1]];
                            }

                            return null;
                        })
                        ->filter()
                        ->values();

                    $latitude = $coordonnees->avg(fn ($coord) => $coord[0]);
                    $longitude = $coordonnees->avg(fn ($coord) => $coord[1]);
                } else {
                    $latitude = $parcelle->latitude !== null ? (float) $parcelle->latitude : null;
                    $longitude = $parcelle->longitude !== null ? (float) $parcelle->longitude : null;
                }

                if ($latitude === null || $longitude === null) {
                    return; // parcelle sans position exploitable
                }

                $nombrePointsGeographiques++;
                $superficieHa = $this->superficieHectares($polygone);
                $superficieTotale += $superficieHa ?? 0;

                // Les KPI restent complets, mais la carte ne reçoit qu'un
                // volume raisonnable pour préserver la mémoire du serveur
                // et la fluidité du navigateur.
                if (count($pointsCarte) >= $limitePointsCarte) {
                    return;
                }

                $collineId = $parcelle->menage?->colline_id;
                if ($collineId) {
                    $collinesVues[$collineId] = true;
                }

                $pointsCarte[] = [
                    'id' => $parcelle->id,
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                    'altitude' => $this->altitudeParcelle($parcelle),
                    'polygone' => ($inclurePolygone && $estPolygone)
                        ? array_map(fn ($s) => [
                            'latitude' => (float) $s['latitude'],
                            'longitude' => (float) $s['longitude'],
                            'altitude' => isset($s['altitude']) && $s['altitude'] !== null
                                ? (float) $s['altitude']
                                : null,
                        ], $polygone)
                        : null,
                    'nombre_pieds' => $parcelle->nombre_pieds,
                    'etat_verger' => $parcelle->etat_verger,
                    'type' => $parcelle->type,
                    'superficie_ha' => $superficieHa,
                    'code_menage' => $parcelle->menage?->code_menage,
                    'nom_chef_menage' => $parcelle->menage?->nom_chef_menage,
                    'statut_menage' => $parcelle->menage?->statut,
                    'nom_enqueteur' => $parcelle->menage?->enqueteur?->name,
                    '_colline_id' => $collineId, // retiré plus bas
                ];
            });

        // ---------------------------------------------------------
        // SUPERVISEURS : calculés UNE fois par colline (pas par parcelle)
        // ---------------------------------------------------------
        $superviseursParColline = $this->superviseursParColline(array_keys($collinesVues));

        foreach ($pointsCarte as &$point) {
            $noms = $superviseursParColline[$point['_colline_id']] ?? [];
            unset($point['_colline_id']);

            $point['nom_superviseur'] = $noms ? implode(', ', $noms) : null;
            $point['noms_superviseurs'] = $noms;
        }
        unset($point);

        // ---------------------------------------------------------
        // INDICATEURS
        // ---------------------------------------------------------
        $kpi = [
            'menages_total' => $totalMenages,
            'menages_termines' => $menagesTermines,
            'menages_en_attente' => $menagesEnAttente,
            'menages_a_faire' => $menagesAFaire,
            'taux_avancement' => $totalMenages > 0
                ? round(($menagesTermines / $totalMenages) * 100, 1)
                : 0,
            'nombre_parcelles' => $nombrePointsGeographiques,
            'nombre_pieds_cafe' => (int) (clone $parcelles)->sum('nombre_pieds'),
            'superficie_totale_ha' => round($superficieTotale, 2),
        ];

        return Inertia::render('Dashboard', [
            'kpi' => $kpi,
            'pointsCarte' => $pointsCarte,
            'pointsCarteTotal' => $nombrePointsGeographiques,
            'pointsCarteLimite' => $limitePointsCarte,
            'pointsCarteEstLimitee' => $nombrePointsGeographiques > count($pointsCarte),
            'filtres' => $filtres,
            'provinces' => Province::orderBy('nom')->get(['id', 'nom']),
            'communes' => Commune::orderBy('nom')->get(['id', 'nom', 'province_id']),
            'zones' => Zone::orderBy('nom')->get(['id', 'nom', 'commune_id']),
            'collines' => Colline::orderBy('nom')->get(['id', 'nom', 'zone_id']),
        ]);
    }

    /**
     * Retourne [colline_id => [noms des superviseurs]] en chargeant
     * chaque colline une seule fois (au lieu d'une fois par parcelle).
     * Combine les 3 sources : affectation directe à la colline,
     * commune_user, et ancien champ users.commune_id.
     */
    private function superviseursParColline(array $collineIds): array
    {
        $resultat = [];

        foreach (array_chunk($collineIds, 500) as $paquet) {
            Colline::query()
                ->whereIn('id', $paquet)
                ->with([
                    'superviseursCommunaux:id,name',
                    'zone:id,commune_id',
                    'zone.commune:id',
                    'zone.commune.superviseursCommunaux:id,name',
                    'zone.commune.superviseursCommunauxLegacy:id,commune_id,name',
                ])
                ->get(['id', 'zone_id'])
                ->each(function (Colline $colline) use (&$resultat) {
                    $commune = $colline->zone?->commune;

                    $resultat[$colline->id] = $colline->superviseursCommunaux
                        ->concat($commune?->superviseursCommunaux ?? collect())
                        ->concat($commune?->superviseursCommunauxLegacy ?? collect())
                        ->pluck('name')
                        ->filter()
                        ->unique()
                        ->values()
                        ->all();
                });
        }

        return $resultat;
    }

    /**
     * Altitude moyenne des sommets du polygone, sinon altitude de la parcelle.
     */
    private function altitudeParcelle(Parcelle $parcelle): ?float
    {
        $polygone = $parcelle->polygone;

        if (is_array($polygone) && count($polygone) >= 3) {
            $altitudes = array_values(array_filter(
                array_map(
                    fn ($s) => isset($s['altitude']) && $s['altitude'] !== null
                        ? (float) $s['altitude']
                        : null,
                    $polygone
                ),
                fn ($v) => $v !== null
            ));

            if (count($altitudes) > 0) {
                return array_sum($altitudes) / count($altitudes);
            }
        }

        return $parcelle->altitude !== null ? (float) $parcelle->altitude : null;
    }

    /**
     * Superficie approximative en hectares d'un polygone GPS.
     * Formats acceptés : [[lat, lng], ...] ou [['latitude' => .., 'longitude' => ..], ...]
     */
    private function superficieHectares(mixed $polygone): ?float
    {
        if (! is_array($polygone) || count($polygone) < 3) {
            return null;
        }

        $coords = [];
        foreach ($polygone as $point) {
            if (is_array($point) && array_key_exists(0, $point) && array_key_exists(1, $point)) {
                $coords[] = [(float) $point[0], (float) $point[1]];
            } elseif (is_array($point) && isset($point['latitude'], $point['longitude'])) {
                $coords[] = [(float) $point['latitude'], (float) $point['longitude']];
            }
        }

        $n = count($coords);
        if ($n < 3) {
            return null;
        }

        $rayonTerre = 6378137; // WGS84, en mètres
        $aire = 0.0;

        for ($i = 0; $i < $n; $i++) {
            [$lat1, $lng1] = $coords[$i];
            [$lat2, $lng2] = $coords[($i + 1) % $n];

            $aire += deg2rad($lng2 - $lng1)
                * (2 + sin(deg2rad($lat1)) + sin(deg2rad($lat2)));
        }

        $aire = abs($aire * $rayonTerre * $rayonTerre / 2);

        return round($aire / 10000, 2);
    }
}
