import { CardColor } from '../types/card';

// Color configuration for accessibility and design consistency
export interface ColorConfig {
    name: string;
    value: CardColor;
    background: string;
    border: string;
    text: string;
    preview: string; // Color for the color picker button
    ariaLabel: string;
    tooltip: string;
}

// Carefully curated pastel color palette with excellent contrast
export const CARD_COLORS: Record<CardColor, ColorConfig> = {
    pastelWhite: {
        name: 'Blanco',
        value: 'pastelWhite',
        background: 'bg-white',
        border: 'border-gray-200',
        text: 'text-gray-800',
        preview: 'bg-white border-gray-300',
        ariaLabel: 'Seleccionar color blanco',
        tooltip: 'Blanco clásico'
    },
    pastelGreen: {
        name: 'Verde Menta Suave',
        value: 'pastelGreen',
        background: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        preview: 'bg-green-100',
        ariaLabel: 'Seleccionar color verde menta suave',
        tooltip: 'Verde menta suave - Ideal para aspectos positivos'
    },
    pastelRed: {
        name: 'Rosa Coral Suave',
        value: 'pastelRed',
        background: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        preview: 'bg-red-100',
        ariaLabel: 'Seleccionar color rosa coral suave',
        tooltip: 'Rosa coral suave - Ideal para áreas de mejora'
    },
    pastelYellow: {
        name: 'Amarillo Mantequilla',
        value: 'pastelYellow',
        background: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        preview: 'bg-yellow-100',
        ariaLabel: 'Seleccionar color amarillo mantequilla',
        tooltip: 'Amarillo mantequilla - Ideal para acciones'
    },
    pastelBlue: {
        name: 'Azul Cielo',
        value: 'pastelBlue',
        background: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        preview: 'bg-blue-100',
        ariaLabel: 'Seleccionar color azul cielo',
        tooltip: 'Azul cielo suave - Perfecto para ideas'
    },
    pastelPurple: {
        name: 'Lavanda',
        value: 'pastelPurple',
        background: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-800',
        preview: 'bg-purple-100',
        ariaLabel: 'Seleccionar color lavanda',
        tooltip: 'Lavanda suave - Ideal para reflexiones'
    },
    pastelOrange: {
        name: 'Melocotón',
        value: 'pastelOrange',
        background: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-800',
        preview: 'bg-orange-100',
        ariaLabel: 'Seleccionar color melocotón',
        tooltip: 'Melocotón suave - Excelente para alertas'
    },
    pastelPink: {
        name: 'Rosa Suave',
        value: 'pastelPink',
        background: 'bg-pink-50',
        border: 'border-pink-200',
        text: 'text-pink-800',
        preview: 'bg-pink-100',
        ariaLabel: 'Seleccionar color rosa suave',
        tooltip: 'Rosa suave - Perfecto para celebraciones'
    },
    pastelTeal: {
        name: 'Verde Azulado',
        value: 'pastelTeal',
        background: 'bg-teal-50',
        border: 'border-teal-200',
        text: 'text-teal-800',
        preview: 'bg-teal-100',
        ariaLabel: 'Seleccionar color verde azulado',
        tooltip: 'Verde azulado suave - Ideal para innovación'
    },
    pastelGray: {
        name: 'Gris Perla',
        value: 'pastelGray',
        background: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-800',
        preview: 'bg-gray-100',
        ariaLabel: 'Seleccionar color gris perla',
        tooltip: 'Gris perla suave - Neutral y elegante'
    },
    pastelIndigo: {
        name: 'Índigo Suave',
        value: 'pastelIndigo',
        background: 'bg-indigo-50',
        border: 'border-indigo-200',
        text: 'text-indigo-800',
        preview: 'bg-indigo-100',
        ariaLabel: 'Seleccionar color índigo suave',
        tooltip: 'Índigo suave - Perfecto para análisis profundo'
    },
    pastelEmerald: {
        name: 'Esmeralda Suave',
        value: 'pastelEmerald',
        background: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-800',
        preview: 'bg-emerald-100',
        ariaLabel: 'Seleccionar color esmeralda suave',
        tooltip: 'Esmeralda suave - Ideal para crecimiento y éxito'
    },
    pastelAmber: {
        name: 'Ámbar Suave',
        value: 'pastelAmber',
        background: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-800',
        preview: 'bg-amber-100',
        ariaLabel: 'Seleccionar color ámbar suave',
        tooltip: 'Ámbar suave - Excelente para advertencias importantes'
    },
    pastelCyan: {
        name: 'Cian Suave',
        value: 'pastelCyan',
        background: 'bg-cyan-50',
        border: 'border-cyan-200',
        text: 'text-cyan-800',
        preview: 'bg-cyan-100',
        ariaLabel: 'Seleccionar color cian suave',
        tooltip: 'Cian suave - Perfecto para información y datos'
    },
    pastelLime: {
        name: 'Lima Suave',
        value: 'pastelLime',
        background: 'bg-lime-50',
        border: 'border-lime-200',
        text: 'text-lime-800',
        preview: 'bg-lime-100',
        ariaLabel: 'Seleccionar color lima suave',
        tooltip: 'Lima suave - Ideal para energía y motivación'
    },
    pastelRose: {
        name: 'Rosa Intenso',
        value: 'pastelRose',
        background: 'bg-rose-50',
        border: 'border-rose-200',
        text: 'text-rose-800',
        preview: 'bg-rose-100',
        ariaLabel: 'Seleccionar color rosa intenso',
        tooltip: 'Rosa intenso - Perfecto para emociones y pasión'
    },
    pastelSlate: {
        name: 'Pizarra Suave',
        value: 'pastelSlate',
        background: 'bg-slate-50',
        border: 'border-slate-200',
        text: 'text-slate-800',
        preview: 'bg-slate-100',
        ariaLabel: 'Seleccionar color pizarra suave',
        tooltip: 'Pizarra suave - Elegante y profesional'
    },
    pastelViolet: {
        name: 'Violeta Suave',
        value: 'pastelViolet',
        background: 'bg-violet-50',
        border: 'border-violet-200',
        text: 'text-violet-800',
        preview: 'bg-violet-100 border-violet-300',
        ariaLabel: 'Seleccionar color violeta suave',
        tooltip: 'Violeta suave'
    },
    pastelSky: {
        name: 'Azul Cielo',
        value: 'pastelSky',
        background: 'bg-sky-50',
        border: 'border-sky-200',
        text: 'text-sky-800',
        preview: 'bg-sky-100 border-sky-300',
        ariaLabel: 'Seleccionar color azul cielo',
        tooltip: 'Azul cielo suave'
    },
    pastelFuchsia: {
        name: 'Fucsia Suave',
        value: 'pastelFuchsia',
        background: 'bg-fuchsia-50',
        border: 'border-fuchsia-200',
        text: 'text-fuchsia-800',
        preview: 'bg-fuchsia-100 border-fuchsia-300',
        ariaLabel: 'Seleccionar color fucsia suave',
        tooltip: 'Fucsia suave'
    },
    pastelMint: {
        name: 'Verde Menta',
        value: 'pastelMint',
        background: 'bg-emerald-25',
        border: 'border-emerald-100',
        text: 'text-emerald-800',
        preview: 'bg-emerald-50 border-emerald-200',
        ariaLabel: 'Seleccionar color verde menta',
        tooltip: 'Verde menta fresco'
    },
    pastelPeach: {
        name: 'Melocotón',
        value: 'pastelPeach',
        background: 'bg-orange-25',
        border: 'border-orange-100',
        text: 'text-orange-800',
        preview: 'bg-orange-50 border-orange-200',
        ariaLabel: 'Seleccionar color melocotón',
        tooltip: 'Melocotón suave'
    },
    pastelLavender: {
        name: 'Lavanda',
        value: 'pastelLavender',
        background: 'bg-purple-25',
        border: 'border-purple-100',
        text: 'text-purple-800',
        preview: 'bg-purple-50 border-purple-200',
        ariaLabel: 'Seleccionar color lavanda',
        tooltip: 'Lavanda relajante'
    },
    pastelCream: {
        name: 'Crema',
        value: 'pastelCream',
        background: 'bg-yellow-25',
        border: 'border-yellow-50',
        text: 'text-yellow-900',
        preview: 'bg-yellow-50 border-yellow-100',
        ariaLabel: 'Seleccionar color crema',
        tooltip: 'Crema cálido'
    },
    pastelCoral: {
        name: 'Coral',
        value: 'pastelCoral',
        background: 'bg-red-25',
        border: 'border-red-100',
        text: 'text-red-800',
        preview: 'bg-red-50 border-red-200',
        ariaLabel: 'Seleccionar color coral',
        tooltip: 'Coral vibrante'
    },
    pastelTurquoise: {
        name: 'Turquesa',
        value: 'pastelTurquoise',
        background: 'bg-cyan-25',
        border: 'border-cyan-100',
        text: 'text-cyan-800',
        preview: 'bg-cyan-50 border-cyan-200',
        ariaLabel: 'Seleccionar color turquesa',
        tooltip: 'Turquesa tropical'
    },
    pastelGold: {
        name: 'Oro Suave',
        value: 'pastelGold',
        background: 'bg-amber-25',
        border: 'border-amber-100',
        text: 'text-amber-900',
        preview: 'bg-amber-50 border-amber-200',
        ariaLabel: 'Seleccionar color oro suave',
        tooltip: 'Oro elegante'
    },
    pastelSilver: {
        name: 'Plata',
        value: 'pastelSilver',
        background: 'bg-slate-25',
        border: 'border-slate-100',
        text: 'text-slate-700',
        preview: 'bg-slate-50 border-slate-200',
        ariaLabel: 'Seleccionar color plata',
        tooltip: 'Plata sofisticado'
    },
    pastelBronze: {
        name: 'Bronce',
        value: 'pastelBronze',
        background: 'bg-stone-50',
        border: 'border-stone-200',
        text: 'text-stone-800',
        preview: 'bg-stone-100 border-stone-300',
        ariaLabel: 'Seleccionar color bronce',
        tooltip: 'Bronce cálido'
    },
    pastelIvory: {
        name: 'Marfil',
        value: 'pastelIvory',
        background: 'bg-neutral-25',
        border: 'border-neutral-100',
        text: 'text-neutral-800',
        preview: 'bg-neutral-50 border-neutral-200',
        ariaLabel: 'Seleccionar color marfil',
        tooltip: 'Marfil clásico'
    }
};

