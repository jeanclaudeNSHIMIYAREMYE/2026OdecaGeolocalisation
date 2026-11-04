import FiltresTerritoriaux from '@/Components/FiltresTerritoriaux';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import BoutonImporterMenages from './Partials/BoutonImporterMenages';
import { detailsStatutMenage } from '@/Constants/statutsMenage';

// ============================================================
// STATUTS
// ============================================================

const LIBELLES_STATUT = {
    a_faire: {
        texte: 'À faire',
        classe: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
        point: 'bg-gray-400',
    },
    en_attente: {
        texte: 'En attente',
        classe: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
        point: 'bg-amber-500',
    },
    termine: {
        texte: 'Terminé',
        classe: 'bg-green-50 text-green-700 ring-1 ring-green-200',
        point: 'bg-green-500',
    },
};

const STATUT_PAR_DEFAUT = {
    texte: 'Non défini',
    classe: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
    point: 'bg-gray-400',
};

// ============================================================
// STYLES PARTAGÉS
// ============================================================

const CLASSE_SELECT =
    'w-full rounded-xl border-gray-200 bg-gray-50/60 text-sm shadow-sm transition duration-200 ' +
    'hover:border-green-300 focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-600/25';

const ICONE_EXPORT =
    'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3';

// Couleurs du drapeau : rouge #CE1126 · blanc · vert #18B637
const STYLES_PAGE = `
@keyframes menEntree {
    from { opacity: 0; transform: translateY(14px); }
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
@keyframes menDrapeau {
    from { background-position: 0 0; }
    to   { background-position: 200% 0; }
}
@keyframes menHalo {
    0%, 100% { transform: translate(0, 0) scale(1); opacity: .5; }
    50%      { transform: translate(-20px, 16px) scale(1.15); opacity: .8; }
}
@keyframes menBrillance {
    from { transform: translateX(-130%) skewX(-18deg); }
    to   { transform: translateX(260%) skewX(-18deg); }
}

.anim-men-carte  { opacity: 0; animation: menEntree .55s cubic-bezier(.22, 1, .36, 1) forwards; }
.anim-men-ligne  { opacity: 0; animation: menEntree .45s cubic-bezier(.22, 1, .36, 1) forwards; }
.anim-men-alerte { animation: menAlerte .35s ease-out both; }
.anim-men-barre  { animation: menBarre 1s ease-in-out infinite; }

.men-drapeau {
    background: linear-gradient(90deg, #ce1126, #ffffff, #18b637, #ce1126);
    background-size: 200% 100%;
    animation: menDrapeau 7s linear infinite;
}
.men-banniere {
    background:
        radial-gradient(90% 120% at 100% 0%, rgba(24, 182, 55, .30) 0%, transparent 60%),
        linear-gradient(160deg, #0a3b21 0%, #0d4a2a 55%, #07301a 100%);
}
.men-halo {
    background: radial-gradient(circle, rgba(206, 17, 38, .55) 0%, transparent 70%);
    animation: menHalo 9s ease-in-out infinite;
}
.men-bouton-principal {
    background: linear-gradient(135deg, #e11d36 0%, #ce1126 55%, #9f0d1d 100%);
    box-shadow: 0 10px 20px -8px rgba(206, 17, 38, .7);
}
.men-bouton-vert {
    background: linear-gradient(135deg, #18b637 0%, #0d6b2c 100%);
    box-shadow: 0 8px 16px -6px rgba(13, 107, 44, .6);
}
.men-brillance { position: relative; overflow: hidden; }
.men-brillance::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 35%;
    background: linear-gradient(100deg, transparent, rgba(255, 255, 255, .35), transparent);
    transform: translateX(-130%) skewX(-18deg);
    pointer-events: none;
}
.men-brillance:hover::after { animation: menBrillance .8s ease-out; }
.men-ligne:hover { box-shadow: inset 3px 0 0 0 #18b637; }
.men-ligne:focus { box-shadow: inset 3px 0 0 0 #ce1126; }

@media (prefers-reduced-motion: reduce) {
    .anim-men-carte, .anim-men-ligne, .anim-men-alerte, .anim-men-barre,
    .men-drapeau, .men-halo, .men-brillance:hover::after {
        animation: none !important;
    }
    .anim-men-carte, .anim-men-ligne { opacity: 1 !important; }
}
`;

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

const texteLien = (label = '') =>
    label
        .replace(/<[^>]*>/g, '')
        .replace('&laquo;', '←')
        .replace('&raquo;', '→')
        .replace('Previous', 'Précédent')
        .replace('Next', 'Suivant')
        .trim();

// Alterne vert / rouge pour les avatars, selon l'identifiant
const degradeAvatar = (id) =>
    Number(id) % 2 === 0
        ? 'from-green-500 to-emerald-700'
        : 'from-red-500 to-rose-700';

// ============================================================
// PETITS COMPOSANTS
// ============================================================

function Etiquette({ label, children }) {
    return (
        <div className="min-w-[170px]">
            <label className="mb-1.5 block text-xs font-semibold text-gray-500">
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
            className="men-brillance group inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5"
                aria-hidden="true"
            >
                <path strokeLinecap="round" strokeLinejoin="round" d={icone} />
            </svg>
            {children}
        </a>
    );
}

