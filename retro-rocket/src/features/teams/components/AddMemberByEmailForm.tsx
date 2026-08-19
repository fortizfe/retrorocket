import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '@/lib/components/ui/Input';
import Button from '@/lib/components/ui/Button';
import { TeamApiError } from '@/features/teams/services/backendTeamsClient';
import type { TeamMember } from '@/features/teams/types/team';

/**
 * Owner-only "add member by email" form (spec 054, User Story 2 — "Owner manages team
 * membership", T036). Contract: takes an `onAdd(email)` callback that performs the
 * actual `POST /api/teams/:id/members` call (via `useTeamMembershipActions.addMember`,
 * T035) and either resolves with the new `TeamMember` or throws a `TeamApiError`. This
 * component owns exact-email validation (non-empty, looks like an email) and — per the
 * task brief's explicit requirement — the inline error copy: a `user_not_found` code
 * renders "no account found for this email" and a `conflict` code renders "already a
 * member", never a single generic failure string, so the owner knows which corrective
 * action to take (try a different email vs. do nothing, they're already added).
 * `TeamDetail.tsx` (T038) still shows a success toast once `onAdd` resolves, matching
 * `Teams.tsx`'s `TeamCreateForm` split: this component validates + reports upward, the
 * page owns confirmation feedback for the happy path.
 *
 * Design pass (constitution Principle IX, apple-design/emil-design-eng): this is a
 * single-field lookup form with no gesture-driven or momentum-carrying interaction — the
 * apple-design skill's guidance on springs/interruptibility/velocity handoff doesn't
 * apply to a text input + submit button. What does apply is Craft (inline, specific
 * feedback beats a generic error) and Agency (no destructive confirmation here — adding
 * a member is easily reversible via "remove", so a confirm dialog would just add friction
 * for no safety benefit, per apple-design's "confirmation dialog only for genuinely
 * destructive, irreversible actions"). Errors reuse `Input`'s existing error slot
 * (red border + `role="alert"` text, never color alone) rather than a new bespoke error
 * component, and the 200ms border-color transition already on `Input` is enough
 * "responsive" feedback for a once-per-submission state change — the same reasoning
 * `TeamCreateForm.tsx` documented for its own inline error.
 */

export interface AddMemberByEmailFormProps {
    /** Performs the add. Resolves with the new member, or throws `TeamApiError`. */
    onAdd: (email: string) => Promise<TeamMember>;
}

// RFC-5322-lite: good enough to catch obvious typos before hitting the network, without
// pretending to be a full email-address validator (the backend's exact-match lookup is
// the actual source of truth for whether an account exists).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AddMemberByEmailForm: React.FC<AddMemberByEmailFormProps> = ({ onAdd }) => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(event.target.value);
        if (error) setError('');
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setError(t('teams.members.emailRequired'));
            return;
        }
        if (!EMAIL_PATTERN.test(trimmedEmail)) {
            setError(t('teams.members.emailInvalid'));
            return;
        }

        setIsSubmitting(true);
        try {
            await onAdd(trimmedEmail);
            setEmail('');
        } catch (err) {
            if (err instanceof TeamApiError && err.code === 'user_not_found') {
                setError(t('teams.members.addNotFoundError'));
            } else if (err instanceof TeamApiError && err.code === 'conflict') {
                setError(t('teams.members.addDuplicateError'));
            } else {
                setError(t('teams.members.addGenericError'));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
                <Input
                    type="email"
                    label={t('teams.members.addLabel')}
                    value={email}
                    onChange={handleEmailChange}
                    placeholder={t('teams.members.addPlaceholder')}
                    disabled={isSubmitting}
                    error={error || undefined}
                />
            </div>

            <Button type="submit" variant="primary" loading={isSubmitting} className="shrink-0">
                {t('teams.members.addSubmit')}
            </Button>
        </form>
    );
};

export default AddMemberByEmailForm;