// Get all available colors in order
export const getAvailableColors = (): CardColor[] => {
    return [
        'pastelWhite',
        'pastelGreen',
        'pastelRed',
        'pastelYellow',
        'pastelBlue',
        'pastelPurple',
        'pastelOrange',
        'pastelPink',
        'pastelTeal',
        'pastelGray',
        'pastelIndigo',
        'pastelEmerald',
        'pastelAmber',
        'pastelCyan',
        'pastelLime',
        'pastelRose',
        'pastelSlate',
        'pastelViolet',
        'pastelSky',
        'pastelFuchsia',
        'pastelMint',
        'pastelPeach',
        'pastelLavender',
        'pastelCream',
        'pastelCoral',
        'pastelTurquoise',
        'pastelGold',
        'pastelSilver',
        'pastelBronze',
        'pastelIvory'
    ];
};

// Get color configuration
export const getColorConfig = (color: CardColor): ColorConfig => {
    return CARD_COLORS[color];
};

// Get card styling classes with enhanced specificity
export const getCardStyling = (color: CardColor = 'pastelWhite'): string => {
    const config = getColorConfig(color);
    return `card-color-bg ${config.background} ${config.border} ${config.text}`;
};

// Check if color is valid
export const isValidColor = (color: string): color is CardColor => {
    return color in CARD_COLORS;
};

