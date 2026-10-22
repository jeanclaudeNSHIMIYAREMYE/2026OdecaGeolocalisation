<?php

namespace App\Models;

use App\Models\Scopes\PorteeTerritorialeScope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

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
        return $this->hasMany(ReponseQuestionnaire::class, 'menage_id');
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
            fn (Builder $q) => $q->where(
                'province_id',
                $utilisateur->province_id
            )
        ),

        'superviseur_communal' => $query->whereHas(
            'colline.zone',
            fn (Builder $q) => $q->where(
                'commune_id',
                $utilisateur->commune_id
            )
        ),

        'enqueteur' => $query->where(
            function (Builder $q) use ($utilisateur) {
                $q->whereHas(
                    'colline.enqueteurs',
                    fn (Builder $collineQuery) =>
                        $collineQuery->where('users.id', $utilisateur->id)
                )->orWhere(
                    'enqueteur_id',
                    $utilisateur->id
                );
            }
        ),

        default => $query->whereRaw('1 = 0'),
    };
}







/**
 * Récupère la valeur d'une réponse à partir du code de la question.
 *
 * Exemple :
 * valeurReponse('possede_vergers_cafe')
 */
public function valeurReponse(string $codeQuestion): mixed
{
    // Rechercher l'identifiant de la question à partir de son code.
    $questionId = DB::table('questions')
        ->where('code', $codeQuestion)
        ->value('id');

    // La question n'existe pas ou n'a pas encore de réponse.
    if ($questionId === null) {
        return null;
    }

    // Récupérer la réponse associée à ce ménage et à cette question.
    return $this->reponses()
        ->where('question_id', $questionId)
        ->value('valeur');
}










   
/**
 * Récupère le nombre de parcelles déclaré dans le questionnaire.
 */
public function nombreVergersDeclares(): ?int
{
    $valeur = $this->valeurReponse('effectif_vergers');

    return is_numeric($valeur) && (int) $valeur >= 0
        ? (int) $valeur
        : null;
}

/**
 * Vérifie si toutes les questions obligatoires du questionnaire actif
 * ont reçu une réponse, en tenant compte des questions conditionnelles.
 */
public function questionnaireEstComplet(): bool
{
    $questionnaire = DB::table('reponses_questionnaire')
        ->where('actif', true)
        ->first();

    if (!$questionnaire) {
        return false;
    }

    // La réponse Non termine le questionnaire selon la règle métier.
    if ($this->valeurReponse('possede_vergers_cafe') === 'Non') {
        return true;
    }

    $questions = DB::table('questions')
        ->where('questionnaire_id', $questionnaire->id)
        ->where('obligatoire', true)
        ->get();

    if ($questions->isEmpty()) {
        return false;
    }

    foreach ($questions as $question) {
        // Question conditionnelle : nom de la coopérative.
        if ($question->code === 'nom_cooperative') {
            if (
                $this->valeurReponse('appartenance_cooperative') !== 'Oui'
            ) {
                continue;
            }
        }

        // Si la réponse obligatoire manque ou est vide,
        // le questionnaire est incomplet.
        $reponse = $this->reponses()
            ->where('question_id', $question->id)
            ->value('valeur');

        if ($reponse === null || trim((string) $reponse) === '') {
            return false;
        }
    }

    return true;
}

/**
 * Calcule le statut réel du ménage.
 */
public function calculerStatut(): string
{
    $nombreParcelles = $this->parcelles()->count();
    $aDesReponses = $this->reponses()->exists();

    // Aucune activité : ménage à faire.
    if (!$aDesReponses && $nombreParcelles === 0) {
        return 'a_faire';
    }

    // Le questionnaire n'est pas encore terminé.
    if (!$this->questionnaireEstComplet()) {
        return 'deja_commence';
    }

    // Le ménage ne possède pas de vergers : questionnaire terminé.
    if ($this->valeurReponse('possede_vergers_cafe') === 'Non') {
        return 'termine';
    }

    $declares = $this->nombreVergersDeclares();

    // Impossible de confirmer la fin sans connaître le nombre déclaré.
    if ($declares === null) {
        return 'deja_commence';
    }

    // Toutes les parcelles déclarées doivent être enregistrées.
    if ($nombreParcelles >= $declares) {
        return 'termine';
    }

    return 'deja_commence';
}

/**
 * Met à jour le statut uniquement si nécessaire.
 */
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

/**
 * Conserve cette méthode pour la compatibilité avec les contrôleurs.
 * Elle synchronise désormais tous les statuts.
 */
public function verifierStatutTermine(): void
{
    $this->synchroniserStatut();
}






}
