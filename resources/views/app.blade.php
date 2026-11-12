
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'ODECA Burundi') }}</title>

        <!-- Logo ODECA : favicon du navigateur -->
        <link rel="icon" type="image/jpeg" href="{{ asset('odeca-logo.jpeg') }}">
        <link rel="apple-touch-icon" href="{{ asset('odeca-logo.jpeg') }}">

        <!-- Couleur du navigateur sur mobile -->
        <meta name="theme-color" content="#2F7D4F">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link
            href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap"
            rel="stylesheet"
        />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite([
            'resources/js/app.jsx',
            "resources/js/Pages/{$page['component']}.jsx"
        ])
        @inertiaHead
    </head>

    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
