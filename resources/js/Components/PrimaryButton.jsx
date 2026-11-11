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
                `inline-flex items-center rounded-md border border-transparent bg-[#B96B8D] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition duration-150 ease-in-out hover:bg-[#96516F] focus:bg-[#96516F] focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 active:bg-[#96516F] ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
