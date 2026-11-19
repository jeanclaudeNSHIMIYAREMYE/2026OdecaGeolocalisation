<?php

namespace App\Console\Commands;

use App\Models\Menage;
use Illuminate\Console\Command;

class RecalculerStatutsMenages extends Command
{
    protected $signature = 'menages:recalculer-statuts
                            {--dry-run : Afficher les corrections sans modifier la base de donnees}';

    protected $description = 'Recalculer les statuts des menages selon le questionnaire et les parcelles enregistrees';

    public function handle(): int
    {
        $simulation = (bool) $this->option('dry-run');
        $total = 0;
        $modifies = 0;
        $parStatut = [];

        Menage::withoutGlobalScopes()
            ->select(['id', 'code_menage', 'statut'])
            ->orderBy('id')
            ->chunkById(250, function ($menages) use (&$total, &$modifies, &$parStatut, $simulation): void {
                foreach ($menages as $menage) {
                    $total++;
                    $ancienStatut = $menage->statut;
                    $nouveauStatut = $menage->calculerStatut();

                    $parStatut[$nouveauStatut] = ($parStatut[$nouveauStatut] ?? 0) + 1;

                    if ($ancienStatut === $nouveauStatut) {
                        continue;
                    }

                    $modifies++;

                    if ($simulation) {
                        $this->line(sprintf(
                            '%s [%s] : %s -> %s',
                            $menage->id,
                            $menage->code_menage,
                            $ancienStatut ?: 'null',
                            $nouveauStatut
                        ));

                        continue;
                    }

                    $menage->updateQuietly(['statut' => $nouveauStatut]);
                }
            });

        $this->newLine();
        $this->info($simulation ? 'Simulation terminee.' : 'Recalcul termine.');
        $this->line("Menages verifies : {$total}");
        $this->line("Statuts corriges : {$modifies}");

        foreach ($parStatut as $statut => $nombre) {
            $this->line("- {$statut} : {$nombre}");
        }

        return self::SUCCESS;
    }
}
