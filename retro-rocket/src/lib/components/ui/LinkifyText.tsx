import React from 'react';

interface LinkifyTextProps {
    text: string;
    className?: string;
}

// Shared wrapping utilities so long, unbroken tokens (e.g. a 200-char URL) break
// within their container instead of overflowing. `break-words` covers
// overflow-wrap:break-word and `[overflow-wrap:anywhere]` additionally breaks
// single unbreakable tokens when needed. `min-w-0` lets the span shrink inside
// flex/grid ancestors.
const WRAP_CLASSES = 'min-w-0 break-words [overflow-wrap:anywhere]';

/**
 * Componente que detecta URLs en texto plano y las convierte en enlaces clicables
 * @param text - El texto que puede contener URLs
 * @param className - Clases CSS adicionales para el contenedor
 */
const LinkifyText: React.FC<LinkifyTextProps> = ({ text, className = '' }) => {
    // Regex para detectar URLs que empiecen con http:// o https://
    const urlRegex = /(https?:\/\/[^\s]+)/;

    // Si no hay URLs, retorna el texto tal como está (envuelto para permitir wrapping)
    const hasUrl = urlRegex.exec(text) !== null;
    if (!hasUrl) {
        return <span className={`${WRAP_CLASSES} ${className}`.trim()}>{text}</span>;
    }

    // Divide el texto en partes: texto normal y URLs
    const parts = text.split(urlRegex);

    return (
        <span className={`${WRAP_CLASSES} ${className}`.trim()}>
            {parts.map((part, index) => {
                // Si la parte está vacía, no renderizar nada
                if (!part) return null;

                // Si la parte coincide con el patrón de URL, renderiza como enlace
                const isUrl = urlRegex.exec(part) !== null;
                if (isUrl) {
                    return (
                        <a
                            key={`url-${index}-${part}`}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${WRAP_CLASSES} text-info-fg hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-sm`}
                        >
                            {part}
                        </a>
                    );
                }
                // Si no es URL, renderiza como texto normal
                return (
                    <span key={`text-${index}-${part.slice(0, 10)}`}>
                        {part}
                    </span>
                );
            })}
        </span>
    );
};

export default LinkifyText;
