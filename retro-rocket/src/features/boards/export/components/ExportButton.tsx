import React from 'react';
import { Download } from 'lucide-react';
import ImprovedExportPopover from '@/features/boards/export/components/ImprovedExportPopover';
import Button from '@/lib/components/ui/Button';
import { Retrospective } from '@/features/boards/types/retrospective';
import { Card, CardGroup } from '@/features/boards/types/card';
import { Participant } from '@/features/boards/types/participant';
import { ActionItem } from '@/features/boards/types/actionItem';

interface ExportButtonProps {
    retrospective: Retrospective;
    cards: Card[];
    groups: CardGroup[];
    participants: Participant[];
    actionItems?: ActionItem[];
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