// Get default color
export const getDefaultColor = (): CardColor => 'pastelWhite';

// Get suggested color for retrospective column by ID (preferred) or title
export const getSuggestedColorForColumn = (columnTitle: string, columnId?: string): CardColor => {
    // First priority: map by specific column ID
    if (columnId) {
        const columnIdMap: Record<string, CardColor> = {
            // Plantilla por defecto
            'helped': 'pastelGreen',     // Primera columna - Verde menta suave
            'hindered': 'pastelRed',     // Segunda columna - Rosa coral suave  
            'improve': 'pastelYellow',   // Tercera columna - Amarillo mantequilla

            // Plantilla Mad-Sad-Glad
            'mad': 'pastelOrange',       // Enfadado - Melocotón (frustración, pero no demasiado agresivo)
            'sad': 'pastelGray',         // Triste - Gris perla (melancolía, neutral)
            'glad': 'pastelGreen',       // Contento - Verde menta (alegría, positivo)

            // Plantilla Start-Stop-Continue  
            'start': 'pastelTeal',       // Empezar - Verde azulado (innovación, nuevos comienzos)
            'stop': 'pastelRed',         // Parar - Rosa coral (detener, advertencia suave)
            'continue': 'pastelBlue',    // Continuar - Azul cielo (continuidad, estabilidad)

            // Elementos de acción
            'actionItems': 'pastelYellow' // Amarillo mantequilla (acción, atención)
        };

        if (columnIdMap[columnId]) {
            return columnIdMap[columnId];
        }
    }

    // Fallback: mapping by title for other retrospective formats
    const title = columnTitle.toLowerCase();

    // Mapping common retrospective column patterns to appropriate colors
    if (title.includes('ayudó') || title.includes('bien') || title.includes('good') || title.includes('went well') || title.includes('positivo') || title.includes('contento') || title.includes('glad') || title.includes('alegr')) {
        return 'pastelGreen';
    }
    if (title.includes('retrasó') || title.includes('mal') || title.includes('bad') || title.includes('hindered') || title.includes('problema') || title.includes('obstáculo') || title.includes('parar') || title.includes('stop')) {
        return 'pastelRed';
    }
    if (title.includes('mejor') || title.includes('improve') || title.includes('mejorar') || title.includes('accion') || title.includes('action') || title.includes('hacer') || title.includes('todo') || title.includes('next')) {
        return 'pastelYellow';
    }
    if (title.includes('idea') || title.includes('suggestion') || title.includes('innovar') || title.includes('creative') || title.includes('empezar') || title.includes('start') || title.includes('continuar') || title.includes('continue')) {
        return title.includes('empezar') || title.includes('start') ? 'pastelTeal' : 'pastelBlue';
    }
    if (title.includes('question') || title.includes('pregunta') || title.includes('doubt') || title.includes('confusion')) {
        return 'pastelPurple';
    }
    if (title.includes('triste') || title.includes('sad') || title.includes('enfadado') || title.includes('mad') || title.includes('frustrado')) {
        return title.includes('enfadado') || title.includes('mad') || title.includes('frustrado') ? 'pastelOrange' : 'pastelGray';
    }

    // Default color for unknown column types
    return 'pastelWhite';
};

