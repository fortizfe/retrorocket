import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ColorSystemTest from './components/ColorSystemTest';
import RetrospectivePage from './pages/RetrospectivePage';

const RouterApp: React.FC = () => {
    return (
        <Router>
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        🚀 RetroRocket con Router
                    </h1>

                    {/* Navigation */}
                    <nav className="mb-6">
                        <Link
                            to="/"
                            className="mr-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Home
                        </Link>
                        <Link
                            to="/color-test"
                            className="mr-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                            Color System Test
                        </Link>
                        <Link
                            to="/retro/demo"
                            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                        >
                            Demo Retrospective
                        </Link>
                    </nav>

                    <Routes>
                        <Route path="/" element={
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <h2 className="text-2xl font-semibold mb-4">Home</h2>
                                <p className="text-gray-700">
                                    React Router funcionando correctamente.
                                </p>
                            </div>
                        } />
                        <Route path="/color-test" element={<ColorSystemTest />} />
                        <Route path="/retro/:id" element={<RetrospectivePage />} />
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
