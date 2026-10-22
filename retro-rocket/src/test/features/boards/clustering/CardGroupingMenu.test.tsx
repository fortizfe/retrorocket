import React from 'react';
import { render, screen, waitFor, within, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ColumnGroupingContext } from '@/features/boards/clustering/dnd/ColumnGroupingContext';
import { buildColumnItems } from '@/features/boards/clustering/dnd/columnOrder';
import { BoardDataContext, EMPTY_BOARD } from '@/features/boards/retrospective/contexts/useBoardData';
import type { Card, CardGroup, MoveCardResult } from '@/features/boards/types/card';
import type { Retrospective } from '@/features/boards/types/retrospective';

/**
 * T056 + T063 + T068 (spec 059-drag-to-group-cards, US5 + US3 + US6, RED phase):
 * tests for the NEW component `clustering/components/CardGroupingMenu`
 * (named export `CardGroupingMenu`, props `{ sourceCard: Card }`, everything else is read
 * from `ColumnGroupingContext`). contracts/drag-group-ui.md G1-G7, research.md §11.
 *
 * The module does not exist yet, so it is loaded lazily (path held in a variable): every
 * test fails on its own for the right reason instead of the whole file failing to import.
 *
 * ---------------------------------------------------------------------------------------
 * CONTRACTS FIXED BY THIS FILE (the implementer must satisfy them, or amend this file with
 * a justification):
 *
 *  Trigger
 *   - A <button> named `retrospective.dragGroup.groupWith` (ungrouped source) or
 *     `retrospective.dragGroup.moveToGroup` (source with `groupId`), `aria-haspopup="listbox"`,
 *     `aria-expanded` mirroring the open state.
 *   - Touch target: the trigger carries the Tailwind classes `min-h-11 min-w-11` (44px below
 *     `md`; an `md:` override that shrinks it is allowed).
 *   - Rendered for EVERY participant (no ownership or facilitator check).
 *   - Not rendered when `groupingEnabled` is false (G3), nor for an ungrouped source with no
 *     candidate (no group and no other ungrouped card). A grouped source always has a
 *     candidate (the "Remove from group" item).
 *
 *  Panel
 *   - `role="listbox"`, named `retrospective.dragGroup.pickerTitle` (ungrouped) or
 *     `retrospective.dragGroup.moveTitle` (grouped). It takes DOM focus when it opens and
 *     keeps it: the active option is expressed with `aria-activedescendant` (listbox) +
 *     `aria-selected="true"` (option), options have unique ids. The first option is active.
 *   - Options (`role="option"`), in this order: groups first (display order of the column,
 *     never the source's own group), then the other ungrouped cards (display order, never the
 *     source itself). For a grouped source, one extra LAST option "Remove from group"
 *     (`retrospective.dragGroup.removeFromGroup`).
 *   - Group option text: `t('retrospective.dragGroup.pickerGroupOption', { title, count })`
 *     where `title` is `group.title` or `t('retrospective.groupCard.defaultGroupTitle')`
 *     when untitled, and `count` is `1 + memberCardIds.length` (head + members).
 *   - Card option text: an excerpt of `card.content` of at most 60 characters (longer content
 *     is cut and ends with an ellipsis) followed by the author display name, except on an
 *     anonymous board (`retrospective.isAnonymous`), where the author is omitted entirely.
 *   - Each option has the classes `min-h-11` (44px below `md`).
 *   - Keys (focus is on the listbox): ArrowDown/ArrowUp move the active option and WRAP;
 *     Home/End jump to the first/last; Enter selects the active option; click selects too.
 *   - Escape or an outside pointerdown closes it and focus returns to the trigger (G7).
 *
 *  Selection (G5/G6/T063)
 *   - Group option  -> `requestMove(sourceCard.id, { kind: 'group', groupId })`
 *   - Card option   -> `requestMove(sourceCard.id, { kind: 'card', cardId })`
 *   - Remove        -> `requestMove(sourceCard.id, { kind: 'position', order })` where
 *                      `order = computeOrder({ beforeId: 'group:<ownGroupId>', afterId: <id of
 *                      the column item right after the own group, or undefined> })`.
 *   - The panel closes on selection. A rejected `requestMove` is swallowed by the menu (the
 *     column already toasts, X1): no unhandled rejection, focus returns to the trigger.
 *
 *  Announcements (new OPTIONAL context member `announce?: (message: string) => void`, fed by
 *  ColumnDndProvider into its polite live region; the menu must work when it is absent)
 *   - Called ONCE per completed selection, with the outcome message, and when
 *     `result.dissolvedGroupIds` is non-empty the `groupDissolved` message is APPENDED to the
 *     same string, separated by a space (ColumnDndProvider follows the same convention):
 *       created group  -> retrospective.dragGroup.a11y.groupCreated
 *       into a group   -> retrospective.dragGroup.a11y.addedToGroup  ({ label: group title })
 *       into a card    -> groupCreated (result.createdGroupId set)
 *       remove         -> retrospective.dragGroup.a11y.removedFromGroup
 *
 *  Focus after a selection (G5, T063). Decided HERE:
 *   - If the move created a group (`result.createdGroupId`) or the context's
 *     `pendingEditGroupId` is set: the menu must NOT move focus (GroupTitleEditor's autoEdit
 *     takes it; the menu must not steal it back to the trigger either).
 *   - Otherwise, once the move has settled (the card may have been re-mounted in another
 *     place, so the menu's own DOM can be gone: the continuation must not depend on the menu
 *     still being mounted), focus goes to, in order:
 *       1. the moved card's drag handle (`button[aria-label="retrospective.card.dragHandle"]`)
 *          inside `[data-card-focus-target][data-card-id="<sourceCard.id>"]`;
 *       2. that card root itself, when it has no drag handle;
 *       3. the column element (`[data-card-column]` that contained the trigger when it was
 *          opened), when the card is no longer in the DOM.
 *     Elements that are not natively focusable get `tabindex="-1"` set by the menu if needed.
 *     (DraggableCard must therefore render `data-card-id`; asserted in DraggableCard.test.tsx.)
 * ---------------------------------------------------------------------------------------
 */

