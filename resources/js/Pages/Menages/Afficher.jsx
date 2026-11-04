import PrimaryButton from '@/Components/PrimaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef } from 'react';
import {
    detailsStatutMenage,
    normaliserStatutMenage,
} from '@/Constants/statutsMenage';

/*
 * PALETTE (café du Burundi)
 * Espresso #3B2218 · Cerise #B8322A · Or #D9A441 · Feuille #2F7D4F
 * Crème #FFFBF5 · Sable #E8D9C3
 */

const COULEURS_STATUT = {
    termine: '#16a34a',
    en_attente: '#f59e0b',
    a_faire: '#9ca3af',
};

// ============================================================
// STYLES ET ANIMATIONS
// ============================================================

const STYLES_PAGE = `
@keyframes afEntree {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
}
@keyframes afHalo {
    0%, 100% { transform: translate(0, 0) scale(1); opacity: .5; }
    50%      { transform: translate(-18px, 14px) scale(1.12); opacity: .8; }
}

.af-entree { opacity: 0; animation: afEntree .5s cubic-bezier(.22, 1, .36, 1) forwards; }

.af-hero {
    background:
        radial-gradient(80% 120% at 100% 0%, rgba(217, 164, 65, .28) 0%, transparent 60%),
        linear-gradient(150deg, #5A2E1E 0%, #3B2218 55%, #26150E 100%);
}
.af-halo {
    background: radial-gradient(circle, rgba(184, 50, 42, .5) 0%, transparent 70%);
    animation: afHalo 9s ease-in-out infinite;
}
.af-tricolore { background: linear-gradient(90deg, #B8322A 0%, #D9A441 50%, #2F7D4F 100%); }
.af-fond-page { background: linear-gradient(180deg, #FAF4EA 0%, #F6EFE3 100%); }

.etiquette-superficie {
    background: rgba(255, 251, 245, 0.95);
    border: none;
    border-radius: 6px;
    box-shadow: 0 2px 6px rgba(59, 34, 24, 0.25);
    font-size: 11px;
    font-weight: 600;
    color: #3B2218;
    padding: 1px 6px;
}
.etiquette-superficie::before { display: none; }

.af-carte .leaflet-container { z-index: 0; font-family: inherit; }
.af-carte .leaflet-popup-content-wrapper {
    border-radius: 14px;
    box-shadow: 0 12px 28px -8px rgba(59, 34, 24, 0.45);
    border-top: 3px solid #D9A441;
}
.af-carte .leaflet-popup-content { font-size: 12.5px; line-height: 1.55; color: #3B2218; }

@media (prefers-reduced-motion: reduce) {
    .af-entree { animation: none !important; opacity: 1 !important; }
    .af-halo { animation: none !important; }
}
`;

// ============================================================
// ICÔNES (Heroicons, tracés)
// ============================================================

const ICONES = {
    identite: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
    questionnaire: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z',
    carte: 'M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z',
    parcelle: 'M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z',
    pieds: 'M12 21V9m0 0c0-3 2-5 6-5 0 4-2 6-6 5Zm0 3c0-2.5-1.8-4-5-4 0 3.2 1.8 5 5 4Z',
    reponses: 'M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z',
};

function Icone({ chemin, className = 'h-5 w-5' }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className={className}
            aria-hidden="true"
        >
            <path strokeLinecap="round" strokeLinejoin="round" d={chemin} />
        </svg>
    );
}

// ============================================================
// CARTE LEAFLET DES PARCELLES (logique inchangée)
// ============================================================

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

            const couleur =
                COULEURS_STATUT[normaliserStatutMenage(statutMenage)] ??
                '#6366f1';
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
        <div
            ref={conteneurRef}
            className="af-carte h-[280px] w-full overflow-hidden rounded-xl sm:h-[350px] lg:h-[480px]"
        />
    );
}

// ============================================================
// PETITS COMPOSANTS
// ============================================================

