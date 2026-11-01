
export default function Footer() {
    const anneeActuelle = new Date().getFullYear();

    return (
        <footer className="foot-entree relative mt-auto w-full shrink-0 border-t border-[#E8DDD0] bg-[#FFFDF8] px-4 py-5 sm:px-6 lg:px-8">

            <style>{`
                @keyframes footEntree {
                    from {
                        opacity: 0;
                        transform: translateY(8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes footBandeau {
                    from {
                        transform: scaleX(0);
                    }
                    to {
                        transform: scaleX(1);
                    }
                }

                .foot-entree {
                    animation: footEntree .6s ease-out both;
                }

                .foot-bandeau {
                    transform-origin: left;
                    animation: footBandeau 1s ease-out .2s both;
                }

                @media (prefers-reduced-motion: reduce) {
                    .foot-entree,
                    .foot-bandeau {
                        animation: none !important;
                    }
                }
            `}</style>

            {/* ==================================================
                BANDEAU AUX COULEURS CAFÉ
            ================================================== */}

            <div className="foot-bandeau pointer-events-none absolute inset-x-0 top-0 flex h-[3px]">
                <div className="flex-1 bg-[#3E2723]" />
                <div className="flex-1 bg-[#A47148]" />
                <div className="flex-1 bg-[#D6B995]" />
            </div>

            {/* ==================================================
                CONTENU DU FOOTER
            ================================================== */}

            <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-3 text-center sm:flex-row sm:gap-4 sm:text-left">

                {/* IDENTITÉ DE L'APPLICATION */}

                <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[#8B7765] sm:justify-start">

                    <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-[#6F4E37]" />

                    <span className="font-bold text-[#3E2723]">
                        LNC Burundi
                    </span>

                    <span className="hidden text-[#D6C5B3] sm:inline">
                        |
                    </span>

                    <span className="text-[#8B7765]">
                        Géolocalisation des plantations de caféiers
                    </span>

                </div>

                {/* COPYRIGHT */}

                <div className="flex flex-wrap items-center justify-center gap-1 text-xs text-[#A89988] sm:justify-end">

                    <span>
                        © {anneeActuelle}
                    </span>

                    <span className="font-semibold text-[#6F4E37]">
                        LNC Burundi
                    </span>

                    <span className="hidden text-[#D6C5B3] sm:inline">
                        |
                    </span>

                    <span className="text-[#A47148]">
                        ODECA
                    </span>

                </div>

            </div>
        </footer>
    );
}
