
import Entete from '@/Layouts/Partials/Entete';
import Footer from '@/Layouts/Partials/Footer';
import Sidebar from '@/Layouts/Partials/Sidebar';

export default function AuthenticatedLayout({ header, children }) {
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
