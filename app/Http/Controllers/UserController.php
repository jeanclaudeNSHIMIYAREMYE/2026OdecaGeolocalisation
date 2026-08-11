<?php

namespace App\Http\Controllers;

use App\Models\Commune;
use App\Models\Province;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', User::class);

        $utilisateurs = User::visiblePour($request->user())
            ->with(['province:id,nom', 'commune:id,nom'])
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'province_id', 'commune_id', 'actif']);

        return Inertia::render('Utilisateurs/Index', [
            'utilisateurs' => $utilisateurs,
            'peutGerer' => $request->user()->estAdmin(),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', User::class);

        return Inertia::render('Utilisateurs/Creer', $this->donneesFormulaire());
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', User::class);

        $donnees = $this->valider($request);

        User::create([
            ...$donnees,
            'password' => Hash::make($donnees['password']),
        ]);

        return redirect()->route('utilisateurs.index')->with('succes', 'Compte créé.');
    }

    public function edit(User $utilisateur): Response
    {
        $this->authorize('update', $utilisateur);

        return Inertia::render('Utilisateurs/Modifier', [
            'utilisateur' => $utilisateur->only(['id', 'name', 'email', 'role', 'province_id', 'commune_id']),
            ...$this->donneesFormulaire(),
        ]);
    }

    public function update(Request $request, User $utilisateur): RedirectResponse
    {
        $this->authorize('update', $utilisateur);

        $donnees = $this->valider($request, $utilisateur->id);

        $utilisateur->update([
            'name' => $donnees['name'],
            'email' => $donnees['email'],
            'role' => $donnees['role'],
            'province_id' => $donnees['province_id'] ?? null,
            'commune_id' => $donnees['commune_id'] ?? null,
            ...(filled($donnees['password'] ?? null) ? ['password' => Hash::make($donnees['password'])] : []),
        ]);

        return redirect()->route('utilisateurs.index')->with('succes', 'Compte mis à jour.');
    }

    public function basculerStatut(User $utilisateur): RedirectResponse
    {
        $this->authorize('delete', $utilisateur);

        $utilisateur->update(['actif' => ! $utilisateur->actif]);

        return back()->with('succes', $utilisateur->actif ? 'Compte réactivé.' : 'Compte désactivé.');
    }

    private function donneesFormulaire(): array
    {
        return [
            'roles' => $this->roles(),
            'provinces' => Province::orderBy('nom')->get(['id', 'nom']),
            'communes' => Commune::orderBy('nom')->get(['id', 'nom', 'province_id']),
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
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($idIgnore)],
            'role' => ['required', Rule::in(array_keys($this->roles()))],
            'province_id' => ['nullable', 'exists:provinces,id', 'required_if:role,superviseur_provincial'],
            'commune_id' => ['nullable', 'exists:communes,id', 'required_if:role,superviseur_communal'],
            'password' => [$idIgnore ? 'nullable' : 'required', 'string', 'min:8'],
        ]);
    }
}