vi.mock('framer-motion', async () => {
    const R = await import('react');
    const strip = ({ initial: _i, animate: _a, exit: _e, transition: _t, whileHover: _wh, whileTap: _wt, layout: _l, variants: _v, ...rest }: Record<string, unknown>) => rest;
    const motion = new Proxy({}, {
        get: (_target, tag: string) =>
            R.forwardRef<HTMLElement, Record<string, unknown>>(({ children, ...props }, ref) =>
                R.createElement(tag, { ref, ...strip(props) }, children as React.ReactNode)),
    });
    return {
        motion,
        AnimatePresence: ({ children }: { children: React.ReactNode }) => R.createElement(R.Fragment, null, children),
        MotionConfig: ({ children }: { children: React.ReactNode }) => R.createElement(R.Fragment, null, children),
    };
});

// Identity translation that keeps the interpolation params visible: `key:a=1,b=2` (sorted).
vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({
        currentLanguage: 'en',
        t: (key: string, params?: Record<string, unknown>) =>
            params
                ? `${key}:${Object.keys(params).sort().map((k) => `${k}=${String(params[k])}`).join(',')}`
                : key,
    }),
}));

vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

const MODULE_PATH = '@/features/boards/clustering/components/CardGroupingMenu';
type MenuComponent = React.FC<{ sourceCard: Card }>;
async function loadMenu(): Promise<MenuComponent> {
    const mod = await vi.importActual<{ CardGroupingMenu: MenuComponent }>(MODULE_PATH);
    return mod.CardGroupingMenu;
}

const COL = 'col1';
const t0 = new Date('2026-01-01T00:00:00.000Z');
const LONG = 'L'.repeat(30) + 'M'.repeat(30) + 'TAILTAILTAIL' + 'Z'.repeat(40); // 112 chars

const mk = (id: string, order: number, extra: Partial<Card> = {}): Card => ({
    id, content: `content-${id}`, column: COL, createdBy: `uid-${id}`, createdByName: `Name ${id}`,
    createdAt: t0, updatedAt: t0, retrospectiveId: 'r1', order, ...extra,
});
const grp = (id: string, order: number, headCardId: string, memberCardIds: string[], extra: Partial<CardGroup> = {}): CardGroup => ({
    id, retrospectiveId: 'r1', column: COL, headCardId, memberCardIds, isCollapsed: false,
    createdAt: t0, createdBy: 'u1', order, ...extra,
});

// Display order: g1(1), U1(2), g2(3), U2(4), S(5)
const SOURCE = mk('S', 5);
const U1 = mk('U1', 2, { content: 'Alpha card', createdByName: 'Alice' });
const U2 = mk('U2', 4, { content: LONG, createdByName: 'Bob' });
const GH1 = mk('gh1', 0, { groupId: 'g1', isGroupHead: true });
const GM1 = mk('gm1', 0, { groupId: 'g1', groupOrder: 1 });
const GM2 = mk('gm2', 0, { groupId: 'g1', groupOrder: 2 });
const GH2 = mk('gh2', 0, { groupId: 'g2', isGroupHead: true });
const GM3 = mk('gm3', 0, { groupId: 'g2', groupOrder: 1 });
const ALL_CARDS = [SOURCE, U1, U2, GH1, GM1, GM2, GH2, GM3];
const G1 = grp('g1', 1, 'gh1', ['gm1', 'gm2'], { title: 'Team A' });
const G2 = grp('g2', 3, 'gh2', ['gm3']); // untitled
const GROUPS = [G1, G2];

