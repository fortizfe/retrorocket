import { CardColor } from '@/features/boards/types/card';

// Color configuration for accessibility and design consistency. `nameKey`/
// `tooltipKey`/`ariaLabelKey` are i18next keys under the `colors` namespace
// (src/locales/{en,es}.json) — resolved via `t()` by the consuming
// component, not here, per Constitution Principle IV's UI/domain
// separation (spec 037, research.md §4).
export interface ColorConfig {
    nameKey: string;
    value: CardColor;
    background: string;
    border: string;
    text: string;
    preview: string; // Color for the color picker button
    ariaLabelKey: string;
    tooltipKey: string;
}

// Curated pastel color palette (spec 037 — reduced from 30 to 15 colors for
// scannability, per the product-owner-selected "Swatch Strip + Detail"
// direction, data-model.md's Visual Direction table). Every background
// class below already carries a WCAG 2.1 AA-verified dark override in
// globals.css's `.card-color-bg.*` rules (feature 009); light-mode
// contrast is verified against the raw Tailwind `-50` shade where no
// explicit override exists (cardColors.a11y.test.ts's documented policy).
export const CARD_COLORS: Record<CardColor, ColorConfig> = {
    pastelWhite: {
        nameKey: 'colors.white',
        value: 'pastelWhite',
        background: 'bg-white',
        border: 'border-gray-200 dark:border-slate-600',
        text: 'text-gray-800 dark:text-slate-100',
        preview: 'bg-white border-gray-300',
        ariaLabelKey: 'colors.white_aria',
        tooltipKey: 'colors.white_tooltip'
    },
    pastelBlue: {
        nameKey: 'colors.blue',
        value: 'pastelBlue',
        background: 'bg-blue-50',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-800 dark:text-blue-200',
        preview: 'bg-blue-100',
        ariaLabelKey: 'colors.blue_aria',
        tooltipKey: 'colors.blue_tooltip'
    },
    pastelGreen: {
        nameKey: 'colors.green',
        value: 'pastelGreen',
        background: 'bg-green-50',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-800 dark:text-green-200',
        preview: 'bg-green-100',
        ariaLabelKey: 'colors.green_aria',
        tooltipKey: 'colors.green_tooltip'
    },
    pastelYellow: {
        nameKey: 'colors.yellow',
        value: 'pastelYellow',
        background: 'bg-yellow-50',
        border: 'border-yellow-200 dark:border-yellow-800',
        text: 'text-yellow-800 dark:text-yellow-200',
        preview: 'bg-yellow-100',
        ariaLabelKey: 'colors.yellow_aria',
        tooltipKey: 'colors.yellow_tooltip'
    },
    pastelRed: {
        nameKey: 'colors.red',
        value: 'pastelRed',
        background: 'bg-red-50',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-800 dark:text-red-200',
        preview: 'bg-red-100',
        ariaLabelKey: 'colors.red_aria',
        tooltipKey: 'colors.red_tooltip'
    },
    pastelPurple: {
        nameKey: 'colors.purple',
        value: 'pastelPurple',
        background: 'bg-purple-50',
        border: 'border-purple-200 dark:border-purple-800',
        text: 'text-purple-800 dark:text-purple-200',
        preview: 'bg-purple-100',
        ariaLabelKey: 'colors.purple_aria',
        tooltipKey: 'colors.purple_tooltip'
    },
    pastelOrange: {
        nameKey: 'colors.orange',
        value: 'pastelOrange',
        background: 'bg-orange-50',
        border: 'border-orange-200 dark:border-orange-800',
        text: 'text-orange-800 dark:text-orange-200',
        preview: 'bg-orange-100',
        ariaLabelKey: 'colors.orange_aria',
        tooltipKey: 'colors.orange_tooltip'
    },
    pastelPink: {
        nameKey: 'colors.pink',
        value: 'pastelPink',
        background: 'bg-pink-50',
        border: 'border-pink-200 dark:border-pink-800',
        text: 'text-pink-800 dark:text-pink-200',
        preview: 'bg-pink-100',
        ariaLabelKey: 'colors.pink_aria',
        tooltipKey: 'colors.pink_tooltip'
    },
    pastelTeal: {
        nameKey: 'colors.teal',
        value: 'pastelTeal',
        background: 'bg-teal-50',
        border: 'border-teal-200 dark:border-teal-800',
        text: 'text-teal-800 dark:text-teal-200',
        preview: 'bg-teal-100',
        ariaLabelKey: 'colors.teal_aria',
        tooltipKey: 'colors.teal_tooltip'
    },
    pastelGray: {
        nameKey: 'colors.gray',
        value: 'pastelGray',
        background: 'bg-gray-50',
        border: 'border-gray-200 dark:border-slate-700',
        text: 'text-gray-800 dark:text-slate-200',
        preview: 'bg-gray-100',
        ariaLabelKey: 'colors.gray_aria',
        tooltipKey: 'colors.gray_tooltip'
    },
    pastelIndigo: {
        nameKey: 'colors.indigo',
        value: 'pastelIndigo',
        background: 'bg-indigo-50',
        border: 'border-indigo-200 dark:border-indigo-800',
        text: 'text-indigo-800 dark:text-indigo-200',
        preview: 'bg-indigo-100',
        ariaLabelKey: 'colors.indigo_aria',
        tooltipKey: 'colors.indigo_tooltip'
    },
    pastelEmerald: {
        nameKey: 'colors.emerald',
        value: 'pastelEmerald',
        background: 'bg-emerald-50',
        border: 'border-emerald-200 dark:border-emerald-800',
        text: 'text-emerald-800 dark:text-emerald-200',
        preview: 'bg-emerald-100',
        ariaLabelKey: 'colors.emerald_aria',
        tooltipKey: 'colors.emerald_tooltip'
    },
    pastelRose: {
        nameKey: 'colors.rose',
        value: 'pastelRose',
        background: 'bg-rose-50',
        border: 'border-rose-200 dark:border-rose-800',
        text: 'text-rose-800 dark:text-rose-200',
        preview: 'bg-rose-100',
        ariaLabelKey: 'colors.rose_aria',
        tooltipKey: 'colors.rose_tooltip'
    },
    pastelSky: {
        nameKey: 'colors.sky',
        value: 'pastelSky',
        background: 'bg-sky-50',
        border: 'border-sky-200 dark:border-sky-800',
        text: 'text-sky-800 dark:text-sky-200',
        preview: 'bg-sky-100 border-sky-300',
        ariaLabelKey: 'colors.sky_aria',
        tooltipKey: 'colors.sky_tooltip'
    },
    pastelAmber: {
        nameKey: 'colors.amber',
        value: 'pastelAmber',
        background: 'bg-amber-50',
        border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-800 dark:text-amber-200',
        preview: 'bg-amber-100',
        ariaLabelKey: 'colors.amber_aria',
        tooltipKey: 'colors.amber_tooltip'
    }
};

