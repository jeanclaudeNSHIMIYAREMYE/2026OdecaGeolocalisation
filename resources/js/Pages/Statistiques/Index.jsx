import FiltresTerritoriaux from '@/Components/FiltresTerritoriaux';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

// ============================================================
// STYLES ET ANIMATIONS
// Couleurs du drapeau : rouge #CE1126 · blanc · vert #18B637
// ============================================================

const STYLES_PAGE = `
@keyframes staEntree {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
}
@keyframes staDrapeau {
    from { background-position: 0 0; }
    to   { background-position: 200% 0; }
}
@keyframes staHalo {
    0%, 100% { transform: translate(0, 0) scale(1); opacity: .5; }
    50%      { transform: translate(-20px, 16px) scale(1.15); opacity: .8; }
}
@keyframes staReflet {
    from { transform: translateX(-120%); }
    to   { transform: translateX(320%); }
}

.anim-sta-carte { opacity: 0; animation: staEntree .55s cubic-bezier(.22, 1, .36, 1) forwards; }
.anim-sta-ligne { opacity: 0; animation: staEntree .45s cubic-bezier(.22, 1, .36, 1) forwards; }

.sta-drapeau {
    background: linear-gradient(90deg, #ce1126, #ffffff, #18b637, #ce1126);
    background-size: 200% 100%;
    animation: staDrapeau 7s linear infinite;
}
.sta-halo {
    background: radial-gradient(circle, rgba(206, 17, 38, .55) 0%, transparent 70%);
    animation: staHalo 9s ease-in-out infinite;
}
.sta-fond-vert   { background: linear-gradient(135deg, #18b637 0%, #0d6b2c 100%); box-shadow: 0 8px 16px -6px rgba(13, 107, 44, .6); }
.sta-fond-rouge  { background: linear-gradient(135deg, #e11d36 0%, #ce1126 55%, #9f0d1d 100%); box-shadow: 0 8px 16px -6px rgba(206, 17, 38, .65); }
.sta-fond-sombre { background: linear-gradient(135deg, #0d4a2a 0%, #07301a 100%); box-shadow: 0 8px 16px -6px rgba(7, 48, 26, .7); }

/* Barres : la largeur / hauteur est animée par transition */
.sta-barre {
    position: relative;
    overflow: hidden;
    transition: width 1s cubic-bezier(.22, 1, .36, 1), height 1s cubic-bezier(.22, 1, .36, 1);
}
.sta-barre::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 35%;
    background: linear-gradient(100deg, transparent, rgba(255, 255, 255, .45), transparent);
    transform: translateX(-120%);
    animation: staReflet 2.4s ease-in-out 1.1s 1;
}
.sta-ligne:hover { box-shadow: inset 3px 0 0 0 #18b637; }

@media (prefers-reduced-motion: reduce) {
    .anim-sta-carte, .anim-sta-ligne, .sta-drapeau, .sta-halo, .sta-barre::after {
        animation: none !important;
    }
    .anim-sta-carte, .anim-sta-ligne { opacity: 1 !important; }
    .sta-barre { transition: none !important; }
}
`;

const CLASSE_CHAMP =
    'rounded-xl border-gray-200 bg-gray-50/60 text-sm shadow-sm transition duration-200 ' +
    'hover:border-green-300 focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-600/25';

const CLASSE_CARTE =
    'anim-sta-carte rounded-2xl border border-gray-100 bg-white shadow-sm';

const ICONES = {
    menages:
        'M17 20h5v-2a3 3 0 0 0-5.196-2.05M17 20H7m10 0v-2c0-.7-.12-1.37-.34-1.98M7 20H2v-2a3 3 0 0 1 5.196-2.05M7 20v-2c0-.7.12-1.37.34-1.98m0 0a5 5 0 0 1 9.32 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    parcelles:
        'M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z',
    geo: 'M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z',
    pieds: 'M12 21V9m0 0c0-3 2-5 6-5 0 4-2 6-6 5Zm0 3c0-2.5-1.8-4-5-4 0 3.2 1.8 5 5 4Z',
    moyenne: 'M3 3v18h18M8 16V9m5 7V5m5 11v-4',
    enqueteurs:
        'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m12-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
};

// ============================================================
// FONCTIONS UTILES
// ============================================================

/** Formatte un nombre avec des séparateurs de milliers (espace, style FR). */
function formatNombre(n) {
    return new Intl.NumberFormat('fr-FR').format(n ?? 0);
}

