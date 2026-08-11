<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('commune_id')->constrained('communes')->cascadeOnDelete();
            $table->string('nom');
            $table->timestamps();

            $table->unique(['commune_id', 'nom']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zones');
    }
};
