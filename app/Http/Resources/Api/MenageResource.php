<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MenageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code_menage' => $this->code_menage,
            'nom_chef_menage' => $this->nom_chef_menage,
            'prenom_chef_menage' => $this->prenom_chef_menage,
            'telephone' => $this->telephone,
            'colline_id' => $this->colline_id,
            'colline' => $this->whenLoaded('colline', fn () => [
                'id' => $this->colline->id,
                'nom' => $this->colline->nom,
            ]),
            'statut' => $this->statut,
            'source' => $this->source,
            'enqueteur_id' => $this->enqueteur_id,
            'date_derniere_activite' => $this->date_derniere_activite?->toIso8601String(),
            'parcelles' => ParcelleResource::collection($this->whenLoaded('parcelles')),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
