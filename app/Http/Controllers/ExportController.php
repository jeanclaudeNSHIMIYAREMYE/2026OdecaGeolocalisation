<?php

namespace App\Http\Controllers;

use App\Models\Menage;
use App\Models\Parcelle;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    /**
     * Applique les mêmes filtres territoriaux/statut que la liste des
     * ménages (MenageController::index). Le scope territorial de
     * l'utilisateur connecté est, comme partout ailleurs, déjà appliqué
     * automatiquement par le modèle Menage.
     */
    private function menagesFiltres(Request $request)
    {
        $filtres = $request->only(['statut', 'province_id', 'commune_id', 'zone_id', 'colline_id']);

        return Menage::query()
            ->with(['colline.zone.commune.province', 'enqueteur:id,name'])
            ->when($filtres['statut'] ?? null, fn ($q, $v) => $q->where('statut', $v))
            ->when($filtres['colline_id'] ?? null, fn ($q, $v) => $q->where('colline_id', $v))
            ->when($filtres['zone_id'] ?? null, fn ($q, $v) => $q->whereHas('colline', fn ($q) => $q->where('zone_id', $v)))
            ->when($filtres['commune_id'] ?? null, fn ($q, $v) => $q->whereHas('colline.zone', fn ($q) => $q->where('commune_id', $v)))
            ->when($filtres['province_id'] ?? null, fn ($q, $v) => $q->whereHas('colline.zone.commune', fn ($q) => $q->where('province_id', $v)))
            ->orderBy('code_menage');
    }

    /**
     * Export .xlsx : un vrai tableau Excel formaté (en-tête stylé,
     * auto-filtre, colonnes ajustées, première ligne figée) — plus
     * pratique pour trier/filtrer les données qu'un simple CSV.
     * Nécessite : composer require phpoffice/phpspreadsheet
     */
    public function xlsx(Request $request): StreamedResponse
    {
        $menages = $this->menagesFiltres($request)->get();

        $entetes = [
            'Code ménage', 'Nom chef de ménage', 'Prénom chef de ménage', 'Téléphone',
            'Province', 'Commune', 'Zone', 'Colline', 'Statut', 'Enquêteur',
            'Nombre de parcelles', 'Nombre total de pieds de café',
        ];

        $classeur = new \PhpOffice\PhpSpreadsheet\Spreadsheet;
        $feuille = $classeur->getActiveSheet();
        $feuille->setTitle('Ménages');

        $feuille->fromArray($entetes, null, 'A1');

        $ligne = 2;
        foreach ($menages as $menage) {
            $feuille->fromArray([
                $menage->code_menage,
                $menage->nom_chef_menage,
                $menage->prenom_chef_menage,
                $menage->telephone,
                $menage->colline?->zone?->commune?->province?->nom,
                $menage->colline?->zone?->commune?->nom,
                $menage->colline?->zone?->nom,
                $menage->colline?->nom,
                $menage->statut,
                $menage->enqueteur?->name,
                $menage->parcelles->count(),
                $menage->parcelles->sum('nombre_pieds'),
            ], null, "A{$ligne}");
            $ligne++;
        }

        $derniereColonne = 'L';
        $derniereLigne = $ligne - 1;

        // En-tête stylé
        $feuille->getStyle("A1:{$derniereColonne}1")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => '16A34A'],
            ],
        ]);

        // Auto-filtre + première ligne figée, pour trier/filtrer directement dans Excel
        if ($derniereLigne >= 1) {
            $feuille->setAutoFilter("A1:{$derniereColonne}{$derniereLigne}");
        }
        $feuille->freezePane('A2');

        foreach (range('A', $derniereColonne) as $colonne) {
            $feuille->getColumnDimension($colonne)->setAutoSize(true);
        }

        $nomFichier = 'menages_' . now()->format('Y-m-d_His') . '.xlsx';

        return response()->streamDownload(function () use ($classeur) {
            (new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($classeur))->save('php://output');
        }, $nomFichier, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Export CSV (s'ouvre directement dans Excel) — pas de dépendance
     * supplémentaire nécessaire, contrairement à un vrai .xlsx.
     */
    public function csv(Request $request): StreamedResponse
    {
        $menages = $this->menagesFiltres($request)->get();

        $nomFichier = 'menages_' . now()->format('Y-m-d_His') . '.csv';

        $callback = function () use ($menages) {
            $sortie = fopen('php://output', 'w');

            // BOM UTF-8 pour qu'Excel affiche correctement les accents
            fwrite($sortie, "\xEF\xBB\xBF");

            fputcsv($sortie, [
                'Code ménage', 'Nom chef de ménage', 'Prénom chef de ménage', 'Téléphone',
                'Province', 'Commune', 'Zone', 'Colline', 'Statut', 'Enquêteur',
                'Nombre de parcelles', 'Nombre total de pieds de café',
            ]);

            foreach ($menages as $menage) {
                fputcsv($sortie, [
                    $menage->code_menage,
                    $menage->nom_chef_menage,
                    $menage->prenom_chef_menage,
                    $menage->telephone,
                    $menage->colline?->zone?->commune?->province?->nom,
                    $menage->colline?->zone?->commune?->nom,
                    $menage->colline?->zone?->nom,
                    $menage->colline?->nom,
                    $menage->statut,
                    $menage->enqueteur?->name,
                    $menage->parcelles->count(),
                    $menage->parcelles->sum('nombre_pieds'),
                ]);
            }

            fclose($sortie);
        };

        return response()->streamDownload($callback, $nomFichier, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Export GeoJSON des parcelles géolocalisées, utilisable directement
     * dans QGIS ou tout autre logiciel SIG.
     */
    public function geojson(Request $request): \Illuminate\Http\JsonResponse
    {
        $parcelles = Parcelle::query()
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->whereHas('menage', function ($q) use ($request) {
                $filtres = $request->only(['province_id', 'commune_id', 'zone_id', 'colline_id']);

                $q->when($filtres['colline_id'] ?? null, fn ($q, $v) => $q->where('colline_id', $v))
                    ->when($filtres['zone_id'] ?? null, fn ($q, $v) => $q->whereHas('colline', fn ($q) => $q->where('zone_id', $v)))
                    ->when($filtres['commune_id'] ?? null, fn ($q, $v) => $q->whereHas('colline.zone', fn ($q) => $q->where('commune_id', $v)))
                    ->when($filtres['province_id'] ?? null, fn ($q, $v) => $q->whereHas('colline.zone.commune', fn ($q) => $q->where('province_id', $v)));
            })
            ->with('menage:id,code_menage,nom_chef_menage,statut')
            ->get();

        $featureCollection = [
            'type' => 'FeatureCollection',
            'features' => $parcelles->map(fn (Parcelle $parcelle) => [
                'type' => 'Feature',
                'geometry' => [
                    'type' => 'Point',
                    'coordinates' => array_filter([
                        (float) $parcelle->longitude,
                        (float) $parcelle->latitude,
                        $parcelle->altitude !== null ? (float) $parcelle->altitude : null,
                    ], fn ($v) => $v !== null),
                ],
                'properties' => [
                    'code_menage' => $parcelle->menage->code_menage,
                    'nom_chef_menage' => $parcelle->menage->nom_chef_menage,
                    'statut_menage' => $parcelle->menage->statut,
                    'altitude' => $parcelle->altitude !== null ? (float) $parcelle->altitude : null,
                    'nombre_pieds' => $parcelle->nombre_pieds,
                    'etat_verger' => $parcelle->etat_verger,
                    'type' => $parcelle->type,
                    'annee_mise_en_place' => $parcelle->annee_mise_en_place,
                ],
            ])->values(),
        ];

        $nomFichier = 'parcelles_' . now()->format('Y-m-d_His') . '.geojson';

        return response()->json($featureCollection)
            ->header('Content-Disposition', "attachment; filename=\"{$nomFichier}\"");
    }

    /**
     * Export PDF — nécessite le paquet barryvdh/laravel-dompdf :
     *   composer require barryvdh/laravel-dompdf
     */
    public function pdf(Request $request)
    {
        $menages = $this->menagesFiltres($request)->get();

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('exports.menages-pdf', [
            'menages' => $menages,
            'genereLe' => now()->format('d/m/Y H:i'),
        ])->setPaper('a4', 'landscape');

        return $pdf->download('menages_' . now()->format('Y-m-d_His') . '.pdf');
    }
}
