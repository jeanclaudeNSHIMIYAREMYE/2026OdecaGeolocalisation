<?php

namespace App\Http\Controllers;

use App\Models\Colline;
use App\Models\Commune;
use App\Models\Menage;
use App\Models\Parcelle;
use App\Models\Province;
use App\Models\SyncLog;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StatistiqueController extends Controller
{
    private const CLES_FILTRES = ['province_id', 'commune_id', 'zone_id', 'colline_id', 'enqueteur_id', 'date_debut', 'date_fin'];

    /** Applique les filtres sur une requête portant sur la table menages. */
    private function appliquerFiltresMenage($q, array $f)
    {
        return $q
            ->when($f['colline_id'] ?? null, fn ($q, $v) => $q->where('menages.colline_id', $v))
            ->when($f['zone_id'] ?? null, fn ($q, $v) => $q->whereHas('colline', fn ($q) => $q->where('zone_id', $v)))
            ->when($f['commune_id'] ?? null, fn ($q, $v) => $q->whereHas('colline.zone', fn ($q) => $q->where('commune_id', $v)))
            ->when($f['province_id'] ?? null, fn ($q, $v) => $q->whereHas('colline.zone.commune', fn ($q) => $q->where('province_id', $v)))
            ->when($f['enqueteur_id'] ?? null, fn ($q, $v) => $q->where('menages.enqueteur_id', $v))
            ->when($f['date_debut'] ?? null, fn ($q, $v) => $q->whereDate('menages.created_at', '>=', $v))
            ->when($f['date_fin'] ?? null, fn ($q, $v) => $q->whereDate('menages.created_at', '<=', $v));
    }

    /** Requête (non exécutée) sur les ménages filtrés : SANS with() ni get(). */
    private function menagesFiltres(array $f)
    {
        return $this->appliquerFiltresMenage(Menage::query(), $f);
    }

    /** Requête (non exécutée) sur les parcelles des ménages filtrés. */
    private function parcellesFiltrees(array $f)
    {
        return Parcelle::query()->whereHas('menage', fn ($q) => $this->appliquerFiltresMenage($q, $f));
    }

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
        $filtres = $request->only(self::CLES_FILTRES);

        // ---------- KPI ----------
        $totalMenages = (clone $this->menagesFiltres($filtres))->count();

        $statsParcelles = $this->parcellesFiltrees($filtres)
            ->selectRaw('COUNT(*) AS total')
            ->selectRaw('COUNT(*) FILTER (WHERE parcelles.latitude IS NOT NULL AND parcelles.longitude IS NOT NULL) AS geo')
            ->selectRaw('COALESCE(SUM(parcelles.nombre_pieds), 0) AS pieds')
            ->first();

        $totalParcelles = (int) $statsParcelles->total;
        $totalParcellesGeolocalisees = (int) $statsParcelles->geo;
        $totalPieds = (int) $statsParcelles->pieds;

        // ---------- Avancement ----------
        $parStatut = $this->menagesFiltres($filtres)
            ->select('menages.statut', DB::raw('COUNT(*) AS total'))
            ->groupBy('menages.statut')
            ->pluck('total', 'statut');

        $libellesStatuts = ['a_faire' => 'À faire', 'en_attente' => 'En attente', 'termine' => 'Terminé'];
        $avancement = collect($libellesStatuts)->map(fn ($label, $statut) => [
            'statut' => $statut,
            'label' => $label,
            'total' => (int) ($parStatut[$statut] ?? 0),
            'pourcentage' => $totalMenages > 0 ? round((($parStatut[$statut] ?? 0) / $totalMenages) * 100, 1) : 0,
        ])->values();

        // ---------- Par province ----------
        $exprProvince = "COALESCE(provinces.nom, 'Non renseigné')";

        $menagesProvince = $this->menagesFiltres($filtres)
            ->leftJoin('collines', 'collines.id', '=', 'menages.colline_id')
            ->leftJoin('zones', 'zones.id', '=', 'collines.zone_id')
            ->leftJoin('communes', 'communes.id', '=', 'zones.commune_id')
            ->leftJoin('provinces', 'provinces.id', '=', 'communes.province_id')
            ->selectRaw("$exprProvince AS province, COUNT(*) AS menages, COUNT(*) FILTER (WHERE menages.statut = 'termine') AS menages_termines")
            ->groupBy(DB::raw($exprProvince))
            ->get()->keyBy('province');

        $parcellesProvince = $this->parcellesFiltrees($filtres)
            ->join('menages', 'menages.id', '=', 'parcelles.menage_id')
            ->leftJoin('collines', 'collines.id', '=', 'menages.colline_id')
            ->leftJoin('zones', 'zones.id', '=', 'collines.zone_id')
            ->leftJoin('communes', 'communes.id', '=', 'zones.commune_id')
            ->leftJoin('provinces', 'provinces.id', '=', 'communes.province_id')
            ->selectRaw("$exprProvince AS province, COUNT(*) AS parcelles, COALESCE(SUM(parcelles.nombre_pieds),0) AS pieds")
            ->groupBy(DB::raw($exprProvince))
            ->get()->keyBy('province');

        $parProvince = $menagesProvince->map(fn ($m, $nom) => [
            'province' => $nom,
            'menages' => (int) $m->menages,
            'menages_termines' => (int) $m->menages_termines,
            'parcelles' => (int) ($parcellesProvince[$nom]->parcelles ?? 0),
            'pieds' => (int) ($parcellesProvince[$nom]->pieds ?? 0),
        ])->sortByDesc('menages')->values();

        // ---------- Par enquêteur (clé = id) ----------
        $menagesEnq = $this->menagesFiltres($filtres)
            ->whereNotNull('menages.enqueteur_id')
            ->selectRaw("menages.enqueteur_id, COUNT(*) AS menages, COUNT(*) FILTER (WHERE menages.statut = 'termine') AS menages_termines")
            ->groupBy('menages.enqueteur_id')
            ->get()->keyBy('enqueteur_id');

        $parcellesEnq = $this->parcellesFiltrees($filtres)
            ->join('menages', 'menages.id', '=', 'parcelles.menage_id')
            ->whereNotNull('menages.enqueteur_id')
            ->selectRaw('menages.enqueteur_id, COUNT(*) AS parcelles, COALESCE(SUM(parcelles.nombre_pieds),0) AS pieds')
            ->groupBy('menages.enqueteur_id')
            ->get()->keyBy('enqueteur_id');

        $noms = User::whereIn('id', $menagesEnq->keys())->pluck('name', 'id');

        $statsParEnqueteurId = $menagesEnq->map(fn ($m, $id) => [
            'menages' => (int) $m->menages,
            'menages_termines' => (int) $m->menages_termines,
            'parcelles' => (int) ($parcellesEnq[$id]->parcelles ?? 0),
            'pieds' => (int) ($parcellesEnq[$id]->pieds ?? 0),
        ]);

        $parEnqueteur = $statsParEnqueteurId
            ->map(fn ($s, $id) => ['enqueteur' => $noms[$id] ?? 'Non assigné'] + $s)
            ->sortByDesc('parcelles')->values();

        // ---------- Répartitions qualitatives ----------
        $repartition = fn (string $colonne) => $this->parcellesFiltrees($filtres)
            ->whereNotNull("parcelles.$colonne")
            ->select("parcelles.$colonne", DB::raw('COUNT(*) AS total'))
            ->groupBy("parcelles.$colonne")
            ->pluck('total', $colonne);

        $parEtatVerger = $repartition('etat_verger')->sortDesc();
        $parModePositionnement = $repartition('mode_positionnement');
        $parModeAcquisition = $repartition('mode_acquisition');

        $parTypeMenage = $this->menagesFiltres($filtres)
            ->select('menages.type_menage', DB::raw('COUNT(*) AS total'))
            ->groupBy('menages.type_menage')
            ->pluck('total', 'type_menage');

        // ---------- Évolution par semaine (PostgreSQL) ----------
        $evolution = $this->parcellesFiltrees($filtres)
            ->whereNotNull('parcelles.latitude')
            ->selectRaw("date_trunc('week', parcelles.created_at)::date AS semaine, COUNT(*) AS total")
            ->groupBy('semaine')
            ->orderBy('semaine')
            ->get()
            ->mapWithKeys(fn ($r) => [\Carbon\Carbon::parse($r->semaine)->format('d/m/Y') => (int) $r->total]);

        // ---------- Enquêteurs de la colline sélectionnée ----------
        $collineSelectionnee = null;
        $enqueteursColline = collect();

        if ($collineId = $filtres['colline_id'] ?? null) {
            $collineSelectionnee = Colline::find($collineId, ['id', 'nom']);

            $vide = ['menages' => 0, 'menages_termines' => 0, 'parcelles' => 0, 'pieds' => 0];

            $enqueteursColline = User::where('role', 'enqueteur')
                ->whereHas('collines', fn ($q) => $q->where('collines.id', $collineId))
                ->orderBy('name')
                ->get(['id', 'name', 'actif'])
                ->map(fn ($u) => array_merge([
                    'id' => $u->id,
                    'enqueteur' => $u->name,
                    'actif' => (bool) $u->actif,
                ], $statsParEnqueteurId->get($u->id, $vide)))
                ->values();
        }

        // ---------- Synchronisation ----------
        $parStatutSync = SyncLog::query()
            ->when($filtres['enqueteur_id'] ?? null, fn ($q, $v) => $q->where('enqueteur_id', $v))
            ->when($filtres['date_debut'] ?? null, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($filtres['date_fin'] ?? null, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->select('statut', DB::raw('COUNT(*) AS total'))
            ->groupBy('statut')
            ->pluck('total', 'statut');

        return Inertia::render('Statistiques/Index', [
            'filtres' => $filtres,
            'provinces' => Province::orderBy('nom')->get(['id', 'nom']),
            'communes' => Commune::orderBy('nom')->get(['id', 'nom', 'province_id']),
            'zones' => Zone::orderBy('nom')->get(['id', 'nom', 'commune_id']),
            'collines' => Colline::orderBy('nom')->get(['id', 'nom', 'zone_id']),
            'enqueteurs' => $this->enqueteursFiltres($filtres),

            'kpis' => [
                'total_menages' => $totalMenages,
                'total_parcelles' => $totalParcelles,
                'total_parcelles_geolocalisees' => $totalParcellesGeolocalisees,
                'taux_geolocalisation' => $totalParcelles > 0
                    ? round(($totalParcellesGeolocalisees / $totalParcelles) * 100, 1) : 0,
                'total_pieds' => $totalPieds,
                'moyenne_pieds_par_parcelle' => $totalParcellesGeolocalisees > 0
                    ? (int) round($totalPieds / $totalParcellesGeolocalisees) : 0,
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