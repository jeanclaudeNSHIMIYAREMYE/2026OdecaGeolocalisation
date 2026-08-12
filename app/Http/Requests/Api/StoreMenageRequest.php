<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMenageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $menageId = $this->route('menage')?->id;

        return [
            'code_menage' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('menages', 'code_menage')->ignore($menageId),
            ],

            'type_menage' => [
                'required',
                Rule::in(['personel', 'association']),
            ],

            'nom_chef_menage' => [
                'nullable',
                'string',
                'max:255',
            ],

            'prenom_chef_menage' => [
                'nullable',
                'string',
                'max:255',
            ],

            'telephone' => [
                'nullable',
                'string',
                'max:50',
            ],

            'cni' => [
                'nullable',
                'string',
                'max:100',
            ],

            'photo_proprietaire' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],

            'photo_piece_identification' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],

            'colline_id' => [
                'required',
                'exists:collines,id',
            ],

            'statut' => [
                'nullable',
                Rule::in([
                    'a_faire',
                    'en_attente',
                    'termine',
                ]),
            ],
        ];
    }
}
