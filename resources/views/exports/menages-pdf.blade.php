<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Liste des ménages</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #1f2937; }
        h1 { font-size: 16px; margin-bottom: 2px; }
        p.meta { color: #6b7280; margin-top: 0; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #e5e7eb; padding: 5px 8px; text-align: left; }
        th { background-color: #f3f4f6; }
        .statut-termine { color: #16a34a; font-weight: bold; }
        .statut-en_attente { color: #d97706; font-weight: bold; }
        .statut-a_faire { color: #6b7280; }
    </style>
</head>
<body>
    <h1>Liste des ménages — Géolocalisation des plantations de caféiers</h1>
    <p class="meta">Généré le {{ $genereLe }} — {{ $menages->count() }} ménage(s)</p>

    <table>
        <thead>
            <tr>
                <th>Code</th>
                <th>Chef de ménage</th>
                <th>Province</th>
                <th>Commune</th>
                <th>Zone</th>
                <th>Colline</th>
                <th>Enquêteur</th>
                <th>Parcelles</th>
                <th>Pieds de café</th>
                <th>Statut</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($menages as $menage)
                <tr>
                    <td>{{ $menage->code_menage }}</td>
                    <td>{{ trim($menage->prenom_chef_menage . ' ' . $menage->nom_chef_menage) ?: '—' }}</td>
                    <td>{{ $menage->colline?->zone?->commune?->province?->nom }}</td>
                    <td>{{ $menage->colline?->zone?->commune?->nom }}</td>
                    <td>{{ $menage->colline?->zone?->nom }}</td>
                    <td>{{ $menage->colline?->nom }}</td>
                    <td>{{ $menage->enqueteur?->name ?? '—' }}</td>
                    <td>{{ $menage->parcelles->count() }}</td>
                    <td>{{ $menage->parcelles->sum('nombre_pieds') }}</td>
                    <td class="statut-{{ $menage->statut }}">{{ ucfirst(str_replace('_', ' ', $menage->statut)) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
