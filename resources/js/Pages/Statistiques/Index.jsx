
import FiltresTerritoriaux from '@/Components/FiltresTerritoriaux';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

// ============================================================
// STYLES
// ============================================================

const STYLES_PAGE = `
@keyframes staEntree {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
}
@keyframes staDrapeau {
    from { background-position: 0 0; }
    to { background-position: 200% 0; }
}
@keyframes staReflet {
    from { transform: translateX(-120%); }
    to { transform: translateX(320%); }
}
.anim-sta-carte {
    opacity: 0;
    animation: staEntree .55s cubic-bezier(.22,1,.36,1) forwards;
}
.anim-sta-ligne {
    opacity: 0;
    animation: staEntree .45s cubic-bezier(.22,1,.36,1) forwards;
}
.sta-drapeau {
    background: linear-gradient(90deg,#ce1126,#fff,#18b637,#ce1126);
    background-size: 200% 100%;
    animation: staDrapeau 7s linear infinite;
}
.sta-fond-vert {
    background: linear-gradient(135deg,#18b637,#0d6b2c);
    box-shadow: 0 8px 16px -6px rgba(13,107,44,.6);
}
.sta-fond-rouge {
    background: linear-gradient(135deg,#e11d36,#ce1126 55%,#9f0d1d);
    box-shadow: 0 8px 16px -6px rgba(206,17,38,.5);
}
.sta-fond-sombre {
    background: linear-gradient(135deg,#0d4a2a,#07301a);
    box-shadow: 0 8px 16px -6px rgba(7,48,26,.6);
}
.sta-barre {
    position: relative;
    overflow: hidden;
    transition: width 1s cubic-bezier(.22,1,.36,1),
                height 1s cubic-bezier(.22,1,.36,1);
}
.sta-barre::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 35%;
    background: linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent);
    transform: translateX(-120%);
    animation: staReflet 2.4s ease-in-out 1.1s 1;
}
.sta-ligne:hover { box-shadow: inset 3px 0 0 #18b637; }

@media (prefers-reduced-motion: reduce) {
    .anim-sta-carte,.anim-sta-ligne,.sta-drapeau,.sta-barre::after {
        animation: none !important;
    }
    .anim-sta-carte,.anim-sta-ligne { opacity: 1 !important; }
    .sta-barre { transition: none !important; }
}
`;

const CLASSE_CHAMP =
    'rounded-xl border-gray-200 bg-gray-50/60 text-sm shadow-sm transition duration-200 hover:border-green-300 focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-600/25';

const CLASSE_CARTE =
    'anim-sta-carte rounded-2xl border border-gray-100 bg-white shadow-sm';

const ICONES = {
    menages: 'M17 20h5v-2a3 3 0 0 0-5.196-2.05M17 20H7m10 0v-2c0-.7-.12-1.37-.34-1.98M7 20H2v-2a3 3 0 0 1 5.196-2.05M7 20v-2c0-.7.12-1.37.34-1.98m0 0a5 5 0 0 1 9.32 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    parcelles: 'M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z',
    geo: 'M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z',
    pieds: 'M12 21V9m0 0c0-3 2-5 6-5 0 4-2 6-6 5Zm0 3c0-2.5-1.8-4-5-4 0 3.2 1.8 5 5 4Z',
    moyenne: 'M3 3v18h18M8 16V9m5 7V5m5 11v-4',
    enqueteurs: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m12-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
};

// ============================================================
// UTILITAIRES
// ============================================================

function formatNombre(nombre) {
    return new Intl.NumberFormat('fr-FR').format(Number(nombre ?? 0));
}

