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
            'type_menage' => $this->type_menage,
            'nom_chef_menage' => $this->nom_chef_menage,
            'prenom_chef_menage' => $this->prenom_chef_menage,
            'telephone' => $this->telephone,
            'cni' => $this->cni,

            'photo_proprietaire' => $this->photo_proprietaire
                ? asset('storage/' . $this->photo_proprietaire)
                : null,

            'photo_piece_identification' => $this->photo_piece_identification
                ? asset('storage/' . $this->photo_piece_identification)
                : null,

            'colline_id' => $this->colline_id,

            'colline' => $this->whenLoaded('colline', function () {
                $colline = $this->colline;
                $zone = $colline->zone;
                $commune = $zone?->commune;
                $province = $commune?->province;

                return [
                    'id' => $colline->id,
                    'nom' => $colline->nom,
                    'zone' => $zone ? [
                        'id' => $zone->id,
                        'nom' => $zone->nom,
                        'commune' => $commune ? [
                            'id' => $commune->id,
                            'nom' => $commune->nom,
                            'province' => $province ? [
                                'id' => $province->id,
                                'nom' => $province->nom,
                            ] : null,
                        ] : null,
                    ] : null,
                ];
            }),

            'statut' => $this->statut,
            'source' => $this->source,
            'enqueteur_id' => $this->enqueteur_id,

            'date_derniere_activite' =>
                $this->date_derniere_activite?->toIso8601String(),

            // Réponses et questions associées au ménage
            'reponses' => $this->whenLoaded('reponses', function () {
                return $this->reponses->map(function ($reponse) {
                    $question = $reponse->relationLoaded('question')
                        ? $reponse->question
                        : null;

                    return [
                        'id' => $reponse->id,
                        'menage_id' => $reponse->menage_id,
                        'parcelle_id' => $reponse->parcelle_id,
                        'question_id' => $reponse->question_id,
                        'valeur' => $reponse->valeur,

                        'question' => $question ? [
                            'id' => $question->id,
                            'code' => $question->code,
                            'libelle' => $question->libelle,
                        ] : null,

                        'created_at' =>
                            $reponse->created_at?->toIso8601String(),

                        'updated_at' =>
                            $reponse->updated_at?->toIso8601String(),
                    ];
                })->values();
            }),

            'parcelles' => ParcelleResource::collection(
                $this->whenLoaded('parcelles')
            ),

            'updated_at' => $this->updated_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
