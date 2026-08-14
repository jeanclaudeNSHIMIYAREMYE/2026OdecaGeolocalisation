import FiltresTerritoriaux from '@/Components/FiltresTerritoriaux';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';

/** Formatte un nombre avec des séparateurs de milliers (espace, style FR). */
function formatNombre(n) {
    return new Intl.NumberFormat('fr-FR').format(n ?? 0);
}

function CarteKpi({ titre, valeur, sousTitre, accent = 'text-gray-900' }) {
    return (
        <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{titre}</p>
            <p className={`mt-2 text-3xl font-semibold ${accent}`}>{valeur}</p>
            {sousTitre && <p className="mt-1 text-xs text-gray-500">{sousTitre}</p>}
        </div>
    );
}

/** Barre de progression horizontale simple, sans dépendance externe. */
function BarreProgression({ label, total, pourcentage, couleur }) {
    return (
        <div>
            <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{label}</span>
                <span className="text-gray-500">{formatNombre(total)} ({pourcentage}%)</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pourcentage}%`, backgroundColor: couleur }}
                />
            </div>
        </div>
    );
}

/** Liste répartition (clé -> nombre) sous forme de mini barres horizontales. */
function ListeRepartition({ donnees, couleur = '#1EB53A' }) {
    const entrees = Object.entries(donnees ?? {});
    const max = Math.max(1, ...entrees.map(([, v]) => v));

    if (entrees.length === 0) {
        return <p className="text-sm text-gray-400">Aucune donnée pour ces filtres.</p>;
    }

    return (
        <div className="space-y-2">
            {entrees.map(([cle, valeur]) => (
                <div key={cle} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate text-sm text-gray-600" title={cle}>{cle}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                            className="h-full rounded-full"
                            style={{ width: `${(valeur / max) * 100}%`, backgroundColor: couleur }}
                        />
                    </div>
                    <span className="w-14 shrink-0 text-right text-sm font-medium text-gray-700">{formatNombre(valeur)}</span>
                </div>
            ))}
        </div>
    );
}

export default function Index({
    filtres,
    provinces,
    communes,
    zones,
    collines,
    enqueteurs,
    kpis,
    avancement,
    parProvince,
    parEnqueteur,
    collineSelectionnee,
    enqueteursColline,
    parEtatVerger,
    parModePositionnement,
    parModeAcquisition,
    parTypeMenage,
    evolution,
    parStatutSync,
}) {
    const appliquer = (cle, valeur) => {
        router.get(route('statistiques.index'), { ...filtres, [cle]: valeur || undefined }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const classeSelect = 'rounded-md border-gray-300 text-sm shadow-sm focus:border-burundi-vert focus:ring-burundi-vert';

    const couleursStatut = {
        a_faire: '#9CA3AF',
        en_attente: '#F59E0B',
        termine: '#1EB53A',
    };

    const libellesSync = {
        envoye: 'Envoyé',
        en_attente: 'En attente',
        conflit: 'Conflit',
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Statistiques du projet</h2>}
        >
            <Head title="Statistiques" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {/* Filtres */}
                    <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-end gap-4">
                            <FiltresTerritoriaux
                                valeurs={filtres}
                                onChange={(nouveauxFiltres) => router.get(route('statistiques.index'), nouveauxFiltres, { preserveState: true, preserveScroll: true })}
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
                                <label className="mb-1 block text-xs font-medium text-gray-500">Du</label>
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
                        </div>
                    </div>

                    {/* KPI globaux */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        <CarteKpi titre="Ménages" valeur={formatNombre(kpis.total_menages)} />
                        <CarteKpi titre="Parcelles" valeur={formatNombre(kpis.total_parcelles)} />
                        <CarteKpi
                            titre="Géolocalisées"
                            valeur={formatNombre(kpis.total_parcelles_geolocalisees)}
                            sousTitre={`${kpis.taux_geolocalisation}% des parcelles`}
                            accent="text-burundi-vert"
                        />
                        <CarteKpi titre="Pieds de café" valeur={formatNombre(kpis.total_pieds)} />
                        <CarteKpi titre="Moy. pieds / parcelle" valeur={formatNombre(kpis.moyenne_pieds_par_parcelle)} />
                        <CarteKpi titre="Enquêteurs actifs" valeur={formatNombre(parEnqueteur.length)} />
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
                                            <th className="px-6 py-3">Dont terminés</th>
                                            <th className="px-6 py-3">Parcelles</th>
                                            <th className="px-6 py-3">Pieds de café</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {enqueteursColline.map((e) => (
                                            <tr key={e.id}>
                                                <td className="px-6 py-3 font-medium text-gray-900">
                                                    {e.enqueteur}
                                                    {e.menages === 0 && (
                                                        <span className="ml-2 text-xs italic text-amber-600">
                                                            aucune saisie
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
                                                <td className="px-6 py-3 text-gray-600">{formatNombre(e.menages_termines)}</td>
                                                <td className="px-6 py-3 text-gray-600">{formatNombre(e.parcelles)}</td>
                                                <td className="px-6 py-3 text-gray-600">{formatNombre(e.pieds)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Avancement global */}
                        <div className="rounded-lg bg-white p-4 shadow-sm">
                            <h3 className="mb-4 text-sm font-medium text-gray-700">Avancement des ménages</h3>
                            <div className="space-y-4">
                                {avancement.map((a) => (
                                    <BarreProgression
                                        key={a.statut}
                                        label={a.label}
                                        total={a.total}
                                        pourcentage={a.pourcentage}
                                        couleur={couleursStatut[a.statut]}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Synchronisation terrain */}
                        <div className="rounded-lg bg-white p-4 shadow-sm">
                            <h3 className="mb-4 text-sm font-medium text-gray-700">État de synchronisation</h3>
                            {Object.keys(parStatutSync ?? {}).length === 0 ? (
                                <p className="text-sm text-gray-400">Aucun enregistrement de synchronisation pour ces filtres.</p>
                            ) : (
                                <div className="grid grid-cols-3 gap-4">
                                    {Object.entries(libellesSync).map(([cle, label]) => (
                                        <div key={cle} className="rounded-md bg-gray-50 p-3 text-center">
                                            <p className="text-2xl font-semibold text-gray-900">{formatNombre(parStatutSync[cle] ?? 0)}</p>
                                            <p className="mt-1 text-xs text-gray-500">{label}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Évolution dans le temps */}
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                        <h3 className="mb-4 text-sm font-medium text-gray-700">Évolution des géolocalisations (par semaine)</h3>
                        {Object.keys(evolution ?? {}).length === 0 ? (
                            <p className="text-sm text-gray-400">Aucune parcelle géolocalisée pour ces filtres.</p>
                        ) : (
                            <div className="flex h-40 items-end gap-1 overflow-x-auto">
                                {Object.entries(evolution).map(([semaine, valeur]) => {
                                    const max = Math.max(...Object.values(evolution));
                                    return (
                                        <div key={semaine} className="flex min-w-[28px] flex-1 flex-col items-center gap-1">
                                            <div
                                                className="w-full rounded-t bg-burundi-vert"
                                                style={{ height: `${Math.max(4, (valeur / max) * 120)}px` }}
                                                title={`Semaine du ${semaine} : ${valeur} parcelle(s)`}
                                            />
                                            <span className="rotate-45 whitespace-nowrap text-[10px] text-gray-400">{semaine}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Répartition territoriale */}
                    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <h3 className="border-b px-4 py-3 text-sm font-medium text-gray-700">Répartition par province</h3>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-6 py-3">Province</th>
                                    <th className="px-6 py-3">Ménages</th>
                                    <th className="px-6 py-3">Dont terminés</th>
                                    <th className="px-6 py-3">Parcelles</th>
                                    <th className="px-6 py-3">Pieds de café</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {parProvince.map((p) => (
                                    <tr key={p.province}>
                                        <td className="px-6 py-3 font-medium text-gray-900">{p.province}</td>
                                        <td className="px-6 py-3 text-gray-600">{formatNombre(p.menages)}</td>
                                        <td className="px-6 py-3 text-gray-600">{formatNombre(p.menages_termines)}</td>
                                        <td className="px-6 py-3 text-gray-600">{formatNombre(p.parcelles)}</td>
                                        <td className="px-6 py-3 text-gray-600">{formatNombre(p.pieds)}</td>
                                    </tr>
                                ))}
                                {parProvince.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-6 text-center text-gray-400">Aucune donnée pour ces filtres.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Classement par enquêteur */}
                    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <h3 className="border-b px-4 py-3 text-sm font-medium text-gray-700">Classement par enquêteur</h3>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-6 py-3">Enquêteur</th>
                                    <th className="px-6 py-3">Ménages</th>
                                    <th className="px-6 py-3">Dont terminés</th>
                                    <th className="px-6 py-3">Parcelles</th>
                                    <th className="px-6 py-3">Pieds de café</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {parEnqueteur.map((e) => (
                                    <tr key={e.enqueteur}>
                                        <td className="px-6 py-3 font-medium text-gray-900">{e.enqueteur}</td>
                                        <td className="px-6 py-3 text-gray-600">{formatNombre(e.menages)}</td>
                                        <td className="px-6 py-3 text-gray-600">{formatNombre(e.menages_termines)}</td>
                                        <td className="px-6 py-3 text-gray-600">{formatNombre(e.parcelles)}</td>
                                        <td className="px-6 py-3 text-gray-600">{formatNombre(e.pieds)}</td>
                                    </tr>
                                ))}
                                {parEnqueteur.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-6 text-center text-gray-400">Aucune donnée pour ces filtres.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Répartitions qualitatives */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="rounded-lg bg-white p-4 shadow-sm">
                            <h3 className="mb-4 text-sm font-medium text-gray-700">État des vergers</h3>
                            <ListeRepartition donnees={parEtatVerger} couleur="#1EB53A" />
                        </div>

                        <div className="rounded-lg bg-white p-4 shadow-sm">
                            <h3 className="mb-4 text-sm font-medium text-gray-700">Type de ménage</h3>
                            <ListeRepartition donnees={parTypeMenage} couleur="#CE1126" />
                        </div>

                        <div className="rounded-lg bg-white p-4 shadow-sm">
                            <h3 className="mb-4 text-sm font-medium text-gray-700">Mode de positionnement</h3>
                            <ListeRepartition donnees={parModePositionnement} couleur="#1EB53A" />
                        </div>

                        <div className="rounded-lg bg-white p-4 shadow-sm">
                            <h3 className="mb-4 text-sm font-medium text-gray-700">Mode d'acquisition</h3>
                            <ListeRepartition donnees={parModeAcquisition} couleur="#1EB53A" />
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
