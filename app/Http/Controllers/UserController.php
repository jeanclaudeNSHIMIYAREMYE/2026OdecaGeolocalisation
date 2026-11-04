<?php

namespace App\Http\Controllers;

use App\Models\Colline;
use App\Models\Commune;
use App\Models\Province;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UserController extends Controller
{
   
public function index(Request $request): Response
{
    $this->authorize('viewAny', User::class);

    // Paramètres autorisés pour le tri et la pagination
    $perPage = (int) $request->query('per_page', 10);
    $perPage = in_array($perPage, [10, 25, 50, 100], true)
        ? $perPage
        : 10;

    $sortBy = $request->query('sort_by', 'name');
    $sortBy = in_array(
        $sortBy,
        ['name', 'email', 'role', 'created_at'],
        true
    ) ? $sortBy : 'name';

    $sortDir = $request->query('sort_dir', 'asc');
    $sortDir = in_array($sortDir, ['asc', 'desc'], true)
        ? $sortDir
        : 'asc';

    $roles = [
        'admin',
        'superviseur_national',
        'superviseur_provincial',
        'superviseur_communal',
        'enqueteur',
    ];

    $query = User::visiblePour($request->user())
        ->select([
            'id',
            'name',
            'email',
            'role',
            'province_id',
            'commune_id',
            'actif',
            'is_super_admin',
            'created_at',
        ])
        ->with(['province:id,nom', 'commune:id,nom'])
        ->withCount('collines');

    // Recherche par nom, e-mail ou identifiant
    $recherche = trim((string) $request->query('q', ''));

    if ($recherche !== '') {
        $query->where(function ($q) use ($recherche) {
            $q->where('name', 'like', "%{$recherche}%")
                ->orWhere('email', 'like', "%{$recherche}%");

            if (ctype_digit($recherche)) {
                $q->orWhere('id', (int) $recherche);
            }
        });
    }

    // Filtre par rôle
    $role = $request->query('role');

    if (in_array($role, $roles, true)) {
        $query->where('role', $role);
    } else {
        $role = '';
    }

    // Filtre par statut : actif ou désactivé
    $actif = $request->query('actif');

    if (in_array($actif, ['0', '1'], true)) {
        $query->where('actif', (int) $actif);
    } else {
        $actif = '';
    }

    // Filtre géographique
    $provinceId = $request->query('province_id');
    $communeId = $request->query('commune_id');

    if (ctype_digit((string) $provinceId) && (int) $provinceId > 0) {
        $query->where('province_id', (int) $provinceId);
    } else {
        $provinceId = '';
    }

    if (ctype_digit((string) $communeId) && (int) $communeId > 0) {
        $query->where('commune_id', (int) $communeId);
    } else {
        $communeId = '';
    }

    $utilisateurs = $query
        ->orderBy($sortBy, $sortDir)
        ->orderBy('id')
        ->paginate($perPage)
        ->withQueryString();

    return Inertia::render('Utilisateurs/Index', [
        'utilisateurs' => $utilisateurs,
        'peutGerer' => $request->user()->estAdmin(),
        'peutModifier' => $request->user()->estAdmin() || $request->user()->estSuperviseur(),
        'peutDesactiver' => $request->user()->estAdmin() || $request->user()->estSuperviseur(),
        'peutAjouter' => $request->user()->estAdmin() || $request->user()->estSuperviseur(),
        'roles' => $this->roles(),
        'provinces' => Province::orderBy('nom')->get(['id', 'nom']),
        'communes' => Commune::orderBy('nom')->get([
            'id',
            'nom',
            'province_id',
        ]),
        'filters' => [
            'q' => $recherche,
            'role' => $role,
            'actif' => $actif,
            'province_id' => (string) $provinceId,
            'commune_id' => (string) $communeId,
            'per_page' => $perPage,
            'sort_by' => $sortBy,
            'sort_dir' => $sortDir,
        ],
    ]);
}


    public function create(): Response
    {
        $this->authorize('create', User::class);

        return Inertia::render('Utilisateurs/Creer', $this->donneesFormulaire(request()->user()));
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', User::class);

        $donnees = $this->valider($request);
        $donnees = $this->normaliserPorteeTerritoriale($request->user(), $donnees);

        $utilisateur = User::create([
            ...$donnees,
            'password' => bcrypt($donnees['password']),
        ]);

        if ($donnees['role'] === 'enqueteur') {
            $utilisateur->collines()->sync($donnees['collines_ids'] ?? []);
        }

        return redirect()->route('utilisateurs.index')->with('succes', 'Compte créé.');
    }

    public function edit(User $utilisateur): Response
    {
        $this->authorize('update', $utilisateur);

        return Inertia::render('Utilisateurs/Modifier', [
            'utilisateur' => [
                ...$utilisateur->only(['id', 'name', 'email', 'role', 'province_id', 'commune_id']),
                'collines_ids' => $utilisateur->collines()->pluck('collines.id'),
            ],
            ...$this->donneesFormulaire(request()->user()),
        ]);
    }

    public function update(Request $request, User $utilisateur): RedirectResponse
    {
        $this->authorize('update', $utilisateur);

        $donnees = $this->valider($request, $utilisateur->id);
        $donnees = $this->normaliserPorteeTerritoriale($request->user(), $donnees);

        $utilisateur->update([
            'name' => $donnees['name'],
            'email' => $donnees['email'],
            'role' => $donnees['role'],
            'province_id' => $donnees['province_id'] ?? null,
            'commune_id' => $donnees['commune_id'] ?? null,
            ...(filled($donnees['password'] ?? null) ? ['password' => bcrypt($donnees['password'])] : []),
        ]);

        // Un utilisateur qui change de rôle et n'est plus enquêteur perd
        // ses affectations de collines ; sync([]) les retire proprement.
        $utilisateur->collines()->sync(
            $donnees['role'] === 'enqueteur' ? ($donnees['collines_ids'] ?? []) : []
        );

        return redirect()->route('utilisateurs.index')->with('succes', 'Compte mis à jour.');
    }

    public function basculerStatut(User $utilisateur): RedirectResponse
    {
        $this->authorize('delete', $utilisateur);

        $utilisateur->update(['actif' => ! $utilisateur->actif]);

        return back()->with('succes', $utilisateur->actif ? 'Compte réactivé.' : 'Compte désactivé.');
    }

    public function destroy(User $utilisateur): RedirectResponse
    {
        $this->authorize('destroy', $utilisateur);

        $utilisateur->delete();

        return back()->with('succes', 'Utilisateur supprimé définitivement.');
    }

    public function exporter(Request $request): StreamedResponse
    {
        $this->authorize('viewAny', User::class);

        $utilisateurs = User::visiblePour($request->user())
            ->whereIn('role', ['superviseur_national', 'superviseur_provincial', 'superviseur_communal', 'enqueteur'])
            ->with([
                'province:id,nom',
                'commune:id,nom,province_id',
                'commune.province:id,nom',
                'collines.zone.commune.province',
            ])
            ->orderBy('role')
            ->orderBy('name')
            ->get();

        $classeur = new Spreadsheet();
        $classeur->removeSheetByIndex(0);

        $superviseurs = $classeur->createSheet();
        $superviseurs->setTitle('Superviseurs');
        $superviseurs->fromArray([
            ['Nom', 'E-mail', 'Fonction', 'Province', 'Commune', 'Statut'],
        ], null, 'A1');
        $ligne = 2;

        foreach ($utilisateurs->where('role', '!=', 'enqueteur') as $utilisateur) {
            $superviseurs->fromArray([
                $utilisateur->name,
                $utilisateur->email,
                $this->roles()[$utilisateur->role] ?? $utilisateur->role,
                $utilisateur->province?->nom ?? $utilisateur->commune?->province?->nom ?? '-',
                $utilisateur->commune?->nom ?? '-',
                $utilisateur->actif ? 'Actif' : 'Désactivé',
            ], null, "A{$ligne}");
            $ligne++;
        }

        $enqueteurs = $classeur->createSheet();
        $enqueteurs->setTitle('Enqueteurs');
        $enqueteurs->fromArray([
            ['Nom', 'E-mail', 'Province', 'Commune', 'Zone', 'Colline', 'Statut'],
        ], null, 'A1');
        $ligne = 2;

        foreach ($utilisateurs->where('role', 'enqueteur') as $utilisateur) {
            $collines = $utilisateur->collines->sortBy('nom')->values();

            if ($collines->isEmpty()) {
                $enqueteurs->fromArray([
                    $utilisateur->name,
                    $utilisateur->email,
                    '-',
                    '-',
                    '-',
                    '-',
                    $utilisateur->actif ? 'Actif' : 'Désactivé',
                ], null, "A{$ligne}");
                $ligne++;
            } else {
                $affectationsParCommune = $collines->groupBy(function (Colline $colline) {
                    return $colline->zone?->commune_id ?? 0;
                });

                foreach ($affectationsParCommune as $collinesCommune) {
                    $commune = $collinesCommune->first()?->zone?->commune;
                    $province = $commune?->province;
                    $zones = $collinesCommune
                        ->map(fn (Colline $colline) => $colline->zone?->nom)
                        ->filter()
                        ->unique()
                        ->sort()
                        ->implode(', ');
                    $collinesAffectees = $collinesCommune
                        ->pluck('nom')
                        ->filter()
                        ->unique()
                        ->sort()
                        ->implode(', ');
                    $enqueteurs->fromArray([
                        $utilisateur->name,
                        $utilisateur->email,
                        $province?->nom ?? '-',
                        $commune?->nom ?? '-',
                        $zones !== '' ? $zones : '-',
                        $collinesAffectees !== '' ? $collinesAffectees : '-',
                        $utilisateur->actif ? 'Actif' : 'Désactivé',
                    ], null, "A{$ligne}");
                    $ligne++;
                }
            }
        }

        foreach ([$superviseurs, $enqueteurs] as $feuille) {
            $feuille->getStyle('A1:'.$feuille->getHighestColumn().'1')->getFont()->setBold(true);
            $feuille->freezePane('A2');
            foreach (range('A', $feuille->getHighestColumn()) as $colonne) {
                $feuille->getColumnDimension($colonne)->setAutoSize(true);
            }
        }

        $enqueteurs->getStyle('A2:G'.$enqueteurs->getHighestRow())->getAlignment()->setWrapText(true);
        foreach (range(2, max(2, $enqueteurs->getHighestRow())) as $numeroLigne) {
            $enqueteurs->getRowDimension($numeroLigne)->setRowHeight(30);
        }
        $writer = new Xlsx($classeur);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, 'utilisateurs-superviseurs-enqueteurs.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function donneesFormulaire(?User $utilisateurConnecte = null): array
    {
        $roles = $this->roles();

        if ($utilisateurConnecte?->role === 'superviseur_provincial') {
            $roles = Arr::only($roles, ['superviseur_communal', 'enqueteur']);
        } elseif ($utilisateurConnecte?->role === 'superviseur_communal') {
            $roles = Arr::only($roles, ['enqueteur']);
        } elseif ($utilisateurConnecte?->role === 'superviseur_national') {
            $roles = Arr::except($roles, ['admin']);
        }

        return [
            'roles' => $roles,
            'provinces' => Province::orderBy('nom')->get(['id', 'nom']),
            'communes' => Commune::orderBy('nom')->get(['id', 'nom', 'province_id']),
            'zones' => Zone::orderBy('nom')->get(['id', 'nom', 'commune_id']),
            'collines' => Colline::orderBy('nom')->get(['id', 'nom', 'zone_id']),
        ];
    }

    private function roles(): array
    {
        return [
            'admin' => 'Administrateur',
            'superviseur_national' => 'Superviseur national',
            'superviseur_provincial' => 'Superviseur provincial',
            'superviseur_communal' => 'Superviseur communal',
            'enqueteur' => 'Enquêteur',
        ];
    }

    private function valider(Request $request, ?int $idIgnore = null): array
    {
        $rolesAutorises = array_keys($this->rolesAutorisesPour($request->user()));

        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($idIgnore)],
            'role' => ['required', Rule::in($rolesAutorises)],
            'province_id' => ['nullable', 'exists:provinces,id', 'required_if:role,superviseur_provincial'],
            'commune_id' => ['nullable', 'exists:communes,id', 'required_if:role,superviseur_communal'],
            'collines_ids' => ['nullable', 'array', 'required_if:role,enqueteur'],
            'collines_ids.*' => ['integer', 'exists:collines,id'],
            'password' => [$idIgnore ? 'nullable' : 'required', 'string', 'min:8'],
        ]);
    }

    private function rolesAutorisesPour(User $utilisateur): array
    {
        $roles = $this->roles();

        return match ($utilisateur->role) {
            'superviseur_provincial' => Arr::only($roles, ['superviseur_communal', 'enqueteur']),
            'superviseur_communal' => Arr::only($roles, ['enqueteur']),
            'superviseur_national' => Arr::except($roles, ['admin']),
            default => $roles,
        };
    }

    private function normaliserPorteeTerritoriale(User $utilisateur, array $donnees): array
    {
        if ($utilisateur->role === 'superviseur_provincial') {
            $donnees['province_id'] = $utilisateur->province_id;

            if (! empty($donnees['commune_id'])
                && ! Commune::whereKey($donnees['commune_id'])
                    ->where('province_id', $utilisateur->province_id)
                    ->exists()) {
                throw ValidationException::withMessages([
                    'commune_id' => 'La commune sélectionnée est hors de votre province.',
                ]);
            }
        }

        if ($utilisateur->role === 'superviseur_communal') {
            $commune = Commune::find($utilisateur->commune_id);
            $donnees['commune_id'] = $utilisateur->commune_id;
            $donnees['province_id'] = $commune?->province_id;
        }

        return $donnees;
    }
}
