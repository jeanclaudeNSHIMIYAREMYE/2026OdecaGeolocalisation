
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';

const LIBELLES_ROLES = {
    admin: 'Administrateur',
    superviseur_national: 'Superviseur national',
    superviseur_provincial: 'Superviseur provincial',
    superviseur_communal: 'Superviseur communal',
    enqueteur: 'Enquêteur',
};

export default function Index({
    utilisateurs,
    peutGerer,
    roles,
    provinces,
    communes,
    filters,
}) {
    const { flash } = usePage().props;

    const appliquerFiltres = (e) => {
        e.preventDefault();

        router.get(route('utilisateurs.index'), filters, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const reinitialiserFiltres = () => {
        router.get(
            route('utilisateurs.index'),
            { per_page: filters.per_page },
            { preserveState: true, replace: true },
        );
    };

    const changerPage = (page) => {
        router.get(
            route('utilisateurs.index'),
            { ...filters, page },
            { preserveState: true, preserveScroll: true },
        );
    };

    const trierPar = (colonne) => {
        const direction =
            filters.sort_by === colonne && filters.sort_dir === 'asc'
                ? 'desc'
                : 'asc';

        router.get(
            route('utilisateurs.index'),
            { ...filters, sort_by: colonne, sort_dir: direction, page: 1 },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const basculerStatut = (utilisateur) => {
        const action = utilisateur.actif ? 'désactiver' : 'réactiver';

        if (!confirm(`Voulez-vous vraiment ${action} le compte de ${utilisateur.name} ?`)) {
            return;
        }

        router.patch(
            route('utilisateurs.basculer-statut', utilisateur.id),
            {},
            { preserveScroll: true },
        );
    };

    const pages = Array.from(
        {
            length: Math.max(
                0,
                Math.min(
                    utilisateurs.last_page,
                    utilisateurs.current_page + 2,
                ) - Math.max(1, utilisateurs.current_page - 2) + 1,
            ),
        },
        (_, i) => Math.max(1, utilisateurs.current_page - 2) + i,
    );

    const flecheTri = (colonne) => {
        if (filters.sort_by !== colonne) return '';
        return filters.sort_dir === 'asc' ? ' ↑' : ' ↓';
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Gestion des utilisateurs
                </h2>
            }
        >
            <Head title="Gestion des utilisateurs" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {flash?.succes && (
                        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
                            {flash.succes}
                        </div>
                    )}

                    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Liste des utilisateurs
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    {utilisateurs.total} compte(s) au total
                                </p>
                            </div>

                            {peutGerer && (
                                <Link href={route('utilisateurs.create')}>
                                    <PrimaryButton>Nouveau compte</PrimaryButton>
                                </Link>
                            )}
                        </div>

                        {/* Recherche et filtres */}
                        <form
                            onSubmit={appliquerFiltres}
                            className="grid grid-cols-1 gap-4 border-t bg-gray-50 p-6 sm:grid-cols-2 lg:grid-cols-3"
                        >
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Recherche
                                </label>
                                <input
                                    type="text"
                                    value={filters.q}
                                    onChange={(e) =>
                                        router.reload({
                                            only: [],
                                        }) || null
                                    }
                                    placeholder="Nom, e-mail ou identifiant"
                                    className="w-full rounded-md border-gray-300 shadow-sm"
                                    name="q"
                                    onInput={(e) => {
                                        filters.q = e.target.value;
                                    }}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Rôle
                                </label>
                                <select
                                    value={filters.role}
                                    onChange={(e) => {
                                        filters.role = e.target.value;
                                    }}
                                    className="w-full rounded-md border-gray-300 shadow-sm"
                                >
                                    <option value="">Tous les rôles</option>
                                    {Object.entries(roles).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Statut
                                </label>
                                <select
                                    value={filters.actif}
                                    onChange={(e) => {
                                        filters.actif = e.target.value;
                                    }}
                                    className="w-full rounded-md border-gray-300 shadow-sm"
                                >
                                    <option value="">Tous les statuts</option>
                                    <option value="1">Actif</option>
                                    <option value="0">Désactivé</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Province
                                </label>
                                <select
                                    value={filters.province_id}
                                    onChange={(e) => {
                                        filters.province_id = e.target.value;
                                        filters.commune_id = '';
                                    }}
                                    className="w-full rounded-md border-gray-300 shadow-sm"
                                >
                                    <option value="">Toutes les provinces</option>
                                    {provinces.map((province) => (
                                        <option key={province.id} value={province.id}>
                                            {province.nom}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Commune
                                </label>
                                <select
                                    value={filters.commune_id}
                                    onChange={(e) => {
                                        filters.commune_id = e.target.value;
                                    }}
                                    className="w-full rounded-md border-gray-300 shadow-sm"
                                >
                                    <option value="">Toutes les communes</option>
                                    {communes
                                        .filter(
                                            (commune) =>
                                                !filters.province_id ||
                                                String(commune.province_id) ===
                                                    String(filters.province_id),
                                        )
                                        .map((commune) => (
                                            <option key={commune.id} value={commune.id}>
                                                {commune.nom}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Résultats par page
                                </label>
                                <select
                                    value={filters.per_page}
                                    onChange={(e) => {
                                        filters.per_page = Number(e.target.value);
                                    }}
                                    className="w-full rounded-md border-gray-300 shadow-sm"
                                >
                                    {[10, 25, 50, 100].map((n) => (
                                        <option key={n} value={n}>
                                            {n} par page
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
                                <PrimaryButton type="submit">
                                    Appliquer les filtres
                                </PrimaryButton>
                                <SecondaryButton
                                    type="button"
                                    onClick={reinitialiserFiltres}
                                >
                                    Réinitialiser
                                </SecondaryButton>
                            </div>
                        </form>

                        {/* Tableau */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-t bg-gray-50 text-xs uppercase text-gray-500">
                                    <tr>
                                        {[
                                            ['name', 'Nom'],
                                            ['email', 'E-mail'],
                                            ['role', 'Rôle'],
                                        ].map(([colonne, label]) => (
                                            <th key={colonne} className="px-6 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => trierPar(colonne)}
                                                    className="font-semibold hover:text-indigo-600"
                                                >
                                                    {label}{flecheTri(colonne)}
                                                </button>
                                            </th>
                                        ))}
                                        <th className="px-6 py-3">Portée</th>
                                        <th className="px-6 py-3">Statut</th>
                                        {peutGerer && (
                                            <th className="px-6 py-3">Actions</th>
                                        )}
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-200">
                                    {utilisateurs.data.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={peutGerer ? 6 : 5}
                                                className="px-6 py-10 text-center text-gray-500"
                                            >
                                                Aucun utilisateur ne correspond aux filtres.
                                            </td>
                                        </tr>
                                    ) : (
                                        utilisateurs.data.map((utilisateur) => (
                                            <tr key={utilisateur.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    {utilisateur.name}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {utilisateur.email}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {LIBELLES_ROLES[utilisateur.role] ??
                                                        utilisateur.role}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {utilisateur.commune?.nom ??
                                                        utilisateur.province?.nom ??
                                                        (utilisateur.role === 'enqueteur'
                                                            ? `${utilisateur.collines_count ?? 0} colline(s)`
                                                            : '—')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                                                            utilisateur.actif
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-red-100 text-red-700'
                                                        }`}
                                                    >
                                                        {utilisateur.actif ? 'Actif' : 'Désactivé'}
                                                    </span>
                                                </td>
                                                {peutGerer && (
                                                    
<td className="whitespace-nowrap px-6 py-4">
    <div className="flex items-center gap-2">
        {/* Bouton Modifier */}
        <Link
            href={route('utilisateurs.edit', utilisateur.id)}
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4"
                aria-hidden="true"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m16.862 4.487 1.687-1.687a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"
                />
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 7.125 16.875 4.5M19.5 12.75v5.625A1.875 1.875 0 0 1 17.625 20.25H5.625a1.875 1.875 0 0 1-1.875-1.875V6.375A1.875 1.875 0 0 1 5.625 4.5h5.625"
                />
            </svg>
            Modifier
        </Link>

        {/* Bouton Activer / Désactiver */}
        {!utilisateur.is_super_admin && (
            <button
                type="button"
                onClick={() => basculerStatut(utilisateur)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    utilisateur.actif
                        ? 'border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 focus:ring-red-500'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 focus:ring-emerald-500'
                }`}
            >
                {utilisateur.actif ? (
                    <>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-4 w-4"
                            aria-hidden="true"
                        >
                            <circle cx="12" cy="12" r="9" />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 9l6 6m0-6-6 6"
                            />
                        </svg>
                        Désactiver
                    </>
                ) : (
                    <>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-4 w-4"
                            aria-hidden="true"
                        >
                            <circle cx="12" cy="12" r="9" />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m8.5 12 2.25 2.25L15.5 9.5"
                            />
                        </svg>
                        Réactiver
                    </>
                )}
            </button>
        )}
    </div>
</td>

                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex flex-wrap items-center justify-between gap-4 border-t p-6">
                            <p className="text-sm text-gray-600">
                                {utilisateurs.from ?? 0}–{utilisateurs.to ?? 0} sur{' '}
                                {utilisateurs.total} utilisateur(s)
                            </p>

                            <div className="flex flex-wrap items-center gap-1">
                                <button
                                    type="button"
                                    disabled={!utilisateurs.prev_page_url}
                                    onClick={() =>
                                        changerPage(utilisateurs.current_page - 1)
                                    }
                                    className="rounded border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Précédent
                                </button>

                                {pages.map((page) => (
                                    <button
                                        type="button"
                                        key={page}
                                        onClick={() => changerPage(page)}
                                        className={`rounded border px-3 py-2 text-sm ${
                                            page === utilisateurs.current_page
                                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                                : 'hover:bg-gray-100'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    disabled={!utilisateurs.next_page_url}
                                    onClick={() =>
                                        changerPage(utilisateurs.current_page + 1)
                                    }
                                    className="rounded border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Suivant
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
