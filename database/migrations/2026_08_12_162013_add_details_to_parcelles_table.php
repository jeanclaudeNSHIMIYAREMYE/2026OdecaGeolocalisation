<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parcelles', function (Blueprint $table) {

            // Mode d'acquisition
            $table->string('mode_acquisition')
                ->nullable()
                ->after('mode_positionnement');

            // Pièce justificative
            $table->string('piece_justificative')
                ->nullable()
                ->after('mode_acquisition');

            // Photo de la pièce justificative
            $table->string('piece_justificative_photo')
                ->nullable()
                ->after('piece_justificative');

            // Commentaire enquêteur
            $table->text('notes')
                ->nullable()
                ->after('piece_justificative_photo');

            // Autres données
            $table->text('autres_donnees')
                ->nullable()
                ->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('parcelles', function (Blueprint $table) {
            $table->dropColumn([
                'mode_acquisition',
                'piece_justificative',
                'piece_justificative_photo',
                'notes',
                'autres_donnees',
            ]);
        });
    }
};
