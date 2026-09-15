<?php

namespace App\Http\Controllers;

use App\Models\Colline;
use App\Models\Menage;
use App\Models\Parcelle;
use App\Models\Province;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RapportController extends Controller
{

/**
 * Catégorie d'altitude pour la représentation visuelle (couleur) des
 * exports KML/GeoJSON — permet de repérer en un coup d'œil les
 * plantations de plaine/colline par rapport à celles en moyenne/haute
 * montagne. Seuils indicatifs pour le relief burundais (café cultivé
 * typiquement entre ~1200 et ~2000 m).
 */
private function categorieAltitude(?float $altitude): array
{
    if ($altitude === null) {
        return ['id' => 'altitude-inconnue', 'label' => 'Altitude non mesurée', 'hex' => '95a5a6'];
    }

    return match (true) {
        $altitude < 1400 => ['id' => 'altitude-basse', 'label' => 'Basse altitude (< 1400 m)', 'hex' => '2ecc71'],
        $altitude < 1700 => ['id' => 'altitude-moyenne', 'label' => 'Altitude moyenne (1400–1700 m)', 'hex' => 'f1c40f'],
        $altitude < 2000 => ['id' => 'altitude-haute', 'label' => 'Haute altitude (1700–2000 m)', 'hex' => 'e67e22'],
        default => ['id' => 'altitude-montagne', 'label' => 'Très haute altitude / montagne (≥ 2000 m)', 'hex' => '8b4513'],
    };
}

/** Convertit un hex 'RRGGBB' en couleur KML 'aabbggrr' (ordre inversé). */
private function couleurKml(string $hexRrggbb, string $alphaHex = 'ff'): string
{
    $rr = substr($hexRrggbb, 0, 2);
    $gg = substr($hexRrggbb, 2, 2);
    $bb = substr($hexRrggbb, 4, 2);

    return strtolower($alphaHex . $bb . $gg . $rr);
}

    /**
     * Géométrie GeoJSON d'une parcelle : Polygon si un polygone a été
     * capturé (>= 3 sommets), sinon Point. L'altitude est incluse par
     * sommet quand elle est disponible (polygone) ou via la colonne
     * altitude (point).
     */
    private function geometrieParcelle(Parcelle $parcelle): array
    {
        $polygone = $parcelle->polygone; // array de ["latitude" => .., "longitude" => .., "altitude" => ..?] ou null

        if (is_array($polygone) && count($polygone) >= 3) {
            $coordonnees = array_values(array_map(function ($sommet) {
                return array_filter([
                    (float) $sommet['longitude'],
                    (float) $sommet['latitude'],
                    isset($sommet['altitude']) && $sommet['altitude'] !== null
                        ? (float) $sommet['altitude']
                        : null,
                ], fn($v) => $v !== null);
            }, $polygone));

            if ($coordonnees[0] !== end($coordonnees)) {
                $coordonnees[] = $coordonnees[0];
            }

            return ['type' => 'Polygon', 'coordinates' => [$coordonnees]];
        }

        return [
            'type' => 'Point',
            'coordinates' => array_filter([
                (float) $parcelle->longitude,
                (float) $parcelle->latitude,
                $parcelle->altitude !== null ? (float) $parcelle->altitude : null,
            ], fn($v) => $v !== null),
        ];
    }

    /**
     * Altitude "représentative" d'une parcelle, pour affichage tabulaire
     * (CSV/XLSX/PDF) et pour la propriété GeoJSON `altitude` : la valeur
     * de la colonne pour une parcelle ponctuelle, ou la moyenne des
     * altitudes des sommets pour un polygone (si au moins un sommet en a
     * une — les anciens polygones capturés avant l'ajout de l'altitude
     * côté mobile n'en ont aucune, auquel cas on renvoie null).
     */
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

    /**
     * Construit la requête des parcelles géolocalisées selon les filtres
     * du module Rapports : province, enquêteur + intervalle de dates
     * (date de géolocalisation = date de création de la parcelle, faute
     * d'un champ dédié dans le schéma actuel), ou recherche d'un ménage
     * précis (code ou nom du chef de ménage).
     *
     * Comme partout ailleurs, Parcelle::query() applique déjà
     * automatiquement le scope territorial — sans effet ici puisque
     * ce module est de toute façon réservé aux admins (portée nationale).
     */
    private function parcellesFiltrees(Request $request)
    {
        $filtres = $request->only(['province_id', 'commune_id', 'zone_id', 'colline_id', 'enqueteur_id', 'date_debut', 'date_fin', 'menage']);

        return Parcelle::query()
            ->where(function ($q) {
                $q->whereNotNull('latitude')->whereNotNull('longitude')
                    ->orWhereNotNull('polygone');
            })
            ->with(['menage.colline.zone.commune.province', 'menage.enqueteur:id,name'])
            ->when($filtres['colline_id'] ?? null, fn($q, $v) => $q->whereHas(
                'menage',
                fn($q) => $q->where('colline_id', $v)
            ))
            ->when($filtres['zone_id'] ?? null, fn($q, $v) => $q->whereHas(
                'menage.colline',
                fn($q) => $q->where('zone_id', $v)
            ))
            ->when($filtres['commune_id'] ?? null, fn($q, $v) => $q->whereHas(
                'menage.colline.zone',
                fn($q) => $q->where('commune_id', $v)
            ))
            ->when($filtres['province_id'] ?? null, fn($q, $v) => $q->whereHas(
                'menage.colline.zone.commune',
                fn($q) => $q->where('province_id', $v)
            ))
            ->when($filtres['enqueteur_id'] ?? null, fn($q, $v) => $q->whereHas(
                'menage',
                fn($q) => $q->where('enqueteur_id', $v)
            ))
            ->when($filtres['date_debut'] ?? null, fn($q, $v) => $q->whereDate('parcelles.created_at', '>=', $v))
            ->when($filtres['date_fin'] ?? null, fn($q, $v) => $q->whereDate('parcelles.created_at', '<=', $v))
            ->when($filtres['menage'] ?? null, fn($q, $v) => $q->whereHas(
                'menage',
                fn($q) => $q->where('code_menage', 'like', "%{$v}%")
                    ->orWhere('nom_chef_menage', 'like', "%{$v}%")
                    ->orWhere('prenom_chef_menage', 'like', "%{$v}%")
            ));
    }

    /**
     * Enquêteurs à proposer dans le filtre "Enquêteur", restreints au
     * niveau territorial le plus précis déjà sélectionné (colline > zone
     * > commune > province). Même correctif que StatistiqueController :
     * un enquêteur n'apparaît dans ce filtre que s'il est affecté
     * (colline_user) quelque part dans le périmètre déjà choisi.
     */
    private function enqueteursFiltres(array $filtres)
    {
        $query = User::where('role', 'enqueteur');

        if ($collineId = $filtres['colline_id'] ?? null) {
            $query->whereHas('collines', fn($q) => $q->where('collines.id', $collineId));
        } elseif ($zoneId = $filtres['zone_id'] ?? null) {
            $query->whereHas('collines', fn($q) => $q->where('zone_id', $zoneId));
        } elseif ($communeId = $filtres['commune_id'] ?? null) {
            $query->whereHas('collines.zone', fn($q) => $q->where('commune_id', $communeId));
        } elseif ($provinceId = $filtres['province_id'] ?? null) {
            $query->whereHas('collines.zone.commune', fn($q) => $q->where('province_id', $provinceId));
        }

        return $query->orderBy('name')->get(['id', 'name']);
    }

    public function index(Request $request): Response
    {
        $filtres = $request->only(['province_id', 'commune_id', 'zone_id', 'colline_id', 'enqueteur_id', 'date_debut', 'date_fin', 'menage']);

        $parcelles = $this->parcellesFiltrees($request)->get();

        $points = $parcelles->map(function (Parcelle $parcelle) {
            $polygone = $parcelle->polygone;
            $estPolygone = is_array($polygone) && count($polygone) >= 3;

            if ($estPolygone) {
                $latitude = collect($polygone)->avg(fn($s) => (float) $s['latitude']);
                $longitude = collect($polygone)->avg(fn($s) => (float) $s['longitude']);
            } else {
                $latitude = $parcelle->latitude !== null ? (float) $parcelle->latitude : null;
                $longitude = $parcelle->longitude !== null ? (float) $parcelle->longitude : null;
            }

            if ($latitude === null || $longitude === null) {
                return null; // parcelle sans géométrie exploitable
            }

            return [
                'id' => $parcelle->id,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'altitude' => $this->altitudeParcelle($parcelle),
                'superficie_ha' => $this->superficieHectares($polygone),
                'polygone' => $estPolygone ? array_map(fn($s) => [
                    'latitude' => (float) $s['latitude'],
                    'longitude' => (float) $s['longitude'],
                    'altitude' => isset($s['altitude']) && $s['altitude'] !== null ? (float) $s['altitude'] : null,
                ], $polygone) : null,
                'nombre_pieds' => $parcelle->nombre_pieds,
                'etat_verger' => $parcelle->etat_verger,
                'date_geolocalisation' => $parcelle->created_at->format('d/m/Y'),
                'menage_id' => $parcelle->menage->id,
                'code_menage' => $parcelle->menage->code_menage,
                'nom_chef_menage' => trim($parcelle->menage->prenom_chef_menage . ' ' . $parcelle->menage->nom_chef_menage),
                'province' => $parcelle->menage->colline?->zone?->commune?->province?->nom,
                'commune' => $parcelle->menage->colline?->zone?->commune?->nom,
                'enqueteur' => $parcelle->menage->enqueteur?->name,
            ];
        })->filter()->values();

        // Si la recherche cible un ménage précis, on renvoie aussi sa
        // fiche complète (toutes ses parcelles) pour l'affichage dédié.
        $menageCible = null;
        if ($filtres['menage'] ?? null) {
            $menageCible = Menage::query()
                ->where('code_menage', 'like', "%{$filtres['menage']}%")
                ->orWhere('nom_chef_menage', 'like', "%{$filtres['menage']}%")
                ->orWhere('prenom_chef_menage', 'like', "%{$filtres['menage']}%")
                ->with(['colline.zone.commune.province', 'enqueteur:id,name', 'parcelles'])
                ->first();
        }

        // --- Enquêteurs affectés à la colline sélectionnée ---
        //
        // Dès qu'une colline précise est choisie dans les filtres, on
        // affiche TOUS les enquêteurs qui y sont affectés (table pivot
        // colline_user, cf. User::collines()), y compris ceux qui n'ont
        // encore rien géolocalisé — utile pour repérer un enquêteur
        // affecté mais inactif sur le terrain, ou une colline sans
        // personne affectée. Les statistiques affichées portent sur les
        // parcelles déjà filtrées ci-dessus (donc déjà restreintes à
        // cette colline et aux autres filtres actifs).
        $collineSelectionnee = null;
        $enqueteursColline = collect();

        if ($collineId = $filtres['colline_id'] ?? null) {
            $collineSelectionnee = Colline::find($collineId, ['id', 'nom']);

            $statsParEnqueteurId = $parcelles
                ->filter(fn($p) => $p->menage->enqueteur_id !== null)
                ->groupBy(fn($p) => $p->menage->enqueteur_id)
                ->map(fn($groupe) => [
                    'menages' => $groupe->pluck('menage_id')->unique()->count(),
                    'parcelles' => $groupe->count(),
                    'pieds' => (int) $groupe->sum('nombre_pieds'),
                ]);

            $enqueteursColline = User::where('role', 'enqueteur')
                ->whereHas('collines', fn($q) => $q->where('collines.id', $collineId))
                ->orderBy('name')
                ->get(['id', 'name', 'actif'])
                ->map(function ($u) use ($statsParEnqueteurId) {
                    $stats = $statsParEnqueteurId->get($u->id, [
                        'menages' => 0,
                        'parcelles' => 0,
                        'pieds' => 0,
                    ]);

                    return array_merge([
                        'id' => $u->id,
                        'enqueteur' => $u->name,
                        'actif' => (bool) $u->actif,
                    ], $stats);
                })
                ->values();
        }

        return Inertia::render('Rapports/Index', [
            'filtres' => $filtres,
            'points' => $points,
            'menageCible' => $menageCible,
            'provinces' => Province::orderBy('nom')->get(['id', 'nom']),
            'communes' => \App\Models\Commune::orderBy('nom')->get(['id', 'nom', 'province_id']),
            'zones' => \App\Models\Zone::orderBy('nom')->get(['id', 'nom', 'commune_id']),
            'collines' => \App\Models\Colline::orderBy('nom')->get(['id', 'nom', 'zone_id']),
            'enqueteurs' => $this->enqueteursFiltres($filtres),
            'collineSelectionnee' => $collineSelectionnee,
            'enqueteursColline' => $enqueteursColline,
            'total' => $points->count(),
            'superficieTotaleHa' => round($points->sum('superficie_ha'), 2),
        ]);
    }

    /**
     * Rapport général — document PDF destiné à la direction (résumé +
     * détail complet de la géolocalisation), mêmes filtres que l'écran.
     */
    public function pdf(Request $request)
    {
        $parcelles = $this->parcellesFiltrees($request)->get();
        $parcelles->each(function (Parcelle $parcelle) {
            $parcelle->superficie_ha = $this->superficieHectares($parcelle->polygone);
        });

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('rapports.general-pdf', [
            'parcelles' => $parcelles,
            'genereLe' => now()->format('d/m/Y H:i'),
            'totalPieds' => $parcelles->sum('nombre_pieds'),
            'totalMenages' => $parcelles->pluck('menage_id')->unique()->count(),
            'totalSuperficieHa' => round($parcelles->sum('superficie_ha'), 2),
        ])->setPaper('a4', 'landscape');

        return $pdf->download('rapport_geolocalisation_' . now()->format('Y-m-d_His') . '.pdf');
    }

    /**
     * Rapport analytique — classeur Excel à deux feuilles : données
     * brutes complètes + synthèse par province, pour analyse/statistiques.
     */
    public function xlsx(Request $request)
    {
        $parcelles = $this->parcellesFiltrees($request)->get();

        $classeur = new \PhpOffice\PhpSpreadsheet\Spreadsheet;

        // --- Feuille 1 : données brutes complètes ---
        $feuilleDonnees = $classeur->getActiveSheet();
        $feuilleDonnees->setTitle('Données géolocalisation');

        $entetes = [
            'Code ménage',
            'Chef de ménage',
            'Type de ménage',
            'CNI',
            'Téléphone',
            'Province',
            'Commune',
            'Zone',
            'Colline',
            'Enquêteur',
            'Latitude',
            'Longitude',
            'Altitude',
            'Superficie (ha)',
            'Géométrie',
            'Coordonnées polygone (JSON)',
            'Mode positionnement',
            'Mode acquisition',
            'Nombre de pieds',
            'État du verger',
            'Type',
            'Année mise en place',
            'Pièce justificative',
            'Notes',
            'Date de géolocalisation',
        ];
        $feuilleDonnees->fromArray($entetes, null, 'A1');

        $ligne = 2;
        foreach ($parcelles as $parcelle) {
            $menage = $parcelle->menage;
            $polygone = $parcelle->polygone;
            $estPolygone = is_array($polygone) && count($polygone) >= 3;
            $superficieHa = $this->superficieHectares($polygone);

            $feuilleDonnees->fromArray([
                $menage->code_menage,
                trim($menage->prenom_chef_menage . ' ' . $menage->nom_chef_menage),
                $menage->type_menage,
                $menage->cni,
                $menage->telephone,
                $menage->colline?->zone?->commune?->province?->nom,
                $menage->colline?->zone?->commune?->nom,
                $menage->colline?->zone?->nom,
                $menage->colline?->nom,
                $menage->enqueteur?->name,
                $estPolygone ? null : ((float) $parcelle->latitude),
                $estPolygone ? null : ((float) $parcelle->longitude),
                $this->altitudeParcelle($parcelle),
                $superficieHa,
                $estPolygone ? ('Polygone (' . count($polygone) . ' sommets)') : 'Point',
                $estPolygone ? json_encode(array_map(fn($s) => [
                    'latitude' => (float) $s['latitude'],
                    'longitude' => (float) $s['longitude'],
                    'altitude' => isset($s['altitude']) && $s['altitude'] !== null ? (float) $s['altitude'] : null,
                ], $polygone), JSON_UNESCAPED_UNICODE) : null,
                $parcelle->mode_positionnement,
                $parcelle->mode_acquisition,
                $parcelle->nombre_pieds,
                $parcelle->etat_verger,
                $parcelle->type,
                $parcelle->annee_mise_en_place,
                $parcelle->piece_justificative,
                $parcelle->notes,
                $parcelle->created_at->format('d/m/Y'),
            ], null, "A{$ligne}");
            $ligne++;
        }

        $derniereLigne = $ligne - 1;
        $feuilleDonnees->getStyle('A1:Y1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => 'CE1126']],
        ]);
        if ($derniereLigne >= 1) {
            $feuilleDonnees->setAutoFilter("A1:Y{$derniereLigne}");
        }
        $feuilleDonnees->freezePane('A2');
        foreach (range('A', 'Y') as $colonne) {
            $feuilleDonnees->getColumnDimension($colonne)->setAutoSize(true);
        }

        // --- Feuille 2 : synthèse par province ---
        $feuilleSynthese = $classeur->createSheet();
        $feuilleSynthese->setTitle('Synthèse par province');
        $feuilleSynthese->fromArray(['Province', 'Nombre de parcelles', 'Nombre de ménages', 'Total pieds de café', 'Superficie totale (ha)'], null, 'A1');

        $parProvince = $parcelles->groupBy(fn($p) => $p->menage->colline?->zone?->commune?->province?->nom ?? 'Non renseigné');
        $ligne = 2;
        foreach ($parProvince as $province => $groupe) {
            $feuilleSynthese->fromArray([
                $province,
                $groupe->count(),
                $groupe->pluck('menage_id')->unique()->count(),
                $groupe->sum('nombre_pieds'),
                round($groupe->sum(fn($p) => $this->superficieHectares($p->polygone) ?? 0), 2),
            ], null, "A{$ligne}");
            $ligne++;
        }
        $feuilleSynthese->getStyle('A1:E1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => '1EB53A']],
        ]);
        foreach (range('A', 'E') as $colonne) {
            $feuilleSynthese->getColumnDimension($colonne)->setAutoSize(true);
        }

        $classeur->setActiveSheetIndex(0);

        $nomFichier = 'rapport_analytique_' . now()->format('Y-m-d_His') . '.xlsx';

        return response()->streamDownload(function () use ($classeur) {
            (new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($classeur))->save('php://output');
        }, $nomFichier, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Données brutes — CSV complet avec tous les champs de
     * géolocalisation, pour traitement dans Excel/Power BI.
     */
    public function csv(Request $request)
    {
        $parcelles = $this->parcellesFiltrees($request)->get();

        $nomFichier = 'donnees_brutes_' . now()->format('Y-m-d_His') . '.csv';

        return response()->streamDownload(function () use ($parcelles) {
            $sortie = fopen('php://output', 'w');
            fwrite($sortie, "\xEF\xBB\xBF");

            fputcsv($sortie, [
                'Code ménage',
                'Chef de ménage',
                'Type de ménage',
                'CNI',
                'Téléphone',
                'Province',
                'Commune',
                'Zone',
                'Colline',
                'Enquêteur',
                'Latitude',
                'Longitude',
                'Altitude',
                'Superficie (ha)',
                'Géométrie',
                'Coordonnées polygone (JSON)',
                'Mode positionnement',
                'Mode acquisition',
                'Nombre de pieds',
                'État du verger',
                'Type',
                'Année mise en place',
                'Pièce justificative',
                'Notes',
                'Date de géolocalisation',
            ]);

            foreach ($parcelles as $parcelle) {
                $menage = $parcelle->menage;
                $polygone = $parcelle->polygone;
                $estPolygone = is_array($polygone) && count($polygone) >= 3;

                fputcsv($sortie, [
                    $menage->code_menage,
                    trim($menage->prenom_chef_menage . ' ' . $menage->nom_chef_menage),
                    $menage->type_menage,
                    $menage->cni,
                    $menage->telephone,
                    $menage->colline?->zone?->commune?->province?->nom,
                    $menage->colline?->zone?->commune?->nom,
                    $menage->colline?->zone?->nom,
                    $menage->colline?->nom,
                    $menage->enqueteur?->name,
                    $estPolygone ? '' : $parcelle->latitude,
                    $estPolygone ? '' : $parcelle->longitude,
                    $this->altitudeParcelle($parcelle),
                    $this->superficieHectares($polygone),
                    $estPolygone ? ('Polygone (' . count($polygone) . ' sommets)') : 'Point',
                    $estPolygone ? json_encode(array_map(fn($s) => [
                        'latitude' => (float) $s['latitude'],
                        'longitude' => (float) $s['longitude'],
                        'altitude' => isset($s['altitude']) && $s['altitude'] !== null ? (float) $s['altitude'] : null,
                    ], $polygone), JSON_UNESCAPED_UNICODE) : '',
                    $parcelle->mode_positionnement,
                    $parcelle->mode_acquisition,
                    $parcelle->nombre_pieds,
                    $parcelle->etat_verger,
                    $parcelle->type,
                    $parcelle->annee_mise_en_place,
                    $parcelle->piece_justificative,
                    $parcelle->notes,
                    $parcelle->created_at->format('d/m/Y'),
                ]);
            }

            fclose($sortie);
        }, $nomFichier, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * Données cartographiques — KML, pour ouverture directe dans
     * Google Earth. Polygone si capturé (avec altitude par sommet
     * quand disponible), sinon Point.
     */
    public function kml(Request $request)
{
    $parcelles = $this->parcellesFiltrees($request)->get();

    $nomFichier = 'donnees_cartographiques_' . now()->format('Y-m-d_His') . '.kml';

    $xml = new \SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"></kml>');
    $document = $xml->addChild('Document');
    $document->addChild('name', 'Plantations de café géolocalisées — LNC Burundi');

    // --- Styles par catégorie d'altitude, définis une seule fois et
    // référencés par styleUrl sur chaque Placemark (plus léger que des
    // styles en ligne, et donne une légende cohérente dans Google Earth) ---
    $categories = [
        ['id' => 'altitude-basse', 'hex' => '2ecc71'],
        ['id' => 'altitude-moyenne', 'hex' => 'f1c40f'],
        ['id' => 'altitude-haute', 'hex' => 'e67e22'],
        ['id' => 'altitude-montagne', 'hex' => '8b4513'],
        ['id' => 'altitude-inconnue', 'hex' => '95a5a6'],
    ];

    foreach ($categories as $categorie) {
        $style = $document->addChild('Style');
        $style->addAttribute('id', $categorie['id']);

        $iconStyle = $style->addChild('IconStyle');
        $iconStyle->addChild('color', $this->couleurKml($categorie['hex']));
        $iconStyle->addChild('scale', '1.1');
        $iconStyle->addChild('Icon')->addChild('href', 'https://maps.google.com/mapfiles/kml/paddle/wht-blank.png');

        $lineStyle = $style->addChild('LineStyle');
        $lineStyle->addChild('color', $this->couleurKml($categorie['hex']));
        $lineStyle->addChild('width', '2');

        $polyStyle = $style->addChild('PolyStyle');
        $polyStyle->addChild('color', $this->couleurKml($categorie['hex'], '99')); // semi-transparent
    }

    foreach ($parcelles as $parcelle) {
        $menage = $parcelle->menage;
        $placemark = $document->addChild('Placemark');
        $nom = trim(($menage->prenom_chef_menage ?? '') . ' ' . ($menage->nom_chef_menage ?? ''));

        $placemark->addChild('name', htmlspecialchars($nom));

        $altitude = $this->altitudeParcelle($parcelle);
        $categorie = $this->categorieAltitude($altitude);
        $placemark->addChild('styleUrl', '#' . $categorie['id']);

        $altitudeTexte = $altitude !== null ? round($altitude) . ' m' : 'non mesurée';
        $superficieHa = $this->superficieHectares($parcelle->polygone);
        $superficieTexte = $superficieHa !== null ? number_format($superficieHa, 2, ',', ' ') . ' ha' : 'non calculée';


        $description = sprintf(
            'Chef de ménage : %s | Code : %s | Province : %s | Commune : %s | Pieds de café : %s | Superficie : %s | État du verger : %s | Type : %s | Altitude : %s (%s)',
            trim($menage->prenom_chef_menage . ' ' . $menage->nom_chef_menage),
            $menage->code_menage,
            $menage->colline?->zone?->commune?->province?->nom,
            $menage->colline?->zone?->commune?->nom,
            $parcelle->nombre_pieds ?? '—',
            $superficieTexte,
            $parcelle->etat_verger ?? '—',
            $parcelle->type ?? '—',
            $altitudeTexte,
            $categorie['label'],
        );
        $placemark->addChild('description', htmlspecialchars($description));

       $polygone = $parcelle->polygone;

if (is_array($polygone) && count($polygone) >= 3) {

    $polygon = $placemark->addChild('Polygon');

    // Determine if the polygon has usable altitude values
    $hasAltitude = collect($polygone)->every(function ($point) {
        return isset($point['altitude'])
            && is_numeric($point['altitude']);
    });

    if ($hasAltitude) {
        // Google Earth: altitude is measured from sea level
        $polygon->addChild('altitudeMode', 'absolute');
    } else {
        // Normal ground polygon
        $polygon->addChild('altitudeMode', 'clampToGround');
        $polygon->addChild('tessellate', '1');
    }

    $coordinates = [];

    foreach ($polygone as $point) {

        $longitude = (float) $point['longitude'];
        $latitude  = (float) $point['latitude'];

        if ($hasAltitude) {
            $altitude = (float) $point['altitude'];

            $coordinates[] = sprintf(
                '%.7f,%.7f,%.3f',
                $longitude,
                $latitude,
                $altitude
            );
        } else {
            $coordinates[] = sprintf(
                '%.7f,%.7f',
                $longitude,
                $latitude
            );
        }
    }

    // Close LinearRing
    $coordinates[] = $coordinates[0];

    $outerBoundary = $polygon->addChild('outerBoundaryIs');
    $linearRing = $outerBoundary->addChild('LinearRing');

    $linearRing->addChild(
        'coordinates',
        implode(' ', $coordinates)
    );
}
 elseif ($parcelle->latitude !== null && $parcelle->longitude !== null) {
    $point = $placemark->addChild('Point');

    if ($parcelle->altitude !== null) {
        $point->addChild('extrude', '1');
        $point->addChild('altitudeMode', 'absolute');
        $point->addChild('coordinates', "{$parcelle->longitude},{$parcelle->latitude},{$parcelle->altitude}");
    } else {
        $point->addChild('altitudeMode', 'clampToGround');
        $point->addChild('coordinates', "{$parcelle->longitude},{$parcelle->latitude}");
    }
}
    }

    return response($xml->asXML(), 200, [
        'Content-Type' => 'application/vnd.google-earth.kml+xml',
        'Content-Disposition' => "attachment; filename=\"{$nomFichier}\"",
    ]);
}

    /**
     * Données géographiques — GeoJSON complet, pour SIG (QGIS) et
     * cartes web. Polygone si capturé (altitude par sommet quand
     * disponible), sinon Point.
     */
   public function geojson(Request $request)
{
    $parcelles = $this->parcellesFiltrees($request)->get();

    $featureCollection = [
        'type' => 'FeatureCollection',
        'features' => $parcelles->map(function (Parcelle $parcelle) {
            $menage = $parcelle->menage;
            $altitude = $this->altitudeParcelle($parcelle);
            $categorie = $this->categorieAltitude($altitude);
            $couleurHex = '#' . $categorie['hex'];
            $estPolygone = $this->geometrieParcelle($parcelle)['type'] === 'Polygon';

            $proprietesStyle = $estPolygone
                ? ['stroke' => $couleurHex, 'stroke-width' => 2, 'stroke-opacity' => 1, 'fill' => $couleurHex, 'fill-opacity' => 0.4]
                : ['marker-color' => $couleurHex, 'marker-symbol' => 'circle'];

            return [
                'type' => 'Feature',
                'geometry' => $this->geometrieParcelle($parcelle),
                'properties' => array_merge([
                    'code_menage' => $menage->code_menage,
                    'chef_menage' => trim($menage->prenom_chef_menage . ' ' . $menage->nom_chef_menage),
                    'type_menage' => $menage->type_menage,
                    'province' => $menage->colline?->zone?->commune?->province?->nom,
                    'commune' => $menage->colline?->zone?->commune?->nom,
                    'zone' => $menage->colline?->zone?->nom,
                    'colline' => $menage->colline?->nom,
                    'enqueteur' => $menage->enqueteur?->name,
                    'nombre_pieds' => $parcelle->nombre_pieds,
                    'superficie_ha' => $this->superficieHectares($parcelle->polygone),
                    'etat_verger' => $parcelle->etat_verger,
                    'type' => $parcelle->type ?? '—',
                    'altitude' => $altitude,
                    'categorie_altitude' => $categorie['label'],
                    'annee_mise_en_place' => $parcelle->annee_mise_en_place,
                    'mode_acquisition' => $parcelle->mode_acquisition,
                    'date_geolocalisation' => $parcelle->created_at->format('Y-m-d'),
                ], $proprietesStyle),
            ];
        })->values(),
    ];

    $nomFichier = 'donnees_geographiques_' . now()->format('Y-m-d_His') . '.geojson';

    return response()->json($featureCollection)
        ->header('Content-Disposition', "attachment; filename=\"{$nomFichier}\"");
}


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