const TRIGGER_UNGROUPED = 'retrospective.dragGroup.groupWith';
const TRIGGER_GROUPED = 'retrospective.dragGroup.moveToGroup';
const PICKER_TITLE = 'retrospective.dragGroup.pickerTitle';
const MOVE_TITLE = 'retrospective.dragGroup.moveTitle';
const REMOVE = 'retrospective.dragGroup.removeFromGroup';
const A11Y = 'retrospective.dragGroup.a11y.';
const DEFAULT_TITLE = 'retrospective.groupCard.defaultGroupTitle';

interface CtxOptions {
    cards?: Card[];
    groups?: CardGroup[];
    groupingEnabled?: boolean;
    requestMove?: (...args: any[]) => Promise<MoveCardResult | void>;
    announce?: ((message: string) => void) | null;
    pendingEditGroupId?: string | null;
}

function makeCtx(opts: CtxOptions = {}) {
    const cards = opts.cards ?? ALL_CARDS;
    const groups = opts.groups ?? GROUPS;
    const ctx: Record<string, unknown> = {
        columnId: COL,
        groupingEnabled: opts.groupingEnabled ?? true,
        items: buildColumnItems(cards, groups, COL),
        groups,
        ungroupedCards: cards.filter((c) => c.column === COL && !c.groupId),
        armedTargetId: null, insertionLine: null, busyTargetId: null,
        pendingEditGroupId: opts.pendingEditGroupId ?? null,
        consumePendingEdit: vi.fn(),
        requestMove: opts.requestMove ?? vi.fn(async (): Promise<MoveCardResult> => ({ dissolvedGroupIds: [] })),
        computeOrder: vi.fn(() => 77),
    };
    if (opts.announce !== null) ctx.announce = opts.announce ?? vi.fn();
    return ctx;
}

const boardWith = (isAnonymous: boolean) => ({
    ...EMPTY_BOARD,
    retrospective: { id: 'r1', isAnonymous } as Retrospective,
});

async function renderMenu(source: Card, opts: CtxOptions & { anonymous?: boolean } = {}) {
    const Menu = await loadMenu();
    const ctx = makeCtx(opts);
    const utils = render(
        <BoardDataContext.Provider value={boardWith(!!opts.anonymous)}>
            <ColumnGroupingContext.Provider value={ctx as never}>
                <div data-card-column tabIndex={-1} data-testid="column">
                    <div data-card-focus-target data-card-id={source.id} tabIndex={-1}>
                        <Menu sourceCard={source} />
                    </div>
                </div>
            </ColumnGroupingContext.Provider>
        </BoardDataContext.Provider>,
    );
    return { ...utils, ctx: ctx as any };
}

const triggerUngrouped = () => screen.getByRole('button', { name: TRIGGER_UNGROUPED });
const triggerGrouped = () => screen.getByRole('button', { name: TRIGGER_GROUPED });
const options = () => within(screen.getByRole('listbox')).getAllByRole('option');
const activeOption = () => {
    const listbox = screen.getByRole('listbox');
    return options().find((o) => o.id === listbox.getAttribute('aria-activedescendant'));
};
async function open(user: ReturnType<typeof userEvent.setup>, trigger: HTMLElement) {
    await user.click(trigger);
    await screen.findByRole('listbox');
}