function mouvementReduit() {
    return typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function convertirEnObjet(lignes, champ) {
    if (!Array.isArray(lignes)) return {};

    return lignes.reduce((resultat, ligne) => {
        resultat[ligne[champ] ?? 'Non renseigné'] = Number(ligne.total ?? 0);
        return resultat;
    }, {});
}

function calculerPourcentage(valeur, total) {
    return total > 0
        ? Math.round((Number(valeur) / Number(total)) * 100)
        : 0;
}

function useCompteurAnime(cible, duree = 1000) {
    const valeurCible = Number(cible ?? 0);
    const [valeur, setValeur] = useState(0);

    useEffect(() => {
        if (mouvementReduit() || valeurCible === 0) {
            setValeur(valeurCible);
            return;
        }

        let animation;
        const debut = performance.now();

        const etape = (maintenant) => {
            const progression = Math.min((maintenant - debut) / duree, 1);
            const adoucie = 1 - Math.pow(1 - progression, 3);

            setValeur(
                Number.isInteger(valeurCible)
                    ? Math.round(valeurCible * adoucie)
                    : Math.round(valeurCible * adoucie * 100) / 100,
            );

            if (progression < 1) {
                animation = requestAnimationFrame(etape);
            }
        };

        animation = requestAnimationFrame(etape);

        return () => cancelAnimationFrame(animation);
    }, [valeurCible, duree]);

    return valeur;
}

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
                <span className="h-4 w-1 rounded-full bg-gradient-to-b from-red-600 via-white to-green-600 ring-1 ring-gray-200" />
                {children}
            </h3>
            {droite}
        </div>
    );
}

