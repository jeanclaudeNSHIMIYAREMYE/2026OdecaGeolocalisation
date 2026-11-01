import ApplicationLogo from '@/Components/ApplicationLogo';
import odeca from '@/assets/odeca-logo.jpeg';
import { Head, Link } from '@inertiajs/react';

// ============================================================
// FONCTIONNALITÉS DE LA PLATEFORME
// ============================================================

const FONCTIONNALITES = [
    {
        titre: 'Géolocalisation',
        texte: 'Enregistrement précis des parcelles et des plantations de café sur le terrain.',
        couleur: 'from-green-400 to-emerald-700',
        icone: (
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
        ),
    },
    {
        titre: 'Cartographie',
        texte: 'Visualisation des données par province, commune, zone et colline.',
        couleur: 'from-red-500 to-rose-700',
        icone: (
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z"
            />
        ),
    },
    {
        titre: 'Suivi & gestion',
        texte: 'Administration des enquêteurs, des superviseurs et de leurs affectations.',
        couleur: 'from-amber-300 to-orange-600',
        icone: (
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
            />
        ),
    },
];

// ============================================================
// COMPOSANT LOGO
// ============================================================

function LogoEntete() {
    return (
        <Link
            href="/"
            className="group flex min-w-0 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-green-950 sm:gap-3"
        >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-lg shadow-black/25 ring-1 ring-white/40 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105 sm:h-12 sm:w-12">
                <ApplicationLogo className="h-7 w-auto shrink-0 sm:h-8" />
            </span>

            <div className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-extrabold text-white sm:text-base">
                    LNC Burundi
                </span>

                <span className="block truncate text-[10px] text-green-200/70 sm:text-xs">
                    Portail ODECA
                </span>
            </div>
        </Link>
    );
}

// ============================================================
// BOUTON DE CONNEXION
// ============================================================

function BoutonConnexion({ connecte, principal = false }) {
    const classeBase =
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition duration-200 ' +
        'focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-green-950 sm:px-5 sm:py-3 sm:text-sm';

    if (connecte) {
        return (
            <Link
                href={route('dashboard')}
                className={`${classeBase} group bg-white text-green-900 shadow-lg shadow-black/25 hover:-translate-y-0.5 hover:bg-green-50 hover:shadow-xl`}
            >
                Tableau de bord
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden="true"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                </svg>
            </Link>
        );
    }

    return (
        <Link
            href={route('login')}
            className={`${classeBase} group ${
                principal
                    ? 'a-bouton-rouge px-6 py-3.5 text-sm text-white hover:-translate-y-1 hover:brightness-110 sm:px-8 sm:py-4 sm:text-base'
                    : 'border border-white/25 bg-white/10 text-white backdrop-blur hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/20'
            }`}
        >
            {principal ? 'Accéder au portail' : 'Connexion'}

            {principal && (
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden="true"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                </svg>
            )}
        </Link>
    );
}

// ============================================================
// CARTE FONCTIONNALITÉ
// ============================================================

