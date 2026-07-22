import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import Layout from '@/lib/components/layout/Layout';
import { SentimentStoreProvider } from '@/features/boards/sentiment/contexts/SentimentContext';
import { BoardDataStoreProvider } from '@/features/boards/retrospective/contexts/BoardDataContext';
import NotFound from '@/pages/NotFound';
import Loading from '@/lib/components/ui/Loading';

const Landing = lazy(() => import('@/pages/Landing'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Profile = lazy(() => import('@/pages/Profile'));
const RetrospectivePage = lazy(() => import('@/pages/RetrospectivePage'));
const ColorSystemTest = lazy(() => import('@/features/dev-tools/components/ColorSystemTest'));
const MetricsDashboard = lazy(() => import('@/features/dev-tools/components/MetricsDashboard'));

const App: React.FC = () => {
  return (
    <AuthGuard>
      <Router>
        <BoardDataStoreProvider>
        <SentimentStoreProvider>
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
        </SentimentStoreProvider>
        </BoardDataStoreProvider>
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
                // green-700: white text meets WCAG 2.1 AA (~5.9:1); green-500 did not.
                background: 'rgb(21 128 61)',
                color: '#fff',
              },
            },
            error: {
              style: {
                // red-700: white text meets WCAG 2.1 AA (~5.9:1); red-500 did not.
                background: 'rgb(185 28 28)',
                color: '#fff',
              },
            },
          }}
        />
      </Router>
    </AuthGuard>
  );
};

export default App;