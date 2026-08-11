<?php

namespace App\Models\Scopes;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Applique automatiquement le filtrage par rôle/portée territoriale
 * (province/commune/enquêteur assigné) à chaque requête du modèle,
 * sans que chaque contrôleur ait à y penser.
 *
 * - Pour Menage : filtre directement via Menage::scopeVisiblePour().
 * - Pour un modèle lié (Parcelle, ReponseQuestionnaire) : filtre via la
 *   relation vers menage, en passant son nom (ex: 'menage').
 *
 * Ne s'applique que si un utilisateur est authentifié ; en console
 * (seeders, commandes artisan) le filtrage est désactivé.
 */
class PorteeTerritorialeScope implements Scope
{
    public function __construct(private readonly ?string $relationMenage = null)
    {
    }

    public function apply(Builder $builder, Model $model): void
    {
        if (! auth()->check()) {
            return;
        }

        /** @var \App\Models\User&Authenticatable $utilisateur */
        $utilisateur = auth()->user();

        if ($this->relationMenage) {
            $builder->whereHas(
                $this->relationMenage,
                fn (Builder $q) => $q->visiblePour($utilisateur)
            );

            return;
        }

        $builder->visiblePour($utilisateur);
    }
}
