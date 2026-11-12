<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UsersSeeder extends Seeder
{
    public function run(): void
    {
        $prenoms = [
            'Alice','Bruno','Camille','David','Emma','Fabien','Gabrielle','Hugo','Inès','Julien',
            'Karim','Laura','Mathieu','Nadia','Olivier','Pauline','Quentin','Rachel','Samuel','Théo',
            'Ursule','Victor','Wendy','Xavier','Yasmine','Zoé','Antoine','Béatrice','Claude','Delphine',
            'Étienne','Fanny','Guillaume','Hélène','Isaac','Jade','Kevin','Léa','Marc','Nora',
            'Oscar','Pierre','Rita','Sophie','Thomas','Ulysse','Valérie','William','Yann','Zakaria',
        ];

        $noms = [
            'Martin','Bernard','Dubois','Thomas','Robert','Richard','Petit','Durand','Leroy','Moreau',
            'Simon','Laurent','Lefebvre','Michel','Garcia','David','Bertrand','Roux','Vincent','Fournier',
            'Morel','Girard','André','Mercier','Dupont','Lambert','Bonnet','François','Martinez','Legrand',
            'Garnier','Faure','Rousseau','Blanc','Guerin','Muller','Henry','Roussel','Nicolas','Perrin',
            'Morin','Mathieu','Clement','Gauthier','Dumont','Lopez','Fontaine','Chevalier','Robin','Masson',
        ];

        $password = Hash::make('password'); // même mot de passe pour tous : "password"
        $now = now();
        $users = [];

        foreach ($prenoms as $i => $prenom) {
            $nom = $noms[$i];
            $users[] = [
                'name'              => "$prenom $nom",
                'email'             => Str::slug($prenom) . '.' . Str::slug($nom) . '@example.com',
                'email_verified_at' => $now,
                'password'          => $password,
                'remember_token'    => Str::random(10),
                'created_at'        => $now,
                'updated_at'        => $now,
            ];
        }

        DB::table('users')->insert($users);
    }
}