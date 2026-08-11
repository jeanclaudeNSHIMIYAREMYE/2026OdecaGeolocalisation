<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\MenageController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\StatistiqueController;
use App\Http\Controllers\UserController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
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

Route::get('/statistiques', [StatistiqueController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('statistiques.index');

Route::middleware(['auth', 'verified'])
    ->resource('menages', MenageController::class)
    ->except(['destroy'])
    ->parameters(['menages' => 'menage']);

Route::delete('/menages/{menage}', [MenageController::class, 'destroy'])
    ->middleware(['auth', 'verified', 'role:admin'])
    ->name('menages.destroy');

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
