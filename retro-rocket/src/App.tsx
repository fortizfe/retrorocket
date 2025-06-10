import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthGuard } from './components/AuthGuard';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import RetrospectivePage from './pages/RetrospectivePage';
import NotFound from './pages/NotFound';

const App: React.FC = () => {
  return (
    <AuthGuard>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/retrospective/:id" element={<RetrospectivePage />} />
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