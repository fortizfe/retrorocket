import React from 'react';
import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BoardConnectionState } from '@/lib/hooks/useBoardEvents';

interface ConnectionStatusIndicatorProps {
    connectionState: BoardConnectionState;
}

/**
 * Surfaces the board's real-time SSE connection state (FR-009/FR-011) — only rendered
 * while reconnecting (the common/steady "connected" state stays silent to avoid visual
 * noise). Conveyed via icon + text, not color alone (WCAG 2.1 AA).
 */
const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({ connectionState }) => {
    const { t } = useTranslation();

    if (connectionState !== 'reconnecting') return null;

    return (
        <div
            role="status"
            className="mb-2 flex items-center gap-2 rounded-md bg-warning-bg text-warning-fg px-3 py-1.5 text-sm w-fit"
        >
            <WifiOff className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{t('app.reconnecting')}</span>
        </div>
    );
};

export default ConnectionStatusIndicator;
