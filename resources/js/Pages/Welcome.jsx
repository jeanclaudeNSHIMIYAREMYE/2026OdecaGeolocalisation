import ApplicationLogo from '@/Components/ApplicationLogo';
import odeca from '@/assets/odeca-logo.jpeg';
import { Head, Link } from '@inertiajs/react';

export default function Welcome({ auth }) {
    return (
        <>
            <Head title="Bienvenue" />

            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-red-50 via-white to-green-50">
                <div className="absolute inset-x-0 top-0 flex h-2">
                    <div className="flex-1 bg-burundi-rouge" />
                    <div className="flex-1 bg-white" />
                    <div className="flex-1 bg-burundi-vert" />
                </div>
                {/* Logo ODECA en fond, très estompé */}
                <img
                    src={odeca}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 opacity-10 blur-sm"
                />

                <div className="relative flex min-h-screen flex-col">
                    <header className="flex items-center justify-between px-6 py-6 sm:px-10">
                        <div className="flex items-center gap-3">
                            <ApplicationLogo className="h-10 w-auto" />
                            <span className="text-sm font-semibold text-gray-700">
                                LNC Burundi
                            </span>
                        </div>

                        <nav className="flex gap-2">
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-md bg-burundi-vert px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="rounded-md bg-burundi-vert px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                                    >
                                        Connexion
                                    </Link>

                                </>
                            )}
                        </nav>
                    </header>

                    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                        <img
                            src={odeca}
                            alt="ODECA — Géolocalisation nationale des plantations de café"
                            className="mb-8 h-56 w-56 rounded-full object-cover shadow-lg sm:h-64 sm:w-64"
                        />

                        <h1 className="max-w-3xl text-3xl font-bold text-gray-900 sm:text-4xl">
                            Bienvenue sur la géo-localisation des plantations de café national
                        </h1>
                        <p className="mt-2 max-w-2xl text-lg text-gray-500">
                            Welcome to the national coffee plantation geolocation platform
                        </p>

                        <p className="mt-6 max-w-xl text-sm text-gray-500">
                            Portail d'administration pour le suivi, la cartographie et la
                            gestion des données de géolocalisation des caféiculteurs
                            du Burundi.
                        </p>

                        {!auth.user && (
                            <Link
                                href={route('login')}
                                className="mt-8 rounded-md bg-burundi-vert px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-green-700"
                            >
                                Accéder au portail
                            </Link>
                        )}
                    </main>

                    <footer className="px-6 py-8 text-center text-xs text-gray-400">
                        ODECA — Géolocalisation nationale des plantations de café · Burundi
                    </footer>
                </div>
            </div>
        </>
    );
}
