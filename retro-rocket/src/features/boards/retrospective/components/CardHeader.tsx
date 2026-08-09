import React from 'react';

interface CardHeaderProps {
    /** Display name of the card author. */
    author: string;
    /** Optional slot for a badge next to the author (e.g. sentiment). */
    badge?: React.ReactNode;
}

/**
 * Card author identity, with an optional adjacent badge. Colors are semantic
 * tokens. Renders as a quiet metadata line (no icon) — the "Layered Depth"
 * direction (feature 033) reserves visual weight for the card surface itself
 * rather than per-field iconography.
 */
const CardHeader: React.FC<CardHeaderProps> = ({ author, badge }) => (
    <div className="flex items-center gap-1.5 text-xs text-text-muted min-w-0">
        <span className="truncate">{author}</span>
        {badge}
    </div>
);

export default CardHeader;