function Ligne({ libelle, valeur }) {
    return (
        <div className="flex flex-col gap-1 border-b border-[#EFE3D0] py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="text-xs font-medium text-[#8A705D] sm:text-sm">
                {libelle}
            </span>

            <span className="break-words text-sm font-semibold text-[#3B2218] sm:max-w-[65%] sm:text-right">
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

/** Carte blanche avec barre tricolore, icône et titre. */
function Section({ titre, description, icone, droite, ordre = 0, children }) {
    return (
        <section
            className="af-entree relative overflow-hidden rounded-2xl border border-[#E8D9C3]/70 bg-white shadow-sm"
            style={{ animationDelay: `${ordre * 70}ms` }}
        >
            <span aria-hidden="true" className="af-tricolore absolute inset-x-0 top-0 h-1" />

            <div className="flex flex-col gap-3 border-b border-[#EFE3D0] bg-gradient-to-r from-[#FFF6E6] via-white to-white px-4 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#B8322A] to-[#3B2218] text-white shadow-md shadow-[#3B2218]/25">
                        <Icone chemin={icone} />
                    </span>

                    <div className="min-w-0">
                        <h3 className="text-sm font-bold tracking-tight text-[#3B2218] sm:text-base">
                            {titre}
                        </h3>

                        {description && (
                            <p className="mt-0.5 text-xs text-[#8A705D]">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                {droite}
            </div>

            <div className="p-4 sm:p-6">{children}</div>
        </section>
    );
}

function VideVide({ texte }) {
    return (
        <div className="rounded-xl border border-dashed border-[#D9C3A3] bg-[#FFFBF5] px-4 py-8 text-center">
            <p className="text-sm text-[#8A705D]">{texte}</p>
        </div>
    );
}

function BoutonSupprimer({ onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#B8322A]/30 bg-white px-3 py-2 text-xs font-semibold text-[#B8322A] transition hover:border-[#B8322A] hover:bg-[#B8322A] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#B8322A]/40"
        >
            {children}
        </button>
    );
}

function Indicateur({ icone, valeur, libelle }) {
    return (
        <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm sm:p-4">
            <div className="flex items-center gap-2 text-[#F0D9A8]">
                <Icone chemin={icone} className="h-4 w-4" />
                <span className="text-[11px] font-medium uppercase tracking-wide">
                    {libelle}
                </span>
            </div>

            <p className="mt-1.5 text-xl font-bold tabular-nums text-white sm:text-2xl">
                {valeur}
            </p>
        </div>
    );
}

function LegendeStatut() {
    const elements = [
        { nom: 'Terminé', couleur: 'bg-green-600' },
        { nom: 'En attente', couleur: 'bg-amber-500' },
        { nom: 'À faire', couleur: 'bg-gray-400' },
    ];

    return (
        <div className="flex flex-wrap items-center gap-2">
            {elements.map((element) => (
                <span
                    key={element.nom}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFBF5] px-2.5 py-1 text-xs text-[#5B3927] ring-1 ring-[#E8D9C3]"
                >
                    <span className={`h-2.5 w-2.5 rounded-full ${element.couleur}`} />
                    {element.nom}
                </span>
            ))}
        </div>
    );
}

const initiales = (nom = '') =>
    nom
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((mot) => mot[0].toUpperCase())
        .join('');

// ============================================================
// PAGE PRINCIPALE
// ============================================================

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

    const statut = detailsStatutMenage(menage.statut);

    const totalPieds = parcelles.reduce(
        (somme, p) => somme + (Number(p.nombre_pieds) || 0),
        0,
    );

    const totalSuperficie = parcelles.reduce(
        (somme, p) => somme + (Number(p.superficie_ha) || 0),
        0,
    );

    const nombre = (valeur) => Number(valeur ?? 0).toLocaleString('fr-FR');

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

    const collinesAffichees = [
        menage.colline,
        ...(menage.collines ?? []),
    ].filter(
        (colline, index, collines) =>
            colline &&
            collines.findIndex((c) => c?.id === colline.id) === index,
    );

    const localisations = collinesAffichees.map((colline) =>
        [
            colline.zone?.commune?.province?.nom,
            colline.zone?.commune?.nom,
            colline.zone?.nom,
            colline.nom,
        ]
            .filter(Boolean)
            .join(' > '),
    );

    const localisation = localisations.join(' | ');

    const nomComplet = [menage.prenom_chef_menage, menage.nom_chef_menage]
        .filter(Boolean)
        .join(' ');

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#B8322A]">
                            Gestion des Caféiculteurs
                        </p>

                        <h2 className="mt-1 break-words text-lg font-bold text-[#3B2218] sm:text-xl">
                            Caféiculteur {menage.code_menage}
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
            <Head title={`Caféiculteur ${menage.code_menage}`} />

            <style>{STYLES_PAGE}</style>

            <div className="af-fond-page min-h-screen py-5 sm:py-8 lg:py-10">
                <div className="mx-auto max-w-6xl space-y-5 px-3 sm:px-6 lg:space-y-6 lg:px-8">

                    {/* Retour */}
                    <div>
                        <Link
                            href={route('menages.index')}
                            className="group inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-[#5B3927] shadow-sm ring-1 ring-[#E8D9C3] transition hover:bg-[#FFF3DD] hover:text-[#3B2218]"
                        >
                            <span
                                aria-hidden="true"
                                className="transition-transform duration-200 group-hover:-translate-x-0.5"
                            >
                                ←
                            </span>
                            Retour à la liste
                        </Link>
                    </div>

                    {/* Message flash */}
                    {flash?.succes && (
                        <div
                            role="status"
                            aria-live="polite"
                            className="af-entree flex items-start gap-3 rounded-xl border border-[#2F7D4F]/30 bg-[#2F7D4F]/10 p-3 text-sm text-[#1F5A38] shadow-sm sm:p-4"
                        >
                            <svg
                                aria-hidden="true"
                                className="mt-0.5 h-5 w-5 shrink-0 text-[#2F7D4F]"
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

                    {/* Bannière d'identité */}
                    <div className="af-entree af-hero relative overflow-hidden rounded-2xl shadow-lg shadow-[#3B2218]/25">
                        <div
                            aria-hidden="true"
                            className="af-halo pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full blur-2xl"
                        />

                        <div className="relative p-5 sm:p-6 lg:p-7">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex min-w-0 items-center gap-4">
                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D9A441] to-[#B8322A] text-xl font-bold text-white shadow-lg shadow-black/30 ring-2 ring-white/60">
                                        {initiales(nomComplet) || '?'}
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-xs font-medium uppercase tracking-wider text-[#F0D9A8]">
                                            {menage.code_menage}
                                        </p>

                                        <h3 className="mt-0.5 break-words text-xl font-bold tracking-tight text-white sm:text-2xl">
                                            {nomComplet || 'Caféiculteur'}
                                        </h3>

                                        {localisation && (
                                            <p className="mt-1 line-clamp-2 text-xs text-white/70 sm:text-sm">
                                                {localisation}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <span
                                    className={`rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${statut.classe}`}
                                >
                                    {statut.texte}
                                </span>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                                <Indicateur
                                    icone={ICONES.parcelle}
                                    libelle="Parcelles"
                                    valeur={nombre(parcelles.length)}
                                />
                                <Indicateur
                                    icone={ICONES.pieds}
                                    libelle="Pieds de café"
                                    valeur={nombre(totalPieds)}
                                />
                                <Indicateur
                                    icone={ICONES.carte}
                                    libelle="Superficie"
                                    valeur={`${totalSuperficie.toLocaleString('fr-FR', {
                                        maximumFractionDigits: 2,
                                    })} ha`}
                                />
                                <Indicateur
                                    icone={ICONES.reponses}
                                    libelle="Réponses"
                                    valeur={nombre(reponses.length)}
                                />
                            </div>
                        </div>

                        <div className="af-tricolore h-1 w-full" aria-hidden="true" />
                    </div>

                    {/* Informations générales */}
                    <Section
                        titre="Informations générales"
                        description="Identité et localisation du Caféiculteur"
                        icone={ICONES.identite}
                        ordre={1}
                    >
                        <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
                            <Ligne
                                libelle="Code Caféiculteur"
                                valeur={menage.code_menage}
                            />

                            <Ligne libelle="Caféiculteur" valeur={nomComplet} />

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

                            <Ligne libelle="Statut" valeur={statut.texte} />
                        </div>
                    </Section>

                    {/* Réponses au questionnaire */}
                    <Section
                        titre="Réponses au questionnaire"
                        description={`${reponses.length} réponse${reponses.length > 1 ? 's' : ''} enregistrée${reponses.length > 1 ? 's' : ''}`}
                        icone={ICONES.questionnaire}
                        ordre={2}
                    >
                        {reponses.length === 0 ? (
                            <VideVide texte="Aucune réponse au questionnaire pour ce Caféiculteur." />
                        ) : (
                            <div className="divide-y divide-[#EFE3D0]">
                                {reponses.map((reponse, index) => (
                                    <article
                                        key={reponse.id}
                                        className="py-4 first:pt-0 last:pb-0"
                                    >
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D9A441] to-[#B8322A] text-xs font-bold text-white shadow-sm">
                                                {index + 1}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                    <p className="break-words text-sm font-semibold leading-6 text-[#3B2218]">
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
                                                        <span className="rounded-md bg-[#F3E9D8] px-2 py-1 text-xs text-[#6B4A36]">
                                                            {reponse.question.code}
                                                        </span>
                                                    )}

                                                    {reponse.question?.section && (
                                                        <span className="rounded-md bg-[#2F7D4F]/10 px-2 py-1 text-xs font-medium text-[#25663F]">
                                                            {reponse.question.section}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-3 rounded-xl border border-[#EFE3D0] border-l-4 border-l-[#D9A441] bg-[#FFFBF5] p-3 sm:p-4">
                                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8A705D]">
                                                        Réponse
                                                    </p>

                                                    <p className="mt-1 break-words text-sm font-semibold leading-6 text-[#3B2218]">
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
                    </Section>

                    {/* Carte des parcelles */}
                    <Section
                        titre="Localisation des parcelles"
                        description={`${parcelles.length} parcelle${parcelles.length > 1 ? 's' : ''} enregistrée${parcelles.length > 1 ? 's' : ''}`}
                        icone={ICONES.carte}
                        droite={<LegendeStatut />}
                        ordre={3}
                    >
                        {parcelles.length === 0 ? (
                            <VideVide texte="Aucune parcelle géolocalisée pour l'instant." />
                        ) : (
                            <div className="overflow-hidden rounded-xl ring-1 ring-[#E8D9C3]">
                                <CarteMenage
                                    parcelles={parcelles}
                                    statutMenage={menage.statut}
                                    codeMenage={menage.code_menage}
                                />
                            </div>
                        )}
                    </Section>

                    {/* Liste des parcelles */}
                    <Section
                        titre="Parcelles"
                        description={`${parcelles.length} parcelle${parcelles.length > 1 ? 's' : ''} associée${parcelles.length > 1 ? 's' : ''} à ce Caféiculteur`}
                        icone={ICONES.parcelle}
                        ordre={4}
                    >
                        {parcelles.length === 0 ? (
                            <VideVide texte="Aucune parcelle géolocalisée pour l'instant." />
                        ) : (
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                {parcelles.map((parcelle, index) => (
                                    <article
                                        key={parcelle.id}
                                        className="group relative overflow-hidden rounded-xl border border-[#E8D9C3] bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:border-[#D9A441] hover:shadow-lg hover:shadow-[#3B2218]/10"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#B8322A] via-[#D9A441] to-[#2F7D4F]"
                                        />

                                        <div className="flex flex-col gap-3 pl-2">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-[#B8322A]">
                                                        Parcelle {index + 1}
                                                    </p>

                                                    <p className="mt-1 text-base font-bold text-[#3B2218]">
                                                        {parcelle.nombre_pieds ?? '—'} pieds de café
                                                    </p>
                                                </div>

                                                {parcelle.superficie_ha !== null &&
                                                    parcelle.superficie_ha !== undefined && (
                                                        <span className="rounded-full bg-[#2F7D4F]/10 px-3 py-1 text-xs font-semibold text-[#25663F] ring-1 ring-[#2F7D4F]/25">
                                                            {Number(
                                                                parcelle.superficie_ha,
                                                            ).toLocaleString('fr-FR', {
                                                                maximumFractionDigits: 2,
                                                            })}{' '}
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
                                                <div className="flex justify-end border-t border-[#EFE3D0] pt-3">
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
                    </Section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}