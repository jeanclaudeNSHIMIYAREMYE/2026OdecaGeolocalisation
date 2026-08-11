<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sync_logs', function (Blueprint $table) {
            $table->id();
            $table->string('syncable_type');
            $table->unsignedBigInteger('syncable_id');

            $table->enum('statut', ['envoye', 'en_attente', 'conflit'])->default('en_attente');
            $table->string('device_id')->nullable();
            $table->foreignId('enqueteur_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('payload')->nullable();
            $table->timestamp('synced_at')->nullable();

            $table->timestamps();

            $table->index(['syncable_type', 'syncable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_logs');
    }
};
