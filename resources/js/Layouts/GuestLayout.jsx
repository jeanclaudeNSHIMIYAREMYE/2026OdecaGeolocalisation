
import ApplicationLogo from '@/Components/ApplicationLogo';
import odeca from '@/assets/odeca-logo.jpeg';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="guest-entree relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-gradient-to-br from-red-50 via-white to-green-50 px-3 py-8 sm:px-6 sm:py-10 lg:px-8">

            <style>{`
                @keyframes guestEntree {
                    from {
                        opacity: 0;
                        transform: translateY(15px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes guestLogo {
                    from {
                        opacity: 0;
                        transform: scale(.9);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                @keyframes guestBandeau {
                    from {
                        transform: scaleX(0);
                    }
                    to {
                        transform: scaleX(1);
                    }
                }

                .guest-entree {
                    animation: guestEntree .5s ease-out both;
                }

                .guest-logo {
                    animation: guestLogo .7s ease-out both;
                }

                .guest-bandeau {
                    transform-origin: left;
                    animation: guestBandeau 1s ease-out .2s both;
                }

                @media (prefers-reduced-motion: reduce) {
                    .guest-entree,
                    .guest-logo,
                    .guest-bandeau {
                        animation: none !important;
                    }
                }
            `}</style>

            {/* ==================================================
                BARRE AUX COULEURS DU DRAPEAU DU BURUNDI
            ================================================== */}

            <div className="guest-bandeau pointer-events-none absolute inset-x-0 top-0 z-20 flex h-1.5 sm:h-2">
                <div className="flex-1 bg-burundi-rouge" />
                <div className="flex-1 bg-white" />
                <div className="flex-1 bg-burundi-vert" />
            </div>

            {/* ==================================================
                LOGO ODECA EN ARRIÈRE-PLAN
            ================================================== */}

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                <img
                    src={odeca}
                    alt=""
                    aria-hidden="true"
                    className="h-[320px] w-[320px] max-w-none rounded-full object-cover opacity-[0.06] blur-sm sm:h-[550px] sm:w-[550px] md:h-[700px] md:w-[700px] lg:h-[850px] lg:w-[850px]"
                />
            </div>

            {/* ==================================================
                CONTENU PRINCIPAL
            ================================================== */}

            <div className="relative z-10 flex w-full max-w-md flex-col items-center sm:max-w-lg lg:max-w-md">

                {/* ==================================================
                    LOGOS
                ================================================== */}

                <div className="guest-logo mb-5 flex w-full flex-col items-center gap-3 sm:mb-7 sm:gap-4">

                    <div className="flex items-center justify-center gap-3 sm:gap-5">

                        {/* LOGO APPLICATION */}

                        <Link
                            href="/"
                            aria-label="Retour à l'accueil"
                            className="flex h-14 w-14 items-center justify-center rounded-xl border border-gray-100 bg-white p-2 shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:h-20 sm:w-20 sm:rounded-2xl"
                        >
                            <ApplicationLogo className="h-full w-full object-contain" />
                        </Link>

                    </div>

                    {/* TITRE ET DESCRIPTION */}

                    <div className="px-2 text-center">
                        <h1 className="text-lg font-extrabold tracking-tight text-gray-800 sm:text-2xl">
                            LNC Burundi
                        </h1>

                        <p className="mx-auto mt-1 max-w-xs text-[11px] font-medium leading-relaxed text-gray-500 sm:max-w-md sm:text-sm">
                            Géolocalisation nationale des plantations de caféiers
                        </p>

                        {/* SÉPARATEUR AUX COULEURS DU BURUNDI */}

                        <div className="mx-auto mt-3 flex h-1 w-16 overflow-hidden rounded-full sm:w-20">
                            <div className="flex-1 bg-burundi-rouge" />
                            <div className="flex-1 bg-gray-200" />
                            <div className="flex-1 bg-burundi-vert" />
                        </div>
                    </div>
                </div>

                {/* ==================================================
                    CARTE DU FORMULAIRE
                ================================================== */}

                <div className="w-full overflow-hidden rounded-xl border border-gray-100 bg-white/95 shadow-lg shadow-gray-900/5 backdrop-blur-md sm:rounded-2xl sm:shadow-xl">

                    {/* EN-TÊTE DU FORMULAIRE */}

                    <div className="border-b border-gray-100 px-4 py-3 text-center sm:px-8 sm:py-4">
                        <h2 className="text-sm font-bold text-gray-800 sm:text-base">
                            Espace sécurisé
                        </h2>

                        <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
                            Accédez à votre espace de travail
                        </p>
                    </div>

                    {/* CONTENU DU FORMULAIRE */}

                    <div className="min-w-0 px-4 py-5 sm:px-8 sm:py-8">
                        {children}
                    </div>

                </div>

                {/* ==================================================
                    PIED DE PAGE
                ================================================== */}

                <footer className="mt-5 w-full px-2 text-center sm:mt-7">

                    <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-gray-500 sm:text-xs">

                        <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-green-500" />

                        <span className="font-semibold text-gray-700">
                            LNC Burundi
                        </span>

                        <span className="hidden text-gray-300 sm:inline">
                            |
                        </span>

                        <span>
                            © {new Date().getFullYear()} Tous droits réservés.
                        </span>

                    </div>

                    <p className="mt-2 text-[10px] text-gray-400">
                        Office de Développement du Café (ODECA)
                    </p>

                </footer>

            </div>
        </div>
    );
}
