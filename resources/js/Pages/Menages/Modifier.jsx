import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import Formulaire from './Partials/Formulaire';

export default function Modifier({ menage, provinces, communes, zones, collines, enqueteurs }) {
    const { data, setData, put, processing, errors } = useForm({
        code_menage: menage.code_menage,
        nom_chef_menage: menage.nom_chef_menage ?? '',
        prenom_chef_menage: menage.prenom_chef_menage ?? '',
        telephone: menage.telephone ?? '',
        colline_id: menage.colline_id,
        statut: menage.statut,
        enqueteur_id: menage.enqueteur_id ?? '',
    });

    const soumettre = (e) => {
        e.preventDefault();
        put(route('menages.update', menage.id));
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Modifier {menage.code_menage}</h2>}
        >
            <Head title="Modifier un ménage" />

            <div className="py-12">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <div className="bg-white p-4 shadow sm:rounded-lg sm:p-8">
                        <Formulaire
                            data={data}
                            setData={setData}
                            errors={errors}
                            processing={processing}
                            provinces={provinces}
                            communes={communes}
                            zones={zones}
                            collines={collines}
                            enqueteurs={enqueteurs}
                            onSubmit={soumettre}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
