import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import toast from 'react-hot-toast';
import { GroupTitleEditor } from '@/features/boards/clustering/components/GroupTitleEditor';

/**
 * T048 (spec 059-drag-to-group-cards, US2: behaviours T1-T9, contracts/drag-group-ui.md).
 *
 * CONTRACTS FIXED BY THIS FILE:
 *  - Export: NAMED export `GroupTitleEditor` (like `GroupCard`), props
 *    `{ title?; isReadOnly?; autoEdit?; onAutoEditConsumed?(); onCommit(title: string | null): Promise<void> }`.
 *  - i18n via `useLanguage().t`. Keys used:
 *      retrospective.groupCard.defaultGroupTitle     (display when title is absent/blank, T7)
 *      retrospective.groupCard.renameGroupLabel      ({title}) -> accessible name of the display button
 *      retrospective.groupCard.groupTitleInputLabel  -> accessible name of the input
 *      retrospective.groupCard.renameError           -> toast.error message (default export of react-hot-toast)
 *    For `renameGroupLabel` the {title} param is the DISPLAYED title (the default title when untitled).
 *  - NO LAYOUT SHIFT (T1): the display <button> and the edit <input> both carry the attribute
 *    `data-title-box` and share the same "box" classes. "Box classes" = the className tokens that
 *    determine size and typography: width/min/max-width, height, padding, margin, font-size
 *    (text-xs..text-9xl), font-weight (font-*), leading-*, tracking-*, border width (`border`,
 *    `border-N`) and rounded-*. The set of box tokens of the button must EQUAL that of the input,
 *    be non-empty, and include `w-full` and a font-size token.
 *  - Focus ring on BOTH button and input: className tokens `focus-visible:ring-2` and `focus-visible:ring-focus`.
 *  - Input: `maxLength = 60`, `type="text"`; on entering edit its value is the displayed title
 *    (default title when untitled) and the whole value is selected.
 *  - Read-only: plain text (no button, no textbox), still showing the title / default title.
 */

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string, params?: Record<string, unknown>) =>
            params?.title !== undefined ? `${key}::${params.title}` : key,
    }),
}));

const RENAME = 'retrospective.groupCard.renameGroupLabel';
const DEFAULT_TITLE = 'retrospective.groupCard.defaultGroupTitle';
const INPUT_LABEL = 'retrospective.groupCard.groupTitleInputLabel';

const BOX_TOKEN = /^(w-|min-w-|max-w-|h-|min-h-|max-h-|p[xytblr]?-|m[xytblr]?-|text-(xs|sm|base|lg|xl|[2-9]xl)$|font-|leading-|tracking-|border$|border-\d|rounded)/;
const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
const boxTokens = (el: Element) => tokens(el).filter((c) => BOX_TOKEN.test(c)).sort();

const displayButton = () => screen.getByRole('button', { name: new RegExp(RENAME) });
const inputEl = () => screen.getByRole('textbox') as HTMLInputElement;

function setup(props: Partial<React.ComponentProps<typeof GroupTitleEditor>> = {}) {
    const onCommit = vi.fn(async (_t: string | null) => { });
    const utils = render(<GroupTitleEditor title="Team" onCommit={onCommit} {...props} />);
    const rerenderWith = (next: Partial<React.ComponentProps<typeof GroupTitleEditor>>) =>
        utils.rerender(<GroupTitleEditor title="Team" onCommit={onCommit} {...props} {...next} />);
    return { onCommit, rerenderWith, ...utils };
}

const enterEdit = async () => {
    await userEvent.click(displayButton());
    return inputEl();
};

