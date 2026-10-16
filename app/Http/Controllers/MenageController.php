<?php

namespace App\Http\Controllers;

use App\Models\Colline;
use App\Models\Commune;
use App\Models\Menage;
use App\Models\Province;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\Parcelle;
use App\Models\ReponseQuestionnaire;

class MenageController extends Controller
{

private function altitudeParcelle(Parcelle $parcelle): ?float
    {
        $polygone = $parcelle->polygone;

        if (is_array($polygone) && count($polygone) >= 3) {
            $altitudes = array_values(array_filter(
                array_map(
                    fn($s) => isset($s['altitude']) && $s['altitude'] !== null ? (float) $s['altitude'] : null,
                    $polygone
                ),
                fn($v) => $v !== null
            ));

            if (count($altitudes) > 0) {
                return array_sum($altitudes) / count($altitudes);
            }

            return $parcelle->altitude !== null ? (float) $parcelle->altitude : null;
        }

        return $parcelle->altitude !== null ? (float) $parcelle->altitude : null;
    }


    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Menage::class);

        $filtres = $request->only(['recherche', 'statut', 'province_id', 'commune_id', 'zone_id', 'colline_id', 'enqueteur_id', 'possede_vergers_cafe']);

        $menages = Menage::query()
            ->with(['colline.zone.commune.province', 'enqueteur:id,name'])
            ->when($filtres['recherche'] ?? null, fn ($q, $v) => $q->where(
                fn ($q) => $q->where('code_menage', 'like', "%{$v}%")
                    ->orWhere('nom_chef_menage', 'like', "%{$v}%")
                    ->orWhere('prenom_chef_menage', 'like', "%{$v}%")
            ))
            ->when($filtres['statut'] ?? null, fn ($q, $v) => $q->where('statut', $v))
            ->when($filtres['enqueteur_id'] ?? null, fn ($q, $v) => $q->where('enqueteur_id', $v))
            ->when($filtres['colline_id'] ?? null, fn ($q, $v) => $q->where('colline_id', $v))
            ->when($filtres['zone_id'] ?? null, fn ($q, $v) => $q->whereHas('colline', fn ($q) => $q->where('zone_id', $v)))
            ->when($filtres['commune_id'] ?? null, fn ($q, $v) => $q->whereHas('colline.zone', fn ($q) => $q->where('commune_id', $v)))
            ->when($filtres['province_id'] ?? null, fn ($q, $v) => $q->whereHas('colline.zone.commune', fn ($q) => $q->where('province_id', $v)))
            ->when(
                $filtres['possede_vergers_cafe'] ?? null,
                function ($q, $v) {
                    $q->whereHas('reponses', function ($q) use ($v) {
                        $q->whereHas('question', function ($q) {
                            $q->where('code', 'possede_vergers_cafe');
                        })
                        ->where('valeur->valeur', $v);
                    });
                }
            )
            ->orderByDesc('updated_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Menages/Index', [
            'menages' => $menages,
            'filtres' => $filtres,
            'provinces' => Province::orderBy('nom')->get(['id', 'nom']),
            'communes' => Commune::orderBy('nom')->get(['id', 'nom', 'province_id']),
            'zones' => Zone::orderBy('nom')->get(['id', 'nom', 'commune_id']),
            'collines' => Colline::orderBy('nom')->get(['id', 'nom', 'zone_id']),
            'peutCreer' => $request->user()->can('create', Menage::class),
            'enqueteurs' => User::where('actif', true)->where('role', 'enqueteur')->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Menage::class);

        return Inertia::render('Menages/Creer', $this->donneesFormulaire());
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Menage::class);

        $donnees = $this->valider($request);

        $menage = Menage::create([
            ...$donnees,
            'source' => 'pre_enregistre',
            'cree_par_id' => $request->user()->id,
        ]);

        return redirect()->route('menages.show', $menage)->with('succes', 'Ménage créé.');
    }

    public function show(Menage $menage): Response
    {
        $this->authorize('view', $menage);

        $menage->load(['colline.zone.commune.province', 'enqueteur:id,name', 'parcelles', 'reponses.question']);

        $menage->parcelles->each(function (Parcelle $parcelle) {
            $parcelle->superficie_ha = $this->superficieHectares($parcelle->polygone);
            $parcelle->altitude = $this->altitudeParcelle($parcelle);
        });

        return Inertia::render('Menages/Afficher', [
            'menage' => $menage,
            'peutModifier' => request()->user()->can('update', $menage),
            'peutDupliquer' => request()->user()->can('create', Menage::class),
        ]);
    }

    public function edit(Menage $menage): Response
    {
        $this->authorize('update', $menage);

        return Inertia::render('Menages/Modifier', [
            'menage' => $menage->only([
                'id', 'code_menage', 'nom_chef_menage', 'prenom_chef_menage',
                'telephone', 'colline_id', 'statut', 'enqueteur_id',
            ]),
            ...$this->donneesFormulaire(),
        ]);
    }

    public function update(Request $request, Menage $menage): RedirectResponse
    {
        $this->authorize('update', $menage);

        $donnees = $this->valider($request, $menage->id);

        $menage->update($donnees);

        return redirect()->route('menages.show', $menage)->with('succes', 'Ménage mis à jour.');
    }

    public function destroy(Menage $menage): RedirectResponse
    {
        $this->authorize('delete', $menage);

        $menage->delete();

        return redirect()->route('menages.index')->with('succes', 'Ménage supprimé.');
    }

    public function detruireParcelle(Menage $menage, Parcelle $parcelle): RedirectResponse
    {
        $this->authorize('update', $menage);

        abort_if($parcelle->menage_id !== $menage->id, 404);

        $parcelle->delete();

        $menage->synchroniserStatut();

        return redirect()->route('menages.show', $menage)->with('succes', 'Parcelle supprimée.');
    }

    public function detruireReponse(Menage $menage, ReponseQuestionnaire $reponse): RedirectResponse
    {
        $this->authorize('update', $menage);

        abort_if($reponse->menage_id !== $menage->id, 404);

        $reponse->delete();

        $menage->synchroniserStatut();

        return redirect()->route('menages.show', $menage)->with('succes', 'Réponse supprimée.');
    }

    private function donneesFormulaire(): array
    {
        return [
            'provinces' => Province::orderBy('nom')->get(['id', 'nom']),
            'communes' => Commune::orderBy('nom')->get(['id', 'nom', 'province_id']),
            'zones' => Zone::orderBy('nom')->get(['id', 'nom', 'commune_id']),
            'collines' => Colline::orderBy('nom')->get(['id', 'nom', 'zone_id']),
            'enqueteurs' => User::where('role', 'enqueteur')->where('actif', true)->orderBy('name')->get(['id', 'name']),
        ];
    }

    private function valider(Request $request, ?int $idIgnore = null): array
    {
        return $request->validate([
            'code_menage' => ['required', 'string', 'max:50', Rule::unique('menages', 'code_menage')->ignore($idIgnore)],
            'nom_chef_menage' => ['nullable', 'string', 'max:255'],
            'prenom_chef_menage' => ['nullable', 'string', 'max:255'],
            'telephone' => ['nullable', 'string', 'max:30'],
            'colline_id' => ['required', 'exists:collines,id'],
            'statut' => ['required', Rule::in(['a_faire', 'en_attente', 'termine'])],
            'enqueteur_id' => ['nullable', 'exists:users,id'],
        ]);
    }


    private function superficieHectares(mixed $polygone): ?float
    {
        if (! is_array($polygone) || count($polygone) < 3) {
            return null;
        }

        $coords = collect($polygone)
            ->map(function ($point) {
                if (is_array($point) && array_key_exists(0, $point) && array_key_exists(1, $point)) {
                    return [(float) $point[0], (float) $point[1]];
                }

                if (is_array($point) && isset($point['latitude'], $point['longitude'])) {
                    return [(float) $point['latitude'], (float) $point['longitude']];
                }

                return null;
            })
            ->filter()
            ->values();

        if ($coords->count() < 3) {
            return null;
        }

        // Rayon équatorial WGS84 (mètres)
        $rayonTerre = 6378137;
        $aire = 0.0;
        $n = $coords->count();

        for ($i = 0; $i < $n; $i++) {
            [$lat1, $lng1] = $coords[$i];
            [$lat2, $lng2] = $coords[($i + 1) % $n];

            $aire += deg2rad($lng2 - $lng1) * (2 + sin(deg2rad($lat1)) + sin(deg2rad($lat2)));
        }

        $aire = abs($aire * $rayonTerre * $rayonTerre / 2);

        return round($aire / 10000, 2); // m² → hectares
    }


    public function dupliquer(Menage $menage): Response
{
    $this->authorize('view', $menage);
    $this->authorize('create', Menage::class);

    $menage->load('colline.zone.commune');

    return Inertia::render('Menages/Dupliquer', [
        'menage' => [
            'id' => $menage->id,
            'code_menage' => $menage->code_menage,
            'nom_chef_menage' => $menage->nom_chef_menage,
            'prenom_chef_menage' => $menage->prenom_chef_menage,
            'telephone' => $menage->telephone,
            'cni' => $menage->cni,
            'enqueteur_id' => $menage->enqueteur_id,
            'colline_id' => $menage->colline_id,
            'zone_id' => $menage->colline?->zone_id,
            'commune_id' => $menage->colline?->zone?->commune_id,
            'province_id' => $menage->colline?->zone?->commune?->province_id,
        ],
        ...$this->donneesFormulaire(),
    ]);
}

public function enregistrerCopie(Request $request, Menage $menage): RedirectResponse
{
    $this->authorize('view', $menage);
    $this->authorize('create', Menage::class);

    $donnees = $request->validate([
        'code_menage' => ['required', 'string', 'max:50', Rule::unique('menages', 'code_menage')],
        'nom_chef_menage' => ['nullable', 'string', 'max:255'],
        'prenom_chef_menage' => ['nullable', 'string', 'max:255'],
        'telephone' => ['nullable', 'string', 'max:30'],
        'cni' => ['nullable', 'string', 'max:50'],
        'colline_id' => ['required', 'exists:collines,id'],
        'enqueteur_id' => ['nullable', 'exists:users,id'],
    ]);

    $copie = Menage::create([
        ...$donnees,
        'type_menage' => $menage->type_menage,
        'photo_proprietaire' => $menage->photo_proprietaire,
        'photo_piece_identification' => $menage->photo_piece_identification,
        'statut' => 'a_faire',
        'source' => 'pre_enregistre',
        'cree_par_id' => $request->user()->id,
    ]);

    return redirect()
        ->route('menages.show', $copie)
        ->with('succes', "Ménage copié depuis {$menage->code_menage}.");
}
}
