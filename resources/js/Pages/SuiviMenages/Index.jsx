import FiltresTerritoriaux from '@/Components/FiltresTerritoriaux';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';

const LIBELLES_STATUT = {
    termine: {
        texte: 'Terminé',
        classe: 'bg-green-100 text-green-700',
    },
    en_attente: {
        texte: 'En attente',
        classe: 'bg-amber-100 text-amber-700',
    },
    a_faire: {
        texte: 'À faire',
        classe: 'bg-gray-100 text-gray-600',
    },
    deja_commence: {
        texte: 'Déjà commencé',
        classe: 'bg-blue-100 text-blue-700',
    },
};

const STATUT_PAR_DEFAUT = {
    texte: 'Non défini',
    classe: 'bg-gray-100 text-gray-600',
};

function CarteCompteur({ titre, valeur, accent }) {
    return (
        <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{titre}</p>
            <p
                className={`mt-1 text-2xl font-semibold ${
                    accent ?? 'text-gray-900'
                }`}
            >
                {valeur ?? 0}
            </p>
        </div>
    );
}

export default function Index({
    menages,
    filtres,
    compteurs,
    provinces,
    communes,
    zones,
    collines,
}) {
    const appliquer = (nouveauxFiltres) => {
        router.get(
            route('suivi-menages.index'),
            nouveauxFiltres,
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const classeSelect =
        'rounded-md border-gray-300 text-sm shadow-sm focus:border-burundi-vert focus:ring-burundi-vert';

    const listeMenages = menages?.data ?? [];
    const liensPagination = menages?.links ?? [];

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Suivi des ménages
                </h2>
            }
        >
            <Head title="Suivi des ménages" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {/* Compteurs */}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <CarteCompteur
                            titre="Pré-enregistrés"
                            valeur={compteurs?.pre_enregistres}
                        />

                        <CarteCompteur
                            titre="Nouveaux (terrain)"
                            valeur={compteurs?.nouveaux_terrain}
                            accent="text-burundi-vert"
                        />

                        <CarteCompteur
                            titre="Ont répondu au questionnaire"
                            valeur={compteurs?.avec_reponse}
                            accent="text-burundi-vert"
                        />

                        <CarteCompteur
                            titre="N'ont pas encore répondu"
                            valeur={compteurs?.sans_reponse}
                            accent="text-burundi-rouge"
                        />
                    </div>

                    {/* Filtres */}
                    <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap gap-4">
                            {/* Origine */}
                            <select
                                className={classeSelect}
                                value={filtres?.source ?? ''}
                                onChange={(e) =>
                                    appliquer({
                                        ...filtres,
                                        source: e.target.value || undefined,
                                    })
                                }
                            >
                                <option value="">Toutes origines</option>
                                <option value="pre_enregistre">
                                    Pré-enregistrés
                                </option>
                                <option value="terrain">
                                    Nouveaux (terrain)
                                </option>
                            </select>

                            {/* Questionnaire */}
                            <select
                                className={classeSelect}
                                value={filtres?.a_repondu ?? ''}
                                onChange={(e) =>
                                    appliquer({
                                        ...filtres,
                                        a_repondu:
                                            e.target.value || undefined,
                                    })
                                }
                            >
                                <option value="">
                                    Questionnaire : tous
                                </option>
                                <option value="oui">A répondu</option>
                                <option value="non">
                                    N'a pas répondu
                                </option>
                            </select>

                            {/* Statut */}
                            <select
                                className={classeSelect}
                                value={filtres?.statut ?? ''}
                                onChange={(e) =>
                                    appliquer({
                                        ...filtres,
                                        statut: e.target.value || undefined,
                                    })
                                }
                            >
                                <option value="">Tous les statuts</option>
                                <option value="a_faire">À faire</option>
                                <option value="en_attente">
                                    En attente
                                </option>
                                <option value="deja_commence">
                                    Déjà commencé
                                </option>
                                <option value="termine">Terminé</option>
                            </select>
                        </div>

                        {/* Filtres territoriaux */}
                        <div className="flex flex-wrap gap-4">
                            <FiltresTerritoriaux
                                valeurs={filtres ?? {}}
                                onChange={appliquer}
                                provinces={provinces ?? []}
                                communes={communes ?? []}
                                zones={zones ?? []}
                                collines={collines ?? []}
                            />
                        </div>
                    </div>

                    {/* Exports et tableau */}
                    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
                            <p className="text-sm text-gray-600">
                                {menages?.total ?? 0} ménage(s)
                            </p>

                            <div className="flex flex-wrap items-center gap-4">
                                <a
                                    href={route(
                                        'suivi-menages.xlsx',
                                        filtres,
                                    )}
                                    className="text-sm text-burundi-vert hover:underline"
                                >
                                    Export Excel (.xlsx)
                                </a>

                                <a
                                    href={route(
                                        'suivi-menages.csv',
                                        filtres,
                                    )}
                                    className="text-sm text-gray-500 hover:underline"
                                >
                                    Export CSV
                                </a>

                                <a
                                    href={route(
                                        'suivi-menages.pdf',
                                        filtres,
                                    )}
                                    className="text-sm text-burundi-vert hover:underline"
                                >
                                    Export PDF
                                </a>

                                <a
                                    href={route(
                                        'suivi-menages.geojson',
                                        filtres,
                                    )}
                                    className="text-sm text-burundi-vert hover:underline"
                                >
                                    Export GeoJSON
                                </a>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-t bg-gray-50 text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="px-6 py-3">Code</th>
                                        <th className="px-6 py-3">Origine</th>
                                        <th className="px-6 py-3">
                                            Questionnaire
                                        </th>
                                        <th className="px-6 py-3">
                                            Chef de ménage
                                        </th>
                                        <th className="px-6 py-3">
                                            Localisation
                                        </th>
                                        <th className="px-6 py-3">Statut</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y">
                                    {listeMenages.map((menage) => {
                                        // Évite l'erreur si le statut est inconnu
                                        // ou si sa valeur est null.
                                        const statut =
                                            LIBELLES_STATUT[menage.statut] ??
                                            STATUT_PAR_DEFAUT;

                                        const chefMenage = [
                                            menage.prenom_chef_menage,
                                            menage.nom_chef_menage,
                                        ]
                                            .filter(Boolean)
                                            .join(' ');

                                        const localisation = [
                                            menage.colline?.nom,
                                            menage.colline?.zone?.nom,
                                            menage.colline?.zone?.commune?.nom,
                                        ]
                                            .filter(Boolean)
                                            .join(', ');

                                        return (
                                            <tr
                                                key={menage.id}
                                                className="cursor-pointer hover:bg-gray-50"
                                                onClick={() =>
                                                    router.visit(
                                                        route(
                                                            'menages.show',
                                                            menage.id,
                                                        ),
                                                    )
                                                }
                                            >
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    {menage.code_menage ?? '—'}
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                                                            menage.source ===
                                                            'terrain'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-gray-100 text-gray-600'
                                                        }`}
                                                    >
                                                        {menage.source ===
                                                        'terrain'
                                                            ? 'Nouveau'
                                                            : 'Pré-enregistré'}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    {Number(
                                                        menage.reponses_count ??
                                                            0,
                                                    ) > 0 ? (
                                                        <span className="font-medium text-burundi-vert">
                                                            Oui
                                                        </span>
                                                    ) : (
                                                        <span className="font-medium text-burundi-rouge">
                                                            Non
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-6 py-4 text-gray-600">
                                                    {chefMenage || '—'}
                                                </td>

                                                <td className="px-6 py-4 text-gray-600">
                                                    {localisation || '—'}
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`rounded-full px-2 py-1 text-xs font-medium ${statut.classe}`}
                                                    >
                                                        {statut.texte}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {listeMenages.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-6 py-8 text-center text-gray-400"
                                            >
                                                Aucun ménage ne correspond aux
                                                critères.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {liensPagination.length > 3 && (
                            <div className="flex flex-wrap gap-1 border-t p-4">
                                {liensPagination.map((lien, index) => (
                                    <Link
                                        key={`${index}-${lien.label}`}
                                        href={lien.url ?? '#'}
                                        preserveScroll
                                        className={`rounded px-3 py-1 text-sm ${
                                            lien.active
                                                ? 'bg-burundi-vert text-white'
                                                : 'text-gray-600 hover:bg-gray-100'
                                        } ${
                                            !lien.url
                                                ? 'pointer-events-none opacity-50'
                                                : ''
                                        }`}
                                        dangerouslySetInnerHTML={{
                                            __html: lien.label,
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
