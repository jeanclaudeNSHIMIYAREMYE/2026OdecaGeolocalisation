import PrimaryButton from '@/Components/PrimaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

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
                        ? `${Number(parcelle.superficie_ha).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha`
                        : '—';

                const popup =
                    `<strong>${codeMenage}</strong><br>` +
                    `${parcelle.nombre_pieds ?? '—'} pieds de café<br>` +
                    `Superficie : ${superficieTexte}<br>` +
                    `État : ${parcelle.etat_verger ?? '—'}<br>` +
                    `Type : ${parcelle.type ?? '—'}<br>` +
                    `Altitude : ${altitudeTexte}`;

                /*
                 * ============================
                 * POLYGONE
                 * ============================
                 */
                if (Array.isArray(parcelle.polygone) && parcelle.polygone.length >= 3) {
                    const coordinates = parcelle.polygone
                        .map((coord) => {
                            if (Array.isArray(coord) && coord.length >= 2) {
                                return [Number(coord[0]), Number(coord[1])];
                            }

                            if (coord && coord.latitude != null && coord.longitude != null) {
                                return [Number(coord.latitude), Number(coord.longitude)];
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

                        if (parcelle.superficie_ha !== null && parcelle.superficie_ha !== undefined) {
                            polygoneLayer.bindTooltip(
                                `${Number(parcelle.superficie_ha).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha`,
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

                /*
                 * ============================
                 * POINT GPS
                 * ============================
                 */
                if (parcelle.latitude != null && parcelle.longitude != null) {
                    const latitude = Number(parcelle.latitude);
                    const longitude = Number(parcelle.longitude);

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
            });

            if (toutesLesCoordonnees.length > 0) {
                const bornes = L.latLngBounds(toutesLesCoordonnees);
                carteRef.current.fitBounds(bornes, { padding: [30, 30] });
            }
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
            <div ref={conteneurRef} className="h-[400px] w-full rounded-lg" />
        </>
    );
}

function Ligne({ libelle, valeur }) {
    return (
        <div className="flex justify-between border-b py-2 text-sm last:border-0">
            <span className="text-gray-500">{libelle}</span>

            <span className="font-medium text-gray-900 text-right">
                {valeur ?? '—'}
            </span>
        </div>
    );
}

/**
 * Formate la valeur JSON enregistrée dans reponses_questionnaire.valeur
 */
function formaterReponse(valeur) {
    if (!valeur) {
        return 'Non renseigné';
    }

    // Cas choix multiple
    if (Array.isArray(valeur.valeurs)) {
        if (valeur.valeurs.length === 0) {
            return 'Non renseigné';
        }

        let texte = valeur.valeurs.join(', ');

        if (valeur.autreTexte) {
            texte += ` (${valeur.autreTexte})`;
        }

        return texte;
    }

    // Cas réponse simple
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

    // Compatibilité si jamais la valeur est directement un tableau
    if (Array.isArray(valeur)) {
        return valeur.join(', ');
    }

    // Compatibilité si jamais la valeur est une chaîne directement
    if (typeof valeur === 'string' || typeof valeur === 'number') {
        return String(valeur);
    }

    return 'Non renseigné';
}

export default function Afficher({ menage, peutModifier, peutDupliquer }) {
    const { flash } = usePage().props;

    const reponses = menage.reponses ?? [];
    const parcelles = menage.parcelles ?? [];

    const statut = LIBELLES_STATUT[menage.statut] ?? {
        texte: menage.statut ?? 'Inconnu',
        classe: 'bg-gray-100 text-gray-600',
    };

    const supprimerParcelle = (parcelle) => {
        if (!confirm(`Supprimer cette parcelle (${parcelle.nombre_pieds ?? '—'} pieds de café) ? Cette action est irréversible.`)) {
            return;
        }

        router.delete(route('menages.parcelles.destroy', [menage.id, parcelle.id]), {
            preserveScroll: true,
        });
    };

    const supprimerReponse = (reponse) => {
        if (!confirm('Supprimer cette réponse au questionnaire ? Cette action est irréversible.')) {
            return;
        }

        router.delete(route('menages.reponses.destroy', [menage.id, reponse.id]), {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        Ménage {menage.code_menage}
                    </h2>

                    {peutDupliquer && (
                        <Link href={route('menages.dupliquer', menage.id)} className="ml-4">
                            <PrimaryButton type="button">Dupliquer</PrimaryButton>
                        </Link>
                    )}

                    {peutModifier && (
                        <Link href={route('menages.edit', menage.id)} className="ml-4">
                            <PrimaryButton>
                                Modifier
                            </PrimaryButton>
                        </Link>
                    )}
                </div>
            }
        >
            <Head title={`Ménage ${menage.code_menage}`} />

            <div className="py-12">
                <div className="mx-auto max-w-5xl space-y-6 sm:px-6 lg:px-8">

                    {/* Flash message */}
                    {flash?.succes && (
                        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
                            {flash.succes}
                        </div>
                    )}

                    {/* Informations générales */}
                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">
                            Informations générales
                        </h3>

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
                            libelle="Localisation"
                            valeur={[
                                menage.colline?.nom,
                                menage.colline?.zone?.nom,
                                menage.colline?.zone?.commune?.nom,
                                menage.colline?.zone?.commune?.province?.nom,
                            ]
                                .filter(Boolean)
                                .join(', ')}
                        />

                        <Ligne
                            libelle="Enquêteur assigné"
                            valeur={menage.enqueteur?.name}
                        />

                        <div className="flex justify-between py-2 text-sm">
                            <span className="text-gray-500">
                                Statut
                            </span>

                            <span
                                className={`rounded-full px-2 py-1 text-xs font-medium ${statut.classe}`}
                            >
                                {statut.texte}
                            </span>
                        </div>
                    </div>

                    {/* Réponses au questionnaire */}
                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold uppercase text-gray-500">
                                    Réponses au questionnaire
                                </h3>

                                <p className="mt-1 text-xs text-gray-400">
                                    {reponses.length} réponse
                                    {reponses.length > 1 ? 's' : ''} enregistrée
                                    {reponses.length > 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>

                        {reponses.length === 0 ? (
                            <div className="rounded-md bg-gray-50 p-6 text-center">
                                <p className="text-sm text-gray-400">
                                    Aucune réponse au questionnaire pour ce ménage.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {reponses
                                    .sort(
                                        (a, b) =>
                                            (a.question?.ordre ?? 0) -
                                            (b.question?.ordre ?? 0)
                                    )
                                    .map((reponse, index) => (
                                        <div
                                            key={reponse.id}
                                            className="py-4"
                                        >
                                            <div className="flex gap-4">
                                                {/* Numéro */}
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                                                    {index + 1}
                                                </div>

                                                <div className="flex-1">
                                                    {/* Question */}
                                                    <p className="text-sm font-medium text-gray-800">
                                                        {reponse.question?.libelle ??
                                                            'Question inconnue'}
                                                    </p>

                                                    {peutModifier && (
                                                        <button
                                                            type="button"
                                                            onClick={() => supprimerReponse(reponse)}
                                                            className="shrink-0 text-xs font-medium text-red-500 hover:text-red-700"
                                                        >
                                                            Supprimer
                                                        </button>
                                                    )}

                                                    {/* Code / section */}
                                                    <div className="mt-1 flex flex-wrap gap-2">
                                                        {reponse.question?.code && (
                                                            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                                                                {reponse.question.code}
                                                            </span>
                                                        )}

                                                        {reponse.question?.section && (
                                                            <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                                                                {reponse.question.section}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Réponse */}
                                                    <div className="mt-3 rounded-md bg-gray-50 p-3">
                                                        <p className="text-xs font-medium uppercase text-gray-400">
                                                            Réponse
                                                        </p>

                                                        <p className="mt-1 text-sm font-semibold text-gray-900">
                                                            {formaterReponse(
                                                                reponse.valeur
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* Carte des parcelles */}
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-700">
                                Localisation des parcelles ({parcelles.length})
                            </h3>

                            <div className="flex gap-3 text-xs text-gray-500">
                                <span><span className="inline-block h-2 w-2 rounded-full bg-green-600" /> Terminé</span>
                                <span><span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> En attente</span>
                                <span><span className="inline-block h-2 w-2 rounded-full bg-gray-400" /> À faire</span>
                            </div>
                        </div>

                        {parcelles.length === 0 ? (
                            <div className="rounded-md bg-gray-50 p-6 text-center">
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
                    </div>

                    {/* Parcelles */}
                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">
                            Parcelles ({parcelles.length})
                        </h3>

                        {parcelles.length === 0 && (
                            <p className="text-sm text-gray-400">
                                Aucune parcelle géolocalisée pour l'instant.
                            </p>
                        )}

                        {parcelles.map((parcelle) => (
                            <div
                                key={parcelle.id}
                                className="border-b py-3 text-sm last:border-0"
                            >
                                <div>
                                <p className="font-medium text-gray-900">
                                    {parcelle.nombre_pieds ?? '—'} pieds de café
                                    {parcelle.superficie_ha !== null && parcelle.superficie_ha !== undefined && (
                                        <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                            {Number(parcelle.superficie_ha).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha
                                        </span>
                                    )}
                                </p>

                                <p className="text-gray-500">
                                    {parcelle.etat_verger ??
                                        'État non renseigné'}, {" "}

                                    {parcelle.type ??
                                        'Type non renseigné'},

                                    {parcelle.latitude !== null &&
                                        parcelle.latitude !== undefined && (
                                            <>
                                                {' '}
                                                — {parcelle.latitude},{' '}
                                                {parcelle.longitude}, altitude: {parcelle.altitude ?? '—'}m
                                            </>
                                        )}
                                </p>
                            </div>
                            {peutModifier && (
                            <button
                                type="button"
                                onClick={() => supprimerParcelle(parcelle)}
                                className="shrink-0 text-xs font-medium text-red-500 hover:text-red-700"
                            >
                                Supprimer
                            </button>
                        )}
                        </div>
                        ))}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
