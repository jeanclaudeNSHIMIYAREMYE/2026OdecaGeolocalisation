import Dropdown from '@/Components/Dropdown';
import { usePage } from '@inertiajs/react';

/**
 * Bandeau supérieur du portail : titre de la page à gauche (passé en
 * prop `header` depuis chaque page), menu utilisateur (profil/déconnexion)
 * à droite.
 */
export default function Entete({ header }) {
    const user = usePage().props.auth.user;

    return (
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4 sm:px-8">
            <div className="ml-10 sm:ml-0">{header}</div>

            <Dropdown>
                <Dropdown.Trigger>
                    <button
                        type="button"
                        className="inline-flex items-center rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-500 transition duration-150 ease-in-out hover:text-gray-700 focus:outline-none"
                    >
                        {user.name}

                        <svg
                            className="-me-0.5 ms-2 h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                </Dropdown.Trigger>

                <Dropdown.Content>
                    <Dropdown.Link href={route('profile.edit')}>Profil</Dropdown.Link>
                    <Dropdown.Link href={route('logout')} method="post" as="button">
                        Déconnexion
                    </Dropdown.Link>
                </Dropdown.Content>
            </Dropdown>
        </header>
    );
}
