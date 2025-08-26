import React, { useState } from 'react';
import Button from '../ui/Button';
import ImprovedExportPopover from './ImprovedExportPopover';
import { Retrospective } from '../../types/retrospective';
import { Card, CardGroup } from '../../types/card';
import { ActionItem } from '../../types/actionItem';
import { useLanguage } from '../../hooks/useLanguage';

interface ExportButtonGroupProps {
    retrospective: Retrospective;
    cards: Card[];
    groups: CardGroup[];
    participants: Array<{ name: string; joinedAt: Date }>;
    actionItems?: ActionItem[];
    className?: string;
    // New sentiment analysis props
    sentimentAnalysis?: any;
}

const ExportButtonGroup: React.FC<ExportButtonGroupProps> = ({
    retrospective,
    cards,
    groups,
    participants,
    actionItems = [],
    className = '',
    sentimentAnalysis
}) => {
    const { t } = useLanguage();
    const [showPopover, setShowPopover] = useState(false);

    return (
        <ImprovedExportPopover
            retrospective={retrospective}
            cards={cards}
            groups={groups}
            participants={participants}
            actionItems={actionItems}
            sentimentAnalysis={sentimentAnalysis}
            isOpen={showPopover}
            onClose={() => setShowPopover(false)}
            className={className}
        >
            <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPopover(true)}
                className="flex items-center gap-2"
                title={t('retrospective.export.exportButton')}
            >
                {t('retrospective.export.exportText')}
            </Button>
        </ImprovedExportPopover>
    );
};

export default ExportButtonGroup;
