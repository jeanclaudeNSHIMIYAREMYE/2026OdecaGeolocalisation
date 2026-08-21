<?php

namespace App\Http\Controllers;

use App\Models\Menage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use OpenSpout\Reader\XLSX\Reader;

class MenageImportController extends Controller
{
    /**
     * Import du fichier "caféiculteurs" (mêmes en-têtes que l'export) vers
     * la table menages.
     *
     * Règles strictes demandées :
     *  - un ménage déjà présent (même code_menage) N'EST JAMAIS modifié ni
     *    recréé — la ligne est simplement comptée dans "ignorés" ;
     *  - les deux champs facultatifs du schéma (telephone, cni) sont
     *    complétés automatiquement quand la cellule est vide : "0" pour le
     *    téléphone, "-" pour le CNI, exactement comme pour l'export ;
     *  - une ligne dont la colline (Province/Commune/Zone/Colline) ne
     *    correspond à rien en base est ignorée et reportée dans le rapport
     *    d'erreurs plutôt que de faire échouer tout l'import.
     *
     * Lecture en streaming (OpenSpout) plutôt qu'avec PhpSpreadsheet : le
     * fichier de référence contient ~196 000 lignes, et PhpSpreadsheet
     * charge tout le classeur en mémoire, ce qui n'est pas adapté à ce
     * volume. Nécessite `composer require openspout/openspout` (voir
     * README-import-export-menages.md).
     */
    public function importer(Request $request): RedirectResponse
    {
        $this->authorize('create', Menage::class);

        $request->validate([
            'fichier' => ['required', 'file', 'mimes:xlsx,xls'],
        ]);

        set_time_limit(600);
        ini_set('memory_limit', '512M');

        $chemin = $request->file('fichier')->getRealPath();

        $arbreGeo = $this->arbreGeographique();
        $codesExistants = $this->codesExistants();

        $importes = 0;
        $ignoresExistants = 0;
        $erreurs = [];
        $lot = [];
        $numeroLigne = 0;

        $lecteur = new Reader();
        $lecteur->open($chemin);

        foreach ($lecteur->getSheetIterator() as $feuille) {
            foreach ($feuille->getRowIterator() as $ligne) {
                $numeroLigne++;

                if ($numeroLigne === 1) {
                    continue; // ligne d'en-tête
                }

                $valeurs = $ligne->toArray();
                [$code, $typeExcel, $nom, $cni, $telephone, $province, $commune, $zone, $colline] =
                    array_pad(array_slice($valeurs, 0, 9), 9, null);

                $code = trim((string) $code);

                if ($code === '') {
                    $erreurs[] = "Ligne {$numeroLigne} : code cafeiculteur manquant, ligne ignorée.";
                    continue;
                }

                if (isset($codesExistants[$code])) {
                    $ignoresExistants++;
                    continue;
                }

                $collineId = $arbreGeo[$this->cle($province)][$this->cle($commune)][$this->cle($zone)][$this->cle($colline)] ?? null;

                if ($collineId === null) {
                    if (count($erreurs) < 200) {
                        $erreurs[] = "Ligne {$numeroLigne} ({$code}) : colline introuvable pour {$province} / {$commune} / {$zone} / {$colline}.";
                    }
                    continue;
                }

                $nom = trim((string) $nom);
                $cni = trim((string) $cni);
                $telephone = trim((string) $telephone);

                $lot[] = [
                    'code_menage' => $code,
                    'type_menage' => mb_strtolower(trim((string) $typeExcel)) === 'association' ? 'association' : 'personel',
                    'nom_chef_menage' => $nom !== '' ? $nom : '-',
                    'prenom_chef_menage' => null,
                    'telephone' => $telephone !== '' ? $telephone : '0',
                    'cni' => $cni !== '' ? $cni : '-',
                    'photo_proprietaire' => null,
                    'photo_piece_identification' => null,
                    'colline_id' => $collineId,
                    'statut' => 'a_faire',
                    'source' => 'pre_enregistre',
                    'enqueteur_id' => null,
                    'cree_par_id' => $request->user()->id,
                    'date_derniere_activite' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                // Empêche aussi les doublons internes au fichier importé.
                $codesExistants[$code] = true;
                $importes++;

                if (count($lot) >= 1000) {
                    DB::table('menages')->insertOrIgnore($lot);
                    $lot = [];
                }
            }

            break; // une seule feuille traitée
        }

        $lecteur->close();

        if (! empty($lot)) {
            DB::table('menages')->insertOrIgnore($lot);
        }

        return back()->with([
            'succes' => "{$importes} ménage(s) importé(s), {$ignoresExistants} déjà existant(s) ignoré(s).",
            'importResume' => [
                'importes' => $importes,
                'ignores_existants' => $ignoresExistants,
                'total_erreurs' => count($erreurs),
                'erreurs' => array_slice($erreurs, 0, 50),
            ],
        ]);
    }

    private function cle(?string $valeur): string
    {
        return mb_strtoupper(trim((string) $valeur));
    }

    /**
     * Arbre province -> commune -> zone -> colline => colline_id, construit
     * en une seule requête pour éviter une jointure par ligne du fichier
     * (potentiellement ~196 000 lignes).
     */
    private function arbreGeographique(): array
    {
        $lignes = DB::table('collines')
            ->join('zones', 'zones.id', '=', 'collines.zone_id')
            ->join('communes', 'communes.id', '=', 'zones.commune_id')
            ->join('provinces', 'provinces.id', '=', 'communes.province_id')
            ->select(
                'provinces.nom as province',
                'communes.nom as commune',
                'zones.nom as zone',
                'collines.nom as colline',
                'collines.id as colline_id'
            )
            ->get();

        $arbre = [];

        foreach ($lignes as $ligne) {
            $arbre[$this->cle($ligne->province)][$this->cle($ligne->commune)][$this->cle($ligne->zone)][$this->cle($ligne->colline)] = $ligne->colline_id;
        }

        return $arbre;
    }

    /**
     * Codes déjà présents en base, chargés une fois pour permettre un test
     * d'existence en mémoire (O(1)) plutôt qu'une requête par ligne.
     */
    private function codesExistants(): array
    {
        return DB::table('menages')
            ->pluck('code_menage')
            ->flip()
            ->map(fn () => true)
            ->all();
    }
}
