import Dropdown from '@/Components/Dropdown';
import { usePage } from '@inertiajs/react';

/*
 * PALETTE (café du Burundi)
 * Espresso  #3B2218  texte principal, avatar
 * Cerise    #B8322A  accent chaud (cerise de café, drapeau)
 * Feuille   #2F7D4F  accent frais (feuille de caféier, drapeau)
 * Or / Crema #D9A441 accent lumineux
 * Crème     #FFFBF5  fond
 * Sable     #E8D9C3  bordures
 */

const LIBELLES_ROLES = {
    admin: 'Administrateur',
    superviseur_national: 'Superviseur national',
    superviseur_provincial: 'Superviseur provincial',
    superviseur_communal: 'Superviseur communal',
    enqueteur: 'Enquêteur',
};

// Une couleur par niveau de rôle pour repérer le profil d'un coup d'œil
const STYLES_ROLES = {
    admin: 'bg-[#3B2218] text-[#F6E7C8]',
    superviseur_national: 'bg-[#B8322A]/10 text-[#9C2820] ring-1 ring-[#B8322A]/25',
    superviseur_provincial: 'bg-[#D9A441]/20 text-[#7A5410] ring-1 ring-[#D9A441]/40',
    superviseur_communal: 'bg-[#2F7D4F]/10 text-[#25663F] ring-1 ring-[#2F7D4F]/25',
    enqueteur: 'bg-[#2F7D4F]/10 text-[#25663F] ring-1 ring-[#2F7D4F]/25',
};

const initiales = (nom = '') =>
    nom
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((mot) => mot[0].toUpperCase())
        .join('');

export default function Entete({ header }) {
    const { auth } = usePage().props;
    const user = auth?.user ?? {};

    const libelleRole = LIBELLES_ROLES[user.role] ?? 'Utilisateur';
    const styleRole =
        STYLES_ROLES[user.role] ?? 'bg-[#E8D9C3]/60 text-[#5B3927]';

    return (
        <header className="ent-descend sticky top-0 z-30 w-full border-b border-[#E8D9C3] bg-gradient-to-r from-[#FFFBF5]/95 via-[#FFFFFF]/95 to-[#FFF6E6]/95 shadow-[0_4px_18px_rgba(59,34,24,0.08)] backdrop-blur-md">

            <style>{`
                @keyframes entDescend {
                    from { opacity: 0; transform: translateY(-10px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                @keyframes entPoint {
                    0%   { transform: scale(1);   opacity: .6; }
                    100% { transform: scale(2.2); opacity: 0; }
                }

                .ent-descend { animation: entDescend .4s ease-out both; }
                .ent-point   { animation: entPoint 2s ease-out infinite; }

                @media (prefers-reduced-motion: reduce) {
                    .ent-descend,
                    .ent-point { animation: none !important; }
                }
            `}</style>

            {/* BARRE TRICOLORE : cerise, or, feuille de caféier */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[3px]">
                <div className="flex-1 bg-[#B8322A]" />
                <div className="flex-1 bg-[#D9A441]" />
                <div className="flex-1 bg-[#2F7D4F]" />
            </div>

            <div className="flex min-h-[64px] w-full items-center justify-between gap-2 px-3 py-2 sm:min-h-[72px] sm:px-5 lg:px-8">

                {/* TITRE DE LA PAGE */}
                <div className="min-w-0 flex-1 overflow-hidden pl-12 sm:pl-0">
                    <div className="flex items-center gap-3">
                        <span
                            aria-hidden="true"
                            className="hidden h-6 w-1 shrink-0 rounded-full bg-gradient-to-b from-[#B8322A] via-[#D9A441] to-[#2F7D4F] sm:block"
                        />
                        <div className="truncate text-base font-bold text-[#3B2218] lg:text-lg">
                            {header}
                        </div>
                    </div>
                </div>

                {/* MENU UTILISATEUR */}
                <div className="relative shrink-0">
                    <Dropdown>
                        <Dropdown.Trigger>
                            <button
                                type="button"
                                aria-label="Ouvrir le menu utilisateur"
                                title="Menu utilisateur"
                                className="group flex items-center gap-2 rounded-xl border border-transparent px-1.5 py-1.5 transition-all duration-200 hover:border-[#E8D9C3] hover:bg-[#FFF3DD] focus:outline-none focus:ring-2 focus:ring-[#D9A441]/60 sm:gap-3 sm:px-2 sm:py-2"
                            >

                                {/* AVATAR */}
                                <span className="relative shrink-0">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#B8322A] via-[#6B2A1E] to-[#3B2218] text-sm font-bold text-white shadow-md ring-2 ring-[#D9A441] ring-offset-2 ring-offset-white transition-transform duration-200 group-hover:scale-105 sm:h-10 sm:w-10">
                                        {initiales(user.name) || '?'}
                                    </span>

                                    {/* INDICATEUR DE PRÉSENCE */}
                                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                                        <span className="ent-point absolute inline-flex h-full w-full rounded-full bg-[#2F7D4F]" />
                                        <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-[#2F7D4F]" />
                                    </span>
                                </span>

                                {/* INFORMATIONS UTILISATEUR */}
                                <span className="hidden min-w-0 text-left sm:block">
                                    <span className="block max-w-[130px] truncate text-sm font-semibold leading-5 text-[#3B2218] lg:max-w-[180px]">
                                        {user.name || 'Utilisateur'}
                                    </span>

                                    <span
                                        className={`mt-0.5 inline-block max-w-[160px] truncate rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 ${styleRole}`}
                                    >
                                        {libelleRole}
                                    </span>
                                </span>

                                {/* FLÈCHE */}
                                <svg
                                    className="h-4 w-4 shrink-0 text-[#B8322A] transition-transform duration-200 group-hover:translate-y-0.5 group-hover:text-[#3B2218]"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>
                        </Dropdown.Trigger>

                        <Dropdown.Content>

                            {/* INFORMATIONS DU COMPTE */}
                            <div className="border-b border-[#E8D9C3] bg-gradient-to-br from-[#FFF3DD] to-[#FFFBF5] px-4 py-3">
                                <p className="truncate text-sm font-semibold text-[#3B2218]">
                                    {user.name || 'Utilisateur'}
                                </p>

                                {user.email && (
                                    <p className="mt-1 truncate text-xs text-[#7A6150]">
                                        {user.email}
                                    </p>
                                )}

                                <span
                                    className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${styleRole}`}
                                >
                                    {libelleRole}
                                </span>
                            </div>

                            {/* PROFIL */}
                            <Dropdown.Link href={route('profile.edit')}>
                                <span className="flex items-center gap-2.5 text-[#3B2218]">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        className="h-4 w-4 text-[#2F7D4F]"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                                        />
                                    </svg>
                                    Profil
                                </span>
                            </Dropdown.Link>

                            {/* DÉCONNEXION */}
                            <Dropdown.Link
                                href={route('logout')}
                                method="post"
                                as="button"
                            >
                                <span className="flex items-center gap-2.5 text-[#B8322A]">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
                                        />
                                    </svg>
                                    Déconnexion
                                </span>
                            </Dropdown.Link>

                        </Dropdown.Content>
                    </Dropdown>
                </div>
            </div>
        </header>
    );
}