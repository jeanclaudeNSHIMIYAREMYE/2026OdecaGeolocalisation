import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef } from 'react';

const COULEURS_STATUT = {
    termine: '#16a34a',
    en_attente: '#f59e0b',
    a_faire: '#9ca3af',
};

function CarteBurundi({ points }) {
    const conteneurRef = useRef(null);
    const carteRef = useRef(null);
    const coucheMarqueursRef = useRef(null);

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
            }

            coucheMarqueursRef.current.clearLayers();

            points.forEach((point) => {
                L.circleMarker([point.latitude, point.longitude], {
                    radius: 6,
                    color: COULEURS_STATUT[point.statut_menage] ?? '#6366f1',
                    fillColor: COULEURS_STATUT[point.statut_menage] ?? '#6366f1',
                    fillOpacity: 0.8,
                    weight: 1,
                })
                    .bindPopup(
                        `<strong>${point.code_menage}</strong><br>` +
                            `${point.nom_chef_menage ?? ''}<br>` +
                            `${point.nombre_pieds ?? '—'} pieds de café`,
                    )
                    .addTo(coucheMarqueursRef.current);
            });

            if (points.length > 0) {
                const bornes = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
                carteRef.current.fitBounds(bornes, { padding: [30, 30] });
            }
        });

        return () => {
            annule = true;
        };
    }, [points]);

    useEffect(() => {
        return () => {
            carteRef.current?.remove();
            carteRef.current = null;
        };
    }, []);

    return <div ref={conteneurRef} className="h-[500px] w-full rounded-lg" />;
}

function CarteKpi({ titre, valeur, sousTitre }) {
    return (
        <div className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">{titre}</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">{valeur}</p>
            {sousTitre && <p className="mt-1 text-xs text-gray-400">{sousTitre}</p>}
        </div>
    );
}

export default function Dashboard({ kpi, pointsCarte, filtres, provinces, communes, zones, collines }) {
    const communesFiltrees = useMemo(
        () => communes.filter((c) => !filtres.province_id || c.province_id === Number(filtres.province_id)),
        [communes, filtres.province_id],
    );

    const zonesFiltrees = useMemo(
        () => zones.filter((z) => !filtres.commune_id || z.commune_id === Number(filtres.commune_id)),
        [zones, filtres.commune_id],
    );

    const collinesFiltrees = useMemo(
        () => collines.filter((c) => !filtres.zone_id || c.zone_id === Number(filtres.zone_id)),
        [collines, filtres.zone_id],
    );

    const appliquerFiltre = (cle, valeur) => {
        const nouveauxFiltres = { ...filtres, [cle]: valeur || undefined };

        // Réinitialise les niveaux enfants quand on change un niveau parent
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
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Tableau de bord
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {/* Filtres territoriaux */}
                    <div className="flex flex-wrap gap-4 rounded-lg bg-white p-4 shadow-sm">
                        <select
                            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={filtres.province_id ?? ''}
                            onChange={(e) => appliquerFiltre('province_id', e.target.value)}
                        >
                            <option value="">Toutes les provinces</option>
                            {provinces.map((p) => (
                                <option key={p.id} value={p.id}>{p.nom}</option>
                            ))}
                        </select>

                        <select
                            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={filtres.commune_id ?? ''}
                            onChange={(e) => appliquerFiltre('commune_id', e.target.value)}
                            disabled={!filtres.province_id}
                        >
                            <option value="">Toutes les communes</option>
                            {communesFiltrees.map((c) => (
                                <option key={c.id} value={c.id}>{c.nom}</option>
                            ))}
                        </select>

                        <select
                            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={filtres.zone_id ?? ''}
                            onChange={(e) => appliquerFiltre('zone_id', e.target.value)}
                            disabled={!filtres.commune_id}
                        >
                            <option value="">Toutes les zones</option>
                            {zonesFiltrees.map((z) => (
                                <option key={z.id} value={z.id}>{z.nom}</option>
                            ))}
                        </select>

                        <select
                            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={filtres.colline_id ?? ''}
                            onChange={(e) => appliquerFiltre('colline_id', e.target.value)}
                            disabled={!filtres.zone_id}
                        >
                            <option value="">Toutes les collines</option>
                            {collinesFiltrees.map((c) => (
                                <option key={c.id} value={c.id}>{c.nom}</option>
                            ))}
                        </select>
                    </div>

                    {/* KPI */}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <CarteKpi titre="Ménages enquêtés" valeur={kpi.menages_termines} sousTitre={`${kpi.taux_avancement}% d'avancement`} />
                        <CarteKpi titre="En attente" valeur={kpi.menages_en_attente} />
                        <CarteKpi titre="Restants" valeur={kpi.menages_a_faire} />
                        <CarteKpi titre="Total ménages" valeur={kpi.menages_total} />
                        <CarteKpi titre="Parcelles géolocalisées" valeur={kpi.nombre_parcelles} />
                        <CarteKpi titre="Pieds de café" valeur={kpi.nombre_pieds_cafe.toLocaleString('fr-FR')} />
                    </div>

                    {/* Carte */}
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-700">
                                Carte des plantations géolocalisées ({pointsCarte.length})
                            </h3>
                            <div className="flex gap-3 text-xs text-gray-500">
                                <span><span className="inline-block h-2 w-2 rounded-full bg-green-600" /> Terminé</span>
                                <span><span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> En attente</span>
                                <span><span className="inline-block h-2 w-2 rounded-full bg-gray-400" /> À faire</span>
                            </div>
                        </div>
                        <CarteBurundi points={pointsCarte} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