// Validate color and provide fallback
export const validateColor = (color: string | undefined | null): CardColor => {
    if (!color || !isValidColor(color)) {
        return getDefaultColor();
    }
    return color;
};

// Get hex color for PDF export
export const getCardColorHex = (color: CardColor): string => {
    const colorHexMap: Record<CardColor, string> = {
        pastelWhite: '#FFFFFF',
        pastelGreen: '#F0FDF4',
        pastelRed: '#FEF2F2',
        pastelYellow: '#FEFCE8',
        pastelBlue: '#EFF6FF',
        pastelPurple: '#FAF5FF',
        pastelPink: '#FDF2F8',
        pastelOrange: '#FFF7ED',
        pastelTeal: '#F0FDFA',
        pastelGray: '#F9FAFB',
        pastelIndigo: '#EEF2FF',
        pastelEmerald: '#ECFDF5',
        pastelAmber: '#FFFBEB',
        pastelCyan: '#ECFEFF',
        pastelLime: '#F7FEE7',
        pastelRose: '#FFF1F2',
        pastelSlate: '#F8FAFC',
        pastelViolet: '#F5F3FF',
        pastelSky: '#F0F9FF',
        pastelFuchsia: '#FDF4FF',
        pastelMint: '#F0FDF9',
        pastelPeach: '#FFF8F1',
        pastelLavender: '#FAF5FF',
        pastelCream: '#FFFEF7',
        pastelCoral: '#FEF7F7',
        pastelTurquoise: '#F0FFFE',
        pastelGold: '#FFFDF2',
        pastelSilver: '#FEFFFE',
        pastelBronze: '#FFF9F5',
        pastelIvory: '#FEFEF9'
    };

    return colorHexMap[color] || colorHexMap.pastelWhite;
};
