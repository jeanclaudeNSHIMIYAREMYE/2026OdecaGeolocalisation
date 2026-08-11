import FiltresTerritoriaux from '@/Components/FiltresTerritoriaux';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

const LIBELLES_STATUT = {
    termine: { texte: 'Terminé', classe: 'bg-green-100 text-green-700' },
    en_attente: { texte: 'En attente', classe: 'bg-amber-100 text-amber-700' },
    a_faire: { texte: 'À faire', classe: 'bg-gray-100 text-gray-600' },
};

export default function Index({ menages, filtres, provinces, communes, zones, collines, peutCreer }) {
    const { flash } = usePage().props;
    const [recherche, setRecherche] = useState(filtres.recherche ?? '');

    const appliquerFiltres = (nouveauxFiltres) => {
        router.get(route('menages.index'), nouveauxFiltres, { preserveState: true, preserveScroll: true });
    };

    const soumettreRecherche = (e) => {
        e.preventDefault();
        appliquerFiltres({ ...filtres, recherche: recherche || undefined });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Ménages</h2>}
        >
            <Head title="Ménages" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-4 sm:px-6 lg:px-8">
                    {flash?.succes && (
                        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">{flash.succes}</div>
                    )}

                    <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-center gap-4">
                            <form onSubmit={soumettreRecherche} className="flex gap-2">
                                <TextInput
                                    value={recherche}
                                    onChange={(e) => setRecherche(e.target.value)}
                                    placeholder="Code ménage, nom du chef de ménage..."
                                    className="w-64"
                                />
                                <PrimaryButton type="submit">Rechercher</PrimaryButton>
                            </form>

                            <select
                                className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={filtres.statut ?? ''}
                                onChange={(e) => appliquerFiltres({ ...filtres, statut: e.target.value || undefined })}
                            >
                                <option value="">Tous les statuts</option>
                                <option value="a_faire">À faire</option>
                                <option value="en_attente">En attente</option>
                                <option value="termine">Terminé</option>
                            </select>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <FiltresTerritoriaux
                                valeurs={filtres}
                                onChange={appliquerFiltres}
                                provinces={provinces}
                                communes={communes}
                                zones={zones}
                                collines={collines}
                            />
                        </div>
                    </div>

                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="flex items-center justify-between p-6">
                            <p className="text-sm text-gray-600">{menages.total} ménage(s)</p>
                            <div className="flex items-center gap-4">
                                <a
                                    href={route('exports.menages-xlsx', filtres)}
                                    className="text-sm text-indigo-600 hover:underline"
                                >
                                    Export Excel (.xlsx)
                                </a>
                                <a
                                    href={route('exports.menages-csv', filtres)}
                                    className="text-sm text-gray-500 hover:underline"
                                >
                                    Export CSV
                                </a>
                                <a
                                    href={route('exports.menages-pdf', filtres)}
                                    className="text-sm text-indigo-600 hover:underline"
                                >
                                    Export PDF
                                </a>
                                <a
                                    href={route('exports.parcelles-geojson', filtres)}
                                    className="text-sm text-indigo-600 hover:underline"
                                >
                                    Export GeoJSON
                                </a>
                                {peutCreer && (
                                    <Link href={route('menages.create')}>
                                        <PrimaryButton>Nouveau ménage</PrimaryButton>
                                    </Link>
                                )}
                            </div>
                        </div>

                        <table className="w-full text-left text-sm">
                            <thead className="border-t bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-6 py-3">Code</th>
                                    <th className="px-6 py-3">Chef de ménage</th>
                                    <th className="px-6 py-3">Localisation</th>
                                    <th className="px-6 py-3">Enquêteur</th>
                                    <th className="px-6 py-3">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {menages.data.map((menage) => (
                                    <tr
                                        key={menage.id}
                                        className="cursor-pointer hover:bg-gray-50"
                                        onClick={() => router.visit(route('menages.show', menage.id))}
                                    >
                                        <td className="px-6 py-4 font-medium text-gray-900">{menage.code_menage}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {[menage.prenom_chef_menage, menage.nom_chef_menage].filter(Boolean).join(' ') || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {menage.colline?.nom}, {menage.colline?.zone?.nom}, {menage.colline?.zone?.commune?.nom}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{menage.enqueteur?.name ?? '—'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${LIBELLES_STATUT[menage.statut].classe}`}>
                                                {LIBELLES_STATUT[menage.statut].texte}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {menages.data.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                            Aucun ménage ne correspond aux critères.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {menages.links.length > 3 && (
                            <div className="flex flex-wrap gap-1 border-t p-4">
                                {menages.links.map((lien, index) => (
                                    <Link
                                        key={index}
                                        href={lien.url ?? '#'}
                                        preserveScroll
                                        className={`rounded px-3 py-1 text-sm ${
                                            lien.active ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                                        } ${!lien.url ? 'pointer-events-none opacity-50' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: lien.label }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
