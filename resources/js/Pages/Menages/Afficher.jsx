import PrimaryButton from '@/Components/PrimaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';

const LIBELLES_STATUT = {
    termine: { texte: 'Terminé', classe: 'bg-green-100 text-green-700' },
    en_attente: { texte: 'En attente', classe: 'bg-amber-100 text-amber-700' },
    a_faire: { texte: 'À faire', classe: 'bg-gray-100 text-gray-600' },
};

function Ligne({ libelle, valeur }) {
    return (
        <div className="flex justify-between border-b py-2 text-sm">
            <span className="text-gray-500">{libelle}</span>
            <span className="font-medium text-gray-900">{valeur ?? '—'}</span>
        </div>
    );
}

export default function Afficher({ menage, peutModifier }) {
    const { flash } = usePage().props;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        Ménage {menage.code_menage}
                    </h2>
                    {peutModifier && (
                        <Link href={route('menages.edit', menage.id)}>
                            <PrimaryButton>Modifier</PrimaryButton>
                        </Link>
                    )}
                </div>
            }
        >
            <Head title={`Ménage ${menage.code_menage}`} />

            <div className="py-12">
                <div className="mx-auto grid max-w-5xl gap-6 sm:px-6 md:grid-cols-2 lg:px-8">
                    {flash?.succes && (
                        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700 md:col-span-2">
                            {flash.succes}
                        </div>
                    )}

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">
                            Informations générales
                        </h3>
                        <Ligne
                            libelle="Chef de ménage"
                            valeur={[menage.prenom_chef_menage, menage.nom_chef_menage].filter(Boolean).join(' ')}
                        />
                        <Ligne libelle="Téléphone" valeur={menage.telephone} />
                        <Ligne
                            libelle="Localisation"
                            valeur={`${menage.colline?.nom}, ${menage.colline?.zone?.nom}, ${menage.colline?.zone?.commune?.nom}, ${menage.colline?.zone?.commune?.province?.nom}`}
                        />
                        <Ligne libelle="Enquêteur assigné" valeur={menage.enqueteur?.name} />
                        <div className="flex justify-between py-2 text-sm">
                            <span className="text-gray-500">Statut</span>
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${LIBELLES_STATUT[menage.statut].classe}`}>
                                {LIBELLES_STATUT[menage.statut].texte}
                            </span>
                        </div>
                    </div>

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">
                            Parcelles ({menage.parcelles.length})
                        </h3>
                        {menage.parcelles.length === 0 && (
                            <p className="text-sm text-gray-400">Aucune parcelle géolocalisée pour l'instant.</p>
                        )}
                        {menage.parcelles.map((parcelle) => (
                            <div key={parcelle.id} className="border-b py-2 text-sm last:border-0">
                                <p className="font-medium text-gray-900">
                                    {parcelle.nombre_pieds ?? '—'} pieds de café
                                </p>
                                <p className="text-gray-500">
                                    {parcelle.etat_verger ?? 'État non renseigné'}
                                    {parcelle.latitude && (
                                        <> — {parcelle.latitude}, {parcelle.longitude}</>
                                    )}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
