
import Entete from '@/Layouts/Partials/Entete';
import Footer from '@/Layouts/Partials/Footer';
import Sidebar from '@/Layouts/Partials/Sidebar';
import { usePage } from '@inertiajs/react';

export default function AuthenticatedLayout({ header, children }) {
    const { flash } = usePage().props;

    return (
        <div className="flex min-h-screen w-full items-stretch overflow-x-clip bg-gray-100">

            {/* ==================================================
                SIDEBAR
            ================================================== */}

            <Sidebar />

            {/* ==================================================
                CONTENU PRINCIPAL
            ================================================== */}

            <div className="flex min-h-screen min-w-0 flex-1 flex-col">

                {/* EN-TÊTE */}
                <Entete header={header} />

                {/* ==================================================
                    CONTENU DE LA PAGE
                ================================================== */}

                <main className="app-main w-full min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">

                    <div className="page-enter mx-auto w-full max-w-[1600px] min-w-0">
                        {flash?.erreur && (
                            <div
                                className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm"
                                role="alert"
                                aria-live="assertive"
                            >
                                <span className="font-semibold">Opération impossible :</span>{' '}
                                {flash.erreur}
                            </div>
                        )}
                        {children}
                    </div>

                </main>

                {/* ==================================================
                    PIED DE PAGE
                ================================================== */}

                <Footer />

            </div>
        </div>
    );
}
