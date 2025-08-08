import React from 'react';
import { useLanguage } from '../hooks/useLanguage';

const NotFound: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-4xl font-bold">{t('notFound.title')}</h1>
            <p className="mt-4 text-lg">{t('notFound.message')}</p>
            <a href="/" className="mt-6 text-blue-500 hover:underline">
                {t('notFound.goHome')}
            </a>
        </div>
    );
};

export default NotFound;