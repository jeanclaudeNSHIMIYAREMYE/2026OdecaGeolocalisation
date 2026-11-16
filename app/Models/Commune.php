<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Commune extends Model
{
    use HasFactory;

    protected $fillable = [
        'province_id',
        'nom',
    ];

    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }

    public function zones(): HasMany
    {
        return $this->hasMany(Zone::class);
    }

    /**
     * Superviseurs communaux affectés via la table pivot commune_user.
     */
    public function superviseursCommunaux(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'commune_user')
            ->where('users.role', 'superviseur_communal')
            ->withTimestamps();
    }

    /**
     * Anciennes affectations via users.commune_id.
     */
    public function superviseursCommunauxLegacy(): HasMany
    {
        return $this->hasMany(User::class, 'commune_id')
            ->where('role', 'superviseur_communal');
    }
}
