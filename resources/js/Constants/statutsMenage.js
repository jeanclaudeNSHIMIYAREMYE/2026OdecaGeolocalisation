export const STATUTS_MENAGE = {
    a_faire: {
        texte: 'À faire',
        classe: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
        point: 'bg-gray-400',
        couleur: '#9ca3af',
    },
    en_attente: {
        texte: 'En attente',
        classe: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
        point: 'bg-amber-500',
        couleur: '#f59e0b',
    },
    termine: {
        texte: 'Terminé',
        classe: 'bg-green-50 text-green-700 ring-1 ring-green-200',
        point: 'bg-green-500',
        couleur: '#16a34a',
    },
};

export const STATUT_MENAGE_PAR_DEFAUT = {
    texte: 'Non défini',
    classe: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
    point: 'bg-gray-400',
    couleur: '#9ca3af',
};

export function normaliserStatutMenage(statut) {
    if (statut === 'deja_commence') {
        return 'en_attente';
    }

    return statut && Object.hasOwn(STATUTS_MENAGE, statut)
        ? statut
        : null;
}

export function detailsStatutMenage(statut) {
    const statutNormalise = normaliserStatutMenage(statut);

    return STATUTS_MENAGE[statutNormalise] ?? STATUT_MENAGE_PAR_DEFAUT;
}
