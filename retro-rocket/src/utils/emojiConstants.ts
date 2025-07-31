// Categorías completas de emoticonos disponibles en la aplicación
export const EMOJI_CATEGORIES = {
    'Emociones': [
        '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
        '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
        '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
        '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
        '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
        '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'
    ],
    'Gestos': [
        '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
        '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏',
        '🙌', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂',
        '🦻', '👃', '🫀', '🫁', '🧠', '👀', '👁️', '👅', '👄', '💋'
    ],
    'Objetos': [
        '💡', '🔥', '⭐', '🌟', '💫', '⚡', '💥', '💢', '💦', '💧',
        '🌈', '☀️', '🌙', '⭐', '🌠', '☁️', '⛅', '⛈️', '🌤️', '🌦️',
        '🌧️', '❄️', '☃️', '⛄', '🌀', '🌊', '🔔', '🔕', '🎵', '🎶',
        '💯', '💥', '💫', '💦', '💨', '🎯', '💎', '🏆', '🥇', '🥈'
    ],
    'Actividades': [
        '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🪀',
        '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁',
        '🎣', '🤿', '🎿', '🛷', '🥌', '🎯', '🪀', '🪩', '🎪', '🎨',
        '🎭', '🪄', '🎮', '🕹️', '🎲', '🧩', '🎳', '🎯', '🎪', '🎢'
    ],
    'Comida': [
        '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒',
        '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬',
        '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠',
        '🥐', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇'
    ],
    'Símbolos': [
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
        '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
        '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
        '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺'
    ]
};

// Lista plana de todos los emoticonos disponibles
export const ALL_EMOJIS = Object.values(EMOJI_CATEGORIES).flat();

// Función para obtener todos los emoticonos disponibles
export const getAllEmojis = (): string[] => ALL_EMOJIS;

// Función para obtener emoticonos por categoría
export const getEmojisByCategory = (category: keyof typeof EMOJI_CATEGORIES): string[] => {
    return EMOJI_CATEGORIES[category] || [];
};

// Función para obtener todas las categorías
export const getEmojiCategories = (): (keyof typeof EMOJI_CATEGORIES)[] => {
    return Object.keys(EMOJI_CATEGORIES) as (keyof typeof EMOJI_CATEGORIES)[];
};
