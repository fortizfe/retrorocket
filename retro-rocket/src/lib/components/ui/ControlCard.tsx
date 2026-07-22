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
        <div className={`bg-surface-raised border border-border-default rounded-lg p-4 shadow-sm ${className}`}>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className="p-2 rounded-md bg-surface-raised/60 border border-border-default flex items-center justify-center">
                            <Icon className="w-5 h-5 text-info-fg" />
                        </div>
                    )}
                    <div className="flex flex-col">
                        <div className="text-sm font-medium text-text-primary leading-tight">{title}</div>
                        {description && <div className="text-xs text-text-muted">{description}</div>}
                    </div>
                </div>
            </div>

            <div className="mt-3">
                {children}
            </div>

            {footer && (
                <div className="mt-4 pt-3 border-t border-border-default">
                    {footer}
                </div>
            )}
        </div>
    );
};

export default ControlCard;
