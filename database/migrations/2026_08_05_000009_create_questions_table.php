<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('questionnaire_version_id')->constrained('questionnaire_versions')->cascadeOnDelete();

            $table->string('code')->unique();
            $table->text('libelle');
            $table->string('section')->nullable();
            $table->enum('type', ['texte', 'numerique', 'date', 'choix_unique', 'choix_multiple', 'geopoint']);
            $table->json('options')->nullable();
            $table->boolean('obligatoire')->default(true);
            $table->boolean('autre_option')->default(false);
            $table->unsignedInteger('ordre')->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};
