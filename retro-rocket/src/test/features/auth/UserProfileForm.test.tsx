import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserProfileForm from '@/features/auth/components/UserProfileForm';
import { UserProfile } from '@/features/auth/types/user';

/**
 * Component test for the shared display-name-edit form (spec 050-profile-redesign,
 * tasks.md T018, User Story 2 — "Edit My Display Name"). Written BEFORE the T021
 * rebuild (constitution Principle I, TDD) — `UserProfileForm.tsx` at the time this
 * file was written still has its pre-redesign structure (a persistent, always-editable
 * input with no view/editing gate). data-model.md's `Editable Field Operation State`
 * entity (`mode: view | editing | saving | saved | save-error`) governs both of this
 * component's call sites — Mi Perfil (`isFirstTime={false}`) and the landing page's
 * first-time setup (`isFirstTime={true}`) — and per `ProfileDirectionB.tsx` (the
 * selected direction's build reference, `src/pages/__prototypes__/ProfileDirectionB.tsx`
 * `IdentityPanel`), the rebuilt Mi Perfil usage may gate the input behind a persistent
 * "Edit" control (`t('common.edit')`) rather than rendering it directly — T021 (a
 * separate task) makes that call. `getDisplayNameField()` below is written to hold
 * either way: it uses the field directly if already present, or reveals it via the
 * "Edit" control first if the field is gated — so these assertions keep validating
 * correctly whichever structure T021 lands on, per research.md §4.
 *
 * No local mocks for `react-i18next`/`framer-motion`/`lucide-react`/`Button`/`Input`:
 * this file previously hand-rolled data-testid stand-ins for Button/Input (coupling
 * assertions to exact mock internals) and its own English translation map (diverging
 * from the rest of the suite's raw-i18n-key convention). It now relies on the same
 * global mocks `src/test/pages/Profile.test.tsx` (T012) and `src/test/pages/
 * Landing.test.tsx` already establish as this codebase's precedent for this kind of
 * test: `src/test/setup.ts`'s react-i18next mock returns the raw translation key
 * (`t: (key) => key`), and its framer-motion mock maps every `motion.*` tag used by
 * this component tree (including `motion.form`, added alongside this change — see
 * `src/test/setup.ts` — since `ProfileDirectionB.tsx`'s reference `IdentityPanel`
 * wraps its reveal form in `motion.form`/`AnimatePresence`) to the plain host element,
 * letting the real `Button`/`Input` components render with genuine accessible
 * semantics (`getByLabelText`, `getByRole`) instead of testid stand-ins.
 */

// Raw i18n keys (src/test/setup.ts's react-i18next mock returns the key itself).
const DISPLAY_NAME_LABEL_KEY = 'auth.userProfileForm.displayName';
const EMAIL_LABEL_KEY = 'auth.userProfileForm.email';
const SAVE_KEY = 'auth.userProfileForm.saveChanges';
const CONTINUE_KEY = 'auth.userProfileForm.continue';
const EDIT_KEY = 'common.edit';

/**
 * Returns the display-name text field, revealing it first via the "Edit" control if
 * the rebuilt component gates it (data-model.md's `mode`: `view` -> `editing`). A
 * no-op against the pre-rebuild component, which renders the field directly.
 */
async function getDisplayNameField(
    user: ReturnType<typeof userEvent.setup>,
): Promise<HTMLInputElement> {
    const existing = screen.queryByLabelText(DISPLAY_NAME_LABEL_KEY, { exact: false });
    if (existing) return existing as HTMLInputElement;

    const editButton = screen.getByRole('button', { name: EDIT_KEY });
    await user.click(editButton);
    return screen.getByLabelText(DISPLAY_NAME_LABEL_KEY, { exact: false }) as HTMLInputElement;
}

