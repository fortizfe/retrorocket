import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TemplateId, BOARD_TEMPLATES, ACTION_COLUMN } from '@/features/create-board/boardTemplates';

type Props = {
    value: TemplateId | null;
    onChange: (id: TemplateId) => void;
};

const BoardTemplateSelector: React.FC<Props> = ({ value, onChange }) => {
    const { t } = useTranslation();

    const renderColumnPreview = (templateId: TemplateId) => {
        const template = BOARD_TEMPLATES[templateId];
        const allColumns = [...template.columns, ACTION_COLUMN];

        return (
            <div className="flex gap-1 mt-3 mb-2">
                {allColumns.map((column, index) => (
                    <div
                        key={column.id}
                        className={`flex-1 h-8 rounded text-xs flex items-center justify-center text-slate-600 dark:text-slate-300 ${column.type === 'action'
                            ? 'bg-blue-100 dark:bg-blue-800/30 border-2 border-dashed border-blue-300 dark:border-blue-600'
                            : 'bg-slate-100 dark:bg-slate-700'
                            }`}
                        title={t(column.i18nKey)}
                    >
                        {index + 1}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <h3 id="template-selector-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                {t('createBoard.selectTemplate.title')}
            </h3>

            <div className="grid md:grid-cols-3 gap-4">
                {Object.values(BOARD_TEMPLATES).map((template) => {
                    const isSelected = value === template.id;

                    return (
                        <motion.label
                            key={template.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 block ${isSelected
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-soft'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary-300 dark:hover:border-primary-600'
                                }`}
                        >
                            {/* Hidden Radio Input */}
                            <input
                                type="radio"
                                name="boardTemplate"
                                value={template.id}
                                checked={isSelected}
                                onChange={() => onChange(template.id)}
                                className="sr-only"
                                aria-describedby={`template-${template.id}-desc`}
                                aria-label={`${t('createBoard.selectTemplate.choose')} ${t(template.i18nNameKey)}`}
                            />

                            {/* Visual Radio Indicator */}
                            <div className="absolute top-3 right-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected
                                    ? 'border-primary-500 bg-primary-500'
                                    : 'border-slate-300 dark:border-slate-600'
                                    }`}>
                                    {isSelected && (
                                        <Check className="w-3 h-3 text-white" />
                                    )}
                                </div>
                            </div>

                            {/* Template Info */}
                            <div className="pr-8">
                                <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                    {t(template.i18nNameKey)}
                                </h4>

                                <p
                                    id={`template-${template.id}-desc`}
                                    className="text-sm text-slate-600 dark:text-slate-300 mb-3"
                                >
                                    {t(template.i18nDescriptionKey)}
                                </p>

                                {/* Column Preview */}
                                <div>
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                        {t('createBoard.selectTemplate.preview')}:
                                    </span>
                                    {renderColumnPreview(template.id)}
                                </div>
                            </div>
                        </motion.label>
                    );
                })}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
                {t('createBoard.selectTemplate.actionItemsNote')}
            </p>
        </div>
    );
};

export default BoardTemplateSelector;
