<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE menages
            DROP CONSTRAINT IF EXISTS menages_statut_check
        ");

        DB::statement("
            ALTER TABLE menages
            ADD CONSTRAINT menages_statut_check
            CHECK (statut IN (
                'a_faire',
                'deja_commence',
                'en_attente',
                'termine'
            ))
        ");
    }

    public function down(): void
    {
        DB::statement("
            UPDATE menages
            SET statut = 'a_faire'
            WHERE statut = 'deja_commence'
        ");

        DB::statement("
            ALTER TABLE menages
            DROP CONSTRAINT IF EXISTS menages_statut_check
        ");

        DB::statement("
            ALTER TABLE menages
            ADD CONSTRAINT menages_statut_check
            CHECK (statut IN (
                'a_faire',
                'en_attente',
                'termine'
            ))
        ");
    }
};
