export function SkullIcon({ small = false }: { small?: boolean }) {
    return (
        <svg className={small ? 'skull-icon small' : 'skull-icon'} viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M7 5h18v3h3v15h-5v6H9v-6H4V8h3V5Z" fill="currentColor" />
            <path d="M8 13h6v7H8zm10 0h6v7h-6zm-3 7h2v4h-2zm-4 6h2v5h-2zm8 0h2v5h-2Z" fill="#171b23" />
        </svg>
    );
}
