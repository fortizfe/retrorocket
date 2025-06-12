import React, { useState } from 'react';
import {
    Download,
    Settings,
    X,
    FileText,
    File,
    CheckCircle,
    AlertCircle,
    Loader2,
    User,
    Heart,
    BarChart3,
    SortAsc,
    FileImage
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Retrospective } from '../../types/retrospective';
import { Card, CardGroup } from '../../types/card';
import { UnifiedExportOptions, ExportFormat, SortOrder } from '../../types/export';
import { useUnifiedExport } from '../../hooks/useUnifiedExport';
import { UnifiedExportService } from '../../services/unifiedExportService';

interface UnifiedExporterProps {
    retrospective: Retrospective;
    cards: Card[];
    groups: CardGroup[];
    participants: Array<{ name: string; joinedAt: Date }>;
    variant?: 'button' | 'full';
    className?: string;
}

const UnifiedExporter: React.FC<UnifiedExporterProps> = ({
    retrospective,
    cards,
    groups,
    participants,
    variant = 'button',
    className = ''
}) => {
    const { isExporting, progress, error, success, currentFormat, exportRetrospective } = useUnifiedExport();
    const [showModal, setShowModal] = useState(false);
    const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
    const [options, setOptions] = useState<UnifiedExportOptions>({
        format: 'pdf',
        documentTitle: retrospective.title,
        customTitle: retrospective.title,
        includeRetroRocketLogo: true,
        includeParticipants: true,
        includeStatistics: true,
        includeCardAuthors: true,
        includeReactions: true,
        includeGroupDetails: true,
        sortOrder: 'original',
        includeFacilitatorNotes: false,
        facilitatorNotes: '',
        pdfOptions: {
            pageSize: 'a4',
            orientation: 'portrait'
        },
        txtOptions: {
            encoding: 'utf-8',
            lineEnding: 'unix'
        }
    });

    const formats = UnifiedExportService.getAvailableFormats();
    const sortOrders = UnifiedExportService.getSortOrders();

    const handleFormatChange = (format: ExportFormat) => {
        setSelectedFormat(format);
        setOptions(prev => ({ ...prev, format }));
    };

    const handleExport = async () => {
        const exportData = {
            retrospective,
            cards,
            groups,
            participants
        };

        const finalOptions = {
            ...options,
            format: selectedFormat
        };

        await exportRetrospective(exportData, finalOptions);
        setShowModal(false);
    };

    const handleQuickExport = async (format: ExportFormat) => {
        const exportData = {
            retrospective,
            cards,
            groups,
            participants
        };

        const quickOptions: UnifiedExportOptions = {
            format,
            documentTitle: retrospective.title,
            includeRetroRocketLogo: true,
            includeParticipants: true,
            includeStatistics: true,
            includeCardAuthors: true,
            includeReactions: true,
            includeGroupDetails: true,
            sortOrder: 'original',
            includeFacilitatorNotes: false
        };

        await exportRetrospective(exportData, quickOptions);
    };

    const getFormatIcon = (format: ExportFormat) => {
        switch (format) {
            case 'pdf':
                return <File className="w-5 h-5" />;
            case 'txt':
                return <FileText className="w-5 h-5" />;
            default:
                return <Download className="w-5 h-5" />;
        }
    };

    const getFormatColor = (format: ExportFormat) => {
        switch (format) {
            case 'pdf':
                return 'bg-red-600 hover:bg-red-700';
            case 'txt':
                return 'bg-gray-600 hover:bg-gray-700';
            default:
                return 'bg-gray-600 hover:bg-gray-700';
        }
    };

    if (variant === 'button') {
        return (
            <div className={`relative ${className}`}>
                <div className="flex items-center gap-2">
                    {/* Quick Export Buttons */}
                    <motion.button
                        onClick={() => handleQuickExport('pdf')}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg shadow-md transition-all duration-200 hover:shadow-lg active:scale-95"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        title="Exportar rápido a PDF"
                    >
                        {isExporting && currentFormat === 'pdf' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <File className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">PDF</span>
                    </motion.button>

                    <motion.button
                        onClick={() => handleQuickExport('txt')}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-medium rounded-lg shadow-md transition-all duration-200 hover:shadow-lg active:scale-95"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        title="Exportar rápido a TXT"
                    >
                        {isExporting && currentFormat === 'txt' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <FileText className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">TXT</span>
                    </motion.button>

                    {/* Settings Button */}
                    <motion.button
                        onClick={() => setShowModal(true)}
                        disabled={isExporting}
                        className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-200 text-gray-700 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg active:scale-95"
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
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900 mb-1">
                                        Exportando a {currentFormat?.toUpperCase()}...
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <motion.div
                                            className="bg-blue-600 h-2 rounded-full"
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
                                <div className="flex items-center gap-2 text-green-600">
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

                {/* Unified Export Modal */}
                <AnimatePresence>
                    {showModal && (
                        <div className="fixed inset-0 z-50 overflow-y-auto">
                            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                                    onClick={() => setShowModal(false)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl"
                                >
                                    {/* Modal Header */}
                                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
                                                <Download className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    Exportar Retrospectiva
                                                </h3>
                                                <p className="text-sm text-gray-500">
                                                    Configura las opciones para tu documento
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowModal(false)}
                                            className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                            title="Cerrar modal"
                                            aria-label="Cerrar modal de exportación"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="p-6 space-y-6">
                                        {/* Format Selection */}
                                        <div>
                                            <fieldset className="space-y-3">
                                                <legend className="text-sm font-medium text-gray-700 mb-3">
                                                    Formato de exportación
                                                </legend>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {formats.map((format) => (
                                                        <motion.button
                                                            key={format.value}
                                                            onClick={() => handleFormatChange(format.value)}
                                                            className={`p-4 rounded-lg border-2 text-left transition-all ${selectedFormat === format.value
                                                                ? 'border-blue-500 bg-blue-50'
                                                                : 'border-gray-200 hover:border-gray-300'
                                                                }`}
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                        >
                                                            <div className="flex items-center gap-3 mb-2">
                                                                {getFormatIcon(format.value)}
                                                                <span className="font-medium">{format.label}</span>
                                                            </div>
                                                            <p className="text-sm text-gray-600">{format.description}</p>
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            </fieldset>
                                        </div>

                                        {/* Document Settings */}
                                        <div className="border-t pt-6">
                                            <h4 className="text-sm font-medium text-gray-900 mb-4">Configuración del documento</h4>
                                            <div className="space-y-4">
                                                <div>
                                                    <label htmlFor="custom-title" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Título personalizado
                                                    </label>
                                                    <input
                                                        id="custom-title"
                                                        type="text"
                                                        value={options.customTitle}
                                                        onChange={(e) => setOptions(prev => ({ ...prev, customTitle: e.target.value }))}
                                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                        placeholder="Título de la retrospectiva"
                                                    />
                                                </div>

                                                <label className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={options.includeRetroRocketLogo}
                                                        onChange={(e) => setOptions(prev => ({ ...prev, includeRetroRocketLogo: e.target.checked }))}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                        aria-describedby="logo-description"
                                                    />
                                                    <FileImage className="w-4 h-4 text-gray-500" />
                                                    <span className="text-sm font-medium text-gray-700" id="logo-description">
                                                        Incluir logo de RetroRocket
                                                    </span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Content Options */}
                                        <div className="border-t pt-6">
                                            <h4 className="text-sm font-medium text-gray-900 mb-4">Contenido a incluir</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <label className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={options.includeParticipants}
                                                        onChange={(e) => setOptions(prev => ({ ...prev, includeParticipants: e.target.checked }))}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <User className="w-4 h-4 text-gray-500" />
                                                    <span className="text-sm font-medium text-gray-700">
                                                        Lista de participantes
                                                    </span>
                                                </label>

                                                <label className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={options.includeStatistics}
                                                        onChange={(e) => setOptions(prev => ({ ...prev, includeStatistics: e.target.checked }))}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <BarChart3 className="w-4 h-4 text-gray-500" />
                                                    <span className="text-sm font-medium text-gray-700">
                                                        Estadísticas
                                                    </span>
                                                </label>

                                                <label className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={options.includeCardAuthors}
                                                        onChange={(e) => setOptions(prev => ({ ...prev, includeCardAuthors: e.target.checked }))}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <User className="w-4 h-4 text-gray-500" />
                                                    <span className="text-sm font-medium text-gray-700">
                                                        Autores de tarjetas
                                                    </span>
                                                </label>

                                                <label className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={options.includeReactions}
                                                        onChange={(e) => setOptions(prev => ({ ...prev, includeReactions: e.target.checked }))}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <Heart className="w-4 h-4 text-gray-500" />
                                                    <span className="text-sm font-medium text-gray-700">
                                                        Likes y reacciones
                                                    </span>
                                                </label>

                                                <label className="flex items-center gap-3 col-span-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={options.includeGroupDetails}
                                                        onChange={(e) => setOptions(prev => ({ ...prev, includeGroupDetails: e.target.checked }))}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">
                                                        Detalles de agrupaciones de tarjetas
                                                    </span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Sorting Options */}
                                        <div className="border-t pt-6">
                                            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                                                <SortAsc className="w-4 h-4" />
                                                Ordenamiento de tarjetas
                                            </h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                {sortOrders.map((sortOrder) => (
                                                    <label key={sortOrder.value} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="sortOrder"
                                                            value={sortOrder.value}
                                                            checked={options.sortOrder === sortOrder.value}
                                                            onChange={(e) => setOptions(prev => ({ ...prev, sortOrder: e.target.value as SortOrder }))}
                                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                            aria-label={`Ordenar ${sortOrder.label}`}
                                                        />
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-700">{sortOrder.label}</div>
                                                            <div className="text-xs text-gray-500">{sortOrder.description}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Facilitator Notes */}
                                        <div className="border-t pt-6">
                                            <label className="flex items-center gap-3 mb-4">
                                                <input
                                                    type="checkbox"
                                                    checked={options.includeFacilitatorNotes}
                                                    onChange={(e) => setOptions(prev => ({ ...prev, includeFacilitatorNotes: e.target.checked }))}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                                <span className="text-sm font-medium text-gray-700">
                                                    Agregar notas del facilitador
                                                </span>
                                            </label>

                                            {options.includeFacilitatorNotes && (
                                                <textarea
                                                    value={options.facilitatorNotes}
                                                    onChange={(e) => setOptions(prev => ({ ...prev, facilitatorNotes: e.target.value }))}
                                                    rows={4}
                                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                    placeholder="Escribe aquí las notas adicionales para incluir en el documento..."
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Modal Footer */}
                                    <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
                                        <motion.button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            disabled={isExporting}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            Cancelar
                                        </motion.button>
                                        <motion.button
                                            onClick={handleExport}
                                            disabled={isExporting}
                                            className={`inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 ${getFormatColor(selectedFormat)}`}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {isExporting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Exportando...
                                                </>
                                            ) : (
                                                <>
                                                    {getFormatIcon(selectedFormat)}
                                                    Exportar {formats.find(f => f.value === selectedFormat)?.label}
                                                </>
                                            )}
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
                <Download className="mx-auto h-12 w-12 text-blue-600" />
                <h2 className="mt-2 text-lg font-semibold text-gray-900">
                    Exportar Retrospectiva
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                    Elige el formato y configura las opciones para tu documento
                </p>
            </div>

            {/* Format Selection Cards */}
            <div className="grid grid-cols-2 gap-4">
                {formats.map((format) => (
                    <motion.button
                        key={format.value}
                        onClick={() => handleFormatChange(format.value)}
                        className={`p-6 rounded-lg border-2 text-left transition-all ${selectedFormat === format.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            {getFormatIcon(format.value)}
                            <span className="font-semibold text-lg">{format.label}</span>
                        </div>
                        <p className="text-sm text-gray-600">{format.description}</p>
                    </motion.button>
                ))}
            </div>

            {/* Full Configuration Panel */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                {/* Document Settings */}
                <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Configuración del documento</h3>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="custom-title-full" className="block text-sm font-medium text-gray-700 mb-1">
                                Título personalizado
                            </label>
                            <input
                                id="custom-title-full"
                                type="text"
                                value={options.customTitle}
                                onChange={(e) => setOptions(prev => ({ ...prev, customTitle: e.target.value }))}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                placeholder="Título de la retrospectiva"
                            />
                        </div>

                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={options.includeRetroRocketLogo}
                                onChange={(e) => setOptions(prev => ({ ...prev, includeRetroRocketLogo: e.target.checked }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <FileImage className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">
                                Incluir logo de RetroRocket
                            </span>
                        </label>
                    </div>
                </div>

                {/* Content Options */}
                <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Contenido a incluir</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={options.includeParticipants}
                                onChange={(e) => setOptions(prev => ({ ...prev, includeParticipants: e.target.checked }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">
                                Lista de participantes
                            </span>
                        </label>

                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={options.includeStatistics}
                                onChange={(e) => setOptions(prev => ({ ...prev, includeStatistics: e.target.checked }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <BarChart3 className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">
                                Estadísticas
                            </span>
                        </label>

                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={options.includeCardAuthors}
                                onChange={(e) => setOptions(prev => ({ ...prev, includeCardAuthors: e.target.checked }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">
                                Autores de tarjetas
                            </span>
                        </label>

                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={options.includeReactions}
                                onChange={(e) => setOptions(prev => ({ ...prev, includeReactions: e.target.checked }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <Heart className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">
                                Likes y reacciones
                            </span>
                        </label>

                        <label className="flex items-center gap-3 col-span-2">
                            <input
                                type="checkbox"
                                checked={options.includeGroupDetails}
                                onChange={(e) => setOptions(prev => ({ ...prev, includeGroupDetails: e.target.checked }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                Detalles de agrupaciones de tarjetas
                            </span>
                        </label>
                    </div>
                </div>

                {/* Sorting Options */}
                <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <SortAsc className="w-4 h-4" />
                        Ordenamiento de tarjetas
                    </h3>
                    <div className="space-y-3">
                        {sortOrders.map((sortOrder) => (
                            <label key={sortOrder.value} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                                <input
                                    type="radio"
                                    name="sortOrder-full"
                                    value={sortOrder.value}
                                    checked={options.sortOrder === sortOrder.value}
                                    onChange={(e) => setOptions(prev => ({ ...prev, sortOrder: e.target.value as SortOrder }))}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                    aria-label={`Ordenar ${sortOrder.label}`}
                                />
                                <div>
                                    <div className="text-sm font-medium text-gray-700">{sortOrder.label}</div>
                                    <div className="text-xs text-gray-500">{sortOrder.description}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Facilitator Notes */}
                <div>
                    <label className="flex items-center gap-3 mb-4">
                        <input
                            type="checkbox"
                            checked={options.includeFacilitatorNotes}
                            onChange={(e) => setOptions(prev => ({ ...prev, includeFacilitatorNotes: e.target.checked }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">
                            Agregar notas del facilitador
                        </span>
                    </label>

                    {options.includeFacilitatorNotes && (
                        <textarea
                            value={options.facilitatorNotes}
                            onChange={(e) => setOptions(prev => ({ ...prev, facilitatorNotes: e.target.value }))}
                            rows={4}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            placeholder="Escribe aquí las notas adicionales para incluir en el documento..."
                        />
                    )}
                </div>

                {/* Export Button */}
                <div className="pt-4">
                    <motion.button
                        onClick={handleExport}
                        disabled={isExporting}
                        className={`w-full flex justify-center items-center gap-3 px-6 py-3 text-white font-medium rounded-lg shadow-md transition-all duration-200 hover:shadow-lg active:scale-95 ${getFormatColor(selectedFormat)}`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Exportando a {selectedFormat.toUpperCase()}...
                            </>
                        ) : (
                            <>
                                {getFormatIcon(selectedFormat)}
                                Exportar a {formats.find(f => f.value === selectedFormat)?.label}
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
                                className="bg-blue-600 h-2 rounded-full"
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
                        className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg"
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

export default UnifiedExporter;
