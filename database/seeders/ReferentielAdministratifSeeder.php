<?php

namespace Database\Seeders;

use App\Models\Colline;
use App\Models\Commune;
use App\Models\Province;
use App\Models\Zone;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ReferentielAdministratifSeeder extends Seeder
{
    /**
     * Importe la hiérarchie province > commune > zone > colline
     * depuis database/data/burundi.json.
     *
     * Le fichier a la structure :
     * { "PROVINCE": { "Commune": { "Zone": ["Colline1", "Colline2", ...] } } }
     */
    public function run(): void
    {
        $cheminFichier = database_path('data/burundi.json');

        if (! file_exists($cheminFichier)) {
            $this->command->error("Fichier introuvable : {$cheminFichier}");

            return;
        }

        $referentiel = json_decode(file_get_contents($cheminFichier), true, 512, JSON_THROW_ON_ERROR);

        DB::transaction(function () use ($referentiel) {
            $nbProvinces = 0;
            $nbCommunes = 0;
            $nbZones = 0;
            $nbCollines = 0;

            foreach ($referentiel as $nomProvince => $communes) {
                $province = Province::updateOrCreate(
                    ['code' => $nomProvince],
                    ['nom' => ucfirst(mb_strtolower($nomProvince))]
                );
                $nbProvinces++;

                foreach ($communes as $nomCommune => $zones) {
                    $commune = Commune::updateOrCreate([
                        'province_id' => $province->id,
                        'nom' => $nomCommune,
                    ]);
                    $nbCommunes++;

                    foreach ($zones as $nomZone => $collines) {
                        $zone = Zone::updateOrCreate([
                            'commune_id' => $commune->id,
                            'nom' => $nomZone,
                        ]);
                        $nbZones++;

                        foreach ($collines as $nomColline) {
                            Colline::updateOrCreate([
                                'zone_id' => $zone->id,
                                'nom' => $nomColline,
                            ]);
                            $nbCollines++;
                        }
                    }
                }
            }

            $this->command->info("Référentiel importé : {$nbProvinces} provinces, {$nbCommunes} communes, {$nbZones} zones, {$nbCollines} collines.");
        });
    }
}
