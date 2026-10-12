<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ExcludeEnqueteur
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->role === 'enqueteur') {
            abort(403, 'Accès interdit.');
        }

        return $next($request);
    }
}
