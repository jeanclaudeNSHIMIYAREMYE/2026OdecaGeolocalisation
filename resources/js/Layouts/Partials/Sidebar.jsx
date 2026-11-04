import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

// ============================================================
// ANIMATIONS ET DÉGRADÉS (couleurs du drapeau du Burundi)
// Rouge #CE1126 · Blanc #FFFFFF · Vert #18B637
// ============================================================

const STYLES_SIDEBAR = `
@keyframes lnc-entree {
    from { opacity: 0; transform: translateX(-14px); }
    to   { opacity: 1; transform: translateX(0); }
}
@keyframes lnc-fondu {
    from { opacity: 0; }
    to   { opacity: 1; }
}
@keyframes lnc-drapeau {
    from { background-position: 0 0; }
    to   { background-position: 200% 0; }
}
@keyframes lnc-halo {
    0%, 100% { transform: translate(0, 0) scale(1); opacity: .55; }
    50%      { transform: translate(18px, -22px) scale(1.15); opacity: .85; }
}
@keyframes lnc-brillance {
    from { transform: translateX(-120%); }
    to   { transform: translateX(220%); }
}

.lnc-fond {
    background:
        radial-gradient(120% 60% at 100% 0%, rgba(24, 182, 55, .28) 0%, transparent 55%),
        linear-gradient(170deg, #0a3b21 0%, #0d4a2a 45%, #07301a 100%);
}
.lnc-drapeau {
    background: linear-gradient(90deg, #ce1126, #ffffff, #18b637, #ce1126);
    background-size: 200% 100%;
    animation: lnc-drapeau 7s linear infinite;
}
.lnc-halo-rouge {
    background: radial-gradient(circle, rgba(206, 17, 38, .55) 0%, transparent 70%);
    animation: lnc-halo 9s ease-in-out infinite;
}
.lnc-entree {
    animation: lnc-entree .5s cubic-bezier(.22, 1, .36, 1) both;
}
.lnc-fondu {
    animation: lnc-fondu .25s ease-out both;
}
.lnc-actif {
    background: linear-gradient(90deg, rgba(255, 255, 255, .20) 0%, rgba(255, 255, 255, .06) 100%);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .14), 0 8px 18px -10px rgba(0, 0, 0, .55);
}
.lnc-pastille-active {
    background: linear-gradient(135deg, #e11d36 0%, #ce1126 55%, #9f0d1d 100%);
    box-shadow: 0 6px 14px -4px rgba(206, 17, 38, .65);
}
.lnc-barre-active {
    background: linear-gradient(180deg, #ce1126 0%, #ffffff 50%, #18b637 100%);
}
.lnc-brillance::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 40%;
    background: linear-gradient(100deg, transparent, rgba(255, 255, 255, .22), transparent);
    transform: translateX(-120%);
    pointer-events: none;
}
.lnc-lien:hover.lnc-brillance::after {
    animation: lnc-brillance .8s ease-out;
}
.lnc-bouton-menu {
    background: linear-gradient(135deg, #18b637 0%, #0d6b2c 100%);
}

@media (prefers-reduced-motion: reduce) {
    .lnc-drapeau,
    .lnc-halo-rouge,
    .lnc-entree,
    .lnc-fondu,
    .lnc-lien:hover.lnc-brillance::after {
        animation: none !important;
    }
}
`;

// ============================================================
// STYLES DES LIENS
// ============================================================

const LIEN_CLASSE_BASE =
    'lnc-lien lnc-brillance group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 ' +
    'text-[13.5px] font-medium outline-none transition-all duration-200 ' +
    'focus-visible:ring-2 focus-visible:ring-white/70';

const LIEN_CLASSE_ACTIF = 'lnc-actif font-semibold text-white';

const LIEN_CLASSE_INACTIF =
    'text-green-50/75 hover:bg-white/10 hover:text-white hover:translate-x-0.5';

// ============================================================
// COMPOSANT ICÔNES
// ============================================================

