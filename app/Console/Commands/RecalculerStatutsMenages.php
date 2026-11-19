<?php

namespace App\Console\Commands;

use App\Models\Menage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RecalculerStatutsMenages extends Command
{
    protected $signature = 'menages:recalculer-statuts
                            {--dry-run : Afficher les corrections sans modifier la base de donnees}
                            {--show-changes : Afficher le detail de chaque correction}';

    protected $description = 'Recalculer les statuts des menages selon le questionnaire et les parcelles enregistrees';

    public function handle(): int
    {
        $simulation = (bool) $this->option('dry-run');
        $afficherCorrections = (bool) $this->option('show-changes');
        $total = 0;
        $modifies = 0;
        $parStatut = [];

        $questionnaire = DB::table('questionnaire_versions')
            ->where('actif', true)
            ->first();

        $questions = $questionnaire
            ? DB::table('questions')
                ->where('questionnaire_version_id', $questionnaire->id)
                ->get()
            : collect();

        Menage::withoutGlobalScopes()
            ->select(['id', 'code_menage', 'statut'])
            ->withCount('parcelles')
            ->with([
                'reponses' => fn ($query) => $query
                    ->withoutGlobalScopes()
                    ->select(['id', 'menage_id', 'question_id', 'valeur']),
            ])
            ->orderBy('id')
            ->chunkById(1000, function ($menages) use (
                &$total,
                &$modifies,
                &$parStatut,
                $simulation,
                $afficherCorrections,
                $questions
            ): void {
                foreach ($menages as $menage) {
                    $total++;
                    $ancienStatut = $menage->statut;
                    $nouveauStatut = $menage->calculerStatutAvecContexte(
                        $questions,
                        $menage->reponses,
                        (int) $menage->parcelles_count
                    );

                    $parStatut[$nouveauStatut] = ($parStatut[$nouveauStatut] ?? 0) + 1;

                    if ($ancienStatut === $nouveauStatut) {
                        continue;
                    }

                    $modifies++;

                    if ($simulation) {
                        if ($afficherCorrections) {
                            $this->line(sprintf(
                                '%s [%s] : %s -> %s',
                                $menage->id,
                                $menage->code_menage,
                                $ancienStatut ?: 'null',
                                $nouveauStatut
                            ));
                        }

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
