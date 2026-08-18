import React from 'react';
import { Switch } from '@headlessui/react';
import { useLanguage } from '@/lib/hooks/useLanguage';

interface Props {
    isAnonymous: boolean;
    onToggle: (next: boolean) => void;
}

// Accessible switch control for the facilitator-only board-wide anonymity mode
// (051-anonymous-board-mode, US3). Mirrors ActionColumnToggle.tsx's structure.
const AnonymityToggle: React.FC<Props> = ({ isAnonymous, onToggle }) => {
    const { t } = useLanguage();

    return (
        <Switch.Group>
            <div className="flex items-center">
                <Switch
                    checked={isAnonymous}
                    onChange={onToggle}
                    data-testid="anonymity-toggle"
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${isAnonymous ? 'bg-success-fg' : 'bg-border-default'}`}
                    aria-label={isAnonymous ? t('retrospective.facilitator.anonymity.disable') : t('retrospective.facilitator.anonymity.enable')}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAnonymous ? 'translate-x-5' : 'translate-x-1'}`}
                    />
                </Switch>

                <Switch.Label className="sr-only">
                    {isAnonymous ? t('retrospective.facilitator.anonymity.disable') : t('retrospective.facilitator.anonymity.enable')}
                </Switch.Label>
            </div>
        </Switch.Group>
    );
};

export default AnonymityToggle;
