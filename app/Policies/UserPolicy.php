<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $utilisateur): bool
    {
        return $utilisateur->estAdmin() || $utilisateur->estSuperviseur();
    }

    public function view(User $utilisateur, User $cible): bool
    {
        return $this->viewAny($utilisateur);
    }

    public function create(User $utilisateur): bool
    {
        return $utilisateur->estAdmin();
    }

    public function update(User $utilisateur, User $cible): bool
    {
        return $utilisateur->estAdmin();
    }

    /**
     * Utilisé pour l'action de bascule actif/désactivé (pas de suppression
     * réelle des comptes, conformément au cahier des charges §8.4).
     */
    public function delete(User $utilisateur, User $cible): bool
    {
        return $utilisateur->estAdmin() && $utilisateur->isNot($cible);
    }
}
