<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ParcelleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'menage_id' => $this->menage_id,
            'nombre_pieds' => $this->nombre_pieds,
            'annee_mise_en_place' => $this->annee_mise_en_place,
            'etat_verger' => $this->etat_verger,
            'latitude' => $this->latitude !== null ? (float) $this->latitude : null,
            'longitude' => $this->longitude !== null ? (float) $this->longitude : null,
            'polygone' => $this->polygone,
            'mode_positionnement' => $this->mode_positionnement,
            'updated_at' => $this->updated_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