function CarteKpi({
    titre,
    valeur,
    sousTitre,
    accent = 'text-gray-900',
    fond,
    icone,
    ordre = 0,
    progression,
}) {
    const affichee = useCompteurAnime(valeur);
    const monte = useMonte(250);

    return (
        <div
            className="anim-sta-carte group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            style={{ animationDelay: `${ordre * 70}ms` }}
        >
            <span className={`${fond} absolute inset-x-0 top-0 h-1`} />

            <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-gray-500">{titre}</p>

                <span className={`${fond} flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d={icone} />
                    </svg>
                </span>
            </div>

            <p className={`mt-3 text-3xl font-bold tabular-nums tracking-tight ${accent}`}>
                {formatNombre(affichee)}
            </p>

            {sousTitre && (
                <p className="mt-1 text-xs text-gray-500">{sousTitre}</p>
            )}

            {progression !== undefined && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                        className="sta-barre sta-fond-vert h-full rounded-full"
                        style={{
                            width: monte ? `${Math.min(100, Math.max(0, progression))}%` : '0%',
                        }}
                    />
                </div>
            )}
        </div>
    );
}

function BarreProgression({ label, total, pourcentage, couleur }) {
    const monte = useMonte();

    return (
        <div>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-gray-700">{label}</span>
                <span className="tabular-nums text-gray-500">
                    {formatNombre(total)} ({pourcentage}%)
                </span>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                    className="sta-barre h-full rounded-full"
                    style={{
                        width: monte ? `${Math.min(100, pourcentage)}%` : '0%',
                        background: `linear-gradient(90deg, ${couleur}, ${couleur}cc)`,
                    }}
                />
            </div>
        </div>
    );
}

function ListeRepartition({ donnees, couleur = '#1EB53A' }) {
    const entrees = Object.entries(donnees ?? {});
    const maximum = Math.max(1, ...entrees.map(([, valeur]) => Number(valeur)));
    const monte = useMonte();

    if (!entrees.length) {
        return <p className="text-sm text-gray-400">Aucune donnée pour ces filtres.</p>;
    }

    return (
        <div className="space-y-2.5">
            {entrees.map(([cle, valeur], index) => (
                <div key={cle} className="group flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate text-sm text-gray-600" title={cle}>
                        {cle}
                    </span>

                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                            className="sta-barre h-full rounded-full"
                            style={{
                                width: monte ? `${(Number(valeur) / maximum) * 100}%` : '0%',
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
        <span className={`mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${classe}`}>
            {numero}
        </span>
    );
}

function EnTeteTableau({ colonnes }) {
    return (
        <thead className="border-b border-green-100 bg-gradient-to-r from-green-50 via-white to-red-50/40 text-xs text-gray-600">
            <tr>
                {colonnes.map((colonne) => (
                    <th key={colonne} className="px-6 py-3 font-semibold">
                        {colonne}
                    </th>
                ))}
            </tr>
        </thead>
    );
}

function BadgeStatut({ actif }) {
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
            actif
                ? 'bg-green-50 text-green-700 ring-green-200'
                : 'bg-gray-100 text-gray-600 ring-gray-200'
        }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${actif ? 'bg-green-500' : 'bg-gray-400'}`} />
            {actif ? 'Actif' : 'Inactif'}
        </span>
    );
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================

export default function Index({
    filtres = {},
    provinces = [],
    communes = [],
    zones = [],
    collines = [],

    indicateurs = {},
    menagesParStatut = [],
    statistiquesProvinces = [],
    statistiquesEnqueteurs = [],

    enqueteursActifs = [],
    enqueteursInactifs = [],
    totalEnqueteursActifs = 0,
    totalEnqueteursInactifs = 0,

    repartitionEtatVerger = [],
    repartitionPositionnement = [],
    repartitionAcquisition = [],
    repartitionTypeParcelle = [],

    evolutionHebdomadaire = [],
    statistiquesSynchronisation = [],
    enqueteursColline = [],
}) {
    // --------------------------------------------------------
    // NORMALISATION DES DONNEES
    // --------------------------------------------------------

    const totalMenages = Number(indicateurs.total_menages ?? 0);
    const totalParcelles = Number(indicateurs.total_parcelles ?? 0);
    const totalGeolocalisees = Number(indicateurs.parcelles_geolocalisees ?? 0);
    const totalPieds = Number(indicateurs.total_pieds ?? 0);

    const tauxGeolocalisation = calculerPourcentage(
        totalGeolocalisees,
        totalParcelles,
    );

    const moyennePieds = totalParcelles
        ? Math.round((totalPieds / totalParcelles) * 100) / 100
        : 0;

    const listeStatuts = Array.isArray(menagesParStatut)
        ? menagesParStatut
        : [];

    const listeProvinces = Array.isArray(statistiquesProvinces)
        ? statistiquesProvinces
        : [];

    const listeEnqueteurs = Array.isArray(statistiquesEnqueteurs)
        ? statistiquesEnqueteurs
        : [];

    const actifs = Array.isArray(enqueteursActifs)
        ? enqueteursActifs
        : [];

    const inactifs = Array.isArray(enqueteursInactifs)
        ? enqueteursInactifs
        : [];

    const etatVerger = convertirEnObjet(repartitionEtatVerger, 'etat_verger');
    const positionnement = convertirEnObjet(repartitionPositionnement, 'mode_positionnement');
    const acquisition = convertirEnObjet(repartitionAcquisition, 'mode_acquisition');
    const typeParcelle = convertirEnObjet(repartitionTypeParcelle, 'type_parcelle');

    const evolution = Array.isArray(evolutionHebdomadaire)
        ? evolutionHebdomadaire.map((ligne) => ({
            semaine: ligne.semaine,
            total: Number(ligne.total ?? 0),
        }))
        : [];

    const synchronisation = Array.isArray(statistiquesSynchronisation)
        ? statistiquesSynchronisation.reduce((resultat, ligne) => {
            resultat[ligne.statut] = Number(ligne.total ?? 0);
            return resultat;
        }, {})
        : {};

    const totalSynchronisations = Object.values(synchronisation)
        .reduce((total, valeur) => total + valeur, 0);

    const statutsConnus = {
        a_faire: { label: 'À faire', couleur: '#9CA3AF' },
        en_attente: { label: 'Déjà commencé', couleur: '#F59E0B' },
        deja_commence: { label: 'Déjà commencé', couleur: '#F59E0B' },
        termine: { label: 'Terminés', couleur: '#1EB53A' },
    };

    const avancement = listeStatuts.map((ligne) => {
        const configuration = statutsConnus[ligne.statut] ?? {
            label: ligne.statut ?? 'Non renseigné',
            couleur: '#9CA3AF',
        };

        return {
            statut: ligne.statut,
            label: configuration.label,
            couleur: configuration.couleur,
            total: Number(ligne.total ?? 0),
            pourcentage: calculerPourcentage(ligne.total, totalMenages),
        };
    });

    const libellesSync = {
        envoye: 'Envoyé',
        en_attente: 'En attente',
        conflit: 'Conflit',
    };

    const stylesSync = {
        envoye: {
            fond: 'bg-green-50 ring-green-200',
            texte: 'text-green-700',
            point: 'bg-green-500',
        },
        en_attente: {
            fond: 'bg-amber-50 ring-amber-200',
            texte: 'text-amber-700',
            point: 'bg-amber-500',
        },
        conflit: {
            fond: 'bg-red-50 ring-red-200',
            texte: 'text-red-700',
            point: 'bg-red-500',
        },
    };

    const monteEvolution = useMonte(150);

    // --------------------------------------------------------
    // FILTRES
    // --------------------------------------------------------

    const appliquer = (cle, valeur) => {
        const nouveauxFiltres = { ...filtres };

        if (valeur) {
            nouveauxFiltres[cle] = valeur;
        } else {
            delete nouveauxFiltres[cle];
        }

        router.get(
            route('statistiques.index'),
            nouveauxFiltres,
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const effacerFiltres = () => {
        router.get(route('statistiques.index'), {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const collineSelectionnee = collines.find(
        (colline) => String(colline.id) === String(filtres.colline_id),
    );

    const tousEnqueteurs = [...actifs, ...inactifs].filter(
        (enqueteur, index, tableau) =>
            tableau.findIndex((item) => item.id === enqueteur.id) === index,
    );

    // --------------------------------------------------------
    // AFFICHAGE
    // --------------------------------------------------------

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Statistiques du projet
                </h2>
            }
        >
            <Head title="Statistiques" />
            <style>{STYLES_PAGE}</style>

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">

                    {/* FILTRES */}

                    <div className={`${CLASSE_CARTE} relative overflow-hidden p-5`}>
                        <div className="sta-drapeau absolute inset-x-0 top-0 h-1" />

                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold text-gray-800">
                                Filtres des statistiques
                            </h3>

                            <button
                                type="button"
                                onClick={effacerFiltres}
                                className="text-xs font-medium text-red-600 hover:text-red-800"
                            >
                                Réinitialiser les filtres
                            </button>
                        </div>

                        <div className="flex flex-wrap items-end gap-4">
                            <FiltresTerritoriaux
                                valeurs={filtres}
                                onChange={(nouveauxFiltres) => {
                                    router.get(
                                        route('statistiques.index'),
                                        { ...filtres, ...nouveauxFiltres },
                                        {
                                            preserveState: true,
                                            preserveScroll: true,
                                        },
                                    );
                                }}
                                provinces={provinces}
                                communes={communes}
                                zones={zones}
                                collines={collines}
                            />

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                                    Enquêteur
                                </label>

                                <select
                                    className={CLASSE_CHAMP}
                                    value={filtres.enqueteur_id ?? ''}
                                    onChange={(e) => appliquer('enqueteur_id', e.target.value)}
                                >
                                    <option value="">Tous les enquêteurs</option>
                                    {tousEnqueteurs.map((enqueteur) => (
                                        <option key={enqueteur.id} value={enqueteur.id}>
                                            {enqueteur.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                                    Du
                                </label>
                                <input
                                    type="date"
                                    className={CLASSE_CHAMP}
                                    value={filtres.date_debut ?? ''}
                                    onChange={(e) => appliquer('date_debut', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                                    Au
                                </label>
                                <input
                                    type="date"
                                    className={CLASSE_CHAMP}
                                    value={filtres.date_fin ?? ''}
                                    onChange={(e) => appliquer('date_fin', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* KPI */}

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        <CarteKpi
                            titre="Caféiculteurs"
                            valeur={totalMenages}
                            fond="sta-fond-sombre"
                            icone={ICONES.menages}
                        />

                        <CarteKpi
                            titre="Parcelles"
                            valeur={totalParcelles}
                            fond="sta-fond-vert"
                            icone={ICONES.parcelles}
                        />

                        <CarteKpi
                            titre="Géolocalisées"
                            valeur={totalGeolocalisees}
                            sousTitre={`${tauxGeolocalisation}% des parcelles`}
                            fond="sta-fond-vert"
                            icone={ICONES.geo}
                            progression={tauxGeolocalisation}
                        />

                        <CarteKpi
                            titre="Pieds de café"
                            valeur={totalPieds}
                            fond="sta-fond-rouge"
                            icone={ICONES.pieds}
                        />

                        <CarteKpi
                            titre="Moy. pieds / parcelle"
                            valeur={moyennePieds}
                            fond="sta-fond-sombre"
                            icone={ICONES.moyenne}
                        />

                        <CarteKpi
                            titre="Enquêteurs actifs"
                            valeur={totalEnqueteursActifs}
                            sousTitre={`${totalEnqueteursInactifs} inactif(s)`}
                            fond="sta-fond-rouge"
                            icone={ICONES.enqueteurs}
                        />
                    </div>

                    {/* ENQUÊTEURS ACTIFS ET INACTIFS */}

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className={`${CLASSE_CARTE} overflow-hidden`}>
                            <TitreCarte
                                droite={
                                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800 ring-1 ring-green-200">
                                        {actifs.length} actif(s)
                                    </span>
                                }
                            >
                                Enquêteurs actifs
                            </TitreCarte>

                            <div className="max-h-72 overflow-y-auto p-4">
                                {actifs.length === 0 ? (
                                    <p className="py-6 text-center text-sm text-gray-400">
                                        Aucun enquêteur actif.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {actifs.map((enqueteur) => (
                                            <div
                                                key={enqueteur.id}
                                                className="flex items-center justify-between rounded-lg bg-green-50/60 px-3 py-2"
                                            >
                                                <span className="text-sm font-medium text-gray-700">
                                                    {enqueteur.name}
                                                </span>
                                                <BadgeStatut actif />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={`${CLASSE_CARTE} overflow-hidden`}>
                            <TitreCarte
                                droite={
                                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
                                        {inactifs.length} inactif(s)
                                    </span>
                                }
                            >
                                Enquêteurs inactifs
                            </TitreCarte>

                            <div className="max-h-72 overflow-y-auto p-4">
                                {inactifs.length === 0 ? (
                                    <p className="py-6 text-center text-sm text-gray-400">
                                        Aucun enquêteur inactif.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {inactifs.map((enqueteur) => (
                                            <div
                                                key={enqueteur.id}
                                                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                                            >
                                                <span className="text-sm font-medium text-gray-700">
                                                    {enqueteur.name}
                                                </span>
                                                <BadgeStatut actif={false} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ENQUÊTEURS DE LA COLLINE */}

                    {collineSelectionnee && (
                        <div className={`${CLASSE_CARTE} overflow-hidden`}>
                            <TitreCarte
                                droite={
                                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800 ring-1 ring-green-200">
                                        {enqueteursColline.length} enquêteur(s)
                                    </span>
                                }
                            >
                                Enquêteurs affectés à la colline « {collineSelectionnee.nom} »
                            </TitreCarte>

                            {enqueteursColline.length === 0 ? (
                                <p className="px-4 py-8 text-center text-sm text-gray-400">
                                    Aucun enquêteur affecté à cette colline.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <EnTeteTableau colonnes={['Enquêteur', 'Statut']} />
                                        <tbody className="divide-y divide-gray-100">
                                            {enqueteursColline.map((enqueteur) => (
                                                <tr key={enqueteur.id} className="sta-ligne hover:bg-green-50/60">
                                                    <td className="px-6 py-3 font-medium text-gray-900">
                                                        {enqueteur.name}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <BadgeStatut actif={enqueteur.actif} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* AVANCEMENT ET SYNCHRONISATION */}

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className={`${CLASSE_CARTE} overflow-hidden`}>
                            <TitreCarte>Avancement des caféiculteurs</TitreCarte>
                            <div className="space-y-5 p-5">
                                {avancement.length === 0 ? (
                                    <p className="text-sm text-gray-400">Aucune donnée disponible.</p>
                                ) : (
                                    avancement.map((ligne) => (
                                        <BarreProgression
                                            key={ligne.statut}
                                            label={ligne.label}
                                            total={ligne.total}
                                            pourcentage={ligne.pourcentage}
                                            couleur={ligne.couleur}
                                        />
                                    ))
                                )}
                            </div>
                        </div>

                        <div className={`${CLASSE_CARTE} overflow-hidden`}>
                            <TitreCarte>État de synchronisation</TitreCarte>
                            <div className="p-5">
                                {totalSynchronisations === 0 ? (
                                    <p className="text-sm text-gray-400">
                                        Aucune synchronisation enregistrée.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-3 gap-3">
                                        {Object.entries(libellesSync).map(([cle, label]) => {
                                            const style = stylesSync[cle];

                                            return (
                                                <div
                                                    key={cle}
                                                    className={`rounded-xl p-4 text-center ring-1 ${style.fond}`}
                                                >
                                                    <p className={`text-2xl font-bold tabular-nums ${style.texte}`}>
                                                        {formatNombre(synchronisation[cle] ?? 0)}
                                                    </p>
                                                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-600">
                                                        <span className={`h-1.5 w-1.5 rounded-full ${style.point}`} />
                                                        {label}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ÉVOLUTION HEBDOMADAIRE */}

                    <div className={`${CLASSE_CARTE} overflow-hidden`}>
                        <TitreCarte>
                            Évolution hebdomadaire des ménages enregistrés
                        </TitreCarte>

                        <div className="p-5">
                            {evolution.length === 0 ? (
                                <p className="text-sm text-gray-400">
                                    Aucune donnée disponible pour ces filtres.
                                </p>
                            ) : (
                                <div className="flex h-48 items-end gap-2 overflow-x-auto pb-7">
                                    {(() => {
                                        const maximum = Math.max(
                                            1,
                                            ...evolution.map((ligne) => ligne.total),
                                        );

                                        return evolution.map((ligne, index) => {
                                            const hauteur = Math.max(
                                                4,
                                                (ligne.total / maximum) * 125,
                                            );

                                            const semaine = ligne.semaine
                                                ? new Date(ligne.semaine).toLocaleDateString('fr-FR')
                                                : `Semaine ${index + 1}`;

                                            return (
                                                <div
                                                    key={`${ligne.semaine}-${index}`}
                                                    className="group flex min-w-[35px] flex-1 flex-col items-center gap-1"
                                                >
                                                    <span className="text-[10px] font-semibold text-gray-500">
                                                        {formatNombre(ligne.total)}
                                                    </span>

                                                    <div
                                                        className="sta-barre w-full rounded-t-md bg-gradient-to-t from-green-700 to-green-400"
                                                        style={{
                                                            height: monteEvolution ? `${hauteur}px` : '4px',
                                                            transitionDelay: `${Math.min(index, 20) * 40}ms`,
                                                        }}
                                                        title={`${semaine} : ${ligne.total} ménage(s)`}
                                                    />

                                                    <span className="whitespace-nowrap text-[10px] text-gray-400">
                                                        {semaine}
                                                    </span>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RÉPARTITION PAR PROVINCE */}

                    <div className={`${CLASSE_CARTE} overflow-hidden`}>
                        <TitreCarte>Répartition par province</TitreCarte>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <EnTeteTableau colonnes={['Province', 'Caféiculteurs', 'Part du total']} />
                                <tbody className="divide-y divide-gray-100">
                                    {listeProvinces.map((province) => {
                                        const total = Number(province.total_menages ?? 0);

                                        return (
                                            <tr key={province.id} className="sta-ligne hover:bg-green-50/60">
                                                <td className="px-6 py-3 font-medium text-gray-900">
                                                    {province.nom}
                                                </td>
                                                <td className="px-6 py-3 tabular-nums text-gray-600">
                                                    {formatNombre(total)}
                                                </td>
                                                <td className="px-6 py-3 tabular-nums text-gray-600">
                                                    {calculerPourcentage(total, totalMenages)}%
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {listeProvinces.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                                                Aucune donnée pour ces filtres.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* CLASSEMENT PAR ENQUÊTEUR */}

                    <div className={`${CLASSE_CARTE} overflow-hidden`}>
                        <TitreCarte>Statistiques par enquêteur</TitreCarte>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <EnTeteTableau
                                    colonnes={[
                                        'Enquêteur',
                                        'Statut',
                                        'Caféiculteurs',
                                        'Parcelles',
                                        'Pieds de café',
                                    ]}
                                />

                                <tbody className="divide-y divide-gray-100">
                                    {listeEnqueteurs
                                        .slice()
                                        .sort((a, b) =>
                                            Number(b.total_menages ?? 0)
                                            - Number(a.total_menages ?? 0),
                                        )
                                        .map((enqueteur, index) => (
                                            <tr key={enqueteur.id} className="sta-ligne hover:bg-green-50/60">
                                                <td className="px-6 py-3 font-medium text-gray-900">
                                                    <span className="inline-flex items-center">
                                                        <Rang numero={index + 1} />
                                                        {enqueteur.nom}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <BadgeStatut actif={enqueteur.actif} />
                                                </td>
                                                <td className="px-6 py-3 tabular-nums text-gray-600">
                                                    {formatNombre(enqueteur.total_menages)}
                                                </td>
                                                <td className="px-6 py-3 tabular-nums text-gray-600">
                                                    {formatNombre(enqueteur.total_parcelles)}
                                                </td>
                                                <td className="px-6 py-3 tabular-nums text-gray-600">
                                                    {formatNombre(enqueteur.total_pieds)}
                                                </td>
                                            </tr>
                                        ))}

                                    {listeEnqueteurs.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                                Aucun enquêteur disponible.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* RÉPARTITIONS QUALITATIVES */}

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className={`${CLASSE_CARTE} overflow-hidden`}>
                            <TitreCarte>État des vergers</TitreCarte>
                            <div className="p-5">
                                <ListeRepartition donnees={etatVerger} couleur="#1EB53A" />
                            </div>
                        </div>

                        <div className={`${CLASSE_CARTE} overflow-hidden`}>
                            <TitreCarte>Type de parcelle</TitreCarte>
                            <div className="p-5">
                                <ListeRepartition donnees={typeParcelle} couleur="#CE1126" />
                            </div>
                        </div>

                        <div className={`${CLASSE_CARTE} overflow-hidden`}>
                            <TitreCarte>Mode de positionnement</TitreCarte>
                            <div className="p-5">
                                <ListeRepartition donnees={positionnement} couleur="#1EB53A" />
                            </div>
                        </div>

                        <div className={`${CLASSE_CARTE} overflow-hidden`}>
                            <TitreCarte>Mode d'acquisition</TitreCarte>
                            <div className="p-5">
                                <ListeRepartition donnees={acquisition} couleur="#1EB53A" />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
