import React, { useEffect, useId, useRef, useState } from 'react';
import { motion, AnimatePresence, type Transition } from 'framer-motion';
import { User, Mail, Save, Pencil, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import Button from '@/lib/components/ui/Button';
import Input from '@/lib/components/ui/Input';
import { UserProfile } from '@/features/auth/types/user';

interface UserProfileFormProps {
    userProfile: UserProfile | null;
    onSave: (displayName: string) => Promise<void>;
    isFirstTime?: boolean;
    className?: string;
}

/**
 * Editable Field Operation State (spec 050-profile-redesign, data-model.md):
 * `saved` and `error` are terminal feedback states that persist until the next
 * edit attempt, not transient flashes — this file's own inline
 * success/error motion (T022) reflects them directly rather than on a timer.
 */
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Quiet ease-out reused verbatim from the selected direction's own decision for
 * this exact class of moment (`ProfileDirectionB.tsx`'s `EASE_OUT`, also used by
 * `Profile.tsx`'s identity-panel entrance) — not a new curve invented for this file.
 */
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

/**
 * Shared display-name-edit form (spec 050-profile-redesign T021), rebuilt per the
 * selected "Structured Account Pane" direction (`src/pages/__prototypes__/
 * ProfileDirectionB.tsx`'s `IdentityPanel` is the structural/visual reference: a
 * persistent "Edit" button expanding a real inline form, rather than an
 * always-editable field).
 *
 * Used at two call sites with an unchanged prop contract (FR-009):
 * - Mi Perfil (`Profile.tsx`, `isFirstTime=false`): the name is shown as static
 *   text behind a persistent "Edit" control — Profile.tsx's own identity panel
 *   already renders the avatar/provider/member-since summary, so this form's job
 *   here is specifically the edit affordance, not a duplicate identity display.
 * - Landing's first-time setup (`Landing.tsx`, `isFirstTime=true`): the field is
 *   shown directly with no Edit gate — there is no previous value to protect on a
 *   brand-new account, and gating it would only add friction to onboarding.
 *   data-model.md: `isFirstTime` governs presentation/copy only, never
 *   validation or persistence — both modes share identical trim/blank-rejection
 *   validation, the same saving indicator, and the same success/error feedback.
 */
const UserProfileForm: React.FC<UserProfileFormProps> = ({
    userProfile,
    onSave,
    isFirstTime = false,
    className = '',
}) => {
    const { t } = useLanguage();
    const reducedMotion = useReducedMotion();
    const nameInputId = useId();
    const nameErrorId = useId();
    const nameInputRef = useRef<HTMLInputElement>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [displayName, setDisplayName] = useState(userProfile?.displayName ?? '');
    const [status, setStatus] = useState<SaveStatus>('idle');
    const [validationError, setValidationError] = useState<string | null>(null);

    // First-time setup always shows the field directly; Mi Perfil gates it behind
    // the "Edit" control until the user asks to change their name.
    const showForm = isFirstTime || isEditing;

    // Move focus into the field when Mi Perfil's edit form opens, since it replaces
    // the static row the "Edit" button lived in (WCAG 2.1 focus-order guidance) —
    // done imperatively rather than via the `autoFocus` prop (jsx-a11y/no-autofocus),
    // matching ProfileDirectionB.tsx's own precedent for this exact moment.
    useEffect(() => {
        if (!isFirstTime && isEditing) {
            nameInputRef.current?.focus();
        }
    }, [isFirstTime, isEditing]);

    const startEdit = (): void => {
        setDisplayName(userProfile?.displayName ?? '');
        setValidationError(null);
        setStatus('idle');
        setIsEditing(true);
    };

    const cancelEdit = (): void => {
        setDisplayName(userProfile?.displayName ?? '');
        setValidationError(null);
        setStatus('idle');
        setIsEditing(false);
    };

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();

        const trimmed = displayName.trim();
        if (!trimmed) {
            setValidationError(t('auth.userProfileForm.blankNameError'));
            return;
        }

        setValidationError(null);
        setStatus('saving');
        try {
            await onSave(trimmed);
            setStatus('saved');
        } catch (error) {
            console.error('Error saving profile:', error);
            setStatus('error');
        }
    };

    const feedbackTransition: Transition = reducedMotion ? { duration: 0 } : { duration: 0.16, ease: EASE_OUT };
    const formTransition: Transition = reducedMotion ? { duration: 0 } : { duration: 0.18, ease: EASE_OUT };

    return (
        <motion.div
            // T038 (review-animations skill, spec 050): fixed two real bugs found during
            // review. (1) `transition` was `undefined` in the non-reduced-motion branch,
            // so Framer Motion fell back to its own default — a tween for `opacity` but a
            // spring for the transform `y`, on different curves/durations from each other
            // and from this file's own `EASE_OUT` used a few lines below; now explicit and
            // consistent. (2) On Mi Perfil (`isFirstTime=false`) this wrapper mounts nested
            // inside `Profile.tsx`'s own "Edit Profile Form" column entrance
            // (`x:20→0`, 0.24s, `ENTRANCE_EASE`) — both playing at once compounded into an
            // uncontrolled diagonal slide. Landing's first-time-setup call site has no such
            // parent wrapper, so this component's own entrance must stay there; skipped via
            // `initial={false}` only when `!isFirstTime`, matching this file's existing
            // `reducedMotion || isFirstTime` gating idiom used on the edit-form reveal below.
            initial={reducedMotion || !isFirstTime ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.24, ease: EASE_OUT }}
            className={`bg-surface-raised rounded-xl shadow-lg p-6 ${className}`}
        >
            {isFirstTime ? (
                <div className="text-center mb-6">
                    <motion.div
                        initial={reducedMotion ? false : { scale: 0.95, opacity: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={reducedMotion ? { duration: 0 } : { delay: 0.2, duration: 0.2, ease: EASE_OUT }}
                        className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                        <User className="w-8 h-8 text-white" aria-hidden="true" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-text-primary mb-2">
                        {t('auth.userProfileForm.welcome')}
                    </h2>
                    <p className="text-text-secondary">
                        {t('auth.userProfileForm.welcomeSubtitle')}
                    </p>
                </div>
            ) : (
                <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-text-primary mb-2">
                        {t('auth.userProfileForm.editProfile')}
                    </h3>
                    <p className="text-text-secondary">
                        {t('auth.userProfileForm.editProfileSubtitle')}
                    </p>
                </div>
            )}

            {isFirstTime && userProfile?.photoURL && (
                <div className="text-center mb-6">
                    <img
                        src={userProfile.photoURL}
                        alt={t('auth.userProfileForm.avatarAlt', { name: userProfile.displayName })}
                        className="w-20 h-20 rounded-full mx-auto border-4 border-white shadow-lg"
                    />
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label htmlFor="profile-email" className="block text-sm font-medium text-text-secondary mb-2">
                        <Mail className="w-4 h-4 inline mr-2" aria-hidden="true" />
                        {t('auth.userProfileForm.email')}
                    </label>
                    <Input
                        id="profile-email"
                        type="email"
                        value={userProfile?.email ?? ''}
                        disabled
                        className="bg-surface text-text-muted"
                    />
                    <p className="text-xs text-text-muted mt-1">
                        {t('auth.userProfileForm.emailNotEditable')}
                    </p>
                </div>

                {!showForm ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border-default px-4 py-3">
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-text-muted">
                                {t('auth.userProfileForm.displayName')}
                            </p>
                            <p className="truncate text-sm font-semibold text-text-primary">
                                {userProfile?.displayName}
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={startEdit}
                            className="flex shrink-0 items-center gap-1.5"
                        >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            {t('common.edit')}
                        </Button>
                    </div>
                ) : (
                    <motion.form
                        initial={reducedMotion || isFirstTime ? false : { opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={formTransition}
                        onSubmit={handleSubmit}
                        className="space-y-2 rounded-lg border border-border-default p-4"
                    >
                        <label htmlFor={nameInputId} className="block text-sm font-medium text-text-secondary">
                            <User className="w-4 h-4 inline mr-2" aria-hidden="true" />
                            {t('auth.userProfileForm.displayName')}
                        </label>
                        <Input
                            ref={nameInputRef}
                            id={nameInputId}
                            type="text"
                            value={displayName}
                            onChange={(e) => {
                                setDisplayName(e.target.value);
                                if (status === 'error' || status === 'saved') setStatus('idle');
                            }}
                            placeholder={t('auth.userProfileForm.displayNamePlaceholder')}
                            disabled={status === 'saving'}
                            required
                            aria-invalid={validationError ? true : undefined}
                            aria-describedby={validationError ? nameErrorId : undefined}
                        />
                        <p className="text-xs text-text-muted">
                            {t('auth.userProfileForm.displayNameHelp')}
                        </p>

                        {validationError && (
                            <p id={nameErrorId} role="alert" className="text-xs text-error-fg">
                                {validationError}
                            </p>
                        )}

                        {/* Save success/error feedback (T022, FR-013): a quiet inline
                            opacity+4px fade — "state indication" purpose, occasional-tier
                            motion per research.md §3 ("a routine save confirmation should
                            read as quiet, not celebratory"). Transitions (not keyframes) so
                            a rapid retry retargets cleanly instead of restarting from zero;
                            fully disabled under prefers-reduced-motion. Icon+text pairing
                            (never color alone) satisfies WCAG's no-color-only-meaning rule. */}
                        <AnimatePresence mode="wait" initial={false}>
                            {status === 'error' && (
                                <motion.p
                                    key="save-error"
                                    role="alert"
                                    initial={reducedMotion ? false : { opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={reducedMotion ? undefined : { opacity: 0 }}
                                    transition={feedbackTransition}
                                    className="flex items-center gap-1.5 text-xs text-error-fg"
                                >
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                    {t('auth.userProfileForm.saveError')}
                                </motion.p>
                            )}
                            {status === 'saved' && (
                                <motion.p
                                    key="save-success"
                                    role="status"
                                    initial={reducedMotion ? false : { opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={reducedMotion ? undefined : { opacity: 0 }}
                                    transition={feedbackTransition}
                                    className="flex items-center gap-1.5 text-xs text-success-fg"
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                    {t('auth.userProfileForm.saveSuccess')}
                                </motion.p>
                            )}
                        </AnimatePresence>

                        <div className="flex items-center gap-2 pt-2">
                            <Button
                                type="submit"
                                disabled={!displayName.trim() || status === 'saving'}
                                variant="primary"
                                className="flex-1 py-3 flex items-center justify-center gap-2"
                            >
                                {status === 'saving' ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        {t('auth.userProfileForm.saving')}
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" aria-hidden="true" />
                                        {isFirstTime ? t('auth.userProfileForm.continue') : t('auth.userProfileForm.saveChanges')}
                                    </>
                                )}
                            </Button>
                            {!isFirstTime && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={cancelEdit}
                                    disabled={status === 'saving'}
                                    className="flex items-center gap-1.5"
                                >
                                    <X className="h-4 w-4" aria-hidden="true" />
                                    {t('common.cancel')}
                                </Button>
                            )}
                        </div>
                    </motion.form>
                )}
            </div>

            {isFirstTime && (
                <div className="mt-4 text-center text-xs text-text-muted">
                    {t('auth.userProfileForm.editLaterNote')}
                </div>
            )}
        </motion.div>
    );
};

export default UserProfileForm;
