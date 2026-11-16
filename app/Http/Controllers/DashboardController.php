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
    /**
     * Calcule l'altitude moyenne des sommets du polygone.
     * Si aucune altitude n'est disponible, utilise l'altitude de la parcelle.
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

        return $parcelle->altitude !== null
            ? (float) $parcelle->altitude
            : null;
    }

    public function index(Request $request): Response
    {
        $filtres = $request->only([
            'province_id',
            'commune_id',
            'zone_id',
            'colline_id',
        ]);

        /*
         * MENAGES
         * Les scopes territoriaux existants sont conservés.
         */
        $menages = Menage::query()
            ->when(
                $filtres['colline_id'] ?? null,
                fn ($q, $v) => $q->where('colline_id', $v)
            )
            ->when(
                $filtres['zone_id'] ?? null,
                fn ($q, $v) => $q->whereHas(
                    'colline',
                    fn ($q) => $q->where('zone_id', $v)
                )
            )
            ->when(
                $filtres['commune_id'] ?? null,
                fn ($q, $v) => $q->whereHas(
                    'colline.zone',
                    fn ($q) => $q->where('commune_id', $v)
                )
            )
            ->when(
                $filtres['province_id'] ?? null,
                fn ($q, $v) => $q->whereHas(
                    'colline.zone.commune',
                    fn ($q) => $q->where('province_id', $v)
                )
            );

        $totalMenages = (clone $menages)->count();

        $menagesTermines = (clone $menages)
            ->where('statut', 'termine')
            ->count();

        $menagesEnAttente = (clone $menages)
            ->where('statut', 'en_attente')
            ->count();

        $menagesAFaire = (clone $menages)
            ->where('statut', 'a_faire')
            ->count();

        /*
         * PARCELLES
         */
        $parcelles = Parcelle::query()
            ->whereHas('menage', function ($q) use ($filtres) {

                $q->when(
                    $filtres['colline_id'] ?? null,
                    fn ($q, $v) => $q->where('colline_id', $v)
                )
                ->when(
                    $filtres['zone_id'] ?? null,
                    fn ($q, $v) => $q->whereHas(
                        'colline',
                        fn ($q) => $q->where('zone_id', $v)
                    )
                )
                ->when(
                    $filtres['commune_id'] ?? null,
                    fn ($q, $v) => $q->whereHas(
                        'colline.zone',
                        fn ($q) => $q->where('commune_id', $v)
                    )
                )
                ->when(
                    $filtres['province_id'] ?? null,
                    fn ($q, $v) => $q->whereHas(
                        'colline.zone.commune',
                        fn ($q) => $q->where('province_id', $v)
                    )
                );
            });

        /*
         * POINTS DE LA CARTE
         *
         * Chargement anticipé des relations pour éviter
         * les requêtes répétitives.
         */
        $pointsCarte = (clone $parcelles)
            ->with([

                // MENAGE
                'menage:id,enqueteur_id,colline_id,code_menage,nom_chef_menage,statut',

                // ENQUETEUR
                'menage.enqueteur:id,name',

                // COLLINE
                'menage.colline:id,zone_id',

                // SUPERVISEURS AFFECTES DIRECTEMENT A LA COLLINE
                'menage.colline.superviseursCommunaux:id,name',

                // ZONE
                'menage.colline.zone:id,commune_id',

                // COMMUNE
                'menage.colline.zone.commune:id',

                // SUPERVISEURS VIA LA TABLE commune_user
                'menage.colline.zone.commune.superviseursCommunaux:id,name',

                // ANCIENNES AFFECTATIONS VIA users.commune_id
                'menage.colline.zone.commune.superviseursCommunauxLegacy:id,commune_id,name',
            ])
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

                /*
                 * SUPERFICIE
                 */
                $superficieHa = $this->superficieHectares(
                    $parcelle->polygone
                );

                $polygone = $parcelle->polygone;

                $estPolygone = is_array($polygone)
                    && count($polygone) >= 3;

                /*
                 * INFORMATIONS DE L'ENQUETEUR
                 */
                $nomEnqueteur = $parcelle->menage?->enqueteur?->name;

                /*
                 * SUPERVISEURS COMMUNAUX
                 */

                $colline = $parcelle->menage?->colline;

                $commune = $colline?->zone?->commune;

                // Affectations directes à la colline
                $superviseursColline = $colline?->superviseursCommunaux
                    ?? collect();

                // Affectations via commune_user
                $superviseursCommune = $commune?->superviseursCommunaux
                    ?? collect();

                // Anciennes affectations via users.commune_id
                $superviseursLegacy = $commune?->superviseursCommunauxLegacy
                    ?? collect();

                /*
                 * COMBINER LES TROIS SOURCES
                 *
                 * IMPORTANT :
                 * Ne pas filtrer avec $superviseur->role ici.
                 * Les relations filtrent déjà le rôle.
                 * Le champ role n'est pas sélectionné dans les
                 * relations chargées avec id,name.
                 */
                $superviseurs = $superviseursColline
                    ->concat($superviseursCommune)
                    ->concat($superviseursLegacy)
                    ->unique('id')
                    ->values();

                // Récupérer les noms sans doublons
                $nomsSuperviseurs = $superviseurs
                    ->pluck('name')
                    ->filter()
                    ->unique()
                    ->values()
                    ->all();

                $nomSuperviseur = implode(', ', $nomsSuperviseurs);

                /*
                 * POLYGONE GPS
                 */
                $polygoneFormate = $estPolygone
                    ? array_map(fn ($s) => [
                        'latitude' => (float) $s['latitude'],
                        'longitude' => (float) $s['longitude'],
                        'altitude' => isset($s['altitude'])
                            && $s['altitude'] !== null
                                ? (float) $s['altitude']
                                : null,
                    ], $polygone)
                    : null;

                /*
                 * DONNEES TRANSMISES A REACT / INERTIA
                 */
                return [
                    'id' => $parcelle->id,

                    'latitude' => $parcelle->latitude !== null
                        ? (float) $parcelle->latitude
                        : null,

                    'longitude' => $parcelle->longitude !== null
                        ? (float) $parcelle->longitude
                        : null,

                    'altitude' => $this->altitudeParcelle($parcelle),

                    'polygone' => $polygoneFormate,

                    'nombre_pieds' => $parcelle->nombre_pieds,

                    'etat_verger' => $parcelle->etat_verger,

                    'type' => $parcelle->type,

                    'superficie_ha' => $superficieHa,

                    // INFORMATIONS DU MENAGE
                    'code_menage' => $parcelle->menage?->code_menage,

                    'nom_chef_menage' => $parcelle->menage?->nom_chef_menage,

                    'statut_menage' => $parcelle->menage?->statut,

                    // INFORMATIONS DE L'ENQUETEUR
                    'nom_enqueteur' => $nomEnqueteur,

                    // INFORMATIONS DES SUPERVISEURS
                    'nom_superviseur' => $nomSuperviseur !== ''
                        ? $nomSuperviseur
                        : null,

                    'noms_superviseurs' => $nomsSuperviseurs,
                ];
            });

        /*
         * INDICATEURS DU DASHBOARD
         */
        $kpi = [
            'menages_total' => $totalMenages,

            'menages_termines' => $menagesTermines,

            'menages_en_attente' => $menagesEnAttente,

            'menages_a_faire' => $menagesAFaire,

            'taux_avancement' => $totalMenages > 0
                ? round(($menagesTermines / $totalMenages) * 100, 1)
                : 0,

            'nombre_parcelles' => $pointsCarte->count(),

            'nombre_pieds_cafe' => (int) (clone $parcelles)
                ->sum('nombre_pieds'),

            'superficie_totale_ha' => round(
                $pointsCarte->sum('superficie_ha'),
                2
            ),
        ];

        /*
         * AFFICHAGE DU DASHBOARD
         */
        return Inertia::render('Dashboard', [
            'kpi' => $kpi,

            'pointsCarte' => $pointsCarte,

            'filtres' => $filtres,

            'provinces' => Province::orderBy('nom')
                ->get(['id', 'nom']),

            'communes' => Commune::orderBy('nom')
                ->get(['id', 'nom', 'province_id']),

            'zones' => Zone::orderBy('nom')
                ->get(['id', 'nom', 'commune_id']),

            'collines' => Colline::orderBy('nom')
                ->get(['id', 'nom', 'zone_id']),
        ]);
    }

    /**
     * Calcule la superficie approximative en hectares d'un polygone GPS.
     *
     * Accepte les formats :
     * [[latitude, longitude], ...]
     * ou
     * [['latitude' => ..., 'longitude' => ...], ...]
     */
    private function superficieHectares(mixed $polygone): ?float
    {
        if (!is_array($polygone) || count($polygone) < 3) {
            return null;
        }

        $coords = collect($polygone)
            ->map(function ($point) {

                if (
                    is_array($point)
                    && array_key_exists(0, $point)
                    && array_key_exists(1, $point)
                ) {
                    return [
                        (float) $point[0],
                        (float) $point[1],
                    ];
                }

                if (
                    is_array($point)
                    && isset($point['latitude'], $point['longitude'])
                ) {
                    return [
                        (float) $point['latitude'],
                        (float) $point['longitude'],
                    ];
                }

                return null;
            })
            ->filter()
            ->values();

        if ($coords->count() < 3) {
            return null;
        }

        // Rayon équatorial WGS84 en mètres
        $rayonTerre = 6378137;

        $aire = 0.0;

        $n = $coords->count();

        for ($i = 0; $i < $n; $i++) {

            [$lat1, $lng1] = $coords[$i];

            [$lat2, $lng2] = $coords[($i + 1) % $n];

            $aire += deg2rad($lng2 - $lng1)
                * (
                    2
                    + sin(deg2rad($lat1))
                    + sin(deg2rad($lat2))
                );
        }

        $aire = abs(
            $aire * $rayonTerre * $rayonTerre / 2
        );

        return round($aire / 10000, 2);
    }
}