function CarteFonctionnalite({ fonctionnalite, index }) {
    const f = fonctionnalite;

    return (
        <article
            className="a-entree a-carte group relative h-full overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-4 text-left shadow-lg shadow-black/10 backdrop-blur-md transition duration-300 hover:-translate-y-1.5 hover:border-white/30 hover:bg-white/[0.14] hover:shadow-2xl sm:p-5 lg:p-6"
            style={{ animationDelay: `${800 + index * 120}ms` }}
        >
            {/* Liseré tricolore qui apparaît au survol */}
            <span
                aria-hidden="true"
                className="a-lisere absolute inset-x-0 top-0 h-1 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
            />

            <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.couleur} text-white shadow-lg shadow-black/25 transition duration-300 group-hover:rotate-3 group-hover:scale-110 sm:h-12 sm:w-12`}
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-6 w-6"
                    aria-hidden="true"
                >
                    {f.icone}
                </svg>
            </div>

            <h3 className="text-sm font-bold text-white sm:text-base">
                {f.titre}
            </h3>

            <p className="mt-2 text-xs leading-relaxed text-green-50/70 sm:text-sm">
                {f.texte}
            </p>
        </article>
    );
}

// ============================================================
// PAGE D'ACCUEIL
// ============================================================

export default function Welcome({ auth }) {
    const connecte = Boolean(auth?.user);

    return (
        <>
            <Head title="Bienvenue - LNC Burundi" />

            {/* =================================================
                ANIMATIONS ET STYLES
                Rouge #CE1126 · Blanc · Vert #18B637
            ================================================= */}

            <style>{`
                @keyframes entree {
                    from { opacity: 0; transform: translateY(24px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                @keyframes entreeLogo {
                    0%   { opacity: 0; transform: scale(.7); }
                    70%  { transform: scale(1.04); }
                    100% { opacity: 1; transform: scale(1); }
                }

                @keyframes flotte {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50%      { transform: translate(30px, -40px) scale(1.08); }
                }

                @keyframes flotte2 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50%      { transform: translate(-40px, 30px) scale(1.1); }
                }

                @keyframes halo {
                    0%   { transform: scale(1); opacity: .5; }
                    100% { transform: scale(1.35); opacity: 0; }
                }

                @keyframes bandeau {
                    from { transform: scaleX(0); }
                    to   { transform: scaleX(1); }
                }

                @keyframes brillance {
                    0%   { transform: translateX(-120%) skewX(-20deg); }
                    100% { transform: translateX(260%) skewX(-20deg); }
                }

                @keyframes tourne {
                    to { transform: rotate(360deg); }
                }

                @keyframes drapeau {
                    from { background-position: 0 0; }
                    to   { background-position: 200% 0; }
                }

                @keyframes titre {
                    from { background-position: 0% 50%; }
                    to   { background-position: 200% 50%; }
                }

                .a-entree {
                    opacity: 0;
                    animation: entree .8s cubic-bezier(.2,.7,.2,1) forwards;
                }

                .a-logo   { animation: entreeLogo .9s cubic-bezier(.2,.7,.2,1) both; }
                .a-blob1  { animation: flotte 14s ease-in-out infinite; }
                .a-blob2  { animation: flotte2 18s ease-in-out infinite; }
                .a-halo   { animation: halo 2.8s ease-out infinite; }
                .a-bandeau {
                    transform-origin: left;
                    animation: bandeau 1s ease-out both;
                }

                /* Fond : vert forêt profond, comme la barre latérale */
                .a-fond {
                    background:
                        radial-gradient(70% 55% at 85% 0%, rgba(24, 182, 55, .30) 0%, transparent 60%),
                        radial-gradient(60% 50% at 0% 100%, rgba(206, 17, 38, .28) 0%, transparent 60%),
                        linear-gradient(165deg, #0a3b21 0%, #0d4a2a 45%, #07301a 100%);
                }

                /* Anneau tricolore qui tourne autour du logo ODECA */
                .a-anneau {
                    background: conic-gradient(from 0deg, #ce1126, #ffffff, #18b637, #ce1126);
                    animation: tourne 7s linear infinite;
                }

                /* Bande du drapeau animée (haut et pied de page) */
                .a-drapeau {
                    background: linear-gradient(90deg, #ce1126, #ffffff, #18b637, #ce1126);
                    background-size: 200% 100%;
                    animation: drapeau 7s linear infinite;
                }

                /* Mise en valeur du titre : dégradé qui défile */
                .a-titre-degrade {
                    background: linear-gradient(90deg, #ff6b7d, #fde68a, #4ade80, #ff6b7d);
                    background-size: 200% 100%;
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                    animation: titre 6s linear infinite;
                }

                .a-lisere {
                    background: linear-gradient(90deg, #ce1126, #ffffff, #18b637);
                }

                .a-bouton-rouge {
                    background: linear-gradient(135deg, #e11d36 0%, #ce1126 55%, #9f0d1d 100%);
                    box-shadow: 0 14px 28px -10px rgba(206, 17, 38, .75);
                }

                .a-brille {
                    isolation: isolate;
                }

                .a-brille::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    width: 40%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent);
                    animation: brillance 3.2s ease-in-out infinite;
                    pointer-events: none;
                }

                @media (max-width: 640px) {
                    .a-blob1, .a-blob2 { opacity: .5; }
                }

                @media (prefers-reduced-motion: reduce) {
                    .a-entree,
                    .a-logo,
                    .a-blob1,
                    .a-blob2,
                    .a-halo,
                    .a-bandeau,
                    .a-anneau,
                    .a-drapeau,
                    .a-titre-degrade,
                    .a-brille::after {
                        animation: none !important;
                        opacity: 1 !important;
                    }
                }
            `}</style>

            {/* =================================================
                CONTENEUR PRINCIPAL
            ================================================= */}

            <div className="a-fond relative min-h-screen w-full overflow-hidden">

                {/* BANDEAU DRAPEAU */}

                <div className="a-bandeau absolute inset-x-0 top-0 z-20">
                    <div className="a-drapeau h-1.5 w-full sm:h-2" />
                </div>

                {/* FORMES LUMINEUSES */}

                <div className="a-blob1 pointer-events-none absolute -left-24 top-20 h-48 w-48 rounded-full bg-red-600/40 blur-3xl sm:-left-32 sm:h-96 sm:w-96" />

                <div className="a-blob2 pointer-events-none absolute -right-24 bottom-10 h-56 w-56 rounded-full bg-green-500/35 blur-3xl sm:-right-32 sm:h-[28rem] sm:w-[28rem]" />

                {/* LOGO ODECA EN ARRIÈRE-PLAN */}

                <img
                    src={odeca}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.07] blur-sm sm:h-[500px] sm:w-[500px] md:h-[650px] md:w-[650px] lg:h-[850px] lg:w-[850px]"
                />

                {/* GRILLE DISCRÈTE */}

                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-[0.45]"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle, rgba(255,255,255,.14) 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                        maskImage:
                            'radial-gradient(ellipse at center, black 30%, transparent 75%)',
                        WebkitMaskImage:
                            'radial-gradient(ellipse at center, black 30%, transparent 75%)',
                    }}
                />

                {/* =================================================
                    STRUCTURE GÉNÉRALE
                ================================================= */}

                <div className="relative z-10 flex min-h-screen flex-col">

                    {/* =============================================
                        EN-TÊTE RESPONSIVE
                    ============================================= */}

                    <header className="a-entree flex w-full items-center justify-between gap-3 px-3 pb-4 pt-7 sm:px-6 sm:pb-5 sm:pt-8 lg:px-10 lg:py-7">
                        <LogoEntete />

                        <nav
                            aria-label="Navigation principale"
                            className="flex shrink-0 items-center"
                        >
                            <BoutonConnexion connecte={connecte} />
                        </nav>
                    </header>

                    {/* =============================================
                        CONTENU PRINCIPAL
                    ============================================= */}

                    <main className="flex flex-1 flex-col items-center px-3 pb-8 pt-5 text-center sm:px-6 sm:pt-8 lg:px-10 lg:pt-10">

                        {/* LOGO ODECA */}

                        <div className="a-logo relative mb-7 sm:mb-9 lg:mb-10">
                            <span className="a-halo absolute inset-0 rounded-full bg-green-400/40" />

                            <span
                                className="a-halo absolute inset-0 rounded-full bg-red-500/30"
                                style={{ animationDelay: '1.4s' }}
                            />

                            {/* Anneau tricolore qui tourne */}
                            <span
                                aria-hidden="true"
                                className="a-anneau absolute -inset-1.5 rounded-full shadow-2xl shadow-black/40"
                            />

                            <img
                                src={odeca}
                                alt="ODECA — Géolocalisation nationale des plantations de café"
                                className="relative h-32 w-32 rounded-full object-cover ring-4 ring-white sm:h-44 sm:w-44 md:h-52 md:w-52 lg:h-60 lg:w-60"
                            />
                        </div>

                        {/* BADGE PLATEFORME */}

                        <span
                            className="a-entree mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-green-100 shadow-sm backdrop-blur sm:px-4 sm:text-xs"
                            style={{ animationDelay: '200ms' }}
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="a-halo absolute inline-flex h-full w-full rounded-full bg-green-400" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                            </span>

                            Plateforme nationale
                        </span>

                        {/* TITRE PRINCIPAL */}

                        <h1
                            className="a-entree w-full max-w-4xl text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl"
                            style={{ animationDelay: '300ms' }}
                        >
                            Géo-localisation des{' '}
                            <span className="a-titre-degrade">
                                plantations de café
                            </span>{' '}
                            au Burundi
                        </h1>

                        {/* SOUS-TITRE ANGLAIS */}

                        <p
                            className="a-entree mt-3 max-w-2xl text-xs italic leading-relaxed text-green-100/70 sm:text-base lg:text-lg"
                            style={{ animationDelay: '420ms' }}
                        >
                            Welcome to the national coffee plantation geolocation platform
                        </p>

                        {/* DESCRIPTION */}

                        <p
                            className="a-entree mt-5 max-w-xl text-sm leading-relaxed text-green-50/80 sm:mt-6 sm:text-base lg:text-lg"
                            style={{ animationDelay: '540ms' }}
                        >
                            Portail d'administration pour le suivi, la
                            cartographie et la gestion des données de
                            géolocalisation des caféiculteurs du Burundi.
                        </p>

                        {/* BOUTON PRINCIPAL */}

                        {!connecte && (
                            <div
                                className="a-entree mt-7 sm:mt-9 lg:mt-10"
                                style={{ animationDelay: '660ms' }}
                            >
                                <Link
                                    href={route('login')}
                                    className="a-brille a-bouton-rouge group relative inline-flex items-center gap-2 overflow-hidden rounded-xl px-6 py-3.5 text-sm font-semibold text-white outline-none transition duration-300 hover:-translate-y-1 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-green-950 sm:px-8 sm:py-4 sm:text-base"
                                >
                                    Accéder au portail

                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                                        />
                                    </svg>
                                </Link>
                            </div>
                        )}

                        {/* BOUTON TABLEAU DE BORD SI CONNECTÉ */}

                        {connecte && (
                            <div
                                className="a-entree mt-7 sm:mt-9"
                                style={{ animationDelay: '660ms' }}
                            >
                                <BoutonConnexion connecte={connecte} principal />
                            </div>
                        )}

                        {/* =========================================
                            FONCTIONNALITÉS
                        ========================================= */}

                        <section className="mt-12 w-full max-w-5xl sm:mt-14 lg:mt-16">
                            <div className="mb-5 text-center sm:mb-7">
                                <h2 className="text-lg font-bold text-white sm:text-xl lg:text-2xl">
                                    Les fonctionnalités de la plateforme
                                </h2>

                                <p className="mt-2 text-xs text-green-100/70 sm:text-sm">
                                    Une solution intégrée pour le suivi des plantations de café.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
                                {FONCTIONNALITES.map((f, index) => (
                                    <CarteFonctionnalite
                                        key={f.titre}
                                        fonctionnalite={f}
                                        index={index}
                                    />
                                ))}
                            </div>
                        </section>
                    </main>

                    {/* =============================================
                        PIED DE PAGE
                    ============================================= */}

                    <footer
                        className="a-entree mt-auto border-t border-white/10 bg-black/20 px-3 py-5 text-center text-[11px] leading-relaxed text-green-100/60 backdrop-blur-sm sm:px-6 sm:py-7 sm:text-xs"
                        style={{ animationDelay: '1200ms' }}
                    >
                        <p>
                            <span className="font-semibold text-white">
                                ODECA
                            </span>
                            {' '}— Géolocalisation nationale des plantations de café
                        </p>

                        <p className="mt-1">
                            Burundi · © {new Date().getFullYear()}
                        </p>
                    </footer>
                </div>
            </div>
        </>
    );
}