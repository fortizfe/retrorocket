import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import { MotionConfig } from 'framer-motion';
import OwnerActionMenu from '@/features/boards/retrospective/components/OwnerActionMenu';
import { getAvailableColors, getColorConfig } from '@/lib/utils/cardColors';
import type { CardColor } from '@/features/boards/types/card';

/**
 * T006 (058-card-owner-action-hub, RED phase): `OwnerActionMenu` does not exist yet
 * (T010-T012's job) — this whole file is expected to fail to import until then.
 * Contract: contracts/owner-action-menu.md §1-2 (behaviour guarantees B1-B10 and the
 * accessibility table); state machine: data-model.md.
 *
 * Established pattern for components built on `useBoardMenuOverlay` (real Floating UI
 * runs fine in jsdom) — see CardMenu.test.tsx / ColorPicker.test.tsx. Only
 * framer-motion (animation timing) and useLanguage (identity translation, returning
 * the key itself) are mocked; `lucide-react` is mocked only for `Check` (needed to
 * assert the selected swatch shows a check icon, per the accessibility table) — every
 * other icon renders as the real SVG, so this test does not couple itself to exactly
 * which icons T010/T011's design pass picks for the trigger/Edit/Delete.
 */
vi.mock('framer-motion', () => ({
    motion: {
        // T025 (058-card-owner-action-hub, US3): in addition to the original
        // pass-through behaviour (every prop, including the raw `initial`/
        // `animate`/`exit`/`transition` objects, still spreads onto the div
        // exactly as before — "Role placement" above already depends on that,
        // querying the stringified `[animate]` attribute), also mirror
        // `initial`/`animate`/`exit`/`transition` into JSON-stringified
        // `data-*-json` attributes, so tests can read back the *actual* keys
        // and values framer-motion would have received (only opacity/transform,
        // the real duration) instead of just detecting presence.
        div: ({ children, ...props }: any) => {
            const { initial, animate, exit, transition } = props;
            return (
                <div
                    {...props}
                    data-initial-json={initial !== undefined ? JSON.stringify(initial) : undefined}
                    data-animate-json={animate !== undefined ? JSON.stringify(animate) : undefined}
                    data-exit-json={exit !== undefined ? JSON.stringify(exit) : undefined}
                    data-transition-json={transition !== undefined ? JSON.stringify(transition) : undefined}
                >
                    {children}
                </div>
            );
        },
        // Forwards its ref (matching the shared `Button` component, which renders
        // `motion.button` and forwards its own ref to it) and strips motion-only
        // props, so T019 can render Confirm/Cancel through `Button` itself rather
        // than hand-copying its classes onto plain `<button>`s.
        button: React.forwardRef<HTMLButtonElement, any>(
            ({ children, whileHover: _whileHover, whileTap: _whileTap, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }, ref) => (
                <button ref={ref} {...props}>{children}</button>
            )
        ),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
    // T025: a bare pass-through is enough — this mock never runs real framer-motion
    // animation logic at all (motion.div above is a plain div), so there is no
    // reduced-motion behaviour of framer-motion's own to simulate here. The point
    // of T025's reduced-motion case is to prove OwnerActionMenu's *own* open/close/
    // keyboard logic does not implicitly depend on anything MotionConfig would
    // otherwise change.
    MotionConfig: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('lucide-react', async () => {
    const actual = await vi.importActual<typeof import('lucide-react')>('lucide-react');
    return {
        ...actual,
        Check: () => <div data-testid="check-icon" />,
    };
});

// Local mock (overriding src/test/setup.ts's global one) so this file can assert
// calls, matching the established pattern (useJoinRetrospective.test.ts, BoardRow.test.tsx).
vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

const TRIGGER_NAME = 'retrospective.card.ownerActions.trigger';
const EDIT_NAME = 'retrospective.card.ownerActions.edit';
const DELETE_NAME = 'retrospective.card.ownerActions.delete';
const COLOR_GROUP_NAME = 'retrospective.card.ownerActions.colorGroup';
const DELETE_CONFIRM_MESSAGE = 'retrospective.card.ownerActions.deleteConfirmMessage';
const DELETE_CONFIRM_NAME = 'retrospective.card.ownerActions.deleteConfirm';
const DELETE_CANCEL_NAME = 'retrospective.card.ownerActions.deleteCancel';
const DELETING_NAME = 'retrospective.card.ownerActions.deleting';
const DELETE_ERROR_KEY = 'retrospective.card.ownerActions.deleteError';

const CURATED_COLORS = getAvailableColors();

function swatchName(color: CardColor): string {
    return getColorConfig(color).ariaLabelKey;
}

function createProps(overrides: Record<string, unknown> = {}) {
    return {
        cardId: 'card-1',
        color: 'pastelBlue' as CardColor,
        onEdit: vi.fn(),
        onColorChange: vi.fn(),
        onDelete: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

/** Deferred promise — lets a test control exactly when `onDelete` settles, to probe
 * the `deleting` busy state and the "repeated activation is ignored" guarantee (B6). */
function createDeferred<T = void>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

async function openMenu(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
    const trigger = screen.getByRole('button', { name: TRIGGER_NAME });
    await user.click(trigger);
    return screen.findByRole('menu');
}

describe('OwnerActionMenu', () => {
    const user = userEvent.setup();

    beforeEach(() => {
        vi.mocked(toast.error).mockClear();
    });

    describe('Trigger at rest (B1)', () => {
        it('is visible with no hover/focus gating, and exposes the correct closed-state ARIA', () => {
            render(<OwnerActionMenu {...createProps()} />);
            const trigger = screen.getByRole('button', { name: TRIGGER_NAME });

            expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
            expect(trigger).toHaveAttribute('aria-expanded', 'false');

            let node: HTMLElement | null = trigger;
            while (node) {
                expect(node.className).not.toMatch(/\bopacity-0\b/);
                node = node.parentElement;
            }
        });
    });

    describe('Opening (B2)', () => {
        it('opens on click, Enter, and Space, each time focusing "Edit card"', async () => {
            render(<OwnerActionMenu {...createProps()} />);
            const trigger = screen.getByRole('button', { name: TRIGGER_NAME });

            await user.click(trigger);
            let menu = await screen.findByRole('menu');
            await waitFor(() => {
                expect(within(menu).getByRole('menuitem', { name: EDIT_NAME })).toHaveFocus();
            });
            fireEvent.keyDown(document, { key: 'Escape' });
            await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());

            trigger.focus();
            await user.keyboard('{Enter}');
            menu = await screen.findByRole('menu');
            await waitFor(() => {
                expect(within(menu).getByRole('menuitem', { name: EDIT_NAME })).toHaveFocus();
            });
            fireEvent.keyDown(document, { key: 'Escape' });
            await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());

            trigger.focus();
            await user.keyboard(' ');
            menu = await screen.findByRole('menu');
            await waitFor(() => {
                expect(within(menu).getByRole('menuitem', { name: EDIT_NAME })).toHaveFocus();
            });
        });
    });

    describe('Panel content (accessibility table)', () => {
        it('renders Edit, a 15-swatch colour group with exactly one checked swatch and its check icon, a separator, and Delete', async () => {
            render(<OwnerActionMenu {...createProps({ color: 'pastelGreen' as CardColor })} />);
            const menu = await openMenu(user);

            expect(within(menu).getByRole('menuitem', { name: EDIT_NAME })).toBeInTheDocument();

            const group = within(menu).getByRole('group', { name: COLOR_GROUP_NAME });
            const swatches = within(group).getAllByRole('menuitemradio');
            expect(swatches).toHaveLength(15);

            const checked = swatches.filter((swatch) => swatch.getAttribute('aria-checked') === 'true');
            expect(checked).toHaveLength(1);
            expect(checked[0]).toHaveAccessibleName(swatchName('pastelGreen'));
            expect(within(checked[0]).getByTestId('check-icon')).toBeInTheDocument();

            expect(within(menu).getByRole('separator')).toBeInTheDocument();
            expect(within(menu).getByRole('menuitem', { name: DELETE_NAME })).toBeInTheDocument();
        });
    });

    describe('Edit (B3)', () => {
        it('closes the panel and calls onEdit exactly once', async () => {
            const onEdit = vi.fn();
            render(<OwnerActionMenu {...createProps({ onEdit })} />);
            const menu = await openMenu(user);

            await user.click(within(menu).getByRole('menuitem', { name: EDIT_NAME }));

            expect(onEdit).toHaveBeenCalledTimes(1);
            await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
        });
    });

    describe('Colour (B4)', () => {
        it('calls onColorChange once with the picked colour, closes the panel, and returns focus to the trigger', async () => {
            const onColorChange = vi.fn();
            render(<OwnerActionMenu {...createProps({ onColorChange })} />);
            const trigger = screen.getByRole('button', { name: TRIGGER_NAME });
            const menu = await openMenu(user);
            const targetColor = CURATED_COLORS[3];

            await user.click(within(menu).getByRole('menuitemradio', { name: swatchName(targetColor) }));

            expect(onColorChange).toHaveBeenCalledTimes(1);
            expect(onColorChange).toHaveBeenCalledWith(targetColor);
            await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
            expect(trigger).toHaveFocus();
        });
    });

    describe('Delete confirmation (B5)', () => {
        it('switches to an inline confirmation without calling onDelete, and Cancel returns to the item list', async () => {
            const onDelete = vi.fn();
            render(<OwnerActionMenu {...createProps({ onDelete })} />);
            const menu = await openMenu(user);

            await user.click(within(menu).getByRole('menuitem', { name: DELETE_NAME }));

            // The visible message lives inside the menu as plain text (no role, no
            // aria-live), so screen readers never announce it as a fake menu item and
            // axe's aria-required-children check has nothing to flag; Confirm is
            // described by it.
            const confirmMenu = screen.getByRole('menu');
            const confirmMessage = within(confirmMenu).getByText(DELETE_CONFIRM_MESSAGE);
            expect(confirmMessage).not.toHaveAttribute('role');
            expect(confirmMessage).not.toHaveAttribute('aria-live');
            const confirmButton = screen.getByRole('menuitem', { name: DELETE_CONFIRM_NAME });
            expect(confirmButton).toHaveAttribute('aria-describedby', confirmMessage.id);
            // Entering the confirm state is announced (FR-020) through an assertive
            // live region that sits OUTSIDE role="menu".
            const announcer = document.querySelector('[aria-live="assertive"]');
            expect(announcer).not.toBeNull();
            expect(confirmMenu).not.toContainElement(announcer as HTMLElement);
            expect(announcer).toHaveTextContent(DELETE_CONFIRM_MESSAGE);
            expect(within(confirmMenu).queryAllByRole('menuitem').map((el) => el.textContent))
                .not.toContain(DELETE_CONFIRM_MESSAGE);
            expect(onDelete).not.toHaveBeenCalled();

            await user.click(screen.getByRole('menuitem', { name: DELETE_CANCEL_NAME }));

            expect(screen.getByRole('menuitem', { name: EDIT_NAME })).toBeInTheDocument();
            expect(onDelete).not.toHaveBeenCalled();
        });
    });

    describe('Confirm (B6)', () => {
        it('calls onDelete exactly once even on a fast double activation, and shows a busy Confirm while pending', async () => {
            const deferred = createDeferred<void>();
            const onDelete = vi.fn(() => deferred.promise);
            render(<OwnerActionMenu {...createProps({ onDelete })} />);
            const menu = await openMenu(user);
            await user.click(within(menu).getByRole('menuitem', { name: DELETE_NAME }));
            const confirmButton = screen.getByRole('menuitem', { name: DELETE_CONFIRM_NAME });

            fireEvent.click(confirmButton);
            fireEvent.click(confirmButton);

            expect(onDelete).toHaveBeenCalledTimes(1);
            const busyConfirm = screen.getByRole('menuitem', { name: DELETING_NAME });
            expect(busyConfirm).toHaveAttribute('aria-busy', 'true');

            await act(async () => {
                deferred.resolve();
                await deferred.promise;
            });
        });

        it('ignores Escape and an outside pointerdown while the delete is pending (deleting cannot be dismissed)', async () => {
            const deferred = createDeferred<void>();
            const onDelete = vi.fn(() => deferred.promise);
            render(<OwnerActionMenu {...createProps({ onDelete })} />);
            const menu = await openMenu(user);
            await user.click(within(menu).getByRole('menuitem', { name: DELETE_NAME }));
            await user.click(screen.getByRole('menuitem', { name: DELETE_CONFIRM_NAME }));

            expect(screen.getByRole('menu')).toBeInTheDocument();
            fireEvent.keyDown(document, { key: 'Escape' });
            expect(screen.getByRole('menu')).toBeInTheDocument();
            fireEvent.pointerDown(document.body);
            expect(screen.getByRole('menu')).toBeInTheDocument();

            await act(async () => {
                deferred.resolve();
                await deferred.promise;
            });
        });
    });

    describe('Delete failure (B7)', () => {
        it('shows a localized toast error and returns to confirmingDelete when onDelete rejects', async () => {
            const onDelete = vi.fn().mockRejectedValue(new Error('network error'));
            render(<OwnerActionMenu {...createProps({ onDelete })} />);
            const menu = await openMenu(user);
            await user.click(within(menu).getByRole('menuitem', { name: DELETE_NAME }));
            await user.click(screen.getByRole('menuitem', { name: DELETE_CONFIRM_NAME }));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(DELETE_ERROR_KEY);
            });
            expect(screen.getByRole('menuitem', { name: DELETE_CONFIRM_NAME })).toBeInTheDocument();
            expect(within(screen.getByRole('menu')).getByText(DELETE_CONFIRM_MESSAGE)).toBeInTheDocument();
        });
    });

    describe('Closing (B8)', () => {
        it('closes on Escape and returns focus to the trigger', async () => {
            render(<OwnerActionMenu {...createProps()} />);
            const trigger = screen.getByRole('button', { name: TRIGGER_NAME });
            await openMenu(user);

            fireEvent.keyDown(document, { key: 'Escape' });

            await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
            expect(trigger).toHaveFocus();
        });

        it('closes on Tab and returns focus to the trigger (Tab MUST NOT escape the open panel)', async () => {
            render(<OwnerActionMenu {...createProps()} />);
            const trigger = screen.getByRole('button', { name: TRIGGER_NAME });
            const menu = await openMenu(user);

            fireEvent.keyDown(menu, { key: 'Tab' });

            await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
            expect(trigger).toHaveFocus();
        });

        it('closes on an outside pointerdown', async () => {
            render(<OwnerActionMenu {...createProps()} />);
            await openMenu(user);

            fireEvent.pointerDown(document.body);

            await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
        });
    });

    describe('Keyboard model (research.md §3)', () => {
        it('moves focus with ArrowDown/Home/End between Edit, the colour grid, and Delete', async () => {
            render(<OwnerActionMenu {...createProps()} />);
            const menu = await openMenu(user);
            const editItem = within(menu).getByRole('menuitem', { name: EDIT_NAME });
            const deleteItem = within(menu).getByRole('menuitem', { name: DELETE_NAME });
            const firstSwatch = within(menu).getByRole('menuitemradio', { name: swatchName(CURATED_COLORS[0]) });

            await waitFor(() => expect(editItem).toHaveFocus());

            fireEvent.keyDown(editItem, { key: 'ArrowDown' });
            expect(firstSwatch).toHaveFocus();

            fireEvent.keyDown(firstSwatch, { key: 'End' });
            expect(deleteItem).toHaveFocus();

            fireEvent.keyDown(deleteItem, { key: 'Home' });
            expect(editItem).toHaveFocus();
        });

        it('moves focus in 2-D across the 5-column swatch grid with arrow keys', async () => {
            render(<OwnerActionMenu {...createProps()} />);
            const menu = await openMenu(user);
            const swatch = (index: number) =>
                within(menu).getByRole('menuitemradio', { name: swatchName(CURATED_COLORS[index]) });

            swatch(0).focus();
            fireEvent.keyDown(swatch(0), { key: 'ArrowRight' });
            expect(swatch(1)).toHaveFocus();

            fireEvent.keyDown(swatch(1), { key: 'ArrowDown' });
            expect(swatch(6)).toHaveFocus(); // 5 columns per row: index 1 + 5 = 6

            fireEvent.keyDown(swatch(6), { key: 'ArrowLeft' });
            expect(swatch(5)).toHaveFocus();

            fireEvent.keyDown(swatch(5), { key: 'ArrowUp' });
            expect(swatch(0)).toHaveFocus();
        });
    });

    describe('Dragging (B9)', () => {
        it('closes an open panel when isDragging becomes true, and the trigger stays inert while dragging', async () => {
            const props = createProps();
            const { rerender } = render(<OwnerActionMenu {...props} />);
            await openMenu(user);

            rerender(<OwnerActionMenu {...props} isDragging />);

            await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());

            const trigger = screen.getByRole('button', { name: TRIGGER_NAME });
            await user.click(trigger);
            expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });
    });

    describe('Focus restore', () => {
        it('focuses the trigger once and calls onFocusRestored when restoreFocus is true', async () => {
            const onFocusRestored = vi.fn();
            render(<OwnerActionMenu {...createProps()} restoreFocus onFocusRestored={onFocusRestored} />);
            const trigger = screen.getByRole('button', { name: TRIGGER_NAME });

            await waitFor(() => expect(trigger).toHaveFocus());
            expect(onFocusRestored).toHaveBeenCalledTimes(1);
        });

        it('does not focus the trigger or call onFocusRestored when restoreFocus is false/absent', () => {
            const onFocusRestored = vi.fn();
            render(<OwnerActionMenu {...createProps()} onFocusRestored={onFocusRestored} />);
            const trigger = screen.getByRole('button', { name: TRIGGER_NAME });

            expect(trigger).not.toHaveFocus();
            expect(onFocusRestored).not.toHaveBeenCalled();
        });
    });

    describe('Role placement (research.md §1, §3)', () => {
        it('puts role="menu" on exactly one element — the positioning node, never the nested animated motion.div', async () => {
            render(<OwnerActionMenu {...createProps()} />);
            await openMenu(user);

            const menus = screen.getAllByRole('menu');
            expect(menus).toHaveLength(1);

            const panel = menus[0];
            expect(panel.style.position).toBeTruthy();
            expect(panel.hasAttribute('initial')).toBe(false);
            expect(panel.hasAttribute('animate')).toBe(false);
            expect(panel.hasAttribute('exit')).toBe(false);
            // The entrance/exit animation must still happen, just on a nested node.
            expect(panel.querySelector('[animate]')).not.toBeNull();
        });
    });

    // T025 (058-card-owner-action-hub, US3): sizing (FR-022, SC-005) and motion
    // (FR-023, FR-024, contract B10) guarantees that must hold on shared/projected
    // screens. See the `framer-motion` mock above for how animation props are
    // captured.
    describe('Sizing (US3, FR-022, SC-005)', () => {
        it('the trigger is 44px below md and 36px at md and above', () => {
            render(<OwnerActionMenu {...createProps()} />);
            const trigger = screen.getByRole('button', { name: TRIGGER_NAME });

            expect(trigger.className).toMatch(/\bmin-w-11\b/);
            expect(trigger.className).toMatch(/\bmin-h-11\b/);
            expect(trigger.className).toMatch(/\bmd:min-w-9\b/);
            expect(trigger.className).toMatch(/\bmd:min-h-9\b/);
        });

        it('Edit and Delete are 44px tall below md and 36px tall at md and above', async () => {
            render(<OwnerActionMenu {...createProps()} />);
            const menu = await openMenu(user);

            for (const item of [
                within(menu).getByRole('menuitem', { name: EDIT_NAME }),
                within(menu).getByRole('menuitem', { name: DELETE_NAME }),
            ]) {
                expect(item.className).toMatch(/\bmin-h-11\b/);
                expect(item.className).toMatch(/\bmd:min-h-9\b/);
            }
        });

        it('every colour swatch is 44px below md and 32px at md and above', async () => {
            render(<OwnerActionMenu {...createProps()} />);
            const menu = await openMenu(user);
            const group = within(menu).getByRole('group', { name: COLOR_GROUP_NAME });
            const swatches = within(group).getAllByRole('menuitemradio');
            expect(swatches).toHaveLength(15);

            for (const swatch of swatches) {
                expect(swatch.className).toMatch(/\bw-11\b/);
                expect(swatch.className).toMatch(/\bh-11\b/);
                expect(swatch.className).toMatch(/\bmd:w-8\b/);
                expect(swatch.className).toMatch(/\bmd:h-8\b/);
            }
        });
    });

    describe('Animation (US3, FR-023, FR-024, contract B10)', () => {
        function readJson(el: Element, attr: string): Record<string, unknown> | undefined {
            const raw = el.getAttribute(attr);
            return raw ? JSON.parse(raw) : undefined;
        }

        /** Only `opacity` and/or `transform` keys — never any other animatable
         * property (e.g. height), per contract B10. `undefined` (no prop at all,
         * e.g. `exit` on a node with no exit animation of its own) trivially
         * satisfies "nothing but opacity/transform is animated". */
        function onlyOpacityOrTransform(obj: Record<string, unknown> | undefined): boolean {
            if (!obj) return true;
            return Object.keys(obj).every((key) => key === 'opacity' || key === 'transform');
        }

        it('the panel\'s own animated node uses only opacity/transform, over 120-200ms', async () => {
            render(<OwnerActionMenu {...createProps()} />);
            const menu = await openMenu(user);

            // research.md §1/§3: role="menu" stays on the positioning div; the
            // animated node is the nested motion.div directly inside it — the
            // first (outermost) node carrying the mock's JSON markers.
            const animated = menu.querySelector('[data-animate-json]');
            expect(animated).not.toBeNull();

            const initial = readJson(animated!, 'data-initial-json');
            const animate = readJson(animated!, 'data-animate-json');
            const exit = readJson(animated!, 'data-exit-json');
            const transition = readJson(animated!, 'data-transition-json');

            expect(onlyOpacityOrTransform(initial)).toBe(true);
            expect(onlyOpacityOrTransform(animate)).toBe(true);
            expect(onlyOpacityOrTransform(exit)).toBe(true);
            expect(transition).toBeDefined();
            expect((transition!.duration as number)).toBeGreaterThanOrEqual(0.12);
            expect((transition!.duration as number)).toBeLessThanOrEqual(0.2);
        });

        it('the confirm-state cross-fade uses only opacity, over 120-200ms, with no height animation', async () => {
            render(<OwnerActionMenu {...createProps()} />);
            const menu = await openMenu(user);
            await user.click(within(menu).getByRole('menuitem', { name: DELETE_NAME }));
            await waitFor(() => expect(within(menu).getByText(DELETE_CONFIRM_MESSAGE)).toBeInTheDocument());

            // Two nested animated nodes now exist: the panel's own (outer) and the
            // confirm/menu cross-fade's own (inner, nested deeper, so last in
            // document order).
            const animatedNodes = Array.from(menu.querySelectorAll('[data-animate-json]'));
            expect(animatedNodes.length).toBeGreaterThanOrEqual(2);
            const innermost = animatedNodes[animatedNodes.length - 1];

            const initial = readJson(innermost, 'data-initial-json');
            const animate = readJson(innermost, 'data-animate-json');
            const transition = readJson(innermost, 'data-transition-json');

            expect(onlyOpacityOrTransform(initial)).toBe(true);
            expect(onlyOpacityOrTransform(animate)).toBe(true);
            expect(initial).not.toHaveProperty('height');
            expect(animate).not.toHaveProperty('height');
            expect(transition).toBeDefined();
            expect((transition!.duration as number)).toBeGreaterThanOrEqual(0.12);
            expect((transition!.duration as number)).toBeLessThanOrEqual(0.2);
        });
    });

    describe('Reduced motion (US3, FR-024)', () => {
        it('still opens, keeps keyboard navigation working, and still closes inside <MotionConfig reducedMotion="always">', async () => {
            render(
                <MotionConfig reducedMotion="always">
                    <OwnerActionMenu {...createProps()} />
                </MotionConfig>
            );

            const menu = await openMenu(user);
            await waitFor(() => {
                expect(within(menu).getByRole('menuitem', { name: EDIT_NAME })).toHaveFocus();
            });

            await user.keyboard('{ArrowDown}');
            const group = within(menu).getByRole('group', { name: COLOR_GROUP_NAME });
            const firstSwatch = within(group).getAllByRole('menuitemradio')[0];
            expect(firstSwatch).toHaveFocus();

            fireEvent.keyDown(document, { key: 'Escape' });
            await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
        });
    });
});
