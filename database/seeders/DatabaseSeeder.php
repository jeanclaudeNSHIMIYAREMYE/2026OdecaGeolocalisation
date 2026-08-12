<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            ReferentielAdministratifSeeder::class,
            QuestionnaireSeeder::class
        ]);

        User::factory()->create([
            'name' => 'Administrateur',
            'email' => 'admin@lnc-burundi.bi',
            'role' => 'admin',
            'password' => bcrypt('password'),
        ]);
    }
}
