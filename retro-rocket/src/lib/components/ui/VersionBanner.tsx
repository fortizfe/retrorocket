import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBackendVersion } from '@/lib/hooks/useBackendVersion';

/**
 * "A new version is available, please reload" banner (feature 017 T119). Shown when
 * this bundle's build-time version no longer matches the backend's deployed version —
 * conveyed via icon + text + an explicit action, not color alone (WCAG 2.1 AA, T121).
 */
const VersionBanner: React.FC = () => {
    const { isStale } = useBackendVersion();
    const { t } = useTranslation();

    if (!isStale) return null;

    return (
        <div
            role="alert"
            className="fixed bottom-0 inset-x-0 z-50 bg-warning-bg text-warning-fg border-t border-warning-fg/30 px-4 py-3 flex items-center justify-center gap-3 text-sm"
        >
            <RefreshCw className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{t('app.newVersionAvailable')}</span>
            <button
                type="button"
                onClick={() => window.location.reload()}
                className="underline font-medium focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none rounded"
            >
                {t('app.reload')}
            </button>
        </div>
    );
};

export default VersionBanner;
