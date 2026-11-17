<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreParcelleRequest;
use App\Http\Resources\Api\ParcelleResource;
use App\Models\Menage;
use App\Models\Parcelle;
use App\Models\Question;
use App\Models\ReponseQuestionnaire;
use App\Support\AccesTerritorial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ParcelleController extends Controller
{
    /**
     * Afficher toutes les parcelles d'un ménage.
     */
    public function index(Menage $menage)
    {
        AccesTerritorial::verifierMenage(
            request()->user(),
            (int) $menage->id
        );

        $parcelles = $menage->parcelles()
            ->orderByDesc('updated_at')
            ->get();

        return ParcelleResource::collection($parcelles);
    }

    /**
     * Enregistrer une nouvelle parcelle.
     *
     * Règles :
     * - Verger : maximum égal au nombre déclaré dans le questionnaire.
     * - Sous-verger : un seul par ménage.
     */
    public function store(
        StoreParcelleRequest $request,
        Menage $menage
    ) {
        AccesTerritorial::verifierMenage(
            $request->user(),
            (int) $menage->id
        );

        $data = $request->validated();

        $type = $data['type_parcelle'] ?? null;

        $this->verifierTypeParcelle($type);

        $cheminPhoto = null;

        try {
            $parcelle = DB::transaction(function () use (
                $request,
                $menage,
                $data,
                $type,
                &$cheminPhoto
            ) {
                /*
                 * Verrouiller le ménage pour éviter
                 * les créations simultanées dépassant la limite.
                 */
                $menageVerrouille = Menage::query()
                    ->whereKey($menage->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                /*
                 * Vérifier le nombre de parcelles autorisées.
                 */
                $this->verifierLimiteParcelle(
                    $menageVerrouille,
                    $type
                );

                /*
                 * Enregistrer la photo justificative.
                 */
                if ($request->hasFile('piece_justificative_photo')) {
                    $cheminPhoto = $request
                        ->file('piece_justificative_photo')
                        ->store(
                            'parcelles/pieces-justificatives',
                            'public'
                        );

                    $data['piece_justificative_photo'] = $cheminPhoto;
                }

                /*
                 * Créer la parcelle.
                 */
                $nouvelleParcelle = $menageVerrouille
                    ->parcelles()
                    ->create($data);

                /*
                 * Mettre à jour l'activité du ménage.
                 */
                $champsMenage = [
                    'date_derniere_activite' => now(),
                ];

                if ($request->user()) {
                    $champsMenage['enqueteur_id'] =
                        $request->user()->id;
                }

                $menageVerrouille->update($champsMenage);

                $menageVerrouille->verifierStatutTermine();

                return $nouvelleParcelle;
            });

        } catch (\Throwable $e) {
            /*
             * Supprimer la photo si la transaction échoue.
             */
            if ($cheminPhoto) {
                Storage::disk('public')->delete($cheminPhoto);
            }

            throw $e;
        }

        return (new ParcelleResource($parcelle->fresh()))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Afficher une parcelle.
     */
    public function show(Parcelle $parcelle)
    {
        AccesTerritorial::verifierMenage(
            request()->user(),
            (int) $parcelle->menage_id
        );

        return new ParcelleResource($parcelle);
    }

    /**
     * Modifier une parcelle existante.
     */
    public function update(
        StoreParcelleRequest $request,
        Parcelle $parcelle
    ) {
        $menage = AccesTerritorial::verifierMenage(
            $request->user(),
            (int) $parcelle->menage_id
        );

        $data = $request->validated();

        /*
         * Empêcher le déplacement d'une parcelle
         * vers un autre ménage.
         */
        unset($data['menage_id']);

        /*
         * Conserver le type actuel si aucun nouveau type
         * n'est envoyé par le formulaire.
         */
        $type = $data['type_parcelle']
            ?? $parcelle->type_parcelle;

        $this->verifierTypeParcelle($type);

        $anciennePhoto = $parcelle->piece_justificative_photo;
        $nouvellePhoto = null;

        try {
            $parcelleModifiee = DB::transaction(function () use (
                $request,
                $parcelle,
                $menage,
                $data,
                $type,
                &$nouvellePhoto
            ) {
                /*
                 * Verrouiller le ménage.
                 */
                $menageVerrouille = Menage::query()
                    ->whereKey($menage->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                /*
                 * Verrouiller la parcelle.
                 */
                $parcelleVerrouillee = Parcelle::query()
                    ->whereKey($parcelle->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                /*
                 * Vérifier la limite en excluant
                 * la parcelle actuellement modifiée.
                 */
                $this->verifierLimiteParcelle(
                    $menageVerrouille,
                    $type,
                    (int) $parcelleVerrouillee->id
                );

                /*
                 * Enregistrer une nouvelle photo si elle existe.
                 */
                if ($request->hasFile('piece_justificative_photo')) {
                    $nouvellePhoto = $request
                        ->file('piece_justificative_photo')
                        ->store(
                            'parcelles/pieces-justificatives',
                            'public'
                        );

                    $data['piece_justificative_photo'] =
                        $nouvellePhoto;
                }

                /*
                 * Mettre à jour la parcelle.
                 */
                $parcelleVerrouillee->update($data);

                /*
                 * Mettre à jour l'activité du ménage.
                 */
                $champsMenage = [
                    'date_derniere_activite' => now(),
                ];

                if ($request->user()) {
                    $champsMenage['enqueteur_id'] =
                        $request->user()->id;
                }

                $menageVerrouille->update($champsMenage);

                $menageVerrouille->verifierStatutTermine();

                return $parcelleVerrouillee->fresh();
            });

        } catch (\Throwable $e) {
            /*
             * En cas d'échec, supprimer uniquement
             * la nouvelle photo.
             */
            if ($nouvellePhoto) {
                Storage::disk('public')->delete($nouvellePhoto);
            }

            throw $e;
        }

        /*
         * Supprimer l'ancienne photo seulement après
         * la réussite de la modification.
         */
        if (
            $nouvellePhoto
            && $anciennePhoto
            && $anciennePhoto !== $nouvellePhoto
        ) {
            Storage::disk('public')->delete($anciennePhoto);
        }

        return new ParcelleResource($parcelleModifiee);
    }

    /**
     * Supprimer une parcelle.
     */
    public function destroy(
        Request $request,
        Parcelle $parcelle
    ) {
        $menage = AccesTerritorial::verifierMenage(
            $request->user(),
            (int) $parcelle->menage_id
        );

        $anciennePhoto = $parcelle->piece_justificative_photo;

        DB::transaction(function () use (
            $parcelle,
            $menage
        ) {
            $menageVerrouille = Menage::query()
                ->whereKey($menage->id)
                ->lockForUpdate()
                ->firstOrFail();

            $parcelleVerrouillee = Parcelle::query()
                ->whereKey($parcelle->id)
                ->lockForUpdate()
                ->firstOrFail();

            /*
             * Supprimer la parcelle.
             */
            $parcelleVerrouillee->delete();

            /*
             * Actualiser le ménage.
             */
            $menageVerrouille->update([
                'date_derniere_activite' => now(),
            ]);

            $menageVerrouille->verifierStatutTermine();
        });

        /*
         * Supprimer la photo après la transaction.
         */
        if ($anciennePhoto) {
            Storage::disk('public')->delete($anciennePhoto);
        }

        return response()->json(null, 204);
    }

    /**
     * Vérifier que le type de parcelle est valide.
     */
    private function verifierTypeParcelle(?string $type): void
    {
        if (!in_array($type, ['verger', 'sous_verger'], true)) {
            throw ValidationException::withMessages([
                'type_parcelle' => [
                    'Le type de parcelle doit être verger ou sous_verger.',
                ],
            ]);
        }
    }

    /**
     * Contrôler le nombre maximal de parcelles.
     *
     * La catégorie est enregistrée dans parcelles.type_parcelle.
     */
    private function verifierLimiteParcelle(
        Menage $menage,
        string $type,
        ?int $parcelleId = null
    ): void {
        /*
         * Compter les parcelles du ménage
         * appartenant au type demandé.
         */
        $requete = Parcelle::query()
            ->where('menage_id', $menage->id)
            ->where('type_parcelle', $type);

        /*
         * En modification, exclure la parcelle actuelle.
         */
        if ($parcelleId !== null) {
            $requete->where('id', '!=', $parcelleId);
        }

        $nombreExistant = $requete->count();

        /*
         * CAS 1 : VERGER
         *
         * La limite vient de la réponse à la question
         * effectif_vergers.
         */
        if ($type === 'verger') {
            $nombreDeclare = $this->obtenirNombreDeclare(
                $menage,
                'effectif_vergers'
            );

            if ($nombreExistant >= $nombreDeclare) {
                throw ValidationException::withMessages([
                    'type_parcelle' => [
                        "Impossible d'enregistrer ce verger. "
                        . "Le Caféiculteur a déclaré {$nombreDeclare} verger(s) "
                        . "dans le questionnaire et cette limite est atteinte.",
                    ],
                ]);
            }
        }

        /*
         * CAS 2 : SOUS-VERGER
         *
         * Un seul sous-verger est autorisé par ménage,
         * quelle que soit la réponse au questionnaire.
         */
        if ($type === 'sous_verger' && $nombreExistant >= 1) {
            throw ValidationException::withMessages([
                'type_parcelle' => [
                    'Un seul sous-verger est autorisé par Caféiculteur. '
                    . 'Ce Caféiculteur possède déjà un sous-verger enregistré.',
                ],
            ]);
        }
    }

    /**
     * Récupérer le nombre déclaré dans le questionnaire.
     *
     * Recherche :
     * questions.code = effectif_vergers
     * reponses_questionnaire.question_id = questions.id
     * reponses_questionnaire.menage_id = ménage concerné
     *
     * Aucun champ supplémentaire n'est créé.
     */
    private function obtenirNombreDeclare(
        Menage $menage,
        string $codeQuestion
    ): int {
        /*
         * Retrouver la question existante.
         */
        $question = Question::query()
            ->where('code', $codeQuestion)
            ->first();

        if (!$question) {
            throw ValidationException::withMessages([
                'questionnaire' => [
                    "La question {$codeQuestion} est introuvable.",
                ],
            ]);
        }

        /*
         * Récupérer la réponse du Caféiculteur.
         *
         * Les réponses générales du ménage ont parcelle_id = NULL.
         * On retire le scope territorial ici car l'accès au ménage
         * a déjà été vérifié par AccesTerritorial.
         */
        
        $reponse = ReponseQuestionnaire::withoutGlobalScopes()
                ->where('menage_id', $menage->id)
                ->where('question_id', $question->id)
                ->latest('updated_at')
                  ->first();

           if (!$reponse) {
             throw ValidationException::withMessages([
                'questionnaire' => [
                    "Le Caféiculteur doit d'abord répondre à la question : "
                    . $question->libelle,
                ],
            ]);
        }

        /*
         * Lire la valeur brute pour gérer les différents formats JSON :
         *
         * {"valeur":"2"}
         * "2"
         * 2
         */
        $valeurBrute = $reponse->getRawOriginal('valeur');

        $valeurDecodee = json_decode(
            $valeurBrute ?? '',
            true
        );

        if (is_array($valeurDecodee)) {
            $valeur = $valeurDecodee['valeur'] ?? null;
        } else {
            $valeur = $valeurDecodee;
        }

        /*
         * Vérifier que la réponse est un nombre entier positif
         * ou égal à zéro.
         */
        if (
            $valeur === null
            || $valeur === ''
            || !is_numeric($valeur)
            || (float) $valeur < 0
            || (float) $valeur !== (float) (int) $valeur
        ) {
            throw ValidationException::withMessages([
                'questionnaire' => [
                    "La réponse à la question {$question->libelle} "
                    . "est absente ou invalide.",
                ],
            ]);
        }

        return (int) $valeur;
    }
}