
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';

// ============================================================
// PALETTE CAFÉ
// ============================================================

const CAFE = {
    fonce: '#3E2723',
    brun: '#5D4037',
    moka: '#795548',
    caramel: '#A47148',
    lait: '#C49A6C',
    creme: '#F5EFE6',
    beige: '#E8DCCB',
    vert: '#557A46',
};

// ============================================================
// COULEURS DES STATUTS
// ============================================================

const COULEURS_STATUT = {
    termine: '#16a34a',
    en_attente: '#d97706',
    a_faire: '#9ca3af',
};

// ============================================================
// CARTE LEAFLET DU BURUNDI
// ============================================================

function CarteBurundi({ points = [] }) {
    const conteneurRef = useRef(null);
    const carteRef = useRef(null);
    const coucheMarqueursRef = useRef(null);
    const couchePolygonesRef = useRef(null);

    useEffect(() => {
        let annule = false;

        import('leaflet').then((L) => {
            if (annule || !conteneurRef.current) return;

            if (!carteRef.current) {
                carteRef.current = L.map(conteneurRef.current, {
                    zoomControl: true,
                    scrollWheelZoom: true,
                }).setView([-3.373, 29.918], 8);

                L.tileLayer(
                    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    {
                        attribution: '&copy; OpenStreetMap',
                        maxZoom: 18,
                    },
                ).addTo(carteRef.current);

                coucheMarqueursRef.current =
                    L.layerGroup().addTo(carteRef.current);

                couchePolygonesRef.current =
                    L.layerGroup().addTo(carteRef.current);
            }

            coucheMarqueursRef.current.clearLayers();
            couchePolygonesRef.current.clearLayers();

            const toutesLesCoordonnees = [];

            const altitudesValides = points
                .map((p) => Number(p.altitude))
                .filter((a) => Number.isFinite(a));

            const altitudeMin = altitudesValides.length
                ? Math.min(...altitudesValides)
                : null;

            const altitudeMax = altitudesValides.length
                ? Math.max(...altitudesValides)
                : null;

            const RAYON_MIN = 5;
            const RAYON_MAX = 12;

            const rayonPourAltitude = (altitude) => {
                if (
                    altitude === null ||
                    altitude === undefined ||
                    !Number.isFinite(Number(altitude)) ||
                    altitudeMin === null ||
                    altitudeMax === null ||
                    altitudeMax === altitudeMin
                ) {
                    return RAYON_MIN;
                }

                const ratio =
                    (Number(altitude) - altitudeMin) /
                    (altitudeMax - altitudeMin);

                return RAYON_MIN + ratio * (RAYON_MAX - RAYON_MIN);
            };

            points.forEach((point) => {
                const couleur =
                    COULEURS_STATUT[point.statut_menage] ?? CAFE.moka;

                const altitudeTexte =
                    point.altitude !== null &&
                    point.altitude !== undefined &&
                    Number.isFinite(Number(point.altitude))
                        ? `${Number(point.altitude).toFixed(0)} m`
                        : '—';

                const superficieTexte =
                    point.superficie_ha !== null &&
                    point.superficie_ha !== undefined &&
                    Number.isFinite(Number(point.superficie_ha))
                        ? `${Number(point.superficie_ha).toLocaleString(
                              'fr-FR',
                              { maximumFractionDigits: 2 },
                          )} ha`
                        : '—';

                const popup =
                    `<strong>${point.code_menage ?? 'Ménage'}</strong><br>` +
                    `${point.nom_chef_menage ?? ''}<br>` +
                    `${point.nombre_pieds ?? '—'} pieds de café<br>` +
                    `Superficie : ${superficieTexte}<br>` +
                    `État : ${point.etat_verger ?? '—'}<br>` +
                    `Type : ${point.type ?? '—'}<br>` +
                    `Altitude : ${altitudeTexte}`;

                // POLYGONES DES PARCELLES
                if (
                    Array.isArray(point.polygone) &&
                    point.polygone.length >= 3
                ) {
                    const coordinates = point.polygone
                        .map((coord) => {
                            if (
                                Array.isArray(coord) &&
                                coord.length >= 2
                            ) {
                                return [
                                    Number(coord[0]),
                                    Number(coord[1]),
                                ];
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
                        .filter(
                            (coord) =>
                                coord &&
                                Number.isFinite(coord[0]) &&
                                Number.isFinite(coord[1]),
                        );

                    if (coordinates.length >= 3) {
                        const polygoneLayer = L.polygon(coordinates, {
                            color: couleur,
                            fillColor: couleur,
                            fillOpacity: 0.25,
                            weight: 2,
                        }).bindPopup(popup);

                        if (
                            point.superficie_ha !== null &&
                            point.superficie_ha !== undefined
                        ) {
                            polygoneLayer.bindTooltip(
                                `${Number(point.superficie_ha).toLocaleString(
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

                        polygoneLayer.addTo(
                            couchePolygonesRef.current,
                        );

                        toutesLesCoordonnees.push(...coordinates);
                    }
                }

                // POINTS GPS
                if (
                    point.latitude != null &&
                    point.longitude != null
                ) {
                    const latitude = Number(point.latitude);
                    const longitude = Number(point.longitude);

                    if (
                        Number.isFinite(latitude) &&
                        Number.isFinite(longitude)
                    ) {
                        L.circleMarker(
                            [latitude, longitude],
                            {
                                radius: rayonPourAltitude(point.altitude),
                                color: couleur,
                                fillColor: couleur,
                                fillOpacity: 0.8,
                                weight: 1,
                            },
                        )
                            .bindPopup(popup)
                            .addTo(coucheMarqueursRef.current);

                        toutesLesCoordonnees.push([
                            latitude,
                            longitude,
                        ]);
                    }
                }
            });

            if (toutesLesCoordonnees.length > 0) {
                const bornes = L.latLngBounds(toutesLesCoordonnees);

                carteRef.current.fitBounds(bornes, {
                    padding: [30, 30],
                    maxZoom: 15,
                });
            } else {
                carteRef.current.setView([-3.373, 29.918], 8);
            }

            setTimeout(() => {
                if (!annule && carteRef.current) {
                    carteRef.current.invalidateSize();
                }
            }, 100);
        });

        return () => {
            annule = true;
        };
    }, [points]);

    useEffect(() => {
        const redimensionner = () => {
            carteRef.current?.invalidateSize();
        };

        window.addEventListener('resize', redimensionner);

        return () => {
            window.removeEventListener('resize', redimensionner);
        };
    }, []);

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
                    background: rgba(245, 239, 230, 0.96);
                    border: 1px solid #C49A6C;
                    border-radius: 6px;
                    box-shadow: 0 2px 6px rgba(62, 39, 35, 0.2);
                    font-size: 11px;
                    font-weight: 700;
                    color: #3E2723;
                    padding: 1px 6px;
                }

                .etiquette-superficie::before {
                    display: none;
                }

                .leaflet-container {
                    z-index: 0;
                    font-family: inherit;
                }

                .dash-carte .leaflet-popup-content-wrapper {
                    border-radius: 14px;
                    box-shadow: 0 12px 28px -8px rgba(62, 39, 35, 0.35);
                    border-top: 3px solid #A47148;
                }

                .dash-carte .leaflet-popup-content {
                    font-size: 12.5px;
                    line-height: 1.55;
                    color: #3E2723;
                }

                .dash-carte .leaflet-control-zoom a {
                    color: #5D4037;
                }

                @media (max-width: 640px) {
                    .leaflet-control-zoom {
                        transform: scale(0.9);
                        transform-origin: top left;
                    }
                }
            `}</style>

            <div
                ref={conteneurRef}
                className="dash-carte z-0 h-[350px] w-full overflow-hidden rounded-xl sm:h-[420px] md:h-[480px] lg:h-[600px]"
            />
        </>
    );
}

// ============================================================
// STYLES ET ANIMATIONS - THÈME CAFÉ
// ============================================================

const STYLES_PAGE = `
@keyframes dashEntree {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
}

@keyframes dashBarre {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(350%); }
}

@keyframes dashHalo {
    0%, 100% { transform: translate(0, 0) scale(1); opacity: .4; }
    50%      { transform: translate(-20px, 16px) scale(1.15); opacity: .75; }
}

@keyframes dashReflet {
    from { transform: translateX(-120%); }
    to   { transform: translateX(320%); }
}

@keyframes dashPulse {
    0%   { transform: scale(1); opacity: .6; }
    100% { transform: scale(2.2); opacity: 0; }
}

.anim-dash-carte {
    opacity: 0;
    animation: dashEntree .55s cubic-bezier(.22, 1, .36, 1) forwards;
}

.anim-dash-barre {
    animation: dashBarre 1s ease-in-out infinite;
}

.dash-banniere {
    background:
        radial-gradient(90% 120% at 100% 0%, rgba(196, 154, 108, .30) 0%, transparent 60%),
        linear-gradient(145deg, #3E2723 0%, #5D4037 55%, #795548 100%);
}

.dash-halo {
    background: radial-gradient(circle, rgba(196, 154, 108, .65) 0%, transparent 70%);
    animation: dashHalo 9s ease-in-out infinite;
}

.dash-pulse {
    animation: dashPulse 2s ease-out infinite;
}

.dash-fond-vert {
    background: linear-gradient(135deg, #557A46 0%, #355E36 100%);
    box-shadow: 0 8px 16px -6px rgba(53, 94, 54, .4);
}

.dash-fond-ambre {
    background: linear-gradient(135deg, #D69B45 0%, #A66A24 100%);
    box-shadow: 0 8px 16px -6px rgba(166, 106, 36, .4);
}

.dash-fond-rouge {
    background: linear-gradient(135deg, #A47148 0%, #70452F 100%);
    box-shadow: 0 8px 16px -6px rgba(112, 69, 47, .4);
}

.dash-fond-sombre {
    background: linear-gradient(135deg, #5D4037 0%, #3E2723 100%);
    box-shadow: 0 8px 16px -6px rgba(62, 39, 35, .4);
}

.dash-segment {
    position: relative;
    overflow: hidden;
    transition: width 1.1s cubic-bezier(.22, 1, .36, 1);
}

.dash-segment::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 30%;
    background: linear-gradient(100deg, transparent, rgba(255,255,255,.5), transparent);
    transform: translateX(-120%);
    animation: dashReflet 2.4s ease-in-out 1.2s 1;
}

.dash-drapeau {
    background: linear-gradient(
        90deg,
        #3E2723 0%,
        #795548 25%,
        #C49A6C 50%,
        #795548 75%,
        #3E2723 100%
    );
    background-size: 200% 100%;
    animation: dashReflet 7s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
    .anim-dash-carte,
    .anim-dash-barre,
    .dash-drapeau,
    .dash-halo,
    .dash-pulse,
    .dash-segment::after {
        animation: none !important;
    }

    .anim-dash-carte {
        opacity: 1 !important;
    }

    .dash-segment {
        transition: none !important;
    }
}
`;

// ============================================================
// ICÔNES
// ============================================================

const ICONES = {
    termine: 'm8.5 12 2.25 2.25L15.5 9.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    attente: 'M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    restants: 'M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5',
    total: 'M17 20h5v-2a3 3 0 0 0-5.196-2.05M17 20H7m10 0v-2c0-.7-.12-1.37-.34-1.98M7 20H2v-2a3 3 0 0 1 5.196-2.05M7 20v-2c0-.7.12-1.37.34-1.98m0 0a5 5 0 0 1 9.32 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    parcelles: 'M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z',
    pieds: 'M12 21V9m0 0c0-3 2-5 6-5 0 4-2 6-6 5Zm0 3c0-2.5-1.8-4-5-4 0 3.2 1.8 5 5 4Z',
    superficie: 'M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z',
};

// ============================================================
// ANIMATIONS DES COMPTEURS
// ============================================================

const mouvementReduit = () =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function useCompteurAnime(cible, duree = 1000) {
    const valeurCible = Number(cible ?? 0);
    const [valeur, setValeur] = useState(0);

    useEffect(() => {
        if (mouvementReduit() || valeurCible === 0) {
            setValeur(valeurCible);
            return;
        }

        let image;
        const debut = performance.now();

        const etape = (maintenant) => {
            const progression = Math.min((maintenant - debut) / duree, 1);
            const adoucie = 1 - Math.pow(1 - progression, 3);

            if (progression >= 1) {
                setValeur(valeurCible);
                return;
            }

            setValeur(
                Number.isInteger(valeurCible)
                    ? Math.round(valeurCible * adoucie)
                    : Math.round(valeurCible * adoucie * 100) / 100,
            );

            image = requestAnimationFrame(etape);
        };

        image = requestAnimationFrame(etape);

        return () => cancelAnimationFrame(image);
    }, [valeurCible, duree]);

    return valeur;
}

function useMonte(retard = 120) {
    const [monte, setMonte] = useState(mouvementReduit());

    useEffect(() => {
        if (monte) return;

        const minuteur = setTimeout(() => setMonte(true), retard);

        return () => clearTimeout(minuteur);
    }, [monte, retard]);

    return monte;
}

// ============================================================
// CARTE KPI
// ============================================================

function CarteKpi({
    titre,
    valeur,
    sousTitre,
    formater,
    fond,
    icone,
    ordre = 0,
    className = '',
}) {
    const affichee = useCompteurAnime(valeur);

    return (
        <div
            className={`anim-dash-carte group relative min-w-0 overflow-hidden rounded-2xl border border-[#E8DCCB] bg-white p-3 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-5 lg:p-6 ${className}`}
            style={{ animationDelay: `${ordre * 70}ms` }}
        >
            <span
                aria-hidden="true"
                className={`${fond} absolute inset-x-0 top-0 h-1`}
            />

            <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-[#795548] sm:text-sm">
                    {titre}
                </p>

                <span
                    className={`${fond} flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 sm:h-10 sm:w-10 sm:rounded-xl`}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-4 w-4 sm:h-5 sm:w-5"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d={icone}
                        />
                    </svg>
                </span>
            </div>

            <p className="mt-2 break-words text-xl font-bold tabular-nums tracking-tight text-[#3E2723] sm:text-2xl lg:text-3xl">
                {formater(affichee)}
            </p>

            {sousTitre && (
                <p className="mt-1 text-[11px] text-[#A1887F] sm:text-xs">
                    {sousTitre}
                </p>
            )}
        </div>
    );
}

// ============================================================
// FILTRES TERRITORIAUX
// ============================================================

function FiltreSelect({
    label,
    valeur,
    onChange,
    options,
    placeholder,
    disabled = false,
}) {
    return (
        <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-semibold text-[#5D4037]">
                {label}
            </label>

            <select
                value={valeur ?? ''}
                onChange={onChange}
                disabled={disabled}
                className="w-full min-w-0 rounded-xl border-[#D7C5B3] bg-[#FAF7F2] text-sm text-[#3E2723] shadow-sm transition duration-200 hover:border-[#A47148] focus:border-[#795548] focus:bg-white focus:ring-2 focus:ring-[#A47148]/25 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            >
                <option value="">{placeholder}</option>

                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.nom}
                    </option>
                ))}
            </select>
        </div>
    );
}

// ============================================================
// LÉGENDE
// ============================================================

function LegendeStatut() {
    const elements = [
        { nom: 'Terminé', couleur: 'bg-green-600' },
        { nom: 'En attente', couleur: 'bg-amber-500' },
        { nom: 'À faire', couleur: 'bg-gray-400' },
    ];

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {elements.map((element) => (
                <div
                    key={element.nom}
                    className="flex items-center gap-1.5 rounded-full bg-[#FAF7F2] px-2.5 py-1 text-xs text-[#5D4037] ring-1 ring-[#E8DCCB]"
                >
                    <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${element.couleur}`}
                    />
                    {element.nom}
                </div>
            ))}
        </div>
    );
}

// ============================================================
// BANNIÈRE D'AVANCEMENT
// ============================================================

function BanniereAvancement({ kpi, nombre }) {
    const monte = useMonte();

    const total = Number(kpi.menages_total ?? 0);
    const termines = Number(kpi.menages_termines ?? 0);
    const attente = Number(kpi.menages_en_attente ?? 0);
    const aFaire = Number(kpi.menages_a_faire ?? 0);

    const part = (valeur) =>
        total > 0 ? (valeur / total) * 100 : 0;

    const taux = useCompteurAnime(kpi.taux_avancement ?? 0);

    const segments = [
        {
            cle: 'termine',
            nom: 'Terminés',
            valeur: termines,
            classe: 'bg-green-400',
            point: 'bg-green-400',
        },
        {
            cle: 'attente',
            nom: 'En attente',
            valeur: attente,
            classe: 'bg-amber-400',
            point: 'bg-amber-400',
        },
        {
            cle: 'afaire',
            nom: 'À faire',
            valeur: aFaire,
            classe: 'bg-[#C49A6C]',
            point: 'bg-[#C49A6C]',
        },
    ];

    return (
        <div
            className="anim-dash-carte dash-banniere relative overflow-hidden rounded-2xl shadow-lg shadow-[#3E2723]/20"
            style={{ animationDelay: '0ms' }}
        >
            <div
                aria-hidden="true"
                className="dash-halo pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full blur-2xl"
            />

            <div className="relative p-5 sm:p-6 lg:p-7">
                <div className="flex flex-wrap items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 min-w-[4rem] items-center justify-center rounded-2xl bg-[#F5EFE6] px-3 text-2xl font-bold tabular-nums text-[#3E2723] shadow-lg shadow-black/25 ring-1 ring-white/40">
                            {Number(taux).toLocaleString('fr-FR', {
                                maximumFractionDigits: 1,
                            })}
                            %
                        </div>

                        <div>
                            <h3 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                                Avancement de l'enquête
                            </h3>

                            <p className="mt-0.5 flex items-center gap-2 text-sm text-[#E8DCCB]">
                                <span className="relative flex h-2 w-2">
                                    <span className="dash-pulse absolute inline-flex h-full w-full rounded-full bg-green-400" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                                </span>
                                {nombre(termines)} sur {nombre(total)} ménages terminés
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                        {segments.map((s) => (
                            <div
                                key={s.cle}
                                className="flex items-center gap-2 text-xs text-[#F5EFE6]/80"
                            >
                                <span
                                    className={`h-2.5 w-2.5 rounded-full ${s.point}`}
                                />
                                <span>{s.nom}</span>
                                <span className="font-semibold tabular-nums text-white">
                                    {nombre(s.valeur)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-5 flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-black/25 p-0.5">
                    {segments.map((s) => (
                        <div
                            key={s.cle}
                            className={`dash-segment h-full rounded-full ${s.classe}`}
                            style={{
                                width: monte ? `${part(s.valeur)}%` : '0%',
                            }}
                            title={`${s.nom} : ${nombre(s.valeur)}`}
                        />
                    ))}
                </div>
            </div>

            <div className="dash-drapeau h-1 w-full" aria-hidden="true" />
        </div>
    );
}

// ============================================================
// DASHBOARD PRINCIPAL
// ============================================================

export default function Dashboard({
    kpi,
    pointsCarte,
    filtres,
    provinces,
    communes,
    zones,
    collines,
}) {
    const [chargement, setChargement] = useState(false);

    const communesFiltrees = useMemo(
        () =>
            communes.filter(
                (c) =>
                    !filtres.province_id ||
                    Number(c.province_id) === Number(filtres.province_id),
            ),
        [communes, filtres.province_id],
    );

    const zonesFiltrees = useMemo(
        () =>
            zones.filter(
                (z) =>
                    !filtres.commune_id ||
                    Number(z.commune_id) === Number(filtres.commune_id),
            ),
        [zones, filtres.commune_id],
    );

    const collinesFiltrees = useMemo(
        () =>
            collines.filter(
                (c) =>
                    !filtres.zone_id ||
                    Number(c.zone_id) === Number(filtres.zone_id),
            ),
        [collines, filtres.zone_id],
    );

    const appliquerFiltre = (cle, valeur) => {
        const nouveauxFiltres = {
            ...filtres,
            [cle]: valeur || undefined,
        };

        if (cle === 'province_id') {
            delete nouveauxFiltres.commune_id;
            delete nouveauxFiltres.zone_id;
            delete nouveauxFiltres.colline_id;
        } else if (cle === 'commune_id') {
            delete nouveauxFiltres.zone_id;
            delete nouveauxFiltres.colline_id;
        } else if (cle === 'zone_id') {
            delete nouveauxFiltres.colline_id;
        }

        router.get(route('dashboard'), nouveauxFiltres, {
            preserveState: true,
            preserveScroll: true,
            onStart: () => setChargement(true),
            onFinish: () => setChargement(false),
        });
    };

    const nombre = (valeur) =>
        Number(valeur ?? 0).toLocaleString('fr-FR');

    const hectares = (valeur) =>
        `${Number(valeur ?? 0).toLocaleString('fr-FR', {
            maximumFractionDigits: 2,
        })} ha`;

    return (
        <AuthenticatedLayout
            header={
                <div className="min-w-0">
                    <h2 className="text-lg font-bold leading-tight text-[#3E2723] sm:text-xl">
                        Tableau de bord
                    </h2>

                    <p className="mt-1 text-xs text-[#8D6E63] sm:text-sm">
                        Vue générale des activités de géolocalisation
                    </p>
                </div>
            }
        >
            <Head title="Tableau de bord" />

            <style>{STYLES_PAGE}</style>

            <div className="min-h-screen w-full bg-[#FAF7F2] py-4 sm:py-6 lg:py-8">
                <div className="mx-auto w-full max-w-7xl space-y-5 px-3 sm:space-y-6 sm:px-5 lg:px-8">

                    {/* AVANCEMENT GLOBAL */}
                    <BanniereAvancement kpi={kpi} nombre={nombre} />

                    {/* FILTRES TERRITORIAUX */}
                    <section
                        className="anim-dash-carte relative overflow-hidden rounded-2xl border border-[#E8DCCB] bg-white p-3 shadow-sm sm:p-5"
                        style={{ animationDelay: '120ms' }}
                    >
                        <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-[#E8DCCB]">
                            {chargement ? (
                                <div className="anim-dash-barre h-full w-1/3 rounded-full bg-gradient-to-r from-[#3E2723] via-[#C49A6C] to-[#795548]" />
                            ) : (
                                <div className="dash-drapeau h-full w-full" />
                            )}
                        </div>

                        <div className="mb-4 mt-1">
                            <h3 className="text-sm font-bold text-[#3E2723] sm:text-base">
                                Filtres territoriaux
                            </h3>

                            <p className="mt-1 text-xs text-[#A1887F]">
                                Sélectionnez une zone géographique pour filtrer les données.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <FiltreSelect
                                label="Province"
                                valeur={filtres.province_id}
                                placeholder="Toutes les provinces"
                                options={provinces}
                                onChange={(e) =>
                                    appliquerFiltre('province_id', e.target.value)
                                }
                            />

                            <FiltreSelect
                                label="Commune"
                                valeur={filtres.commune_id}
                                placeholder="Toutes les communes"
                                options={communesFiltrees}
                                disabled={!filtres.province_id}
                                onChange={(e) =>
                                    appliquerFiltre('commune_id', e.target.value)
                                }
                            />

                            <FiltreSelect
                                label="Zone"
                                valeur={filtres.zone_id}
                                placeholder="Toutes les zones"
                                options={zonesFiltrees}
                                disabled={!filtres.commune_id}
                                onChange={(e) =>
                                    appliquerFiltre('zone_id', e.target.value)
                                }
                            />

                            <FiltreSelect
                                label="Colline"
                                valeur={filtres.colline_id}
                                placeholder="Toutes les collines"
                                options={collinesFiltrees}
                                disabled={!filtres.zone_id}
                                onChange={(e) =>
                                    appliquerFiltre('colline_id', e.target.value)
                                }
                            />
                        </div>
                    </section>

                    {/* STATISTIQUES KPI */}
                    <section>
                        <div className="mb-3">
                            <h3 className="flex items-center gap-2.5 text-sm font-bold text-[#3E2723] sm:text-base">
                                <span
                                    aria-hidden="true"
                                    className="h-4 w-1 rounded-full bg-gradient-to-b from-[#3E2723] via-[#A47148] to-[#C49A6C]"
                                />
                                Indicateurs clés
                            </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                            <CarteKpi
                                titre="Ménages enquêtés"
                                valeur={kpi.menages_termines}
                                formater={nombre}
                                sousTitre={`${kpi.taux_avancement ?? 0}% d'avancement`}
                                fond="dash-fond-vert"
                                icone={ICONES.termine}
                                ordre={2}
                            />

                            <CarteKpi
                                titre="En attente"
                                valeur={kpi.menages_en_attente}
                                formater={nombre}
                                fond="dash-fond-ambre"
                                icone={ICONES.attente}
                                ordre={3}
                            />

                            <CarteKpi
                                titre="Restants"
                                valeur={kpi.menages_a_faire}
                                formater={nombre}
                                fond="dash-fond-rouge"
                                icone={ICONES.restants}
                                ordre={4}
                            />

                            <CarteKpi
                                titre="Total ménages"
                                valeur={kpi.menages_total}
                                formater={nombre}
                                fond="dash-fond-sombre"
                                icone={ICONES.total}
                                ordre={5}
                            />

                            <CarteKpi
                                titre="Parcelles géolocalisées"
                                valeur={kpi.nombre_parcelles}
                                formater={nombre}
                                fond="dash-fond-vert"
                                icone={ICONES.parcelles}
                                ordre={6}
                            />

                            <CarteKpi
                                titre="Pieds de café"
                                valeur={kpi.nombre_pieds_cafe}
                                formater={nombre}
                                fond="dash-fond-rouge"
                                icone={ICONES.pieds}
                                ordre={7}
                            />

                            <CarteKpi
                                titre="Superficie totale"
                                valeur={kpi.superficie_totale_ha}
                                formater={hectares}
                                fond="dash-fond-sombre"
                                icone={ICONES.superficie}
                                ordre={8}
                                className="col-span-2"
                            />
                        </div>
                    </section>

                    {/* CARTE GÉOGRAPHIQUE */}
                    <section
                        className="anim-dash-carte min-w-0 overflow-hidden rounded-2xl border border-[#E8DCCB] bg-white shadow-sm"
                        style={{ animationDelay: '200ms' }}
                    >
                        <div className="flex flex-col gap-3 border-b border-[#E8DCCB] bg-gradient-to-r from-[#F5EFE6] via-white to-[#E8DCCB]/40 px-3 py-4 sm:px-5 xl:flex-row xl:items-center xl:justify-between">
                            <div className="min-w-0">
                                <h3 className="flex items-center gap-2.5 text-sm font-bold text-[#3E2723] sm:text-base">
                                    <span
                                        aria-hidden="true"
                                        className="h-4 w-1 rounded-full bg-gradient-to-b from-[#3E2723] via-[#A47148] to-[#C49A6C]"
                                    />
                                    Carte des plantations géolocalisées
                                </h3>

                                <p className="mt-1 pl-3.5 text-xs text-[#8D6E63]">
                                    <span className="font-semibold text-[#795548]">
                                        {nombre(pointsCarte.length)}
                                    </span>{' '}
                                    points géographiques affichés
                                </p>
                            </div>

                            <LegendeStatut />
                        </div>

                        <div className="p-3 sm:p-5">
                            <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-[#E8DCCB] bg-[#FAF7F2] p-3">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="mt-0.5 h-4 w-4 shrink-0 text-[#795548]"
                                    aria-hidden="true"
                                >
                                    <circle cx="12" cy="12" r="9" />
                                    <path
                                        strokeLinecap="round"
                                        d="M12 8h.01M11 12h1v4h1"
                                    />
                                </svg>

                                <p className="text-xs leading-relaxed text-[#6D5A50]">
                                    La taille des points varie selon l'altitude
                                    de la parcelle : plus le point est grand,
                                    plus l'altitude est élevée.
                                </p>
                            </div>

                            <div className="overflow-hidden rounded-xl ring-1 ring-[#D7C5B3]">
                                <CarteBurundi points={pointsCarte} />
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
