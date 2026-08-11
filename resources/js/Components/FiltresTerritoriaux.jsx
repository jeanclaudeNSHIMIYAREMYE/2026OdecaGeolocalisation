import { useMemo } from 'react';

export default function FiltresTerritoriaux({
    valeurs,
    onChange,
    provinces,
    communes,
    zones,
    collines,
}) {
    const communesFiltrees = useMemo(
        () => communes.filter((c) => !valeurs.province_id || c.province_id === Number(valeurs.province_id)),
        [communes, valeurs.province_id],
    );

    const zonesFiltrees = useMemo(
        () => zones.filter((z) => !valeurs.commune_id || z.commune_id === Number(valeurs.commune_id)),
        [zones, valeurs.commune_id],
    );

    const collinesFiltrees = useMemo(
        () => collines.filter((c) => !valeurs.zone_id || c.zone_id === Number(valeurs.zone_id)),
        [collines, valeurs.zone_id],
    );

    const changer = (cle, valeur) => {
        const suivant = { ...valeurs, [cle]: valeur || undefined };

        if (cle === 'province_id') {
            delete suivant.commune_id;
            delete suivant.zone_id;
            delete suivant.colline_id;
        } else if (cle === 'commune_id') {
            delete suivant.zone_id;
            delete suivant.colline_id;
        } else if (cle === 'zone_id') {
            delete suivant.colline_id;
        }

        onChange(suivant);
    };

    const classeSelect = 'rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500';

    return (
        <>
            <select className={classeSelect} value={valeurs.province_id ?? ''} onChange={(e) => changer('province_id', e.target.value)}>
                <option value="">Toutes les provinces</option>
                {provinces.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>

            <select className={classeSelect} value={valeurs.commune_id ?? ''} onChange={(e) => changer('commune_id', e.target.value)} disabled={!valeurs.province_id}>
                <option value="">Toutes les communes</option>
                {communesFiltrees.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>

            <select className={classeSelect} value={valeurs.zone_id ?? ''} onChange={(e) => changer('zone_id', e.target.value)} disabled={!valeurs.commune_id}>
                <option value="">Toutes les zones</option>
                {zonesFiltrees.map((z) => <option key={z.id} value={z.id}>{z.nom}</option>)}
            </select>

            <select className={classeSelect} value={valeurs.colline_id ?? ''} onChange={(e) => changer('colline_id', e.target.value)} disabled={!valeurs.zone_id}>
                <option value="">Toutes les collines</option>
                {collinesFiltrees.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
        </>
    );
}
