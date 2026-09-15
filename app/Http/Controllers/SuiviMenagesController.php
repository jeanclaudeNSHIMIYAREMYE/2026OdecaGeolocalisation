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
     * Distingue deux populations de ménages, souvent confondues dans la
     * liste générale (MenageController) :
     *  - "pre_enregistre" : ménages déjà présents en base avant le
     *    déploiement de l'appli terrain (à faire répondre au questionnaire) ;
     *  - "terrain"         : ménages créés directement par un enquêteur
     *    sur le terrain (nouveaux, pas dans l'import initial).
     *
     * Combinable avec un filtre "a répondu au questionnaire" (au moins
     * une réponse enregistrée) pour cibler précisément le travail
     * restant. Menage::query() applique déjà automatiquement le scope
     * territorial de l'utilisateur connecté.
     */
    private function menagesFiltres(Request $request)
    {
        $filtres = $request->only([
            'source', 'a_repondu', 'statut',
            'province_id', 'commune_id', 'zone_id', 'colline_id',
        ]);

        return Menage::query()
            ->with(['colline.zone.commune.province', 'enqueteur:id,name'])
            ->when($filtres['source'] ?? null, fn ($q, $v) => $q->where('source', $v))
            ->when(($filtres['a_repondu'] ?? null) === 'oui', fn ($q) => $q->whereHas('reponses'))
            ->when(($filtres['a_repondu'] ?? null) === 'non', fn ($q) => $q->whereDoesntHave('reponses'))
            ->when($filtres['statut'] ?? null, fn ($q, $v) => $q->where('statut', $v))
            ->when($filtres['colline_id'] ?? null, fn ($q, $v) => $q->where('colline_id', $v))
            ->when($filtres['zone_id'] ?? null, fn ($q, $v) => $q->whereHas('colline', fn ($q) => $q->where('zone_id', $v)))
            ->when($filtres['commune_id'] ?? null, fn ($q, $v) => $q->whereHas('colline.zone', fn ($q) => $q->where('commune_id', $v)))
            ->when($filtres['province_id'] ?? null, fn ($q, $v) => $q->whereHas('colline.zone.commune', fn ($q) => $q->where('province_id', $v)));
    }

    public function index(Request $request): Response
    {
        $filtres = $request->only([
            'source', 'a_repondu', 'statut',
            'province_id', 'commune_id', 'zone_id', 'colline_id',
        ]);

        $menages = $this->menagesFiltres($request)
            ->withCount('reponses')
            ->orderByDesc('updated_at')
            ->paginate(20)
            ->withQueryString();

        // Compteurs globaux (non affectés par la pagination), pour donner
        // une vue d'ensemble immédiate en haut de la page. Chaque appel à
        // menagesFiltres() reconstruit une requête neuve à partir des
        // mêmes filtres, donc aucun risque d'interférence entre eux.
        return Inertia::render('SuiviMenages/Index', [
            'menages' => $menages,
            'filtres' => $filtres,
            'compteurs' => [
                'pre_enregistres' => $this->menagesFiltres($request)->where('source', 'pre_enregistre')->count(),
                'nouveaux_terrain' => $this->menagesFiltres($request)->where('source', 'terrain')->count(),
                'sans_reponse' => $this->menagesFiltres($request)->whereDoesntHave('reponses')->count(),
                'avec_reponse' => $this->menagesFiltres($request)->whereHas('reponses')->count(),
            ],
            'provinces' => Province::orderBy('nom')->get(['id', 'nom']),
            'communes' => Commune::orderBy('nom')->get(['id', 'nom', 'province_id']),
            'zones' => Zone::orderBy('nom')->get(['id', 'nom', 'commune_id']),
            'collines' => Colline::orderBy('nom')->get(['id', 'nom', 'zone_id']),
        ]);
    }
}
