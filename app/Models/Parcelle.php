<?php

namespace App\Models;

use App\Models\Scopes\PorteeTerritorialeScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Parcelle extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::addGlobalScope(new PorteeTerritorialeScope('menage'));
    }

    protected $fillable = [
        'menage_id',
        'nombre_pieds',
        'annee_mise_en_place',
        'etat_verger',
        'latitude',
        'longitude',
        'polygone',
        'mode_positionnement',
    ];

    protected $casts = [
        'polygone' => 'array',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
    ];

    public function menage(): BelongsTo
    {
        return $this->belongsTo(Menage::class);
    }

    public function reponses(): HasMany
    {
        return $this->hasMany(ReponseQuestionnaire::class);
    }
}
