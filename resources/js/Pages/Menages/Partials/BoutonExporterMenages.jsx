import { useState } from 'react';

/**
 * Bouton d'export Excel des ménages, avec filtrage optionnel par
 * intervalle de dates d'enregistrement en plus des filtres actifs de la
 * page.
 *
 * Usage dans Menages/Index.jsx :
 *
 *   import BoutonExporterMenages from './Partials/BoutonExporterMenages';
 *   ...
 *   <BoutonExporterMenages filtres={{ statut, colline_id, enqueteur_id, q: recherche }} />
 *
 * `filtres` est optionnel : passez les filtres actuellement appliqués à la
 * liste (mêmes noms que côté contrôleur) pour que le fichier exporté
 * corresponde à ce que l'utilisateur voit à l'écran. L'intervalle de dates
 * se choisit dans le petit panneau qui s'ouvre au clic.
 */
export default function BoutonExporterMenages({ filtres = {}, className = '' }) {
    const [ouvert, setOuvert] = useState(false);
    const [dateDebut, setDateDebut] = useState('');
    const [dateFin, setDateFin] = useState('');

    const lancerExport = () => {
        const parametres = Object.fromEntries(
            Object.entries({ ...filtres, date_debut: dateDebut, date_fin: dateFin }).filter(
                ([, valeur]) => valeur !== undefined && valeur !== null && valeur !== '',
            ),
        );

        window.location.href = route('menages.export', parametres);
        setOuvert(false);
    };

    return (
        <div className={`relative inline-block ${className}`}>
            <button
                type="button"
                onClick={() => setOuvert((v) => !v)}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Exporter en Excel
            </button>

            {ouvert && (
                <div className="absolute right-0 z-40 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                    <p className="text-sm font-medium text-gray-700">Intervalle de dates (optionnel)</p>
                    <p className="mt-1 text-xs text-gray-500">
                        Limite l'export aux ménages enregistrés dans cette période. Laissez vide
                        pour tout exporter.
                    </p>

                    <div className="mt-3 space-y-2">
                        <div>
                            <label className="text-xs text-gray-500">Du</label>
                            <input
                                type="date"
                                value={dateDebut}
                                onChange={(e) => setDateDebut(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Au</label>
                            <input
                                type="date"
                                value={dateFin}
                                min={dateDebut || undefined}
                                onChange={(e) => setDateFin(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setOuvert(false)}
                            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                        >
                            Annuler
                        </button>
                        <button
                            type="button"
                            onClick={lancerExport}
                            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                            Exporter
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