const mouvementReduit = () =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Compteur qui monte progressivement jusqu'à la valeur. */
function useCompteurAnime(cible, duree = 1000) {
    const valeurCible = Number(cible ?? 0);
    const [valeur, setValeur] = useState(0);

    useEffect(() => {
        if (mouvementReduit() || valeurCible === 0) {
            setValeur(valeurCible);
            return;
        }

        let image;
        const debut = performance.now();

        const etape = (maintenant) => {
            const progression = Math.min((maintenant - debut) / duree, 1);
            const adoucie = 1 - Math.pow(1 - progression, 3);

            if (progression >= 1) {
                setValeur(valeurCible);
                return;
            }

            setValeur(
                Number.isInteger(valeurCible)
                    ? Math.round(valeurCible * adoucie)
                    : Math.round(valeurCible * adoucie * 100) / 100,
            );
            image = requestAnimationFrame(etape);
        };

        image = requestAnimationFrame(etape);

        return () => cancelAnimationFrame(image);
    }, [valeurCible, duree]);

    return valeur;
}

/** Renvoie false au premier rendu, puis true : permet d'animer les barres. */
function useMonte(retard = 80) {
    const [monte, setMonte] = useState(mouvementReduit());

    useEffect(() => {
        if (monte) return;
        const minuteur = setTimeout(() => setMonte(true), retard);
        return () => clearTimeout(minuteur);
    }, [monte, retard]);

    return monte;
}

// ============================================================
// COMPOSANTS
// ============================================================

function TitreCarte({ children, droite }) {
    return (
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-green-50/70 via-white to-red-50/30 px-5 py-3.5">
            <h3 className="flex items-center gap-2.5 text-sm font-semibold text-gray-800">
                <span
                    aria-hidden="true"
                    className="h-4 w-1 rounded-full bg-gradient-to-b from-red-600 via-white to-green-600 ring-1 ring-gray-200"
                />
                {children}
            </h3>
            {droite}
        </div>
    );
}

function CarteKpi({ titre, valeur, sousTitre, accent = 'text-gray-900', fond, icone, ordre = 0, progression }) {
    const affichee = useCompteurAnime(valeur);
    const monte = useMonte(250);

    return (
        <div
            className="anim-sta-carte group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            style={{ animationDelay: `${ordre * 70}ms` }}
        >
            <span aria-hidden="true" className={`${fond} absolute inset-x-0 top-0 h-1`} />

            <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-gray-500">{titre}</p>
                <span
                    className={`${fond} flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110`}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-4 w-4"
                        aria-hidden="true"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d={icone} />
                    </svg>
                </span>
            </div>

            <p className={`mt-3 text-3xl font-bold tabular-nums tracking-tight ${accent}`}>
                {formatNombre(affichee)}
            </p>

            {sousTitre && <p className="mt-1 text-xs text-gray-500">{sousTitre}</p>}

            {progression !== undefined && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                        className="sta-barre sta-fond-vert h-full rounded-full"
                        style={{ width: monte ? `${Math.min(100, Number(progression) || 0)}%` : '0%' }}
                    />
                </div>
            )}
        </div>
    );
}

/** Barre de progression horizontale simple, sans dépendance externe. */
function BarreProgression({ label, total, pourcentage, couleur }) {
    const monte = useMonte();

    return (
        <div>
            <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{label}</span>
                <span className="tabular-nums text-gray-500">
                    {formatNombre(total)} ({pourcentage}%)
                </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                    className="sta-barre h-full rounded-full"
                    style={{
                        width: monte ? `${pourcentage}%` : '0%',
                        background: `linear-gradient(90deg, ${couleur}, ${couleur}cc)`,
                    }}
                />
            </div>
        </div>
    );
}

/** Liste répartition (clé -> nombre) sous forme de mini barres horizontales. */
function ListeRepartition({ donnees, couleur = '#1EB53A' }) {
    const entrees = Object.entries(donnees ?? {});
    const max = Math.max(1, ...entrees.map(([, v]) => v));
    const monte = useMonte();

    if (entrees.length === 0) {
        return <p className="text-sm text-gray-400">Aucune donnée pour ces filtres.</p>;
    }

    return (
        <div className="space-y-2.5">
            {entrees.map(([cle, valeur], index) => (
                <div key={cle} className="group flex items-center gap-3">
                    <span
                        className="w-40 shrink-0 truncate text-sm text-gray-600 transition-colors group-hover:text-gray-900"
                        title={cle}
                    >
                        {cle}
                    </span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                            className="sta-barre h-full rounded-full"
                            style={{
                                width: monte ? `${(valeur / max) * 100}%` : '0%',
                                transitionDelay: `${index * 60}ms`,
                                background: `linear-gradient(90deg, ${couleur}, ${couleur}b3)`,
                            }}
                        />
                    </div>
                    <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-700">
                        {formatNombre(valeur)}
                    </span>
                </div>
            ))}
        </div>
    );
}

