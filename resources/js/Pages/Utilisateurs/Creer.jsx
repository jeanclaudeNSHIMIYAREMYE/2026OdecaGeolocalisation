import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import Formulaire from './Partials/Formulaire';

export default function Creer({ roles, provinces, communes, zones, collines }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        role: '',
        province_id: '',
        commune_id: '',
        collines_ids: [],
        password: '',
    });

    const soumettre = (e) => {
        e.preventDefault();
        post(route('utilisateurs.store'));
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Nouveau compte utilisateur
                </h2>
            }
        >
            <Head title="Nouveau compte" />

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
                            modeCreation
                            onSubmit={soumettre}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
