import Dropdown from '@/Components/Dropdown';
import { usePage } from '@inertiajs/react';

const LIBELLES_ROLES = {
    admin: 'Administrateur',
    superviseur_national: 'Superviseur national',
    superviseur_provincial: 'Superviseur provincial',
    superviseur_communal: 'Superviseur communal',
    enqueteur: 'Enquêteur',
};

const initiales = (nom = '') =>
    nom
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((m) => m[0].toUpperCase())
        .join('');

/**
 * Bandeau supérieur du portail : titre de la page à gauche (passé en
 * prop `header` depuis chaque page), menu utilisateur (profil/déconnexion)
 * à droite.
 */
export default function Entete({ header }) {
    const user = usePage().props.auth.user;
    const libelleRole = LIBELLES_ROLES[user.role] ?? null;

    return (
        <header className="ent-descend sticky top-0 z-30 flex items-center justify-between border-b border-gray-200/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md sm:px-8">
            <style>{`
                @keyframes entDescend {
                    from { opacity: 0; transform: translateY(-12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes entPoint {
                    0%   { transform: scale(1);   opacity: .6; }
                    100% { transform: scale(2.4); opacity: 0; }
                }
                .ent-descend { animation: entDescend .45s ease-out both; }
                .ent-point   { animation: entPoint 2s ease-out infinite; }
                @media (prefers-reduced-motion: reduce) {
                    .ent-descend, .ent-point { animation: none !important; }
                }
            `}</style>

            {/* Fine ligne aux couleurs du drapeau */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-px">
                <div className="flex-1 bg-burundi-rouge/60" />
                <div className="flex-1 bg-gray-200" />
                <div className="flex-1 bg-burundi-vert/60" />
            </div>

            <div className="ml-10 sm:ml-0">{header}</div>

            <Dropdown>
                <Dropdown.Trigger>
                    <button
                        type="button"
                        className="group inline-flex items-center gap-3 rounded-xl border border-transparent px-2 py-1.5 text-left transition duration-200 hover:border-gray-200 hover:bg-gray-50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-burundi-vert/40"
                    >
                        <span className="relative">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-burundi-vert to-emerald-700 text-sm font-semibold text-white shadow-md ring-2 ring-white transition duration-200 group-hover:scale-105">
                                {initiales(user.name) || '?'}
                            </span>
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                                <span className="ent-point absolute inline-flex h-full w-full rounded-full bg-green-400" />
                                <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                            </span>
                        </span>

                        <span className="hidden leading-tight sm:block">
                            <span className="block max-w-[160px] truncate text-sm font-semibold text-gray-800">
                                {user.name}
                            </span>
                            {libelleRole && (
                                <span className="block text-xs text-gray-500">
                                    {libelleRole}
                                </span>
                            )}
                        </span>

                        <svg
                            className="h-4 w-4 text-gray-400 transition duration-200 group-hover:translate-y-0.5 group-hover:text-gray-600"
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
                    <div className="border-b border-gray-100 px-4 py-3">
                        <p className="truncate text-sm font-semibold text-gray-800">
                            {user.name}
                        </p>
                        {user.email && (
                            <p className="truncate text-xs text-gray-500">
                                {user.email}
                            </p>
                        )}
                    </div>

                    <Dropdown.Link href={route('profile.edit')}>
                        <span className="flex items-center gap-2.5">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                className="h-4 w-4 text-gray-400"
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

                    <Dropdown.Link href={route('logout')} method="post" as="button">
                        <span className="flex items-center gap-2.5 text-red-600">
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
        </header>
    );
}