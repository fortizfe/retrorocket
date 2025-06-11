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
        name: 'Verde Menta',
        value: 'pastelGreen',
        background: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        preview: 'bg-green-100',
        ariaLabel: 'Seleccionar color verde menta',
        tooltip: 'Verde menta suave - Ideal para aspectos positivos'
    },
    pastelRed: {
        name: 'Rosa Coral',
        value: 'pastelRed',
        background: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        preview: 'bg-red-100',
        ariaLabel: 'Seleccionar color rosa coral',
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
        'pastelGray'
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

// Get suggested color for retrospective column
export const getSuggestedColorForColumn = (columnTitle: string): CardColor => {
    const title = columnTitle.toLowerCase();

    // Mapping common retrospective column patterns to appropriate colors
    if (title.includes('bien') || title.includes('good') || title.includes('went well') || title.includes('positivo')) {
        return 'pastelGreen';
    }
    if (title.includes('mal') || title.includes('bad') || title.includes('improve') || title.includes('mejorar') || title.includes('problema')) {
        return 'pastelRed';
    }
    if (title.includes('accion') || title.includes('action') || title.includes('hacer') || title.includes('todo') || title.includes('next')) {
        return 'pastelYellow';
    }
    if (title.includes('idea') || title.includes('suggestion') || title.includes('innovar') || title.includes('creative')) {
        return 'pastelBlue';
    }
    if (title.includes('question') || title.includes('pregunta') || title.includes('doubt') || title.includes('confusion')) {
        return 'pastelPurple';
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
