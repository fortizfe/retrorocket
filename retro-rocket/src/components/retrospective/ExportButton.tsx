import React from 'react';
import { Download } from 'lucide-react';
import ImprovedExportPopover from './ImprovedExportPopover';
import Button from '../ui/Button';

interface ExportButtonProps {
    retrospective: any;
    cards: any[];
    groups: any[];
    participants: any[];
    actionItems?: any[];
    className?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({
    retrospective,
    cards,
    groups,
    participants,
    actionItems = [],
    className = ''
}) => {
    const [isExportMenuOpen, setIsExportMenuOpen] = React.useState(false);

    return (
        <ImprovedExportPopover
            retrospective={retrospective}
            cards={cards}
            groups={groups}
            participants={participants}
            actionItems={actionItems}
            isOpen={isExportMenuOpen}
            onClose={() => setIsExportMenuOpen(false)}
            className={className}
        >
            <Button
                variant="outline"
                onClick={() => setIsExportMenuOpen(true)}
                className="flex items-center gap-2"
            >
                <Download className="w-4 h-4" />
                Exportar
            </Button>
        </ImprovedExportPopover>
    );
};

export default ExportButton;
