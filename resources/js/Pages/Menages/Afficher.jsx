
import PrimaryButton from '@/Components/PrimaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef } from 'react';

const LIBELLES_STATUT = {
    termine: {
        texte: 'Terminé',
        classe: 'bg-green-100 text-green-700',
    },
    en_attente: {
        texte: 'En attente',
        classe: 'bg-amber-100 text-amber-700',
    },
    a_faire: {
        texte: 'À faire',
        classe: 'bg-gray-100 text-gray-600',
    },
};

const COULEURS_STATUT = {
    termine: '#16a34a',
    en_attente: '#f59e0b',
    a_faire: '#9ca3af',
};

function CarteMenage({ parcelles, statutMenage, codeMenage }) {
    const conteneurRef = useRef(null);
    const carteRef = useRef(null);
    const coucheMarqueursRef = useRef(null);
    const couchePolygonesRef = useRef(null);

    useEffect(() => {
        let annule = false;

        import('leaflet').then((L) => {
            if (annule || !conteneurRef.current) return;

            if (!carteRef.current) {
                carteRef.current = L.map(conteneurRef.current).setView(
                    [-3.373, 29.918],
                    8,
                );

                L.tileLayer(
                    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    {
                        attribution: '&copy; OpenStreetMap',
                        maxZoom: 18,
                    },
                ).addTo(carteRef.current);

                coucheMarqueursRef.current = L.layerGroup().addTo(carteRef.current);
                couchePolygonesRef.current = L.layerGroup().addTo(carteRef.current);
            }

            coucheMarqueursRef.current.clearLayers();
            couchePolygonesRef.current.clearLayers();

            const couleur = COULEURS_STATUT[statutMenage] ?? '#6366f1';
            const toutesLesCoordonnees = [];

            (parcelles ?? []).forEach((parcelle) => {
                const altitudeTexte =
                    parcelle.altitude !== null && parcelle.altitude !== undefined
                        ? `${Number(parcelle.altitude).toFixed(0)} m`
                        : '—';

                const superficieTexte =
                    parcelle.superficie_ha !== null && parcelle.superficie_ha !== undefined
                        ? `${Number(parcelle.superficie_ha).toLocaleString('fr-FR', {
                              maximumFractionDigits: 2,
                          })} ha`
                        : '—';

                const popup =
                    `<strong>${codeMenage}</strong><br>` +
                    `${parcelle.nombre_pieds ?? '—'} pieds de café<br>` +
                    `Superficie : ${superficieTexte}<br>` +
                    `État : ${parcelle.etat_verger ?? '—'}<br>` +
                    `Type : ${parcelle.type ?? '—'}<br>` +
                    `Altitude : ${altitudeTexte}`;

                // Polygone de la parcelle
                if (Array.isArray(parcelle.polygone) && parcelle.polygone.length >= 3) {
                    const coordinates = parcelle.polygone
                        .map((coord) => {
                            if (Array.isArray(coord) && coord.length >= 2) {
                                return [Number(coord[0]), Number(coord[1])];
                            }

                            if (
                                coord &&
                                coord.latitude != null &&
                                coord.longitude != null
                            ) {
                                return [
                                    Number(coord.latitude),
                                    Number(coord.longitude),
                                ];
                            }

                            return null;
                        })
                        .filter(Boolean);

                    if (coordinates.length >= 3) {
                        const polygoneLayer = L.polygon(coordinates, {
                            color: couleur,
                            fillColor: couleur,
                            fillOpacity: 0.25,
                            weight: 2,
                        }).bindPopup(popup);

                        if (
                            parcelle.superficie_ha !== null &&
                            parcelle.superficie_ha !== undefined
                        ) {
                            polygoneLayer.bindTooltip(
                                `${Number(parcelle.superficie_ha).toLocaleString(
                                    'fr-FR',
                                    { maximumFractionDigits: 2 },
                                )} ha`,
                                {
                                    permanent: true,
                                    direction: 'center',
                                    className: 'etiquette-superficie',
                                },
                            );
                        }

                        polygoneLayer.addTo(couchePolygonesRef.current);
                        toutesLesCoordonnees.push(...coordinates);
                    }
                }

                // Point GPS
                if (parcelle.latitude != null && parcelle.longitude != null) {
                    const latitude = Number(parcelle.latitude);
                    const longitude = Number(parcelle.longitude);

                    if (
                        Number.isFinite(latitude) &&
                        Number.isFinite(longitude)
                    ) {
                        L.circleMarker([latitude, longitude], {
                            radius: 6,
                            color: couleur,
                            fillColor: couleur,
                            fillOpacity: 0.8,
                            weight: 1,
                        })
                            .bindPopup(popup)
                            .addTo(coucheMarqueursRef.current);

                        toutesLesCoordonnees.push([latitude, longitude]);
                    }
                }
            });

            if (toutesLesCoordonnees.length > 0) {
                const bornes = L.latLngBounds(toutesLesCoordonnees);
                carteRef.current.fitBounds(bornes, { padding: [30, 30] });
            }

            // Corrige l'affichage de Leaflet après adaptation du conteneur.
            setTimeout(() => {
                if (!annule && carteRef.current) {
                    carteRef.current.invalidateSize();
                }
            }, 150);
        });

        return () => {
            annule = true;
        };
    }, [parcelles, statutMenage, codeMenage]);

    useEffect(() => {
        return () => {
            carteRef.current?.remove();
            carteRef.current = null;
        };
    }, []);

    return (
        <>
            <style>{`
                .etiquette-superficie {
                    background: rgba(255, 255, 255, 0.85);
                    border: none;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
                    font-size: 11px;
                    font-weight: 600;
                    color: #1f2937;
                    padding: 1px 4px;
                }

                .etiquette-superficie::before {
                    display: none;
                }
            `}</style>

            <div
                ref={conteneurRef}
                className="h-[280px] w-full overflow-hidden rounded-lg sm:h-[350px] lg:h-[480px]"
            />
        </>
    );
}

