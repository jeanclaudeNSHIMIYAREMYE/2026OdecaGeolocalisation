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
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->with(['menage.colline.zone.commune.province', 'menage.enqueteur:id,name'])
            ->when($filtres['colline_id'] ?? null, fn ($q, $v) => $q->whereHas(
                'menage',
                fn ($q) => $q->where('colline_id', $v)
            ))
            ->when($filtres['zone_id'] ?? null, fn ($q, $v) => $q->whereHas(
                'menage.colline',
                fn ($q) => $q->where('zone_id', $v)
            ))
            ->when($filtres['commune_id'] ?? null, fn ($q, $v) => $q->whereHas(
                'menage.colline.zone',
                fn ($q) => $q->where('commune_id', $v)
            ))
            ->when($filtres['province_id'] ?? null, fn ($q, $v) => $q->whereHas(
                'menage.colline.zone.commune',
                fn ($q) => $q->where('province_id', $v)
            ))
            ->when($filtres['enqueteur_id'] ?? null, fn ($q, $v) => $q->whereHas(
                'menage',
                fn ($q) => $q->where('enqueteur_id', $v)
            ))
            ->when($filtres['date_debut'] ?? null, fn ($q, $v) => $q->whereDate('parcelles.created_at', '>=', $v))
            ->when($filtres['date_fin'] ?? null, fn ($q, $v) => $q->whereDate('parcelles.created_at', '<=', $v))
            ->when($filtres['menage'] ?? null, fn ($q, $v) => $q->whereHas(
                'menage',
                fn ($q) => $q->where('code_menage', 'like', "%{$v}%")
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
            $query->whereHas('collines', fn ($q) => $q->where('collines.id', $collineId));
        } elseif ($zoneId = $filtres['zone_id'] ?? null) {
            $query->whereHas('collines', fn ($q) => $q->where('zone_id', $zoneId));
        } elseif ($communeId = $filtres['commune_id'] ?? null) {
            $query->whereHas('collines.zone', fn ($q) => $q->where('commune_id', $communeId));
        } elseif ($provinceId = $filtres['province_id'] ?? null) {
            $query->whereHas('collines.zone.commune', fn ($q) => $q->where('province_id', $provinceId));
        }

        return $query->orderBy('name')->get(['id', 'name']);
    }

    public function index(Request $request): Response
    {
        $filtres = $request->only(['province_id', 'commune_id', 'zone_id', 'colline_id', 'enqueteur_id', 'date_debut', 'date_fin', 'menage']);

        $parcelles = $this->parcellesFiltrees($request)->get();

        $points = $parcelles->map(fn (Parcelle $parcelle) => [
            'id' => $parcelle->id,
            'latitude' => (float) $parcelle->latitude,
            'longitude' => (float) $parcelle->longitude,
            'nombre_pieds' => $parcelle->nombre_pieds,
            'etat_verger' => $parcelle->etat_verger,
            'date_geolocalisation' => $parcelle->created_at->format('d/m/Y'),
            'menage_id' => $parcelle->menage->id,
            'code_menage' => $parcelle->menage->code_menage,
            'nom_chef_menage' => trim($parcelle->menage->prenom_chef_menage . ' ' . $parcelle->menage->nom_chef_menage),
            'province' => $parcelle->menage->colline?->zone?->commune?->province?->nom,
            'commune' => $parcelle->menage->colline?->zone?->commune?->nom,
            'enqueteur' => $parcelle->menage->enqueteur?->name,
        ]);

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
                ->filter(fn ($p) => $p->menage->enqueteur_id !== null)
                ->groupBy(fn ($p) => $p->menage->enqueteur_id)
                ->map(fn ($groupe) => [
                    'menages' => $groupe->pluck('menage_id')->unique()->count(),
                    'parcelles' => $groupe->count(),
                    'pieds' => (int) $groupe->sum('nombre_pieds'),
                ]);

            $enqueteursColline = User::where('role', 'enqueteur')
                ->whereHas('collines', fn ($q) => $q->where('collines.id', $collineId))
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
        ]);
    }

    /**
     * Rapport général — document PDF destiné à la direction (résumé +
     * détail complet de la géolocalisation), mêmes filtres que l'écran.
     */
    public function pdf(Request $request)
    {
        $parcelles = $this->parcellesFiltrees($request)->get();

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('rapports.general-pdf', [
            'parcelles' => $parcelles,
            'genereLe' => now()->format('d/m/Y H:i'),
            'totalPieds' => $parcelles->sum('nombre_pieds'),
            'totalMenages' => $parcelles->pluck('menage_id')->unique()->count(),
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
            'Code ménage', 'Chef de ménage', 'Type de ménage', 'CNI', 'Téléphone',
            'Province', 'Commune', 'Zone', 'Colline', 'Enquêteur',
            'Latitude', 'Longitude', 'Mode positionnement', 'Mode acquisition',
            'Nombre de pieds', 'État du verger', 'Année mise en place',
            'Pièce justificative', 'Notes', 'Date de géolocalisation',
        ];
        $feuilleDonnees->fromArray($entetes, null, 'A1');

        $ligne = 2;
        foreach ($parcelles as $parcelle) {
            $menage = $parcelle->menage;
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
                (float) $parcelle->latitude,
                (float) $parcelle->longitude,
                $parcelle->mode_positionnement,
                $parcelle->mode_acquisition,
                $parcelle->nombre_pieds,
                $parcelle->etat_verger,
                $parcelle->annee_mise_en_place,
                $parcelle->piece_justificative,
                $parcelle->notes,
                $parcelle->created_at->format('d/m/Y'),
            ], null, "A{$ligne}");
            $ligne++;
        }

        $derniereLigne = $ligne - 1;
        $feuilleDonnees->getStyle('A1:T1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => 'CE1126']],
        ]);
        if ($derniereLigne >= 1) {
            $feuilleDonnees->setAutoFilter("A1:T{$derniereLigne}");
        }
        $feuilleDonnees->freezePane('A2');
        foreach (range('A', 'T') as $colonne) {
            $feuilleDonnees->getColumnDimension($colonne)->setAutoSize(true);
        }

        // --- Feuille 2 : synthèse par province ---
        $feuilleSynthese = $classeur->createSheet();
        $feuilleSynthese->setTitle('Synthèse par province');
        $feuilleSynthese->fromArray(['Province', 'Nombre de parcelles', 'Nombre de ménages', 'Total pieds de café'], null, 'A1');

        $parProvince = $parcelles->groupBy(fn ($p) => $p->menage->colline?->zone?->commune?->province?->nom ?? 'Non renseigné');
        $ligne = 2;
        foreach ($parProvince as $province => $groupe) {
            $feuilleSynthese->fromArray([
                $province,
                $groupe->count(),
                $groupe->pluck('menage_id')->unique()->count(),
                $groupe->sum('nombre_pieds'),
            ], null, "A{$ligne}");
            $ligne++;
        }
        $feuilleSynthese->getStyle('A1:D1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => '1EB53A']],
        ]);
        foreach (range('A', 'D') as $colonne) {
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
                'Code ménage', 'Chef de ménage', 'Type de ménage', 'CNI', 'Téléphone',
                'Province', 'Commune', 'Zone', 'Colline', 'Enquêteur',
                'Latitude', 'Longitude', 'Mode positionnement', 'Mode acquisition',
                'Nombre de pieds', 'État du verger', 'Année mise en place',
                'Pièce justificative', 'Notes', 'Date de géolocalisation',
            ]);

            foreach ($parcelles as $parcelle) {
                $menage = $parcelle->menage;
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
                    $parcelle->latitude,
                    $parcelle->longitude,
                    $parcelle->mode_positionnement,
                    $parcelle->mode_acquisition,
                    $parcelle->nombre_pieds,
                    $parcelle->etat_verger,
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
     * Google Earth.
     */
    public function kml(Request $request)
    {
        $parcelles = $this->parcellesFiltrees($request)->get();

        $nomFichier = 'donnees_cartographiques_' . now()->format('Y-m-d_His') . '.kml';

        $xml = new \SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"></kml>');
        $document = $xml->addChild('Document');
        $document->addChild('name', 'Plantations de café géolocalisées — LNC Burundi');

        foreach ($parcelles as $parcelle) {
            $menage = $parcelle->menage;
            $placemark = $document->addChild('Placemark');
            $placemark->addChild('name', htmlspecialchars($menage->code_menage));

            $description = sprintf(
                'Chef de ménage : %s | Province : %s | Commune : %s | Pieds de café : %s | État du verger : %s',
                trim($menage->prenom_chef_menage . ' ' . $menage->nom_chef_menage),
                $menage->colline?->zone?->commune?->province?->nom,
                $menage->colline?->zone?->commune?->nom,
                $parcelle->nombre_pieds ?? '—',
                $parcelle->etat_verger ?? '—',
            );
            $placemark->addChild('description', htmlspecialchars($description));

            $point = $placemark->addChild('Point');
            $point->addChild('coordinates', "{$parcelle->longitude},{$parcelle->latitude},0");
        }

        return response($xml->asXML(), 200, [
            'Content-Type' => 'application/vnd.google-earth.kml+xml',
            'Content-Disposition' => "attachment; filename=\"{$nomFichier}\"",
        ]);
    }

    /**
     * Données géographiques — GeoJSON complet, pour SIG (QGIS) et
     * cartes web.
     */
    public function geojson(Request $request)
    {
        $parcelles = $this->parcellesFiltrees($request)->get();

        $featureCollection = [
            'type' => 'FeatureCollection',
            'features' => $parcelles->map(function (Parcelle $parcelle) {
                $menage = $parcelle->menage;

                return [
                    'type' => 'Feature',
                    'geometry' => [
                        'type' => 'Point',
                        'coordinates' => [(float) $parcelle->longitude, (float) $parcelle->latitude],
                    ],
                    'properties' => [
                        'code_menage' => $menage->code_menage,
                        'chef_menage' => trim($menage->prenom_chef_menage . ' ' . $menage->nom_chef_menage),
                        'type_menage' => $menage->type_menage,
                        'province' => $menage->colline?->zone?->commune?->province?->nom,
                        'commune' => $menage->colline?->zone?->commune?->nom,
                        'zone' => $menage->colline?->zone?->nom,
                        'colline' => $menage->colline?->nom,
                        'enqueteur' => $menage->enqueteur?->name,
                        'nombre_pieds' => $parcelle->nombre_pieds,
                        'etat_verger' => $parcelle->etat_verger,
                        'annee_mise_en_place' => $parcelle->annee_mise_en_place,
                        'mode_acquisition' => $parcelle->mode_acquisition,
                        'date_geolocalisation' => $parcelle->created_at->format('Y-m-d'),
                    ],
                ];
            })->values(),
        ];

        $nomFichier = 'donnees_geographiques_' . now()->format('Y-m-d_His') . '.geojson';

        return response()->json($featureCollection)
            ->header('Content-Disposition', "attachment; filename=\"{$nomFichier}\"");
    }
}
