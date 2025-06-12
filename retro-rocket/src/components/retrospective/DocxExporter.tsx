import React, { useState } from 'react';
import { FileText, Download, Settings, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Retrospective } from '../../types/retrospective';
import { Card, CardGroup } from '../../types/card';
import { useExportDocx } from '../../hooks/useExportDocx';

interface DocxExporterProps {
    retrospective: Retrospective;
    cards: Card[];
    groups: CardGroup[];
    participants: Array<{ name: string; joinedAt: Date }>;
    variant?: 'button' | 'full';
    className?: string;
}

interface ExportSettings {
    includeParticipants: boolean;
    includeStatistics: boolean;
    includeGroupDetails: boolean;
    includeFacilitatorNotes: boolean;
    facilitatorNotes: string;
}

const DocxExporter: React.FC<DocxExporterProps> = ({
    retrospective,
    cards,
    groups,
    participants,
    variant = 'button',
    className = ''
}) => {
    const { isExporting, progress, error, success, exportToDocx } = useExportDocx();
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState<ExportSettings>({
        includeParticipants: true,
        includeStatistics: true,
        includeGroupDetails: true,
        includeFacilitatorNotes: false,
        facilitatorNotes: ''
    });

    const handleExport = async () => {
        const exportData = {
            retrospective,
            cards,
            groups,
            participants
        };

        const exportOptions = {
            includeParticipants: settings.includeParticipants,
            includeStatistics: settings.includeStatistics,
            includeGroupDetails: settings.includeGroupDetails,
            includeFacilitatorNotes: settings.includeFacilitatorNotes,
            facilitatorNotes: settings.facilitatorNotes.trim() || undefined
        };

        await exportToDocx(exportData, exportOptions);
        setShowSettings(false);
    };

    const handleQuickExport = async () => {
        const exportData = {
            retrospective,
            cards,
            groups,
            participants
        };

        await exportToDocx(exportData, {
            includeParticipants: true,
            includeStatistics: true,
            includeGroupDetails: true
        });
    };

    if (variant === 'button') {
        return (
            <div className={`relative ${className}`}>
                <div className="flex items-center gap-2">
                    {/* Quick Export Button */}
                    <motion.button
                        onClick={handleQuickExport}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-medium rounded-lg shadow-md transition-all duration-200 hover:shadow-lg active:scale-95"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {isExporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <FileText className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">
                            {isExporting ? 'Exportando...' : 'Word'}
                        </span>
                    </motion.button>

                    {/* Settings Button */}
                    <motion.button
                        onClick={() => setShowSettings(true)}
                        disabled={isExporting}
                        className="flex items-center justify-center w-10 h-10 bg-emerald-100 hover:bg-emerald-200 disabled:bg-gray-200 text-emerald-700 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg active:scale-95"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        title="Opciones de exportación"
                    >
                        <Settings className="w-4 h-4" />
                    </motion.button>
                </div>

                {/* Progress Bar */}
                <AnimatePresence>
                    {isExporting && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border p-3 z-50"
                        >
                            <div className="flex items-center gap-3">
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900 mb-1">
                                        Generando documento Word...
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <motion.div
                                            className="bg-emerald-600 h-2 rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Success/Error Messages */}
                <AnimatePresence>
                    {(success || error) && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border p-3 z-50"
                        >
                            {success && (
                                <div className="flex items-center gap-2 text-emerald-600">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="text-sm font-medium">
                                        ¡Documento exportado correctamente!
                                    </span>
                                </div>
                            )}
                            {error && (
                                <div className="flex items-center gap-2 text-red-600">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-sm font-medium">{error}</span>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Settings Modal */}
                <AnimatePresence>
                    {showSettings && (
                        <div className="fixed inset-0 z-50 overflow-y-auto">
                            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                                    onClick={() => setShowSettings(false)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"
                                >
                                    <div>
                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                                            <FileText className="h-6 w-6 text-emerald-600" />
                                        </div>
                                        <div className="mt-3 text-center sm:mt-5">
                                            <h3 className="text-lg font-semibold leading-6 text-gray-900">
                                                Exportar a Word (.docx)
                                            </h3>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500">
                                                    Configura las opciones para tu documento
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 space-y-4">
                                        <div className="space-y-3">
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.includeParticipants}
                                                    onChange={(e) => setSettings(prev => ({
                                                        ...prev,
                                                        includeParticipants: e.target.checked
                                                    }))}
                                                    className="mr-3 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                                                />
                                                <span className="text-sm font-medium text-gray-700">
                                                    Incluir lista de participantes
                                                </span>
                                            </label>

                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.includeStatistics}
                                                    onChange={(e) => setSettings(prev => ({
                                                        ...prev,
                                                        includeStatistics: e.target.checked
                                                    }))}
                                                    className="mr-3 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                                                />
                                                <span className="text-sm font-medium text-gray-700">
                                                    Incluir estadísticas de votación
                                                </span>
                                            </label>

                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.includeGroupDetails}
                                                    onChange={(e) => setSettings(prev => ({
                                                        ...prev,
                                                        includeGroupDetails: e.target.checked
                                                    }))}
                                                    className="mr-3 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                                                />
                                                <span className="text-sm font-medium text-gray-700">
                                                    Mostrar detalles de agrupaciones
                                                </span>
                                            </label>

                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.includeFacilitatorNotes}
                                                    onChange={(e) => setSettings(prev => ({
                                                        ...prev,
                                                        includeFacilitatorNotes: e.target.checked
                                                    }))}
                                                    className="mr-3 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                                                />
                                                <span className="text-sm font-medium text-gray-700">
                                                    Agregar notas del facilitador
                                                </span>
                                            </label>
                                        </div>

                                        {settings.includeFacilitatorNotes && (
                                            <div>
                                                <label htmlFor="facilitator-notes" className="block text-sm font-medium text-gray-700 mb-2">
                                                    Notas del facilitador
                                                </label>
                                                <textarea
                                                    id="facilitator-notes"
                                                    rows={4}
                                                    value={settings.facilitatorNotes}
                                                    onChange={(e) => setSettings(prev => ({
                                                        ...prev,
                                                        facilitatorNotes: e.target.value
                                                    }))}
                                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                                    placeholder="Escribe aquí las notas adicionales para incluir en el documento..."
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 sm:flex sm:flex-row-reverse gap-3">
                                        <motion.button
                                            onClick={handleExport}
                                            disabled={isExporting}
                                            className="inline-flex w-full justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:bg-gray-400 sm:w-auto"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {isExporting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Exportando...
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="w-4 h-4 mr-2" />
                                                    Exportar DOCX
                                                </>
                                            )}
                                        </motion.button>
                                        <motion.button
                                            type="button"
                                            onClick={() => setShowSettings(false)}
                                            disabled={isExporting}
                                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:bg-gray-100 sm:mt-0 sm:w-auto"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            Cancelar
                                        </motion.button>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // Full variant (for dedicated export pages)
    return (
        <div className={`space-y-6 ${className}`}>
            <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-emerald-600" />
                <h2 className="mt-2 text-lg font-semibold text-gray-900">
                    Exportar a Microsoft Word
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                    Genera un documento profesional con toda la información de tu retrospectiva
                </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                    Opciones de exportación
                </h3>

                <div className="space-y-4">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={settings.includeParticipants}
                            onChange={(e) => setSettings(prev => ({
                                ...prev,
                                includeParticipants: e.target.checked
                            }))}
                            className="mr-3 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">
                            Incluir lista de participantes
                        </span>
                    </label>

                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={settings.includeStatistics}
                            onChange={(e) => setSettings(prev => ({
                                ...prev,
                                includeStatistics: e.target.checked
                            }))}
                            className="mr-3 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">
                            Incluir estadísticas de votación
                        </span>
                    </label>

                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={settings.includeGroupDetails}
                            onChange={(e) => setSettings(prev => ({
                                ...prev,
                                includeGroupDetails: e.target.checked
                            }))}
                            className="mr-3 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">
                            Mostrar detalles de agrupaciones
                        </span>
                    </label>

                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={settings.includeFacilitatorNotes}
                            onChange={(e) => setSettings(prev => ({
                                ...prev,
                                includeFacilitatorNotes: e.target.checked
                            }))}
                            className="mr-3 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">
                            Agregar notas del facilitador
                        </span>
                    </label>

                    {settings.includeFacilitatorNotes && (
                        <div>
                            <label htmlFor="facilitator-notes-full" className="block text-sm font-medium text-gray-700 mb-2">
                                Notas del facilitador
                            </label>
                            <textarea
                                id="facilitator-notes-full"
                                rows={4}
                                value={settings.facilitatorNotes}
                                onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    facilitatorNotes: e.target.value
                                }))}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                placeholder="Escribe aquí las notas adicionales para incluir en el documento..."
                            />
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    <motion.button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="w-full flex justify-center items-center gap-3 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-medium rounded-lg shadow-md transition-all duration-200 hover:shadow-lg active:scale-95"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Generando documento...
                            </>
                        ) : (
                            <>
                                <Download className="w-5 h-5" />
                                Exportar a Word (.docx)
                            </>
                        )}
                    </motion.button>
                </div>

                {/* Progress */}
                {isExporting && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                            <span>Progreso</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                                className="bg-emerald-600 h-2 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    </div>
                )}

                {/* Success/Error Messages */}
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-lg"
                    >
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">¡Documento exportado correctamente!</span>
                    </motion.div>
                )}

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg"
                    >
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-medium">{error}</span>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default DocxExporter;
