import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthGuard } from './components/AuthGuard';
import Layout from './components/layout/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import RetrospectivePage from './pages/RetrospectivePage';
import NotFound from './pages/NotFound';
import ColorSystemTest from './components/ColorSystemTest';

const App: React.FC = () => {
  return (
    <AuthGuard>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/mis-tableros" element={<Dashboard />} />
            <Route path="/perfil" element={<Profile />} />
            <Route path="/retrospective/:id" element={<RetrospectivePage />} />
            <Route path="/retro/:id" element={<RetrospectivePage />} />
            <Route path="/color-test" element={<ColorSystemTest />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgb(51 65 85)', // slate-700
              color: '#fff',
              borderRadius: '8px',
              border: '1px solid rgb(71 85 105)', // slate-600
            },
            success: {
              style: {
                background: 'rgb(34 197 94)', // green-500
              },
            },
            error: {
              style: {
                background: 'rgb(239 68 68)', // red-500
              },
            },
          }}
        />
      </Router>
    </AuthGuard>
  );
};

export default App;