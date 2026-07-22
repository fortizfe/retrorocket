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
                        className={`flex-1 h-8 rounded text-xs flex items-center justify-center text-text-secondary ${column.type === 'action'
                            ? 'bg-info-bg border-2 border-dashed border-info-fg'
                            : 'bg-surface'
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
            <h3 id="template-selector-title" className="text-lg font-semibold text-text-primary mb-4">
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
                                ? 'border-primary-500 bg-info-bg shadow-soft'
                                : 'border-border-default bg-surface-raised hover:border-info-fg'
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
                                    : 'border-border-strong'
                                    }`}>
                                    {isSelected && (
                                        <Check className="w-3 h-3 text-white" />
                                    )}
                                </div>
                            </div>

                            {/* Template Info */}
                            <div className="pr-8">
                                <h4 className="font-semibold text-text-primary mb-2">
                                    {t(template.i18nNameKey)}
                                </h4>

                                <p
                                    id={`template-${template.id}-desc`}
                                    className="text-sm text-text-secondary mb-3"
                                >
                                    {t(template.i18nDescriptionKey)}
                                </p>

                                {/* Column Preview */}
                                <div>
                                    <span className="text-xs font-medium text-text-muted">
                                        {t('createBoard.selectTemplate.preview')}:
                                    </span>
                                    {renderColumnPreview(template.id)}
                                </div>
                            </div>
                        </motion.label>
                    );
                })}
            </div>

            <p className="text-xs text-text-muted text-center mt-4">
                {t('createBoard.selectTemplate.actionItemsNote')}
            </p>
        </div>
    );
};

export default BoardTemplateSelector;
