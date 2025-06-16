import React, { useState, useEffect } from 'react';
import { CompactAvatarGroup, ParticipantPopover } from './index';
import { Participant } from '../../types/participant';

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

    return (
        <div className={className}>
            <ParticipantPopover
                participants={participants}
                isOpen={showPopover}
                onClose={() => setShowPopover(false)}
                position="bottom"
            >
                <CompactAvatarGroup
                    participants={participants}
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
