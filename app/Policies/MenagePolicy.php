<?php

namespace App\Policies;

use App\Models\Menage;
use App\Models\User;

class MenagePolicy
{
    /**
     * La visibilité de la liste est déjà filtrée par le scope territorial
     * automatique (PorteeTerritorialeScope) sur le modèle Menage : tout
     * utilisateur authentifié peut donc consulter "sa" liste.
     */
    public function viewAny(User $utilisateur): bool
    {
        return true;
    }

    public function view(User $utilisateur, Menage $menage): bool
    {
        return true;
    }

    public function create(User $utilisateur): bool
    {
        return true;
    }

    public function update(User $utilisateur, Menage $menage): bool
    {
        if ($utilisateur->estAdmin() || $utilisateur->estSuperviseur()) {
            return true;
        }

        return $utilisateur->role === 'enqueteur' && $menage->enqueteur_id === $utilisateur->id;
    }

    public function delete(User $utilisateur, Menage $menage): bool
    {
        return $utilisateur->estAdmin();
    }
}
