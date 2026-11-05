<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commune_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('commune_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'commune_id']);
        });

        DB::table('users')
            ->where('role', 'superviseur_communal')
            ->whereNotNull('commune_id')
            ->orderBy('id')
            ->each(function ($user) {
                $exists = DB::table('commune_user')
                    ->where('user_id', $user->id)
                    ->where('commune_id', $user->commune_id)
                    ->exists();

                if (! $exists) {
                    DB::table('commune_user')->insert([
                        'user_id' => $user->id,
                        'commune_id' => $user->commune_id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('commune_user');
    }
};
