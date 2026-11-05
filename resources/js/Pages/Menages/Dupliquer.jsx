
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const classeSelect =
    'mt-1 block min-h-[44px] w-full appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-700 shadow-sm transition-all duration-200 focus:border-green-600 focus:outline-none focus:ring-4 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 sm:text-sm';

function TitreSection({ titre, description }) {
    return (
        <div className="section-enter mb-5 flex gap-3 border-b border-gray-200/80 pb-4">
            <span className="mt-0.5 h-8 w-1 shrink-0 rounded-full bg-gradient-to-b from-burundi-vert to-emerald-400" />
            <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-gray-700">
                    {titre}
                </h3>

                {description && (
                    <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
}

function Champ({ id, label, error, children }) {
    return (
        <div className="min-w-0">
            <InputLabel
                htmlFor={id}
                value={label}
                className="mb-1 block text-sm font-semibold text-gray-700"
            />
            {children}
            <InputError message={error} className="mt-2" />
        </div>
    );
}

export default function Dupliquer({
    menage,
    provinces,
    communes,
    zones,
    collines,
    enqueteurs,
}) {
    const { data, setData, post, processing, errors } = useForm({
        code_menage: menage.code_menage ?? '',
        nom_chef_menage: menage.nom_chef_menage ?? '',
        prenom_chef_menage: menage.prenom_chef_menage ?? '',
        sexe: menage.sexe ?? '',
        date_naissance: menage.date_naissance ?? '',
        telephone: menage.telephone ?? '',
        cni: menage.cni ?? '',
        colline_id: menage.colline_id ?? '',
        enqueteur_id: menage.enqueteur_id ?? '',
    });

    // Sélecteurs administratifs en cascade.
    // Seul colline_id est envoyé au serveur.
    const [provinceId, setProvinceId] = useState(
        menage.province_id ?? '',
    );

    const [communeId, setCommuneId] = useState(
        menage.commune_id ?? '',
    );

    const [zoneId, setZoneId] = useState(
        menage.zone_id ?? '',
    );

    const communesFiltrees = useMemo(
        () =>
            communes.filter(
                (c) => Number(c.province_id) === Number(provinceId),
            ),
        [communes, provinceId],
    );

    const zonesFiltrees = useMemo(
        () =>
            zones.filter(
                (z) => Number(z.commune_id) === Number(communeId),
            ),
        [zones, communeId],
    );

    const collinesFiltrees = useMemo(
        () =>
            collines.filter(
                (c) => Number(c.zone_id) === Number(zoneId),
            ),
        [collines, zoneId],
    );

    const soumettre = (e) => {
        e.preventDefault();

        post(route('menages.dupliquer.store', menage.id), {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                            Gestion des Caféiculteurs
                        </p>

                        <h2 className="mt-1 break-words text-lg font-bold text-gray-800 sm:text-xl">
                            Dupliquer le Caféiculteur {menage.code_menage}
                        </h2>
                    </div>

                    <Link
                        href={route('menages.show', menage.id)}
                        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-600 shadow-sm transition-all duration-200 hover:border-green-200 hover:bg-green-50 hover:text-green-700 sm:w-fit"
                    >
                        <span aria-hidden="true">←</span>
                        Retour au Caféiculteur
                    </Link>
                </div>
            }
        >
            <Head title={`Dupliquer ${menage.code_menage}`} />

            <div className="min-h-screen py-3 sm:py-6 lg:py-8">
                <div className="page-enter mx-auto max-w-5xl space-y-4 px-0 sm:space-y-6 sm:px-1">

                    {/* Présentation */}
                    <div className="card-enter interactive-card rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm sm:p-5">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                >
                                    <rect
                                        x="8"
                                        y="8"
                                        width="13"
                                        height="13"
                                        rx="2"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"
                                    />
                                </svg>
                            </div>

                            <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-blue-800">
                                    Affectation du Caféiculteur
                                </h3>

                                <p className="mt-1 text-xs leading-5 text-blue-700 sm:text-sm">
                                    Le ménage conserve son code unique, ses
                                    données, ses parcelles et ses réponses.
                                    Cette opération ajoute une nouvelle colline
                                    à ses affectations.
                                </p>

                                <p className="mt-2 text-xs leading-5 text-blue-700">
                                    Les enquêteurs associés à cette colline
                                    pourront consulter le même ménage.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Formulaire */}
                    <form
                        onSubmit={soumettre}
                        className="card-enter-delay overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg shadow-gray-200/50"
                    >
                        {/* En-tête */}
                        <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-4 py-5 sm:px-6">
                            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">
                                Nouvelle affectation territoriale
                            </h3>

                            <p className="mt-1 text-xs text-gray-400">
                                Vérifiez le code et choisissez la colline.
                            </p>
                        </div>

                        <div className="space-y-5 p-4 sm:space-y-7 sm:p-6 lg:p-8">

                            {/* Identification */}
                            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
                                <TitreSection
                                    titre="Identification"
                                    description="Le code unique du ménage reste inchangé."
                                />

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <Champ
                                            id="code_menage"
                                            label="Code ménage unique"
                                            error={errors.code_menage}
                                        >
                                            <TextInput
                                                id="code_menage"
                                                className="mt-1 block min-h-[44px] w-full rounded-xl text-base sm:text-sm"
                                                value={data.code_menage}
                                                disabled
                                                autoComplete="off"
                                            />
                                        </Champ>
                                    </div>

                                    <Champ
                                        id="prenom"
                                        label="Prénom du chef de ménage"
                                        error={errors.prenom_chef_menage}
                                    >
                                        <TextInput
                                            id="prenom"
                                            className="mt-1 block min-h-[44px] w-full rounded-xl text-base sm:text-sm"
                                            value={data.prenom_chef_menage}
                                            onChange={(e) =>
                                                setData(
                                                    'prenom_chef_menage',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Prénom"
                                        />
                                    </Champ>

                                    <Champ
                                        id="nom"
                                        label="Nom du chef de ménage"
                                        error={errors.nom_chef_menage}
                                    >
                                        <TextInput
                                            id="nom"
                                            className="mt-1 block min-h-[44px] w-full rounded-xl text-base sm:text-sm"
                                            value={data.nom_chef_menage}
                                            onChange={(e) =>
                                                setData(
                                                    'nom_chef_menage',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Nom"
                                        />
                                    </Champ>

                                    <Champ
                                        id="sexe"
                                        label="Sexe"
                                        error={errors.sexe}
                                    >
                                        <select
                                            id="sexe"
                                            className="mt-1 block min-h-[44px] w-full rounded-xl text-base sm:text-sm"
                                            value={data.sexe}
                                            onChange={(e) =>
                                                setData('sexe', e.target.value)
                                            }
                                        >
                                            <option value="">Sélectionner</option>
                                            <option value="homme">Homme</option>
                                            <option value="femme">Femme</option>
                                        </select>
                                    </Champ>

                                    <Champ
                                        id="date_naissance"
                                        label="Date de naissance"
                                        error={errors.date_naissance}
                                    >
                                        <TextInput
                                            id="date_naissance"
                                            type="date"
                                            className="mt-1 block min-h-[44px] w-full rounded-xl text-base sm:text-sm"
                                            value={data.date_naissance}
                                            onChange={(e) =>
                                                setData(
                                                    'date_naissance',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </Champ>

                                    <Champ
                                        id="telephone"
                                        label="Téléphone"
                                        error={errors.telephone}
                                    >
                                        <TextInput
                                            id="telephone"
                                            className="mt-1 block min-h-[44px] w-full rounded-xl text-base sm:text-sm"
                                            value={data.telephone}
                                            onChange={(e) =>
                                                setData(
                                                    'telephone',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Ex. 79 00 00 00"
                                            type="tel"
                                        />
                                    </Champ>

                                    <Champ
                                        id="cni"
                                        label="Carte nationale d'identité (CNI)"
                                        error={errors.cni}
                                    >
                                        <TextInput
                                            id="cni"
                                            className="mt-1 block min-h-[44px] w-full rounded-xl text-base sm:text-sm"
                                            value={data.cni}
                                            onChange={(e) =>
                                                setData('cni', e.target.value)
                                            }
                                            placeholder="Numéro de CNI"
                                        />
                                    </Champ>
                                </div>
                            </section>

                            {/* Localisation */}
                            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
                                <TitreSection
                                    titre="Localisation administrative"
                                    description="Sélectionnez successivement la province, la commune, la zone et la colline."
                                />

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                    <div>
                                        <InputLabel
                                            htmlFor="province"
                                            value="Province *"
                                        />

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
                                            <option value="">
                                                — Sélectionner une province —
                                            </option>

                                            {provinces.map((p) => (
                                                <option
                                                    key={p.id}
                                                    value={p.id}
                                                >
                                                    {p.nom}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <InputLabel
                                            htmlFor="commune"
                                            value="Commune *"
                                        />

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
                                            <option value="">
                                                — Sélectionner une commune —
                                            </option>

                                            {communesFiltrees.map((c) => (
                                                <option
                                                    key={c.id}
                                                    value={c.id}
                                                >
                                                    {c.nom}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <InputLabel
                                            htmlFor="zone"
                                            value="Zone *"
                                        />

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
                                            <option value="">
                                                — Sélectionner une zone —
                                            </option>

                                            {zonesFiltrees.map((z) => (
                                                <option
                                                    key={z.id}
                                                    value={z.id}
                                                >
                                                    {z.nom}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <InputLabel
                                            htmlFor="colline_id"
                                            value="Colline *"
                                        />

                                        <select
                                            id="colline_id"
                                            className={classeSelect}
                                            value={data.colline_id}
                                            disabled={!zoneId}
                                            onChange={(e) =>
                                                setData(
                                                    'colline_id',
                                                    e.target.value,
                                                )
                                            }
                                            required
                                        >
                                            <option value="">
                                                — Sélectionner une colline —
                                            </option>

                                            {collinesFiltrees.map((c) => (
                                                <option
                                                    key={c.id}
                                                    value={c.id}
                                                >
                                                    {c.nom}
                                                </option>
                                            ))}
                                        </select>

                                        <InputError
                                            message={errors.colline_id}
                                            className="mt-2"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Affectation */}
                            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
                                <TitreSection
                                    titre="Affectation"
                                    description="Vous pouvez affecter un enquêteur au nouveau ménage."
                                />

                                <div className="max-w-xl">
                                    <InputLabel
                                        htmlFor="enqueteur_id"
                                        value="Enquêteur assigné (optionnel)"
                                    />

                                    <select
                                        id="enqueteur_id"
                                        className={classeSelect}
                                        value={data.enqueteur_id}
                                        onChange={(e) =>
                                            setData(
                                                'enqueteur_id',
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="">
                                            — Aucun enquêteur —
                                        </option>

                                        {enqueteurs.map((u) => (
                                            <option
                                                key={u.id}
                                                value={u.id}
                                            >
                                                {u.name}
                                            </option>
                                        ))}
                                    </select>

                                    <InputError
                                        message={errors.enqueteur_id}
                                        className="mt-2"
                                    />
                                </div>
                            </section>

                            {/* Actions */}
                            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                                <Link
                                    href={route('menages.show', menage.id)}
                                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-600 transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 active:scale-[0.98]"
                                >
                                    Annuler
                                </Link>

                                <PrimaryButton
                                    type="submit"
                                    disabled={processing}
                                    className="min-h-[44px] w-full justify-center rounded-xl shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 sm:w-auto"
                                >
                                    {processing
                                        ? 'Création en cours...'
                                        : 'Affecter à cette colline'}
                                </PrimaryButton>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
