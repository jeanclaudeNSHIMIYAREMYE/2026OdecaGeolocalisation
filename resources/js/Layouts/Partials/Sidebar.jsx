import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

const LIEN_CLASSE_BASE =
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition';
const LIEN_CLASSE_ACTIF = 'bg-green-50 text-burundi-vert';
const LIEN_CLASSE_INACTIF = 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';

function LienNav({ href, actif, children }) {
    return (
        <Link
            href={href}
            className={`${LIEN_CLASSE_BASE} ${actif ? LIEN_CLASSE_ACTIF : LIEN_CLASSE_INACTIF}`}
        >
            {children}
        </Link>
    );
}

function ContenuNavigation({ user }) {
    return (
        <nav className="flex-1 space-y-1 px-3">
            <LienNav href={route('dashboard')} actif={route().current('dashboard')}>
                Dashboard
            </LienNav>

            <LienNav href={route('menages.index')} actif={route().current('menages.*')}>
                Caféiculteurs
            </LienNav>
            <LienNav href={route('suivi-menages.index')} actif={route().current('suivi-menages.*')}>
                Suivi  Caféiculteurs
            </LienNav>

            <LienNav href={route('statistiques.index')} actif={route().current('statistiques.*')}>
                Statistiques
            </LienNav>

            {user.role !== 'enqueteur' && (
                <LienNav href={route('rapports.index')} actif={route().current('rapports.*')}>
                    Rapports
                </LienNav>
            )}

            {user.role !== 'enqueteur' && (
                <LienNav href={route('utilisateurs.index')} actif={route().current('utilisateurs.*')}>
                    Utilisateurs
                </LienNav>
            )}
        </nav>
    );
}

/**
 * Barre latérale de navigation du portail. Gère elle-même son état
 * ouvert/fermé sur mobile (bouton hamburger fixe en haut à gauche),
 * pas besoin de coordonner cet état avec le reste du layout.
 */
export default function Sidebar() {
    const user = usePage().props.auth.user;
    const [ouvert, setOuvert] = useState(false);

    return (
        <>
            {/* Bouton mobile */}
            <button
                type="button"
                onClick={() => setOuvert(true)}
                className="fixed left-4 top-4 z-30 rounded-md bg-white p-2 text-gray-500 shadow sm:hidden"
                aria-label="Ouvrir le menu"
            >
                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Voile de fond sur mobile quand le menu est ouvert */}
            {ouvert && (
                <div
                    className="fixed inset-0 z-30 bg-black/30 sm:hidden"
                    onClick={() => setOuvert(false)}
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-gray-200 bg-white pb-6 pt-1 transition-transform sm:static sm:translate-x-0 ${
                    ouvert ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="mb-5 flex h-1.5 w-full">
                    <div className="flex-1 bg-burundi-rouge" />
                    <div className="flex-1 bg-white" />
                    <div className="flex-1 bg-burundi-vert" />
                </div>

                <div className="mb-6 flex items-center gap-2 px-4">
                    <Link href="/">
                        <ApplicationLogo className="block h-8 w-auto fill-current text-gray-800" />
                    </Link>
                    <span className="text-sm font-semibold text-gray-700">LNC Burundi</span>
                </div>

                <ContenuNavigation user={user} />
            </aside>
        </>
    );
}
