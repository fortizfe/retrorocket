import React from 'react';
import LinkifyText from '@/lib/components/ui/LinkifyText';

interface CardContentProps {
    content: string;
    className?: string;
}

/**
 * Renders a card's textual content:
 * - preserves intentional line breaks (`whitespace-pre-wrap`) — FR-003
 * - wraps long words/URLs within the card width (`break-words` +
 *   `[overflow-wrap:anywhere]`, provided by LinkifyText) — FR-001
 * - keeps URLs clickable — FR-002
 * - `min-w-0` so the content can shrink inside flex/grid ancestors
 *
 * Colors come from the semantic `text-primary` token (never hardcoded palette).
 */
const CardContent: React.FC<CardContentProps> = ({ content, className = '' }) => (
    <LinkifyText
        text={content}
        className={`block min-w-0 text-text-primary leading-relaxed whitespace-pre-wrap text-sm ${className}`.trim()}
    />
);

export default CardContent;
