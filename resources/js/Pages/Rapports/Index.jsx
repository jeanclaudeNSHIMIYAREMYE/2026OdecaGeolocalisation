import FiltresTerritoriaux from '@/Components/FiltresTerritoriaux';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';

// ============================================================
// CARTE (logique inchangée)
// ============================================================

function CarteRapport({ points, menageCible }) {
    const conteneurRef = useRef(null);
    const carteRef = useRef(null);
    const coucheMarqueursRef = useRef(null);
    const couchePolygonesRef = useRef(null);

    useEffect(() => {
        let annule = false;

        import('leaflet').then((L) => {
            if (annule || !conteneurRef.current) return;

            if (!carteRef.current) {
                carteRef.current = L.map(conteneurRef.current).setView([-3.373, 29.918], 8);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap',
                    maxZoom: 18,
                }).addTo(carteRef.current);
                coucheMarqueursRef.current = L.layerGroup().addTo(carteRef.current);
                couchePolygonesRef.current = L.layerGroup().addTo(carteRef.current);
            }

            coucheMarqueursRef.current.clearLayers();
            couchePolygonesRef.current.clearLayers();

            const toutesLesCoordonnees = [];

            /*
             * Plage d'altitude du jeu de points actuel, pour moduler
             * légèrement la taille des marqueurs sans écraser le
             * signal déjà porté par le rayon (ménage ciblé = plus gros).
             */
            const altitudesValides = points
                .map((p) => p.altitude)
                .filter((a) => a !== null && a !== undefined && Number.isFinite(Number(a)))
                .map(Number);

            const altitudeMin = altitudesValides.length ? Math.min(...altitudesValides) : null;
            const altitudeMax = altitudesValides.length ? Math.max(...altitudesValides) : null;

            const AJUSTEMENT_MAX = 3; // pixels de rayon ajoutés au maximum

            const ajustementAltitude = (altitude) => {
                if (
                    altitude === null ||
                    altitude === undefined ||
                    !Number.isFinite(Number(altitude)) ||
                    altitudeMin === null ||
                    altitudeMax === null ||
                    altitudeMax === altitudeMin
                ) {
                    return 0;
                }

                const ratio = (Number(altitude) - altitudeMin) / (altitudeMax - altitudeMin);

                return ratio * AJUSTEMENT_MAX;
            };

            points.forEach((point) => {
                const estCible = menageCible && point.menage_id === menageCible.id;
                const couleur = estCible ? '#CE1126' : '#1EB53A';

                const altitudeTexte =
                    point.altitude !== null && point.altitude !== undefined
                        ? `${Number(point.altitude).toFixed(0)} m`
                        : '—';

                const superficieTexte =
                    point.superficie_ha !== null && point.superficie_ha !== undefined
                        ? `${Number(point.superficie_ha).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha`
                        : '—';

                const popup =
                    `<strong>${point.code_menage}</strong> — ${point.nom_chef_menage}<br>` +
                    `${point.province}, ${point.commune}<br>` +
                    `${point.nombre_pieds ?? '—'} pieds · géolocalisé le ${point.date_geolocalisation}<br>` +
                    `Superficie : ${superficieTexte}<br>` +
                    `Altitude : ${altitudeTexte}` +
                    (point.enqueteur ? `<br>Enquêteur : ${point.enqueteur}` : '');

                /*
                 * ============================
                 * POLYGONE
                 * ============================
                 * point.polygone (quand présent) est un tableau de
                 * sommets { latitude, longitude, altitude? } tel que
                 * renvoyé par RapportController::index.
                 */
                if (Array.isArray(point.polygone) && point.polygone.length >= 3) {
                    const coordinates = point.polygone
                        .map((sommet) => {
                            if (sommet && sommet.latitude != null && sommet.longitude != null) {
                                return [Number(sommet.latitude), Number(sommet.longitude)];
                            }
                            if (Array.isArray(sommet) && sommet.length >= 2) {
                                return [Number(sommet[0]), Number(sommet[1])];
                            }
                            return null;
                        })
                        .filter(Boolean);

                    if (coordinates.length >= 3) {
                        const polygoneLayer = L.polygon(coordinates, {
                            color: couleur,
                            fillColor: couleur,
                            fillOpacity: 0.25,
                            weight: estCible ? 3 : 2,
                        }).bindPopup(popup);

                        if (point.superficie_ha !== null && point.superficie_ha !== undefined) {
                            polygoneLayer.bindTooltip(
                                `${Number(point.superficie_ha).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha`,
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
                 * MARQUEUR (centroïde / point GPS)
                 * ============================
                 */
                if (point.latitude != null && point.longitude != null) {
                    const rayonBase = estCible ? 9 : 6;

                    L.circleMarker([point.latitude, point.longitude], {
                        radius: rayonBase + ajustementAltitude(point.altitude),
                        color: couleur,
                        fillColor: couleur,
                        fillOpacity: 0.85,
                        weight: estCible ? 2 : 1,
                    })
                        .bindPopup(popup)
                        .addTo(coucheMarqueursRef.current);

                    toutesLesCoordonnees.push([point.latitude, point.longitude]);
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
    }, [points, menageCible]);

    useEffect(() => () => {
        carteRef.current?.remove();
        carteRef.current = null;
    }, []);

    return (
        <>
            <style>{`
                .etiquette-superficie {
                    background: rgba(255, 255, 255, 0.92);
                    border: none;
                    border-radius: 6px;
                    box-shadow: 0 2px 6px rgba(7, 48, 26, 0.25);
                    font-size: 11px;
                    font-weight: 600;
                    color: #0d4a2a;
                    padding: 1px 6px;
                }
                .etiquette-superficie::before {
                    display: none;
                }
                .rap-carte .leaflet-popup-content-wrapper {
                    border-radius: 14px;
                    box-shadow: 0 12px 28px -8px rgba(7, 48, 26, 0.45);
                    border-top: 3px solid #18b637;
                }
                .rap-carte .leaflet-popup-content {
                    font-size: 12.5px;
                    line-height: 1.55;
                    color: #1f2937;
                }
                .rap-carte .leaflet-control-zoom a {
                    color: #0d4a2a;
                }
            `}</style>
            <div ref={conteneurRef} className="rap-carte h-[550px] w-full rounded-xl" />
        </>
    );
}

// ============================================================
// STYLES ET ANIMATIONS
// Couleurs du drapeau : rouge #CE1126 · blanc · vert #18B637
// ============================================================

const STYLES_PAGE = `
@keyframes rapEntree {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
}
@keyframes rapAlerte {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
}
@keyframes rapBarre {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(350%); }
}
@keyframes rapDrapeau {
    from { background-position: 0 0; }
    to   { background-position: 200% 0; }
}
@keyframes rapHalo {
    0%, 100% { transform: translate(0, 0) scale(1); opacity: .5; }
    50%      { transform: translate(-20px, 16px) scale(1.15); opacity: .8; }
}
@keyframes rapBrillance {
    from { transform: translateX(-130%) skewX(-18deg); }
    to   { transform: translateX(260%) skewX(-18deg); }
}

.anim-rap-carte  { opacity: 0; animation: rapEntree .55s cubic-bezier(.22, 1, .36, 1) forwards; }
.anim-rap-ligne  { opacity: 0; animation: rapEntree .45s cubic-bezier(.22, 1, .36, 1) forwards; }
.anim-rap-alerte { animation: rapAlerte .35s ease-out both; }
.anim-rap-barre  { animation: rapBarre 1s ease-in-out infinite; }

.rap-drapeau {
    background: linear-gradient(90deg, #ce1126, #ffffff, #18b637, #ce1126);
    background-size: 200% 100%;
    animation: rapDrapeau 7s linear infinite;
}
.rap-banniere {
    background:
        radial-gradient(90% 120% at 100% 0%, rgba(24, 182, 55, .30) 0%, transparent 60%),
        linear-gradient(160deg, #0a3b21 0%, #0d4a2a 55%, #07301a 100%);
}
.rap-halo {
    background: radial-gradient(circle, rgba(206, 17, 38, .55) 0%, transparent 70%);
    animation: rapHalo 9s ease-in-out infinite;
}
.rap-fond-vert  { background: linear-gradient(135deg, #18b637 0%, #0d6b2c 100%); box-shadow: 0 8px 16px -6px rgba(13, 107, 44, .6); }
.rap-fond-rouge { background: linear-gradient(135deg, #e11d36 0%, #ce1126 55%, #9f0d1d 100%); box-shadow: 0 8px 16px -6px rgba(206, 17, 38, .65); }

.rap-brillance { position: relative; overflow: hidden; }
.rap-brillance::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 35%;
    background: linear-gradient(100deg, transparent, rgba(255, 255, 255, .35), transparent);
    transform: translateX(-130%) skewX(-18deg);
    pointer-events: none;
}
.rap-brillance:hover::after { animation: rapBrillance .8s ease-out; }
.rap-ligne:hover { box-shadow: inset 3px 0 0 0 #18b637; }

@media (prefers-reduced-motion: reduce) {
    .anim-rap-carte, .anim-rap-ligne, .anim-rap-alerte, .anim-rap-barre,
    .rap-drapeau, .rap-halo, .rap-brillance:hover::after {
        animation: none !important;
    }
    .anim-rap-carte, .anim-rap-ligne { opacity: 1 !important; }
}
`;

const CLASSE_CHAMP =
    'rounded-xl border-gray-200 bg-gray-50/60 text-sm shadow-sm transition duration-200 ' +
    'hover:border-green-300 focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-600/25';

const CLASSE_LABEL = 'mb-1.5 block text-xs font-semibold text-gray-500';

const CLASSE_CARTE = 'anim-rap-carte rounded-2xl border border-gray-100 bg-white shadow-sm';

const ICONE_TELECHARGER =
    'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3';

// Couleur du badge de format, pour reconnaître chaque export d'un coup d'œil
const STYLES_FORMATS = {
    'rapports.pdf': 'bg-red-50 text-red-700 ring-red-200',
    'rapports.xlsx': 'bg-green-50 text-green-700 ring-green-200',
    'rapports.csv': 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    'rapports.kml': 'bg-amber-50 text-amber-700 ring-amber-200',
    'rapports.geojson': 'bg-teal-50 text-teal-700 ring-teal-200',
};

/** Formatte un nombre avec des séparateurs de milliers (espace, style FR). */
function formatNombre(n) {
    return new Intl.NumberFormat('fr-FR').format(n ?? 0);
}

function TitreCarte({ children, droite }) {
    return (
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-green-50/70 via-white to-red-50/30 px-5 py-3.5">
            <h3 className="flex items-center gap-2.5 text-sm font-semibold text-gray-800">
                <span
                    aria-hidden="true"
                    className="h-4 w-1 rounded-full bg-gradient-to-b from-red-600 via-white to-green-600 ring-1 ring-gray-200"
                />
                {children}
            </h3>
            {droite}
        </div>
    );
}

// ============================================================
// PAGE
// ============================================================

export default function Index({
    filtres,
    points,
    menageCible,
    provinces,
    communes,
    zones,
    collines,
    enqueteurs,
    collineSelectionnee,
    enqueteursColline,
    total,
    superficieTotaleHa,
}) {
    const [recherche, setRecherche] = useState(filtres.menage ?? '');
    const [chargement, setChargement] = useState(false);

    const optionsVisite = {
        preserveState: true,
        preserveScroll: true,
        onStart: () => setChargement(true),
        onFinish: () => setChargement(false),
    };

    const appliquer = (cle, valeur) => {
        router.get(route('rapports.index'), { ...filtres, [cle]: valeur || undefined }, optionsVisite);
    };

    const soumettreRecherche = (e) => {
        e.preventDefault();
        appliquer('menage', recherche);
    };

    const exports = [
        { titre: 'Rapport général', format: 'PDF', route: 'rapports.pdf', usage: 'Direction, archivage, impression' },
        { titre: 'Rapport analytique', format: 'Excel (.xlsx)', route: 'rapports.xlsx', usage: 'Analyse et statistiques' },
        { titre: 'Données brutes', format: 'CSV', route: 'rapports.csv', usage: 'Traitement Excel / Power BI' },
        { titre: 'Données cartographiques', format: 'KML', route: 'rapports.kml', usage: 'Google Earth' },
        { titre: 'Données géographiques', format: 'GeoJSON', route: 'rapports.geojson', usage: 'SIG et cartes web' },
    ];

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Rapports de géolocalisation</h2>}
        >
            <Head title="Rapports" />

            <style>{STYLES_PAGE}</style>

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {/* Filtres */}
                    <div className={`${CLASSE_CARTE} relative overflow-hidden p-5`}>
                        <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-gray-100">
                            {chargement ? (
                                <div className="anim-rap-barre h-full w-1/3 rounded-full bg-gradient-to-r from-red-600 via-white to-green-600" />
                            ) : (
                                <div className="rap-drapeau h-full w-full" />
                            )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-end gap-4">
                            <FiltresTerritoriaux
                                valeurs={filtres}
                                onChange={(nouveauxFiltres) => router.get(route('rapports.index'), nouveauxFiltres, optionsVisite)}
                                provinces={provinces}
                                communes={communes}
                                zones={zones}
                                collines={collines}
                            />

                            <div>
                                <label className={CLASSE_LABEL}>Enquêteur</label>
                                <select
                                    className={CLASSE_CHAMP}
                                    value={filtres.enqueteur_id ?? ''}
                                    onChange={(e) => appliquer('enqueteur_id', e.target.value)}
                                >
                                    <option value="">Tous les enquêteurs</option>
                                    {enqueteurs.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className={CLASSE_LABEL}>Géolocalisé du</label>
                                <input
                                    type="date"
                                    className={CLASSE_CHAMP}
                                    value={filtres.date_debut ?? ''}
                                    onChange={(e) => appliquer('date_debut', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className={CLASSE_LABEL}>Au</label>
                                <input
                                    type="date"
                                    className={CLASSE_CHAMP}
                                    value={filtres.date_fin ?? ''}
                                    onChange={(e) => appliquer('date_fin', e.target.value)}
                                />
                            </div>

                            <form onSubmit={soumettreRecherche} className="flex items-end gap-2">
                                <div>
                                    <label className={CLASSE_LABEL}>
                                        Rechercher un ménage (code ou nom)
                                    </label>
                                    <div className="group relative">
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors duration-200 group-focus-within:text-green-600"
                                            aria-hidden="true"
                                        >
                                            <circle cx="11" cy="11" r="7" />
                                            <path strokeLinecap="round" d="m20 20-3.5-3.5" />
                                        </svg>
                                        <input
                                            type="text"
                                            className={`${CLASSE_CHAMP} w-64 pl-10`}
                                            value={recherche}
                                            onChange={(e) => setRecherche(e.target.value)}
                                            placeholder="Ex: M-0001 ou Ndayishimiye"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="rap-fond-vert rap-brillance rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 active:scale-95"
                                >
                                    Rechercher
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Enquêteurs affectés à la colline sélectionnée */}
                    {collineSelectionnee && (
                        <div className={`${CLASSE_CARTE} overflow-hidden`}>
                            <TitreCarte
                                droite={
                                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800 ring-1 ring-green-200">
                                        {enqueteursColline.length} enquêteur{enqueteursColline.length > 1 ? 's' : ''} affecté{enqueteursColline.length > 1 ? 's' : ''}
                                    </span>
                                }
                            >
                                Enquêteurs affectés à la colline « {collineSelectionnee.nom} »
                            </TitreCarte>

                            {enqueteursColline.length === 0 ? (
                                <p className="px-4 py-8 text-center text-sm text-gray-400">
                                    Aucun enquêteur n'est affecté à cette colline.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="border-b border-green-100 bg-gradient-to-r from-green-50 via-white to-red-50/40 text-xs text-gray-600">
                                            <tr>
                                                <th className="px-6 py-3 font-semibold">Enquêteur</th>
                                                <th className="px-6 py-3 font-semibold">Statut</th>
                                                <th className="px-6 py-3 font-semibold">Ménages</th>
                                                <th className="px-6 py-3 font-semibold">Parcelles géolocalisées</th>
                                                <th className="px-6 py-3 font-semibold">Pieds de café</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {enqueteursColline.map((e, index) => (
                                                <tr
                                                    key={e.id}
                                                    className="anim-rap-ligne rap-ligne transition-all duration-200 hover:bg-gradient-to-r hover:from-green-50/80 hover:to-transparent"
                                                    style={{ animationDelay: `${Math.min(index, 15) * 30}ms` }}
                                                >
                                                    <td className="px-6 py-3 font-medium text-gray-900">
                                                        {e.enqueteur}
                                                        {e.parcelles === 0 && (
                                                            <span className="ml-2 text-xs italic text-amber-600">
                                                                aucune géolocalisation
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                                                                e.actif
                                                                    ? 'bg-green-50 text-green-700 ring-green-200'
                                                                    : 'bg-gray-100 text-gray-500 ring-gray-200'
                                                            }`}
                                                        >
                                                            <span className={`h-1.5 w-1.5 rounded-full ${e.actif ? 'bg-green-500' : 'bg-gray-400'}`} />
                                                            {e.actif ? 'Actif' : 'Inactif'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 tabular-nums text-gray-600">{formatNombre(e.menages)}</td>
                                                    <td className="px-6 py-3 tabular-nums text-gray-600">{formatNombre(e.parcelles)}</td>
                                                    <td className="px-6 py-3 tabular-nums text-gray-600">{formatNombre(e.pieds)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Fiche ménage ciblé, si une recherche a trouvé un ménage précis */}
                    {menageCible && (
                        <div className="anim-rap-alerte relative overflow-hidden rounded-2xl border border-red-100 bg-gradient-to-r from-red-50 via-white to-white p-4 pl-6 shadow-sm">
                            <span
                                aria-hidden="true"
                                className="rap-fond-rouge absolute inset-y-0 left-0 w-1.5"
                            />
                            <p className="text-sm font-semibold text-gray-800">
                                caféiculteur {menageCible.code_menage} — {[menageCible.prenom_chef_menage, menageCible.nom_chef_menage].filter(Boolean).join(' ')}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                                {menageCible.colline?.nom}, {menageCible.colline?.zone?.nom}, {menageCible.colline?.zone?.commune?.nom}, {menageCible.colline?.zone?.commune?.province?.nom}
                                {' — '}{menageCible.parcelles.length} parcelle(s) affichée(s) en rouge sur la carte
                            </p>
                        </div>
                    )}

                    {/* Carte */}
                    <div className={`${CLASSE_CARTE} overflow-hidden`} style={{ animationDelay: '100ms' }}>
                        <div className="rap-banniere relative overflow-hidden">
                            <div
                                aria-hidden="true"
                                className="rap-halo pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full blur-2xl"
                            />

                            <div className="relative flex flex-wrap items-center justify-between gap-5 p-6">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-14 min-w-[3.5rem] items-center justify-center rounded-2xl bg-white px-3 text-xl font-bold tabular-nums text-green-800 shadow-lg shadow-black/25 ring-1 ring-white/40">
                                        {formatNombre(total)}
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold tracking-tight text-white">
                                            Parcelles géolocalisées
                                        </h3>
                                        <p className="text-sm text-green-100/70">
                                            correspondant aux filtres
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-right backdrop-blur-sm">
                                    <p className="text-xl font-bold tabular-nums text-white">
                                        {Number(superficieTotaleHa ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha
                                    </p>
                                    <p className="text-xs text-green-100/70">au total</p>
                                </div>
                            </div>

                            <div className="rap-drapeau h-1 w-full" aria-hidden="true" />
                        </div>

                        <div className="p-4">
                            <div className="overflow-hidden rounded-xl ring-1 ring-gray-200">
                                <CarteRapport points={points} menageCible={menageCible} />
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#1EB53A]" />
                                    Parcelles
                                </span>
                                {menageCible && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-[#CE1126]" />
                                        Ménage recherché
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Exports */}
                    <div className={`${CLASSE_CARTE} overflow-hidden`} style={{ animationDelay: '180ms' }}>
                        <TitreCarte>Exports disponibles</TitreCarte>

                        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                            {exports.map((exp, index) => (
                                <div
                                    key={exp.route}
                                    className="anim-rap-ligne group flex flex-col justify-between gap-4 rounded-xl border border-gray-100 bg-gradient-to-br from-white to-green-50/40 p-4 transition duration-300 hover:-translate-y-1 hover:border-green-200 hover:shadow-lg"
                                    style={{ animationDelay: `${index * 70}ms` }}
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="font-semibold text-gray-900">{exp.titre}</p>
                                            <span
                                                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                                                    STYLES_FORMATS[exp.route] ?? 'bg-gray-100 text-gray-600 ring-gray-200'
                                                }`}
                                            >
                                                {exp.format}
                                            </span>
                                        </div>
                                        <p className="mt-1.5 text-sm text-gray-500">{exp.usage}</p>
                                    </div>

                                    <a
                                        href={route(exp.route, filtres)}
                                        className="rap-fond-vert rap-brillance inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 active:scale-95"
                                    >
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5"
                                            aria-hidden="true"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d={ICONE_TELECHARGER} />
                                        </svg>
                                        Télécharger
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}