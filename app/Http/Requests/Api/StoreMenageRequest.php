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
            'code_menage' => ['nullable', 'string', 'max:255', Rule::unique('menages', 'code_menage')->ignore($menageId)],
            'nom_chef_menage' => ['nullable', 'string', 'max:255'],
            'prenom_chef_menage' => ['nullable', 'string', 'max:255'],
            'telephone' => ['nullable', 'string', 'max:50'],
            'colline_id' => ['required', 'exists:collines,id'],
            'statut' => ['nullable', Rule::in(['a_faire', 'en_attente', 'termine'])],
        ];
    }
}
