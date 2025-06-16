import React, { useState, useEffect } from 'react';
import { CompactAvatarGroup, ParticipantPopover } from './index';
import { Participant } from '../../types/participant';
import { useEnrichedParticipants } from '../../hooks/useEnrichedParticipants';

interface ResponsiveParticipantDisplayProps {
    participants: Participant[];
    className?: string;
}

const ResponsiveParticipantDisplay: React.FC<ResponsiveParticipantDisplayProps> = ({
    participants,
    className = ''
}) => {
    const [showPopover, setShowPopover] = useState(false);
    const [maxVisible, setMaxVisible] = useState(5);
    const { enrichedParticipants } = useEnrichedParticipants(participants);

    // Update maxVisible based on screen size
    useEffect(() => {
        const updateMaxVisible = () => {
            const width = window.innerWidth;
            if (width < 640) { // sm breakpoint
                setMaxVisible(2);
            } else if (width < 768) { // md breakpoint
                setMaxVisible(3);
            } else if (width < 1024) { // lg breakpoint
                setMaxVisible(4);
            } else {
                setMaxVisible(5);
            }
        };

        updateMaxVisible();
        window.addEventListener('resize', updateMaxVisible);

        return () => window.removeEventListener('resize', updateMaxVisible);
    }, []);

    if (participants.length === 0) {
        return null;
    }

    // Use enriched participants if available, fallback to original
    const displayParticipants = enrichedParticipants.length > 0 ? enrichedParticipants : participants;

    return (
        <div className={className}>
            <ParticipantPopover
                participants={displayParticipants}
                isOpen={showPopover}
                onClose={() => setShowPopover(false)}
                position="bottom"
            >
                <CompactAvatarGroup
                    participants={displayParticipants}
                    maxVisible={maxVisible}
                    size="md"
                    showCount={true}
                    onShowAll={() => setShowPopover(true)}
                    className="cursor-pointer"
                />
            </ParticipantPopover>
        </div>
    );
};

export default ResponsiveParticipantDisplay;
