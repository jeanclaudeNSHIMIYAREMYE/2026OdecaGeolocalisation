<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', [
                'admin',
                'superviseur_national',
                'superviseur_provincial',
                'superviseur_communal',
                'enqueteur',
            ])->default('enqueteur')->after('id');

            $table->foreignId('province_id')->nullable()->after('role')
                ->constrained('provinces')->nullOnDelete();

            $table->foreignId('commune_id')->nullable()->after('province_id')
                ->constrained('communes')->nullOnDelete();

            $table->boolean('actif')->default(true)->after('commune_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('commune_id');
            $table->dropConstrainedForeignId('province_id');
            $table->dropColumn(['role', 'actif']);
        });
    }
};
