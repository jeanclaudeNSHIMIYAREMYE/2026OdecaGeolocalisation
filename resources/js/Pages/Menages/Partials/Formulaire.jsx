import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { useMemo, useState } from 'react';

export default function Formulaire({
    data,
    setData,
    errors,
    processing,
    provinces,
    communes,
    zones,
    collines,
    enqueteurs,
    onSubmit,
}) {
    // La colline_id est la seule valeur réellement envoyée au serveur ;
    // ces sélecteurs en cascade ne servent qu'à la retrouver facilement.
    const collineActuelle = collines.find((c) => c.id === Number(data.colline_id));
    const zoneActuelle = zones.find((z) => z.id === collineActuelle?.zone_id);
    const communeActuelle = communes.find((c) => c.id === zoneActuelle?.commune_id);

    const [provinceId, setProvinceId] = useState(communeActuelle?.province_id ?? '');
    const [communeId, setCommuneId] = useState(communeActuelle?.id ?? '');
    const [zoneId, setZoneId] = useState(zoneActuelle?.id ?? '');

    const communesFiltrees = useMemo(
        () => communes.filter((c) => !provinceId || c.province_id === Number(provinceId)),
        [communes, provinceId],
    );
    const zonesFiltrees = useMemo(
        () => zones.filter((z) => !communeId || z.commune_id === Number(communeId)),
        [zones, communeId],
    );
    const collinesFiltrees = useMemo(
        () => collines.filter((c) => !zoneId || c.zone_id === Number(zoneId)),
        [collines, zoneId],
    );

    const classeSelect = 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500';

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div>
                <InputLabel htmlFor="code_menage" value="Code ménage" />
                <TextInput
                    id="code_menage"
                    className="mt-1 block w-full"
                    value={data.code_menage}
                    onChange={(e) => setData('code_menage', e.target.value)}
                    required
                />
                <InputError message={errors.code_menage} className="mt-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <InputLabel htmlFor="prenom_chef_menage" value="Prénom du chef de ménage" />
                    <TextInput
                        id="prenom_chef_menage"
                        className="mt-1 block w-full"
                        value={data.prenom_chef_menage ?? ''}
                        onChange={(e) => setData('prenom_chef_menage', e.target.value)}
                    />
                </div>
                <div>
                    <InputLabel htmlFor="nom_chef_menage" value="Nom du chef de ménage" />
                    <TextInput
                        id="nom_chef_menage"
                        className="mt-1 block w-full"
                        value={data.nom_chef_menage ?? ''}
                        onChange={(e) => setData('nom_chef_menage', e.target.value)}
                    />
                </div>
            </div>

            <div>
                <InputLabel htmlFor="telephone" value="Téléphone" />
                <TextInput
                    id="telephone"
                    className="mt-1 block w-full"
                    value={data.telephone ?? ''}
                    onChange={(e) => setData('telephone', e.target.value)}
                />
            </div>

            <fieldset className="space-y-4 rounded-md border p-4">
                <legend className="px-1 text-sm font-medium text-gray-700">Localisation</legend>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <InputLabel value="Province" />
                        <select
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
                            {provinces.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                        </select>
                    </div>

                    <div>
                        <InputLabel value="Commune" />
                        <select
                            className={classeSelect}
                            value={communeId}
                            onChange={(e) => {
                                setCommuneId(e.target.value);
                                setZoneId('');
                                setData('colline_id', '');
                            }}
                            disabled={!provinceId}
                        >
                            <option value="">— Sélectionner —</option>
                            {communesFiltrees.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                        </select>
                    </div>

                    <div>
                        <InputLabel value="Zone" />
                        <select
                            className={classeSelect}
                            value={zoneId}
                            onChange={(e) => {
                                setZoneId(e.target.value);
                                setData('colline_id', '');
                            }}
                            disabled={!communeId}
                        >
                            <option value="">— Sélectionner —</option>
                            {zonesFiltrees.map((z) => <option key={z.id} value={z.id}>{z.nom}</option>)}
                        </select>
                    </div>

                    <div>
                        <InputLabel value="Colline" />
                        <select
                            className={classeSelect}
                            value={data.colline_id ?? ''}
                            onChange={(e) => setData('colline_id', e.target.value)}
                            disabled={!zoneId}
                        >
                            <option value="">— Sélectionner —</option>
                            {collinesFiltrees.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                        </select>
                    </div>
                </div>
                <InputError message={errors.colline_id} className="mt-2" />
            </fieldset>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <InputLabel htmlFor="statut" value="Statut" />
                    <select
                        id="statut"
                        className={classeSelect}
                        value={data.statut}
                        onChange={(e) => setData('statut', e.target.value)}
                    >
                        <option value="a_faire">À faire</option>
                        <option value="en_attente">En attente</option>
                        <option value="termine">Terminé</option>
                    </select>
                </div>

                <div>
                    <InputLabel htmlFor="enqueteur_id" value="Enquêteur assigné" />
                    <select
                        id="enqueteur_id"
                        className={classeSelect}
                        value={data.enqueteur_id ?? ''}
                        onChange={(e) => setData('enqueteur_id', e.target.value)}
                    >
                        <option value="">— Aucun —</option>
                        {enqueteurs.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
            </div>

            <PrimaryButton disabled={processing}>Enregistrer</PrimaryButton>
        </form>
    );
}
