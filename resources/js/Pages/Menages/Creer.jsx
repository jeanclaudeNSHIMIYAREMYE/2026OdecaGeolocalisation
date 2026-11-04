
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import Formulaire from './Partials/Formulaire';

export default function Creer({
    provinces,
    communes,
    zones,
    collines,
    enqueteurs,
}) {
    const { data, setData, post, processing, errors } = useForm({
        code_menage: '',
        nom_chef_menage: '',
        prenom_chef_menage: '',
        telephone: '',
        cni: '',
        colline_id: '',
        statut: 'a_faire',
        enqueteur_id: '',
    });

    const soumettre = (e) => {
        e.preventDefault();

        post(route('menages.store'), {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                            Gestion des Caféiculteurs
                        </p>

                        <h2 className="mt-1 text-lg font-bold text-gray-800 sm:text-xl">
                            Nouveau Caféiculteur
                        </h2>
                    </div>

                    <Link
                        href={route('menages.index')}
                        className="inline-flex w-fit items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-green-700"
                    >
                        <span aria-hidden="true">←</span>
                        Retour à la liste
                    </Link>
                </div>
            }
        >
            <Head title="Nouveau ménage" />

            <div className="min-h-screen bg-gray-50 py-5 sm:py-8 lg:py-10">
                <div className="mx-auto max-w-4xl space-y-5 px-3 sm:px-6 lg:px-8">

                    {/* Introduction */}
                    <div className="rounded-xl border border-green-100 bg-green-50 p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm9-3v6m3-3h-6"
                                    />
                                </svg>
                            </div>

                            <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-green-800">
                                    Enregistrement d'un nouveau Caféiculteur
                                </h3>

                                <p className="mt-1 text-xs leading-5 text-green-700 sm:text-sm">
                                    Renseignez les informations du Caféiculteur,
                                    sa localisation et l'enquêteur responsable.
                                    Les champs obligatoires doivent être complétés
                                    avant l'enregistrement.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Formulaire */}
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                        <div className="border-b border-gray-100 px-4 py-4 sm:px-6">
                            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">
                                Informations du Caféiculteur
                            </h3>

                            <p className="mt-1 text-xs text-gray-400">
                                Complétez les champs du formulaire ci-dessous.
                            </p>
                        </div>

                        <div className="p-4 sm:p-6 lg:p-8">
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

                    {/* Information complémentaire */}
                    <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3 text-xs leading-5 text-gray-500 sm:p-4 sm:text-sm">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 16v-4m0-4h.01"
                            />
                        </svg>

                        <p>
                            Vérifiez les informations avant de soumettre le
                            formulaire. Les données enregistrées seront associées
                            à la localisation et à l'enquêteur sélectionnés.
                        </p>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
