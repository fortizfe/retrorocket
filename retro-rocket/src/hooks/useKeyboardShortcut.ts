import { useEffect, useCallback } from 'react';

interface UseKeyboardShortcutOptions {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    preventDefault?: boolean;
}

/**
 * Hook personalizado para manejar atajos de teclado
 * Principio de Responsabilidad Única: Se encarga únicamente de la lógica de teclado
 * 
 * @param callback - Función que se ejecutará cuando se presione el atajo
 * @param options - Configuración del atajo de teclado
 */
export function useKeyboardShortcut(
    callback: () => void,
    options: UseKeyboardShortcutOptions
): void {
    const {
        key,
        ctrlKey = false,
        shiftKey = false,
        altKey = false,
        metaKey = false,
        preventDefault = true,
    } = options;

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            // Verificar que todas las condiciones se cumplan
            const isMatchingKey = event.key.toLowerCase() === key.toLowerCase();
            const isCtrlMatch = event.ctrlKey === ctrlKey;
            const isShiftMatch = event.shiftKey === shiftKey;
            const isAltMatch = event.altKey === altKey;
            const isMetaMatch = event.metaKey === metaKey;

            if (isMatchingKey && isCtrlMatch && isShiftMatch && isAltMatch && isMetaMatch) {
                if (preventDefault) {
                    event.preventDefault();
                }
                callback();
            }
        },
        [callback, key, ctrlKey, shiftKey, altKey, metaKey, preventDefault]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
}
