<?php

namespace App\Http\Controllers;

use App\Models\Menage;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MenageExportController extends Controller
{
    /**
     * En-têtes identiques au fichier de référence
     * "CAFEICULTEURS_..._.xlsx" fourni par l'utilisateur, pour que l'export
     * puisse être directement rapproché/fusionné avec la liste nationale.
     */
    private const ENTETES = [
        'Code cafeiculteur',
        'Entite Type',
        'Nom et Prénom / Association',
        'CNI',
        'Téléphone',
        'Province',
        'Commune',
        'Zone',
        'Colline',
    ];

    public function exporter(Request $request): StreamedResponse
    {
        $this->authorize('viewAny', Menage::class);

        $request->validate([
            'date_debut' => ['nullable', 'date'],
            'date_fin' => ['nullable', 'date', 'after_or_equal:date_debut'],
        ]);

        // Reprend les mêmes filtres que la page Ménages (si présents dans
        // l'URL au moment du clic sur le bouton), la portée territoriale de
        // l'utilisateur connecté étant de toute façon déjà appliquée par le
        // global scope du modèle Menage.
        $menages = Menage::query()
            ->with(['colline.zone.commune.province'])
            ->when($request->filled('statut'), fn ($q) => $q->where('statut', $request->string('statut')))
            ->when($request->filled('colline_id'), fn ($q) => $q->where('colline_id', $request->integer('colline_id')))
            ->when($request->filled('enqueteur_id'), fn ($q) => $q->where('enqueteur_id', $request->integer('enqueteur_id')))
            ->when($request->filled('q'), function ($q) use ($request) {
                $terme = '%'.$request->string('q').'%';
                $q->where(function ($q) use ($terme) {
                    $q->where('code_menage', 'like', $terme)
                        ->orWhere('nom_chef_menage', 'like', $terme)
                        ->orWhere('prenom_chef_menage', 'like', $terme);
                });
            })
            // Intervalle par date d'enregistrement du ménage (created_at).
            ->when($request->filled('date_debut'), fn ($q) => $q->whereDate('created_at', '>=', $request->string('date_debut')))
            ->when($request->filled('date_fin'), fn ($q) => $q->whereDate('created_at', '<=', $request->string('date_fin')))
            ->orderBy('code_menage')
            ->get();

        $spreadsheet = new Spreadsheet();
        $feuille = $spreadsheet->getActiveSheet();
        $feuille->setTitle('Sheet1');

        $feuille->fromArray(self::ENTETES, null, 'A1');
        $feuille->getStyle('A1:I1')->getFont()->setBold(true);
        $feuille->freezePane('A2');

        $ligne = 2;

        foreach ($menages as $menage) {
            $colline = $menage->colline;
            $zone = $colline?->zone;
            $commune = $zone?->commune;
            $province = $commune?->province;

            $feuille->fromArray($this->ligneMenage($menage, $province, $commune, $zone, $colline), null, "A{$ligne}");
            $ligne++;
        }

        foreach (range('A', 'I') as $colonne) {
            $feuille->getColumnDimension($colonne)->setAutoSize(true);
        }

        $nomFichier = $this->nomFichier($request);

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $nomFichier, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Construit une ligne du tableau. Les deux seuls champs facultatifs du
     * schéma (telephone, cni) sont complétés automatiquement quand ils sont
     * absents : 0 pour le téléphone (champ numérique), "-" pour le CNI et
     * le nom (champs texte). Tous les autres champs sont obligatoires en
     * base et donc toujours renseignés.
     */
    private function ligneMenage(Menage $menage, $province, $commune, $zone, $colline): array
    {
        $estAssociation = $menage->type_menage === 'association';

        $nom = trim(collect([$menage->nom_chef_menage, $menage->prenom_chef_menage])->filter()->implode(' '));

        return [
            filled($menage->code_menage) ? $menage->code_menage : '-',
            $estAssociation ? 'association' : 'personne',
            $nom !== '' ? $nom : '-',
            filled($menage->cni) ? $menage->cni : '-',
            filled($menage->telephone) ? $menage->telephone : 0,
            $province->nom ?? '-',
            $commune->nom ?? '-',
            $zone->nom ?? '-',
            $colline->nom ?? '-',
        ];
    }

    /**
     * Nom du fichier : indique l'intervalle de dates choisi quand il y en a
     * un, sinon un simple horodatage comme pour le fichier de référence.
     */
    private function nomFichier(Request $request): string
    {
        if ($request->filled('date_debut') || $request->filled('date_fin')) {
            $debut = $request->filled('date_debut') ? str_replace('-', '_', $request->string('date_debut')) : 'debut';
            $fin = $request->filled('date_fin') ? str_replace('-', '_', $request->string('date_fin')) : now()->format('Y_m_d');

            return "MENAGES_{$debut}_au_{$fin}.xlsx";
        }

        return 'MENAGES_'.now()->format('d_m_Y_H\Hi').'.xlsx';
    }
}
