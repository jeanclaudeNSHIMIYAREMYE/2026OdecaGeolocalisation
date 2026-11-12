<?php
namespace App\Http\Controllers;
use App\Models\Colline;
use App\Models\Commune;
use App\Models\Menage;
use App\Models\Province;
use App\Models\Zone;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SuiviMenagesController extends Controller
{
    /**
     * Recherche et filtres combinés.
     * Recherche insensible aux majuscules et minuscules.
     */
    private function menagesFiltres(Request $request)
    {
        $filtres = $request->only([
            'recherche',
            'source',
            'a_repondu',
            'statut',
            'province_id',
            'commune_id',
            'zone_id',
            'colline_id',
        ]);

        // Normalisation de la recherche
        $recherche = mb_strtolower(
            trim((string) ($filtres['recherche'] ?? '')),
            'UTF-8'
        );

        // Découpage en plusieurs mots
        $termesRecherche = preg_split(
            '/\s+/u',
            $recherche,
            -1,
            PREG_SPLIT_NO_EMPTY
        );

        return Menage::query()
            ->with([
                'colline.zone.commune.province',
                'enqueteur:id,name',
            ])

            // ==========================================
            // RECHERCHE MULTICRITÈRE INSENSIBLE À LA CASSE
            // ==========================================
            ->when(!empty($termesRecherche), function ($query) use ($termesRecherche) {

                // Chaque mot doit correspondre à au moins un champ.
                $query->where(function ($q) use ($termesRecherche) {

                    foreach ($termesRecherche as $mot) {

                        $terme = '%' . $mot . '%';

                        $q->where(function ($s) use ($terme) {

                            // Code du ménage
                            $s->whereRaw(
                                'LOWER(code_menage) LIKE ?',
                                [$terme]
                            )

                            // Prénom du chef du ménage
                            ->orWhereRaw(
                                'LOWER(prenom_chef_menage) LIKE ?',
                                [$terme]
                            )

                            // Nom du chef du ménage
                            ->orWhereRaw(
                                'LOWER(nom_chef_menage) LIKE ?',
                                [$terme]
                            )

                            // Colline
                            ->orWhereHas('colline', function ($colline) use ($terme) {
                                $colline->whereRaw(
                                    'LOWER(nom) LIKE ?',
                                    [$terme]
                                );
                            })

                            // Zone
                            ->orWhereHas('colline.zone', function ($zone) use ($terme) {
                                $zone->whereRaw(
                                    'LOWER(nom) LIKE ?',
                                    [$terme]
                                );
                            })

                            // Commune
                            ->orWhereHas('colline.zone.commune', function ($commune) use ($terme) {
                                $commune->whereRaw(
                                    'LOWER(nom) LIKE ?',
                                    [$terme]
                                );
                            })

                            // Province
                            ->orWhereHas('colline.zone.commune.province', function ($province) use ($terme) {
                                $province->whereRaw(
                                    'LOWER(nom) LIKE ?',
                                    [$terme]
                                );
                            })

                            // Enquêteur
                            ->orWhereHas('enqueteur', function ($enqueteur) use ($terme) {
                                $enqueteur->whereRaw(
                                    'LOWER(name) LIKE ?',
                                    [$terme]
                                );
                            });
                        });
                    }
                });
            })

            // ==========================================
            // FILTRE : ORIGINE
            // ==========================================
            ->when(
                $filtres['source'] ?? null,
                fn ($q, $v) => $q->where('source', $v)
            )

            // ==========================================
            // FILTRE : QUESTIONNAIRE
            // ==========================================
            ->when(
                ($filtres['a_repondu'] ?? null) === 'oui',
                fn ($q) => $q->whereHas('reponses')
            )

            ->when(
                ($filtres['a_repondu'] ?? null) === 'non',
                fn ($q) => $q->whereDoesntHave('reponses')
            )

            // ==========================================
            // FILTRE : STATUT
            // ==========================================
            ->when(
                $filtres['statut'] ?? null,
                fn ($q, $v) => $q->where('statut', $v)
            )

            // ==========================================
            // FILTRE : COLLINE
            // ==========================================
            ->when(
                $filtres['colline_id'] ?? null,
                fn ($q, $v) => $q->where('colline_id', $v)
            )

            // ==========================================
            // FILTRE : ZONE
            // ==========================================
            ->when(
                $filtres['zone_id'] ?? null,
                fn ($q, $v) => $q->whereHas(
                    'colline',
                    fn ($q) => $q->where('zone_id', $v)
                )
            )

            // ==========================================
            // FILTRE : COMMUNE
            // ==========================================
            ->when(
                $filtres['commune_id'] ?? null,
                fn ($q, $v) => $q->whereHas(
                    'colline.zone',
                    fn ($q) => $q->where('commune_id', $v)
                )
            )

            // ==========================================
            // FILTRE : PROVINCE
            // ==========================================
            ->when(
                $filtres['province_id'] ?? null,
                fn ($q, $v) => $q->whereHas(
                    'colline.zone.commune',
                    fn ($q) => $q->where('province_id', $v)
                )
            );
    }

    /**
     * Affichage de la page de suivi.
     */
    public function index(Request $request): Response
    {
        $filtres = $request->only([
            'recherche',
            'source',
            'a_repondu',
            'statut',
            'province_id',
            'commune_id',
            'zone_id',
            'colline_id',
        ]);

        // Liste des ménages avec pagination
        $menages = $this->menagesFiltres($request)
            ->withCount('reponses')
            ->orderByDesc('updated_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('SuiviMenages/Index', [
            'menages' => $menages,
            'filtres' => $filtres,

            // Compteurs
            'compteurs' => [

                'pre_enregistres' => $this->menagesFiltres($request)
                    ->where('source', 'pre_enregistre')
                    ->count(),

                'nouveaux_terrain' => $this->menagesFiltres($request)
                    ->where('source', 'terrain')
                    ->count(),

                'sans_reponse' => $this->menagesFiltres($request)
                    ->whereDoesntHave('reponses')
                    ->count(),

                'avec_reponse' => $this->menagesFiltres($request)
                    ->whereHas('reponses')
                    ->count(),
            ],

            // Données territoriales
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
}