describe('CardGroupingMenu: ungrouped variant (spec 059, T056)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('G1: visibility for every participant', () => {
        it('renders the "Group with…" trigger for a participant who is neither the card owner nor a facilitator', async () => {
            // EMPTY_BOARD.isFacilitator is false and the card belongs to someone else.
            await renderMenu({ ...SOURCE, createdBy: 'somebody-else' });

            const trigger = triggerUngrouped();
            expect(trigger).toBeInTheDocument();
            expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
            expect(trigger).toHaveAttribute('aria-expanded', 'false');
        });

        it('has a 44px touch target below md (class contract: min-h-11 min-w-11)', async () => {
            await renderMenu(SOURCE);

            expect(triggerUngrouped().className).toMatch(/(^|\s)min-h-11(\s|$)/);
            expect(triggerUngrouped().className).toMatch(/(^|\s)min-w-11(\s|$)/);
        });

        it('has a visible focus ring', async () => {
            await renderMenu(SOURCE);

            expect(triggerUngrouped().className).toMatch(/focus-visible:ring-2/);
        });
    });

    describe('G3: hidden when grouping is unavailable', () => {
        it('renders nothing when groupingEnabled is false (mode user)', async () => {
            await renderMenu(SOURCE, { groupingEnabled: false });

            expect(screen.queryByRole('button', { name: TRIGGER_UNGROUPED })).not.toBeInTheDocument();
        });

        it('renders nothing when there is no candidate (no group, no other ungrouped card)', async () => {
            await renderMenu(SOURCE, { cards: [SOURCE], groups: [] });

            expect(screen.queryByRole('button', { name: TRIGGER_UNGROUPED })).not.toBeInTheDocument();
        });

        it('renders when the only candidate is a group', async () => {
            await renderMenu(SOURCE, { cards: [SOURCE, GH1, GM1, GM2], groups: [G1] });

            expect(triggerUngrouped()).toBeInTheDocument();
        });

        it('renders when the only candidate is another ungrouped card', async () => {
            await renderMenu(SOURCE, { cards: [SOURCE, U1], groups: [] });

            expect(triggerUngrouped()).toBeInTheDocument();
        });
    });

    describe('G4: the listbox', () => {
        it('opens a listbox named "pickerTitle" and flips aria-expanded', async () => {
            const user = userEvent.setup();
            await renderMenu(SOURCE);

            await open(user, triggerUngrouped());

            expect(screen.getByRole('listbox', { name: PICKER_TITLE })).toBeInTheDocument();
            expect(triggerUngrouped()).toHaveAttribute('aria-expanded', 'true');
        });

        it('lists groups first (title + count, default title when untitled), then the other ungrouped cards', async () => {
            const user = userEvent.setup();
            await renderMenu(SOURCE);

            await open(user, triggerUngrouped());
            const texts = options().map((o) => o.textContent ?? '');

            expect(texts).toHaveLength(4); // g1, g2, U1, U2 (not the source, not grouped cards)
            expect(texts[0]).toContain('retrospective.dragGroup.pickerGroupOption:count=3,title=Team A');
            expect(texts[1]).toContain(`retrospective.dragGroup.pickerGroupOption:count=2,title=${DEFAULT_TITLE}`);
            expect(texts[2]).toContain('Alpha card');
            expect(texts[3]).toContain('L'.repeat(30));
        });

        it('never lists the source card itself nor cards that belong to a group', async () => {
            const user = userEvent.setup();
            await renderMenu(SOURCE);

            await open(user, triggerUngrouped());
            const joined = options().map((o) => o.textContent).join('|');

            expect(joined).not.toContain('content-S');
            expect(joined).not.toContain('content-gh1');
            expect(joined).not.toContain('content-gm1');
        });

        it('cuts a long card to a ~60 character excerpt ending with an ellipsis', async () => {
            const user = userEvent.setup();
            await renderMenu(SOURCE, { anonymous: true });

            await open(user, triggerUngrouped());
            const text = options()[3].textContent ?? '';

            expect(text).toContain('L'.repeat(30) + 'M'.repeat(20));
            expect(text).not.toContain('TAILTAIL');
            expect(text.length).toBeLessThanOrEqual(64);
            expect(text.endsWith('…')).toBe(true);
        });

        it('shows the author of each card on a non-anonymous board', async () => {
            const user = userEvent.setup();
            await renderMenu(SOURCE, { anonymous: false });

            await open(user, triggerUngrouped());
            const texts = options().map((o) => o.textContent ?? '');

            expect(texts[2]).toContain('Alice');
            expect(texts[3]).toContain('Bob');
        });

        it('omits the author entirely on an anonymous board (no display name, no uid)', async () => {
            const user = userEvent.setup();
            await renderMenu(SOURCE, { anonymous: true });

            await open(user, triggerUngrouped());
            const joined = options().map((o) => o.textContent ?? '').join('|');

            expect(joined).not.toContain('Alice');
            expect(joined).not.toContain('Bob');
            expect(joined).not.toContain('uid-U1');
        });

        it('makes the first option active through aria-activedescendant, with unique option ids', async () => {
            const user = userEvent.setup();
            await renderMenu(SOURCE);

            await open(user, triggerUngrouped());
            const listbox = screen.getByRole('listbox');
            const opts = options();

            expect(listbox).toHaveFocus();
            expect(new Set(opts.map((o) => o.id)).size).toBe(opts.length);
            expect(opts.every((o) => o.id !== '')).toBe(true);
            expect(listbox).toHaveAttribute('aria-activedescendant', opts[0].id);
            expect(opts[0]).toHaveAttribute('aria-selected', 'true');
            expect(opts[1]).toHaveAttribute('aria-selected', 'false');
        });

        it('gives every option a 44px touch target below md (class contract: min-h-11)', async () => {
            const user = userEvent.setup();
            await renderMenu(SOURCE);

            await open(user, triggerUngrouped());

            for (const option of options()) expect(option.className).toMatch(/(^|\s)min-h-11(\s|$)/);
        });
    });

    describe('G5: keyboard model and selection', () => {
        it('ArrowDown / ArrowUp move the active option and wrap around', async () => {
            const user = userEvent.setup();
            await renderMenu(SOURCE);
            await open(user, triggerUngrouped());
            const opts = options();

            await user.keyboard('{ArrowDown}');
            expect(activeOption()).toBe(opts[1]);
            await user.keyboard('{ArrowUp}{ArrowUp}');
            expect(activeOption()).toBe(opts[opts.length - 1]); // wrapped up from the first
            await user.keyboard('{ArrowDown}');
            expect(activeOption()).toBe(opts[0]); // wrapped down from the last
        });

        it('Home and End jump to the first and last option', async () => {
            const user = userEvent.setup();
            await renderMenu(SOURCE);
            await open(user, triggerUngrouped());
            const opts = options();

            await user.keyboard('{End}');
            expect(activeOption()).toBe(opts[opts.length - 1]);
            await user.keyboard('{Home}');
            expect(activeOption()).toBe(opts[0]);
        });

        it('Enter on a group option calls requestMove(src, {kind:"group"}) and closes the panel', async () => {
            const user = userEvent.setup();
            const { ctx } = await renderMenu(SOURCE);
            await open(user, triggerUngrouped());

            await user.keyboard('{Enter}'); // first option = g1

            expect(ctx.requestMove).toHaveBeenCalledTimes(1);
            expect(ctx.requestMove).toHaveBeenCalledWith('S', { kind: 'group', groupId: 'g1' });
            await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
        });

        it('Enter on the second group option targets that group', async () => {
            const user = userEvent.setup();
            const { ctx } = await renderMenu(SOURCE);
            await open(user, triggerUngrouped());

            await user.keyboard('{ArrowDown}{Enter}');

            expect(ctx.requestMove).toHaveBeenCalledWith('S', { kind: 'group', groupId: 'g2' });
        });

        it('End then Enter on a card option calls requestMove(src, {kind:"card"})', async () => {
            const user = userEvent.setup();
            const { ctx } = await renderMenu(SOURCE);
            await open(user, triggerUngrouped());

            await user.keyboard('{End}{Enter}'); // last option = U2

            expect(ctx.requestMove).toHaveBeenCalledWith('S', { kind: 'card', cardId: 'U2' });
        });

        it('clicking an option selects it', async () => {
            const user = userEvent.setup();
            const { ctx } = await renderMenu(SOURCE);
            await open(user, triggerUngrouped());

            await user.click(options()[2]); // U1

            expect(ctx.requestMove).toHaveBeenCalledWith('S', { kind: 'card', cardId: 'U1' });
        });

        it('opens from the keyboard (Enter on the focused trigger)', async () => {
            const user = userEvent.setup();
            await renderMenu(SOURCE);

            triggerUngrouped().focus();
            await user.keyboard('{Enter}');

            expect(await screen.findByRole('listbox')).toBeInTheDocument();
        });

        it('after a create, focus is NOT pulled back to the trigger: the new group title input keeps it', async () => {
            const user = userEvent.setup();
            const Menu = await loadMenu();

            // Stand-in for GroupTitleEditor's autoEdit: it appears when pendingEditGroupId is
            // set (what GroupableColumn does right after a create) and takes focus on mount.
            const TitleInputStandIn: React.FC = () => {
                const ref = React.useRef<HTMLInputElement>(null);
                React.useEffect(() => { ref.current?.focus(); }, []);
                return <input ref={ref} data-testid="group-title-input" aria-label="title" />;
            };
            const CreateHarness: React.FC = () => {
                const [pending, setPending] = React.useState<string | null>(null);
                const ctx = {
                    ...makeCtx({ pendingEditGroupId: pending }),
                    requestMove: vi.fn(async (): Promise<MoveCardResult> => {
                        setPending('gNew');
                        return { createdGroupId: 'gNew', dissolvedGroupIds: [] };
                    }),
                };
                return (
                    <BoardDataContext.Provider value={boardWith(false)}>
                        <ColumnGroupingContext.Provider value={ctx as never}>
                            <div data-card-column tabIndex={-1}>
                                <Menu sourceCard={SOURCE} />
                                {pending && <TitleInputStandIn />}
                            </div>
                        </ColumnGroupingContext.Provider>
                    </BoardDataContext.Provider>
                );
            };
            render(<CreateHarness />);
            await open(user, triggerUngrouped());

            await user.keyboard('{End}{Enter}'); // card U2 -> creates a group

            const input = await screen.findByTestId('group-title-input');
            await waitFor(() => expect(input).toHaveFocus());
            // Give any deferred focus-return (rAF / timeout / floating-ui) the chance to steal it.
            await act(async () => { await new Promise((r) => setTimeout(r, 120)); });
            expect(input).toHaveFocus();
            expect(triggerUngrouped()).not.toHaveFocus();
            expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        });

        it('swallows a rejected requestMove (X1: the column already toasts) and returns focus to the trigger', async () => {
            const user = userEvent.setup();
            const requestMove = vi.fn(async () => { throw new Error('409'); });
            await renderMenu(SOURCE, { requestMove });
            await open(user, triggerUngrouped());

            await user.keyboard('{Enter}');

            await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
            await waitFor(() => expect(triggerUngrouped()).toHaveFocus());
        });

        it('works when the context has no announce function', async () => {
            const user = userEvent.setup();
            const { ctx } = await renderMenu(SOURCE, { announce: null });
            await open(user, triggerUngrouped());

            await user.keyboard('{Enter}');

            await waitFor(() => expect(ctx.requestMove).toHaveBeenCalled());
        });
    });

    describe('G7: dismissal', () => {
        it('Escape closes the panel, makes no move and returns focus to the trigger', async () => {
            const user = userEvent.setup();
            const { ctx } = await renderMenu(SOURCE);
            await open(user, triggerUngrouped());

            await user.keyboard('{Escape}');

            await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
            expect(triggerUngrouped()).toHaveFocus();
            expect(triggerUngrouped()).toHaveAttribute('aria-expanded', 'false');
            expect(ctx.requestMove).not.toHaveBeenCalled();
        });

        it('an outside pointerdown closes the panel, makes no move and returns focus to the trigger', async () => {
            const user = userEvent.setup();
            const { ctx } = await renderMenu(SOURCE);
            await open(user, triggerUngrouped());

            fireEvent.pointerDown(document.body);

            await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
            await waitFor(() => expect(triggerUngrouped()).toHaveFocus());
            expect(ctx.requestMove).not.toHaveBeenCalled();
        });
    });

    describe('announcements (ungrouped selections)', () => {
        it('announces "added to group" with the group title as label', async () => {
            const user = userEvent.setup();
            const { ctx } = await renderMenu(SOURCE);
            await open(user, triggerUngrouped());

            await user.keyboard('{Enter}'); // g1 "Team A"

            await waitFor(() => expect(ctx.announce).toHaveBeenCalledTimes(1));
            expect(ctx.announce).toHaveBeenCalledWith(`${A11Y}addedToGroup:label=Team A`);
        });

        it('announces "group created" when the move created a group', async () => {
            const user = userEvent.setup();
            const requestMove = vi.fn(async (): Promise<MoveCardResult> => ({ createdGroupId: 'gNew', dissolvedGroupIds: [] }));
            const { ctx } = await renderMenu(SOURCE, { requestMove });
            await open(user, triggerUngrouped());

            await user.keyboard('{End}{Enter}');

            await waitFor(() => expect(ctx.announce).toHaveBeenCalledWith(`${A11Y}groupCreated`));
        });
    });
});

