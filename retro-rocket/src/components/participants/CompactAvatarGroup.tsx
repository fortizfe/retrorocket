import React from 'react';
import { Users } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { Participant } from '../../types/participant';

interface CompactAvatarGroupProps {
    participants: Participant[];
    maxVisible?: number;
    size?: 'sm' | 'md' | 'lg';
    showCount?: boolean;
    onShowAll?: () => void;
    className?: string;
}

const sizeConfig = {
    sm: {
        counter: 'w-6 h-6',
        text: 'text-xs',
        icon: 'w-3 h-3'
    },
    md: {
        counter: 'w-8 h-8',
        text: 'text-xs',
        icon: 'w-4 h-4'
    },
    lg: {
        counter: 'w-10 h-10',
        text: 'text-xs',
        icon: 'w-5 h-5'
    }
};

const CompactAvatarGroup: React.FC<CompactAvatarGroupProps> = ({
    participants,
    maxVisible = 5,
    size = 'md',
    showCount = true,
    onShowAll,
    className = ''
}) => {
    const visibleParticipants = participants.slice(0, maxVisible);
    const remainingCount = Math.max(0, participants.length - maxVisible);
    const totalCount = participants.length;
    const config = sizeConfig[size];

    const handleClick = () => {
        if (onShowAll) {
            onShowAll();
        }
    };

    const groupElement = (
        <div className={`flex items-center gap-2 ${className}`}>
            {/* Avatar Stack */}
            <div className="flex items-center -space-x-1">
                {visibleParticipants.slice().reverse().map((participant) => (
                    <div
                        key={participant.id}
                        className="relative"
                    >
                        <UserAvatar
                            user={{
                                name: participant.name,
                                photoURL: null // Por ahora no tenemos photoURL en Participant
                            }}
                            size={size}
                            className="ring-2 ring-white dark:ring-slate-800"
                        />
                    </div>
                ))}

                {/* Remaining count indicator */}
                {remainingCount > 0 && (
                    <div className={`${config.counter} bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-800 text-slate-600 dark:text-slate-300 font-medium`}>
                        <span className={config.text}>
                            +{remainingCount}
                        </span>
                    </div>
                )}
            </div>

            {/* Count with icon (optional) */}
            {showCount && (
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                    <Users className={config.icon} />
                    <span className={`font-medium ${config.text}`}>
                        {totalCount}
                    </span>
                </div>
            )}
        </div>
    );

    if (onShowAll) {
        return (
            <button
                onClick={handleClick}
                className="transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg p-1 -m-1"
                title={`Ver todos los participantes (${totalCount})`}
            >
                {groupElement}
            </button>
        );
    }

    return groupElement;
};

export default CompactAvatarGroup;
