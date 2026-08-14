<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table pivot d'affectation territoriale des enquêteurs : un enquêteur
 * (users.role = 'enqueteur') peut être rattaché à une ou plusieurs
 * collines sur lesquelles il est autorisé à intervenir.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('colline_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('colline_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'colline_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('colline_user');
    }
};