function Icone({ nom, className = 'h-5 w-5' }) {
    const icones = {
        dashboard: (
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13h8V3H3v10Zm0 8h8v-5H3v5Zm12 0h6V11h-6v10Zm0-18v5h6V3h-6Z"
            />
        ),

        menages: (
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 0 0-5.196-2.05M17 20H7m10 0v-2c0-.7-.12-1.37-.34-1.98M7 20H2v-2a3 3 0 0 1 5.196-2.05M7 20v-2c0-.7.12-1.37.34-1.98m0 0a5 5 0 0 1 9.32 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"
            />
        ),

        suivi: (
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-7 9 2 2 4-4"
            />
        ),

        statistiques: (
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3v18h18M8 16V9m5 7V5m5 11v-4"
            />
        ),

        rapports: (
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6m-6 4h6"
            />
        ),

        utilisateurs: (
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m12-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm2 3a4 4 0 0 1 0 8m4 2v-2a4 4 0 0 0-3-3.87"
            />
        ),
    };

    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
        >
            {icones[nom]}
        </svg>
    );
}

// ============================================================
// TITRE DE SECTION
// ============================================================

function TitreSection({ children, className = '', ordre = 0 }) {
    return (
        <div
            className={`lnc-entree flex items-center gap-3 px-3 ${className}`}
            style={{ animationDelay: `${ordre * 60}ms` }}
        >
            <p className="text-xs font-semibold text-green-200/60">
                {children}
            </p>
            <span className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
        </div>
    );
}

// ============================================================
// COMPOSANT LIEN DE NAVIGATION
// ============================================================

