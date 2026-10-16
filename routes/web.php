<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\MenageController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RapportController;
use App\Http\Controllers\StatistiqueController;
use App\Http\Controllers\UserController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\MenageExportController;
use App\Http\Controllers\MenageImportController;
use App\Http\Controllers\SuiviMenagesController;
use App\Http\Controllers\SuiviMenagesExportController;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/php-info', function () {
    return [
        'php_version' => PHP_VERSION,
        'max_execution_time' => ini_get('max_execution_time'),
        'php_ini' => php_ini_loaded_file(),
        'sapi' => php_sapi_name(),
    ];
});

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::middleware(['auth', 'verified'])
    ->prefix('exports')
    ->name('exports.')
    ->group(function () {
        Route::get('/menages.csv', [ExportController::class, 'csv'])->name('menages-csv');
        Route::get('/menages.xlsx', [ExportController::class, 'xlsx'])->name('menages-xlsx');
        Route::get('/menages.pdf', [ExportController::class, 'pdf'])->name('menages-pdf');
        Route::get('/parcelles.geojson', [ExportController::class, 'geojson'])->name('parcelles-geojson');
    });

Route::middleware(['auth', 'verified', 'exclude.enqueteur'])
    ->prefix('rapports')
    ->name('rapports.')
    ->group(function () {
        Route::get('/', [RapportController::class, 'index'])->name('index');
        Route::get('/export/pdf', [RapportController::class, 'pdf'])->name('pdf');
        Route::get('/export/xlsx', [RapportController::class, 'xlsx'])->name('xlsx');
        Route::get('/export/csv', [RapportController::class, 'csv'])->name('csv');
        Route::get('/export/kml', [RapportController::class, 'kml'])->name('kml');
        Route::get('/export/geojson', [RapportController::class, 'geojson'])->name('geojson');
    });

Route::get('/statistiques', [StatistiqueController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('statistiques.index');

// Suivi des ménages (pré-enregistrés / nouveaux terrain, réponses au
// questionnaire) — groupe indépendant, même portée d'accès que la liste
// générale des ménages (pas restreint aux rôles de gestion des comptes).
Route::middleware(['auth', 'verified'])
    ->prefix('suivi-menages')
    ->name('suivi-menages.')
    ->group(function () {
        Route::get('/', [SuiviMenagesController::class, 'index'])->name('index');
        Route::get('/export/xlsx', [SuiviMenagesExportController::class, 'xlsx'])->name('xlsx');
        Route::get('/export/csv', [SuiviMenagesExportController::class, 'csv'])->name('csv');
        Route::get('/export/pdf', [SuiviMenagesExportController::class, 'pdf'])->name('pdf');
        Route::get('/export/geojson', [SuiviMenagesExportController::class, 'geojson'])->name('geojson');
    });

Route::middleware(['auth', 'verified'])
    ->resource('menages', MenageController::class)
    ->except(['destroy'])
    ->parameters(['menages' => 'menage']);

Route::get('menages/{menage}/dupliquer', [MenageController::class, 'dupliquer'])->middleware(['auth', 'verified', 'role:admin'])->name('menages.dupliquer');
Route::post('menages/{menage}/dupliquer', [MenageController::class, 'enregistrerCopie'])->middleware(['auth', 'verified', 'role:admin'])->name('menages.dupliquer.store');

Route::delete('/menages/{menage}', [MenageController::class, 'destroy'])
    ->middleware(['auth', 'verified', 'role:admin'])
    ->name('menages.destroy');

Route::delete('/menages/{menage}/parcelles/{parcelle}', [MenageController::class, 'detruireParcelle'])
    ->middleware(['auth', 'verified', 'role:admin'])
    ->name('menages.parcelles.destroy');

Route::delete('/menages/{menage}/reponses/{reponse}', [MenageController::class, 'detruireReponse'])
    ->middleware(['auth', 'verified', 'role:admin'])
    ->name('menages.reponses.destroy');

// Import / export du fichier "caféiculteurs" — routes indépendantes du
// groupe "utilisateurs" ci-dessous : elles portent sur les ménages, pas
// sur la gestion des comptes, et doivent donc rester accessibles à tout
// utilisateur autorisé à consulter/créer des ménages (pas seulement aux
// admins/superviseurs de la gestion des utilisateurs).
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/menages/export', [MenageExportController::class, 'exporter'])
        ->name('menages.export');

    Route::post('/menages/import', [MenageImportController::class, 'importer'])
        ->name('menages.import');
});

Route::middleware(['auth', 'verified', 'role:admin,superviseur_national,superviseur_provincial,superviseur_communal'])
    ->prefix('utilisateurs')
    ->name('utilisateurs.')
    ->group(function () {
        Route::get('/', [UserController::class, 'index'])->name('index');

        Route::middleware('role:admin')->group(function () {
            Route::get('/creer', [UserController::class, 'create'])->name('create');
            Route::post('/', [UserController::class, 'store'])->name('store');
            Route::get('/{utilisateur}/modifier', [UserController::class, 'edit'])->name('edit');
            Route::put('/{utilisateur}', [UserController::class, 'update'])->name('update');
            Route::patch('/{utilisateur}/basculer-statut', [UserController::class, 'basculerStatut'])->name('basculer-statut');
        });
    });

require __DIR__.'/auth.php';
