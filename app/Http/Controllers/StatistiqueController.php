<?php

namespace App\Http\Controllers;

use App\Models\Colline;
use App\Models\Menage;
use App\Models\Parcelle;
use App\Models\Province;
use App\Models\SyncLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StatistiqueController extends Controller
{
    /**
     * Filtres territoriaux + période, communs à toutes les statistiques.
     *
     * Contrairement à RapportController::parcellesFiltrees (qui part des
     * parcelles déjà géolocalisées), on part ici de Menage : les
     * statistiques doivent refléter TOUT le projet, y compris les
     * ménages pas encore géolocalisés (statut "à faire" / "en attente"),
     * pour donner une vraie mesure de l'avancement national.
     *
     * Comme dans RapportController, ce module est réservé aux admins
     * (portée nationale) donc pas de scope territorial implicite ici.
     */
    private function menagesFiltres(Request $request)
    {
        $filtres = $request->only(['province_id', 'commune_id', 'zone_id', 'colline_id', 'enqueteur_id', 'date_debut', 'date_fin']);

        return Menage::query()
            ->with(['colline.zone.commune.province', 'enqueteur:id,name'])
            ->when($filtres['colline_id'] ?? null, fn ($q, $v) => $q->where('colline_id', $v))
            ->when($filtres['zone_id'] ?? null, fn ($q, $v) => $q->whereHas(
                'colline',
                fn ($q) => $q->where('zone_id', $v)
            ))
            ->when($filtres['commune_id'] ?? null, fn ($q, $v) => $q->whereHas(
                'colline.zone',
                fn ($q) => $q->where('commune_id', $v)
            ))
            ->when($filtres['province_id'] ?? null, fn ($q, $v) => $q->whereHas(
                'colline.zone.commune',
                fn ($q) => $q->where('province_id', $v)
            ))
            ->when($filtres['enqueteur_id'] ?? null, fn ($q, $v) => $q->where('enqueteur_id', $v))
            ->when($filtres['date_debut'] ?? null, fn ($q, $v) => $q->whereDate('menages.created_at', '>=', $v))
            ->when($filtres['date_fin'] ?? null, fn ($q, $v) => $q->whereDate('menages.created_at', '<=', $v));
    }

    /**
     * Parcelles correspondant aux MÊMES filtres que menagesFiltres(), mais
     * interrogées directement via une sous-requête corrélée (whereHas) au
     * lieu de collecter les IDs de ménages puis whereIn('menage_id', ...).
     *
     * CORRECTIF : à l'échelle nationale (dizaines de milliers de ménages),
     * un whereIn() avec la liste complète des IDs dépasse la limite
     * PostgreSQL de 65 535 paramètres liés par requête
     * (SQLSTATE[HY000]: number of parameters must be between 0 and 65535).
     * whereHas() génère un EXISTS corrélé dont le nombre de paramètres ne
     * dépend que du nombre de filtres actifs, jamais du nombre de lignes.
     */
    private function parcellesFiltrees(Request $request)
    {
        $filtres = $request->only(['province_id', 'commune_id', 'zone_id', 'colline_id', 'enqueteur_id', 'date_debut', 'date_fin']);

        return Parcelle::query()
            ->whereHas('menage', function ($q) use ($filtres) {
                $q->when($filtres['colline_id'] ?? null, fn ($q, $v) => $q->where('colline_id', $v))
                    ->when($filtres['zone_id'] ?? null, fn ($q, $v) => $q->whereHas(
                        'colline',
                        fn ($q) => $q->where('zone_id', $v)
                    ))
                    ->when($filtres['commune_id'] ?? null, fn ($q, $v) => $q->whereHas(
                        'colline.zone',
                        fn ($q) => $q->where('commune_id', $v)
                    ))
                    ->when($filtres['province_id'] ?? null, fn ($q, $v) => $q->whereHas(
                        'colline.zone.commune',
                        fn ($q) => $q->where('province_id', $v)
                    ))
                    ->when($filtres['enqueteur_id'] ?? null, fn ($q, $v) => $q->where('enqueteur_id', $v))
                    ->when($filtres['date_debut'] ?? null, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
                    ->when($filtres['date_fin'] ?? null, fn ($q, $v) => $q->whereDate('created_at', '<=', $v));
            })
            ->get();
    }

    /**
     * Enquêteurs à proposer dans le filtre "Enquêteur", restreints au
     * niveau territorial le plus précis déjà sélectionné (colline > zone
     * > commune > province). Sans cette restriction, le menu déroulant
     * affichait tous les enquêteurs du pays même après avoir choisi une
     * colline précise, ce qui n'a aucun sens : un enquêteur n'apparaît
     * dans ce filtre que s'il est affecté (colline_user) quelque part
     * dans le périmètre déjà sélectionné.
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
        $filtres = $request->only(['province_id', 'commune_id', 'zone_id', 'colline_id', 'enqueteur_id', 'date_debut', 'date_fin']);

        $menages = $this->menagesFiltres($request)->get();

        // CORRECTIF : remplace l'ancien
        //   $menageIds = $menages->pluck('id');
        //   $parcelles = Parcelle::query()->whereIn('menage_id', $menageIds)->get();
        // qui dépassait la limite de paramètres PostgreSQL à l'échelle nationale.
        $parcelles = $this->parcellesFiltrees($request);

        $totalMenages = $menages->count();
        $totalParcelles = $parcelles->count();
        $totalParcellesGeolocalisees = $parcelles->whereNotNull('latitude')->whereNotNull('longitude')->count();
        $totalPieds = (int) $parcelles->sum('nombre_pieds');

        // --- Avancement global (par statut de ménage) ---
        $parStatut = $menages->groupBy('statut')->map->count();
        $libellesStatuts = [
            'a_faire' => 'À faire',
            'en_attente' => 'En attente',
            'termine' => 'Terminé',
        ];
        $avancement = collect($libellesStatuts)->map(fn ($label, $statut) => [
            'statut' => $statut,
            'label' => $label,
            'total' => $parStatut[$statut] ?? 0,
            'pourcentage' => $totalMenages > 0 ? round((($parStatut[$statut] ?? 0) / $totalMenages) * 100, 1) : 0,
        ])->values();

        // --- Répartition territoriale, par province ---
        $parProvince = $menages
            ->groupBy(fn ($m) => $m->colline?->zone?->commune?->province?->nom ?? 'Non renseigné')
            ->map(function ($groupe, $province) use ($parcelles) {
                $idsGroupe = $groupe->pluck('id');
                $parcellesGroupe = $parcelles->whereIn('menage_id', $idsGroupe);

                return [
                    'province' => $province,
                    'menages' => $groupe->count(),
                    'menages_termines' => $groupe->where('statut', 'termine')->count(),
                    'parcelles' => $parcellesGroupe->count(),
                    'pieds' => (int) $parcellesGroupe->sum('nombre_pieds'),
                ];
            })
            ->sortByDesc('menages')
            ->values();

        // --- Classement par enquêteur ---
        $parEnqueteur = $menages
            ->whereNotNull('enqueteur_id')
            ->groupBy(fn ($m) => $m->enqueteur?->name ?? 'Non assigné')
            ->map(function ($groupe, $nom) use ($parcelles) {
                $idsGroupe = $groupe->pluck('id');
                $parcellesGroupe = $parcelles->whereIn('menage_id', $idsGroupe);

                return [
                    'enqueteur' => $nom,
                    'menages' => $groupe->count(),
                    'menages_termines' => $groupe->where('statut', 'termine')->count(),
                    'parcelles' => $parcellesGroupe->count(),
                    'pieds' => (int) $parcellesGroupe->sum('nombre_pieds'),
                ];
            })
            ->sortByDesc('parcelles')
            ->values();

        // --- État des vergers, mode de positionnement/acquisition, type de ménage ---
        $parEtatVerger = $parcelles->whereNotNull('etat_verger')->groupBy('etat_verger')->map->count()->sortDesc();
        $parModePositionnement = $parcelles->whereNotNull('mode_positionnement')->groupBy('mode_positionnement')->map->count();
        $parModeAcquisition = $parcelles->whereNotNull('mode_acquisition')->groupBy('mode_acquisition')->map->count();
        $parTypeMenage = $menages->groupBy('type_menage')->map->count();

        // --- Évolution dans le temps (parcelles géolocalisées, par semaine) ---
        $evolution = $parcelles
            ->whereNotNull('latitude')
            ->groupBy(fn ($p) => $p->created_at->startOfWeek()->format('d/m/Y'))
            ->map->count()
            ->sortKeys();

        // --- Enquêteurs affectés à la colline sélectionnée ---
        //
        // Différent du "Classement par enquêteur" ci-dessus : celui-ci ne
        // liste que les enquêteurs ayant déjà saisi au moins un ménage.
        // Ici, dès qu'une colline est sélectionnée dans les filtres, on
        // affiche TOUS les enquêteurs qui y sont affectés (table pivot
        // colline_user, cf. User::collines()), y compris ceux qui n'ont
        // encore rien saisi — utile pour repérer un enquêteur affecté mais
        // inactif sur le terrain, ou une colline sans personne affectée.
        $collineSelectionnee = null;
        $enqueteursColline = collect();

        if ($collineId = $filtres['colline_id'] ?? null) {
            $collineSelectionnee = Colline::find($collineId, ['id', 'nom']);

            // Stats déjà calculées sur le périmètre filtré (donc déjà
            // restreint à cette colline), indexées par id d'enquêteur.
            $statsParEnqueteurId = $menages
                ->whereNotNull('enqueteur_id')
                ->groupBy('enqueteur_id')
                ->map(function ($groupe) use ($parcelles) {
                    $idsGroupe = $groupe->pluck('id');
                    $parcellesGroupe = $parcelles->whereIn('menage_id', $idsGroupe);

                    return [
                        'menages' => $groupe->count(),
                        'menages_termines' => $groupe->where('statut', 'termine')->count(),
                        'parcelles' => $parcellesGroupe->count(),
                        'pieds' => (int) $parcellesGroupe->sum('nombre_pieds'),
                    ];
                });

            $enqueteursColline = User::where('role', 'enqueteur')
                ->whereHas('collines', fn ($q) => $q->where('collines.id', $collineId))
                ->orderBy('name')
                ->get(['id', 'name', 'actif'])
                ->map(function ($u) use ($statsParEnqueteurId) {
                    $stats = $statsParEnqueteurId->get($u->id, [
                        'menages' => 0,
                        'menages_termines' => 0,
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

        // --- Synchronisation terrain (mêmes filtres enquêteur/période) ---
        $parStatutSync = SyncLog::query()
            ->when($filtres['enqueteur_id'] ?? null, fn ($q, $v) => $q->where('enqueteur_id', $v))
            ->when($filtres['date_debut'] ?? null, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($filtres['date_fin'] ?? null, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->get()
            ->groupBy('statut')
            ->map->count();

        return Inertia::render('Statistiques/Index', [
            'filtres' => $filtres,
            'provinces' => Province::orderBy('nom')->get(['id', 'nom']),
            'communes' => \App\Models\Commune::orderBy('nom')->get(['id', 'nom', 'province_id']),
            'zones' => \App\Models\Zone::orderBy('nom')->get(['id', 'nom', 'commune_id']),
            'collines' => \App\Models\Colline::orderBy('nom')->get(['id', 'nom', 'zone_id']),
            'enqueteurs' => $this->enqueteursFiltres($filtres),

            'kpis' => [
                'total_menages' => $totalMenages,
                'total_parcelles' => $totalParcelles,
                'total_parcelles_geolocalisees' => $totalParcellesGeolocalisees,
                'taux_geolocalisation' => $totalParcelles > 0
                    ? round(($totalParcellesGeolocalisees / $totalParcelles) * 100, 1)
                    : 0,
                'total_pieds' => $totalPieds,
                'moyenne_pieds_par_parcelle' => $totalParcellesGeolocalisees > 0
                    ? (int) round($totalPieds / $totalParcellesGeolocalisees)
                    : 0,
            ],

            'avancement' => $avancement,
            'parProvince' => $parProvince,
            'parEnqueteur' => $parEnqueteur,
            'collineSelectionnee' => $collineSelectionnee,
            'enqueteursColline' => $enqueteursColline,
            'parEtatVerger' => $parEtatVerger,
            'parModePositionnement' => $parModePositionnement,
            'parModeAcquisition' => $parModeAcquisition,
            'parTypeMenage' => $parTypeMenage,
            'evolution' => $evolution,
            'parStatutSync' => $parStatutSync,
        ]);
    }
}





