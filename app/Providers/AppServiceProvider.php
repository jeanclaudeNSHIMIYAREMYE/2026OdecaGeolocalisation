<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        /*
        |--------------------------------------------------------------------------
        | Préchargement des ressources Vite
        |--------------------------------------------------------------------------
        */

        Vite::prefetch(concurrency: 3);

        /*
        |--------------------------------------------------------------------------
        | 1. Connexion : 5 tentatives par minute
        |--------------------------------------------------------------------------
        */

        RateLimiter::for('login', function (Request $request) {

            $email = strtolower(trim($request->input('email', '')));

            return Limit::perMinute(5)
                ->by(
                    'login:' . $request->ip() . ':' .
                    hash('sha256', $email)
                );
        });

        /*
        |--------------------------------------------------------------------------
        | 2. Routes publiques : 30 requêtes par IP
        |--------------------------------------------------------------------------
        */

        RateLimiter::for('public-api', function (Request $request) {

            return Limit::perMinute(30)
                ->by('public:' . $request->ip());
        });

        /*
        |--------------------------------------------------------------------------
        | 3. Routes authentifiées : 10 requêtes par utilisateur
        |--------------------------------------------------------------------------
        */

        RateLimiter::for('authenticated-api', function (Request $request) {

            return Limit::perMinute(10)
                ->by(
                    'user:' . ($request->user()?->id ?? $request->ip())
                );
        });

        /*
        |--------------------------------------------------------------------------
        | 4. Synchronisation offline-first : 30 requêtes par utilisateur
        |--------------------------------------------------------------------------
        */

        RateLimiter::for('sync', function (Request $request) {

            return Limit::perMinute(10)
                ->by(
                    'sync:user:' . ($request->user()?->id ?? $request->ip())
                );
        });
    }
}
