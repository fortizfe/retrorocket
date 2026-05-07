import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthGuard } from './components/AuthGuard';
import Layout from './components/layout/Layout';
import NotFound from './pages/NotFound';
import Loading from './components/ui/Loading';

const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const RetrospectivePage = lazy(() => import('./pages/RetrospectivePage'));
const ColorSystemTest = lazy(() => import('./components/ColorSystemTest'));
const MetricsDashboard = lazy(() => import('./components/optimization/MetricsDashboard'));

const App: React.FC = () => {
  return (
    <AuthGuard>
      <Router>
        <Layout>
          <Suspense fallback={<Loading />}>
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
          </Suspense>
          {import.meta.env.DEV && (
            <Suspense fallback={null}>
              <MetricsDashboard />
            </Suspense>
          )}
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