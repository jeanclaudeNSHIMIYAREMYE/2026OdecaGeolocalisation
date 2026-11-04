import FiltresTerritoriaux from '@/Components/FiltresTerritoriaux';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { detailsStatutMenage } from '@/Constants/statutsMenage';

// ============================================================
// STATUTS
// ============================================================

const LIBELLES_STATUT = {
    termine: {
        texte: 'Terminé',
        classe: 'bg-green-50 text-green-700 ring-1 ring-green-200',
        point: 'bg-green-500',
    },
    en_attente: {
        texte: 'En attente',
        classe: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
        point: 'bg-amber-500',
    },
    a_faire: {
        texte: 'À faire',
        classe: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
        point: 'bg-gray-400',
    },
};

const STATUT_PAR_DEFAUT = {
    texte: 'Non défini',
    classe: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
    point: 'bg-gray-400',
};

// ============================================================
// STYLES PARTAGÉS
// Couleurs du drapeau : rouge #CE1126 · blanc · vert #18B637
// ============================================================

const CLASSE_SELECT =
    'w-full rounded-xl border-gray-200 bg-gray-50/60 text-sm shadow-sm transition duration-200 ' +
    'hover:border-green-300 focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-600/25';

const ICONE_EXPORT =
    'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3';

const ICONES_COMPTEURS = {
    pre: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2',
    nouveau: 'M12 4.5v15m7.5-7.5h-15',
    repondu: 'm8.5 12 2.25 2.25L15.5 9.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    attente: 'M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
};

const STYLES_PAGE = `
@keyframes suiEntree {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
}
@keyframes suiBarre {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(350%); }
}
@keyframes suiDrapeau {
    from { background-position: 0 0; }
    to   { background-position: 200% 0; }
}
@keyframes suiHalo {
    0%, 100% { transform: translate(0, 0) scale(1); opacity: .5; }
    50%      { transform: translate(-20px, 16px) scale(1.15); opacity: .8; }
}
@keyframes suiBrillance {
    from { transform: translateX(-130%) skewX(-18deg); }
    to   { transform: translateX(260%) skewX(-18deg); }
}

.anim-sui-carte  { opacity: 0; animation: suiEntree .55s cubic-bezier(.22, 1, .36, 1) forwards; }
.anim-sui-ligne  { opacity: 0; animation: suiEntree .45s cubic-bezier(.22, 1, .36, 1) forwards; }
.anim-sui-barre  { animation: suiBarre 1s ease-in-out infinite; }

.sui-drapeau {
    background: linear-gradient(90deg, #ce1126, #ffffff, #18b637, #ce1126);
    background-size: 200% 100%;
    animation: suiDrapeau 7s linear infinite;
}
.sui-banniere {
    background:
        radial-gradient(90% 120% at 100% 0%, rgba(24, 182, 55, .30) 0%, transparent 60%),
        linear-gradient(160deg, #0a3b21 0%, #0d4a2a 55%, #07301a 100%);
}
.sui-halo {
    background: radial-gradient(circle, rgba(206, 17, 38, .55) 0%, transparent 70%);
    animation: suiHalo 9s ease-in-out infinite;
}
.sui-fond-vert  { background: linear-gradient(135deg, #18b637 0%, #0d6b2c 100%); box-shadow: 0 8px 16px -6px rgba(13, 107, 44, .6); }
.sui-fond-rouge { background: linear-gradient(135deg, #e11d36 0%, #ce1126 55%, #9f0d1d 100%); box-shadow: 0 8px 16px -6px rgba(206, 17, 38, .65); }
.sui-fond-sombre { background: linear-gradient(135deg, #0d4a2a 0%, #07301a 100%); box-shadow: 0 8px 16px -6px rgba(7, 48, 26, .7); }

.sui-brillance { position: relative; overflow: hidden; }
.sui-brillance::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 35%;
    background: linear-gradient(100deg, transparent, rgba(255, 255, 255, .35), transparent);
    transform: translateX(-130%) skewX(-18deg);
    pointer-events: none;
}
.sui-brillance:hover::after { animation: suiBrillance .8s ease-out; }
.sui-ligne:hover { box-shadow: inset 3px 0 0 0 #18b637; }
.sui-ligne:focus { box-shadow: inset 3px 0 0 0 #ce1126; }

@media (prefers-reduced-motion: reduce) {
    .anim-sui-carte, .anim-sui-ligne, .anim-sui-barre,
    .sui-drapeau, .sui-halo, .sui-brillance:hover::after {
        animation: none !important;
    }
    .anim-sui-carte, .anim-sui-ligne { opacity: 1 !important; }
}
`;

