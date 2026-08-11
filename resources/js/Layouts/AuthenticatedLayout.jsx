import Entete from '@/Layouts/Partials/Entete';
import Footer from '@/Layouts/Partials/Footer';
import Sidebar from '@/Layouts/Partials/Sidebar';

export default function AuthenticatedLayout({ header, children }) {
    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar />

            <div className="flex min-h-screen flex-1 flex-col">
                <Entete header={header} />

                <main className="flex-1">{children}</main>

                <Footer />
            </div>
        </div>
    );
}
