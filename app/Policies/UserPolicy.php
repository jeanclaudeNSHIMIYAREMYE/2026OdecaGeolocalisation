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
        return $utilisateur->estAdmin() || $utilisateur->estSuperviseur();
    }

    public function update(User $utilisateur, User $cible): bool
    {
        if ($cible->estSuperAdmin()) {
            return false;
        }

        if ($utilisateur->estAdmin()) {
            return true;
        }

        if (! $utilisateur->estSuperviseur()) {
            return false;
        }

        if ($utilisateur->role === 'superviseur_national') {
            return ! $cible->estAdmin();
        }

        if ($utilisateur->role === 'superviseur_provincial') {
            return (int) $cible->province_id === (int) $utilisateur->province_id
                || $cible->commune()->where('province_id', $utilisateur->province_id)->exists()
                || ($cible->estEnqueteur() && $cible->collines()->whereHas('zone.commune', function ($query) use ($utilisateur) {
                    $query->where('province_id', $utilisateur->province_id);
                })->exists());
        }

        if ($utilisateur->role === 'superviseur_communal') {
            return (int) $cible->commune_id === (int) $utilisateur->commune_id
                || ($cible->estEnqueteur() && $cible->collines()->whereHas('zone', function ($query) use ($utilisateur) {
                    $query->where('commune_id', $utilisateur->commune_id);
                })->exists());
        }

        return false;
    }

    /**
     * Utilisé pour l'action de bascule actif/désactivé (pas de suppression
     * réelle des comptes, conformément au cahier des charges §8.4).
     */
    public function delete(User $utilisateur, User $cible): bool
    {
        if ($utilisateur->is($cible) || $cible->estSuperAdmin()) {
            return false;
        }

        if ($utilisateur->estAdmin()) {
            return true;
        }

        if (! $utilisateur->estSuperviseur()) {
            return false;
        }

        if ($utilisateur->role === 'superviseur_national') {
            return ! $cible->estAdmin();
        }

        if ($utilisateur->role === 'superviseur_provincial') {
            return (int) $cible->province_id === (int) $utilisateur->province_id
                || $cible->commune()->where('province_id', $utilisateur->province_id)->exists()
                || ($cible->estEnqueteur() && $cible->collines()->whereHas('zone.commune', function ($query) use ($utilisateur) {
                    $query->where('province_id', $utilisateur->province_id);
                })->exists());
        }

        if ($utilisateur->role === 'superviseur_communal') {
            return (int) $cible->commune_id === (int) $utilisateur->commune_id
                || ($cible->estEnqueteur() && $cible->collines()->whereHas('zone', function ($query) use ($utilisateur) {
                    $query->where('commune_id', $utilisateur->commune_id);
                })->exists());
        }

        return false;
    }

    public function destroy(User $utilisateur, User $cible): bool
    {
        return $utilisateur->estAdmin() && $utilisateur->isNot($cible) && ! $cible->estSuperAdmin();
    }
}
