<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('parcelles', 'type_parcelle')) {
            Schema::table('parcelles', function (Blueprint $table) {
                $table->string('type_parcelle')->nullable()->after('type_verger');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('parcelles', 'type_parcelle')) {
            Schema::table('parcelles', function (Blueprint $table) {
                $table->dropColumn('type_parcelle');
            });
        }
    }
};
