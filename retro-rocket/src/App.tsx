import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import AuthWrapper from '@/features/auth/components/AuthWrapper';
import Layout from '@/lib/components/layout/Layout';
import { SentimentStoreProvider } from '@/features/boards/sentiment';
import { BoardDataStoreProvider } from '@/features/boards/retrospective/contexts/BoardDataContext';
import NotFound from '@/pages/NotFound';
import Loading from '@/lib/components/ui/Loading';

const Landing = lazy(() => import('@/pages/Landing'));
const Guide = lazy(() => import('@/pages/Guide'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Profile = lazy(() => import('@/pages/Profile'));
const Teams = lazy(() => import('@/pages/Teams'));
const TeamDetail = lazy(() => import('@/pages/TeamDetail'));
const RetrospectivePage = lazy(() => import('@/pages/RetrospectivePage'));
const McpConsentScreen = lazy(() => import('@/features/auth/components/McpConsentScreen'));
const ColorSystemTest = lazy(() => import('@/features/dev-tools/components/ColorSystemTest'));
const MetricsDashboard = lazy(() => import('@/features/dev-tools/components/MetricsDashboard'));

const App: React.FC = () => {
  return (
    // reducedMotion="user" makes every framer-motion animation in the app
    // honor prefers-reduced-motion automatically (spec 028, research.md R2).
    <MotionConfig reducedMotion="user">
    <AuthGuard>
      <Router>
        <BoardDataStoreProvider>
        <SentimentStoreProvider>
        <Layout>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              {/* Public, no-sign-in-required guide (spec 057, FR-002) — not
                  wrapped in AuthWrapper at the route level, matching how
                  "/" and "/dashboard" are registered here (unlike
                  "/mcp/consent"'s explicit <AuthWrapper requireAuth={true}>). */}
              <Route path="/guide" element={<Guide />} />
              {/* Deep-linkable guide topics (spec 057, research.md Decision
                  2) — Guide/GuidePage branches internally via
                  useActiveGuideTopic(), so both routes render the same
                  element. */}
              <Route path="/guide/:topicSlug" element={<Guide />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/mis-tableros" element={<Dashboard />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/teams/:id" element={<TeamDetail />} />
              <Route
                path="/mcp/consent"
                element={
                  <AuthWrapper requireAuth={true}>
                    <McpConsentScreen />
                  </AuthWrapper>
                }
              />
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
    </MotionConfig>
  );
};

export default App;