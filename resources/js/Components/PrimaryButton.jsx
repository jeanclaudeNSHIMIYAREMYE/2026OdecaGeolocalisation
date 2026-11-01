export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            className={
                `inline-flex min-h-11 items-center justify-center rounded-xl border border-transparent bg-burundi-vert px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-md focus:bg-green-700 focus:outline-none focus:ring-2 focus:ring-burundi-vert focus:ring-offset-2 active:translate-y-0 active:bg-green-800 ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
