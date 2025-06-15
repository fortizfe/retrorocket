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
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </Router>
    </AuthGuard>
  );
};

export default App;