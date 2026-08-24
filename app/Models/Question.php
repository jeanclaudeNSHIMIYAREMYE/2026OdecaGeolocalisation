<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Question extends Model
{
    use HasFactory;

    protected $fillable = [
        'questionnaire_version_id',
        'code',
        'libelle',
        'section',
        'type',
        'options',
        'obligatoire',
        'autre_option',
        'condition',
        'termine_si',
        'ordre',
    ];

    protected $casts = [
        'options' => 'array',
        'condition' => 'array',
        'obligatoire' => 'boolean',
        'autre_option' => 'boolean',
    ];

    public function questionnaireVersion(): BelongsTo
    {
        return $this->belongsTo(QuestionnaireVersion::class);
    }
}