// Get all available colors, in the order presented by the picker's panel
// (Direction C's "Swatch Strip + Detail" order, as reviewed and approved).
export const getAvailableColors = (): CardColor[] => {
    return [
        'pastelWhite',
        'pastelBlue',
        'pastelGreen',
        'pastelYellow',
        'pastelRed',
        'pastelPurple',
        'pastelOrange',
        'pastelPink',
        'pastelTeal',
        'pastelGray',
        'pastelIndigo',
        'pastelEmerald',
        'pastelRose',
        'pastelSky',
        'pastelAmber'
    ];
};

// Get color configuration. Accepts any string (not just CardColor) so a raw,
// possibly-legacy stored value resolves safely — see `resolveCardColor`.
export const getColorConfig = (color: string): ColorConfig => {
    return CARD_COLORS[resolveCardColor(color)];
};

// Get card styling classes with enhanced specificity
export const getCardStyling = (color: string = 'pastelWhite'): string => {
    const config = getColorConfig(color);
    return `card-color-bg ${config.background} ${config.border} ${config.text}`;
};

// Check if color is a current, valid catalog member (post-curation).
export const isValidColor = (color: string): color is CardColor => {
    return color in CARD_COLORS;
};

// Get default color
export const getDefaultColor = (): CardColor => 'pastelWhite';

/**
 * Remaps a color curated away by spec 037 (FR-013) to its closest surviving
 * equivalent — see `specs/037-card-color-picker-redesign/data-model.md`'s
 * finalized "Color Catalog Curation Mapping" for the rationale behind each
 * pairing. This is the FR-013a contract: an existing card holding a
 * pre-curation value is never left broken, and is remapped to its closest
 * equivalent rather than reset to the neutral default (the latter would be
 * the *rejected* clarification option).
 */
const CURATED_COLOR_REMAP: Record<string, CardColor> = {
    pastelCyan: 'pastelTeal',
    pastelLime: 'pastelGreen',
    pastelSlate: 'pastelGray',
    pastelViolet: 'pastelPurple',
    pastelFuchsia: 'pastelPink',
    pastelMint: 'pastelTeal',
    pastelPeach: 'pastelOrange',
    pastelLavender: 'pastelPurple',
    pastelCream: 'pastelYellow',
    pastelCoral: 'pastelRed',
    pastelTurquoise: 'pastelTeal',
    pastelGold: 'pastelAmber',
    pastelSilver: 'pastelGray',
    pastelBronze: 'pastelOrange',
    pastelIvory: 'pastelWhite'
};

/**
 * Resolves any raw stored color value to a current, valid `CardColor`:
 * already-curated values pass through unchanged, colors removed by spec
 * 037's curation resolve to their closest equivalent (FR-013a), and any
 * other unrecognized value falls back to the neutral default. This is the
 * single source of truth every read of a card's stored `color` MUST go
 * through — `getColorConfig`/`getCardStyling` above, `getCardColorHex`
 * below, `validateColor`, and `GroupCard.tsx`'s own lookup.
 */
export const resolveCardColor = (raw: string | undefined | null): CardColor => {
    if (!raw) return getDefaultColor();
    if (isValidColor(raw)) return raw;
    return CURATED_COLOR_REMAP[raw] ?? getDefaultColor();
};

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

// Validate a raw stored color and provide a safe, current fallback —
// delegates to `resolveCardColor` so a curated-away value remaps to its
// closest equivalent (FR-013a) rather than resetting to neutral.
export const validateColor = (color: string | undefined | null): CardColor => {
    return resolveCardColor(color);
};

// Get hex color for PDF/DOCX export. Accepts any raw stored value.
export const getCardColorHex = (color: string): string => {
    const colorHexMap: Record<CardColor, string> = {
        pastelWhite: '#FFFFFF',
        pastelBlue: '#EFF6FF',
        pastelGreen: '#F0FDF4',
        pastelYellow: '#FEFCE8',
        pastelRed: '#FEF2F2',
        pastelPurple: '#FAF5FF',
        pastelOrange: '#FFF7ED',
        pastelPink: '#FDF2F8',
        pastelTeal: '#F0FDFA',
        pastelGray: '#F9FAFB',
        pastelIndigo: '#EEF2FF',
        pastelEmerald: '#ECFDF5',
        pastelRose: '#FFF1F2',
        pastelSky: '#F0F9FF',
        pastelAmber: '#FFFBEB'
    };

    return colorHexMap[resolveCardColor(color)];
};
