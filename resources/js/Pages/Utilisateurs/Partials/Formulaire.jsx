import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { useMemo } from 'react';

const ROLES_AVEC_PROVINCE = ['superviseur_provincial'];
const ROLES_AVEC_COMMUNE = ['superviseur_communal'];

export default function Formulaire({
    data,
    setData,
    errors,
    processing,
    roles,
    provinces,
    communes,
    modeCreation,
    onSubmit,
}) {
    const communesFiltrees = useMemo(
        () => communes.filter((commune) => commune.province_id === Number(data.province_id)),
        [communes, data.province_id],
    );

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div>
                <InputLabel htmlFor="name" value="Nom complet" />
                <TextInput
                    id="name"
                    className="mt-1 block w-full"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    required
                />
                <InputError message={errors.name} className="mt-2" />
            </div>

            <div>
                <InputLabel htmlFor="email" value="Email" />
                <TextInput
                    id="email"
                    type="email"
                    className="mt-1 block w-full"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    required
                />
                <InputError message={errors.email} className="mt-2" />
            </div>

            <div>
                <InputLabel htmlFor="role" value="Rôle" />
                <select
                    id="role"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={data.role}
                    onChange={(e) =>
                        setData((precedent) => ({
                            ...precedent,
                            role: e.target.value,
                            province_id: '',
                            commune_id: '',
                        }))
                    }
                    required
                >
                    <option value="">— Sélectionner —</option>
                    {Object.entries(roles).map(([valeur, libelle]) => (
                        <option key={valeur} value={valeur}>
                            {libelle}
                        </option>
                    ))}
                </select>
                <InputError message={errors.role} className="mt-2" />
            </div>

            {ROLES_AVEC_PROVINCE.includes(data.role) && (
                <div>
                    <InputLabel htmlFor="province_id" value="Province" />
                    <select
                        id="province_id"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        value={data.province_id}
                        onChange={(e) => setData('province_id', e.target.value)}
                        required
                    >
                        <option value="">— Sélectionner —</option>
                        {provinces.map((province) => (
                            <option key={province.id} value={province.id}>
                                {province.nom}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.province_id} className="mt-2" />
                </div>
            )}

            {ROLES_AVEC_COMMUNE.includes(data.role) && (
                <>
                    <div>
                        <InputLabel htmlFor="province_id" value="Province" />
                        <select
                            id="province_id"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={data.province_id}
                            onChange={(e) =>
                                setData((precedent) => ({
                                    ...precedent,
                                    province_id: e.target.value,
                                    commune_id: '',
                                }))
                            }
                            required
                        >
                            <option value="">— Sélectionner —</option>
                            {provinces.map((province) => (
                                <option key={province.id} value={province.id}>
                                    {province.nom}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <InputLabel htmlFor="commune_id" value="Commune" />
                        <select
                            id="commune_id"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={data.commune_id}
                            onChange={(e) => setData('commune_id', e.target.value)}
                            required
                            disabled={!data.province_id}
                        >
                            <option value="">— Sélectionner —</option>
                            {communesFiltrees.map((commune) => (
                                <option key={commune.id} value={commune.id}>
                                    {commune.nom}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.commune_id} className="mt-2" />
                    </div>
                </>
            )}

            <div>
                <InputLabel
                    htmlFor="password"
                    value={modeCreation ? 'Mot de passe' : 'Nouveau mot de passe (laisser vide pour ne pas changer)'}
                />
                <TextInput
                    id="password"
                    type="password"
                    className="mt-1 block w-full"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    required={modeCreation}
                />
                <InputError message={errors.password} className="mt-2" />
            </div>

            <div className="flex items-center gap-4">
                <PrimaryButton disabled={processing}>
                    {modeCreation ? 'Créer le compte' : 'Enregistrer'}
                </PrimaryButton>
            </div>
        </form>
    );
}
