<?php

namespace App\Models;

use App\Models\Scopes\PorteeTerritorialeScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReponseQuestionnaire extends Model
{
    use HasFactory;

    protected $table = 'reponses_questionnaire';

    protected static function booted(): void
    {
        static::addGlobalScope(new PorteeTerritorialeScope('menage'));
    }

    protected $fillable = [
        'menage_id',
        //'parcelle_id',
        'question_id',
        'valeur',
    ];

    protected $casts = [
        'valeur' => 'array',
    ];

    public function menage(): BelongsTo
    {
        return $this->belongsTo(Menage::class);
    }

    public function parcelle(): BelongsTo
    {
        return $this->belongsTo(Parcelle::class);
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class, 'question_id');
    }
}
