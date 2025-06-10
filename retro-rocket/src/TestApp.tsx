import React from 'react';

const TestApp: React.FC = () => {
    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ color: 'green' }}>🚀 RetroRocket Test</h1>
            <p>Si ves este mensaje, React está funcionando correctamente!</p>
            <div style={{
                background: '#f0f8ff',
                padding: '10px',
                borderRadius: '5px',
                margin: '10px 0'
            }}>
                <h2>Estado de la aplicación:</h2>
                <ul>
                    <li>✅ React funcionando</li>
                    <li>✅ TypeScript compilando</li>
                    <li>✅ Vite sirviendo archivos</li>
                </ul>
            </div>
            <button
                onClick={() => alert('¡JavaScript funcionando!')}
                style={{
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer'
                }}
            >
                Probar JavaScript
            </button>
        </div>
    );
};

export default TestApp;
