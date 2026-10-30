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

        // Caractéristiques
        'nombre_pieds',
        'annee_mise_en_place',
        'surface_verger',
        'etat_verger',
        'type',
        "type_parcelle",
        // Localisation
        'latitude',
        'longitude',
        'altitude',
        'polygone',
        'mode_positionnement',

        // Propriété / acquisition
        'mode_acquisition',
        'piece_justificative',
        'piece_justificative_photo',

        // Informations complémentaires
        'notes',
        'autres_donnees',
    ];

    protected $casts = [
        'polygone' => 'array',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'altitude' => 'decimal:4',
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
