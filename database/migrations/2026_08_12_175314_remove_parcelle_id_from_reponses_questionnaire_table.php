
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('reponses_questionnaire')) {
            return;
        }

        if (Schema::hasColumn('reponses_questionnaire', 'parcelle_id')) {

            // Supprimer d'abord l'index unique qui utilise parcelle_id.
            DB::statement(
                'DROP INDEX IF EXISTS reponses_questionnaire_menage_id_parcelle_id_question_id_unique'
            );

            // Supprimer la clé étrangère si elle existe.
            $foreignKeys = DB::select(
                "PRAGMA foreign_key_list('reponses_questionnaire')"
            );

            foreach ($foreignKeys as $foreignKey) {
                if ($foreignKey->from === 'parcelle_id') {
                    Schema::table('reponses_questionnaire', function (Blueprint $table) {
                        $table->dropForeign(['parcelle_id']);
                    });
                    break;
                }
            }

            // Supprimer la colonne après ses dépendances.
            Schema::table('reponses_questionnaire', function (Blueprint $table) {
                $table->dropColumn('parcelle_id');
            });
        }

        // Recréer un index unique adapté à la nouvelle structure.
        $indexes = DB::select(
            "PRAGMA index_list('reponses_questionnaire')"
        );

        $indexExists = false;

        foreach ($indexes as $index) {
            if ($index->name === 'reponses_questionnaire_menage_id_question_id_unique') {
                $indexExists = true;
                break;
            }
        }

        if (!$indexExists) {
            Schema::table('reponses_questionnaire', function (Blueprint $table) {
                $table->unique(
                    ['menage_id', 'question_id'],
                    'reponses_questionnaire_menage_id_question_id_unique'
                );
            });
        }
    }

    public function down(): void
    {
        if (
            Schema::hasTable('reponses_questionnaire') &&
            !Schema::hasColumn('reponses_questionnaire', 'parcelle_id')
        ) {
            Schema::table('reponses_questionnaire', function (Blueprint $table) {
                $table->foreignId('parcelle_id')
                    ->nullable()
                    ->constrained('parcelles')
                    ->cascadeOnDelete();
            });

            Schema::table('reponses_questionnaire', function (Blueprint $table) {
                $table->dropUnique(
                    'reponses_questionnaire_menage_id_question_id_unique'
                );

                $table->unique(
                    ['menage_id', 'parcelle_id', 'question_id'],
                    'reponses_questionnaire_menage_id_parcelle_id_question_id_unique'
                );
            });
        }
    }
};