function Rang({ numero }) {
    const classe =
        numero === 1
            ? 'sta-fond-vert text-white'
            : numero === 2
              ? 'bg-green-100 text-green-800'
              : numero === 3
                ? 'bg-red-50 text-red-700'
                : 'bg-gray-100 text-gray-500';

    return (
        <span
            className={`mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${classe}`}
        >
            {numero}
        </span>
    );
}

function EnTeteTableau({ colonnes }) {
    return (
        <thead className="border-b border-green-100 bg-gradient-to-r from-green-50 via-white to-red-50/40 text-xs text-gray-600">
            <tr>
                {colonnes.map((c) => (
                    <th key={c} className="px-6 py-3 font-semibold">
                        {c}
                    </th>
                ))}
            </tr>
        </thead>
    );
}

// ============================================================
// PAGE
// ============================================================

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

    const stylesSync = {
        envoye: { fond: 'bg-green-50 ring-green-200', texte: 'text-green-700', point: 'bg-green-500' },
        en_attente: { fond: 'bg-amber-50 ring-amber-200', texte: 'text-amber-700', point: 'bg-amber-500' },
        conflit: { fond: 'bg-red-50 ring-red-200', texte: 'text-red-700', point: 'bg-red-500' },
    };

    const monteEvolution = useMonte(150);

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Statistiques du projet</h2>}
        >
            <Head title="Statistiques" />

            <style>{STYLES_PAGE}</style>

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {/* Filtres */}
                    <div className={`${CLASSE_CARTE} relative overflow-hidden p-5`}>
                        <div className="sta-drapeau absolute inset-x-0 top-0 h-1" aria-hidden="true" />

                        <div className="mt-1 flex flex-wrap items-end gap-4">
                            <FiltresTerritoriaux
                                valeurs={filtres}
                                onChange={(nouveauxFiltres) => router.get(route('statistiques.index'), nouveauxFiltres, { preserveState: true, preserveScroll: true })}
                                provinces={provinces}
                                communes={communes}
                                zones={zones}
                                collines={collines}
                            />

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-gray-500">Enquêteur</label>
                                <select
                                    className={CLASSE_CHAMP}
                                    value={filtres.enqueteur_id ?? ''}
                                    onChange={(e) => appliquer('enqueteur_id', e.target.value)}
                                >
                                    <option value="">Tous les enquêteurs</option>
                                    {enqueteurs.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-gray-500">Du</label>
                                <input
                                    type="date"
                                    className={CLASSE_CHAMP}
                                    value={filtres.date_debut ?? ''}
                                    onChange={(e) => appliquer('date_debut', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-gray-500">Au</label>
                                <input
                                    type="date"
                                    className={CLASSE_CHAMP}
                                    value={filtres.date_fin ?? ''}
                                    onChange={(e) => appliquer('date_fin', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* KPI globaux */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        <CarteKpi
                            titre="Caféiculteurs"
                            valeur={kpis.total_menages}
                            fond="sta-fond-sombre"
                            icone={ICONES.menages}
                            ordre={0}
                        />
                        <CarteKpi
                            titre="Parcelles"
                            valeur={kpis.total_parcelles}
                            fond="sta-fond-vert"
                            icone={ICONES.parcelles}
                            ordre={1}
                        />
                        <CarteKpi
                            titre="Géolocalisées"
                            valeur={kpis.total_parcelles_geolocalisees}
                            sousTitre={`${kpis.taux_geolocalisation}% des parcelles`}
                            accent="text-burundi-vert"
                            fond="sta-fond-vert"
                            icone={ICONES.geo}
                            progression={kpis.taux_geolocalisation}
                            ordre={2}
                        />
                        <CarteKpi
                            titre="Pieds de café"
                            valeur={kpis.total_pieds}
                            fond="sta-fond-rouge"
                            icone={ICONES.pieds}
                            ordre={3}
                        />
                        <CarteKpi
                            titre="Moy. pieds / parcelle"
                            valeur={kpis.moyenne_pieds_par_parcelle}
                            fond="sta-fond-sombre"
                            icone={ICONES.moyenne}
                            ordre={4}
                        />
                        <CarteKpi
                            titre="Enquêteurs actifs"
                            valeur={parEnqueteur.length}
                            fond="sta-fond-rouge"
                            icone={ICONES.enqueteurs}
                            ordre={5}
                        />
                    </div>

                    {/* Enquêteurs affectés à la colline sélectionnée */}
                    {collineSelectionnee && (
                        <div className={`${CLASSE_CARTE} overflow-hidden`}>
                            <TitreCarte
                                droite={
                                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800 ring-1 ring-green-200">
                                        {enqueteursColline.length} enquêteur{enqueteursColline.length > 1 ? 's' : ''} affecté{enqueteursColline.length > 1 ? 's' : ''}
                                    </span>
                                }
                            >
                                Enquêteurs affectés à la colline « {collineSelectionnee.nom} »
                            </TitreCarte>

                            {enqueteursColline.length === 0 ? (
                                <p className="px-4 py-8 text-center text-sm text-gray-400">
                                    Aucun enquêteur n'est affecté à cette colline.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <EnTeteTableau
                                            colonnes={['Enquêteur', 'Statut', 'Ménages', 'Dont terminés', 'Parcelles', 'Pieds de café']}
                                        />
                                        <tbody className="divide-y divide-gray-100">
                                            {enqueteursColline.map((e, index) => (
                                                <tr
                                                    key={e.id}
                                                    className="anim-sta-ligne sta-ligne transition-all duration-200 hover:bg-gradient-to-r hover:from-green-50/80 hover:to-transparent"
                                                    style={{ animationDelay: `${Math.min(index, 15) * 30}ms` }}
                                                >
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
                                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                                                                e.actif
                                                                    ? 'bg-green-50 text-green-700 ring-green-200'
                                                                    : 'bg-gray-100 text-gray-500 ring-gray-200'
                                                            }`}
                                                        >
                                                            <span className={`h-1.5 w-1.5 rounded-full ${e.actif ? 'bg-green-500' : 'bg-gray-400'}`} />
                                                            {e.actif ? 'Actif' : 'Inactif'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 tabular-nums text-gray-600">{formatNombre(e.menages)}</td>
                                                    <td className="px-6 py-3 tabular-nums text-gray-600">{formatNombre(e.menages_termines)}</td>
                                                    <td className="px-6 py-3 tabular-nums text-gray-600">{formatNombre(e.parcelles)}</td>
                                                    <td className="px-6 py-3 tabular-nums text-gray-600">{formatNombre(e.pieds)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Avancement global */}
                        <div className={`${CLASSE_CARTE} overflow-hidden`} style={{ animationDelay: '120ms' }}>
                            <TitreCarte>Avancement des Caféiculteurs</TitreCarte>
                            <div className="space-y-5 p-5">
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
                        <div className={`${CLASSE_CARTE} overflow-hidden`} style={{ animationDelay: '200ms' }}>
                            <TitreCarte>État de synchronisation</TitreCarte>
                            <div className="p-5">
                                {Object.keys(parStatutSync ?? {}).length === 0 ? (
                                    <p className="text-sm text-gray-400">Aucun enregistrement de synchronisation pour ces filtres.</p>
                                ) : (
                                    <div className="grid grid-cols-3 gap-4">
                                        {Object.entries(libellesSync).map(([cle, label]) => (
                                            <div
                                                key={cle}
                                                className={`rounded-xl p-4 text-center ring-1 transition duration-300 hover:-translate-y-1 hover:shadow-md ${stylesSync[cle].fond}`}
                                            >
                                                <p className={`text-2xl font-bold tabular-nums ${stylesSync[cle].texte}`}>
                                                    {formatNombre(parStatutSync[cle] ?? 0)}
                                                </p>
                                                <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-600">
                                                    <span className={`h-1.5 w-1.5 rounded-full ${stylesSync[cle].point}`} />
                                                    {label}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Évolution dans le temps */}
                    <div className={`${CLASSE_CARTE} overflow-hidden`} style={{ animationDelay: '260ms' }}>
                        <TitreCarte>Évolution des géolocalisations (par semaine)</TitreCarte>
                        <div className="p-5">
                            {Object.keys(evolution ?? {}).length === 0 ? (
                                <p className="text-sm text-gray-400">Aucune parcelle géolocalisée pour ces filtres.</p>
                            ) : (
                                <div className="flex h-40 items-end gap-1 overflow-x-auto pb-6">
                                    {Object.entries(evolution).map(([semaine, valeur], index) => {
                                        const max = Math.max(...Object.values(evolution));
                                        const hauteur = Math.max(4, (valeur / max) * 120);
                                        return (
                                            <div key={semaine} className="group flex min-w-[28px] flex-1 flex-col items-center gap-1">
                                                <div
                                                    className="sta-barre w-full rounded-t-md bg-gradient-to-t from-green-700 to-green-400 transition-[filter] group-hover:brightness-110"
                                                    style={{
                                                        height: monteEvolution ? `${hauteur}px` : '4px',
                                                        transitionDelay: `${Math.min(index, 20) * 40}ms`,
                                                    }}
                                                    title={`Semaine du ${semaine} : ${valeur} parcelle(s)`}
                                                />
                                                <span className="rotate-45 whitespace-nowrap text-[10px] text-gray-400 transition-colors group-hover:text-green-700">
                                                    {semaine}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Répartition territoriale */}
                    <div className={`${CLASSE_CARTE} overflow-hidden`}>
                        <TitreCarte>Répartition par province</TitreCarte>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <EnTeteTableau colonnes={['Province', 'Caféiculteurs', 'Dont terminés', 'Parcelles', 'Pieds de café']} />
                                <tbody className="divide-y divide-gray-100">
                                    {parProvince.map((p, index) => (
                                        <tr
                                            key={p.province}
                                            className="anim-sta-ligne sta-ligne transition-all duration-200 hover:bg-gradient-to-r hover:from-green-50/80 hover:to-transparent"
                                            style={{ animationDelay: `${Math.min(index, 15) * 30}ms` }}
                                        >
                                            <td className="px-6 py-3 font-medium text-gray-900">{p.province}</td>
                                            <td className="px-6 py-3 tabular-nums text-gray-600">{formatNombre(p.menages)}</td>
                                            <td className="px-6 py-3 tabular-nums text-gray-600">{formatNombre(p.menages_termines)}</td>
                                            <td className="px-6 py-3 tabular-nums text-gray-600">{formatNombre(p.parcelles)}</td>
                                            <td className="px-6 py-3 tabular-nums text-gray-600">{formatNombre(p.pieds)}</td>
                                        </tr>
                                    ))}
                                    {parProvince.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Aucune donnée pour ces filtres.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Classement par enquêteur */}
                    <div className={`${CLASSE_CARTE} overflow-hidden`}>
                        <TitreCarte>Classement par enquêteur</TitreCarte>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <EnTeteTableau colonnes={['Enquêteurs', 'Caféiculteurs', 'Dont terminés', 'Parcelles', 'Pieds de café']} />
                                <tbody className="divide-y divide-gray-100">
                                    {parEnqueteur.map((e, index) => (
                                        <tr
                                            key={e.enqueteur}
                                            className="anim-sta-ligne sta-ligne transition-all duration-200 hover:bg-gradient-to-r hover:from-green-50/80 hover:to-transparent"
                                            style={{ animationDelay: `${Math.min(index, 15) * 30}ms` }}
                                        >
                                            <td className="px-6 py-3 font-medium text-gray-900">
                                                <span className="inline-flex items-center">
                                                    <Rang numero={index + 1} />
                                                    {e.enqueteur}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 tabular-nums text-gray-600">{formatNombre(e.menages)}</td>
                                            <td className="px-6 py-3 tabular-nums text-gray-600">{formatNombre(e.menages_termines)}</td>
                                            <td className="px-6 py-3 tabular-nums text-gray-600">{formatNombre(e.parcelles)}</td>
                                            <td className="px-6 py-3 tabular-nums text-gray-600">{formatNombre(e.pieds)}</td>
                                        </tr>
                                    ))}
                                    {parEnqueteur.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Aucune donnée pour ces filtres.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Répartitions qualitatives */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className={`${CLASSE_CARTE} overflow-hidden`}>
                            <TitreCarte>État des vergers</TitreCarte>
                            <div className="p-5">
                                <ListeRepartition donnees={parEtatVerger} couleur="#1EB53A" />
                            </div>
                        </div>

                        <div className={`${CLASSE_CARTE} overflow-hidden`}>
                            <TitreCarte>Type de Caféiculteur</TitreCarte>
                            <div className="p-5">
                                <ListeRepartition donnees={parTypeMenage} couleur="#CE1126" />
                            </div>
                        </div>

                        <div className={`${CLASSE_CARTE} overflow-hidden`}>
                            <TitreCarte>Mode de positionnement</TitreCarte>
                            <div className="p-5">
                                <ListeRepartition donnees={parModePositionnement} couleur="#1EB53A" />
                            </div>
                        </div>

                        <div className={`${CLASSE_CARTE} overflow-hidden`}>
                            <TitreCarte>Mode d'acquisition</TitreCarte>
                            <div className="p-5">
                                <ListeRepartition donnees={parModeAcquisition} couleur="#1EB53A" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}