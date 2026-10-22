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
//use App\Http\Controllers\Api\V1\TestController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - lnc-burundi (v1)
|--------------------------------------------------------------------------
|
| Consommées par l'application mobile de terrain (géolocalisation des
| plantations de café). Auth par token Sanctum (Bearer), conçue pour un
| usage offline-first : les enquêteurs travaillent hors connexion sur le
| terrain et synchronisent leurs données (ménages, parcelles, réponses)
| lors du retour de connectivité via /sync/push et /sync/pull.
|
*/

Route::prefix('v1')->name('api.v1.')->group(function () {

    // --- Authentification (publique) ---
    Route::post('/login', [AuthController::class, 'login'])->name('login');
    Route::get('/ping', function () {
        return response()->json(['status' => 'ok'], 200);
    });

    //Route::get('/test',[TestController::class])->name("hello");

    // --- Données de référence géographiques (à mettre en cache côté mobile) ---
    Route::prefix('geo')->name('geo.')->group(function () {
            Route::get('/provinces', [GeoReferenceController::class, 'provinces'])->name('provinces');
            Route::get('/communes', [GeoReferenceController::class, 'communes'])->name('communes');
            Route::get('/zones', [GeoReferenceController::class, 'zones'])->name('zones');
            Route::get('/collines', [GeoReferenceController::class, 'collines'])->name('collines');
            Route::get('/arborescence', [GeoReferenceController::class, 'arborescence'])->name('arborescence');
        });

    Route::middleware('auth:sanctum')->group(function () {

        // --- Session / compte ---
        Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
        Route::get('/me', [AuthController::class, 'me'])->name('me');



        // --- Questionnaire actif (formulaire dynamique côté mobile) ---
        Route::get('/questionnaire/actif', [QuestionnaireController::class, 'actif'])->name('questionnaire.actif');

        // --- Ménages assignés à l'enquêteur (portée territoriale appliquée automatiquement) ---
        Route::apiResource('menages', MenageController::class);

        // --- Parcelles géolocalisées (points/polygones GPS) ---
        Route::apiResource('menages.parcelles', ParcelleController::class)
            ->shallow();

        Route::get('/accueil', [AccueilController::class, 'index'])
            ->name('accueil.index');

        // --- Réponses au questionnaire ---
        Route::post('/reponses', [ReponseController::class, 'store'])->name('reponses.store');
        Route::post('/reponses/lot', [ReponseController::class, 'storeLot'])->name('reponses.lot');
        Route::get('/arborescence/connected', [GeoReferenceController::class, 'arborescence'])->name('arborescence');

        // --- Synchronisation offline-first ---
        Route::prefix('sync')->name('sync.')->group(function () {
            Route::post('/push', [SyncPushController::class, 'push'])->name('push');
            Route::get('/pull', [SyncPullController::class, 'pull'])->name('pull');
        });
    });
});
