import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

// ============================================================
// COULEURS DES STATUTS
// ============================================================

const COULEURS_STATUT = {
    termine: '#16a34a',
    en_attente: '#f59e0b',
    a_faire: '#9ca3af',
};

// ============================================================
// SECURITE : ECHAPPER LE HTML DES POPUPS LEAFLET
// ============================================================

function echapperHtml(valeur) {
    return String(valeur ?? '').replace(/[&<>"']/g, (caractere) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    })[caractere]);
}

// ============================================================
// RECUPERATION DES SUPERVISEURS
// ============================================================

function recupererNomsSuperviseurs(point) {
    let noms = [];

    if (Array.isArray(point.noms_superviseurs)) {
        noms = point.noms_superviseurs;
    } else if (point.noms_superviseurs) {
        noms = [point.noms_superviseurs];
    }

    if (noms.length === 0 && point.nom_superviseur) {
        noms = String(point.nom_superviseur).split(',');
    }

    return [...new Set(
        noms
            .map((nom) => String(nom ?? '').trim())
            .filter(Boolean)
    )].join(', ') || 'Non renseigné';
}

// ============================================================
// CARTE LEAFLET DU BURUNDI
// ============================================================

export default function CarteBurundi({ points = [] }) {
    const conteneurRef = useRef(null);
    const carteRef = useRef(null);
    const coucheMarqueursRef = useRef(null);
    const couchePolygonesRef = useRef(null);

    // Initialisation de Leaflet une seule fois.
    useEffect(() => {
        let annule = false;
        let minuteur = null;

        import('leaflet')
            .then((L) => {
                if (annule || !conteneurRef.current) return;

                if (!carteRef.current) {
                    const carte = L.map(conteneurRef.current, {
                        zoomControl: true,
                        scrollWheelZoom: true,
                        preferCanvas: true,
                    }).setView([-3.373, 29.918], 8);

                    carteRef.current = carte;

                    L.tileLayer(
                        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        {
                            attribution: '&copy; OpenStreetMap',
                            maxZoom: 18,
                        },
                    ).addTo(carte);

                    coucheMarqueursRef.current =
                        L.layerGroup().addTo(carte);

                    couchePolygonesRef.current =
                        L.layerGroup().addTo(carte);
                }

                afficherPoints(L, Array.isArray(points) ? points : []);

                minuteur = setTimeout(() => {
                    if (!annule && carteRef.current) {
                        carteRef.current.invalidateSize();
                    }
                }, 150);
            })
            .catch((erreur) => {
                console.error(
                    'Erreur lors du chargement de Leaflet :',
                    erreur,
                );
            });

        return () => {
            annule = true;

            if (minuteur) {
                clearTimeout(minuteur);
            }
        };
    }, []);

    // Mise à jour des points lorsque les données changent.
    useEffect(() => {
        let annule = false;

        import('leaflet')
            .then((L) => {
                if (annule || !carteRef.current) return;

                afficherPoints(
                    L,
                    Array.isArray(points) ? points : [],
                );
            })
            .catch((erreur) => {
                console.error(
                    'Erreur de mise à jour de la carte :',
                    erreur,
                );
            });

        return () => {
            annule = true;
        };
    }, [points]);

    // ========================================================
    // AFFICHAGE DES POINTS ET DES POLYGONES
    // ========================================================

    function afficherPoints(L, donnees) {
        if (
            !carteRef.current ||
            !coucheMarqueursRef.current ||
            !couchePolygonesRef.current
        ) {
            return;
        }

        coucheMarqueursRef.current.clearLayers();
        couchePolygonesRef.current.clearLayers();

        const toutesLesCoordonnees = [];

        // Altitudes min/max (boucle : évite Math.min(...tableau) sur de gros volumes).
        let altitudeMin = null;
        let altitudeMax = null;

        for (const point of donnees) {
            if (
                point.altitude === null ||
                point.altitude === undefined ||
                point.altitude === ''
            ) {
                continue;
            }

            const altitude = Number(point.altitude);

            if (!Number.isFinite(altitude)) continue;

            if (altitudeMin === null || altitude < altitudeMin) {
                altitudeMin = altitude;
            }

            if (altitudeMax === null || altitude > altitudeMax) {
                altitudeMax = altitude;
            }
        }

        // Taille du marqueur selon l'altitude.
        const rayonPourAltitude = (altitude) => {
            const valeur = Number(altitude);

            if (
                altitude === null ||
                altitude === undefined ||
                altitude === '' ||
                !Number.isFinite(valeur) ||
                altitudeMin === null ||
                altitudeMax === null ||
                altitudeMax === altitudeMin
            ) {
                return 5;
            }

            const ratio =
                (valeur - altitudeMin) /
                (altitudeMax - altitudeMin);

            return 5 + ratio * 7;
        };

        donnees.forEach((point) => {
            const couleur =
                COULEURS_STATUT[point.statut_menage] ?? '#CE1126';

            // Altitude.
            const altitude = Number(point.altitude);

            const altitudeTexte =
                point.altitude !== null &&
                point.altitude !== undefined &&
                point.altitude !== '' &&
                Number.isFinite(altitude)
                    ? `${altitude.toFixed(0)} m`
                    : '—';

            // Superficie.
            const superficie = Number(point.superficie_ha);

            const superficieTexte =
                point.superficie_ha !== null &&
                point.superficie_ha !== undefined &&
                point.superficie_ha !== '' &&
                Number.isFinite(superficie)
                    ? `${superficie.toLocaleString('fr-FR', {
                          maximumFractionDigits: 2,
                      })} ha`
                    : '—';

            // Superviseur communal.
            const nomSuperviseur =
                recupererNomsSuperviseurs(point);

            // Enquêteur.
            const nomEnqueteur =
                String(point.nom_enqueteur ?? '').trim() ||
                'Non renseigné';

            // ====================================================
            // POPUP DE LA PARCELLE
            // ====================================================

            const popup = `
                <div style="min-width:190px;">

                    <strong style="font-size:14px;color:#0d4a2a;">
                        ${echapperHtml(point.code_menage ?? 'Ménage')}
                    </strong>

                    <br>

                    <span>
                        ${echapperHtml(point.nom_chef_menage ?? '')}
                    </span>

                    <hr style="margin:6px 0;border:0;border-top:1px solid #e5e7eb;">

                    <div style="margin-bottom:5px;">
                        <strong style="color:#166534;">
                            Superviseur communal :
                        </strong>
                        <br>
                        ${echapperHtml(nomSuperviseur)}
                    </div>

                    <div style="margin-bottom:7px;">
                        <strong style="color:#166534;">
                            Enquêteur :
                        </strong>
                        <br>
                        ${echapperHtml(nomEnqueteur)}
                    </div>

                    <hr style="margin:6px 0;border:0;border-top:1px solid #e5e7eb;">

                    <strong>
                        ${echapperHtml(point.nombre_pieds ?? '—')}
                    </strong>
                    pieds de café

                    <br>

                    Superficie :
                    ${echapperHtml(superficieTexte)}

                    <br>

                    État :
                    ${echapperHtml(point.etat_verger ?? '—')}

                    <br>

                    Type :
                    ${echapperHtml(point.type ?? '—')}

                    <br>

                    Altitude :
                    ${echapperHtml(altitudeTexte)}

                </div>
            `;

            // ====================================================
            // POLYGONES DES PARCELLES
            // ====================================================

            if (
                Array.isArray(point.polygone) &&
                point.polygone.length >= 3
            ) {
                const coordinates = point.polygone
                    .map((coord) => {
                        if (
                            Array.isArray(coord) &&
                            coord.length >= 2
                        ) {
                            return [
                                Number(coord[0]),
                                Number(coord[1]),
                            ];
                        }

                        if (
                            coord &&
                            coord.latitude != null &&
                            coord.longitude != null
                        ) {
                            return [
                                Number(coord.latitude),
                                Number(coord.longitude),
                            ];
                        }

                        return null;
                    })
                    .filter((coord) => {
                        return (
                            coord &&
                            Number.isFinite(coord[0]) &&
                            Number.isFinite(coord[1]) &&
                            Math.abs(coord[0]) <= 90 &&
                            Math.abs(coord[1]) <= 180
                        );
                    });

                if (coordinates.length >= 3) {
                    const polygone = L.polygon(coordinates, {
                        color: couleur,
                        fillColor: couleur,
                        fillOpacity: 0.25,
                        weight: 2,
                    }).bindPopup(popup);

                    if (
                        point.superficie_ha !== null &&
                        point.superficie_ha !== undefined &&
                        point.superficie_ha !== '' &&
                        Number.isFinite(superficie)
                    ) {
                        polygone.bindTooltip(
                            `${superficie.toLocaleString('fr-FR', {
                                maximumFractionDigits: 2,
                            })} ha`,
                            {
                                permanent: true,
                                direction: 'center',
                                className: 'etiquette-superficie',
                            },
                        );
                    }

                    polygone.addTo(couchePolygonesRef.current);

                    toutesLesCoordonnees.push(...coordinates);
                }
            }

            // ====================================================
            // POINTS GPS
            // ====================================================

            if (
                point.latitude !== null &&
                point.latitude !== undefined &&
                point.longitude !== null &&
                point.longitude !== undefined
            ) {
                const latitude = Number(point.latitude);
                const longitude = Number(point.longitude);

                if (
                    Number.isFinite(latitude) &&
                    Number.isFinite(longitude) &&
                    Math.abs(latitude) <= 90 &&
                    Math.abs(longitude) <= 180
                ) {
                    L.circleMarker(
                        [latitude, longitude],
                        {
                            radius: rayonPourAltitude(point.altitude),
                            color: couleur,
                            fillColor: couleur,
                            fillOpacity: 0.8,
                            weight: 1,
                        },
                    )
                        .bindPopup(popup)
                        .addTo(coucheMarqueursRef.current);

                    toutesLesCoordonnees.push([
                        latitude,
                        longitude,
                    ]);
                }
            }
        });

        // ====================================================
        // ADAPTATION AUTOMATIQUE DU ZOOM
        // ====================================================

        if (toutesLesCoordonnees.length > 0) {
            const bornes = L.latLngBounds(toutesLesCoordonnees);

            carteRef.current.fitBounds(bornes, {
                padding: [30, 30],
                maxZoom: 15,
            });
        } else {
            carteRef.current.setView([-3.373, 29.918], 8);
        }

        carteRef.current.invalidateSize();
    }

    // ========================================================
    // REDIMENSIONNEMENT
    // ========================================================

    useEffect(() => {
        const redimensionner = () => {
            carteRef.current?.invalidateSize();
        };

        window.addEventListener('resize', redimensionner);

        return () => {
            window.removeEventListener('resize', redimensionner);
        };
    }, []);

    // ========================================================
    // NETTOYAGE DE LA CARTE
    // ========================================================

    useEffect(() => {
        return () => {
            carteRef.current?.remove();

            carteRef.current = null;
            coucheMarqueursRef.current = null;
            couchePolygonesRef.current = null;
        };
    }, []);

    return (
        <>
            <style>{`
                .etiquette-superficie {
                    background: rgba(255, 255, 255, 0.92);
                    border: none;
                    border-radius: 6px;
                    box-shadow: 0 2px 6px rgba(7, 48, 26, 0.25);
                    font-size: 11px;
                    font-weight: 600;
                    color: #0d4a2a;
                    padding: 1px 6px;
                }

                .etiquette-superficie::before {
                    display: none;
                }

                .leaflet-container {
                    z-index: 0;
                    font-family: inherit;
                }

                .dash-carte .leaflet-popup-content-wrapper {
                    border-radius: 14px;
                    box-shadow: 0 12px 28px -8px rgba(7, 48, 26, 0.45);
                    border-top: 3px solid #18b637;
                }

                .dash-carte .leaflet-popup-content {
                    font-size: 12.5px;
                    line-height: 1.55;
                    color: #1f2937;
                }

                .dash-carte .leaflet-control-zoom a {
                    color: #0d4a2a;
                }

                @media (max-width: 640px) {
                    .leaflet-control-zoom {
                        transform: scale(0.9);
                        transform-origin: top left;
                    }
                }
            `}</style>

            <div
                ref={conteneurRef}
                className="dash-carte z-0 h-[350px] w-full overflow-hidden rounded-xl sm:h-[420px] md:h-[480px] lg:h-[600px]"
            />
        </>
    );
}