function Ligne({ libelle, valeur }) {
    return (
        <div className="flex flex-col gap-1 border-b border-gray-100 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="text-xs font-medium text-gray-500 sm:text-sm">
                {libelle}
            </span>

            <span className="break-words text-sm font-medium text-gray-900 sm:max-w-[65%] sm:text-right">
                {valeur || '—'}
            </span>
        </div>
    );
}

function formaterReponse(valeur) {
    if (!valeur) return 'Non renseigné';

    if (Array.isArray(valeur.valeurs)) {
        if (valeur.valeurs.length === 0) return 'Non renseigné';

        let texte = valeur.valeurs.join(', ');

        if (valeur.autreTexte) {
            texte += ` (${valeur.autreTexte})`;
        }

        return texte;
    }

    if (
        valeur.valeur !== undefined &&
        valeur.valeur !== null &&
        valeur.valeur !== ''
    ) {
        let texte = String(valeur.valeur);

        if (valeur.autreTexte) {
            texte += ` (${valeur.autreTexte})`;
        }

        return texte;
    }

    if (Array.isArray(valeur)) {
        return valeur.join(', ');
    }

    if (typeof valeur === 'string' || typeof valeur === 'number') {
        return String(valeur);
    }

    return 'Non renseigné';
}

function TitreSection({ titre, description }) {
    return (
        <div className="mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">
                {titre}
            </h3>

            {description && (
                <p className="mt-1 text-xs text-gray-400">
                    {description}
                </p>
            )}
        </div>
    );
}

function BoutonSupprimer({ onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
        >
            {children}
        </button>
    );
}

