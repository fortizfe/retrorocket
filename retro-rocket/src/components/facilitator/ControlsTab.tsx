import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import ActionColumnToggle from '../retrospective/ActionColumnToggle';
import uiPreferencesStore from '../../lib/uiPreferencesStore';

const ControlsTab: React.FC = () => {
    const { t } = useLanguage();
    const [showActionColumn, setShowActionColumn] = React.useState<boolean>(() => uiPreferencesStore.getShowActionColumn());

    React.useEffect(() => {
        const unsub = uiPreferencesStore.subscribe((v) => setShowActionColumn(v));
        return unsub;
    }, []);

    const handleToggle = () => {
        uiPreferencesStore.setShowActionColumn(!uiPreferencesStore.getShowActionColumn());
    };

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('retrospective.facilitator.tabs.controls')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('retrospective.facilitator.onlyYouCanSee')}</p>

            <div>
                <ActionColumnToggle visible={showActionColumn} onToggle={handleToggle} />
            </div>
        </div>
    );
};

export default ControlsTab;
