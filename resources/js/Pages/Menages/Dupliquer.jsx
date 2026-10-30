import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const classeSelect =
    'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500';

export default function Dupliquer({ menage, provinces, communes, zones, collines, enqueteurs }) {
    const { data, setData, post, processing, errors } = useForm({
        code_menage: '',
        nom_chef_menage: menage.nom_chef_menage ?? '',
        prenom_chef_menage: menage.prenom_chef_menage ?? '',
        telephone: menage.telephone ?? '',
        cni: menage.cni ?? '',
        colline_id: menage.colline_id ?? '',
        enqueteur_id: menage.enqueteur_id ?? '',
    });

    // Sélecteurs en cascade : seul colline_id est envoyé au serveur.
    const [provinceId, setProvinceId] = useState(menage.province_id ?? '');
    const [communeId, setCommuneId] = useState(menage.commune_id ?? '');
    const [zoneId, setZoneId] = useState(menage.zone_id ?? '');

    const communesFiltrees = useMemo(
        () => communes.filter((c) => c.province_id === Number(provinceId)),
        [communes, provinceId],
    );
    const zonesFiltrees = useMemo(
        () => zones.filter((z) => z.commune_id === Number(communeId)),
        [zones, communeId],
    );
    const collinesFiltrees = useMemo(
        () => collines.filter((c) => c.zone_id === Number(zoneId)),
        [collines, zoneId],
    );

    const soumettre = (e) => {
        e.preventDefault();
        post(route('menages.dupliquer.store', menage.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Dupliquer le caféiculteur {menage.code_menage}
                </h2>
            }
        >
            <Head title={`Dupliquer ${menage.code_menage}`} />

            <div className="py-12">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <form onSubmit={soumettre} className="space-y-6 rounded-lg bg-white p-6 shadow-sm">
                        <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
                            Les informations du ménage sont copiées. Les réponses au questionnaire et
                            les parcelles ne sont pas copiées. Choisissez un nouveau code et la
                            nouvelle localisation.
                        </p>

                        <div>
                            <InputLabel htmlFor="code_menage" value="Nouveau code ménage" />
                            <TextInput
                                id="code_menage"
                                className="mt-1 block w-full"
                                value={data.code_menage}
                                onChange={(e) => setData('code_menage', e.target.value)}
                                placeholder={`Ex. ${menage.code_menage}-2`}
                                required
                            />
                            <InputError message={errors.code_menage} className="mt-2" />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <InputLabel htmlFor="prenom" value="Prénom du chef de ménage" />
                                <TextInput
                                    id="prenom"
                                    className="mt-1 block w-full"
                                    value={data.prenom_chef_menage}
                                    onChange={(e) => setData('prenom_chef_menage', e.target.value)}
                                />
                                <InputError message={errors.prenom_chef_menage} className="mt-2" />
                            </div>
                            <div>
                                <InputLabel htmlFor="nom" value="Nom du chef de ménage" />
                                <TextInput
                                    id="nom"
                                    className="mt-1 block w-full"
                                    value={data.nom_chef_menage}
                                    onChange={(e) => setData('nom_chef_menage', e.target.value)}
                                />
                                <InputError message={errors.nom_chef_menage} className="mt-2" />
                            </div>
                            <div>
                                <InputLabel htmlFor="telephone" value="Téléphone" />
                                <TextInput
                                    id="telephone"
                                    className="mt-1 block w-full"
                                    value={data.telephone}
                                    onChange={(e) => setData('telephone', e.target.value)}
                                />
                                <InputError message={errors.telephone} className="mt-2" />
                            </div>
                            <div>
                                <InputLabel htmlFor="cni" value="CNI" />
                                <TextInput
                                    id="cni"
                                    className="mt-1 block w-full"
                                    value={data.cni}
                                    onChange={(e) => setData('cni', e.target.value)}
                                />
                                <InputError message={errors.cni} className="mt-2" />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold uppercase text-gray-500">
                                Localisation administrative
                            </h3>

                            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <InputLabel htmlFor="province" value="Province" />
                                    <select
                                        id="province"
                                        className={classeSelect}
                                        value={provinceId}
                                        onChange={(e) => {
                                            setProvinceId(e.target.value);
                                            setCommuneId('');
                                            setZoneId('');
                                            setData('colline_id', '');
                                        }}
                                    >
                                        <option value="">— Sélectionner —</option>
                                        {provinces.map((p) => (
                                            <option key={p.id} value={p.id}>{p.nom}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <InputLabel htmlFor="commune" value="Commune" />
                                    <select
                                        id="commune"
                                        className={classeSelect}
                                        value={communeId}
                                        disabled={!provinceId}
                                        onChange={(e) => {
                                            setCommuneId(e.target.value);
                                            setZoneId('');
                                            setData('colline_id', '');
                                        }}
                                    >
                                        <option value="">— Sélectionner —</option>
                                        {communesFiltrees.map((c) => (
                                            <option key={c.id} value={c.id}>{c.nom}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <InputLabel htmlFor="zone" value="Zone" />
                                    <select
                                        id="zone"
                                        className={classeSelect}
                                        value={zoneId}
                                        disabled={!communeId}
                                        onChange={(e) => {
                                            setZoneId(e.target.value);
                                            setData('colline_id', '');
                                        }}
                                    >
                                        <option value="">— Sélectionner —</option>
                                        {zonesFiltrees.map((z) => (
                                            <option key={z.id} value={z.id}>{z.nom}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <InputLabel htmlFor="colline_id" value="Colline" />
                                    <select
                                        id="colline_id"
                                        className={classeSelect}
                                        value={data.colline_id}
                                        disabled={!zoneId}
                                        onChange={(e) => setData('colline_id', e.target.value)}
                                        required
                                    >
                                        <option value="">— Sélectionner —</option>
                                        {collinesFiltrees.map((c) => (
                                            <option key={c.id} value={c.id}>{c.nom}</option>
                                        ))}
                                    </select>
                                    <InputError message={errors.colline_id} className="mt-2" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <InputLabel htmlFor="enqueteur_id" value="Enquêteur assigné (optionnel)" />
                            <select
                                id="enqueteur_id"
                                className={classeSelect}
                                value={data.enqueteur_id}
                                onChange={(e) => setData('enqueteur_id', e.target.value)}
                            >
                                <option value="">— Aucun —</option>
                                {enqueteurs.map((u) => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                            <InputError message={errors.enqueteur_id} className="mt-2" />
                        </div>

                        <div className="flex items-center gap-4">
                            <PrimaryButton disabled={processing}>Créer la copie</PrimaryButton>
                            <Link
                                href={route('menages.show', menage.id)}
                                className="text-sm text-gray-600 hover:underline"
                            >
                                Annuler
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
