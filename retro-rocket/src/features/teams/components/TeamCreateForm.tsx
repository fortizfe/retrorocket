import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '@/lib/components/ui/Input';
import Textarea from '@/lib/components/ui/Textarea';
import Button from '@/lib/components/ui/Button';

/**
 * Team creation form (spec 054, User Story 1 — "Create a team and become its
 * owner"). Contract fixed by `src/test/features/teams/TeamCreateForm.test.tsx`
 * (T011): this component owns its own client-side validation (name required,
 * description optional) and reports a validated payload upward via
 * `onCreate` — it never talks to `backendTeamsClient` itself. The page
 * (`Teams.tsx`, T018) is what calls `createTeam`, refetches the list, and
 * shows the success/error toast, so `onCreate` may be async: this form awaits
 * it to disable the submit button for the duration and to know when it's
 * safe to clear the fields.
 *
 * Design pass (constitution Principle IX): ran the inline name-required
 * error (AC3) through the `apple-design`/`emil-design-eng` decision
 * framework and landed on *not* adding bespoke enter motion for it —
 * documenting the "no" the framework asks for, not skipping the step.
 * `Input.tsx` renders the error text inside its own fixed markup (so it can
 * wire `aria-invalid`/`aria-describedby`/`role="alert"` once for every
 * consumer, not just this form), which means any custom AnimatePresence
 * here would either duplicate that DOM node or need Input.tsx to expose an
 * animation seam of its own — a wider, riskier change than a once-per-team
 * validation message justifies. The state change already reads as
 * responsive without it: Input's border-color transitions over the existing
 * 200ms `transition-colors`, and the error text is paired with the red
 * border rather than being the only signal (never color-alone).
 */

export interface TeamCreateFormValues {
    name: string;
    description?: string;
}

export interface TeamCreateFormProps {
    /** Called with a validated payload once the name passes validation. May return a promise. */
    onCreate: (values: TeamCreateFormValues) => void | Promise<void>;
}

const TeamCreateForm: React.FC<TeamCreateFormProps> = ({ onCreate }) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [nameError, setNameError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setName(event.target.value);
        if (nameError) setNameError('');
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        const trimmedName = name.trim();
        if (!trimmedName) {
            setNameError(t('teams.create.nameRequired'));
            return;
        }

        const trimmedDescription = description.trim();
        setIsSubmitting(true);
        try {
            await onCreate(
                trimmedDescription
                    ? { name: trimmedName, description: trimmedDescription }
                    : { name: trimmedName }
            );
            setName('');
            setDescription('');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
                label={t('teams.create.nameLabel')}
                value={name}
                onChange={handleNameChange}
                placeholder={t('teams.create.namePlaceholder')}
                disabled={isSubmitting}
                error={nameError || undefined}
            />

            <Textarea
                label={t('teams.create.descriptionLabel')}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t('teams.create.descriptionPlaceholder')}
                disabled={isSubmitting}
                rows={3}
            />

            <div className="flex justify-end pt-1">
                <Button type="submit" variant="primary" loading={isSubmitting}>
                    {t('teams.create.submit')}
                </Button>
            </div>
        </form>
    );
};

export default TeamCreateForm;
