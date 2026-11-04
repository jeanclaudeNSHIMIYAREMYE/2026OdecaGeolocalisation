<?php

namespace App\Support;

use App\Models\Menage;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Log;

class AccesTerritorial
{
    /**
     * Vérifie si l'utilisateur peut accéder à un ménage.
     */
    public static function verifierMenage(
        User $user,
        int $menageId
    ): Menage {

        // L'enquêteur ne peut accéder qu'aux ménages
        // situés dans ses collines affectées.
        if ($user->role === 'enqueteur') {

            $collineIds = $user->collines()
                ->pluck('collines.id');

           logger()->info('ACCESS MENAGE', [
                'user id' => $user->id,
                'user role' => $user->role,
                'Collines IDs' => $collineIds,
            ]);

            $menage = Menage::withoutGlobalScopes()
                ->whereKey($menageId)
                ->where(function ($query) use ($collineIds) {
                    $query->whereIn('colline_id', $collineIds)
                        ->orWhereHas('collines', function ($colline) use ($collineIds) {
                            $colline->whereIn('collines.id', $collineIds);
                        });
                })
                ->first();

            if (!$menage) {
                throw new AuthorizationException(
                    "Accès interdit : ce ménage n'appartient pas à vos collines affectées."
                );
            }

            return $menage;
        }

        // Pour les autres rôles, conserver les Global Scopes
        // et les règles territoriales existantes.
        return Menage::query()->findOrFail($menageId);
    }

    /**
     * Vérifie si l'utilisateur peut travailler dans une colline.
     */
    public static function verifierColline(User $user, int $collineId): void
{
    if ($user->role !== 'enqueteur') {
        return;
    }

    $collineIds = $user->collines()
        ->pluck('collines.id')
        ->map(fn ($id) => (int) $id)
        ->values()
        ->all();

    if (!in_array((int) $collineId, $collineIds, true)) {
        throw new AuthorizationException(
            "Accès interdit : cette colline ne vous est pas affectée."
        );
    }
}
}
