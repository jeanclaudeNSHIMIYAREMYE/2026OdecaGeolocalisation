import FiltresTerritoriaux from '@/Components/FiltresTerritoriaux';
import PrimaryButton from '@/Components/PrimaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import BoutonImporterMenages from './Partials/BoutonImporterMenages';

const LIBELLES_STATUT = {
    a_faire: {
        texte: 'À faire',
        classe: 'bg-gray-100 text-gray-700',
        point: 'bg-gray-400',
    },
    en_attente: {
        texte: 'En attente',
        classe: 'bg-amber-50 text-amber-700',
        point: 'bg-amber-500',
    },
    deja_commence: {
        texte: 'Déjà commencé',
        classe: 'bg-blue-50 text-blue-700',
        point: 'bg-blue-500',
    },
    termine: {
        texte: 'Terminé',
        classe: 'bg-green-50 text-green-700',
        point: 'bg-green-500',
    },
};

const STATUT_PAR_DEFAUT = {
    texte: 'Non défini',
    classe: 'bg-gray-100 text-gray-600',
    point: 'bg-gray-400',
};

const CLASSE_SELECT =
    'w-full rounded-lg border-gray-300 bg-white text-sm shadow-sm transition duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30';

const initiales = (nom = '') =>
    nom
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((m) => m[0].toUpperCase())
        .join('');

const texteLien = (label = '') =>
    label
        .replace(/<[^>]*>/g, '')
        .replace('&laquo;', '←')
        .replace('&raquo;', '→')
        .replace('Previous', 'Précédent')
        .replace('Next', 'Suivant')
        .trim();

function Etiquette({ label, children }) {
    return (
        <div className="min-w-[170px]">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                {label}
            </label>
            {children}
        </div>
    );
}

function LienExport({ href, children, icone }) {
    return (
        <a
            href={href}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:text-indigo-700 hover:shadow-md"
        >
            <svg
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
                    d={icone}
                />
            </svg>
            {children}
        </a>
    );
}

const ICONE_EXPORT =
    'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3';

