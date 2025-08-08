/**
 * Test file for LinkifyText component functionality
 * This file demonstrates various use cases for the LinkifyText component
 */

import React from 'react';
import LinkifyText from '../src/components/ui/LinkifyText';

// Test cases for LinkifyText component
const testCases = [
    {
        name: 'Text without URLs',
        text: 'Esta es una tarjeta sin enlaces, solo texto normal.'
    },
    {
        name: 'Text with single HTTP URL',
        text: 'Visita nuestro sitio web en http://example.com para más información.'
    },
    {
        name: 'Text with single HTTPS URL',
        text: 'Visita nuestro sitio web en https://example.com para más información.'
    },
    {
        name: 'Text with multiple URLs',
        text: 'Puedes consultar https://docs.example.com o visitar http://example.com/demo'
    },
    {
        name: 'Text with URL at the beginning',
        text: 'https://example.com es un gran recurso para aprender.'
    },
    {
        name: 'Text with URL at the end',
        text: 'Para más información visita https://example.com'
    },
    {
        name: 'Text with mixed content',
        text: 'Tenemos documentación en https://docs.example.com y también puedes ver los ejemplos en http://examples.com/demo. Todo está disponible en línea.'
    },
    {
        name: 'Multiline text with URLs',
        text: 'Este es un texto largo\nque tiene múltiples líneas\ny contiene https://example.com en el medio\ny también http://test.com al final.'
    }
];

const LinkifyTextTests: React.FC = () => {
    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>LinkifyText Component Tests</h1>
            <p>Testing various scenarios for URL detection and rendering</p>

            {testCases.map((testCase, index) => (
                <div key={index} style={{ margin: '20px 0', padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
                    <h3>{testCase.name}</h3>
                    <div style={{ marginBottom: '10px' }}>
                        <strong>Input:</strong>
                        <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                            {testCase.text}
                        </pre>
                    </div>
                    <div>
                        <strong>Output:</strong>
                        <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', background: 'white' }}>
                            <LinkifyText text={testCase.text} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default LinkifyTextTests;
