<?php

namespace App\Http\Controllers;

use App\Models\Colline;
use App\Models\Commune;
use App\Models\Menage;
use App\Models\Parcelle;
use App\Models\Province;
use App\Models\Zone;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $utilisateur = $request->user();

        $filtres = $request->only(['province_id', 'commune_id', 'zone_id', 'colline_id']);

        // Les modèles Menage/Parcelle appliquent déjà automatiquement le
        // scope territorial de l'utilisateur connecté (PorteeTerritorialeScope) ;
        // on ajoute ici uniquement les filtres explicites choisis dans l'UI.
        $menages = Menage::query()
            ->when($filtres['colline_id'] ?? null, fn ($q, $v) => $q->where('colline_id', $v))
            ->when($filtres['zone_id'] ?? null, fn ($q, $v) => $q->whereHas('colline', fn ($q) => $q->where('zone_id', $v)))
            ->when($filtres['commune_id'] ?? null, fn ($q, $v) => $q->whereHas('colline.zone', fn ($q) => $q->where('commune_id', $v)))
            ->when($filtres['province_id'] ?? null, fn ($q, $v) => $q->whereHas('colline.zone.commune', fn ($q) => $q->where('province_id', $v)));

        $totalMenages = (clone $menages)->count();
        $menagesTermines = (clone $menages)->where('statut', 'termine')->count();
        $menagesEnAttente = (clone $menages)->where('statut', 'en_attente')->count();
        $menagesAFaire = (clone $menages)->where('statut', 'a_faire')->count();

        $parcelles = Parcelle::query()->whereHas('menage', function ($q) use ($filtres) {
            $q->when($filtres['colline_id'] ?? null, fn ($q, $v) => $q->where('colline_id', $v))
                ->when($filtres['zone_id'] ?? null, fn ($q, $v) => $q->whereHas('colline', fn ($q) => $q->where('zone_id', $v)))
                ->when($filtres['commune_id'] ?? null, fn ($q, $v) => $q->whereHas('colline.zone', fn ($q) => $q->where('commune_id', $v)))
                ->when($filtres['province_id'] ?? null, fn ($q, $v) => $q->whereHas('colline.zone.commune', fn ($q) => $q->where('province_id', $v)));
        });

        $kpi = [
            'menages_total' => $totalMenages,
            'menages_termines' => $menagesTermines,
            'menages_en_attente' => $menagesEnAttente,
            'menages_a_faire' => $menagesAFaire,
            'taux_avancement' => $totalMenages > 0 ? round(($menagesTermines / $totalMenages) * 100, 1) : 0,
            'nombre_parcelles' => (clone $parcelles)->count(),
            'nombre_pieds_cafe' => (int) (clone $parcelles)->sum('nombre_pieds'),
        ];

        $pointsCarte = (clone $parcelles)
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->with('menage:id,code_menage,nom_chef_menage,statut')
            ->get(['id', 'menage_id', 'latitude', 'longitude', 'nombre_pieds', 'etat_verger'])
            ->map(fn (Parcelle $parcelle) => [
                'id' => $parcelle->id,
                'latitude' => (float) $parcelle->latitude,
                'longitude' => (float) $parcelle->longitude,
                'nombre_pieds' => $parcelle->nombre_pieds,
                'etat_verger' => $parcelle->etat_verger,
                'code_menage' => $parcelle->menage->code_menage,
                'nom_chef_menage' => $parcelle->menage->nom_chef_menage,
                'statut_menage' => $parcelle->menage->statut,
            ]);

        return Inertia::render('Dashboard', [
            'kpi' => $kpi,
            'pointsCarte' => $pointsCarte,
            'filtres' => $filtres,
            'provinces' => Province::orderBy('nom')->get(['id', 'nom']),
            'communes' => Commune::orderBy('nom')->get(['id', 'nom', 'province_id']),
            'zones' => Zone::orderBy('nom')->get(['id', 'nom', 'commune_id']),
            'collines' => Colline::orderBy('nom')->get(['id', 'nom', 'zone_id']),
        ]);
    }
}
