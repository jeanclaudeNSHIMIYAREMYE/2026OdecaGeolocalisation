export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            type={type}
            className={
                `inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-gray-700 shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-burundi-vert focus:ring-offset-2 active:translate-y-0 disabled:opacity-25 ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
