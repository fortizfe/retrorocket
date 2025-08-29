import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import './i18n/config';
import { FirebaseMetricsService } from './services/optimization/FirebaseMetricsService';

// Configurar métricas de Firebase para monitoreo
if (import.meta.env.PROD) {
  // En producción, configurar alertas más restrictivas
  FirebaseMetricsService.setupAlerts(
    {
      readsPerMinute: 50,
      writesPerMinute: 30,
      errorRate: 0.03
    },
    (alert) => {
      console.warn('🔥 Firebase Alert:', {
        type: alert.type,
        value: alert.value.toFixed(2),
        threshold: alert.threshold,
        timestamp: new Date().toISOString()
      });
      // En producción, esto se enviaría a un servicio de monitoreo como Sentry
    }
  );
} else {
  // En desarrollo, alertas más flexibles para testing
  FirebaseMetricsService.setupAlerts(
    {
      readsPerMinute: 100,
      writesPerMinute: 50,
      errorRate: 0.05
    },
    (alert) => console.warn('Firebase Alert:', alert)
  );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);