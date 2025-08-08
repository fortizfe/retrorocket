// Mock react-i18next
export const useTranslation = () => ({
    t: (key: string, options?: any) => {
        // Simple key-based translation for tests
        const translations: Record<string, string> = {
            'header.myBoards': 'Mis Tableros',
            'header.profile': 'Perfil',
            'header.signOut': 'Cerrar Sesión',
            'header.user': 'Usuario',
            'header.closeMenu': 'Cerrar menú',
            'retrospective.whatWentWell': '¿Qué fue bien?',
            'retrospective.whatWentWrong': '¿Qué fue mal?',
            'retrospective.actionItems': 'Elementos de Acción',
            'retrospective.improvements': '¿Qué podemos mejorar?',
            // Add more translations as needed for tests
        };
        return options ? `${translations[key] || key} ${JSON.stringify(options)}` : translations[key] || key;
    },
    i18n: {
        changeLanguage: jest.fn(),
        language: 'es',
    },
});

export const Trans = ({ children }: { children: React.ReactNode }) => children;

export const initReactI18next = {
    type: '3rdParty',
    init: jest.fn(),
};
