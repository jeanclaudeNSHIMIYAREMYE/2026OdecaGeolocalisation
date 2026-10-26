<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE menages
            MODIFY COLUMN statut
            ENUM('a_faire', 'deja_commence', 'en_attente', 'termine')
            NOT NULL DEFAULT 'a_faire'
        ");
    }

    public function down(): void
    {
        // Convert existing records before removing the status.
        DB::table('menages')
            ->where('statut', 'deja_commence')
            ->update(['statut' => 'a_faire']);

        DB::statement("
            ALTER TABLE menages
            MODIFY COLUMN statut
            ENUM('a_faire', 'en_attente', 'termine')
            NOT NULL DEFAULT 'a_faire'
        ");
    }
};
