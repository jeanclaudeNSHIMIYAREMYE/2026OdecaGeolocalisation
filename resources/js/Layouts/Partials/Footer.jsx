export default function Footer() {
    return (
        <footer className="foot-entree relative border-t border-gray-200 bg-white/80 px-4 py-5 backdrop-blur-sm sm:px-8">
            <style>{`
                @keyframes footEntree {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes footBandeau {
                    from { transform: scaleX(0); }
                    to   { transform: scaleX(1); }
                }
                .foot-entree  { animation: footEntree .6s ease-out both; }
                .foot-bandeau { transform-origin: left; animation: footBandeau 1s ease-out .2s both; }
                @media (prefers-reduced-motion: reduce) {
                    .foot-entree, .foot-bandeau { animation: none !important; }
                }
            `}</style>

            {/* Fine ligne aux couleurs du drapeau */}
            <div className="foot-bandeau pointer-events-none absolute inset-x-0 top-0 flex h-0.5">
                <div className="flex-1 bg-burundi-rouge" />
                <div className="flex-1 bg-white" />
                <div className="flex-1 bg-burundi-vert" />
            </div>

            <div className="flex flex-col items-center justify-between gap-2 text-xs text-gray-500 sm:flex-row">
                <p className="flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 rounded-full bg-burundi-vert" />
                    <span className="font-semibold text-gray-700">LNC Burundi</span>
                    <span className="text-gray-300">|</span>
                    <span>Géolocalisation des plantations de caféiers</span>
                </p>

                <p className="text-gray-400">
                    © {new Date().getFullYear()} .
                </p>
            </div>
        </footer>
    );
}