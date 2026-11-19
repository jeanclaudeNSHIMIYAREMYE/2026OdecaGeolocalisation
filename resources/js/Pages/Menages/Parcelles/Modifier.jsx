import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';

const normaliserChoix = (valeur, alias = {}) =>
    valeur == null ? '' : alias[valeur] ?? valeur;

const OPTIONS_TYPE_CAFE = ['Arabica', 'Robusta'];
const OPTIONS_ACQUISITION = [
    'Concession',
    'Heritage',
    'Achat',
    'Donations',
    'Cessions',
    'Location',
];
const OPTIONS_ETAT_VERGER = ['Bon', 'Moyen', 'Mauvais'];

export default function Modifier({ menage, parcelle }) {
    const { data, setData, put, processing, errors } = useForm({
        nombre_pieds: parcelle.nombre_pieds ?? '',
        annee_mise_en_place: parcelle.annee_mise_en_place ?? '',
        surface_verger: parcelle.surface_verger ?? '',
        etat_verger: normaliserChoix(parcelle.etat_verger),
        type: normaliserChoix(parcelle.type, { arabica: 'Arabica', robusta: 'Robusta' }),
        type_parcelle: parcelle.type_parcelle ?? '',
        mode_acquisition: normaliserChoix(parcelle.mode_acquisition, {
            'Héritage': 'Heritage',
            Donation: 'Donations',
            Cession: 'Cessions',
        }),
    });

    const submit = (event) => {
        event.preventDefault();
        put(route('menages.parcelles.update', [menage.id, parcelle.id]));
    };

    const champ = (nom, valeur) => (
        <div>
            <InputLabel htmlFor={nom} value={valeur} />
            <TextInput
                id={nom}
                value={data[nom]}
                onChange={(event) => setData(nom, event.target.value)}
                className="mt-1 block w-full"
            />
            <InputError message={errors[nom]} className="mt-1" />
        </div>
    );

    const selectChamp = (nom, valeur, options) => (
        <div>
            <InputLabel htmlFor={nom} value={valeur} />
            <select
                id={nom}
                value={data[nom]}
                onChange={(event) => setData(nom, event.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            >
                <option value="">Sélectionner</option>
                {options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                ))}
            </select>
            <InputError message={errors[nom]} className="mt-1" />
        </div>
    );

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Modifier la parcelle</h2>}>
            <Head title="Modifier la parcelle" />

            <div className="py-12">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                        <p className="text-sm text-gray-500">Ménage : {menage.code_menage}</p>
                        <h1 className="mt-1 text-xl font-bold text-gray-900">
                            {menage.prenom_chef_menage} {menage.nom_chef_menage}
                        </h1>
                    </div>

                    <form onSubmit={submit} className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Informations modifiables</h2>
                            {errors.parcelle && (
                                <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200" role="alert">
                                    {errors.parcelle}
                                </div>
                            )}
                            <p className="mt-1 text-sm text-gray-500">Les coordonnées GPS sont conservées telles qu’enregistrées sur le terrain.</p>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            {champ('nombre_pieds', 'Nombre de pieds')}
                            {champ('annee_mise_en_place', 'Année de mise en place')}
                            {champ('surface_verger', 'Surface du verger (ha)')}
                            {selectChamp('type', 'Type de café', OPTIONS_TYPE_CAFE)}
                            {selectChamp('etat_verger', 'État du verger', OPTIONS_ETAT_VERGER)}
                            <div>
                                <InputLabel htmlFor="type_parcelle" value="Catégorie de parcelle" />
                                <select
                                    id="type_parcelle"
                                    value={data.type_parcelle}
                                    onChange={(event) => setData('type_parcelle', event.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                                >
                                    <option value="">Sélectionner une catégorie</option>
                                    <option value="verger">Verger</option>
                                    <option value="sous_verger">Sous-verger</option>
                                </select>
                                <InputError message={errors.type_parcelle} className="mt-1" />
                            </div>
                            {selectChamp('mode_acquisition', 'Mode d’acquisition', OPTIONS_ACQUISITION)}
                        </div>

                        <div className="rounded-lg bg-gray-50 p-4 ring-1 ring-gray-200">
                            <h3 className="font-semibold text-gray-800">Coordonnées non modifiables</h3>
                            <div className="mt-3 grid gap-4 sm:grid-cols-3">
                                <div><span className="text-xs text-gray-500">Latitude</span><p className="font-medium">{parcelle.latitude ?? '—'}</p></div>
                                <div><span className="text-xs text-gray-500">Longitude</span><p className="font-medium">{parcelle.longitude ?? '—'}</p></div>
                                <div><span className="text-xs text-gray-500">Altitude</span><p className="font-medium">{parcelle.altitude != null ? `${parcelle.altitude} m` : '—'}</p></div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                            <Link href={route('menages.show', menage.id)}><SecondaryButton type="button">Annuler</SecondaryButton></Link>
                            <PrimaryButton disabled={processing}>{processing ? 'Modification...' : 'Modifier'}</PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
