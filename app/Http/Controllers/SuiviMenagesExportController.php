<?php

namespace App\Http\Controllers;

use App\Models\Menage;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SuiviMenagesExportController extends Controller
{
    /** Même logique de filtrage que SuiviMenagesController::menagesFiltres(). */
    private function menagesFiltres(Request $request)
    {
        $filtres = $request->only([
            'source', 'a_repondu', 'statut',
            'province_id', 'commune_id', 'zone_id', 'colline_id',
        ]);

        return Menage::query()
            ->with(['colline.zone.commune.province', 'enqueteur:id,name', 'parcelles'])
            ->when($filtres['source'] ?? null, fn ($q, $v) => $q->where('source', $v))
            ->when(($filtres['a_repondu'] ?? null) === 'oui', fn ($q) => $q->whereHas('reponses'))
            ->when(($filtres['a_repondu'] ?? null) === 'non', fn ($q) => $q->whereDoesntHave('reponses'))
            ->when($filtres['statut'] ?? null, fn ($q, $v) => $q->where('statut', $v))
            ->when($filtres['colline_id'] ?? null, fn ($q, $v) => $q->where('colline_id', $v))
            ->when($filtres['zone_id'] ?? null, fn ($q, $v) => $q->whereHas('colline', fn ($q) => $q->where('zone_id', $v)))
            ->when($filtres['commune_id'] ?? null, fn ($q, $v) => $q->whereHas('colline.zone', fn ($q) => $q->where('commune_id', $v)))
            ->when($filtres['province_id'] ?? null, fn ($q, $v) => $q->whereHas('colline.zone.commune', fn ($q) => $q->where('province_id', $v)))
            ->orderBy('code_menage');
    }

    private function libelleSource(string $source): string
    {
        return $source === 'terrain' ? 'Nouveau (terrain)' : 'Pré-enregistré';
    }

    public function csv(Request $request): StreamedResponse
    {
        $menages = $this->menagesFiltres($request)->get();
        $nomFichier = 'suivi_menages_' . now()->format('Y-m-d_His') . '.csv';

        return response()->streamDownload(function () use ($menages) {
            $sortie = fopen('php://output', 'w');
            fwrite($sortie, "\xEF\xBB\xBF");

            fputcsv($sortie, [
                'Code ménage', 'Origine', 'A répondu au questionnaire', 'Statut',
                'Chef de ménage', 'Province', 'Commune', 'Zone', 'Colline', 'Enquêteur',
            ]);

            foreach ($menages as $menage) {
                fputcsv($sortie, [
                    $menage->code_menage,
                    $this->libelleSource($menage->source),
                    $menage->reponses->count() > 0 ? 'Oui' : 'Non',
                    $menage->statut,
                    trim($menage->prenom_chef_menage . ' ' . $menage->nom_chef_menage),
                    $menage->colline?->zone?->commune?->province?->nom,
                    $menage->colline?->zone?->commune?->nom,
                    $menage->colline?->zone?->nom,
                    $menage->colline?->nom,
                    $menage->enqueteur?->name,
                ]);
            }

            fclose($sortie);
        }, $nomFichier, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function xlsx(Request $request): StreamedResponse
    {
        $menages = $this->menagesFiltres($request)->get();

        $entetes = [
            'Code ménage', 'Origine', 'A répondu au questionnaire', 'Statut',
            'Chef de ménage', 'Province', 'Commune', 'Zone', 'Colline', 'Enquêteur',
        ];

        $classeur = new \PhpOffice\PhpSpreadsheet\Spreadsheet;
        $feuille = $classeur->getActiveSheet();
        $feuille->setTitle('Suivi ménages');
        $feuille->fromArray($entetes, null, 'A1');

        $ligne = 2;
        foreach ($menages as $menage) {
            $feuille->fromArray([
                $menage->code_menage,
                $this->libelleSource($menage->source),
                $menage->reponses->count() > 0 ? 'Oui' : 'Non',
                $menage->statut,
                trim($menage->prenom_chef_menage . ' ' . $menage->nom_chef_menage),
                $menage->colline?->zone?->commune?->province?->nom,
                $menage->colline?->zone?->commune?->nom,
                $menage->colline?->zone?->nom,
                $menage->colline?->nom,
                $menage->enqueteur?->name,
            ], null, "A{$ligne}");
            $ligne++;
        }

        $derniereLigne = $ligne - 1;
        $feuille->getStyle('A1:J1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => '1EB53A']],
        ]);
        if ($derniereLigne >= 1) {
            $feuille->setAutoFilter("A1:J{$derniereLigne}");
        }
        $feuille->freezePane('A2');
        foreach (range('A', 'J') as $colonne) {
            $feuille->getColumnDimension($colonne)->setAutoSize(true);
        }

        $nomFichier = 'suivi_menages_' . now()->format('Y-m-d_His') . '.xlsx';

        return response()->streamDownload(function () use ($classeur) {
            (new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($classeur))->save('php://output');
        }, $nomFichier, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function pdf(Request $request)
    {
        $menages = $this->menagesFiltres($request)->get();

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('suivi-menages.pdf', [
            'menages' => $menages,
            'genereLe' => now()->format('d/m/Y H:i'),
            'libelleSource' => fn ($source) => $this->libelleSource($source),
        ])->setPaper('a4', 'landscape');

        return $pdf->download('suivi_menages_' . now()->format('Y-m-d_His') . '.pdf');
    }

    /** GeoJSON des parcelles des ménages correspondant aux filtres (mêmes propriétés + origine/réponse en plus). */
    public function geojson(Request $request)
    {
        $menages = $this->menagesFiltres($request)->get();

        $features = [];
        foreach ($menages as $menage) {
            foreach ($menage->parcelles as $parcelle) {
                if ($parcelle->latitude === null || $parcelle->longitude === null) {
                    continue;
                }

                $features[] = [
                    'type' => 'Feature',
                    'geometry' => [
                        'type' => 'Point',
                        'coordinates' => [(float) $parcelle->longitude, (float) $parcelle->latitude],
                    ],
                    'properties' => [
                        'code_menage' => $menage->code_menage,
                        'origine' => $this->libelleSource($menage->source),
                        'a_repondu' => $menage->reponses->count() > 0 ? 'oui' : 'non',
                        'statut' => $menage->statut,
                        'chef_menage' => trim($menage->prenom_chef_menage . ' ' . $menage->nom_chef_menage),
                        'nombre_pieds' => $parcelle->nombre_pieds,
                    ],
                ];
            }
        }

        $nomFichier = 'suivi_menages_' . now()->format('Y-m-d_His') . '.geojson';

        return response()->json(['type' => 'FeatureCollection', 'features' => $features])
            ->header('Content-Disposition', "attachment; filename=\"{$nomFichier}\"");
    }
}
