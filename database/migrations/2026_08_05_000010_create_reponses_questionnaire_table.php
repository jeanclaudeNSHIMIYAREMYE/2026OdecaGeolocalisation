<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reponses_questionnaire', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menage_id')->constrained('menages')->cascadeOnDelete();
            $table->foreignId('parcelle_id')->nullable()->constrained('parcelles')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('questions')->cascadeOnDelete();

            $table->json('valeur')->nullable();

            $table->timestamps();

            $table->unique(['menage_id', 'parcelle_id', 'question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reponses_questionnaire');
    }
};