describe('CardGroupingMenu: choosing a group moves the card and restores focus (spec 059, T063)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * Moving a card into a group re-mounts it somewhere else (GroupCard), so the menu that
     * triggered the move is UNMOUNTED by the time requestMove resolves. `after` renders the
     * card's new location (or nothing).
     */
    async function renderMovable(after: 'handle' | 'rootOnly' | 'gone') {
        const user = userEvent.setup();
        const Menu = await loadMenu();
        // Created ONCE, outside render: the setMoved re-render must not replace the spy the
        // assertions hold (a per-render vi.fn() made the asserted spy a different instance).
        let setMovedRef: (moved: boolean) => void = () => {};
        const requestMove = vi.fn(async (): Promise<MoveCardResult> => {
            setMovedRef(true);
            return { dissolvedGroupIds: [] };
        });
        const ctx = { ...makeCtx(), requestMove };
        const Harness: React.FC = () => {
            const [moved, setMoved] = React.useState(false);
            setMovedRef = setMoved;
            return (
                <BoardDataContext.Provider value={boardWith(false)}>
                    <ColumnGroupingContext.Provider value={ctx as never}>
                        <div data-card-column tabIndex={-1} data-testid="column">
                            {!moved && (
                                <div data-testid="old-location">
                                    <div data-card-focus-target data-card-id="S" tabIndex={-1}>
                                        <Menu sourceCard={SOURCE} />
                                    </div>
                                </div>
                            )}
                            {moved && after !== 'gone' && (
                                <div data-testid="group-g1">
                                    <div data-card-focus-target data-card-id="S" tabIndex={-1} data-testid="new-root">
                                        {after === 'handle' && <button aria-label="retrospective.card.dragHandle" data-testid="new-handle" />}
                                    </div>
                                </div>
                            )}
                        </div>
                    </ColumnGroupingContext.Provider>
                </BoardDataContext.Provider>
            );
        };
        render(<Harness />);
        await open(user, triggerUngrouped());
        return { user, getCtx: () => ctx };
    }

    it('calls requestMove(src, {kind:"group", groupId}) when a group option is chosen', async () => {
        const { user, getCtx } = await renderMovable('handle');

        await user.keyboard('{Enter}');

        expect(getCtx().requestMove).toHaveBeenCalledWith('S', { kind: 'group', groupId: 'g1' });
    });

    it("focus goes to the moved card's drag handle in its new location, even though the menu was unmounted", async () => {
        const { user } = await renderMovable('handle');

        await user.keyboard('{Enter}');

        await waitFor(() => expect(screen.getByTestId('new-handle')).toHaveFocus());
        expect(screen.queryByTestId('old-location')).not.toBeInTheDocument();
    });

    it('falls back to the moved card root when it has no drag handle', async () => {
        const { user } = await renderMovable('rootOnly');

        await user.keyboard('{Enter}');

        await waitFor(() => expect(screen.getByTestId('new-root')).toHaveFocus());
    });

    it('falls back to the column element when the card is no longer in the DOM', async () => {
        const { user } = await renderMovable('gone');

        await user.keyboard('{Enter}');

        await waitFor(() => expect(screen.getByTestId('column')).toHaveFocus());
    });

    it('does not move focus anywhere before the move has settled', async () => {
        const user = userEvent.setup();
        const Menu = await loadMenu();
        let release!: () => void;
        const requestMove = vi.fn(() => new Promise<MoveCardResult>((resolve) => { release = () => resolve({ dissolvedGroupIds: [] }); }));
        const ctx = makeCtx({ requestMove });
        render(
            <BoardDataContext.Provider value={boardWith(false)}>
                <ColumnGroupingContext.Provider value={ctx as never}>
                    <div data-card-column tabIndex={-1} data-testid="column">
                        <div data-card-focus-target data-card-id="S" tabIndex={-1}><Menu sourceCard={SOURCE} /></div>
                    </div>
                </ColumnGroupingContext.Provider>
            </BoardDataContext.Provider>,
        );
        await open(user, triggerUngrouped());

        await user.keyboard('{Enter}');

        expect(screen.getByTestId('column')).not.toHaveFocus();
        await act(async () => { release(); });
    });
});

