import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export default forwardRef(function TextInput(
    { type = 'text', className = '', isFocused = false, ...props },
    ref,
) {
    const localRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={
                'min-h-11 rounded-xl border-gray-300 text-base shadow-sm transition duration-200 focus:border-burundi-vert focus:outline-none focus:ring-4 focus:ring-green-100 sm:min-h-10 sm:text-sm ' +
                className
            }
            ref={localRef}
        />
    );
});