describe('GroupTitleEditor (spec 059, T048)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('display state', () => {
        it('renders a button whose accessible name is renameGroupLabel with the title', () => {
            setup({ title: 'Team' });

            const button = screen.getByRole('button', { name: `${RENAME}::Team` });
            expect(button).toHaveTextContent('Team');
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });

        it('T7: an absent title shows the default title (also in the accessible name)', () => {
            setup({ title: undefined });

            expect(screen.getByRole('button', { name: `${RENAME}::${DEFAULT_TITLE}` })).toHaveTextContent(DEFAULT_TITLE);
        });

        it('T7: a whitespace-only title is treated as untitled', () => {
            setup({ title: '   ' });

            expect(screen.getByRole('button')).toHaveTextContent(DEFAULT_TITLE);
        });
    });

    describe('T1: entering edit mode', () => {
        it('click opens an input with the title, focused, fully selected', async () => {
            setup({ title: 'Team' });

            const input = await enterEdit();

            expect(input).toHaveFocus();
            expect(input.value).toBe('Team');
            expect(input.selectionStart).toBe(0);
            expect(input.selectionEnd).toBe(4);
            expect(screen.queryByRole('button')).not.toBeInTheDocument();
        });

        it('Enter on the focused display button opens the input', async () => {
            setup();
            displayButton().focus();

            await userEvent.keyboard('{Enter}');

            expect(inputEl()).toHaveFocus();
        });

        it('Space on the focused display button opens the input', async () => {
            setup();
            displayButton().focus();

            await userEvent.keyboard(' ');

            expect(inputEl()).toHaveFocus();
        });

        it('the input has an accessible name (groupTitleInputLabel)', async () => {
            setup();
            await enterEdit();

            expect(screen.getByRole('textbox', { name: INPUT_LABEL })).toBeInTheDocument();
        });

        it('untitled: the input starts with the default title, all selected', async () => {
            setup({ title: undefined });

            const input = await enterEdit();

            expect(input.value).toBe(DEFAULT_TITLE);
            expect(input.selectionStart).toBe(0);
            expect(input.selectionEnd).toBe(DEFAULT_TITLE.length);
        });

        it('maxLength is 60', async () => {
            setup();
            const input = await enterEdit();

            expect(input).toHaveAttribute('maxlength', '60');
        });
    });

    describe('no layout shift: shared box classes (contract)', () => {
        it('button and input both carry data-title-box and the same non-empty box tokens', async () => {
            setup();
            const button = displayButton();
            expect(button).toHaveAttribute('data-title-box');
            const buttonBox = boxTokens(button);

            await userEvent.click(button);
            const input = inputEl();
            expect(input).toHaveAttribute('data-title-box');

            expect(buttonBox.length).toBeGreaterThan(0);
            expect(boxTokens(input)).toEqual(buttonBox);
            expect(buttonBox).toContain('w-full');
            expect(buttonBox.some((c) => /^text-(xs|sm|base|lg|xl|[2-9]xl)$/.test(c))).toBe(true);
        });
    });

    describe('focus ring (WCAG 2.4.7)', () => {
        it('the display button has focus-visible:ring-2 and focus-visible:ring-focus', () => {
            setup();

            expect(tokens(displayButton())).toEqual(expect.arrayContaining(['focus-visible:ring-2', 'focus-visible:ring-focus']));
        });

        it('the input has focus-visible:ring-2 and focus-visible:ring-focus', async () => {
            setup();
            const input = await enterEdit();

            expect(tokens(input)).toEqual(expect.arrayContaining(['focus-visible:ring-2', 'focus-visible:ring-focus']));
        });
    });

    describe('T3: commit', () => {
        it('Enter with a changed value commits the trimmed title', async () => {
            const { onCommit } = setup({ title: 'Team' });
            const input = await enterEdit();

            fireEvent.change(input, { target: { value: '  Wins  ' } });
            fireEvent.keyDown(input, { key: 'Enter' });

            await waitFor(() => expect(onCommit).toHaveBeenCalledWith('Wins'));
            expect(onCommit).toHaveBeenCalledTimes(1);
        });

        it('blur with a changed value commits too', async () => {
            const { onCommit } = setup({ title: 'Team' });
            const input = await enterEdit();

            fireEvent.change(input, { target: { value: 'Wins' } });
            fireEvent.blur(input);

            await waitFor(() => expect(onCommit).toHaveBeenCalledWith('Wins'));
            expect(onCommit).toHaveBeenCalledTimes(1);
        });

        it('a trimmed-empty value commits null (clears the title)', async () => {
            const { onCommit } = setup({ title: 'Team' });
            const input = await enterEdit();

            fireEvent.change(input, { target: { value: '    ' } });
            fireEvent.keyDown(input, { key: 'Enter' });

            await waitFor(() => expect(onCommit).toHaveBeenCalledWith(null));
        });

        it('Enter then the resulting blur commits only once', async () => {
            const { onCommit } = setup({ title: 'Team' });
            const input = await enterEdit();

            fireEvent.change(input, { target: { value: 'Wins' } });
            fireEvent.keyDown(input, { key: 'Enter' });
            fireEvent.blur(input);

            await waitFor(() => expect(onCommit).toHaveBeenCalled());
            expect(onCommit).toHaveBeenCalledTimes(1);
        });

        it('Enter returns to display mode and puts focus back on the display button', async () => {
            setup({ title: 'Team' });
            const input = await enterEdit();

            fireEvent.change(input, { target: { value: 'Wins' } });
            fireEvent.keyDown(input, { key: 'Enter' });

            await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
            await waitFor(() => expect(screen.getByRole('button')).toHaveFocus());
        });

        it('Enter on an unchanged value also returns focus to the display button', async () => {
            setup({ title: 'Team' });
            const input = await enterEdit();

            fireEvent.keyDown(input, { key: 'Enter' });

            await waitFor(() => expect(screen.getByRole('button')).toHaveFocus());
        });

        it('the optimistic title shows immediately, even though the title prop is unchanged', async () => {
            let release!: () => void;
            const onCommit = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
            render(<GroupTitleEditor title="Team" onCommit={onCommit} />);
            const input = await enterEdit();

            fireEvent.change(input, { target: { value: 'Wins' } });
            fireEvent.keyDown(input, { key: 'Enter' });

            expect(await screen.findByRole('button', { name: `${RENAME}::Wins` })).toHaveTextContent('Wins');
            await act(async () => { release(); });
            expect(screen.getByRole('button')).toHaveTextContent('Wins');
        });

        it('the optimistic title is kept after success until the title prop changes, then follows the prop', async () => {
            const { rerenderWith } = setup({ title: 'Team' });
            const input = await enterEdit();
            fireEvent.change(input, { target: { value: 'Wins' } });
            fireEvent.keyDown(input, { key: 'Enter' });
            await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('Wins'));

            rerenderWith({ title: 'Team' });
            expect(screen.getByRole('button')).toHaveTextContent('Wins');

            rerenderWith({ title: 'Server value' });
            expect(screen.getByRole('button')).toHaveTextContent('Server value');
        });

        it('a remote title change while not editing shows right away', () => {
            const { rerenderWith } = setup({ title: 'Team' });

            rerenderWith({ title: 'Remote' });

            expect(screen.getByRole('button')).toHaveTextContent('Remote');
        });
    });

    describe('T4: unchanged value', () => {
        it('Enter without editing does not commit', async () => {
            const { onCommit } = setup({ title: 'Team' });
            const input = await enterEdit();

            fireEvent.keyDown(input, { key: 'Enter' });

            expect(onCommit).not.toHaveBeenCalled();
        });

        it('blur without editing does not commit', async () => {
            const { onCommit } = setup({ title: 'Team' });
            const input = await enterEdit();

            fireEvent.blur(input);

            expect(onCommit).not.toHaveBeenCalled();
        });

        it('a value that only differs by surrounding whitespace does not commit', async () => {
            const { onCommit } = setup({ title: 'Team' });
            const input = await enterEdit();

            fireEvent.change(input, { target: { value: '  Team  ' } });
            fireEvent.keyDown(input, { key: 'Enter' });

            expect(onCommit).not.toHaveBeenCalled();
        });

        it('untitled group: leaving the default title untouched does not commit', async () => {
            const { onCommit } = setup({ title: undefined });
            const input = await enterEdit();

            fireEvent.keyDown(input, { key: 'Enter' });

            expect(onCommit).not.toHaveBeenCalled();
        });
    });

    describe('T5: Escape', () => {
        it('restores the original title, exits edit mode and does not commit', async () => {
            const { onCommit } = setup({ title: 'Team' });
            const input = await enterEdit();
            fireEvent.change(input, { target: { value: 'Typed but discarded' } });

            fireEvent.keyDown(input, { key: 'Escape' });

            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
            expect(screen.getByRole('button')).toHaveTextContent('Team');
            expect(onCommit).not.toHaveBeenCalled();
        });

        it('does not commit on the blur that follows Escape', async () => {
            const { onCommit } = setup({ title: 'Team' });
            const input = await enterEdit();
            fireEvent.change(input, { target: { value: 'Typed but discarded' } });

            fireEvent.keyDown(input, { key: 'Escape' });
            fireEvent.blur(input);

            expect(onCommit).not.toHaveBeenCalled();
        });

        it('stops propagation: a parent keydown listener is not called', async () => {
            const parentKeyDown = vi.fn();
            const onCommit = vi.fn(async () => { });
            render(
                <div role="presentation" onKeyDown={parentKeyDown} data-testid="parent">
                    <GroupTitleEditor title="Team" onCommit={onCommit} />
                </div>,
            );
            const input = await enterEdit();

            fireEvent.keyDown(input, { key: 'Escape' });

            expect(parentKeyDown).not.toHaveBeenCalled();
        });

        it('returns focus to the display button', async () => {
            setup({ title: 'Team' });
            const input = await enterEdit();

            fireEvent.keyDown(input, { key: 'Escape' });

            await waitFor(() => expect(screen.getByRole('button')).toHaveFocus());
        });
    });

    describe('T6: failed commit', () => {
        it('reverts to the prop title and shows toast.error(renameError)', async () => {
            const onCommit = vi.fn(async () => { throw new Error('boom'); });
            render(<GroupTitleEditor title="Team" onCommit={onCommit} />);
            const input = await enterEdit();

            fireEvent.change(input, { target: { value: 'Wins' } });
            fireEvent.keyDown(input, { key: 'Enter' });

            await waitFor(() => expect(toast.error as Mock).toHaveBeenCalledWith('retrospective.groupCard.renameError'));
            await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('Team'));
            expect(toast.error as Mock).toHaveBeenCalledTimes(1);
        });

        it('does not toast on success', async () => {
            const { onCommit } = setup({ title: 'Team' });
            const input = await enterEdit();

            fireEvent.change(input, { target: { value: 'Wins' } });
            fireEvent.keyDown(input, { key: 'Enter' });

            await waitFor(() => expect(onCommit).toHaveBeenCalled());
            expect(toast.error as Mock).not.toHaveBeenCalled();
        });
    });

    describe('T8: read-only', () => {
        it('renders plain text: no button, no textbox', () => {
            setup({ title: 'Team', isReadOnly: true });

            expect(screen.queryByRole('button')).not.toBeInTheDocument();
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
            expect(screen.getByText('Team')).toBeInTheDocument();
        });

        it('shows the default title when untitled', () => {
            setup({ title: undefined, isReadOnly: true });

            expect(screen.getByText(DEFAULT_TITLE)).toBeInTheDocument();
        });

        it('autoEdit is ignored in read-only mode', () => {
            const onAutoEditConsumed = vi.fn();
            setup({ title: 'Team', isReadOnly: true, autoEdit: true, onAutoEditConsumed });

            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });
    });

    describe('T9: unmount mid-edit', () => {
        it('raises no error and does not commit', async () => {
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const { onCommit, unmount } = setup({ title: 'Team' });
            const input = await enterEdit();
            fireEvent.change(input, { target: { value: 'Half typed' } });

            expect(() => unmount()).not.toThrow();
            await act(async () => { await Promise.resolve(); });

            expect(onCommit).not.toHaveBeenCalled();
            expect(errorSpy).not.toHaveBeenCalled();
            expect(toast.error as Mock).not.toHaveBeenCalled();
            errorSpy.mockRestore();
        });

        it('unmounting while a commit is pending does not warn or throw when it later rejects', async () => {
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            let reject!: (e: Error) => void;
            const onCommit = vi.fn(() => new Promise<void>((_, rej) => { reject = rej; }));
            const { unmount } = render(<GroupTitleEditor title="Team" onCommit={onCommit} />);
            const input = await enterEdit();
            fireEvent.change(input, { target: { value: 'Wins' } });
            fireEvent.keyDown(input, { key: 'Enter' });
            unmount();

            await act(async () => { reject(new Error('late')); });

            expect(errorSpy).not.toHaveBeenCalled();
            errorSpy.mockRestore();
        });
    });

    describe('T2: autoEdit', () => {
        it('opens the input focused with the whole title selected', async () => {
            setup({ title: 'Team', autoEdit: true, onAutoEditConsumed: vi.fn() });

            const input = await screen.findByRole('textbox');
            await waitFor(() => expect(input).toHaveFocus());
            expect((input as HTMLInputElement).value).toBe('Team');
            expect((input as HTMLInputElement).selectionStart).toBe(0);
            expect((input as HTMLInputElement).selectionEnd).toBe(4);
        });

        it('calls onAutoEditConsumed exactly once, also across re-renders', async () => {
            const onAutoEditConsumed = vi.fn();
            const { rerenderWith } = setup({ title: 'Team', autoEdit: true, onAutoEditConsumed });
            await screen.findByRole('textbox');

            rerenderWith({ autoEdit: true, onAutoEditConsumed });
            rerenderWith({ autoEdit: true, onAutoEditConsumed, title: 'Team' });

            expect(onAutoEditConsumed).toHaveBeenCalledTimes(1);
        });

        it('does not re-enter edit mode after committing while autoEdit stays true', async () => {
            const { onCommit, rerenderWith } = setup({ title: 'Team', autoEdit: true, onAutoEditConsumed: vi.fn() });
            const input = await screen.findByRole('textbox');
            fireEvent.change(input, { target: { value: 'Wins' } });
            fireEvent.keyDown(input, { key: 'Enter' });
            await waitFor(() => expect(onCommit).toHaveBeenCalled());

            rerenderWith({ autoEdit: true, title: 'Wins' });

            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });

        it('works without onAutoEditConsumed', async () => {
            setup({ title: 'Team', autoEdit: true });

            expect(await screen.findByRole('textbox')).toBeInTheDocument();
        });

        it('without autoEdit nothing is opened and nothing is consumed', () => {
            const onAutoEditConsumed = vi.fn();
            setup({ title: 'Team', onAutoEditConsumed });

            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
            expect(onAutoEditConsumed).not.toHaveBeenCalled();
        });
    });
});
