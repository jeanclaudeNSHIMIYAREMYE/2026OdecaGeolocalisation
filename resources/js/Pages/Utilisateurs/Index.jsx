import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

// ============================================================
// RÔLES
// ============================================================

const LIBELLES_ROLES = {
    admin: 'Administrateur',
    superviseur_national: 'Superviseur national',
    superviseur_provincial: 'Superviseur provincial',
    superviseur_communal: 'Superviseur communal',
    enqueteur: 'Enquêteur',
};

const COULEURS_ROLES = {
    admin: 'bg-red-50 text-red-700 ring-red-600/20',
    superviseur_national: 'bg-green-50 text-green-800 ring-green-700/20',
    superviseur_provincial: 'bg-teal-50 text-teal-700 ring-teal-600/20',
    superviseur_communal: 'bg-lime-50 text-lime-800 ring-lime-600/25',
    enqueteur: 'bg-amber-50 text-amber-700 ring-amber-600/20',
};

// ============================================================
// FONCTIONS UTILES
// ============================================================

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

// Administrateur en rouge, les autres rôles en vert
const degradeAvatar = (role) =>
    role === 'admin'
        ? 'from-red-500 to-rose-700'
        : 'from-green-500 to-emerald-700';

// ============================================================
// STYLES PARTAGÉS
// Couleurs du drapeau : rouge #CE1126 · blanc · vert #18B637
// ============================================================

const CLASSE_CHAMP =
    'w-full rounded-xl border-gray-200 bg-white text-sm shadow-sm transition duration-200 ' +
    'hover:border-green-300 focus:border-green-600 focus:ring-2 focus:ring-green-600/25';

const CLASSE_LABEL = 'mb-1.5 block text-xs font-semibold text-gray-500';

const STYLES_PAGE = `
@keyframes usrEntree {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
}
@keyframes usrAlerte {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
}
@keyframes usrBarre {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(350%); }
}
@keyframes usrDrapeau {
    from { background-position: 0 0; }
    to   { background-position: 200% 0; }
}
@keyframes usrHalo {
    0%, 100% { transform: translate(0, 0) scale(1); opacity: .5; }
    50%      { transform: translate(-20px, 16px) scale(1.15); opacity: .8; }
}
@keyframes usrBrillance {
    from { transform: translateX(-130%) skewX(-18deg); }
    to   { transform: translateX(260%) skewX(-18deg); }
}

.anim-ligne  { opacity: 0; animation: usrEntree .45s cubic-bezier(.22, 1, .36, 1) forwards; }
.anim-carte  { animation: usrEntree .55s cubic-bezier(.22, 1, .36, 1) both; }
.anim-alerte { animation: usrAlerte .35s ease-out both; }
.anim-barre  { animation: usrBarre 1s ease-in-out infinite; }

.usr-drapeau {
    background: linear-gradient(90deg, #ce1126, #ffffff, #18b637, #ce1126);
    background-size: 200% 100%;
    animation: usrDrapeau 7s linear infinite;
}
.usr-banniere {
    background:
        radial-gradient(90% 120% at 100% 0%, rgba(24, 182, 55, .30) 0%, transparent 60%),
        linear-gradient(160deg, #0a3b21 0%, #0d4a2a 55%, #07301a 100%);
}
.usr-halo {
    background: radial-gradient(circle, rgba(206, 17, 38, .55) 0%, transparent 70%);
    animation: usrHalo 9s ease-in-out infinite;
}
.usr-bouton-principal {
    background: linear-gradient(135deg, #e11d36 0%, #ce1126 55%, #9f0d1d 100%);
    box-shadow: 0 10px 20px -8px rgba(206, 17, 38, .7);
}
.usr-bouton-vert {
    background: linear-gradient(135deg, #18b637 0%, #0d6b2c 100%);
    box-shadow: 0 8px 16px -6px rgba(13, 107, 44, .6);
}
.usr-brillance { position: relative; overflow: hidden; }
.usr-brillance::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 35%;
    background: linear-gradient(100deg, transparent, rgba(255, 255, 255, .35), transparent);
    transform: translateX(-130%) skewX(-18deg);
    pointer-events: none;
}
.usr-brillance:hover::after { animation: usrBrillance .8s ease-out; }
.usr-ligne:hover { box-shadow: inset 3px 0 0 0 #18b637; }

@media (prefers-reduced-motion: reduce) {
    .anim-ligne, .anim-carte, .anim-alerte, .anim-barre,
    .usr-drapeau, .usr-halo, .usr-brillance:hover::after {
        animation: none !important;
    }
    .anim-ligne { opacity: 1 !important; }
}
`;