// ============================================================
// PAGE
// ============================================================

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
                    Caféiculteurs
                </h2>
            }
        >
            <Head title="Ménages" />

            <style>{STYLES_PAGE}</style>

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-5 sm:px-6 lg:px-8">
                    {flash?.succes && (
                        <div
                            className="anim-men-alerte flex items-center gap-3 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-white p-4 text-sm text-green-800 shadow-sm"
                            role="status"
                        >
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

                    {/* Recherche et filtres */}
                    <div
                        className="anim-men-carte relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                        style={{ animationDelay: '0ms' }}
                    >
                        <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-gray-100">
                            {chargement ? (
                                <div className="anim-men-barre h-full w-1/3 rounded-full bg-gradient-to-r from-red-600 via-white to-green-600" />
                            ) : (
                                <div className="men-drapeau h-full w-full" />
                            )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
                            <form
                                onSubmit={soumettreRecherche}
                                className="w-full max-w-md flex-1"
                            >
                                <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                                    Recherche
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
                                        value={recherche}
                                        onChange={(e) => setRecherche(e.target.value)}
                                        placeholder="Code Caféiculteur, nom du Caféiculteur…"
                                        className={`${CLASSE_SELECT} py-2.5 pl-10 pr-10`}
                                        autoComplete="off"
                                    />
                                    {recherche && (
                                        <button
                                            type="button"
                                            onClick={() => setRecherche('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition hover:rotate-90 hover:bg-red-50 hover:text-red-600"
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
                                        className="anim-men-alerte rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
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
                                    <option value="">Tous les Caféiculteurs</option>
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
                        {/* Bannière */}
                        <div className="men-banniere relative overflow-hidden">
                            <div
                                aria-hidden="true"
                                className="men-halo pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full blur-2xl"
                            />

                            <div className="relative flex flex-wrap items-center justify-between gap-5 p-6">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-14 min-w-[3.5rem] items-center justify-center rounded-2xl bg-white px-3 text-xl font-bold text-green-800 shadow-lg shadow-black/25 ring-1 ring-white/40">
                                        {menages?.total ?? 0}
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold tracking-tight text-white">
                                            Liste des Caféiculteurs
                                        </h3>
                                        <p className="text-sm text-green-100/70">
                                            Caféiculteur(s) trouvé(s)
                                        </p>
                                    </div>
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
                                        <Link
                                            href={route('menages.create')}
                                            className="men-bouton-principal men-brillance inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:scale-95"
                                        >
                                            <span aria-hidden="true" className="text-base leading-none">+</span>
                                            Nouveau Caféiculteur
                                        </Link>
                                    )}
                                </div>
                            </div>

                            <div className="men-drapeau h-1 w-full" aria-hidden="true" />
                        </div>

                        <div
                            className={`overflow-x-auto transition-opacity duration-200 ${
                                chargement ? 'opacity-60' : 'opacity-100'
                            }`}
                        >
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-green-100 bg-gradient-to-r from-green-50 via-white to-red-50/40 text-xs text-gray-600">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Code</th>
                                        <th className="px-6 py-3 font-semibold">Caféiculteur</th>
                                        <th className="px-6 py-3 font-semibold">Localisation</th>
                                        <th className="px-6 py-3 font-semibold">Enquêteur</th>
                                        <th className="px-6 py-3 font-semibold">Statut</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100">
                                    {lignes.map((menage, index) => {
                                        const statut =
                                            detailsStatutMenage(menage.statut);

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
                                                className="anim-men-ligne men-ligne group cursor-pointer transition-all duration-200 hover:bg-gradient-to-r hover:from-green-50/80 hover:to-transparent focus:bg-gradient-to-r focus:from-red-50/60 focus:to-transparent focus:outline-none"
                                                style={{ animationDelay: `${Math.min(index, 15) * 30}ms` }}
                                                onClick={ouvrir}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') ouvrir();
                                                }}
                                            >
                                                <td className="px-6 py-4">
                                                    <span className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs font-semibold text-gray-800 transition-colors duration-200 group-hover:bg-green-100 group-hover:text-green-900">
                                                        {menage.code_menage ?? '—'}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${degradeAvatar(
                                                                menage.id,
                                                            )} text-xs font-semibold text-white shadow-md ring-2 ring-white transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}
                                                        >
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
                                                    <p className="font-medium text-gray-700">Aucun résultat</p>
                                                    <p className="text-sm">
                                                        Aucun Caféiculteur ne correspond aux critères.
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
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/50 p-4">
                                <p className="text-sm text-gray-500">
                                    {menages.from ?? 0}–{menages.to ?? 0} sur {menages.total ?? 0}
                                </p>

                                <div className="flex flex-wrap gap-1.5">
                                    {menages.links.map((lien, index) => (
                                        <Link
                                            key={`${index}-${lien.label}`}
                                            href={lien.url ?? '#'}
                                            preserveScroll
                                            className={`rounded-lg border px-3 py-1.5 text-sm transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 ${
                                                lien.active
                                                    ? 'men-bouton-vert border-transparent font-semibold text-white'
                                                    : 'border-gray-200 bg-white text-gray-600 hover:-translate-y-0.5 hover:border-green-300 hover:bg-green-50 hover:text-green-800'
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