<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Vite;

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
    }
}