export default function Afficher({
    menage,
    peutModifier,
    peutDupliquer,
}) {
    const { flash } = usePage().props;

    const reponses = useMemo(
        () =>
            [...(menage.reponses ?? [])].sort(
                (a, b) =>
                    (a.question?.ordre ?? 0) -
                    (b.question?.ordre ?? 0),
            ),
        [menage.reponses],
    );

    const parcelles = menage.parcelles ?? [];

    const statut = LIBELLES_STATUT[menage.statut] ?? {
        texte: menage.statut ?? 'Inconnu',
        classe: 'bg-gray-100 text-gray-600',
    };

    const supprimerParcelle = (parcelle) => {
        if (
            !confirm(
                `Supprimer cette parcelle (${parcelle.nombre_pieds ?? '—'} pieds de café) ? Cette action est irréversible.`,
            )
        ) {
            return;
        }

        router.delete(
            route('menages.parcelles.destroy', [
                menage.id,
                parcelle.id,
            ]),
            { preserveScroll: true },
        );
    };

    const supprimerReponse = (reponse) => {
        if (
            !confirm(
                'Supprimer cette réponse au questionnaire ? Cette action est irréversible.',
            )
        ) {
            return;
        }

        router.delete(
            route('menages.reponses.destroy', [
                menage.id,
                reponse.id,
            ]),
            { preserveScroll: true },
        );
    };

    const localisation = [
        menage.colline?.nom,
        menage.colline?.zone?.nom,
        menage.colline?.zone?.commune?.nom,
        menage.colline?.zone?.commune?.province?.nom,
    ]
        .filter(Boolean)
        .join(', ');

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                            Gestion des ménages
                        </p>

                        <h2 className="mt-1 break-words text-lg font-bold text-gray-800 sm:text-xl">
                            Ménage {menage.code_menage}
                        </h2>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {peutDupliquer && (
                            <Link
                                href={route('menages.dupliquer', menage.id)}
                                className="flex-1 sm:flex-none"
                            >
                                <PrimaryButton type="button">
                                    Dupliquer
                                </PrimaryButton>
                            </Link>
                        )}

                        {peutModifier && (
                            <Link
                                href={route('menages.edit', menage.id)}
                                className="flex-1 sm:flex-none"
                            >
                                <PrimaryButton type="button">
                                    Modifier
                                </PrimaryButton>
                            </Link>
                        )}
                    </div>
                </div>
            }
        >
            <Head title={`Ménage ${menage.code_menage}`} />

            <div className="min-h-screen bg-gray-50 py-5 sm:py-8 lg:py-10">
                <div className="mx-auto max-w-6xl space-y-5 px-3 sm:px-6 lg:px-8 lg:space-y-6">

                    {/* Retour et identification */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link
                            href={route('menages.index')}
                            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-green-700"
                        >
                            <span aria-hidden="true">←</span>
                            Retour à la liste
                        </Link>

                        <span
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statut.classe}`}
                        >
                            {statut.texte}
                        </span>
                    </div>

                    {/* Message flash */}
                    {flash?.succes && (
                        <div
                            role="status"
                            aria-live="polite"
                            className="card-enter flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800 shadow-sm sm:p-4"
                        >
                            <svg
                                aria-hidden="true"
                                className="mt-0.5 h-5 w-5 shrink-0 text-green-600"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <span className="font-medium">{flash.succes}</span>
                        </div>
                    )}

                    {/* Informations générales */}
                    <section className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
                        <TitreSection
                            titre="Informations générales"
                            description="Identité et localisation du ménage"
                        />

                        <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
                            <Ligne
                                libelle="Code ménage"
                                valeur={menage.code_menage}
                            />

                            <Ligne
                                libelle="Chef de ménage"
                                valeur={[
                                    menage.prenom_chef_menage,
                                    menage.nom_chef_menage,
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                            />

                            <Ligne
                                libelle="Téléphone"
                                valeur={menage.telephone}
                            />

                            <Ligne
                                libelle="Enquêteur assigné"
                                valeur={menage.enqueteur?.name}
                            />

                            <div className="md:col-span-2">
                                <Ligne
                                    libelle="Localisation"
                                    valeur={localisation}
                                />
                            </div>

                            <Ligne
                                libelle="Statut"
                                valeur={statut.texte}
                            />
                        </div>
                    </section>

                    {/* Réponses au questionnaire */}
                    <section className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
                        <TitreSection
                            titre="Réponses au questionnaire"
                            description={`${reponses.length} réponse${reponses.length > 1 ? 's' : ''} enregistrée${reponses.length > 1 ? 's' : ''}`}
                        />

                        {reponses.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
                                <p className="text-sm text-gray-400">
                                    Aucune réponse au questionnaire pour ce ménage.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {reponses.map((reponse, index) => (
                                    <article
                                        key={reponse.id}
                                        className="py-4 first:pt-1 last:pb-1"
                                    >
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-50 text-xs font-bold text-green-700">
                                                {index + 1}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                    <p className="break-words text-sm font-semibold leading-6 text-gray-800">
                                                        {reponse.question?.libelle ??
                                                            'Question inconnue'}
                                                    </p>

                                                    {peutModifier && (
                                                        <div className="sm:shrink-0">
                                                            <BoutonSupprimer
                                                                onClick={() =>
                                                                    supprimerReponse(
                                                                        reponse,
                                                                    )
                                                                }
                                                            >
                                                                Supprimer
                                                            </BoutonSupprimer>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {reponse.question?.code && (
                                                        <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-500">
                                                            {reponse.question.code}
                                                        </span>
                                                    )}

                                                    {reponse.question?.section && (
                                                        <span className="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-600">
                                                            {reponse.question.section}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:p-4">
                                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                                        Réponse
                                                    </p>

                                                    <p className="mt-1 break-words text-sm font-semibold leading-6 text-gray-900">
                                                        {formaterReponse(
                                                            reponse.valeur,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Carte des parcelles */}
                    <section className="overflow-hidden rounded-xl bg-white p-4 shadow-sm sm:p-6">
                        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">
                                    Localisation des parcelles
                                </h3>

                                <p className="mt-1 text-xs text-gray-400">
                                    {parcelles.length} parcelle
                                    {parcelles.length > 1 ? 's' : ''} enregistrée
                                    {parcelles.length > 1 ? 's' : ''}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
                                    Terminé
                                </span>

                                <span className="inline-flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                                    En attente
                                </span>

                                <span className="inline-flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                                    À faire
                                </span>
                            </div>
                        </div>

                        {parcelles.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
                                <p className="text-sm text-gray-400">
                                    Aucune parcelle géolocalisée pour l'instant.
                                </p>
                            </div>
                        ) : (
                            <CarteMenage
                                parcelles={parcelles}
                                statutMenage={menage.statut}
                                codeMenage={menage.code_menage}
                            />
                        )}
                    </section>

                    {/* Liste des parcelles */}
                    <section className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
                        <TitreSection
                            titre="Parcelles"
                            description={`${parcelles.length} parcelle${parcelles.length > 1 ? 's' : ''} associée${parcelles.length > 1 ? 's' : ''} à ce ménage`}
                        />

                        {parcelles.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
                                <p className="text-sm text-gray-400">
                                    Aucune parcelle géolocalisée pour l'instant.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                {parcelles.map((parcelle, index) => (
                                    <article
                                        key={parcelle.id}
                                        className="rounded-lg border border-gray-100 p-4 transition hover:border-green-200 hover:shadow-sm"
                                    >
                                        <div className="flex flex-col gap-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-xs font-medium text-gray-400">
                                                        Parcelle {index + 1}
                                                    </p>

                                                    <p className="mt-1 text-sm font-bold text-gray-900">
                                                        {parcelle.nombre_pieds ?? '—'} pieds de café
                                                    </p>
                                                </div>

                                                {parcelle.superficie_ha !== null &&
                                                    parcelle.superficie_ha !== undefined && (
                                                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                            {Number(
                                                                parcelle.superficie_ha,
                                                            ).toLocaleString(
                                                                'fr-FR',
                                                                {
                                                                    maximumFractionDigits: 2,
                                                                },
                                                            )}{' '}
                                                            ha
                                                        </span>
                                                    )}
                                            </div>

                                            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                                                <Ligne
                                                    libelle="État du verger"
                                                    valeur={parcelle.etat_verger}
                                                />

                                                <Ligne
                                                    libelle="Type"
                                                    valeur={parcelle.type}
                                                />

                                                <Ligne
                                                    libelle="Latitude"
                                                    valeur={parcelle.latitude}
                                                />

                                                <Ligne
                                                    libelle="Longitude"
                                                    valeur={parcelle.longitude}
                                                />

                                                <Ligne
                                                    libelle="Altitude"
                                                    valeur={
                                                        parcelle.altitude !== null &&
                                                        parcelle.altitude !== undefined
                                                            ? `${parcelle.altitude} m`
                                                            : '—'
                                                    }
                                                />
                                            </div>

                                            {peutModifier && (
                                                <div className="flex justify-end border-t border-gray-100 pt-3">
                                                    <BoutonSupprimer
                                                        onClick={() =>
                                                            supprimerParcelle(
                                                                parcelle,
                                                            )
                                                        }
                                                    >
                                                        Supprimer cette parcelle
                                                    </BoutonSupprimer>
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
