import React from 'react';
import { LucideIcon } from 'lucide-react';
interface ControlCardProps {
    title: string;
    description?: string;
    icon?: LucideIcon | null;
    children?: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
}

const ControlCard: React.FC<ControlCardProps> = ({ title, description, icon: Icon, children, footer, className = '' }) => {
    return (
        <div className={`bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg p-4 shadow-sm ${className}`}>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className="p-2 rounded-md bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    )}
                    <div className="flex flex-col">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-tight">{title}</div>
                        {description && <div className="text-xs text-slate-500 dark:text-slate-400">{description}</div>}
                    </div>
                </div>
            </div>

            <div className="mt-3">
                {children}
            </div>

            {footer && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                    {footer}
                </div>
            )}
        </div>
    );
};

export default ControlCard;