// ============================================================
// PAGE
// ============================================================

export default function Index({
    utilisateurs,
    peutGerer,
    peutModifier,
    peutDesactiver,
    peutAjouter,
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

    const supprimerUtilisateur = (utilisateur) => {
        if (!confirm(`Voulez-vous vraiment supprimer définitivement le compte de ${utilisateur.name} ? Cette action est irréversible.`)) {
            return;
        }

        router.delete(route('utilisateurs.destroy', utilisateur.id), {
            preserveScroll: true,
        });
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
            <span className="ml-1 text-green-700">
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

            <style>{STYLES_PAGE}</style>

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {flash?.succes && (
                        <div className="anim-alerte flex items-center gap-3 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-white p-4 text-sm text-green-800 shadow-sm">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="h-5 w-5 text-green-600"
                                    aria-hidden="true"
                                >
                                    <circle cx="12" cy="12" r="9" />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m8.5 12 2.25 2.25L15.5 9.5"
                                    />
                                </svg>
                            </span>
                            {flash.succes}
                        </div>
                    )}

                    <div className="anim-carte relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                        {/* Bannière */}
                        <div className="usr-banniere relative overflow-hidden">
                            <div
                                aria-hidden="true"
                                className="usr-halo pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full blur-2xl"
                            />

                            <div className="relative flex flex-wrap items-center justify-between gap-5 p-6">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-14 min-w-[3.5rem] items-center justify-center rounded-2xl bg-white px-3 text-xl font-bold text-green-800 shadow-lg shadow-black/25 ring-1 ring-white/40">
                                        {utilisateurs.total}
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold tracking-tight text-white">
                                            Liste des utilisateurs
                                        </h3>
                                        <p className="text-sm text-green-100/70">
                                            compte(s) trouvé(s)
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <a
                                        href={route('utilisateurs.export')}
                                        title="Exporter la liste Excel"
                                        aria-label="Exporter la liste des utilisateurs au format Excel"
                                        className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-white px-4 py-2.5 text-sm font-semibold text-green-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-green-50"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" />
                                        </svg>
                                        <span className="sr-only sm:not-sr-only">Exporter Excel</span>
                                    </a>
                                {peutAjouter && (
                                    <Link
                                        href={route('utilisateurs.create')}
                                        title="Ajouter un utilisateur"
                                        aria-label="Ajouter un nouvel utilisateur"
                                        className="usr-bouton-principal usr-brillance inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:scale-95"
                                    >
                                        <span aria-hidden="true" className="text-base leading-none">+</span>
                                        Nouveau compte
                                    </Link>
                                )}
                                </div>
                            </div>

                            {/* Bande du drapeau, remplacée par une barre pendant le chargement */}
                            <div className="h-1 w-full overflow-hidden bg-black/20" aria-hidden="true">
                                {chargement ? (
                                    <div className="anim-barre h-full w-1/3 rounded-full bg-gradient-to-r from-red-600 via-white to-green-500" />
                                ) : (
                                    <div className="usr-drapeau h-full w-full" />
                                )}
                            </div>
                        </div>

                        {/* Recherche et filtres */}
                        <div className="grid grid-cols-1 gap-4 border-b border-gray-100 bg-gradient-to-b from-green-50/50 to-gray-50/60 p-6 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="sm:col-span-2 lg:col-span-3">
                                <label className={CLASSE_LABEL}>Recherche</label>
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
                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition hover:rotate-90 hover:bg-red-50 hover:text-red-600"
                                            aria-label="Effacer la recherche"
                                        >
                                            <svg
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                className="h-4 w-4"
                                                aria-hidden="true"
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
                                <label className={CLASSE_LABEL}>Rôle</label>
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
                                <label className={CLASSE_LABEL}>Statut</label>
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
                                <label className={CLASSE_LABEL}>Résultats par page</label>
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
                                <label className={CLASSE_LABEL}>Province</label>
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
                                <label className={CLASSE_LABEL}>Commune</label>
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
                                        className="anim-alerte inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
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
                                <thead className="border-b border-green-100 bg-gradient-to-r from-green-50 via-white to-red-50/40 text-xs text-gray-600">
                                    <tr>
                                        {[
                                            ['name', 'Utilisateur'],
                                            ['role', 'Rôle'],
                                        ].map(([colonne, label]) => (
                                            <th key={colonne} className="px-6 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => trierPar(colonne)}
                                                    className="inline-flex items-center font-semibold transition hover:text-green-700"
                                                >
                                                    {label}
                                                    {flecheTri(colonne)}
                                                </button>
                                            </th>
                                        ))}
                                        <th className="px-6 py-3 font-semibold">Portée</th>
                                        <th className="px-6 py-3 font-semibold">Statut</th>
                                        {peutModifier && (
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
                                                colSpan={peutModifier ? 5 : 4}
                                                className="px-6 py-16 text-center"
                                            >
                                                <div className="anim-alerte mx-auto flex max-w-xs flex-col items-center gap-3 text-gray-500">
                                                    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-50 to-red-50 ring-1 ring-gray-100">
                                                        <svg
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="1.5"
                                                            className="h-10 w-10 text-green-700/50"
                                                            aria-hidden="true"
                                                        >
                                                            <circle cx="11" cy="11" r="7" />
                                                            <path strokeLinecap="round" d="m20 20-3.5-3.5" />
                                                        </svg>
                                                    </span>
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
                                                className="anim-ligne usr-ligne group transition-all duration-200 hover:bg-gradient-to-r hover:from-green-50/80 hover:to-transparent"
                                                style={{ animationDelay: `${Math.min(index, 15) * 30}ms` }}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${degradeAvatar(
                                                                utilisateur.role,
                                                            )} text-sm font-semibold text-white shadow-md ring-2 ring-white transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}
                                                        >
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
                                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                                                            utilisateur.actif
                                                                ? 'bg-green-50 text-green-700 ring-green-200'
                                                                : 'bg-red-50 text-red-700 ring-red-200'
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

                                                {peutModifier && (
                                                    <td className="whitespace-nowrap px-6 py-4">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Link
                                                                href={route('utilisateurs.edit', utilisateur.id)}
                                                                title="Modifier l'utilisateur"
                                                                aria-label={`Modifier ${utilisateur.name}`}
                                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                                                            >
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="1.8"
                                                                    className="h-4 w-4 transition-transform duration-200 group-hover:-rotate-12"
                                                                    aria-hidden="true"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        d="m16.862 4.487 1.687-1.687a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"
                                                                    />
                                                                </svg>
                                                            </Link>

                                                            {peutDesactiver && !utilisateur.is_super_admin && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => basculerStatut(utilisateur)}
                                                                    title={utilisateur.actif ? "Désactiver l'utilisateur" : "Réactiver l'utilisateur"}
                                                                    aria-label={`${utilisateur.actif ? 'Désactiver' : 'Réactiver'} ${utilisateur.name}`}
                                                                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                                                                        utilisateur.actif
                                                                            ? 'border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 focus-visible:ring-red-500'
                                                                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 focus-visible:ring-emerald-500'
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
                                                                </button>
                                                            )}
                                                            {peutGerer && !utilisateur.is_super_admin && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => supprimerUtilisateur(utilisateur)}
                                                                                                    title="Supprimer définitivement l'utilisateur"
                                                                                                    aria-label={`Supprimer ${utilisateur.name}`}
                                                                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                                                >
                                                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                                                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6m-8 4h10m-9 0 .7 13h6.6l.7-13M10 10v6m4-6v6" />
                                                                                                    </svg>
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
                        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/50 p-6">
                            <p className="text-sm text-gray-600">
                                Affichage de{' '}
                                <span className="font-medium">{utilisateurs.from ?? 0}</span> à{' '}
                                <span className="font-medium">{utilisateurs.to ?? 0}</span> sur{' '}
                                <span className="font-medium">{utilisateurs.total}</span>
                            </p>

                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    disabled={!utilisateurs.prev_page_url}
                                    onClick={() => changerPage(utilisateurs.current_page - 1)}
                                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition hover:border-green-300 hover:bg-green-50 hover:text-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-white disabled:hover:text-gray-600"
                                >
                                    Précédent
                                </button>

                                {pages.map((page) => (
                                    <button
                                        type="button"
                                        key={page}
                                        onClick={() => changerPage(page)}
                                        className={`rounded-lg border px-3.5 py-2 text-sm transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 ${
                                            page === utilisateurs.current_page
                                                ? 'usr-bouton-vert border-transparent font-semibold text-white'
                                                : 'border-gray-200 bg-white text-gray-600 hover:-translate-y-0.5 hover:border-green-300 hover:bg-green-50 hover:text-green-800'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    disabled={!utilisateurs.next_page_url}
                                    onClick={() => changerPage(utilisateurs.current_page + 1)}
                                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition hover:border-green-300 hover:bg-green-50 hover:text-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-white disabled:hover:text-gray-600"
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