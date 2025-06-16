import React, { useState } from 'react';
import Button from '../ui/Button';
import ExportPopover from './ExportPopover';
import { Retrospective } from '../../types/retrospective';
import { Card, CardGroup } from '../../types/card';

interface ExportButtonGroupProps {
    retrospective: Retrospective;
    cards: Card[];
    groups: CardGroup[];
    participants: Array<{ name: string; joinedAt: Date }>;
    className?: string;
}

const ExportButtonGroup: React.FC<ExportButtonGroupProps> = ({
    retrospective,
    cards,
    groups,
    participants,
    className = ''
}) => {
    const [showPopover, setShowPopover] = useState(false);

    return (
        <ExportPopover
            retrospective={retrospective}
            cards={cards}
            groups={groups}
            participants={participants}
            isOpen={showPopover}
            onClose={() => setShowPopover(false)}
            className={className}
        >
            <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPopover(true)}
                className="flex items-center gap-2"
                title="Exportar retrospectiva"
            >
                Exportar
            </Button>
        </ExportPopover>
    );
};

export default ExportButtonGroup;
