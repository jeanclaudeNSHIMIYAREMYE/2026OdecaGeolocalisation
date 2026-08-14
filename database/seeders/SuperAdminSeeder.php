<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            [
                'email' => 'superadmin@lnc-burundi.bi',
            ],
            [
                'name' => 'Super Administrateur',
                'password' => Hash::make('7943529m8JP'),
                'role' => 'admin',
                'actif' => true,
                'is_super_admin' => true,
                'province_id' => null,
                'commune_id' => null,
            ]
        );
    }
}
