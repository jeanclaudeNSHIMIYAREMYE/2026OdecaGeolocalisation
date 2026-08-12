<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('menages', function (Blueprint $table) {

            $table->enum('type_menage', [
                'personel',
                'association'
            ])->default('personel')
              ->after('code_menage');

            $table->string('photo_proprietaire')->nullable()
                ->after('telephone');

            $table->string('photo_piece_identification')->nullable()
                ->after('photo_proprietaire');

            $table->string('cni')->nullable()
                ->after('photo_piece_identification');
        });
    }

    public function down(): void
    {
        Schema::table('menages', function (Blueprint $table) {
            $table->dropColumn([
                'type_menage',
                'photo_proprietaire',
                'photo_piece_identification',
                'cni',
            ]);
        });
    }
};
