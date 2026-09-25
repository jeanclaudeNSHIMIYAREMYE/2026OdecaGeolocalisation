<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ParcelleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,

            'menage_id' => $this->menage_id,

            /*
             * Caractéristiques
             */
            'nombre_pieds' => $this->nombre_pieds,

            'annee_mise_en_place' => $this->annee_mise_en_place,

            'surface_verger' => $this->surface_verger,

            'etat_verger' => $this->etat_verger,
            'type' => $this->type,

            /*
             * Localisation
             */
            'latitude' => $this->latitude !== null
                ? (float) $this->latitude
                : null,

            'longitude' => $this->longitude !== null
                ? (float) $this->longitude
                : null,
            'altitude' => $this->altitude !== null
    ? (float) $this->altitude
    : null,

            'polygone' => $this->polygone,

            'mode_positionnement' => $this->mode_positionnement,

            /*
             * Acquisition
             */
            'mode_acquisition' => $this->mode_acquisition,

            'piece_justificative' => $this->piece_justificative,

            /*
             * Photo
             */
            'piece_justificative_photo' => $this->piece_justificative_photo
                ? Storage::disk('public')->url(
                    $this->piece_justificative_photo
                )
                : null,

            /*
             * Informations complémentaires
             */
            'notes' => $this->notes,

            'autres_donnees' => $this->autres_donnees,

            /*
             * Dates
             */
            'updated_at' => $this->updated_at?->toIso8601String(),

            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
