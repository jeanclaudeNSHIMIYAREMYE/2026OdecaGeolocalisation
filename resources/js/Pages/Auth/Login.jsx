import ApplicationLogo from '@/Components/ApplicationLogo';
import odeca from '@/assets/odeca-logo.jpeg';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

const CLASSE_CHAMP =
    'w-full rounded-xl border-gray-300 bg-white py-3 text-sm shadow-sm transition duration-200 focus:border-burundi-vert focus:ring-2 focus:ring-burundi-vert/30';

function Erreur({ message }) {
    if (!message) return null;

    return (
        <p className="log-erreur mt-2 flex items-center gap-1.5 text-sm text-red-600">
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
            >
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
            </svg>
            {message}
        </p>
    );
}

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const [visible, setVisible] = useState(false);

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Connexion" />

            <style>{`
                @keyframes logEntree {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes logGauche {
                    from { opacity: 0; transform: translateX(-24px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes logFlotte {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50%      { transform: translate(24px, -30px) scale(1.1); }
                }
                @keyframes logHalo {
                    0%   { transform: scale(1);   opacity: .5; }
                    100% { transform: scale(1.4); opacity: 0; }
                }
                @keyframes logErreur {
                    0%   { opacity: 0; transform: translateX(-6px); }
                    60%  { transform: translateX(3px); }
                    100% { opacity: 1; transform: translateX(0); }
                }
                @keyframes logRotation { to { transform: rotate(360deg); } }
                @keyframes logBrillance {
                    0%   { transform: translateX(-120%) skewX(-20deg); }
                    100% { transform: translateX(260%) skewX(-20deg); }
                }
                .log-entree  { opacity: 0; animation: logEntree .7s cubic-bezier(.2,.7,.2,1) forwards; }
                .log-gauche  { opacity: 0; animation: logGauche .8s cubic-bezier(.2,.7,.2,1) forwards; }
                .log-blob    { animation: logFlotte 14s ease-in-out infinite; }
                .log-halo    { animation: logHalo 2.8s ease-out infinite; }
                .log-erreur  { animation: logErreur .35s ease-out both; }
                .log-spin    { animation: logRotation .8s linear infinite; }
                .log-brille  { position: relative; overflow: hidden; }
                .log-brille::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    width: 40%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent);
                    animation: logBrillance 3.2s ease-in-out infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                    .log-entree, .log-gauche, .log-blob, .log-halo, .log-erreur, .log-spin, .log-brille::after {
                        animation: none !important;
                        opacity: 1 !important;
                    }
                }
            `}</style>

            <div className="relative flex min-h-screen bg-gradient-to-br from-red-50 via-white to-green-50">
                {/* Bandeau drapeau */}
                <div className="absolute inset-x-0 top-0 z-30 flex h-1.5">
                    <div className="flex-1 bg-burundi-rouge" />
                    <div className="flex-1 bg-white" />
                    <div className="flex-1 bg-burundi-vert" />
                </div>

                {/* Panneau gauche (écrans larges) */}
                <aside className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-burundi-vert via-green-700 to-green-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
                    <div className="log-blob pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
                    <div
                        className="log-blob pointer-events-none absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-burundi-rouge/30 blur-3xl"
                        style={{ animationDelay: '-6s' }}
                    />

                    <img
                        src={odeca}
                        alt=""
                        aria-hidden="true"
                        className="pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 opacity-[0.07] blur-sm"
                    />

                    <div className="log-gauche relative flex items-center gap-3 text-white">
                        <div className="rounded-xl bg-white/90 p-2 shadow-lg">
                            <ApplicationLogo className="h-9 w-auto" />
                        </div>
                        <div className="leading-tight">
                            <span className="block text-sm font-bold">LNC Burundi</span>
                            <span className="block text-[11px] uppercase tracking-wider text-white/70">
                                Portail ODECA
                            </span>
                        </div>
                    </div>

                    <div className="relative text-white">
                        <div className="log-gauche relative mb-8 inline-block" style={{ animationDelay: '150ms' }}>
                            <span className="log-halo absolute inset-0 rounded-full bg-white/30" />
                            <img
                                src={odeca}
                                alt="ODECA"
                                className="relative h-32 w-32 rounded-full object-cover shadow-2xl ring-4 ring-white/80"
                            />
                        </div>

                        <h1
                            className="log-gauche max-w-md text-4xl font-extrabold leading-tight tracking-tight"
                            style={{ animationDelay: '300ms' }}
                        >
                            Géolocalisation nationale des plantations de café
                        </h1>
                        <p
                            className="log-gauche mt-4 max-w-md text-base leading-relaxed text-white/80"
                            style={{ animationDelay: '450ms' }}
                        >
                            Suivi, cartographie et gestion des données de géolocalisation
                            des caféiculteurs du Burundi.
                        </p>
                    </div>

                    <p
                        className="log-gauche relative text-xs text-white/60"
                        style={{ animationDelay: '600ms' }}
                    >
                        ODECA · Burundi
                    </p>
                </aside>

                {/* Formulaire */}
                <main className="relative flex w-full flex-col items-center justify-center overflow-hidden px-6 py-12 lg:w-1/2">
                    <div className="log-blob pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-red-200/40 blur-3xl lg:hidden" />

                    {/* Logo mobile */}
                    <div className="log-entree mb-8 flex items-center gap-3 lg:hidden">
                        <ApplicationLogo className="h-10 w-auto" />
                        <div className="leading-tight">
                            <span className="block text-sm font-bold text-gray-800">LNC Burundi</span>
                            <span className="block text-[11px] uppercase tracking-wider text-gray-400">
                                Portail ODECA
                            </span>
                        </div>
                    </div>

                    <div
                        className="log-entree relative w-full max-w-md rounded-2xl border border-white/80 bg-white/90 p-8 shadow-xl backdrop-blur"
                        style={{ animationDelay: '100ms' }}
                    >
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                                Connexion
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Entrez vos identifiants pour accéder au portail.
                            </p>
                        </div>

                        {status && (
                            <div className="log-erreur mb-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">
                                {status}
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-5">
                            <div className="log-entree" style={{ animationDelay: '250ms' }}>
                                <label
                                    htmlFor="email"
                                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500"
                                >
                                    Adresse e-mail
                                </label>
                                <div className="relative">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                                        />
                                    </svg>
                                    <input
                                        id="email"
                                        type="email"
                                        name="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="nom@exemple.com"
                                        autoComplete="username"
                                        autoFocus
                                        className={`${CLASSE_CHAMP} pl-11 pr-4 ${
                                            errors.email
                                                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30'
                                                : ''
                                        }`}
                                    />
                                </div>
                                <Erreur message={errors.email} />
                            </div>

                            <div className="log-entree" style={{ animationDelay: '350ms' }}>
                                <label
                                    htmlFor="password"
                                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500"
                                >
                                    Mot de passe
                                </label>
                                <div className="relative">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                                        />
                                    </svg>
                                    <input
                                        id="password"
                                        type={visible ? 'text' : 'password'}
                                        name="password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        className={`${CLASSE_CHAMP} pl-11 pr-20 ${
                                            errors.password
                                                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30'
                                                : ''
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setVisible((v) => !v)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-burundi-vert"
                                    >
                                        {visible ? 'Masquer' : 'Afficher'}
                                    </button>
                                </div>
                                <Erreur message={errors.password} />
                            </div>

                            <div
                                className="log-entree flex flex-wrap items-center justify-between gap-3"
                                style={{ animationDelay: '450ms' }}
                            >
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                        type="checkbox"
                                        name="remember"
                                        checked={data.remember}
                                        onChange={(e) => setData('remember', e.target.checked)}
                                        className="rounded border-gray-300 text-burundi-vert shadow-sm focus:ring-burundi-vert"
                                    />
                                    <span className="text-sm text-gray-600">Se souvenir de moi</span>
                                </label>

                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className="rounded-md text-sm font-medium text-burundi-vert transition hover:text-green-800 hover:underline focus:outline-none focus:ring-2 focus:ring-burundi-vert focus:ring-offset-2"
                                    >
                                        Mot de passe oublié ?
                                    </Link>
                                )}
                            </div>

                            <div className="log-entree" style={{ animationDelay: '550ms' }}>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="log-brille group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-burundi-vert px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-green-600/30 transition duration-300 hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-xl hover:shadow-green-600/40 focus:outline-none focus:ring-2 focus:ring-burundi-vert focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                                >
                                    {processing ? (
                                        <>
                                            <svg
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                className="log-spin h-5 w-5"
                                                aria-hidden="true"
                                            >
                                                <circle
                                                    cx="12"
                                                    cy="12"
                                                    r="9"
                                                    stroke="currentColor"
                                                    strokeOpacity=".3"
                                                    strokeWidth="3"
                                                />
                                                <path
                                                    d="M21 12a9 9 0 0 0-9-9"
                                                    stroke="currentColor"
                                                    strokeWidth="3"
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            Connexion…
                                        </>
                                    ) : (
                                        <>
                                            Se connecter
                                            <svg
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                                                />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    <Link
                        href="/"
                        className="log-entree mt-6 text-sm text-gray-500 transition hover:text-burundi-vert"
                        style={{ animationDelay: '700ms' }}
                    >
                        ← Retour à l'accueil
                    </Link>
                </main>
            </div>
        </>
    );
}