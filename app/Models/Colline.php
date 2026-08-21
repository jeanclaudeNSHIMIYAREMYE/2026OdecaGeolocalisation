<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Colline extends Model
{
    use HasFactory;

    protected $fillable = ['zone_id', 'nom'];

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function menages(): HasMany
    {
        return $this->hasMany(Menage::class);
    }

    public function enqueteurs(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'colline_user')->withTimestamps();
    }
}
