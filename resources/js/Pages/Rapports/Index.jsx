import FiltresTerritoriaux from '@/Components/FiltresTerritoriaux';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';

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

    return(
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
            <div ref={conteneurRef} className="h-[550px] w-full rounded-lg" />
        </>
    );
}

/** Formatte un nombre avec des séparateurs de milliers (espace, style FR). */
function formatNombre(n) {
    return new Intl.NumberFormat('fr-FR').format(n ?? 0);
}

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

    const appliquer = (cle, valeur) => {
        router.get(route('rapports.index'), { ...filtres, [cle]: valeur || undefined }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const soumettreRecherche = (e) => {
        e.preventDefault();
        appliquer('menage', recherche);
    };

    const classeSelect = 'rounded-md border-gray-300 text-sm shadow-sm focus:border-burundi-vert focus:ring-burundi-vert';

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

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {/* Filtres */}
                    <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-end gap-4">
                            <FiltresTerritoriaux
                                valeurs={filtres}
                                onChange={(nouveauxFiltres) => router.get(route('rapports.index'), nouveauxFiltres, { preserveState: true, preserveScroll: true })}
                                provinces={provinces}
                                communes={communes}
                                zones={zones}
                                collines={collines}
                            />

                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-500">Enquêteur</label>
                                <select
                                    className={classeSelect}
                                    value={filtres.enqueteur_id ?? ''}
                                    onChange={(e) => appliquer('enqueteur_id', e.target.value)}
                                >
                                    <option value="">Tous les enquêteurs</option>
                                    {enqueteurs.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-500">Géolocalisé du</label>
                                <input
                                    type="date"
                                    className={classeSelect}
                                    value={filtres.date_debut ?? ''}
                                    onChange={(e) => appliquer('date_debut', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-500">Au</label>
                                <input
                                    type="date"
                                    className={classeSelect}
                                    value={filtres.date_fin ?? ''}
                                    onChange={(e) => appliquer('date_fin', e.target.value)}
                                />
                            </div>

                            <form onSubmit={soumettreRecherche} className="flex items-end gap-2">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-500">
                                        Rechercher un ménage (code ou nom)
                                    </label>
                                    <input
                                        type="text"
                                        className={`${classeSelect} w-64`}
                                        value={recherche}
                                        onChange={(e) => setRecherche(e.target.value)}
                                        placeholder="Ex: M-0001 ou Ndayishimiye"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="rounded-md bg-burundi-vert px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                                >
                                    Rechercher
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Enquêteurs affectés à la colline sélectionnée */}
                    {collineSelectionnee && (
                        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b px-4 py-3">
                                <h3 className="text-sm font-medium text-gray-700">
                                    Enquêteurs affectés à la colline « {collineSelectionnee.nom} »
                                </h3>
                                <span className="text-xs text-gray-400">
                                    {enqueteursColline.length} enquêteur{enqueteursColline.length > 1 ? 's' : ''} affecté{enqueteursColline.length > 1 ? 's' : ''}
                                </span>
                            </div>

                            {enqueteursColline.length === 0 ? (
                                <p className="px-4 py-6 text-center text-sm text-gray-400">
                                    Aucun enquêteur n'est affecté à cette colline.
                                </p>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                        <tr>
                                            <th className="px-6 py-3">Enquêteur</th>
                                            <th className="px-6 py-3">Statut</th>
                                            <th className="px-6 py-3">Ménages</th>
                                            <th className="px-6 py-3">Parcelles géolocalisées</th>
                                            <th className="px-6 py-3">Pieds de café</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {enqueteursColline.map((e) => (
                                            <tr key={e.id}>
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
                                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                                            e.actif
                                                                ? 'bg-green-50 text-green-700'
                                                                : 'bg-gray-100 text-gray-500'
                                                        }`}
                                                    >
                                                        {e.actif ? 'Actif' : 'Inactif'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-gray-600">{formatNombre(e.menages)}</td>
                                                <td className="px-6 py-3 text-gray-600">{formatNombre(e.parcelles)}</td>
                                                <td className="px-6 py-3 text-gray-600">{formatNombre(e.pieds)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* Fiche ménage ciblé, si une recherche a trouvé un ménage précis */}
                    {menageCible && (
                        <div className="rounded-lg border-l-4 border-burundi-rouge bg-white p-4 shadow-sm">
                            <p className="text-sm font-semibold text-gray-800">
                                Ménage {menageCible.code_menage} — {[menageCible.prenom_chef_menage, menageCible.nom_chef_menage].filter(Boolean).join(' ')}
                            </p>
                            <p className="text-xs text-gray-500">
                                {menageCible.colline?.nom}, {menageCible.colline?.zone?.nom}, {menageCible.colline?.zone?.commune?.nom}, {menageCible.colline?.zone?.commune?.province?.nom}
                                {' — '}{menageCible.parcelles.length} parcelle(s) affichée(s) en rouge sur la carte
                            </p>
                        </div>
                    )}

                    {/* Carte */}
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                        <h3 className="mb-3 text-sm font-medium text-gray-700">
                            {total} parcelle(s) géolocalisée(s) correspondant aux filtres
                            {' — '}{Number(superficieTotaleHa ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha au total
                        </h3>
                        <CarteRapport points={points} menageCible={menageCible} />
                    </div>

                    {/* Exports */}
                    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-6 py-3">Type d'export</th>
                                    <th className="px-6 py-3">Format</th>
                                    <th className="px-6 py-3">Utilisation professionnelle</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {exports.map((exp) => (
                                    <tr key={exp.route}>
                                        <td className="px-6 py-4 font-medium text-gray-900">{exp.titre}</td>
                                        <td className="px-6 py-4 text-gray-600">{exp.format}</td>
                                        <td className="px-6 py-4 text-gray-600">{exp.usage}</td>
                                        <td className="px-6 py-4 text-right">
                                            <a
                                                href={route(exp.route, filtres)}
                                                className="text-sm font-medium text-burundi-vert hover:underline"
                                            >
                                                Télécharger
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
