<?php
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\AccueilController;
use App\Http\Controllers\Api\V1\GeoReferenceController;
use App\Http\Controllers\Api\V1\MenageController;
use App\Http\Controllers\Api\V1\ParcelleController;
use App\Http\Controllers\Api\V1\QuestionnaireController;
use App\Http\Controllers\Api\V1\ReponseController;
use App\Http\Controllers\Api\V1\SyncPushController;
use App\Http\Controllers\Api\V1\SyncPullController;

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - lnc-burundi (v1)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')
    ->name('api.v1.')
    ->group(function () {

        /*
        |--------------------------------------------------------------------------
        | Authentification publique
        |--------------------------------------------------------------------------
        */

        Route::post('/login', [AuthController::class, 'login'])
            ->name('login');

        Route::get('/ping', function () {
            return response()->json(['status' => 'ok']);
        });

        Route::get('/diagnostic-database', [
            ReponseController::class,
            'diagnosticSqlite'
        ]);

        /*
        |--------------------------------------------------------------------------
        | Références géographiques
        |--------------------------------------------------------------------------
        */

        Route::prefix('geo')->name('geo.')->group(function () {

            Route::get('/provinces', [GeoReferenceController::class, 'provinces'])
                ->name('provinces');

            Route::get('/communes', [GeoReferenceController::class, 'communes'])
                ->name('communes');

            Route::get('/zones', [GeoReferenceController::class, 'zones'])
                ->name('zones');

            Route::get('/collines', [GeoReferenceController::class, 'collines'])
                ->name('collines');

            Route::get('/arborescence', [GeoReferenceController::class, 'arborescence'])
                ->name('arborescence');
        });

        /*
        |--------------------------------------------------------------------------
        | Routes protégées par Sanctum
        |--------------------------------------------------------------------------
        */

        Route::middleware('auth:sanctum')->group(function () {

            // Session et compte
            Route::post('/logout', [AuthController::class, 'logout'])
                ->name('logout');

            Route::get('/me', [AuthController::class, 'me'])
                ->name('me');

            // Questionnaire
            Route::get('/questionnaire/actif', [
                QuestionnaireController::class,
                'actif'
            ])->name('questionnaire.actif');

            // Ménages
            Route::apiResource('menages', MenageController::class);

            // Parcelles
            Route::apiResource('menages.parcelles', ParcelleController::class)
                ->shallow();

            // Accueil
            Route::get('/accueil', [AccueilController::class, 'index'])
                ->name('accueil.index');

            // Réponses
            Route::post('/reponses', [ReponseController::class, 'store'])
                ->name('reponses.store');

            Route::post('/reponses/lot', [ReponseController::class, 'storeLot'])
                ->name('reponses.lot');

            Route::get('/arborescence/connected', [
                GeoReferenceController::class,
                'arborescence'
            ])->name('arborescence');

            /*
            |--------------------------------------------------------------------------
            | Synchronisation offline-first
            |--------------------------------------------------------------------------
            */

            Route::prefix('sync')
                ->name('sync.')
                ->group(function () {

                    Route::post('/push', [SyncPushController::class, 'push'])
                        ->name('push');

                    Route::get('/pull', [SyncPullController::class, 'pull'])
                        ->name('pull');
                });
        });
    });
