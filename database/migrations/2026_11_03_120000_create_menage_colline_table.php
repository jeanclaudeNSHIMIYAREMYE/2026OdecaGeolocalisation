<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menage_colline', function (Blueprint $table) {
            $table->foreignId('menage_id')->constrained('menages')->cascadeOnDelete();
            $table->foreignId('colline_id')->constrained('collines')->cascadeOnDelete();
            $table->timestamps();

            $table->primary(['menage_id', 'colline_id']);
        });

        DB::table('menages')
            ->select(['id', 'colline_id'])
            ->orderBy('id')
            ->each(function (object $menage) {
                DB::table('menage_colline')->insert([
                    'menage_id' => $menage->id,
                    'colline_id' => $menage->colline_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('menage_colline');
    }
};
