import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileDown, Settings, Check } from 'lucide-react';
import Button from '../ui/Button';
import { useExportPdf } from '../../hooks/useExportPdf';
import { ExportOptions } from '../../services/pdfExportService';
import { Retrospective } from '../../types/retrospective';
import { Card, CardGroup } from '../../types/card';

interface PdfExporterProps {
    retrospective: Retrospective;
    cards: Card[];
    groups: CardGroup[];
    participants: Array<{ name: string; joinedAt: Date }>;
    className?: string;
    variant?: 'button' | 'full';
}

interface ExportSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (options: ExportOptions) => void;
    isExporting: boolean;
}

const ExportSettingsModal: React.FC<ExportSettingsModalProps> = ({
    isOpen,
    onClose,
    onExport,
    isExporting
}) => {
    const [options, setOptions] = useState<ExportOptions>({
        includeParticipants: true,
        includeStatistics: true,
        includeGroupDetails: true
    });

    const handleExport = () => {
        onExport(options);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4"
            >
                <div className="p-6">
                    <div className="flex items-center space-x-2 mb-4">
                        <Settings className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            Opciones de Exportación
                        </h3>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <label htmlFor="includeParticipants" className="text-sm font-medium text-gray-700">
                                    Incluir participantes
                                </label>
                                <p className="text-xs text-gray-500">
                                    Lista de participantes y fechas de unión
                                </p>
                            </div>
                            <input
                                id="includeParticipants"
                                type="checkbox"
                                checked={options.includeParticipants}
                                onChange={(e) => setOptions(prev => ({
                                    ...prev,
                                    includeParticipants: e.target.checked
                                }))}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                aria-describedby="includeParticipants-desc"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <label htmlFor="includeStatistics" className="text-sm font-medium text-gray-700">
                                    Incluir estadísticas
                                </label>
                                <p id="includeStatistics-desc" className="text-xs text-gray-500">
                                    Resumen de tarjetas, votos y reacciones por columna
                                </p>
                            </div>
                            <input
                                id="includeStatistics"
                                type="checkbox"
                                checked={options.includeStatistics}
                                onChange={(e) => setOptions(prev => ({
                                    ...prev,
                                    includeStatistics: e.target.checked
                                }))}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                aria-describedby="includeStatistics-desc"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <label htmlFor="includeGroupDetails" className="text-sm font-medium text-gray-700">
                                    Detalles de grupos
                                </label>
                                <p id="includeGroupDetails-desc" className="text-xs text-gray-500">
                                    Estadísticas agregadas de cada grupo
                                </p>
                            </div>
                            <input
                                id="includeGroupDetails"
                                type="checkbox"
                                checked={options.includeGroupDetails}
                                onChange={(e) => setOptions(prev => ({
                                    ...prev,
                                    includeGroupDetails: e.target.checked
                                }))}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                aria-describedby="includeGroupDetails-desc"
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 mt-6 pt-4 border-t border-gray-200">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={isExporting}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleExport}
                            loading={isExporting}
                            className="flex-1 flex items-center space-x-2"
                        >
                            <FileDown className="w-4 h-4" />
                            <span>Exportar PDF</span>
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const PdfExporter: React.FC<PdfExporterProps> = ({
    retrospective,
    cards,
    groups,
    participants,
    className = '',
    variant = 'button'
}) => {
    const [showSettings, setShowSettings] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const { isExporting, error, exportToPdf } = useExportPdf({
        retrospective,
        cards,
        groups,
        participants
    });

    const handleQuickExport = async () => {
        try {
            await exportToPdf();
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    const handleExportWithOptions = async (options: ExportOptions) => {
        try {
            await exportToPdf(options);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    if (variant === 'button') {
        return (
            <>
                <div className={`flex items-center space-x-2 ${className}`}>
                    <Button
                        variant="outline"
                        onClick={handleQuickExport}
                        loading={isExporting}
                        disabled={cards.length === 0}
                        className="flex items-center space-x-2"
                        title="Exportar retrospectiva a PDF con configuración predeterminada"
                    >
                        <FileDown className="w-4 h-4" />
                        <span>Exportar PDF</span>
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={() => setShowSettings(true)}
                        disabled={isExporting || cards.length === 0}
                        className="p-2"
                        title="Configurar opciones de exportación"
                    >
                        <Settings className="w-4 h-4" />
                    </Button>
                </div>

                {/* Success indicator */}
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50"
                    >
                        <Check className="w-4 h-4" />
                        <span>PDF exportado exitosamente</span>
                    </motion.div>
                )}

                {/* Error indicator */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50"
                    >
                        Error: {error}
                    </motion.div>
                )}

                <ExportSettingsModal
                    isOpen={showSettings}
                    onClose={() => setShowSettings(false)}
                    onExport={handleExportWithOptions}
                    isExporting={isExporting}
                />
            </>
        );
    }

    // Full variant with detailed UI
    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${className}`}
            >
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <FileDown className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            Exportar Retrospectiva
                        </h3>
                        <p className="text-sm text-gray-600">
                            Genera un documento PDF con toda la información de la retrospectiva
                        </p>
                    </div>
                </div>

                {/* Export stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{cards.length}</div>
                        <div className="text-xs text-gray-500">Tarjetas</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{groups.length}</div>
                        <div className="text-xs text-gray-500">Grupos</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{participants.length}</div>
                        <div className="text-xs text-gray-500">Participantes</div>
                    </div>
                </div>

                {/* Export buttons */}
                <div className="space-y-3">
                    <Button
                        variant="primary"
                        onClick={handleQuickExport}
                        loading={isExporting}
                        disabled={cards.length === 0}
                        className="w-full flex items-center justify-center space-x-2"
                    >
                        <FileDown className="w-4 h-4" />
                        <span>Exportar PDF Completo</span>
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => setShowSettings(true)}
                        disabled={isExporting || cards.length === 0}
                        className="w-full flex items-center justify-center space-x-2"
                    >
                        <Settings className="w-4 h-4" />
                        <span>Exportar con Opciones Personalizadas</span>
                    </Button>
                </div>

                {cards.length === 0 && (
                    <p className="text-sm text-gray-500 text-center mt-4">
                        No hay tarjetas para exportar
                    </p>
                )}

                {/* Success indicator */}
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2"
                    >
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-800">
                            PDF exportado exitosamente
                        </span>
                    </motion.div>
                )}

                {/* Error indicator */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3"
                    >
                        <span className="text-sm text-red-800">
                            Error: {error}
                        </span>
                    </motion.div>
                )}
            </motion.div>

            <ExportSettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                onExport={handleExportWithOptions}
                isExporting={isExporting}
            />
        </>
    );
};

export default PdfExporter;
