import React from 'react';

const MinimalApp: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    🚀 RetroRocket
                </h1>
                <p className="text-xl text-gray-600 mb-8">
                    Retrospectivas modernas para equipos Scrum
                </p>
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-semibold mb-4">Aplicación funcionando</h2>
                    <p className="text-gray-700">
                        Esta es una versión mínima de RetroRocket con Tailwind CSS funcionando.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MinimalApp;
