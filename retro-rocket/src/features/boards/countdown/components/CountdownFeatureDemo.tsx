import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Componente de demostración para mostrar las capacidades del Countdown Timer
 * Este componente puede ser usado para presentar las funcionalidades implementadas
 *
 * NOTE: not reachable from any app route (only referenced by its own test file).
 * Only the 4 timer-status labels are internationalized here per the constitution
 * compliance audit scope; the rest of this demo/presentation copy remains
 * hardcoded Spanish and is tracked as a follow-up, not part of this effort.
 */
const CountdownFeatureDemo: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
            >
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    🚀 Modo Facilitador - Countdown Timer
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                    Control avanzado de temporizador para retrospectivas Scrum
                </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Para Facilitadores */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border-2 border-blue-200 dark:border-blue-800"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <Settings className="w-6 h-6 text-blue-600" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Para Facilitadores
                        </h3>
                    </div>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                        <li>✅ Configurar tiempo (min:seg)</li>
                        <li>▶️ Iniciar temporizador</li>
                        <li>⏸️ Pausar cuando necesario</li>
                        <li>🔄 Reiniciar fácilmente</li>
                        <li>🗑️ Eliminar completamente</li>
                        <li>🎛️ Panel de control exclusivo</li>
                    </ul>
                </motion.div>

                {/* Para Participantes */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border-2 border-green-200 dark:border-green-800"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <Users className="w-6 h-6 text-green-600" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Para Participantes
                        </h3>
                    </div>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                        <li>👁️ Ver temporizador en tiempo real</li>
                        <li>🔄 Sincronización automática</li>
                        <li>📊 Barra de progreso visual</li>
                        <li>🚨 Notificación al terminar</li>
                        <li>📱 Responsive en móvil</li>
                    </ul>
                </motion.div>

                {/* Características Técnicas */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border-2 border-purple-200 dark:border-purple-800"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <Clock className="w-6 h-6 text-purple-600" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Características
                        </h3>
                    </div>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                        <li>🔒 Seguridad con Firestore</li>
                        <li>🎨 Estados visuales claros</li>
                        <li>🌙 Modo oscuro completo</li>
                        <li>♿ Navegación accesible</li>
                        <li>🎭 Animaciones suaves</li>
                    </ul>
                </motion.div>
            </div>

            {/* Estados del Temporizador */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6"
            >
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
                    Estados Visuales del Temporizador
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-200 dark:bg-gray-600 rounded-lg">
                        <div className="w-4 h-4 bg-gray-500 rounded-full mx-auto mb-2"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('countdown.demo.states.stopped')}</span>
                    </div>
                    <div className="text-center p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-2"></div>
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">{t('countdown.demo.states.running')}</span>
                    </div>
                    <div className="text-center p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                        <div className="w-4 h-4 bg-yellow-500 rounded-full mx-auto mb-2"></div>
                        <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">{t('countdown.demo.states.paused')}</span>
                    </div>
                    <div className="text-center p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <div className="w-4 h-4 bg-red-500 rounded-full mx-auto mb-2 animate-pulse"></div>
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">{t('countdown.demo.states.finished')}</span>
                    </div>
                </div>
            </motion.div>

            {/* Instrucciones de Uso */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800"
            >
                <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
                    📋 Cómo Usar el Countdown Timer
                </h3>
                <ol className="space-y-2 text-blue-800 dark:text-blue-200">
                    <li><strong>1.</strong> Como facilitador, crea una nueva retrospectiva</li>
                    <li><strong>2.</strong> Verás el panel "Controles de Facilitador" debajo de la cabecera</li>
                    <li><strong>3.</strong> Configura el tiempo deseado (minutos y segundos)</li>
                    <li><strong>4.</strong> Haz clic en "Crear" para configurar el temporizador</li>
                    <li><strong>5.</strong> Usa "Iniciar" para comenzar la cuenta atrás</li>
                    <li><strong>6.</strong> Todos los participantes verán el temporizador en la cabecera</li>
                    <li><strong>7.</strong> Pausa, reinicia o elimina según necesites durante la sesión</li>
                    <li><strong>8.</strong> Usa "Eliminar" para remover completamente el temporizador</li>
                </ol>
            </motion.div>
        </div>
    );
};

export default CountdownFeatureDemo;
