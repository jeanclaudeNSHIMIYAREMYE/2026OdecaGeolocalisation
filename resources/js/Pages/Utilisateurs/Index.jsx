import PrimaryButton from '@/Components/PrimaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const LIBELLES_ROLES = {
    admin: 'Administrateur',
    superviseur_national: 'Superviseur national',
    superviseur_provincial: 'Superviseur provincial',
    superviseur_communal: 'Superviseur communal',
    enqueteur: 'Enquêteur',
};

const COULEURS_ROLES = {
    admin: 'bg-purple-50 text-purple-700 ring-purple-600/20',
    superviseur_national: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    superviseur_provincial: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    superviseur_communal: 'bg-teal-50 text-teal-700 ring-teal-600/20',
    enqueteur: 'bg-amber-50 text-amber-700 ring-amber-600/20',
};

const initiales = (nom = '') =>
    nom
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((m) => m[0].toUpperCase())
        .join('');

const nettoyer = (params) =>
    Object.fromEntries(
        Object.entries(params).filter(
            ([, v]) => v !== '' && v !== null && v !== undefined,
        ),
    );

const CLASSE_CHAMP =
    'w-full rounded-lg border-gray-300 bg-white text-sm shadow-sm transition duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30';

export default function Index({
    utilisateurs,
    peutGerer,
    roles,
    provinces,
    communes,
    filters,
}) {
    const { flash } = usePage().props;
    const [chargement, setChargement] = useState(false);

    const [form, setForm] = useState({
        q: filters.q ?? '',
        role: filters.role ?? '',
        actif: filters.actif ?? '',
        province_id: filters.province_id ?? '',
        commune_id: filters.commune_id ?? '',
        per_page: filters.per_page ?? 10,
    });

    const maj = (champ, valeur) =>
        setForm((precedent) => ({ ...precedent, [champ]: valeur }));

    const optionsVisite = {
        preserveState: true,
        preserveScroll: true,
        replace: true,
        onStart: () => setChargement(true),
        onFinish: () => setChargement(false),
    };

    // Recherche et filtres en direct : on attend 350 ms après la dernière frappe
    const premierRendu = useRef(true);

    useEffect(() => {
        if (premierRendu.current) {
            premierRendu.current = false;
            return;
        }

        const minuteur = setTimeout(() => {
            router.get(
                route('utilisateurs.index'),
                nettoyer({
                    ...form,
                    sort_by: filters.sort_by,
                    sort_dir: filters.sort_dir,
                    page: 1,
                }),
                optionsVisite,
            );
        }, 350);

        return () => clearTimeout(minuteur);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form]);

    const reinitialiserFiltres = () => {
        setForm({
            q: '',
            role: '',
            actif: '',
            province_id: '',
            commune_id: '',
            per_page: form.per_page,
        });
    };

    const filtresActifs =
        form.q || form.role || form.actif || form.province_id || form.commune_id;

    const changerPage = (page) => {
        router.get(
            route('utilisateurs.index'),
            nettoyer({ ...filters, page }),
            { ...optionsVisite, replace: false },
        );
    };

    const trierPar = (colonne) => {
        const direction =
            filters.sort_by === colonne && filters.sort_dir === 'asc'
                ? 'desc'
                : 'asc';

        router.get(
            route('utilisateurs.index'),
            nettoyer({
                ...filters,
                sort_by: colonne,
                sort_dir: direction,
                page: 1,
            }),
            optionsVisite,
        );
    };

    const basculerStatut = (utilisateur) => {
        const action = utilisateur.actif ? 'désactiver' : 'réactiver';

        if (
            !confirm(
                `Voulez-vous vraiment ${action} le compte de ${utilisateur.name} ?`,
            )
        ) {
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
                Math.min(utilisateurs.last_page, utilisateurs.current_page + 2) -
                    Math.max(1, utilisateurs.current_page - 2) +
                    1,
            ),
        },
        (_, i) => Math.max(1, utilisateurs.current_page - 2) + i,
    );

    const flecheTri = (colonne) => {
        if (filters.sort_by !== colonne)
            return <span className="ml-1 text-gray-300">↕</span>;
        return (
            <span className="ml-1 text-indigo-600">
                {filters.sort_dir === 'asc' ? '↑' : '↓'}
            </span>
        );
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

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes barre {
                    0%   { transform: translateX(-100%); }
                    100% { transform: translateX(350%); }
                }
                .anim-ligne  { opacity: 0; animation: fadeInUp .4s ease-out forwards; }
                .anim-carte  { animation: fadeInUp .5s ease-out both; }
                .anim-alerte { animation: slideDown .35s ease-out both; }
                .anim-barre  { animation: barre 1s ease-in-out infinite; }
            `}</style>

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {flash?.succes && (
                        <div className="anim-alerte flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 shadow-sm">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-5 w-5 shrink-0 text-green-600"
                                aria-hidden="true"
                            >
                                <circle cx="12" cy="12" r="9" />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m8.5 12 2.25 2.25L15.5 9.5"
                                />
                            </svg>
                            {flash.succes}
                        </div>
                    )}

                    <div className="anim-carte relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                        {/* Barre de chargement */}
                        <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden">
                            {chargement && (
                                <div className="anim-barre h-full w-1/3 bg-indigo-600" />
                            )}
                        </div>

                        {/* En-tête */}
                        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Liste des utilisateurs
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    <span className="font-semibold text-indigo-600">
                                        {utilisateurs.total}
                                    </span>{' '}
                                    compte(s) trouvé(s)
                                </p>
                            </div>

                            {peutGerer && (
                                <Link href={route('utilisateurs.create')}>
                                    <PrimaryButton className="transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                                        + Nouveau compte
                                    </PrimaryButton>
                                </Link>
                            )}
                        </div>

                        {/* Recherche et filtres */}
                        <div className="grid grid-cols-1 gap-4 border-t border-gray-100 bg-gray-50/70 p-6 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="sm:col-span-2 lg:col-span-3">
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Recherche
                                </label>
                                <div className="relative">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                                        aria-hidden="true"
                                    >
                                        <circle cx="11" cy="11" r="7" />
                                        <path strokeLinecap="round" d="m20 20-3.5-3.5" />
                                    </svg>
                                    <input
                                        type="text"
                                        name="q"
                                        value={form.q}
                                        onChange={(e) => maj('q', e.target.value)}
                                        placeholder="Rechercher par nom, e-mail ou identifiant…"
                                        className={`${CLASSE_CHAMP} py-2.5 pl-10 pr-10`}
                                        autoComplete="off"
                                    />
                                    {form.q && (
                                        <button
                                            type="button"
                                            onClick={() => maj('q', '')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                                            aria-label="Effacer la recherche"
                                        >
                                            <svg
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                className="h-4 w-4"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    d="M6 6l12 12M18 6 6 18"
                                                />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Rôle
                                </label>
                                <select
                                    value={form.role}
                                    onChange={(e) => maj('role', e.target.value)}
                                    className={CLASSE_CHAMP}
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
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Statut
                                </label>
                                <select
                                    value={form.actif}
                                    onChange={(e) => maj('actif', e.target.value)}
                                    className={CLASSE_CHAMP}
                                >
                                    <option value="">Tous les statuts</option>
                                    <option value="1">Actif</option>
                                    <option value="0">Désactivé</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Résultats par page
                                </label>
                                <select
                                    value={form.per_page}
                                    onChange={(e) =>
                                        maj('per_page', Number(e.target.value))
                                    }
                                    className={CLASSE_CHAMP}
                                >
                                    {[10, 25, 50, 100].map((n) => (
                                        <option key={n} value={n}>
                                            {n} par page
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Province
                                </label>
                                <select
                                    value={form.province_id}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            province_id: e.target.value,
                                            commune_id: '',
                                        }))
                                    }
                                    className={CLASSE_CHAMP}
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
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Commune
                                </label>
                                <select
                                    value={form.commune_id}
                                    onChange={(e) => maj('commune_id', e.target.value)}
                                    className={CLASSE_CHAMP}
                                >
                                    <option value="">Toutes les communes</option>
                                    {communes
                                        .filter(
                                            (commune) =>
                                                !form.province_id ||
                                                String(commune.province_id) ===
                                                    String(form.province_id),
                                        )
                                        .map((commune) => (
                                            <option key={commune.id} value={commune.id}>
                                                {commune.nom}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="flex items-end">
                                {filtresActifs ? (
                                    <button
                                        type="button"
                                        onClick={reinitialiserFiltres}
                                        className="anim-alerte inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-md"
                                    >
                                        ✕ Réinitialiser les filtres
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        {/* Tableau */}
                        <div
                            className={`overflow-x-auto transition-opacity duration-200 ${
                                chargement ? 'opacity-60' : 'opacity-100'
                            }`}
                        >
                            <table className="w-full text-left text-sm">
                                <thead className="border-y border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                    <tr>
                                        {[
                                            ['name', 'Utilisateur'],
                                            ['role', 'Rôle'],
                                        ].map(([colonne, label]) => (
                                            <th key={colonne} className="px-6 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => trierPar(colonne)}
                                                    className="inline-flex items-center font-semibold transition hover:text-indigo-600"
                                                >
                                                    {label}
                                                    {flecheTri(colonne)}
                                                </button>
                                            </th>
                                        ))}
                                        <th className="px-6 py-3 font-semibold">Portée</th>
                                        <th className="px-6 py-3 font-semibold">Statut</th>
                                        {peutGerer && (
                                            <th className="px-6 py-3 text-right font-semibold">
                                                Actions
                                            </th>
                                        )}
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100">
                                    {utilisateurs.data.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={peutGerer ? 5 : 4}
                                                className="px-6 py-16 text-center"
                                            >
                                                <div className="anim-alerte mx-auto flex max-w-xs flex-col items-center gap-3 text-gray-500">
                                                    <svg
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        className="h-12 w-12 text-gray-300"
                                                    >
                                                        <circle cx="11" cy="11" r="7" />
                                                        <path strokeLinecap="round" d="m20 20-3.5-3.5" />
                                                    </svg>
                                                    <p className="font-medium text-gray-700">
                                                        Aucun résultat
                                                    </p>
                                                    <p className="text-sm">
                                                        Aucun utilisateur ne correspond à votre recherche.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        utilisateurs.data.map((utilisateur, index) => (
                                            <tr
                                                key={utilisateur.id}
                                                className="anim-ligne transition-colors duration-150 hover:bg-indigo-50/40"
                                                style={{ animationDelay: `${index * 30}ms` }}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-semibold text-white shadow-sm">
                                                            {initiales(utilisateur.name)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium text-gray-900">
                                                                {utilisateur.name}
                                                            </p>
                                                            <p className="truncate text-xs text-gray-500">
                                                                {utilisateur.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                                                            COULEURS_ROLES[utilisateur.role] ??
                                                            'bg-gray-50 text-gray-700 ring-gray-500/20'
                                                        }`}
                                                    >
                                                        {LIBELLES_ROLES[utilisateur.role] ??
                                                            utilisateur.role}
                                                    </span>
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
                                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                                                            utilisateur.actif
                                                                ? 'bg-green-50 text-green-700'
                                                                : 'bg-red-50 text-red-700'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`h-1.5 w-1.5 rounded-full ${
                                                                utilisateur.actif
                                                                    ? 'bg-green-500'
                                                                    : 'bg-red-500'
                                                            }`}
                                                        />
                                                        {utilisateur.actif ? 'Actif' : 'Désactivé'}
                                                    </span>
                                                </td>

                                                {peutGerer && (
                                                    <td className="whitespace-nowrap px-6 py-4">
                                                        <div className="flex items-center justify-end gap-2">
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
                                                                </svg>
                                                                Modifier
                                                            </Link>

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
                                                                            d={
                                                                                utilisateur.actif
                                                                                    ? 'M9 9l6 6m0-6-6 6'
                                                                                    : 'm8.5 12 2.25 2.25L15.5 9.5'
                                                                            }
                                                                        />
                                                                    </svg>
                                                                    {utilisateur.actif ? 'Désactiver' : 'Réactiver'}
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
                        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 p-6">
                            <p className="text-sm text-gray-600">
                                Affichage de{' '}
                                <span className="font-medium">{utilisateurs.from ?? 0}</span> à{' '}
                                <span className="font-medium">{utilisateurs.to ?? 0}</span> sur{' '}
                                <span className="font-medium">{utilisateurs.total}</span>
                            </p>

                            <div className="flex flex-wrap items-center gap-1">
                                <button
                                    type="button"
                                    disabled={!utilisateurs.prev_page_url}
                                    onClick={() => changerPage(utilisateurs.current_page - 1)}
                                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Précédent
                                </button>

                                {pages.map((page) => (
                                    <button
                                        type="button"
                                        key={page}
                                        onClick={() => changerPage(page)}
                                        className={`rounded-lg border px-3.5 py-2 text-sm transition duration-200 ${
                                            page === utilisateurs.current_page
                                                ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                                                : 'border-gray-200 hover:-translate-y-0.5 hover:bg-gray-50'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    disabled={!utilisateurs.next_page_url}
                                    onClick={() => changerPage(utilisateurs.current_page + 1)}
                                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
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