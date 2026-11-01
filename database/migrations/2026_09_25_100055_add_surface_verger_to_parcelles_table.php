<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('parcelles', 'surface_verger')) {
            Schema::table('parcelles', function (Blueprint $table) {
                $table->decimal('surface_verger', 10, 2)->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('parcelles', 'surface_verger')) {
            Schema::table('parcelles', function (Blueprint $table) {
                $table->dropColumn('surface_verger');
            });
        }
    }
};