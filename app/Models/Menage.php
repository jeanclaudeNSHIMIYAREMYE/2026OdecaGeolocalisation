<?php

namespace App\Models;

use App\Models\Scopes\PorteeTerritorialeScope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Menage extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::addGlobalScope(new PorteeTerritorialeScope);
    }

    protected $fillable = [
        'code_menage',
        'type_menage',
        'nom_chef_menage',
        'prenom_chef_menage',
        'telephone',
        'photo_proprietaire',
        'photo_piece_identification',
        'cni',
        'colline_id',
        'statut',
        'source',
        'enqueteur_id',
        'cree_par_id',
        'date_derniere_activite',
    ];

    protected $casts = [
        'date_derniere_activite' => 'datetime',
    ];

    public function colline(): BelongsTo
    {
        return $this->belongsTo(Colline::class);
    }

    public function enqueteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'enqueteur_id');
    }

    public function parcelles(): HasMany
    {
        return $this->hasMany(Parcelle::class);
    }

    public function reponses(): HasMany
    {
        return $this->hasMany(ReponseQuestionnaire::class);
    }

    /**
     * Restreint la requête aux ménages visibles pour l'utilisateur donné,
     * selon son rôle et sa portée territoriale (province/commune).
     * Appliqué au niveau back-end pour garantir qu'aucune donnée hors
     * périmètre ne soit accessible, même via manipulation du front-end.
     */
    public function scopeVisiblePour(Builder $query, User $utilisateur): Builder
    {
        return match ($utilisateur->role) {
            'admin', 'superviseur_national' => $query,

            'superviseur_provincial' => $query->whereHas(
                'colline.zone.commune',
                fn(Builder $q) => $q->where('province_id', $utilisateur->province_id)
            ),

            'superviseur_communal' => $query->whereHas(
                'colline.zone',
                fn(Builder $q) => $q->where('commune_id', $utilisateur->commune_id)
            ),

            // Un enquêteur voit tous les ménages des collines qui lui sont
            // affectées (table pivot colline_user), plus tout ménage
            // qui lui serait assigné individuellement en dehors de ses
            // collines affectées.
            /*'enqueteur' => $query->where(
                fn (Builder $q) => $q->whereHas(
                    'colline.enqueteurs',
                    fn (Builder $q) => $q->where('users.id', $utilisateur->id)
                )->orWhere('enqueteur_id', $utilisateur->id)
            ),*/

            'enqueteur' => $query->whereHas(
                'colline.enqueteurs',
                fn(Builder $q) =>
                $q->where('users.id', $utilisateur->id)
            ),

            default => $query->whereRaw('1 = 0'),
        };
    }

    /*public function verifierStatutTermine(): void
    {
        $aDesParcelles = $this->parcelles()->exists();

        $aDesReponses = $this->reponses()->exists();

        if ($aDesParcelles && $aDesReponses) {
            $this->update([
                'statut' => 'termine',
                'date_derniere_activite' => now(),
            ]);
        }
    }*/

    /*public function synchroniserStatut(): void
    {
        $aDesParcelles = $this->parcelles()->exists();
        $aDesReponses = $this->reponses()->exists();

        $statut = match (true) {
            $aDesParcelles && $aDesReponses => 'termine',
            $aDesParcelles || $aDesReponses => 'en_attente',
            default => 'a_faire',
        };

        if ($statut !== $this->statut) {
            $this->update([
                'statut' => $statut,
                'date_derniere_activite' => now(),
            ]);
        }
    }*/

    /**
     * Lit la valeur d'une réponse du questionnaire à partir du code de la question.
     * Gère les valeurs stockées en scalaire ou en JSON ({"valeur": ...}).
     */
    protected function valeurReponse(string $codeQuestion): mixed
    {
        $reponse = $this->reponses()
            ->whereHas('question', fn(Builder $q) => $q->where('code', $codeQuestion))
            ->first();

        if (! $reponse) {
            return null;
        }

        $valeur = $reponse->valeur;

        if (is_string($valeur)) {
            $decode = json_decode($valeur, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $valeur = $decode;
            }
        }

        if (is_array($valeur)) {
            $valeur = $valeur['valeur'] ?? null;
        }

        return $valeur;
    }

    /**
     * Nombre de vergers déclarés dans le questionnaire (null si pas encore répondu).
     */
    public function nombreVergersDeclares(): ?int
    {
        $valeur = $this->valeurReponse('effectif_vergers');

        return is_numeric($valeur) ? (int) $valeur : null;
    }

    public function calculerStatut(): string
    {
        $nombreParcelles = $this->parcelles()->count();
        $aDesReponses = $this->reponses()->exists();

        // Le ménage a répondu "Non" à "Possédez-vous des vergers de café ?" :
        // le questionnaire s'arrête là, aucune parcelle n'est attendue.
        if ($this->valeurReponse('possede_vergers_cafe') === 'Non') {
            return 'termine';
        }

        $declares = $this->nombreVergersDeclares();

        // Terminé uniquement quand toutes les parcelles déclarées sont enregistrées.
        if ($aDesReponses && $declares !== null && $nombreParcelles >= $declares) {
            return 'termine';
        }

        // Travail commencé mais incomplet (parcelles < vergers déclarés,
        // ou questionnaire rempli sans parcelles, ou parcelles sans questionnaire).
        if ($nombreParcelles > 0 || $aDesReponses) {
            return 'en_attente';
        }

        return 'a_faire';
    }

    public function synchroniserStatut(): void
    {
        $statut = $this->calculerStatut();

        if ($statut !== $this->statut) {
            $this->update([
                'statut' => $statut,
                'date_derniere_activite' => now(),
            ]);
        }
    }

    public function verifierStatutTermine(): void
    {
        if ($this->calculerStatut() === 'termine' && $this->statut !== 'termine') {
            $this->update([
                'statut' => 'termine',
                'date_derniere_activite' => now(),
            ]);
        }
    }
}