describe('CardGroupingMenu: grouped variant (spec 059, T068: G2 + G6)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // gm1 is a member of g1 (title "Team A"); the column continues: g1(1), U1(2), g2(3), U2(4), S(5).
    const MEMBER = GM1;

    describe('G2: trigger and panel', () => {
        it('shows a "Move to group…" trigger (not "Group with…") for a grouped card', async () => {
            await renderMenu(MEMBER);

            expect(triggerGrouped()).toHaveAttribute('aria-haspopup', 'listbox');
            expect(screen.queryByRole('button', { name: TRIGGER_UNGROUPED })).not.toBeInTheDocument();
        });

        it('has a 44px touch target below md (class contract: min-h-11 min-w-11)', async () => {
            await renderMenu(MEMBER);

            expect(triggerGrouped().className).toMatch(/(^|\s)min-h-11(\s|$)/);
            expect(triggerGrouped().className).toMatch(/(^|\s)min-w-11(\s|$)/);
        });

        it('opens a listbox named "moveTitle"', async () => {
            const user = userEvent.setup();
            await renderMenu(MEMBER);

            await open(user, triggerGrouped());

            expect(screen.getByRole('listbox', { name: MOVE_TITLE })).toBeInTheDocument();
        });

        it('lists the OTHER groups and the ungrouped cards, never its own group, then "Remove from group" last', async () => {
            const user = userEvent.setup();
            await renderMenu(MEMBER);

            await open(user, triggerGrouped());
            const texts = options().map((o) => o.textContent ?? '');

            // g2, U1, U2, S, Remove  (g1 is the card's own group and is never offered)
            expect(texts).toHaveLength(5);
            expect(texts[0]).toContain(`pickerGroupOption:count=2,title=${DEFAULT_TITLE}`);
            expect(texts.join('|')).not.toContain('title=Team A');
            expect(texts[1]).toContain('Alpha card');
            expect(texts[2]).toContain('L'.repeat(30));
            expect(texts[3]).toContain('content-S');
            expect(texts[4]).toContain(REMOVE);
        });

        it('stays available with no other group or card, because "Remove from group" is still possible', async () => {
            const user = userEvent.setup();
            await renderMenu(MEMBER, { cards: [GH1, GM1, GM2], groups: [G1] });

            await open(user, triggerGrouped());

            expect(options().map((o) => o.textContent ?? '')).toEqual([expect.stringContaining(REMOVE)]);
            expect(activeOption()).toBe(options()[0]);
        });

        it('is hidden when grouping is disabled (mode user)', async () => {
            await renderMenu(MEMBER, { groupingEnabled: false });

            expect(screen.queryByRole('button', { name: TRIGGER_GROUPED })).not.toBeInTheDocument();
        });

        it('a group option moves into that group; a card option groups with that card', async () => {
            const user = userEvent.setup();
            const { ctx } = await renderMenu(MEMBER);
            await open(user, triggerGrouped());

            await user.keyboard('{Enter}');
            expect(ctx.requestMove).toHaveBeenLastCalledWith('gm1', { kind: 'group', groupId: 'g2' });

            await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
            await open(user, triggerGrouped());
            await user.keyboard('{ArrowDown}{Enter}');
            expect(ctx.requestMove).toHaveBeenLastCalledWith('gm1', { kind: 'card', cardId: 'U1' });
        });
    });

    describe('Remove from group (G6)', () => {
        it('requests a position right after the own group: computeOrder({beforeId: group, afterId: next item})', async () => {
            const user = userEvent.setup();
            const { ctx } = await renderMenu(MEMBER);
            await open(user, triggerGrouped());

            await user.keyboard('{End}{Enter}');

            // Column order: g1, U1, ... so the item right after g1 is card:U1.
            expect(ctx.computeOrder).toHaveBeenCalledWith({ beforeId: 'group:g1', afterId: 'card:U1' });
            expect(ctx.requestMove).toHaveBeenCalledTimes(1);
            expect(ctx.requestMove).toHaveBeenCalledWith('gm1', { kind: 'position', order: 77 });
            await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
        });

        it('passes afterId undefined when the own group is the last item of the column', async () => {
            const user = userEvent.setup();
            const lastGroup = grp('g1', 99, 'gh1', ['gm1', 'gm2'], { title: 'Team A' });
            const { ctx } = await renderMenu(MEMBER, { groups: [lastGroup, G2] });
            await open(user, triggerGrouped());

            await user.keyboard('{End}{Enter}');

            expect(ctx.computeOrder).toHaveBeenCalledWith({ beforeId: 'group:g1', afterId: undefined });
            expect(ctx.requestMove).toHaveBeenCalledWith('gm1', { kind: 'position', order: 77 });
        });

        it('announces "removed from the group"', async () => {
            const user = userEvent.setup();
            const { ctx } = await renderMenu(MEMBER);
            await open(user, triggerGrouped());

            await user.keyboard('{End}{Enter}');

            await waitFor(() => expect(ctx.announce).toHaveBeenCalledTimes(1));
            expect(ctx.announce).toHaveBeenCalledWith(`${A11Y}removedFromGroup`);
        });

        it('G6: also announces "group dissolved" (same message, appended) when dissolvedGroupIds is non-empty', async () => {
            const user = userEvent.setup();
            const requestMove = vi.fn(async (): Promise<MoveCardResult> => ({ dissolvedGroupIds: ['g1'] }));
            const { ctx } = await renderMenu(MEMBER, { requestMove });
            await open(user, triggerGrouped());

            await user.keyboard('{End}{Enter}');

            await waitFor(() => expect(ctx.announce).toHaveBeenCalledTimes(1));
            const message = (ctx.announce as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
            expect(message).toContain(`${A11Y}removedFromGroup`);
            expect(message).toContain(`${A11Y}groupDissolved`);
            expect(message.indexOf('removedFromGroup')).toBeLessThan(message.indexOf('groupDissolved'));
        });

        it('does not announce "dissolved" when nothing dissolved', async () => {
            const user = userEvent.setup();
            const { ctx } = await renderMenu(MEMBER);
            await open(user, triggerGrouped());

            await user.keyboard('{End}{Enter}');

            await waitFor(() => expect(ctx.announce).toHaveBeenCalled());
            expect((ctx.announce as ReturnType<typeof vi.fn>).mock.calls[0][0]).not.toContain('groupDissolved');
        });

        it('G6: moving into another group also appends "group dissolved" when the old group dissolved', async () => {
            const user = userEvent.setup();
            const requestMove = vi.fn(async (): Promise<MoveCardResult> => ({ dissolvedGroupIds: ['g1'] }));
            const { ctx } = await renderMenu(MEMBER, { requestMove });
            await open(user, triggerGrouped());

            await user.keyboard('{Enter}'); // first option = g2

            await waitFor(() => expect(ctx.announce).toHaveBeenCalledTimes(1));
            const message = (ctx.announce as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
            expect(message).toContain(`${A11Y}addedToGroup:label=`);
            expect(message).toContain(`${A11Y}groupDissolved`);
        });

        it('Escape closes it without moving or announcing, and focus returns to the trigger (G7)', async () => {
            const user = userEvent.setup();
            const { ctx } = await renderMenu(MEMBER);
            await open(user, triggerGrouped());

            await user.keyboard('{Escape}');

            await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
            expect(triggerGrouped()).toHaveFocus();
            expect(ctx.requestMove).not.toHaveBeenCalled();
            expect(ctx.announce).not.toHaveBeenCalled();
        });
    });
});
