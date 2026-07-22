import React from 'react';
import { User } from 'lucide-react';

interface CardHeaderProps {
    /** Display name of the card author. */
    author: string;
    /** Optional slot for a badge next to the author (e.g. sentiment). */
    badge?: React.ReactNode;
}

/** Card author identity, with an optional adjacent badge. Colors are semantic tokens. */
const CardHeader: React.FC<CardHeaderProps> = ({ author, badge }) => (
    <div className="flex items-center gap-1 text-xs text-text-muted min-w-0">
        <User size={12} className="shrink-0" />
        <span className="truncate">{author}</span>
        {badge}
    </div>
);

export default CardHeader;
