
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('reponses_questionnaire')) {
            return;
        }

        if (Schema::hasColumn('reponses_questionnaire', 'parcelle_id')) {

            foreach (['parcelle_id', 'menage_id', 'question_id'] as $column) {
                $foreignKeyExists = collect(Schema::getForeignKeys('reponses_questionnaire'))
                    ->contains(fn ($foreignKey) => in_array($column, $foreignKey['columns'], true));

                if ($foreignKeyExists) {
                    Schema::table('reponses_questionnaire', function (Blueprint $table) use ($column) {
                        $table->dropForeign([$column]);
                    });
                }
            }

            if (Schema::hasIndex(
                'reponses_questionnaire',
                'reponses_questionnaire_menage_id_parcelle_id_question_id_unique'
            )) {
                Schema::table('reponses_questionnaire', function (Blueprint $table) {
                    $table->dropUnique(
                        'reponses_questionnaire_menage_id_parcelle_id_question_id_unique'
                    );
                });
            }

            // Supprimer la colonne après ses dépendances.
            Schema::table('reponses_questionnaire', function (Blueprint $table) {
                $table->dropColumn('parcelle_id');
            });

            Schema::table('reponses_questionnaire', function (Blueprint $table) {
                $table->foreign('menage_id')->references('id')->on('menages')->cascadeOnDelete();
                $table->foreign('question_id')->references('id')->on('questions')->cascadeOnDelete();
            });
        }

        // Recréer un index unique adapté à la nouvelle structure.
        if (!Schema::hasIndex(
            'reponses_questionnaire',
            'reponses_questionnaire_menage_id_question_id_unique'
        )) {
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