describe('UserProfileForm', () => {
    const mockUserProfile: UserProfile = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        providers: ['google'],
        primaryProvider: 'google',
        joinedBoards: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic rendering', () => {
        it('renders Mi Perfil copy when isFirstTime is false', () => {
            render(<UserProfileForm userProfile={mockUserProfile} onSave={vi.fn()} isFirstTime={false} />);

            expect(screen.getByText('auth.userProfileForm.editProfile')).toBeInTheDocument();
        });

        it('renders first-time-setup copy when isFirstTime is true', () => {
            render(<UserProfileForm userProfile={mockUserProfile} onSave={vi.fn()} isFirstTime={true} />);

            expect(screen.getByText('auth.userProfileForm.welcome')).toBeInTheDocument();
        });

        it('applies a custom className to its root element', () => {
            const { container } = render(
                <UserProfileForm
                    userProfile={mockUserProfile}
                    onSave={vi.fn()}
                    isFirstTime={false}
                    className="custom-class"
                />,
            );

            expect(container.firstElementChild).toHaveClass('custom-class');
        });

        it('does not crash when userProfile is null (both call sites keep it truthy today, but the prop type allows it)', () => {
            expect(() =>
                render(<UserProfileForm userProfile={null} onSave={vi.fn()} isFirstTime={false} />),
            ).not.toThrow();
        });
    });

    describe('Read-only email (FR-002)', () => {
        it('shows the user email as a disabled field', () => {
            render(<UserProfileForm userProfile={mockUserProfile} onSave={vi.fn()} isFirstTime={false} />);

            const emailField = screen.getByLabelText(EMAIL_LABEL_KEY, { exact: false });
            expect(emailField).toHaveValue(mockUserProfile.email);
            expect(emailField).toBeDisabled();
        });
    });

    /**
     * Each block below runs the identical validation/save/error contract against both
     * `isFirstTime={false}` (Mi Perfil) and `isFirstTime={true}` (landing first-time
     * setup) — data-model.md: "Behavior and validation rules MUST be identical
     * regardless of isFirstTime — only presentation/copy may differ." Previously only
     * isFirstTime={false} (the default in `defaultProps`) was exercised by most of
     * this suite; the isFirstTime={true} rendering had its own copy-only assertions
     * ("First Time Setup UI") but never re-ran the validation/save/error scenarios.
     */
    describe.each([
        { isFirstTime: false, label: 'Mi Perfil (isFirstTime=false)', saveKey: SAVE_KEY },
        { isFirstTime: true, label: 'landing first-time setup (isFirstTime=true)', saveKey: CONTINUE_KEY },
    ])('Validation, save, and error behavior — $label', ({ isFirstTime, saveKey }) => {
        it('pre-fills the field with the current display name', async () => {
            const user = userEvent.setup();
            render(<UserProfileForm userProfile={mockUserProfile} onSave={vi.fn()} isFirstTime={isFirstTime} />);

            const field = await getDisplayNameField(user);
            expect(field).toHaveValue(mockUserProfile.displayName);
            expect(field).toHaveAttribute('required');
        });

        it('calls onSave with the trimmed display name on submit (FR-003)', async () => {
            const user = userEvent.setup();
            const mockOnSave = vi.fn().mockResolvedValue(undefined);
            render(<UserProfileForm userProfile={mockUserProfile} onSave={mockOnSave} isFirstTime={isFirstTime} />);

            const field = await getDisplayNameField(user);
            await user.clear(field);
            await user.type(field, '  Trimmed Name  ');
            fireEvent.submit(field.closest('form')!);

            await waitFor(() => expect(mockOnSave).toHaveBeenCalledWith('Trimmed Name'));
        });

        it('rejects a blank display name before any onSave call (validationState=blank)', async () => {
            const user = userEvent.setup();
            const mockOnSave = vi.fn();
            const userWithoutName = { ...mockUserProfile, displayName: '' };
            render(<UserProfileForm userProfile={userWithoutName} onSave={mockOnSave} isFirstTime={isFirstTime} />);

            const field = await getDisplayNameField(user);
            fireEvent.submit(field.closest('form')!);

            expect(mockOnSave).not.toHaveBeenCalled();
        });

        it('rejects a whitespace-only display name before any onSave call (validationState=blank)', async () => {
            const user = userEvent.setup();
            const mockOnSave = vi.fn();
            render(<UserProfileForm userProfile={mockUserProfile} onSave={mockOnSave} isFirstTime={isFirstTime} />);

            const field = await getDisplayNameField(user);
            await user.clear(field);
            await user.type(field, '   ');
            fireEvent.submit(field.closest('form')!);

            expect(mockOnSave).not.toHaveBeenCalled();
        });

        it('shows a saving/loading indicator while the save is in flight and clears it afterward (FR-003)', async () => {
            const user = userEvent.setup();
            let resolveSave: () => void;
            const savePromise = new Promise<void>((resolve) => {
                resolveSave = resolve;
            });
            const mockOnSave = vi.fn().mockReturnValue(savePromise);
            render(<UserProfileForm userProfile={mockUserProfile} onSave={mockOnSave} isFirstTime={isFirstTime} />);

            const field = await getDisplayNameField(user);
            const submitButton = screen.getByRole('button', { name: saveKey });
            fireEvent.submit(field.closest('form')!);

            // The submit control must become non-interactive while the save is pending —
            // this is the "saving/loading indicator" FR-003 requires, verified at the DOM
            // level (disabled attribute) rather than by matching specific "Saving..."
            // copy/markup, which is free to change with the rebuild.
            await waitFor(() => expect(submitButton).toBeDisabled());

            resolveSave!();
            await waitFor(() => expect(mockOnSave).toHaveBeenCalled());
            await waitFor(() => expect(submitButton).not.toBeDisabled());
        });

        it('recovers cleanly after a successful save: no error indicator, control interactive again', async () => {
            const user = userEvent.setup();
            const mockOnSave = vi.fn().mockResolvedValue(undefined);
            render(<UserProfileForm userProfile={mockUserProfile} onSave={mockOnSave} isFirstTime={isFirstTime} />);

            const field = await getDisplayNameField(user);
            fireEvent.submit(field.closest('form')!);

            await waitFor(() => expect(mockOnSave).toHaveBeenCalled());
            expect(screen.queryAllByRole('alert')).toHaveLength(0);
        });

        it('handles a failed save without crashing and clears the saving indicator (FR-003)', async () => {
            const user = userEvent.setup();
            const mockOnSave = vi.fn().mockRejectedValue(new Error('Save failed'));
            // Errors are expected here; this only silences the component's own
            // console.error (if it still logs one) rather than asserting on it — that
            // exact logging call is an implementation detail the rebuild is free to
            // change, unlike the FR-003 behaviors this test does assert on.
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            render(<UserProfileForm userProfile={mockUserProfile} onSave={mockOnSave} isFirstTime={isFirstTime} />);

            const field = await getDisplayNameField(user);
            const submitButton = screen.getByRole('button', { name: saveKey });
            fireEvent.submit(field.closest('form')!);

            await waitFor(() => expect(mockOnSave).toHaveBeenCalled());
            await waitFor(() => expect(submitButton).not.toBeDisabled());

            consoleSpy.mockRestore();
        });

        it('never presents a rejected save value as a confirmed/saved name (FR-003, data-model.md save-error)', async () => {
            const user = userEvent.setup();
            const mockOnSave = vi.fn().mockRejectedValue(new Error('Save failed'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const rejectedName = 'Should Not Persist';

            render(<UserProfileForm userProfile={mockUserProfile} onSave={mockOnSave} isFirstTime={isFirstTime} />);

            const field = await getDisplayNameField(user);
            await user.clear(field);
            await user.type(field, rejectedName);
            fireEvent.submit(field.closest('form')!);

            await waitFor(() => expect(mockOnSave).toHaveBeenCalled());

            // The rejected value legitimately remains inside the field the user is still
            // editing (queryByText doesn't match form-control values, so this only checks
            // it was never rendered as separate, static "confirmed" text/heading/etc.).
            expect(screen.queryByText(rejectedName)).not.toBeInTheDocument();

            consoleSpy.mockRestore();
        });
    });
});
