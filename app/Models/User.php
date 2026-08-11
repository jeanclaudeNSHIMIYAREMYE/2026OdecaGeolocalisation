<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'role', 'province_id', 'commune_id', 'actif'])]
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

    public function estAdmin(): bool
    {
        return $this->role === 'admin';
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
     * Les enquêteurs n'ayant pas d'affectation fixe à une zone (n'importe
     * quel enquêteur peut intervenir sur n'importe quelle zone), ils
     * restent visibles à tous les superviseurs habilités à consulter
     * cette page — à affiner si une affectation nominative est ajoutée.
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
