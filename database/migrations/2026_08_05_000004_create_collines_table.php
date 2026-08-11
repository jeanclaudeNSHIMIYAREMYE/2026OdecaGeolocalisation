<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('collines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zone_id')->constrained('zones')->cascadeOnDelete();
            $table->string('nom');
            $table->timestamps();

            $table->unique(['zone_id', 'nom']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collines');
    }
};
