import React, { useEffect } from 'react';
import { Users } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { useLanguage } from '../../hooks/useLanguage';
import { Participant } from '../../types/participant';

interface ParticipantListProps {
    participants: Participant[];
    className?: string;
    maxHeight?: string;
    showCount?: boolean;
    compact?: boolean;
    preventBackgroundScroll?: boolean;
}

const ParticipantList: React.FC<ParticipantListProps> = ({
    participants,
    className = '',
    maxHeight = 'max-h-64',
    showCount = true,
    compact = false,
    preventBackgroundScroll = false
}) => {
    const { t } = useLanguage();

    // Prevent background scroll when the participant list is displayed
    useEffect(() => {
        if (preventBackgroundScroll) {
            // Store original overflow style
            const originalOverflow = document.body.style.overflow;

            // Prevent scroll by setting body overflow to hidden
            document.body.style.overflow = 'hidden';

            // Also prevent touch scrolling on mobile
            const preventTouchMove = (e: TouchEvent) => {
                e.preventDefault();
            };

            // Add touch event listener for mobile devices
            document.body.addEventListener('touchmove', preventTouchMove, { passive: false });

            // Cleanup function to restore original state
            return () => {
                document.body.style.overflow = originalOverflow;
                document.body.removeEventListener('touchmove', preventTouchMove);
            };
        }
    }, [preventBackgroundScroll]);

    // Sort participants alphabetically for consistent, predictable order
    const sortedParticipants = [...participants].sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    if (participants.length === 0) {
        return (
            <div className={`text-center py-6 text-slate-500 dark:text-slate-400 ${className}`}>
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No hay participantes</p>
                <p className="text-xs mt-1 opacity-75">La sesión está esperando participantes</p>
            </div>
        );
    }

    const itemPadding = compact ? 'p-2' : 'p-3';
    const avatarSize = compact ? 'sm' : 'md';
    const spacing = compact ? 'space-y-1' : 'space-y-2';

    return (
        <div className={`${className}`}>
            {/* Clean header with count */}
            {showCount && (
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {t('participants.title')}
                        </span>
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                        {participants.length}
                    </span>
                </div>
            )}

            {/* Optimized participants list */}
            <div
                className={`overflow-y-auto ${maxHeight} scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600`}
                onWheel={(e) => {
                    // Allow scrolling within the participant list container
                    if (preventBackgroundScroll) {
                        e.stopPropagation();
                    }
                }}
            >
                <div className={spacing}>
                    {sortedParticipants.map((participant) => (
                        <div
                            key={participant.id}
                            className={`flex items-center gap-3 ${itemPadding} rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150 group`}
                        >
                            <UserAvatar
                                user={{
                                    name: participant.name,
                                    photoURL: participant.photoURL
                                }}
                                size={avatarSize}
                                className="ring-1 ring-slate-200 dark:ring-slate-700 group-hover:ring-slate-300 dark:group-hover:ring-slate-600 transition-colors"
                            />
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate text-sm">
                                    {participant.name}
                                </h4>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ParticipantList;
