import React from 'react';

interface LinkifyTextProps {
    text: string;
    className?: string;
}

/**
 * Componente que detecta URLs en texto plano y las convierte en enlaces clicables
 * @param text - El texto que puede contener URLs
 * @param className - Clases CSS adicionales para el contenedor
 */
const LinkifyText: React.FC<LinkifyTextProps> = ({ text, className = '' }) => {
    // Regex para detectar URLs que empiecen con http:// o https://
    const urlRegex = /(https?:\/\/[^\s]+)/;

    // Si no hay URLs, retorna el texto tal como está
    const hasUrl = urlRegex.exec(text) !== null;
    if (!hasUrl) {
        return <span className={className}>{text}</span>;
    }

    // Divide el texto en partes: texto normal y URLs
    const parts = text.split(urlRegex);

    return (
        <span className={className}>
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
                            className="text-info-fg hover:underline transition-colors"
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
