import { useEffect } from 'react';

/**
 * Hook personalizado para bloquear/desbloquear el scroll del body
 * cuando un modal, picker u otro overlay está abierto
 * 
 * @param shouldLock - Si es true, bloquea el scroll del body
 */
export const useBodyScrollLock = (shouldLock: boolean) => {
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;

        if (shouldLock) {
            // Bloquear el scroll
            document.body.style.overflow = 'hidden';
        } else {
            // Desbloquear el scroll
            document.body.style.overflow = '';
        }

        return () => {
            // Restaurar el valor original al limpiar
            document.body.style.overflow = originalOverflow;
        };
    }, [shouldLock]);

    // Función de limpieza para restaurar el scroll manualmente
    const restoreScroll = () => {
        document.body.style.overflow = '';
    };

    return { restoreScroll };
};
