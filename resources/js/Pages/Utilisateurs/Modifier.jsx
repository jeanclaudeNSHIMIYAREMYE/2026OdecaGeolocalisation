import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import Formulaire from './Partials/Formulaire';

export default function Modifier({ utilisateur, roles, provinces, communes, zones, collines }) {
    const { data, setData, put, processing, errors } = useForm({
        name: utilisateur.name,
        email: utilisateur.email,
        role: utilisateur.role,
        province_id: utilisateur.province_id ?? '',
        commune_id: utilisateur.commune_id ?? '',
        collines_ids: utilisateur.collines_ids ?? [],
        password: '',
    });

    const soumettre = (e) => {
        e.preventDefault();
        put(route('utilisateurs.update', utilisateur.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Modifier le compte de {utilisateur.name}
                </h2>
            }
        >
            <Head title="Modifier un compte" />

            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8">
                    <div className="bg-white p-4 shadow sm:rounded-lg sm:p-8">
                        <Formulaire
                            data={data}
                            setData={setData}
                            errors={errors}
                            processing={processing}
                            roles={roles}
                            provinces={provinces}
                            communes={communes}
                            zones={zones}
                            collines={collines}
                            modeCreation={false}
                            onSubmit={soumettre}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
