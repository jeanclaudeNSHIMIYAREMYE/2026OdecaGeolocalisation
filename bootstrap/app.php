<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureUserHasRole::class,
            'exclude.enqueteur' => \App\Http\Middleware\ExcludeEnqueteur::class,
        ]);

        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        $exceptions->renderable(function (\Throwable $exception, Request $request) {
            // Les API conservent leur format JSON et leur gestion dédiée.
            if ($request->is('api/*') || $request->expectsJson()) {
                return null;
            }

            // Laravel/Inertia gère déjà les erreurs de validation et la connexion.
            if ($exception instanceof \Illuminate\Validation\ValidationException
                || $exception instanceof \Illuminate\Auth\AuthenticationException
            ) {
                return null;
            }

            $statut = $exception instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface
                ? $exception->getStatusCode()
                : 500;

            $message = match (true) {
                $exception instanceof \Illuminate\Auth\Access\AuthorizationException || $statut === 403
                    => 'Vous n’êtes pas autorisé à effectuer cette action.',
                $exception instanceof \Illuminate\Database\Eloquent\ModelNotFoundException || $statut === 404
                    => 'La donnée demandée est introuvable ou a déjà été supprimée.',
                $statut === 405
                    => 'Cette action n’est pas disponible pour cette page.',
                default
                    => 'Une erreur est survenue. Veuillez réessayer. Les données existantes sont conservées.',
            };

            \Illuminate\Support\Facades\Log::error('Exception web convertie en message utilisateur.', [
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'status' => $statut,
                'exception' => $exception,
            ]);

            $reponse = $request->isMethod('GET')
                ? redirect()->route('dashboard')
                : redirect()->back();

            return $reponse->with('erreur', $message);
        });
    })->create();
