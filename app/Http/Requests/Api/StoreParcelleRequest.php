<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreParcelleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            /*
             * Caractéristiques
             */
            'nombre_pieds' => [
                'nullable',
                'integer',
                'min:0',
            ],

            'annee_mise_en_place' => [
                'nullable',
                'integer',
                'min:1900',
                'max:' . (date('Y') + 1),
            ],

            'surface_verger' => [
                'nullable',
                'string'
            ],

            'etat_verger' => [
                'nullable',
                'string',
                'max:255',
            ],

            'type' => [
                'nullable',
                'string',
                'max:255',
            ],

            /*
             * Localisation
             */
            'latitude' => [
                'nullable',
                'numeric',
                'between:-90,90',
            ],

            'longitude' => [
                'nullable',
                'numeric',
                'between:-180,180',
            ],

            'altitude' => [
                'nullable',
                'numeric',
                'between:-500,9000',
            ],

            'polygone' => [
                'nullable',
                'array',
            ],

            'polygone.*.latitude' => [
                'required_with:polygone',
                'numeric',
                'between:-90,90',
            ],

            'polygone.*.longitude' => [
                'required_with:polygone',
                'numeric',
                'between:-180,180',
            ],
            'polygone.*.altitude' => [
                'nullable',
                'numeric',
                'between:-5000,9000',
            ],

            'mode_positionnement' => [
                'nullable',
                Rule::in([
                    'automatique',
                    'manuel',
                ]),
            ],

            /*
             * Acquisition de la terre
             */
            'mode_acquisition' => [
                'nullable',
                'string',
                'max:255',
            ],

            /*
             * Pièce justificative
             */
            'piece_justificative' => [
                'nullable',
                'string',
                'max:255',
            ],

            /*
             * Photo de la pièce justificative
             */
            'piece_justificative_photo' => [
                'nullable',
                // 'image',
                // 'mimes:jpeg,jpg,png,webp',
                'max:10240', // 10 MB
            ],

            /*
             * Informations complémentaires
             */
            'notes' => [
                'nullable',
                'string',
            ],

            'autres_donnees' => [
                'nullable',
                'string',
            ],
        ];
    }
}
