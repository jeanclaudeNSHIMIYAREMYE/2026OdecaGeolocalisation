import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const ROLES_AVEC_PROVINCE = ['superviseur_provincial'];
const ROLES_AVEC_COLLINES = ['superviseur_communal', 'enqueteur'];

export default function Formulaire({
    data,
    setData,
    errors,
    processing,
    roles,
    provinces,
    communes,
    zones = [],
    collines = [],
    modeCreation,
    onSubmit,
}) {
    // Ces filtres servent à parcourir la hiérarchie; seules les collines
    // cochées sont envoyées au serveur.
    const [filtreProvince, setFiltreProvince] = useState('');
    const [filtreCommune, setFiltreCommune] = useState('');
    const [filtreZone, setFiltreZone] = useState('');
    const [recherche, setRecherche] = useState('');
    const [afficherMotDePasse, setAfficherMotDePasse] = useState(false);

    const communesDuFiltre = useMemo(
        () => communes.filter((commune) => !filtreProvince || Number(commune.province_id) === Number(filtreProvince)),
        [communes, filtreProvince],
    );

    const communesIdsDuFiltre = useMemo(
        () => new Set(communesDuFiltre.map((commune) => Number(commune.id))),
        [communesDuFiltre],
    );

    const zonesDuFiltre = useMemo(
        () =>
            zones.filter(
                (zone) =>
                    communesIdsDuFiltre.has(Number(zone.commune_id)) &&
                    (!filtreCommune || Number(zone.commune_id) === Number(filtreCommune)),
            ),
        [zones, communesIdsDuFiltre, filtreCommune],
    );

    const collinesAffichees = useMemo(() => {
        const zoneIdsDuFiltre = new Set(zonesDuFiltre.map((zone) => Number(zone.id)));

        return collines.filter((colline) => {
            if (!zoneIdsDuFiltre.has(Number(colline.zone_id))) {
                return false;
            }
            if (filtreZone && Number(colline.zone_id) !== Number(filtreZone)) {
                return false;
            }
            if (recherche && !colline.nom.toLowerCase().includes(recherche.toLowerCase())) {
                return false;
            }
            return true;
        });
    }, [collines, filtreZone, zonesDuFiltre, recherche]);

    const collinesSelectionnees = useMemo(
        () => collines.filter((colline) => (data.collines_ids ?? []).includes(colline.id)),
        [collines, data.collines_ids],
    );

    const basculerColline = (id) => {
        const actuel = data.collines_ids ?? [];
        setData('collines_ids', actuel.includes(id) ? actuel.filter((c) => c !== id) : [...actuel, id]);
    };

    const toutCocher = () => {
        const ids = new Set(data.collines_ids ?? []);
        collinesAffichees.forEach((colline) => ids.add(colline.id));
        setData('collines_ids', Array.from(ids));
    };

    const toutDecocher = () => {
        const idsAffiches = new Set(collinesAffichees.map((colline) => colline.id));
        setData('collines_ids', (data.collines_ids ?? []).filter((id) => !idsAffiches.has(id)));
    };

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
                            communes_ids: [],
                            collines_ids: [],
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

            {ROLES_AVEC_COLLINES.includes(data.role) && (
                <div>
                    <InputLabel
                        value={
                            data.role === 'superviseur_communal'
                                ? 'Zones et collines de supervision'
                                : "Collines d'affectation"
                        }
                    />
                    <p className="mt-1 text-sm text-gray-500">
                        Filtrez par province, commune ou zone pour retrouver des collines, puis
                        cochez les collines souhaitées.
                        {data.role === 'superviseur_communal'
                            ? ' Le périmètre du superviseur sera limité aux collines sélectionnées.'
                            : " L'enquêteur ne pourra intervenir que sur les collines sélectionnées ci-dessous."}
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <select
                            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={filtreProvince}
                            onChange={(e) => {
                                setFiltreProvince(e.target.value);
                                setFiltreCommune('');
                                setFiltreZone('');
                            }}
                        >
                            <option value="">Toutes les provinces</option>
                            {provinces.map((province) => (
                                <option key={province.id} value={province.id}>
                                    {province.nom}
                                </option>
                            ))}
                        </select>

                        <select
                            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={filtreCommune}
                            onChange={(e) => {
                                setFiltreCommune(e.target.value);
                                setFiltreZone('');
                            }}
                        >
                            <option value="">Toutes les communes</option>
                            {communesDuFiltre.map((commune) => (
                                <option key={commune.id} value={commune.id}>
                                    {commune.nom}
                                </option>
                            ))}
                        </select>

                        <select
                            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={filtreZone}
                            onChange={(e) => setFiltreZone(e.target.value)}
                        >
                            <option value="">Toutes les zones</option>
                            {zonesDuFiltre.map((zone) => (
                                <option key={zone.id} value={zone.id}>
                                    {zone.nom}
                                </option>
                            ))}
                        </select>
                    </div>

                    <TextInput
                        className="mt-3 block w-full"
                        placeholder="Rechercher une colline par nom..."
                        value={recherche}
                        onChange={(e) => setRecherche(e.target.value)}
                    />

                    <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                        <span>{collinesAffichees.length} colline(s) affichée(s)</span>
                        <div className="space-x-3">
                            <button type="button" onClick={toutCocher} className="text-indigo-600 hover:underline">
                                Tout cocher
                            </button>
                            <button type="button" onClick={toutDecocher} className="text-gray-500 hover:underline">
                                Tout décocher
                            </button>
                        </div>
                    </div>

                    <div className="mt-2 max-h-60 overflow-y-auto rounded-md border border-gray-200 p-2">
                        {collinesAffichees.length === 0 && (
                            <p className="p-2 text-sm text-gray-400">Aucune colline ne correspond aux filtres.</p>
                        )}
                        {collinesAffichees.map((colline) => {
                            const zone = zones.find((item) => Number(item.id) === Number(colline.zone_id));
                            const commune = communes.find(
                                (item) => Number(item.id) === Number(zone?.commune_id),
                            );
                            const province = provinces.find(
                                (item) => Number(item.id) === Number(commune?.province_id),
                            );

                            return (
                                <label
                                    key={colline.id}
                                    className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={(data.collines_ids ?? []).includes(colline.id)}
                                        onChange={() => basculerColline(colline.id)}
                                    />
                                    <span>
                                        {colline.nom}
                                        {commune && (
                                            <span className="ml-1 text-gray-500">
                                                ({commune.nom}{province ? `, ${province.nom}` : ''})
                                            </span>
                                        )}
                                    </span>
                                </label>
                            );
                        })}
                    </div>

                    {collinesSelectionnees.length > 0 && (
                        <div className="mt-3">
                            <p className="text-xs font-medium uppercase text-gray-500">
                                {collinesSelectionnees.length} colline(s) sélectionnée(s)
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                                {collinesSelectionnees.map((colline) => (
                                    <span
                                        key={colline.id}
                                        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700"
                                    >
                                        {colline.nom}
                                        <button
                                            type="button"
                                            onClick={() => basculerColline(colline.id)}
                                            className="text-indigo-400 hover:text-indigo-700"
                                            aria-label={`Retirer ${colline.nom}`}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <InputError message={errors.collines_ids} className="mt-2" />
                </div>
            )}

            <div>
    <InputLabel
        htmlFor="password"
        value={modeCreation ? 'Mot de passe' : 'Nouveau mot de passe (laisser vide pour ne pas changer)'}
    />
    <div className="relative mt-1">
        <TextInput
            id="password"
            type={afficherMotDePasse ? 'text' : 'password'}
            className="block w-full pr-10"
            value={data.password}
            onChange={(e) => setData('password', e.target.value)}
            required={modeCreation}
        />
        <button
            type="button"
            onClick={() => setAfficherMotDePasse((precedent) => !precedent)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
            aria-label={afficherMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            tabIndex={-1}
        >
            {afficherMotDePasse ? (
                <EyeOff className="h-5 w-5" />
            ) : (
                <Eye className="h-5 w-5" />
            )}
        </button>
    </div>
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
