import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const RouterApp: React.FC = () => {
    return (
        <Router>
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        🚀 RetroRocket con Router
                    </h1>
                    <Routes>
                        <Route path="/" element={
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <h2 className="text-2xl font-semibold mb-4">Home</h2>
                                <p className="text-gray-700">
                                    React Router funcionando correctamente.
                                </p>
                            </div>
                        } />
                        <Route path="*" element={
                            <div className="bg-red-50 rounded-lg border border-red-200 p-6">
                                <h2 className="text-2xl font-semibold mb-4 text-red-800">404</h2>
                                <p className="text-red-700">Página no encontrada</p>
                            </div>
                        } />
                    </Routes>
                </div>
            </div>
        </Router>
    );
};

export default RouterApp;
