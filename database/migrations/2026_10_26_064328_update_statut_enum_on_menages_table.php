
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Vérifier que la table existe
        if (!Schema::hasTable('menages')) {
            return;
        }

        // Mettre à jour les anciennes valeurs si nécessaire
        DB::table('menages')
            ->where('statut', 'deja_commence')
            ->update(['statut' => 'en_attente']);

        // SQLite ne permet pas de modifier directement
        // une contrainte CHECK avec ALTER TABLE.
        // La nouvelle contrainte doit être définie
        // dans la migration de création de la table.
    }

    public function down(): void
    {
        // Aucune modification structurelle à annuler.
    }
};
