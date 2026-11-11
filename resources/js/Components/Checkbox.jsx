export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-gray-300 text-[#B96B8D] shadow-sm focus:ring-[#B96B8D] ' +
                className
            }
        />
    );
}
