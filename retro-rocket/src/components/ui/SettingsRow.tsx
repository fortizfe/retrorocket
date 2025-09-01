import React from 'react';

interface Props {
    label: React.ReactNode;
    description?: React.ReactNode;
    control: React.ReactNode;
    className?: string;
}

const SettingsRow: React.FC<Props> = ({ label, description, control, className = '' }) => {
    return (
        <div className={`flex items-start justify-between gap-4 ${className}`}>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{label}</div>
                {description && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{description}</div>
                )}
            </div>

            <div className="flex-shrink-0 ml-4">
                {control}
            </div>
        </div>
    );
};

export default SettingsRow;
