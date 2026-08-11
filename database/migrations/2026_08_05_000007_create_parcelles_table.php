<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parcelles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menage_id')->constrained('menages')->cascadeOnDelete();

            $table->unsignedInteger('nombre_pieds')->nullable();
            $table->unsignedSmallInteger('annee_mise_en_place')->nullable();
            $table->string('etat_verger')->nullable();

            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->json('polygone')->nullable();
            $table->enum('mode_positionnement', ['automatique', 'manuel'])->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parcelles');
    }
};
