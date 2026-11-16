<?php

namespace App\Http\Controllers;

use App\Models\Menage;
use App\Models\Parcelle;
use App\Models\Province;
use App\Models\Commune;
use App\Models\Zone;
use App\Models\Colline;
use App\Models\User;
use App\Models\SyncLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StatistiqueController extends Controller
{
    private const CLES_FILTRES = [
        'province_id',
        'commune_id',
        'zone_id',
        'colline_id',
        'enqueteur_id',
        'date_debut',
        'date_fin',
    ];

    /**
     * Accès national : super administrateur, administrateur,
     * superviseur national.
     */
    private function accesNational(User $user): bool
    {
        return $user->estSuperAdmin()
            || $user->estAdmin()
            || $user->role === 'superviseur_national';
    }

    /**
     * Applique le périmètre territorial autorisé sur les ménages.
     */
    private function appliquerPorteeTerritoriale(
        Builder $query,
        User $user
    ): Builder {
        if ($this->accesNational($user)) {
            return $query;
        }

        if ($user->role === 'superviseur_provincial') {
            if (!$user->province_id) {
                return $query->whereRaw('1 = 0');
            }

            return $query->whereHas(
                'colline.zone.commune',
                fn (Builder $q) => $q->where(
                    'province_id',
                    $user->province_id
                )
            );
        }

        if ($user->role === 'superviseur_communal') {
            $collineIds = $user->collinesIdsAutorisees();

            if (empty($collineIds)) {
                return $query->whereRaw('1 = 0');
            }

            return $query->where(function (Builder $q) use ($collineIds) {
                $q->whereIn('colline_id', $collineIds)
                    ->orWhereHas(
                        'collines',
                        fn (Builder $colline) => $colline->whereIn(
                            'collines.id',
                            $collineIds
                        )
                    );
            });
        }

        if ($user->role === 'enqueteur') {
            return $query->where('enqueteur_id', $user->id);
        }

        return $query->whereRaw('1 = 0');
    }

    /**
     * Applique les filtres territoriaux et les dates.
     */
    private function appliquerFiltresMenage(
        Builder $query,
        Request $request,
        User $user
    ): Builder {
        $this->appliquerPorteeTerritoriale($query, $user);

        $filtres = $request->only(self::CLES_FILTRES);

        if (!empty($filtres['province_id'])) {
            $query->whereHas(
                'colline.zone.commune',
                fn (Builder $q) => $q->where(
                    'province_id',
                    $filtres['province_id']
                )
            );
        }

        if (!empty($filtres['commune_id'])) {
            $query->whereHas(
                'colline.zone',
                fn (Builder $q) => $q->where(
                    'commune_id',
                    $filtres['commune_id']
                )
            );
        }

        if (!empty($filtres['zone_id'])) {
            $query->whereHas(
                'colline',
                fn (Builder $q) => $q->where(
                    'zone_id',
                    $filtres['zone_id']
                )
            );
        }

        if (!empty($filtres['colline_id'])) {
            $query->where('colline_id', $filtres['colline_id']);
        }

        if (!empty($filtres['enqueteur_id'])) {
            $query->where('enqueteur_id', $filtres['enqueteur_id']);
        }

        if (!empty($filtres['date_debut'])) {
            $query->whereDate('created_at', '>=', $filtres['date_debut']);
        }

        if (!empty($filtres['date_fin'])) {
            $query->whereDate('created_at', '<=', $filtres['date_fin']);
        }

        return $query;
    }

    /**
     * Requête des ménages autorisés.
     */
    private function menagesFiltres(
        Request $request,
        User $user
    ): Builder {
        return $this->appliquerFiltresMenage(
            Menage::query(),
            $request,
            $user
        );
    }

    /**
     * Requête des parcelles appartenant aux ménages autorisés.
     */
    private function parcellesFiltrees(
        Request $request,
        User $user
    ): Builder {
        $menages = $this->menagesFiltres($request, $user);

        return Parcelle::query()->whereIn(
            'menage_id',
            (clone $menages)->select('menages.id')
        );
    }

    /**
     * Liste les enquêteurs accessibles selon le rôle.
     */
    private function enqueteursFiltres(User $user): Builder
    {
        $query = User::query()->where('role', 'enqueteur');

        if ($this->accesNational($user)) {
            return $query;
        }

        if ($user->role === 'superviseur_provincial') {
            if (!$user->province_id) {
                return $query->whereRaw('1 = 0');
            }

            return $query->where(function (Builder $q) use ($user) {
                $q->where('province_id', $user->province_id)
                    ->orWhereHas(
                        'commune',
                        fn (Builder $commune) => $commune->where(
                            'province_id',
                            $user->province_id
                        )
                    )
                    ->orWhereHas(
                        'communes',
                        fn (Builder $commune) => $commune->where(
                            'province_id',
                            $user->province_id
                        )
                    )
                    ->orWhereHas(
                        'collines.zone.commune',
                        fn (Builder $commune) => $commune->where(
                            'province_id',
                            $user->province_id
                        )
                    );
            });
        }

        if ($user->role === 'superviseur_communal') {
            $collineIds = $user->collinesIdsAutorisees();

            if (empty($collineIds)) {
                return $query->whereRaw('1 = 0');
            }

            return $query->whereHas(
                'collines',
                fn (Builder $q) => $q->whereIn(
                    'collines.id',
                    $collineIds
                )
            );
        }

        if ($user->role === 'enqueteur') {
            return $query->whereKey($user->id);
        }

        return $query->whereRaw('1 = 0');
    }

    /**
     * Retourne les listes géographiques autorisées.
     */
    private function listesGeographiques(User $user): array
    {
        $provinces = Province::query();
        $communes = Commune::query();
        $zones = Zone::query();
        $collines = Colline::query();

        if ($this->accesNational($user)) {
            return [
                'provinces' => $provinces->orderBy('nom')->get(),
                'communes' => $communes->orderBy('nom')->get(),
                'zones' => $zones->orderBy('nom')->get(),
                'collines' => $collines->orderBy('nom')->get(),
            ];
        }

        if ($user->role === 'superviseur_provincial') {
            $provinceId = $user->province_id;

            if (!$provinceId) {
                return [
                    'provinces' => collect(),
                    'communes' => collect(),
                    'zones' => collect(),
                    'collines' => collect(),
                ];
            }

            $communes->where('province_id', $provinceId);

            $zones->whereHas(
                'commune',
                fn (Builder $q) => $q->where(
                    'province_id',
                    $provinceId
                )
            );

            $collines->whereHas(
                'zone.commune',
                fn (Builder $q) => $q->where(
                    'province_id',
                    $provinceId
                )
            );

            return [
                'provinces' => $provinces->whereKey($provinceId)->get(),
                'communes' => $communes->orderBy('nom')->get(),
                'zones' => $zones->orderBy('nom')->get(),
                'collines' => $collines->orderBy('nom')->get(),
            ];
        }

        if ($user->role === 'superviseur_communal') {
            $communeIds = $user->communesIds();
            $collineIds = $user->collinesIdsAutorisees();

            $communes->whereIn('id', $communeIds);
            $zones->whereIn('commune_id', $communeIds);
            $collines->whereIn('id', $collineIds);

            $provinces->whereHas(
                'communes',
                fn (Builder $q) => $q->whereIn(
                    'communes.id',
                    $communeIds
                )
            );

            return [
                'provinces' => $provinces->orderBy('nom')->get(),
                'communes' => $communes->orderBy('nom')->get(),
                'zones' => $zones->orderBy('nom')->get(),
                'collines' => $collines->orderBy('nom')->get(),
            ];
        }

        return [
            'provinces' => collect(),
            'communes' => collect(),
            'zones' => collect(),
            'collines' => collect(),
        ];
    }

    /**
     * Page principale des statistiques.
     */
    public function index(Request $request): Response
    {
        $user = auth()->user();

        $menages = $this->menagesFiltres($request, $user);
        $parcelles = $this->parcellesFiltrees($request, $user);

        // ----------------------------------------------------
        // INDICATEURS PRINCIPAUX
        // ----------------------------------------------------

        $totalMenages = (clone $menages)->count();

        $totalParcelles = (clone $parcelles)->count();

        $parcellesGeolocalisees = (clone $parcelles)
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->count();

        $totalPieds = (clone $parcelles)->sum('nombre_pieds');

        // ----------------------------------------------------
        // MENAGES PAR STATUT
        // ----------------------------------------------------

        $menagesParStatut = (clone $menages)
            ->select('statut', DB::raw('COUNT(*) as total'))
            ->groupBy('statut')
            ->orderBy('statut')
            ->get();

        // ----------------------------------------------------
        // STATISTIQUES PAR PROVINCE
        // ----------------------------------------------------

        $statistiquesProvinces = (clone $menages)
            ->join('collines', 'menages.colline_id', '=', 'collines.id')
            ->join('zones', 'collines.zone_id', '=', 'zones.id')
            ->join('communes', 'zones.commune_id', '=', 'communes.id')
            ->join('provinces', 'communes.province_id', '=', 'provinces.id')
            ->select(
                'provinces.id',
                'provinces.nom',
                DB::raw('COUNT(DISTINCT menages.id) as total_menages')
            )
            ->groupBy('provinces.id', 'provinces.nom')
            ->orderBy('provinces.nom')
            ->get();

        // ----------------------------------------------------
        // STATISTIQUES PAR ENQUETEUR
        // ----------------------------------------------------

        $listeEnqueteurs = $this->enqueteursFiltres($user)
            ->select('users.id', 'users.name', 'users.actif')
            ->orderBy('users.name')
            ->get();

        $statistiquesEnqueteurs = $listeEnqueteurs->map(
            function (User $enqueteur) use ($request, $user) {
                $menagesEnqueteur = $this->menagesFiltres(
                    $request,
                    $user
                )->where('enqueteur_id', $enqueteur->id);

                $parcellesEnqueteur = Parcelle::query()->whereIn(
                    'menage_id',
                    (clone $menagesEnqueteur)->select('menages.id')
                );

                return [
                    'id' => $enqueteur->id,
                    'nom' => $enqueteur->name,
                    'actif' => (bool) $enqueteur->actif,
                    'total_menages' => (clone $menagesEnqueteur)->count(),
                    'total_parcelles' => (clone $parcellesEnqueteur)->count(),
                    'total_pieds' => (clone $parcellesEnqueteur)
                        ->sum('nombre_pieds'),
                ];
            }
        )->values();

        // ----------------------------------------------------
        // ENQUETEURS ACTIFS ET INACTIFS
        // ----------------------------------------------------

        $enqueteursActifs = $listeEnqueteurs
            ->filter(fn (User $u) => (bool) $u->actif)
            ->values()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
            ]);

        $enqueteursInactifs = $listeEnqueteurs
            ->filter(fn (User $u) => !(bool) $u->actif)
            ->values()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
            ]);

        // ----------------------------------------------------
        // REPARTITIONS DES PARCELLES
        // ----------------------------------------------------

        $repartitionEtatVerger = (clone $parcelles)
            ->select('etat_verger', DB::raw('COUNT(*) as total'))
            ->groupBy('etat_verger')
            ->orderBy('etat_verger')
            ->get();

        $repartitionPositionnement = (clone $parcelles)
            ->select('mode_positionnement', DB::raw('COUNT(*) as total'))
            ->groupBy('mode_positionnement')
            ->orderBy('mode_positionnement')
            ->get();

        $repartitionAcquisition = (clone $parcelles)
            ->select('mode_acquisition', DB::raw('COUNT(*) as total'))
            ->groupBy('mode_acquisition')
            ->orderBy('mode_acquisition')
            ->get();

        $repartitionTypeParcelle = (clone $parcelles)
            ->select('type_parcelle', DB::raw('COUNT(*) as total'))
            ->groupBy('type_parcelle')
            ->orderBy('type_parcelle')
            ->get();

        // ----------------------------------------------------
        // EVOLUTION HEBDOMADAIRE DES MENAGES
        // PostgreSQL
        // ----------------------------------------------------

        $evolutionHebdomadaire = (clone $menages)
            ->selectRaw(
                "DATE_TRUNC('week', menages.created_at) as semaine,
                 COUNT(*) as total"
            )
            ->whereNotNull('menages.created_at')
            ->groupByRaw("DATE_TRUNC('week', menages.created_at)")
            ->orderBy('semaine')
            ->get();

        // ----------------------------------------------------
        // SYNCHRONISATIONS
        // ----------------------------------------------------

        $syncLogs = SyncLog::query();

        if (!$this->accesNational($user)) {
            if ($user->role === 'enqueteur') {
                $syncLogs->where('enqueteur_id', $user->id);
            } else {
                $idsEnqueteurs = (clone $this->enqueteursFiltres($user))
                    ->select('users.id');

                $syncLogs->whereIn('enqueteur_id', $idsEnqueteurs);
            }
        }

        $statistiquesSynchronisation = $syncLogs
            ->select('statut', DB::raw('COUNT(*) as total'))
            ->groupBy('statut')
            ->orderBy('statut')
            ->get();

        // ----------------------------------------------------
        // ENQUETEURS AFFECTES A LA COLLINE SELECTIONNEE
        // ----------------------------------------------------

        $enqueteursColline = collect();

        if ($request->filled('colline_id')) {
            $collineId = $request->input('colline_id');

            $enqueteursColline = $listeEnqueteurs
                ->filter(
                    fn (User $enqueteur) => $enqueteur->collines()
                        ->where('collines.id', $collineId)
                        ->exists()
                )
                ->values()
                ->map(fn (User $u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'actif' => (bool) $u->actif,
                ]);
        }

        // ----------------------------------------------------
        // LISTES GEOGRAPHIQUES
        // ----------------------------------------------------

        $geographie = $this->listesGeographiques($user);

        // ----------------------------------------------------
        // REPONSE INERTIA
        // ----------------------------------------------------

        return Inertia::render('Statistiques/Index', [
            'filtres' => $request->only(self::CLES_FILTRES),

            'indicateurs' => [
                'total_menages' => $totalMenages,
                'total_parcelles' => $totalParcelles,
                'parcelles_geolocalisees' => $parcellesGeolocalisees,
                'total_pieds' => (int) $totalPieds,
            ],

            'menagesParStatut' => $menagesParStatut,
            'statistiquesProvinces' => $statistiquesProvinces,
            'statistiquesEnqueteurs' => $statistiquesEnqueteurs,

            'enqueteursActifs' => $enqueteursActifs,
            'enqueteursInactifs' => $enqueteursInactifs,

            'totalEnqueteurs' => $listeEnqueteurs->count(),
            'totalEnqueteursActifs' => $enqueteursActifs->count(),
            'totalEnqueteursInactifs' => $enqueteursInactifs->count(),

            'repartitionEtatVerger' => $repartitionEtatVerger,
            'repartitionPositionnement' => $repartitionPositionnement,
            'repartitionAcquisition' => $repartitionAcquisition,
            'repartitionTypeParcelle' => $repartitionTypeParcelle,

            'evolutionHebdomadaire' => $evolutionHebdomadaire,
            'statistiquesSynchronisation' => $statistiquesSynchronisation,
            'enqueteursColline' => $enqueteursColline,

            'provinces' => $geographie['provinces'],
            'communes' => $geographie['communes'],
            'zones' => $geographie['zones'],
            'collines' => $geographie['collines'],
        ]);
    }
}
