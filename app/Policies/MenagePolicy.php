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
        if ($utilisateur->estAdmin()) {
            return true;
        }

        // Les superviseurs provincial et communal peuvent uniquement
        // corriger les ménages/caféiculteurs nouvellement collectés sur le
        // terrain. Les ménages pré-enregistrés restent en lecture seule.
        if (
            in_array($utilisateur->role, [
                'superviseur_national',
                'superviseur_provincial',
                'superviseur_communal',
            ], true)
        ) {
            return $menage->source === 'terrain';
        }

        return $utilisateur->role === 'enqueteur' && $menage->enqueteur_id === $utilisateur->id;
    }

    public function delete(User $utilisateur, Menage $menage): bool
    {
        if ($utilisateur->estAdmin()) {
            return true;
        }

        return in_array($utilisateur->role, [
            'superviseur_national',
            'superviseur_provincial',
            'superviseur_communal',
        ], true) && $menage->source === 'terrain';
    }

    public function deleteParcelle(User $utilisateur, Menage $menage): bool
    {
        return $this->peutGererDonneesAssociees($utilisateur, $menage);
    }

    public function deleteReponse(User $utilisateur, Menage $menage): bool
    {
        return $this->peutGererDonneesAssociees($utilisateur, $menage);
    }

    public function updateReponse(User $utilisateur, Menage $menage): bool
    {
        return $this->peutGererDonneesAssociees($utilisateur, $menage);
    }

    private function peutGererDonneesAssociees(
        User $utilisateur,
        Menage $menage
    ): bool {
        if ($utilisateur->estAdmin()) {
            return true;
        }

        if (in_array($utilisateur->role, [
            'superviseur_provincial',
            'superviseur_communal',
        ], true)) {
            return true;
        }

        return $utilisateur->role === 'superviseur_national'
            && $menage->source === 'terrain';
    }
}