// ============================================================
// COMPTEUR ANIMÉ (monte progressivement jusqu'à la valeur)
// ============================================================

function useCompteurAnime(cible, duree = 900) {
    const valeurCible = Number(cible ?? 0);
    const [valeur, setValeur] = useState(0);

    useEffect(() => {
        const reduit = window.matchMedia?.(
            '(prefers-reduced-motion: reduce)',
        ).matches;

        if (reduit || valeurCible === 0) {
            setValeur(valeurCible);
            return;
        }

        let image;
        const debut = performance.now();

        const etape = (maintenant) => {
            const progression = Math.min((maintenant - debut) / duree, 1);
            const adoucie = 1 - Math.pow(1 - progression, 3);

            setValeur(Math.round(valeurCible * adoucie));

            if (progression < 1) {
                image = requestAnimationFrame(etape);
            }
        };

        image = requestAnimationFrame(etape);

        return () => cancelAnimationFrame(image);
    }, [valeurCible, duree]);

    return valeur;
}

// ============================================================
// COMPOSANTS
// ============================================================

function CarteCompteur({ titre, valeur, fond, couleurTexte, icone, ordre }) {
    const affichee = useCompteurAnime(valeur);

    return (
        <div
            className="anim-sui-carte group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            style={{ animationDelay: `${ordre * 70}ms` }}
        >
            <span
                aria-hidden="true"
                className={`${fond} absolute inset-x-0 top-0 h-1`}
            />

            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm text-gray-500">{titre}</p>
                    <p
                        className={`mt-2 text-3xl font-bold tabular-nums tracking-tight ${couleurTexte}`}
                    >
                        {affichee}
                    </p>
                </div>

                <span
                    className={`${fond} flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110`}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d={icone}
                        />
                    </svg>
                </span>
            </div>
        </div>
    );
}

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

