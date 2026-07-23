import React, { useState } from 'react';
import Button from '@/lib/components/ui/Button';
import ImprovedExportPopover from '@/features/boards/export/components/ImprovedExportPopover';
import { Retrospective } from '@/features/boards/types/retrospective';
import { Card, CardGroup } from '@/features/boards/types/card';
import { ActionItem } from '@/features/boards/types/actionItem';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useSentiment } from '@/features/boards/sentiment';

interface ExportButtonGroupProps {
    retrospective: Retrospective;
    cards: Card[];
    groups: CardGroup[];
    participants: Array<{ name: string; joinedAt: Date }>;
    actionItems?: ActionItem[];
    className?: string;
    // New sentiment analysis props
    sentimentAnalysis?: ReturnType<typeof useSentiment>;
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
