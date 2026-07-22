import React from 'react';
import { Switch } from '@headlessui/react';
import { useLanguage } from '@/lib/hooks/useLanguage';

interface Props {
    visible: boolean;
    onToggle: () => void;
}

// Accessible switch control for showing/hiding the Action Items column.
const ActionColumnToggle: React.FC<Props> = ({ visible, onToggle }) => {
    const { t } = useLanguage();

    return (
        <Switch.Group>
            <div className="flex items-center">
                <Switch
                    checked={visible}
                    onChange={onToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${visible ? 'bg-green-600' : 'bg-border-default'}`}
                    aria-label={visible ? t('retrospective.facilitator.hideActionItems') : t('retrospective.facilitator.showActionItems')}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${visible ? 'translate-x-5' : 'translate-x-1'}`}
                    />
                </Switch>

                <Switch.Label className="sr-only">
                    {visible ? t('retrospective.facilitator.hideActionItems') : t('retrospective.facilitator.showActionItems')}
                </Switch.Label>
            </div>
        </Switch.Group>
    );
};

export default ActionColumnToggle;