function LienNav({ href, actif, icon, children, onNavigate, ordre = 0 }) {
    return (
        <Link
            href={href}
            onClick={onNavigate}
            aria-current={actif ? 'page' : undefined}
            style={{ animationDelay: `${ordre * 60}ms` }}
            className={`lnc-entree ${LIEN_CLASSE_BASE} ${
                actif ? LIEN_CLASSE_ACTIF : LIEN_CLASSE_INACTIF
            }`}
        >
            {/* Barre tricolore de la page active */}
            <span
                aria-hidden="true"
                className={`lnc-barre-active absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition-all duration-300 ${
                    actif ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'
                }`}
            />

            <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300 ${
                    actif
                        ? 'lnc-pastille-active text-white'
                        : 'bg-white/5 text-green-100/70 group-hover:rotate-[-6deg] group-hover:scale-110 group-hover:bg-white/15 group-hover:text-white'
                }`}
            >
                <Icone nom={icon} className="h-[18px] w-[18px]" />
            </span>

            <span className="truncate">{children}</span>

            <svg
                className={`ml-auto h-4 w-4 shrink-0 text-white/60 transition-all duration-300 ${
                    actif
                        ? 'translate-x-0 opacity-100'
                        : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m9 6 6 6-6 6"
                />
            </svg>
        </Link>
    );
}

// ============================================================
// CONTENU DE LA NAVIGATION
// ============================================================

function ContenuNavigation({ user, onNavigate }) {
    const role = user?.role;

    return (
        <nav
            aria-label="Menu principal"
            className="relative min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-5"
        >
            <TitreSection className="mb-2" ordre={1}>
                Navigation principale
            </TitreSection>

            <LienNav
                href={route('dashboard')}
                actif={route().current('dashboard')}
                icon="dashboard"
                onNavigate={onNavigate}
                ordre={2}
            >
                Tableau de bord
            </LienNav>

            <LienNav
                href={route('menages.index')}
                actif={route().current('menages.*')}
                icon="menages"
                onNavigate={onNavigate}
                ordre={3}
            >
                Caféiculteurs
            </LienNav>

            <LienNav
                href={route('suivi-menages.index')}
                actif={route().current('suivi-menages.*')}
                icon="suivi"
                onNavigate={onNavigate}
                ordre={4}
            >
                Suivi caféiculteurs
            </LienNav>

            <LienNav
                href={route('statistiques.index')}
                actif={route().current('statistiques.*')}
                icon="statistiques"
                onNavigate={onNavigate}
                ordre={5}
            >
                Statistiques
            </LienNav>

            {role !== 'enqueteur' && (
                <>
                    <TitreSection className="mb-2 pt-6" ordre={6}>
                        Administration
                    </TitreSection>

                    <LienNav
                        href={route('rapports.index')}
                        actif={route().current('rapports.*')}
                        icon="rapports"
                        onNavigate={onNavigate}
                        ordre={7}
                    >
                        Rapports
                    </LienNav>

                    <LienNav
                        href={route('utilisateurs.index')}
                        actif={route().current('utilisateurs.*')}
                        icon="utilisateurs"
                        onNavigate={onNavigate}
                        ordre={8}
                    >
                        Utilisateurs
                    </LienNav>
                </>
            )}
        </nav>
    );
}

// ============================================================
// SIDEBAR PRINCIPALE
// ============================================================

export default function Sidebar() {
    const { auth } = usePage().props;
    const user = auth?.user ?? {};

    const [ouvert, setOuvert] = useState(false);

    // Fermer le menu avec la touche Échap.
    useEffect(() => {
        const gererClavier = (event) => {
            if (event.key === 'Escape') {
                setOuvert(false);
            }
        };

        window.addEventListener('keydown', gererClavier);

        return () => {
            window.removeEventListener('keydown', gererClavier);
        };
    }, []);

    // Bloquer le défilement lorsque le menu mobile est ouvert.
    useEffect(() => {
        if (!ouvert) return;

        const ancienOverflow = document.body.style.overflow;

        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = ancienOverflow;
        };
    }, [ouvert]);

    const fermerMenu = () => {
        setOuvert(false);
    };

    return (
        <>
            <style>{STYLES_SIDEBAR}</style>

            {/* BOUTON HAMBURGER MOBILE */}

            <button
                type="button"
                onClick={() => setOuvert(true)}
                aria-label="Ouvrir le menu de navigation"
                aria-expanded={ouvert}
                aria-controls="sidebar-navigation"
                className="lnc-bouton-menu fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg shadow-gray-900/30 ring-1 ring-white/20 transition active:scale-95 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 sm:left-4 sm:top-4 lg:hidden"
            >
                <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                >
                    <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* ARRIÈRE-PLAN MOBILE */}

            {ouvert && (
                <button
                    type="button"
                    aria-label="Fermer le menu"
                    onClick={fermerMenu}
                    className="lnc-fondu fixed inset-0 z-40 bg-gray-950/50 backdrop-blur-sm lg:hidden"
                />
            )}

            {/* SIDEBAR */}

            <aside
                id="sidebar-navigation"
                aria-label="Navigation principale"
                className={`
                    lnc-fond
                    fixed inset-y-0 left-0 z-50
                    flex h-screen w-[280px] max-w-[85vw] flex-col overflow-hidden
                    border-r border-white/10
                    shadow-2xl shadow-black/30 transition-transform duration-300 ease-out
                    motion-reduce:transition-none

                    lg:sticky lg:top-0 lg:z-20
                    lg:h-auto lg:min-h-screen lg:self-stretch
                    lg:w-64 lg:max-w-none lg:shrink-0
                    lg:translate-x-0 lg:shadow-none

                    ${
                        ouvert
                            ? 'translate-x-0'
                            : '-translate-x-full lg:translate-x-0'
                    }
                `}
            >
                {/* HALO ROUGE DÉCORATIF */}

                <div
                    aria-hidden="true"
                    className="lnc-halo-rouge pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full blur-2xl"
                />

                {/* COULEURS DU DRAPEAU (animées) */}

                <div
                    className="lnc-drapeau relative h-1.5 w-full shrink-0"
                    aria-hidden="true"
                />

                {/* LOGO ET NOM */}

                <div className="relative flex h-[76px] shrink-0 items-center justify-between border-b border-white/10 px-5">
                    <Link
                        href="/"
                        onClick={fermerMenu}
                        className="group flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-green-950"
                    >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-lg shadow-black/25 ring-1 ring-white/40 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
                            <ApplicationLogo className="block h-8 w-auto fill-current text-burundi-vert" />
                        </span>

                        <span className="truncate text-[17px] font-bold tracking-tight text-white">
                            LNC Burundi
                        </span>
                    </Link>

                    {/* BOUTON FERMER MOBILE */}

                    <button
                        type="button"
                        onClick={fermerMenu}
                        aria-label="Fermer le menu"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-green-100/70 outline-none transition hover:rotate-90 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70 lg:hidden"
                    >
                        <svg
                            className="h-5 w-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                d="m6 6 12 12M18 6 6 18"
                            />
                        </svg>
                    </button>
                </div>

                {/* NAVIGATION : UTILISATEUR CONNECTÉ SUPPRIMÉ */}

                <ContenuNavigation user={user} onNavigate={fermerMenu} />

                {/* PIED DE SIDEBAR */}

                <div className="relative shrink-0 border-t border-white/10 bg-black/20 px-5 py-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2.5">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-70 motion-safe:animate-ping" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-green-900" />
                        </span>

                        <span className="text-xs font-medium text-green-50/90">
                            ODECA
                        </span>
                    </div>

                    <p className="mt-2 text-[11px] text-green-100/45">
                        © {new Date().getFullYear()} LNC Burundi
                    </p>
                </div>
            </aside>
        </>
    );
}