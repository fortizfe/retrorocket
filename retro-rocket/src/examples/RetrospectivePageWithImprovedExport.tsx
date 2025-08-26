// Ejemplo de uso del ImprovedExportPopover en una página de retrospectiva

import React from 'react';
import { Download } from 'lucide-react';
import ImprovedExportPopover from '../components/retrospective/ImprovedExportPopover';
import Button from '../components/ui/Button';

interface RetrospectivePageProps {
    retrospective: any;
    cards: any[];
    groups: any[];
    participants: any[];
    actionItems: any[];
}

const RetrospectivePage: React.FC<RetrospectivePageProps> = ({
    retrospective,
    cards,
    groups,
    participants,
    actionItems
}) => {
    const [showExportMenu, setShowExportMenu] = React.useState(false);

    return (
        <div className="retrospective-page">
            {/* Header con botón de exportación mejorado */}
            <header className="flex justify-between items-center p-4">
                <h1>{retrospective.title}</h1>

                {/* Nuevo componente de exportación mejorado */}
                <ImprovedExportPopover
                    retrospective={retrospective}
                    cards={cards}
                    groups={groups}
                    participants={participants}
                    actionItems={actionItems}
                    isOpen={showExportMenu}
                    onClose={() => setShowExportMenu(false)}
                >
                    <Button
                        variant="outline"
                        onClick={() => setShowExportMenu(true)}
                        className="flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Exportar Retrospectiva
                    </Button>
                </ImprovedExportPopover>
            </header>

            {/* Contenido de la retrospectiva */}
            <main>
                {/* Cards, grupos, etc. */}
            </main>
        </div>
    );
};

export default RetrospectivePage;

/*
BENEFICIOS DEL NUEVO COMPONENTE:

✅ UX Simplificada:
   - Eliminada sección confusa de ordenamiento de tarjetas
   - Solo 2 opciones básicas: Elementos de acción y Estadísticas
   - Información clara sobre qué siempre se incluye

✅ Zona Exclusiva del Facilitador:
   - Controles avanzados solo para propietarios del tablero
   - Notas de facilitador, sentiment badges, team mood analysis
   - Diseño distintivo con color ámbar y icono de seguridad

✅ Arquitectura Mejorada:
   - Hook dedicado useExportOptions para lógica separada
   - Tipos extendidos para nuevas funcionalidades
   - Compatibilidad total con sistema existente

✅ Integración i18n:
   - Nuevas traducciones en español e inglés
   - Textos descriptivos y contextuales
   - Mensajes de éxito mejorados
*/
