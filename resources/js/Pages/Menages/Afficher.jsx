import PrimaryButton from '@/Components/PrimaryButton';
import {
    detailsStatutMenage,
    normaliserStatutMenage,
} from '@/Constants/statutsMenage';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';

/*
 * PALETTE (café du Burundi)
 * Espresso #3B2218 · Cerise #B8322A · Or #D9A441 · Feuille #2F7D4F
 * Crème #FFFBF5 · Sable #E8D9C3
 */

const COULEURS_STATUT = {
    termine: '#16a34a',
    en_attente: '#f59e0b',
    deja_commence: '#3b82f6',
    a_faire: '#9ca3af',
};

const TYPES_MULTIPLES = ['choix_multiple', 'multiple', 'checkbox', 'cases_a_cocher'];
const TYPES_UNIQUES = ['choix_unique', 'radio', 'select'];
const TYPES_TEXTE_LONG = ['texte_long', 'textarea'];
const TYPES_NUMERIQUES = ['nombre', 'number', 'entier', 'decimal', 'numerique'];

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
@keyframes afGlissement {
    from { opacity: 0; transform: translateY(10px) scale(.985); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes afPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(217, 164, 65, 0); }
    50%      { box-shadow: 0 0 0 5px rgba(217, 164, 65, .12); }
}

