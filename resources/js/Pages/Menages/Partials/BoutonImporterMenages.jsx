import { useForm, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';

/**
 * Bouton d'import Excel des ménages.
 *
 * Usage dans Menages/Index.jsx, à côté du bouton d'export :
 *
 *   import BoutonImporterMenages from './Partials/BoutonImporterMenages';
 *   ...
 *   <BoutonImporterMenages />
 *
 * Le fichier doit respecter les mêmes en-têtes que l'export :
 * Code cafeiculteur | Entite Type | Nom et Prénom / Association | CNI |
 * Téléphone | Province | Commune | Zone | Colline.
 *
 * Comportement (voir MenageImportController) :
 *  - un ménage déjà existant (même code) n'est jamais modifié ni recréé ;
 *  - CNI/Téléphone manquants sont complétés automatiquement ("-" / "0") ;
 *  - une ligne dont la colline ne correspond à rien en base est ignorée et
 *    listée dans le rapport d'erreurs plutôt que de bloquer tout l'import.
 */
export default function BoutonImporterMenages() {
    const [ouvert, setOuvert] = useState(false);
    const inputFichier = useRef(null);
    const { flash } = usePage().props;

    const { data, setData, post, processing, progress, errors, reset } = useForm({
        fichier: null,
    });

    const soumettre = (e) => {
        e.preventDefault();
        post(route('menages.import'), {
            forceFormData: true,
            onSuccess: () => {
                reset('fichier');
                if (inputFichier.current) inputFichier.current.value = '';
            },
        });
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOuvert(true)}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 7.5 12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                Importer un fichier Excel
            </button>

            {ouvert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-800">Importer des ménages</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Le fichier doit avoir les colonnes : Code cafeiculteur, Entite Type,
                            Nom et Prénom / Association, CNI, Téléphone, Province, Commune,
                            Zone, Colline. Les ménages déjà existants (même code) ne seront
                            jamais modifiés.
                        </p>

                        <form onSubmit={soumettre} className="mt-4 space-y-4">
                            <input
                                ref={inputFichier}
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={(e) => setData('fichier', e.target.files[0])}
                                className="block w-full rounded-md border border-gray-300 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                            {errors.fichier && <p className="text-sm text-red-600">{errors.fichier}</p>}

                            {progress && (
                                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                    <div
                                        className="h-2 rounded-full bg-indigo-600 transition-all"
                                        style={{ width: `${progress.percentage}%` }}
                                    />
                                </div>
                            )}

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setOuvert(false)}
                                    className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || !data.fichier}
                                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {processing ? 'Import en cours...' : 'Importer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {flash?.importResume && <RapportImport resume={flash.importResume} />}
        </>
    );
}

function RapportImport({ resume }) {
    return (
        <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm">
            <p className="font-medium text-gray-800">Résultat du dernier import</p>
            <ul className="mt-2 space-y-1 text-gray-600">
                <li>✅ {resume.importes} ménage(s) importé(s)</li>
                <li>⏭️ {resume.ignores_existants} déjà existant(s), ignoré(s) sans modification</li>
                {resume.total_erreurs > 0 && (
                    <li className="text-amber-700">
                        ⚠️ {resume.total_erreurs} ligne(s) ignorée(s) (colline introuvable ou code manquant)
                    </li>
                )}
            </ul>

            {resume.erreurs?.length > 0 && (
                <details className="mt-2">
                    <summary className="cursor-pointer text-indigo-600">
                        Voir le détail ({resume.erreurs.length} affichée(s){resume.total_erreurs > resume.erreurs.length ? ` sur ${resume.total_erreurs}` : ''})
                    </summary>
                    <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-gray-500">
                        {resume.erreurs.map((erreur, index) => (
                            <li key={index}>{erreur}</li>
                        ))}
                    </ul>
                </details>
            )}
        </div>
    );
}
