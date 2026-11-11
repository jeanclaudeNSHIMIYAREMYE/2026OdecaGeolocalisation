<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
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

    public function communes(): BelongsToMany
    {
        return $this->belongsToMany(Commune::class, 'commune_user')->withTimestamps();
    }

    public function communesIds(): array
    {
        $ids = $this->communes()->pluck('communes.id')->map(fn ($id) => (int) $id)->all();

        if (count($ids) === 0 && $this->commune_id) {
            $ids[] = (int) $this->commune_id;
        }

        return array_values(array_unique($ids));
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
    public function collines(): BelongsToMany
    {
        return $this->belongsToMany(Colline::class, 'colline_user')->withTimestamps();
    }

    public function estSuperAdmin(): bool
    {
        return $this->is_super_admin === true;
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
     */
    public function scopeVisiblePour(Builder $query, self $utilisateur): Builder
    {
        return match ($utilisateur->role) {
            'admin', 'superviseur_national' => $query,

            'superviseur_provincial' => $query->where(function ($q) use ($utilisateur) {
                $q->where('province_id', $utilisateur->province_id)
                    ->orWhereHas('commune', function ($commune) use ($utilisateur) {
                        $commune->where('province_id', $utilisateur->province_id);
                    })
                    ->orWhereHas('communes', function ($commune) use ($utilisateur) {
                        $commune->where('province_id', $utilisateur->province_id);
                    })
                    ->orWhere(function ($q) use ($utilisateur) {
                        $q->where('role', 'enqueteur')
                            ->whereHas('collines.zone.commune', function ($commune) use ($utilisateur) {
                                $commune->where('province_id', $utilisateur->province_id);
                            });
                    });
            }),

            'superviseur_communal' => $query->where(function ($q) use ($utilisateur) {
                $communeIds = $utilisateur->communesIds();
                $q->whereIn('commune_id', $communeIds)
                    ->orWhereHas('communes', fn ($commune) => $commune->whereIn('communes.id', $communeIds))
                    ->orWhere(function ($q) use ($communeIds) {
                        $q->where('role', 'enqueteur')
                            ->whereHas('collines.zone', function ($zone) use ($communeIds) {
                                $zone->whereIn('commune_id', $communeIds);
                            });
                    });
            }),

            default => $query->whereRaw('1 = 0'),
        };
    }
}