.af-entree {
    opacity: 0;
    animation: afEntree .5s cubic-bezier(.22, 1, .36, 1) forwards;
}
.af-hero {
    background:
        radial-gradient(80% 120% at 100% 0%, rgba(217, 164, 65, .28) 0%, transparent 60%),
        linear-gradient(150deg, #5A2E1E 0%, #3B2218 55%, #26150E 100%);
}
.af-halo {
    background: radial-gradient(circle, rgba(184, 50, 42, .5) 0%, transparent 70%);
    animation: afHalo 9s ease-in-out infinite;
}
.af-tricolore {
    background: linear-gradient(90deg, #B8322A 0%, #D9A441 50%, #2F7D4F 100%);
}
.af-action {
    transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease,
        border-color .2s ease, color .2s ease;
}
.af-action:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 18px rgba(59, 34, 24, .14);
}
.af-action:active {
    transform: translateY(0) scale(.98);
}
.af-editeur {
    animation: afGlissement .28s cubic-bezier(.22, 1, .36, 1) both;
}
.af-reponse-active {
    border-color: rgba(217, 164, 65, .75) !important;
    background: linear-gradient(135deg, #FFFBF5, #FFF5DF) !important;
    animation: afPulse 2s ease-in-out infinite;
}
.af-champ {
    width: 100%;
    border: 1px solid #E8D9C3;
    border-radius: .65rem;
    background: #fff;
    padding: .7rem .85rem;
    color: #3B2218;
    font-size: .875rem;
    transition: border-color .2s ease, box-shadow .2s ease;
}
.af-champ:focus {
    outline: none;
    border-color: #D9A441;
    box-shadow: 0 0 0 3px rgba(217, 164, 65, .18);
}
.af-fond-page {
    background: linear-gradient(180deg, #FAF4EA 0%, #F6EFE3 100%);
}

.etiquette-superficie {
    background: rgba(255, 251, 245, .95);
    border: none;
    border-radius: 6px;
    box-shadow: 0 2px 6px rgba(59, 34, 24, .25);
    font-size: 11px;
    font-weight: 600;
    color: #3B2218;
    padding: 1px 6px;
}
.etiquette-superficie::before { display: none; }

.af-carte .leaflet-container {
    z-index: 0;
    font-family: inherit;
}
.af-carte .leaflet-popup-content-wrapper {
    border-radius: 14px;
    box-shadow: 0 12px 28px -8px rgba(59, 34, 24, .45);
    border-top: 3px solid #D9A441;
}
.af-carte .leaflet-popup-content {
    font-size: 12.5px;
    line-height: 1.55;
    color: #3B2218;
}

@media (prefers-reduced-motion: reduce) {
    .af-entree { animation: none !important; opacity: 1 !important; }
    .af-halo { animation: none !important; }
    .af-action, .af-editeur, .af-reponse-active {
        animation: none !important;
        transition: none !important;
    }
}
`;

// ============================================================
// ICÔNES
// ============================================================

const ICONES = {
    identite:
        'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
    questionnaire:
        'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z',
    carte:
        'M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z',
    parcelle:
        'M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z',
    pieds: 'M12 21V9m0 0c0-3 2-5 6-5 0 4-2 6-6 5Zm0 3c0-2.5-1.8-4-5-4 0 3.2 1.8 5 5 4Z',
    reponses:
        'M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z',
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
// FONCTIONS UTILITAIRES
// ============================================================

const estRenseigne = (v) => v !== null && v !== undefined && v !== '';

const nombreFr = (valeur, decimales = 0) =>
    Number(valeur ?? 0).toLocaleString('fr-FR', {
        maximumFractionDigits: decimales,
    });

const formaterHa = (valeur) =>
    estRenseigne(valeur) ? `${nombreFr(valeur, 2)} ha` : '—';

const pluriel = (n, mot, accord = '') =>
    `${n} ${mot}${n > 1 ? 's' : ''}${accord ? (n > 1 ? `${accord}s` : accord) : ''}`;

// Les popups Leaflet acceptent du HTML : on neutralise les caractères spéciaux.
const echapper = (texte) =>
    String(texte ?? '—').replace(
        /[&<>"']/g,
        (c) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
            })[c],
    );

const versCoordonnee = (coord) => {
    if (Array.isArray(coord) && coord.length >= 2) {
        return [Number(coord[0]), Number(coord[1])];
    }

    if (coord && coord.latitude != null && coord.longitude != null) {
        return [Number(coord.latitude), Number(coord.longitude)];
    }

    return null;
};

const initiales = (nom = '') =>
    nom
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((mot) => mot[0].toUpperCase())
        .join('');

function formaterReponse(valeur) {
    if (!valeur) return 'Non renseigné';

    const avecPrecision = (texte) =>
        valeur.autreTexte ? `${texte} (${valeur.autreTexte})` : texte;

    if (Array.isArray(valeur.valeurs)) {
        return valeur.valeurs.length === 0
            ? 'Non renseigné'
            : avecPrecision(valeur.valeurs.join(', '));
    }

    if (estRenseigne(valeur.valeur)) {
        return avecPrecision(String(valeur.valeur));
    }

    if (Array.isArray(valeur)) return valeur.join(', ');

    if (typeof valeur === 'string' || typeof valeur === 'number') {
        return String(valeur);
    }

    return 'Non renseigné';
}

// ============================================================
// CARTE LEAFLET DES PARCELLES
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
                    { attribution: '&copy; OpenStreetMap', maxZoom: 18 },
                ).addTo(carteRef.current);

                coucheMarqueursRef.current = L.layerGroup().addTo(carteRef.current);
                couchePolygonesRef.current = L.layerGroup().addTo(carteRef.current);
            }

            coucheMarqueursRef.current.clearLayers();
            couchePolygonesRef.current.clearLayers();

            const couleur =
                COULEURS_STATUT[normaliserStatutMenage(statutMenage)] ??
                COULEURS_STATUT[statutMenage] ??
                '#6366f1';

            const toutesLesCoordonnees = [];

            (parcelles ?? []).forEach((parcelle) => {
                const altitude = estRenseigne(parcelle.altitude)
                    ? `${nombreFr(parcelle.altitude)} m`
                    : '—';

                const popup =
                    `<strong>${echapper(codeMenage)}</strong><br>` +
                    `${echapper(parcelle.nombre_pieds)} pieds de café<br>` +
                    `Superficie : ${echapper(formaterHa(parcelle.superficie_ha))}<br>` +
                    `État : ${echapper(parcelle.etat_verger)}<br>` +
                    `Type : ${echapper(parcelle.type)}<br>` +
                    `Altitude : ${echapper(altitude)}`;

                if (Array.isArray(parcelle.polygone) && parcelle.polygone.length >= 3) {
                    const coordonnees = parcelle.polygone
                        .map(versCoordonnee)
                        .filter((c) => c && c.every(Number.isFinite));

                    if (coordonnees.length >= 3) {
                        const polygone = L.polygon(coordonnees, {
                            color: couleur,
                            fillColor: couleur,
                            fillOpacity: 0.25,
                            weight: 2,
                        }).bindPopup(popup);

                        if (estRenseigne(parcelle.superficie_ha)) {
                            polygone.bindTooltip(formaterHa(parcelle.superficie_ha), {
                                permanent: true,
                                direction: 'center',
                                className: 'etiquette-superficie',
                            });
                        }

                        polygone.addTo(couchePolygonesRef.current);
                        toutesLesCoordonnees.push(...coordonnees);
                    }
                }

                if (parcelle.latitude != null && parcelle.longitude != null) {
                    const latitude = Number(parcelle.latitude);
                    const longitude = Number(parcelle.longitude);

                    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
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
                carteRef.current.fitBounds(L.latLngBounds(toutesLesCoordonnees), {
                    padding: [30, 30],
                });
            }

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

    useEffect(
        () => () => {
            carteRef.current?.remove();
            carteRef.current = null;
        },
        [],
    );

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

function Section({ titre, description, icone, droite, ordre = 0, children }) {
    return (
        <section
            className="af-entree relative overflow-hidden rounded-2xl border border-[#E8D9C3]/70 bg-white shadow-sm"
            style={{ animationDelay: `${ordre * 70}ms` }}
        >
            <span
                aria-hidden="true"
                className="af-tricolore absolute inset-x-0 top-0 h-1"
            />

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

function EtatVide({ texte }) {
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
            className="af-action inline-flex min-h-9 items-center justify-center rounded-lg border border-[#B8322A]/30 bg-white px-3 py-2 text-xs font-semibold text-[#B8322A] hover:border-[#B8322A] hover:bg-[#B8322A] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#B8322A]/40"
        >
            {children}
        </button>
    );
}

function Indicateur({ icone, valeur, libelle }) {
    return (
        <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm transition duration-300 hover:bg-white/15 sm:p-4">
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

// ============================================================
// ÉDITEUR D'UNE RÉPONSE AU QUESTIONNAIRE
// ============================================================

const texteOption = (option, cles) => {
    if (typeof option === 'string' || typeof option === 'number') {
        return String(option);
    }

    for (const cle of cles) {
        if (option?.[cle] !== undefined && option?.[cle] !== null) {
            return String(option[cle]);
        }
    }

    return '';
};

const valeurOption = (option) =>
    texteOption(option, ['value', 'valeur', 'libelle', 'label']);

const libelleOption = (option) =>
    texteOption(option, ['label', 'libelle', 'value', 'valeur']);

function EditeurReponse({ reponse, menageId, onAnnuler }) {
    const question = reponse.question ?? {};
    const initiale = reponse.valeur ?? {};
    const type = question.type ?? '';

    const estMultiple = TYPES_MULTIPLES.includes(type);
    const estChoixUnique = TYPES_UNIQUES.includes(type);
    const estTexteLong = TYPES_TEXTE_LONG.includes(type);
    const estNumerique = TYPES_NUMERIQUES.includes(type);
    const estDate = type === 'date';

    const [valeur, setValeur] = useState(
        estMultiple
            ? Array.isArray(initiale.valeurs)
                ? initiale.valeurs
                : []
            : String(initiale.valeur ?? ''),
    );
    const [autreTexte, setAutreTexte] = useState(initiale.autreTexte ?? '');
    const [erreur, setErreur] = useState('');

    const options = Array.isArray(question.options) ? question.options : [];

    const modifierChoixMultiple = (choix, coche) => {
        setValeur((courant) =>
            coche
                ? [...courant.filter((item) => item !== choix), choix]
                : courant.filter((item) => item !== choix),
        );
    };

    const enregistrer = () => {
        setErreur('');

        const complement = autreTexte.trim()
            ? { autreTexte: autreTexte.trim() }
            : {};

        const nouvelleValeur = estMultiple
            ? { valeurs: valeur, ...complement }
            : { valeur, ...complement };

        router.put(
            route('menages.reponses.update', [menageId, reponse.id]),
            { valeur: nouvelleValeur },
            {
                preserveScroll: true,
                onError: (errors) => {
                    setErreur(
                        errors['valeur.valeur'] ??
                            errors['valeur.valeurs'] ??
                            errors['valeur'] ??
                            'La modification a échoué. Vérifiez la réponse saisie.',
                    );
                },
                onSuccess: () => onAnnuler(),
            },
        );
    };

    return (
        <div className="af-editeur mt-3 rounded-xl border border-[#D9A441] bg-gradient-to-br from-[#FFF9ED] to-white p-4 shadow-md shadow-[#3B2218]/5">
            <div className="mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D9A441]/20 text-[#805B16]">
                    <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.862 4.487l1.687-1.688a2.25 2.25 0 113.182 3.182l-9.5 9.5a4.5 4.5 0 01-1.897 1.13l-3.18.91.91-3.18a4.5 4.5 0 011.13-1.897l7.668-7.957z"
                        />
                    </svg>
                </span>

                <p className="text-sm font-bold text-[#3B2218]">
                    Modifier la réponse
                </p>
            </div>

            {estMultiple ? (
                <div className="space-y-2">
                    {options.length > 0 ? (
                        options.map((option, index) => {
                            const choix = valeurOption(option);

                            return (
                                <label
                                    key={`${choix}-${index}`}
                                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#E8D9C3] bg-white p-3 text-sm text-[#3B2218] transition hover:border-[#D9A441] hover:bg-[#FFF9ED]"
                                >
                                    <input
                                        type="checkbox"
                                        checked={valeur.includes(choix)}
                                        onChange={(e) =>
                                            modifierChoixMultiple(choix, e.target.checked)
                                        }
                                        className="rounded border-[#C9B99F] text-[#2F7D4F] focus:ring-[#2F7D4F]"
                                    />
                                    <span>{libelleOption(option)}</span>
                                </label>
                            );
                        })
                    ) : (
                        <textarea
                            value={valeur.join(', ')}
                            onChange={(e) =>
                                setValeur(
                                    e.target.value
                                        .split(',')
                                        .map((item) => item.trim())
                                        .filter(Boolean),
                                )
                            }
                            rows={3}
                            placeholder="Séparez les choix par des virgules"
                            className="af-champ"
                        />
                    )}
                </div>
            ) : estChoixUnique && options.length > 0 ? (
                <select
                    value={valeur}
                    onChange={(e) => setValeur(e.target.value)}
                    className="af-champ"
                >
                    <option value="">Sélectionner une réponse</option>

                    {options.map((option, index) => (
                        <option
                            key={`${valeurOption(option)}-${index}`}
                            value={valeurOption(option)}
                        >
                            {libelleOption(option)}
                        </option>
                    ))}
                </select>
            ) : estTexteLong ? (
                <textarea
                    value={valeur}
                    onChange={(e) => setValeur(e.target.value)}
                    rows={4}
                    className="af-champ"
                />
            ) : (
                <input
                    type={estDate ? 'date' : estNumerique ? 'number' : 'text'}
                    step={
                        type === 'decimal' || type === 'numerique'
                            ? 'any'
                            : undefined
                    }
                    value={valeur}
                    onChange={(e) => setValeur(e.target.value)}
                    className="af-champ"
                />
            )}

            {question.autre_option && (
                <div className="mt-3">
                    <label className="mb-1 block text-xs font-semibold text-[#6B4A36]">
                        Précision / Autre réponse
                    </label>

                    <input
                        type="text"
                        value={autreTexte}
                        onChange={(e) => setAutreTexte(e.target.value)}
                        maxLength={2000}
                        className="af-champ"
                        placeholder="Précisez votre réponse..."
                    />
                </div>
            )}

            {erreur && (
                <p
                    role="alert"
                    className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
                >
                    {erreur}
                </p>
            )}

            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[#E8D9C3] pt-4">
                <button
                    type="button"
                    onClick={onAnnuler}
                    className="af-action rounded-lg border border-[#E8D9C3] bg-white px-4 py-2 text-sm font-semibold text-[#6B4A36] hover:bg-[#F8F1E7]"
                >
                    Annuler
                </button>

                <button
                    type="button"
                    onClick={enregistrer}
                    className="af-action rounded-lg bg-gradient-to-r from-[#2F7D4F] to-[#25663F] px-5 py-2 text-sm font-semibold text-white shadow-md shadow-[#2F7D4F]/20 hover:from-[#25663F] hover:to-[#1F5635] focus:outline-none focus:ring-2 focus:ring-[#2F7D4F]/40"
                >
                    Enregistrer
                </button>
            </div>
        </div>
    );
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================

export default function Afficher({ menage, peutModifier, peutDupliquer }) {
    const { flash } = usePage().props;
    const [reponseEnCours, setReponseEnCours] = useState(null);

    const reponses = useMemo(
        () =>
            [...(menage.reponses ?? [])].sort(
                (a, b) => (a.question?.ordre ?? 0) - (b.question?.ordre ?? 0),
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

    const supprimerParcelle = (parcelle) => {
        if (
            !confirm(
                `Supprimer cette parcelle (${parcelle.nombre_pieds ?? '—'} pieds de café) ? Cette action est irréversible.`,
            )
        ) {
            return;
        }

        router.delete(
            route('menages.parcelles.destroy', [menage.id, parcelle.id]),
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
            route('menages.reponses.destroy', [menage.id, reponse.id]),
            { preserveScroll: true },
        );
    };

    const supprimerToutesLesReponses = () => {
        if (
            !confirm(
                `Supprimer les ${reponses.length} réponses au questionnaire ? Cette action est irréversible.`,
            )
        ) {
            return;
        }

        router.delete(route('menages.reponses.destroy-all', menage.id), {
            preserveScroll: true,
        });
    };

    const collinesAffichees = [menage.colline, ...(menage.collines ?? [])].filter(
        (colline, index, collines) =>
            colline && collines.findIndex((c) => c?.id === colline.id) === index,
    );

    const localisation = collinesAffichees
        .map((colline) =>
            [
                colline.zone?.commune?.province?.nom,
                colline.zone?.commune?.nom,
                colline.zone?.nom,
                colline.nom,
            ]
                .filter(Boolean)
                .join(' > '),
        )
        .join(' | ');

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
                                <PrimaryButton type="button">Dupliquer</PrimaryButton>
                            </Link>
                        )}

                        {peutModifier && (
                            <Link
                                href={route('menages.edit', menage.id)}
                                className="flex-1 sm:flex-none"
                            >
                                <PrimaryButton type="button">Modifier</PrimaryButton>
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
                                    valeur={nombreFr(parcelles.length)}
                                />
                                <Indicateur
                                    icone={ICONES.pieds}
                                    libelle="Pieds de café"
                                    valeur={nombreFr(totalPieds)}
                                />
                                <Indicateur
                                    icone={ICONES.carte}
                                    libelle="Superficie"
                                    valeur={formaterHa(totalSuperficie)}
                                />
                                <Indicateur
                                    icone={ICONES.reponses}
                                    libelle="Réponses"
                                    valeur={nombreFr(reponses.length)}
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
                            <Ligne libelle="Code Caféiculteur" valeur={menage.code_menage} />
                            <Ligne libelle="Caféiculteur" valeur={nomComplet} />
                            <Ligne libelle="Téléphone" valeur={menage.telephone} />
                            <Ligne
                                libelle="Enquêteur assigné"
                                valeur={menage.enqueteur?.name}
                            />

                            <div className="md:col-span-2">
                                <Ligne libelle="Localisation" valeur={localisation} />
                            </div>

                            <Ligne libelle="Statut" valeur={statut.texte} />
                        </div>
                    </Section>

                    {/* Réponses au questionnaire */}
                    <Section
                        titre="Réponses au questionnaire"
                        description={pluriel(reponses.length, 'réponse', '') + (reponses.length > 1 ? ' enregistrées' : ' enregistrée')}
                        icone={ICONES.questionnaire}
                        droite={
                            peutModifier && reponses.length > 0 ? (
                                <BoutonSupprimer onClick={supprimerToutesLesReponses}>
                                    Supprimer toutes les réponses
                                </BoutonSupprimer>
                            ) : null
                        }
                        ordre={2}
                    >
                        {reponses.length === 0 ? (
                            <EtatVide texte="Aucune réponse au questionnaire pour ce Caféiculteur." />
                        ) : (
                            <div className="divide-y divide-[#EFE3D0]">
                                {reponses.map((reponse, index) => {
                                    const enEdition = reponseEnCours === reponse.id;

                                    return (
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
                                                            <div className="flex shrink-0 flex-wrap gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setReponseEnCours(
                                                                            enEdition ? null : reponse.id,
                                                                        )
                                                                    }
                                                                    className="af-action inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#D9A441]/40 bg-[#FFF5D9] px-3 py-1.5 text-xs font-bold text-[#805B16] shadow-sm hover:border-[#D9A441] hover:bg-[#D9A441]/25 focus:outline-none focus:ring-2 focus:ring-[#D9A441]/40"
                                                                >
                                                                    {enEdition ? 'Fermer' : 'Modifier'}
                                                                </button>

                                                                <BoutonSupprimer
                                                                    onClick={() => supprimerReponse(reponse)}
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

                                                    <div
                                                        className={`mt-3 rounded-xl border border-[#EFE3D0] border-l-4 border-l-[#D9A441] bg-[#FFFBF5] p-3 transition-colors duration-200 sm:p-4 ${
                                                            enEdition ? 'af-reponse-active' : ''
                                                        }`}
                                                    >
                                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8A705D]">
                                                            Réponse
                                                        </p>

                                                        <p className="mt-1 break-words text-sm font-semibold leading-6 text-[#3B2218]">
                                                            {formaterReponse(reponse.valeur)}
                                                        </p>
                                                    </div>

                                                    {enEdition && (
                                                        <EditeurReponse
                                                            reponse={reponse}
                                                            menageId={menage.id}
                                                            onAnnuler={() => setReponseEnCours(null)}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </Section>

                    {/* Carte des parcelles */}
                    <Section
                        titre="Localisation des parcelles"
                        description={
                            pluriel(parcelles.length, 'parcelle') +
                            (parcelles.length > 1 ? ' enregistrées' : ' enregistrée')
                        }
                        icone={ICONES.carte}
                        droite={<LegendeStatut />}
                        ordre={3}
                    >
                        {parcelles.length === 0 ? (
                            <EtatVide texte="Aucune parcelle géolocalisée pour l'instant." />
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
                        description={
                            pluriel(parcelles.length, 'parcelle') +
                            (parcelles.length > 1 ? ' associées' : ' associée') +
                            ' à ce Caféiculteur'
                        }
                        icone={ICONES.parcelle}
                        ordre={4}
                    >
                        {parcelles.length === 0 ? (
                            <EtatVide texte="Aucune parcelle géolocalisée pour l'instant." />
                        ) : (
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                {parcelles.map((parcelle, index) => (
                                    <article
                                        key={parcelle.id}
                                        className="af-entree group relative overflow-hidden rounded-xl border border-[#E8D9C3] bg-white p-4 transition duration-300 hover:-translate-y-1 hover:border-[#D9A441] hover:shadow-xl hover:shadow-[#3B2218]/10"
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

                                                {estRenseigne(parcelle.superficie_ha) && (
                                                    <span className="rounded-full bg-[#2F7D4F]/10 px-3 py-1 text-xs font-semibold text-[#25663F] ring-1 ring-[#2F7D4F]/25">
                                                        {formaterHa(parcelle.superficie_ha)}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                                                <Ligne libelle="État du verger" valeur={parcelle.etat_verger} />
                                                <Ligne libelle="Type" valeur={parcelle.type} />
                                                <Ligne libelle="Latitude" valeur={parcelle.latitude} />
                                                <Ligne libelle="Longitude" valeur={parcelle.longitude} />
                                                <Ligne
                                                    libelle="Altitude"
                                                    valeur={
                                                        estRenseigne(parcelle.altitude)
                                                            ? `${parcelle.altitude} m`
                                                            : '—'
                                                    }
                                                />
                                            </div>

                                            {peutModifier && (
                                                <div className="flex justify-end border-t border-[#EFE3D0] pt-3">
                                                    <BoutonSupprimer
                                                        onClick={() => supprimerParcelle(parcelle)}
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