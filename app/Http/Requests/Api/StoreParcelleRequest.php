<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreParcelleRequest extends FormRequest
{
    /**
     * Autoriser la requête.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Préparer et normaliser les données avant validation.
     *
     * Par défaut : verger.
     */
    protected function prepareForValidation(): void
    {
        $typeParcelle = $this->input('type_parcelle');

        // Si le champ est absent, null ou vide :
        // attribuer automatiquement verger.
        if (
            $typeParcelle === null ||
            trim((string) $typeParcelle) === ''
        ) {
            $typeParcelle = 'verger';
        } else {
            // Normaliser la valeur reçue depuis Android.
            $typeParcelle = strtolower(trim((string) $typeParcelle));

            $typeParcelle = str_replace(
                ['-', ' '],
                '_',
                $typeParcelle
            );

            if ($typeParcelle === 'sousverger') {
                $typeParcelle = 'sous_verger';
            }
        }

        $this->merge([
            'type_parcelle' => $typeParcelle,
        ]);
    }

    /**
     * Règles de validation.
     */
    public function rules(): array
    {
        return [
            /*
            |--------------------------------------------------------------------------
            | Caractéristiques de la parcelle
            |--------------------------------------------------------------------------
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
                'numeric',
                'min:0',
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
            |--------------------------------------------------------------------------
            | Type de parcelle
            |--------------------------------------------------------------------------
            */

            'type_parcelle' => [
                'required',
                'string',
                Rule::in([
                    'verger',
                    'sous_verger',
                ]),
            ],

            /*
            |--------------------------------------------------------------------------
            | Localisation GPS
            |--------------------------------------------------------------------------
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
            |--------------------------------------------------------------------------
            | Acquisition de la terre
            |--------------------------------------------------------------------------
            */

            'mode_acquisition' => [
                'nullable',
                'string',
                'max:255',
            ],

            /*
            |--------------------------------------------------------------------------
            | Pièce justificative
            |--------------------------------------------------------------------------
            */

            'piece_justificative' => [
                'nullable',
                'string',
                'max:255',
            ],

            /*
            |--------------------------------------------------------------------------
            | Photo justificative
            |--------------------------------------------------------------------------
            */

            'piece_justificative_photo' => [
                'nullable',
                'file',
                'mimes:jpeg,jpg,png,webp',
                'max:10240',
            ],

            /*
            |--------------------------------------------------------------------------
            | Informations complémentaires
            |--------------------------------------------------------------------------
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

    /**
     * Messages personnalisés.
     */
    public function messages(): array
    {
        return [
            'type_parcelle.required' =>
                'Le type de parcelle est obligatoire.',

            'type_parcelle.in' =>
                'Le type de parcelle doit être verger ou sous_verger.',

            'nombre_pieds.integer' =>
                'Le nombre de pieds doit être un entier.',

            'annee_mise_en_place.max' =>
                'L’année de mise en place ne peut pas dépasser l’année prochaine.',

            'latitude.between' =>
                'La latitude doit être comprise entre -90 et 90.',

            'longitude.between' =>
                'La longitude doit être comprise entre -180 et 180.',

            'piece_justificative_photo.mimes' =>
                'La photo doit être au format JPEG, JPG, PNG ou WEBP.',

            'piece_justificative_photo.max' =>
                'La photo ne doit pas dépasser 10 Mo.',
        ];
    }
}