function LienExport({ href, children }) {
    return (
        <a
            href={href}
            className="sui-brillance group inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5"
                aria-hidden="true"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={ICONE_EXPORT}
                />
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
    compteurs,
    provinces,
    communes,
    zones,
    collines,
}) {
    const [chargement, setChargement] = useState(false);

    const appliquer = (nouveauxFiltres) => {
        router.get(route('suivi-menages.index'), nouveauxFiltres, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setChargement(true),
            onFinish: () => setChargement(false),
        });
    };

    const listeMenages = menages?.data ?? [];
    const liensPagination = menages?.links ?? [];

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Suivi des caféiculteur
                </h2>
            }
        >
            <Head title="Suivi des ménages" />

            <style>{STYLES_PAGE}</style>

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {/* Compteurs */}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <CarteCompteur
                            titre="Pré-enregistrés"
                            valeur={compteurs?.pre_enregistres}
                            fond="sui-fond-sombre"
                            couleurTexte="text-gray-900"
                            icone={ICONES_COMPTEURS.pre}
                            ordre={0}
                        />

                        <CarteCompteur
                            titre="Nouveaux (terrain)"
                            valeur={compteurs?.nouveaux_terrain}
                            fond="sui-fond-vert"
                            couleurTexte="text-burundi-vert"
                            icone={ICONES_COMPTEURS.nouveau}
                            ordre={1}
                        />

                        <CarteCompteur
                            titre="Ont répondu au questionnaire"
                            valeur={compteurs?.avec_reponse}
                            fond="sui-fond-vert"
                            couleurTexte="text-burundi-vert"
                            icone={ICONES_COMPTEURS.repondu}
                            ordre={2}
                        />

                        <CarteCompteur
                            titre="N'ont pas encore répondu"
                            valeur={compteurs?.sans_reponse}
                            fond="sui-fond-rouge"
                            couleurTexte="text-burundi-rouge"
                            icone={ICONES_COMPTEURS.attente}
                            ordre={3}
                        />
                    </div>

                    {/* Filtres */}
                    <div
                        className="anim-sui-carte relative space-y-4 overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                        style={{ animationDelay: '280ms' }}
                    >
                        <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-gray-100">
                            {chargement ? (
                                <div className="anim-sui-barre h-full w-1/3 rounded-full bg-gradient-to-r from-red-600 via-white to-green-600" />
                            ) : (
                                <div className="sui-drapeau h-full w-full" />
                            )}
                        </div>

                        <div className="mt-1 flex flex-wrap gap-4">
                            {/* Origine */}
                            <Etiquette label="Origine">
                                <select
                                    className={CLASSE_SELECT}
                                    value={filtres?.source ?? ''}
                                    onChange={(e) =>
                                        appliquer({
                                            ...filtres,
                                            source: e.target.value || undefined,
                                        })
                                    }
                                >
                                    <option value="">Toutes origines</option>
                                    <option value="pre_enregistre">
                                        Pré-enregistrés
                                    </option>
                                    <option value="terrain">
                                        Nouveaux (terrain)
                                    </option>
                                </select>
                            </Etiquette>

                            {/* Questionnaire */}
                            <Etiquette label="Questionnaire">
                                <select
                                    className={CLASSE_SELECT}
                                    value={filtres?.a_repondu ?? ''}
                                    onChange={(e) =>
                                        appliquer({
                                            ...filtres,
                                            a_repondu:
                                                e.target.value || undefined,
                                        })
                                    }
                                >
                                    <option value="">
                                        Questionnaire : tous
                                    </option>
                                    <option value="oui">A répondu</option>
                                    <option value="non">
                                        N'a pas répondu
                                    </option>
                                </select>
                            </Etiquette>

                            {/* Statut */}
                            <Etiquette label="Statut">
                                <select
                                    className={CLASSE_SELECT}
                                    value={filtres?.statut ?? ''}
                                    onChange={(e) =>
                                        appliquer({
                                            ...filtres,
                                            statut: e.target.value || undefined,
                                        })
                                    }
                                >
                                    <option value="">Tous les statuts</option>
                                    <option value="a_faire">À faire</option>
                                    <option value="en_attente">
                                        En attente
                                    </option>
                                    <option value="termine">Terminé</option>
                                </select>
                            </Etiquette>
                        </div>

                        {/* Filtres territoriaux */}
                        <div className="flex flex-wrap gap-4 border-t border-gray-100 pt-4">
                            <FiltresTerritoriaux
                                valeurs={filtres ?? {}}
                                onChange={appliquer}
                                provinces={provinces ?? []}
                                communes={communes ?? []}
                                zones={zones ?? []}
                                collines={collines ?? []}
                            />
                        </div>
                    </div>

                    {/* Exports et tableau */}
                    <div
                        className="anim-sui-carte overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                        style={{ animationDelay: '360ms' }}
                    >
                        {/* Bannière */}
                        <div className="sui-banniere relative overflow-hidden">
                            <div
                                aria-hidden="true"
                                className="sui-halo pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full blur-2xl"
                            />

                            <div className="relative flex flex-wrap items-center justify-between gap-5 p-6">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-14 min-w-[3.5rem] items-center justify-center rounded-2xl bg-white px-3 text-xl font-bold text-green-800 shadow-lg shadow-black/25 ring-1 ring-white/40">
                                        {menages?.total ?? 0}
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold tracking-tight text-white">
                                            Caféiculteurs suivis
                                        </h3>
                                        <p className="text-sm text-green-100/70">
                                            caféiculteur(s) trouvé(s)
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <LienExport
                                        href={route('suivi-menages.xlsx', filtres)}
                                    >
                                        Excel
                                    </LienExport>

                                    <LienExport
                                        href={route('suivi-menages.csv', filtres)}
                                    >
                                        CSV
                                    </LienExport>

                                    <LienExport
                                        href={route('suivi-menages.pdf', filtres)}
                                    >
                                        PDF
                                    </LienExport>

                                    <LienExport
                                        href={route('suivi-menages.geojson', filtres)}
                                    >
                                        GeoJSON
                                    </LienExport>
                                </div>
                            </div>

                            <div className="sui-drapeau h-1 w-full" aria-hidden="true" />
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
                                        <th className="px-6 py-3 font-semibold">Origine</th>
                                        <th className="px-6 py-3 font-semibold">
                                            Questionnaire
                                        </th>
                                        <th className="px-6 py-3 font-semibold">
                                            caféiculteur
                                        </th>
                                        <th className="px-6 py-3 font-semibold">
                                            Localisation
                                        </th>
                                        <th className="px-6 py-3 font-semibold">Statut</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100">
                                    {listeMenages.map((menage, index) => {
                                        // Évite l'erreur si le statut est inconnu
                                        // ou si sa valeur est null.
                                        const statut =
                                            detailsStatutMenage(menage.statut);

                                        const chefMenage = [
                                            menage.prenom_chef_menage,
                                            menage.nom_chef_menage,
                                        ]
                                            .filter(Boolean)
                                            .join(' ');

                                        const localisation = [
                                            menage.colline?.nom,
                                            menage.colline?.zone?.nom,
                                            menage.colline?.zone?.commune?.nom,
                                        ]
                                            .filter(Boolean)
                                            .join(', ');

                                        const ouvrir = () =>
                                            router.visit(
                                                route('menages.show', menage.id),
                                            );

                                        const aRepondu =
                                            Number(menage.reponses_count ?? 0) > 0;

                                        return (
                                            <tr
                                                key={menage.id}
                                                tabIndex={0}
                                                className="anim-sui-ligne sui-ligne group cursor-pointer transition-all duration-200 hover:bg-gradient-to-r hover:from-green-50/80 hover:to-transparent focus:bg-gradient-to-r focus:from-red-50/60 focus:to-transparent focus:outline-none"
                                                style={{
                                                    animationDelay: `${Math.min(index, 15) * 30}ms`,
                                                }}
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
                                                    <span
                                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                                                            menage.source === 'terrain'
                                                                ? 'bg-green-50 text-green-700 ring-green-200'
                                                                : 'bg-gray-100 text-gray-600 ring-gray-200'
                                                        }`}
                                                    >
                                                        {menage.source === 'terrain'
                                                            ? 'Nouveau'
                                                            : 'Pré-enregistré'}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 font-medium ${
                                                            aRepondu
                                                                ? 'text-burundi-vert'
                                                                : 'text-burundi-rouge'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`h-2 w-2 rounded-full ${
                                                                aRepondu
                                                                    ? 'bg-green-500'
                                                                    : 'bg-red-500'
                                                            }`}
                                                        />
                                                        {aRepondu ? 'Oui' : 'Non'}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4 font-medium text-gray-800">
                                                    {chefMenage || '—'}
                                                </td>

                                                <td className="px-6 py-4 text-gray-600">
                                                    {localisation || '—'}
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statut.classe}`}
                                                    >
                                                        <span
                                                            className={`h-1.5 w-1.5 rounded-full ${statut.point}`}
                                                        />
                                                        {statut.texte}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {listeMenages.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-6 py-16 text-center"
                                            >
                                                <div className="mx-auto flex max-w-xs flex-col items-center gap-3 text-gray-500">
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
                                                            <path
                                                                strokeLinecap="round"
                                                                d="m20 20-3.5-3.5"
                                                            />
                                                        </svg>
                                                    </span>
                                                    <p className="font-medium text-gray-700">
                                                        Aucun résultat
                                                    </p>
                                                    <p className="text-sm">
                                                        Aucun Caféiculteur ne correspond aux
                                                        critères.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {liensPagination.length > 3 && (
                            <div className="flex flex-wrap gap-1.5 border-t border-gray-100 bg-gray-50/50 p-4">
                                {liensPagination.map((lien, index) => (
                                    <Link
                                        key={`${index}-${lien.label}`}
                                        href={lien.url ?? '#'}
                                        preserveScroll
                                        className={`rounded-lg border px-3 py-1.5 text-sm transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 ${
                                            lien.active
                                                ? 'sui-fond-vert border-transparent font-semibold text-white'
                                                : 'border-gray-200 bg-white text-gray-600 hover:-translate-y-0.5 hover:border-green-300 hover:bg-green-50 hover:text-green-800'
                                        } ${
                                            !lien.url
                                                ? 'pointer-events-none opacity-40'
                                                : ''
                                        }`}
                                        dangerouslySetInnerHTML={{
                                            __html: lien.label,
                                        }}
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