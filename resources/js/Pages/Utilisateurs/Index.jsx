import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';

const LIBELLES_ROLES = {
    admin: 'Administrateur',
    superviseur_national: 'Superviseur national',
    superviseur_provincial: 'Superviseur provincial',
    superviseur_communal: 'Superviseur communal',
    enqueteur: 'Enquêteur',
};

export default function Index({ utilisateurs, peutGerer }) {
    const { flash } = usePage().props;

    const basculerStatut = (utilisateur) => {
        const action = utilisateur.actif ? 'désactiver' : 'réactiver';

        if (!confirm(`Voulez-vous vraiment ${action} le compte de ${utilisateur.name} ?`)) {
            return;
        }

        router.patch(route('utilisateurs.basculer-statut', utilisateur.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Gestion des utilisateurs
                </h2>
            }
        >
            <Head title="Utilisateurs" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {flash?.succes && (
                        <div className="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-700">
                            {flash.succes}
                        </div>
                    )}

                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="flex items-center justify-between p-6">
                            <p className="text-sm text-gray-600">
                                {utilisateurs.length} compte(s)
                            </p>

                            {peutGerer && (
                                <Link href={route('utilisateurs.create')}>
                                    <PrimaryButton>
                                        Nouveau compte
                                    </PrimaryButton>
                                </Link>
                            )}
                        </div>

                        <table className="w-full text-left text-sm">
                            <thead className="border-t bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-6 py-3">Nom</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Rôle</th>
                                    <th className="px-6 py-3">Portée</th>
                                    <th className="px-6 py-3">Statut</th>
                                    {peutGerer && <th className="px-6 py-3">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {utilisateurs.map((utilisateur) => (
                                    <tr key={utilisateur.id}>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {utilisateur.name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {utilisateur.email}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {LIBELLES_ROLES[utilisateur.role]}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {utilisateur.commune?.nom ??
                                                utilisateur.province?.nom ??
                                                '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`rounded-full px-2 py-1 text-xs font-medium ${
                                                    utilisateur.actif
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                }`}
                                            >
                                                {utilisateur.actif ? 'Actif' : 'Désactivé'}
                                            </span>
                                        </td>
                                        {peutGerer && (
                                            <td className="space-x-2 px-6 py-4">
                                                <Link
                                                    href={route('utilisateurs.edit', utilisateur.id)}
                                                    className="text-indigo-600 hover:underline"
                                                >
                                                    Modifier
                                                </Link>
                                                <SecondaryButton
                                                    onClick={() => basculerStatut(utilisateur)}
                                                >
                                                    {utilisateur.actif ? 'Désactiver' : 'Réactiver'}
                                                </SecondaryButton>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
