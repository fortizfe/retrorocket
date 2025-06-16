import React from 'react';
import { Clock, UserCheck } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { Participant } from '../../types/participant';

interface ParticipantListProps {
    participants: Participant[];
    className?: string;
    maxHeight?: string;
}

const ParticipantList: React.FC<ParticipantListProps> = ({
    participants,
    className = '',
    maxHeight = 'max-h-64'
}) => {
    const formatJoinTime = (joinedAt: Date) => {
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - joinedAt.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) {
            return 'Ahora mismo';
        } else if (diffInMinutes < 60) {
            return `Hace ${diffInMinutes} min`;
        } else {
            const diffInHours = Math.floor(diffInMinutes / 60);
            return `Hace ${diffInHours}h`;
        }
    };

    if (participants.length === 0) {
        return (
            <div className={`text-center py-6 text-slate-500 dark:text-slate-400 ${className}`}>
                <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay participantes conectados</p>
            </div>
        );
    }

    return (
        <div className={`${className}`}>
            <div className={`overflow-y-auto ${maxHeight} scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600`}>
                <div className="space-y-2">
                    {participants.map((participant) => (
                        <div
                            key={participant.id}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <UserAvatar
                                    user={{
                                        name: participant.name,
                                        photoURL: null
                                    }}
                                    size="md"
                                />
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                                        {participant.name}
                                    </h4>
                                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                        <Clock className="w-3 h-3" />
                                        <span>{formatJoinTime(participant.joinedAt)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Status indicator */}
                            <div className="flex items-center gap-1">
                                {participant.isActive ? (
                                    <div className="w-2 h-2 bg-green-500 rounded-full" title="Conectado" />
                                ) : (
                                    <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full" title="Desconectado" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Summary */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span>Total de participantes</span>
                    <span className="font-medium">{participants.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 mt-1">
                    <span>Conectados ahora</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                        {participants.filter(p => p.isActive).length}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ParticipantList;
