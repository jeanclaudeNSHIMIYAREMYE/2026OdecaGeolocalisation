<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restreint l'accès à une route à une liste de rôles.
 * Usage dans les routes : ->middleware('role:admin,superviseur_national')
 */
class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $utilisateur = $request->user();

        abort_if(! $utilisateur || ! in_array($utilisateur->role, $roles, true), 403,
            "Vous n'avez pas les droits nécessaires pour accéder à cette page.");

        abort_if(! $utilisateur->actif, 403, 'Votre compte a été désactivé.');

        return $next($request);
    }
}
