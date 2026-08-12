import ApplicationLogo from '@/Components/ApplicationLogo';
import odeca from '@/assets/odeca-logo.jpeg';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-gradient-to-br from-red-50 via-white to-green-50 pt-6 sm:justify-center sm:pt-0">
            <div className="absolute inset-x-0 top-0 flex h-2">
                <div className="flex-1 bg-burundi-rouge" />
                <div className="flex-1 bg-white" />
                <div className="flex-1 bg-burundi-vert" />
            </div>
            {/* Logo ODECA en fond, très estompé, comme sur la page d'accueil */}
            <img
                src={odeca}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 opacity-10 blur-sm"
            />

            <div className="relative flex items-center gap-4">
                <Link href="/">
                    <ApplicationLogo className="h-16 w-auto" />
                </Link>
                <img
                    src={odeca}
                    alt="ODECA — Géolocalisation nationale des plantations de café"
                    className="h-16 w-16 rounded-full object-cover shadow"
                />
            </div>

            <div className="relative mt-6 w-full overflow-hidden bg-white px-6 py-4 shadow-md sm:max-w-md sm:rounded-lg">
                {children}
            </div>
        </div>
    );
}
