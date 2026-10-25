import ApplicationLogo from '@/Components/ApplicationLogo';
import odeca from '@/assets/odeca-logo.jpeg';
import { Head, Link } from '@inertiajs/react';

const FONCTIONNALITES = [
    {
        titre: 'Géolocalisation',
        texte: 'Enregistrement précis des parcelles et des plantations de café sur le terrain.',
        couleur: 'from-green-500 to-emerald-600',
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
        couleur: 'from-red-500 to-rose-600',
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
        couleur: 'from-amber-500 to-orange-600',
        icone: (
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
            />
        ),
    },
];

export default function Welcome({ auth }) {
    return (
        <>
            <Head title="Bienvenue" />

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
                    0%   { transform: scale(1);   opacity: .5; }
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
                .a-entree  { opacity: 0; animation: entree .8s cubic-bezier(.2,.7,.2,1) forwards; }
                .a-logo    { animation: entreeLogo .9s cubic-bezier(.2,.7,.2,1) both; }
                .a-blob1   { animation: flotte 14s ease-in-out infinite; }
                .a-blob2   { animation: flotte2 18s ease-in-out infinite; }
                .a-halo    { animation: halo 2.8s ease-out infinite; }
                .a-bandeau { transform-origin: left; animation: bandeau 1s ease-out both; }
                .a-brille::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    width: 40%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent);
                    animation: brillance 3.2s ease-in-out infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                    .a-entree, .a-logo, .a-blob1, .a-blob2, .a-halo, .a-bandeau, .a-brille::after {
                        animation: none !important;
                        opacity: 1 !important;
                    }
                }
            `}</style>

            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-red-50 via-white to-green-50">
                {/* Bandeau drapeau */}
                <div className="a-bandeau absolute inset-x-0 top-0 z-20 flex h-1.5">
                    <div className="flex-1 bg-burundi-rouge" />
                    <div className="flex-1 bg-white" />
                    <div className="flex-1 bg-burundi-vert" />
                </div>

                {/* Formes lumineuses animées */}
                <div className="a-blob1 pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-red-200/50 blur-3xl" />
                <div className="a-blob2 pointer-events-none absolute -right-32 bottom-10 h-[28rem] w-[28rem] rounded-full bg-green-200/60 blur-3xl" />

                {/* Logo ODECA en fond, très estompé */}
                <img
                    src={odeca}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 opacity-[0.06] blur-sm"
                />

                {/* Grille discrète */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-[0.35]"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle, rgba(0,0,0,.07) 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                        maskImage:
                            'radial-gradient(ellipse at center, black 30%, transparent 75%)',
                        WebkitMaskImage:
                            'radial-gradient(ellipse at center, black 30%, transparent 75%)',
                    }}
                />

                <div className="relative z-10 flex min-h-screen flex-col">
                    {/* En-tête */}
                    <header className="a-entree flex items-center justify-between px-6 py-6 sm:px-10">
                        <div className="flex items-center gap-3">
                            <ApplicationLogo className="h-10 w-auto" />
                            <div className="leading-tight">
                                <span className="block text-sm font-bold text-gray-800">
                                    LNC Burundi
                                </span>
                                <span className="block text-[11px] uppercase tracking-wider text-gray-400">
                                    Portail ODECA
                                </span>
                            </div>
                        </div>

                        <nav>
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-lg bg-burundi-vert px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-md"
                                >
                                    Tableau de bord
                                </Link>
                            ) : (
                                <Link
                                    href={route('login')}
                                    className="rounded-lg border border-gray-200 bg-white/70 px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-burundi-vert hover:text-burundi-vert hover:shadow-md"
                                >
                                    Connexion
                                </Link>
                            )}
                        </nav>
                    </header>

                    {/* Contenu principal */}
                    <main className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
                        {/* Logo avec halo */}
                        <div className="a-logo relative mb-10">
                            <span className="a-halo absolute inset-0 rounded-full bg-burundi-vert/30" />
                            <span
                                className="a-halo absolute inset-0 rounded-full bg-burundi-rouge/20"
                                style={{ animationDelay: '1.4s' }}
                            />
                            <img
                                src={odeca}
                                alt="ODECA — Géolocalisation nationale des plantations de café"
                                className="relative h-48 w-48 rounded-full object-cover shadow-2xl ring-4 ring-white sm:h-60 sm:w-60"
                            />
                        </div>

                        <span
                            className="a-entree mb-4 inline-flex items-center gap-2 rounded-full border border-green-200 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-green-700 shadow-sm backdrop-blur"
                            style={{ animationDelay: '200ms' }}
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="a-halo absolute inline-flex h-full w-full rounded-full bg-green-500" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                            </span>
                            Plateforme nationale
                        </span>

                        <h1
                            className="a-entree max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl"
                            style={{ animationDelay: '300ms' }}
                        >
                            Géo-localisation des{' '}
                            <span className="bg-gradient-to-r from-burundi-rouge via-amber-600 to-burundi-vert bg-clip-text text-transparent">
                                plantations de café
                            </span>{' '}
                            national
                        </h1>

                        <p
                            className="a-entree mt-3 max-w-2xl text-lg italic text-gray-500"
                            style={{ animationDelay: '420ms' }}
                        >
                            Welcome to the national coffee plantation geolocation platform
                        </p>

                        <p
                            className="a-entree mt-6 max-w-xl text-base leading-relaxed text-gray-600"
                            style={{ animationDelay: '540ms' }}
                        >
                            Portail d'administration pour le suivi, la cartographie et la
                            gestion des données de géolocalisation des caféiculteurs du
                            Burundi.
                        </p>

                        {!auth.user && (
                            <div
                                className="a-entree mt-10"
                                style={{ animationDelay: '660ms' }}
                            >
                                <Link
                                    href={route('login')}
                                    className="a-brille group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-burundi-vert px-8 py-4 text-base font-semibold text-white shadow-lg shadow-green-600/30 transition duration-300 hover:-translate-y-1 hover:bg-green-700 hover:shadow-xl hover:shadow-green-600/40"
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

                        {/* Fonctionnalités */}
                        <div className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3">
                            {FONCTIONNALITES.map((f, i) => (
                                <div
                                    key={f.titre}
                                    className="a-entree group rounded-2xl border border-white/80 bg-white/70 p-6 text-left shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-xl"
                                    style={{ animationDelay: `${800 + i * 120}ms` }}
                                >
                                    <div
                                        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.couleur} text-white shadow-md transition duration-300 group-hover:scale-110 group-hover:rotate-3`}
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
                                    <h3 className="text-base font-semibold text-gray-900">
                                        {f.titre}
                                    </h3>
                                    <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                                        {f.texte}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </main>

                    <footer
                        className="a-entree px-6 py-8 text-center text-xs text-gray-400"
                        style={{ animationDelay: '1200ms' }}
                    >
                        ODECA — Géolocalisation nationale des plantations de café · Burundi
                    </footer>
                </div>
            </div>
        </>
    );
}