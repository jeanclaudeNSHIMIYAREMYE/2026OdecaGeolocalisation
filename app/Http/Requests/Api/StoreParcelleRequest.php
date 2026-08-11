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
            'nombre_pieds' => ['nullable', 'integer', 'min:0'],
            'annee_mise_en_place' => ['nullable', 'integer', 'min:1900', 'max:'.(date('Y') + 1)],
            'etat_verger' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'polygone' => ['nullable', 'array'],
            'polygone.*.latitude' => ['required_with:polygone', 'numeric', 'between:-90,90'],
            'polygone.*.longitude' => ['required_with:polygone', 'numeric', 'between:-180,180'],
            'mode_positionnement' => ['nullable', Rule::in(['automatique', 'manuel'])],
        ];
    }
}
