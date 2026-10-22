<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menages', function (Blueprint $table) {
            $table->id();
            $table->string('code_menage')->unique();
            $table->string('nom_chef_menage')->nullable();
            $table->string('prenom_chef_menage')->nullable();
            $table->string('telephone')->nullable();

            $table->foreignId('colline_id')->constrained('collines')->restrictOnDelete();

            $table->enum('statut', ['a_faire',"deja_commence", 'en_attente', 'termine'])->default('a_faire');
            $table->enum('source', ['pre_enregistre', 'terrain'])->default('pre_enregistre');

            $table->foreignId('enqueteur_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('cree_par_id')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamp('date_derniere_activite')->nullable();
            $table->timestamps();

            $table->index(['statut']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menages');
    }
};
