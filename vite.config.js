import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    server: {
        // Évite que Vite génère une URL IPv6 ([::1]) différente
        // de celle utilisée par Laravel dans le navigateur.
        host: '127.0.0.1',
        origin: 'http://127.0.0.1:5173',
        cors: true,
    },
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
});