export default function Index({
    menages,
    filtres,
    provinces,
    communes,
    zones,
    collines,
    peutCreer,
    enqueteurs,
}) {
    const { flash } = usePage().props;

    const [chargement, setChargement] = useState(false);
    const [recherche, setRecherche] = useState(filtres?.recherche ?? '');

    const optionsVisite = {
        preserveState: true,
        preserveScroll: true,
        replace: true,
        onStart: () => setChargement(true),
        onFinish: () => setChargement(false),
    };

    const appliquerFiltres = (nouveauxFiltres) => {
        router.get(route('menages.index'), nouveauxFiltres, optionsVisite);
    };

    // Recherche en direct : on attend 350 ms après la dernière frappe
    const premierRendu = useRef(true);

    useEffect(() => {
        if (premierRendu.current) {
            premierRendu.current = false;
            return;
        }

        const valeur = recherche.trim();

        if (valeur === (filtres?.recherche ?? '')) return;

        const minuteur = setTimeout(() => {
            appliquerFiltres({
                ...filtres,
                recherche: valeur || undefined,
            });
        }, 350);

        return () => clearTimeout(minuteur);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recherche]);

    const soumettreRecherche = (e) => {
        e.preventDefault();

        appliquerFiltres({
            ...filtres,
            recherche: recherche.trim() || undefined,
        });
    };

    const aDesFiltres = Object.values(filtres ?? {}).some(Boolean);

    const reinitialiser = () => {
        setRecherche('');
        appliquerFiltres({});
    };

    const lignes = menages?.data ?? [];

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Ménages
                </h2>
            }
        >
            <Head title="Ménages" />

            <style>{`
                @keyframes menEntree {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes menAlerte {
                    from { opacity: 0; transform: translateY(-8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes menBarre {
                    0%   { transform: translateX(-100%); }
                    100% { transform: translateX(350%); }
                }
                .anim-men-carte  { opacity: 0; animation: menEntree .5s ease-out forwards; }
                .anim-men-ligne  { opacity: 0; animation: menEntree .4s ease-out forwards; }
                .anim-men-alerte { animation: menAlerte .35s ease-out both; }
                .anim-men-barre  { animation: menBarre 1s ease-in-out infinite; }
                @media (prefers-reduced-motion: reduce) {
                    .anim-men-carte, .anim-men-ligne, .anim-men-alerte, .anim-men-barre {
                        animation: none !important; opacity: 1 !important;
                    }
                }
            `}</style>

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-5 sm:px-6 lg:px-8">
                    {flash?.succes && (
                        <div
                            className="anim-men-alerte flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 shadow-sm"
                            role="status"
                        >
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

                    {/* Recherche et filtres */}
                    <div
                        className="anim-men-carte relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                        style={{ animationDelay: '0ms' }}
                    >
                        <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden">
                            {chargement && (
                                <div className="anim-men-barre h-full w-1/3 bg-indigo-600" />
                            )}
                        </div>

                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <form
                                onSubmit={soumettreRecherche}
                                className="w-full max-w-md flex-1"
                            >
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
                                        value={recherche}
                                        onChange={(e) => setRecherche(e.target.value)}
                                        placeholder="Code ménage, nom du chef de ménage…"
                                        className={`${CLASSE_SELECT} py-2.5 pl-10 pr-10`}
                                        autoComplete="off"
                                    />
                                    {recherche && (
                                        <button
                                            type="button"
                                            onClick={() => setRecherche('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                                            aria-label="Effacer la recherche"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </form>

                            <div className="flex flex-wrap items-center gap-3">
                                {aDesFiltres && (
                                    <button
                                        type="button"
                                        onClick={reinitialiser}
                                        className="anim-men-alerte rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-md"
                                    >
                                        ✕ Réinitialiser
                                    </button>
                                )}
                                {peutCreer && <BoutonImporterMenages />}
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-4">
                            <Etiquette label="Statut">
                                <select
                                    className={CLASSE_SELECT}
                                    value={filtres?.statut ?? ''}
                                    onChange={(e) =>
                                        appliquerFiltres({
                                            ...filtres,
                                            statut: e.target.value || undefined,
                                        })
                                    }
                                >
                                    <option value="">Tous les statuts</option>
                                    <option value="a_faire">À faire</option>
                                    <option value="en_attente">En attente</option>
                                    <option value="deja_commence">Déjà commencé</option>
                                    <option value="termine">Terminé</option>
                                </select>
                            </Etiquette>

                            <Etiquette label="Vergers de café">
                                <select
                                    className={CLASSE_SELECT}
                                    value={filtres?.possede_vergers_cafe ?? ''}
                                    onChange={(e) =>
                                        appliquerFiltres({
                                            ...filtres,
                                            possede_vergers_cafe:
                                                e.target.value || undefined,
                                        })
                                    }
                                >
                                    <option value="">Tous les ménages</option>
                                    <option value="Oui">Possèdent des vergers</option>
                                    <option value="Non">Ne possèdent pas de vergers</option>
                                </select>
                            </Etiquette>

                            <Etiquette label="Enquêteur">
                                <select
                                    className={CLASSE_SELECT}
                                    value={filtres?.enqueteur_id ?? ''}
                                    onChange={(e) =>
                                        appliquerFiltres({
                                            ...filtres,
                                            enqueteur_id: e.target.value || undefined,
                                        })
                                    }
                                >
                                    <option value="">Tous les enquêteurs</option>
                                    {(enqueteurs ?? []).map((enqueteur) => (
                                        <option key={enqueteur.id} value={enqueteur.id}>
                                            {enqueteur.name}
                                        </option>
                                    ))}
                                </select>
                            </Etiquette>
                        </div>

                        {/* Filtres territoriaux */}
                        <div className="mt-4 flex flex-wrap gap-4 border-t border-gray-100 pt-4">
                            <FiltresTerritoriaux
                                valeurs={filtres}
                                onChange={appliquerFiltres}
                                provinces={provinces ?? []}
                                communes={communes ?? []}
                                zones={zones ?? []}
                                collines={collines ?? []}
                            />
                        </div>
                    </div>

                    {/* Liste des ménages */}
                    <div
                        className="anim-men-carte overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                        style={{ animationDelay: '120ms' }}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">
                                    Liste des ménages
                                </h3>
                                <p className="text-sm text-gray-500">
                                    <span className="font-semibold text-indigo-600">
                                        {menages?.total ?? 0}
                                    </span>{' '}
                                    ménage(s) trouvé(s)
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <LienExport href={route('exports.menages-xlsx', filtres)} icone={ICONE_EXPORT}>
                                    Excel
                                </LienExport>
                                <LienExport href={route('exports.menages-csv', filtres)} icone={ICONE_EXPORT}>
                                    CSV
                                </LienExport>
                                <LienExport href={route('exports.menages-pdf', filtres)} icone={ICONE_EXPORT}>
                                    PDF
                                </LienExport>
                                <LienExport href={route('exports.parcelles-geojson', filtres)} icone={ICONE_EXPORT}>
                                    GeoJSON
                                </LienExport>

                                {peutCreer && (
                                    <Link href={route('menages.create')}>
                                        <PrimaryButton className="transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                                            + Nouveau ménage
                                        </PrimaryButton>
                                    </Link>
                                )}
                            </div>
                        </div>

                        <div
                            className={`overflow-x-auto transition-opacity duration-200 ${
                                chargement ? 'opacity-60' : 'opacity-100'
                            }`}
                        >
                            <table className="w-full text-left text-sm">
                                <thead className="border-y border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Code</th>
                                        <th className="px-6 py-3 font-semibold">Chef de ménage</th>
                                        <th className="px-6 py-3 font-semibold">Localisation</th>
                                        <th className="px-6 py-3 font-semibold">Enquêteur</th>
                                        <th className="px-6 py-3 font-semibold">Statut</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100">
                                    {lignes.map((menage, index) => {
                                        const statut =
                                            LIBELLES_STATUT[menage.statut] ??
                                            STATUT_PAR_DEFAUT;

                                        const chefMenage = [
                                            menage.prenom_chef_menage,
                                            menage.nom_chef_menage,
                                        ]
                                            .filter(Boolean)
                                            .join(' ');

                                        const colline = menage.colline?.nom;
                                        const zoneCommune = [
                                            menage.colline?.zone?.nom,
                                            menage.colline?.zone?.commune?.nom,
                                        ]
                                            .filter(Boolean)
                                            .join(', ');

                                        const ouvrir = () =>
                                            router.visit(route('menages.show', menage.id));

                                        return (
                                            <tr
                                                key={menage.id}
                                                tabIndex={0}
                                                className="anim-men-ligne cursor-pointer transition-colors duration-150 hover:bg-indigo-50/40 focus:bg-indigo-50/40 focus:outline-none"
                                                style={{ animationDelay: `${Math.min(index, 15) * 30}ms` }}
                                                onClick={ouvrir}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') ouvrir();
                                                }}
                                            >
                                                <td className="px-6 py-4">
                                                    <span className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs font-semibold text-gray-800">
                                                        {menage.code_menage ?? '—'}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-xs font-semibold text-white shadow-sm">
                                                            {initiales(chefMenage) || '—'}
                                                        </div>
                                                        <span className="font-medium text-gray-900">
                                                            {chefMenage || '—'}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4">
                                                    {colline || zoneCommune ? (
                                                        <>
                                                            <p className="font-medium text-gray-800">
                                                                {colline ?? '—'}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {zoneCommune}
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>

                                                <td className="px-6 py-4 text-gray-600">
                                                    {menage.enqueteur?.name ?? '—'}
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statut.classe}`}
                                                    >
                                                        <span className={`h-1.5 w-1.5 rounded-full ${statut.point}`} />
                                                        {statut.texte}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {lignes.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-16 text-center">
                                                <div className="anim-men-alerte mx-auto flex max-w-xs flex-col items-center gap-3 text-gray-500">
                                                    <svg
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        className="h-12 w-12 text-gray-300"
                                                        aria-hidden="true"
                                                    >
                                                        <circle cx="11" cy="11" r="7" />
                                                        <path strokeLinecap="round" d="m20 20-3.5-3.5" />
                                                    </svg>
                                                    <p className="font-medium text-gray-700">Aucun résultat</p>
                                                    <p className="text-sm">
                                                        Aucun ménage ne correspond aux critères.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {(menages?.links ?? []).length > 3 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-4">
                                <p className="text-sm text-gray-500">
                                    {menages.from ?? 0}–{menages.to ?? 0} sur {menages.total ?? 0}
                                </p>

                                <div className="flex flex-wrap gap-1">
                                    {menages.links.map((lien, index) => (
                                        <Link
                                            key={`${index}-${lien.label}`}
                                            href={lien.url ?? '#'}
                                            preserveScroll
                                            className={`rounded-lg border px-3 py-1.5 text-sm transition duration-200 ${
                                                lien.active
                                                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                                                    : 'border-gray-200 text-gray-600 hover:-translate-y-0.5 hover:bg-gray-50'
                                            } ${!lien.url ? 'pointer-events-none opacity-40' : ''}`}
                                        >
                                            {texteLien(lien.label)}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}