<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'name',
    'email',
    'password',
    'role',
    'province_id',
    'commune_id',
    'actif',
    'is_super_admin',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
 protected function casts(): array
{
    return [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'actif' => 'boolean',
        'is_super_admin' => 'boolean',
    ];
}


    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }

    public function commune(): BelongsTo
    {
        return $this->belongsTo(Commune::class);
    }

    public function menagesAssignes(): HasMany
    {
        return $this->hasMany(Menage::class, 'enqueteur_id');
    }

    /**
     * Collines sur lesquelles un enquêteur est autorisé à intervenir.
     * Un enquêteur peut être affecté à une ou plusieurs collines,
     * potentiellement réparties sur plusieurs zones/communes.
     */
    public function estSuperAdmin(): bool
{
    return $this->is_super_admin === true;
}
    public function collines(): BelongsToMany
    {
        return $this->belongsToMany(Colline::class, 'colline_user')->withTimestamps();
    }

    public function estAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function estEnqueteur(): bool
    {
        return $this->role === 'enqueteur';
    }

    public function estSuperviseur(): bool
    {
        return in_array($this->role, [
            'superviseur_national',
            'superviseur_provincial',
            'superviseur_communal',
        ], true);
    }

    /**
     * Restreint la liste des comptes visibles pour la page "Gestion des
     * utilisateurs" selon la portée territoriale du superviseur connecté.
     * Les enquêteurs restent visibles à tous les superviseurs habilités à
     * consulter cette page, indépendamment de leurs collines d'affectation
     * (celles-ci ne servent qu'à restreindre leur périmètre de saisie).
     */
    public function scopeVisiblePour(\Illuminate\Database\Eloquent\Builder $query, self $utilisateur): \Illuminate\Database\Eloquent\Builder
    {
        return match ($utilisateur->role) {
            'admin', 'superviseur_national' => $query,

            'superviseur_provincial' => $query->where(
                fn ($q) => $q->where('province_id', $utilisateur->province_id)->orWhere('role', 'enqueteur')
            ),

            'superviseur_communal' => $query->where(
                fn ($q) => $q->where('commune_id', $utilisateur->commune_id)->orWhere('role', 'enqueteur')
            ),

            default => $query->whereRaw('1 = 0'),
        };
    }


}
