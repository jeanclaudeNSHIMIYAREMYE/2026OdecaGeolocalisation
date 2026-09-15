<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Rapport de géolocalisation</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #1f2937; }
        h1 { font-size: 18px; margin-bottom: 2px; color: #CE1126; }
        p.meta { color: #6b7280; margin-top: 0; margin-bottom: 10px; }
        .bandeau { display: flex; height: 6px; margin-bottom: 20px; }
        .bandeau div { flex: 1; }
        .kpi { display: inline-block; width: 23%; margin-right: 1%; padding: 10px; border: 1px solid #e5e7eb; border-radius: 4px; text-align: center; }
        .kpi .valeur { font-size: 18px; font-weight: bold; color: #1EB53A; }
        .kpi .libelle { font-size: 8px; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #e5e7eb; padding: 3px 5px; text-align: left; }
        th { background-color: #f3f4f6; font-size: 8px; }
    </style>
</head>
<body>
    <div class="bandeau">
        <div style="background:#CE1126"></div>
        <div style="background:#FFFFFF"></div>
        <div style="background:#1EB53A"></div>
    </div>

    <h1>Rapport national de géolocalisation des plantations de caféiers</h1>
    <p class="meta">LNC Burundi — Généré le {{ $genereLe }}</p>

    <div>
        <div class="kpi">
            <div class="valeur">{{ $parcelles->count() }}</div>
            <div class="libelle">Parcelles géolocalisées</div>
        </div>
        <div class="kpi">
            <div class="valeur">{{ $totalMenages }}</div>
            <div class="libelle">Ménages concernés</div>
        </div>
        <div class="kpi">
            <div class="valeur">{{ number_format($totalPieds, 0, ',', ' ') }}</div>
            <div class="libelle">Pieds de café recensés</div>
        </div>
        <div class="kpi">
            <div class="valeur">{{ $parcelles->pluck('menage.colline.zone.commune.province.nom')->unique()->count() }}</div>
            <div class="libelle">Provinces couvertes</div>
        </div>
        <div class="kpi">
            <div class="valeur">{{ number_format($totalSuperficieHa, 2, ',', ' ') }} ha</div>
            <div class="libelle">Superficie totale (ha)</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Code ménage</th>
                <th>Chef de ménage</th>
                <th>Province</th>
                <th>Commune</th>
                <th>Zone</th>
                <th>Colline</th>
                <th>Enquêteur</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Altitude</th>
                <th>Pieds</th>
                <th>Superficie</th>
                <th>État verger</th>
                <th>Type</th>
                <th>Date géoloc.</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($parcelles as $parcelle)
                @php $menage = $parcelle->menage; @endphp
                <tr>
                    <td>{{ $menage->code_menage }}</td>
                    <td>{{ trim($menage->prenom_chef_menage . ' ' . $menage->nom_chef_menage) ?: '—' }}</td>
                    <td>{{ $menage->colline?->zone?->commune?->province?->nom }}</td>
                    <td>{{ $menage->colline?->zone?->commune?->nom }}</td>
                    <td>{{ $menage->colline?->zone?->nom }}</td>
                    <td>{{ $menage->colline?->nom }}</td>
                    <td>{{ $menage->enqueteur?->name ?? '—' }}</td>
                    <td>{{ $parcelle->latitude }}</td>
                    <td>{{ $parcelle->longitude }}</td>
                    <td>{{ $parcelle->altitude !== null ? $parcelle->altitude : '—' }}</td>
                    <td>{{ $parcelle->nombre_pieds ?? '—' }}</td>
                    <td>{{ $parcelle->superficie_ha !== null ? number_format($parcelle->superficie_ha, 2, ',', ' ') . ' ha' : '—' }}</td>
                    <td>{{ $parcelle->etat_verger ?? '—' }}</td>
                    <td>{{ $parcelle->type ?? '—' }}</td>
                    <td>{{ $parcelle->created_at->format('d/m/Y') }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
