export default function Footer() {
    return (
        <footer className="border-t border-gray-200 bg-white px-4 py-4 text-center text-xs text-gray-400 sm:px-8">
            LNC Burundi — Géolocalisation des plantations de caféiers · {new Date().getFullYear()}
        </footer>
    );
}
