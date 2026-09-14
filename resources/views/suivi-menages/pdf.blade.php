<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Suivi des ménages</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #1f2937; }
        h1 { font-size: 16px; margin-bottom: 2px; }
        p.meta { color: #6b7280; margin-top: 0; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #e5e7eb; padding: 5px 8px; text-align: left; }
        th { background-color: #f3f4f6; }
        .oui { color: #16a34a; font-weight: bold; }
        .non { color: #d97706; font-weight: bold; }
    </style>
</head>
<body>
    <h1>Suivi des ménages — pré-enregistrés / nouveaux, réponses au questionnaire</h1>
    <p class="meta">Généré le {{ $genereLe }} — {{ $menages->count() }} ménage(s)</p>

    <table>
        <thead>
            <tr>
                <th>Code</th>
                <th>Origine</th>
                <th>A répondu</th>
                <th>Statut</th>
                <th>Chef de ménage</th>
                <th>Province</th>
                <th>Commune</th>
                <th>Colline</th>
                <th>Enquêteur</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($menages as $menage)
                <tr>
                    <td>{{ $menage->code_menage }}</td>
                    <td>{{ $libelleSource($menage->source) }}</td>
                    <td class="{{ $menage->reponses->count() > 0 ? 'oui' : 'non' }}">
                        {{ $menage->reponses->count() > 0 ? 'Oui' : 'Non' }}
                    </td>
                    <td>{{ ucfirst(str_replace('_', ' ', $menage->statut)) }}</td>
                    <td>{{ trim($menage->prenom_chef_menage . ' ' . $menage->nom_chef_menage) ?: '—' }}</td>
                    <td>{{ $menage->colline?->zone?->commune?->province?->nom }}</td>
                    <td>{{ $menage->colline?->zone?->commune?->nom }}</td>
                    <td>{{ $menage->colline?->nom }}</td>
                    <td>{{ $menage->enqueteur?->name ?? '—' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
