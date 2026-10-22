import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil } from 'lucide-react';
import { useLanguage } from '@/lib/hooks/useLanguage';

/**
 * Inline group title (spec 059, US2, contract T1-T9). Rendered inside GroupCard's <h3>.
 *
 * Design decisions (apple-design / emil-design-eng, 058 precedent):
 *  - Clarity + deference: the title reads as plain heading text; the only hint that it is
 *    editable is a small pencil that is ALWAYS visible (muted) and strengthens on
 *    hover/focus. Never hover-only: keyboard and touch users get the same cue (WCAG 2.1.1).
 *  - Spatial consistency / no layout shift (T1): the display <button> and the edit <input>
 *    share one "title box" (`TITLE_BOX`: width, padding, border width, radius, font size,
 *    weight, leading). Only colours differ (transparent border -> visible border), so the
 *    swap is pixel-stable and the text never jumps.
 *  - No motion: renaming is an occasional, user-initiated state toggle and the swap must
 *    feel instant (emil: do not animate what the user is directly acting on). Nothing here
 *    needs `useReducedMotion`.
 *  - Direct manipulation: entering edit selects the whole title so typing replaces it;
 *    Enter/blur commit, Escape reverts, and focus returns to the button after Enter/Escape
 *    so keyboard users keep their place (blur-commit never steals focus).
 *  - Feedback: the new title shows optimistically at once and is kept until the `title`
 *    prop changes (realtime echo, or another client); a failed commit reverts and toasts.
 *  - Contrast: text-text-primary/secondary on the group header surface (>= 4.5:1), the
 *    input border `border-border-strong` and the `ring-focus` ring (>= 3:1), both themes.
 */

/** Shared by the button and the input: identical box => no layout shift. Keep in sync. */
const TITLE_BOX = 'w-full min-w-0 px-2 py-0.5 text-sm leading-5 font-medium rounded-md border';
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus';

export const MAX_TITLE_LENGTH = 60;

export interface GroupTitleEditorProps {
    title?: string;
    isReadOnly?: boolean;
    /** Open in edit mode (this client only); `onAutoEditConsumed` fires once afterwards. */
    autoEdit?: boolean;
    onAutoEditConsumed?: () => void;
    onCommit: (title: string | null) => Promise<void>;
}

interface Optimistic {
    value: string | null;
    /** The `title` prop the value was committed against; a different prop invalidates it. */
    basedOn: string | undefined;
}

export const GroupTitleEditor: React.FC<GroupTitleEditorProps> = ({
    title,
    isReadOnly = false,
    autoEdit = false,
    onAutoEditConsumed,
    onCommit,
}) => {
    const { t } = useLanguage();
    const defaultTitle = t('retrospective.groupCard.defaultGroupTitle');

    const [optimistic, setOptimistic] = useState<Optimistic | null>(null);
    const effectiveTitle = optimistic && optimistic.basedOn === title ? optimistic.value : title;
    const savedTitle = effectiveTitle?.trim() || null;
    const displayTitle = savedTitle ?? defaultTitle;
    const isUntitled = savedTitle === null;

    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const finishedRef = useRef(false);
    const restoreFocusRef = useRef(false);
    const autoEditHandledRef = useRef(false);
    const mountedRef = useRef(true);
    const displayTitleRef = useRef(displayTitle);
    displayTitleRef.current = displayTitle;

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const startEdit = useCallback(() => {
        finishedRef.current = false;
        setDraft(displayTitleRef.current);
        setEditing(true);
    }, []);

    // T2: auto-edit once per `autoEdit` activation, ignored when read-only.
    useEffect(() => {
        if (!autoEdit) {
            autoEditHandledRef.current = false;
            return;
        }
        if (autoEditHandledRef.current) return;
        autoEditHandledRef.current = true;
        if (!isReadOnly) startEdit();
        onAutoEditConsumed?.();
    }, [autoEdit, isReadOnly, startEdit, onAutoEditConsumed]);

    // T1: focus + select all, without scrolling the board.
    useEffect(() => {
        if (!editing) return;
        const input = inputRef.current;
        if (!input) return;
        input.focus({ preventScroll: true });
        input.select();
    }, [editing]);

    // T3/T5: after Enter/Escape the display button takes focus back.
    useEffect(() => {
        if (editing || !restoreFocusRef.current) return;
        restoreFocusRef.current = false;
        buttonRef.current?.focus({ preventScroll: true });
    }, [editing]);

    const finish = async (commit: boolean, restoreFocus: boolean) => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        restoreFocusRef.current = restoreFocus;
        setEditing(false);
        if (!commit) return;

        const trimmed = draft.trim();
        // T4: unchanged (including the default title left as is) never commits.
        if (trimmed === displayTitle || (trimmed || null) === savedTitle) return;

        const next = trimmed || null;
        setOptimistic({ value: next, basedOn: title });
        try {
            await onCommit(next);
        } catch {
            if (!mountedRef.current) return;
            setOptimistic(null); // T6: revert to the prop and tell the user
            toast.error(t('retrospective.groupCard.renameError'));
        }
    };

    if (isReadOnly) {
        // T8: plain text.
        return (
            <span className={`block truncate text-sm font-medium ${isUntitled ? 'text-text-secondary' : 'text-text-primary'}`}>
                {displayTitle}
            </span>
        );
    }

    if (editing) {
        return (
            <input
                ref={inputRef}
                type="text"
                data-title-box
                value={draft}
                maxLength={MAX_TITLE_LENGTH}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        void finish(true, true);
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        void finish(false, true);
                    }
                }}
                onBlur={() => void finish(true, false)}
                aria-label={t('retrospective.groupCard.groupTitleInputLabel')}
                className={`${TITLE_BOX} border-border-strong bg-surface-raised text-text-primary ${FOCUS_RING}`}
            />
        );
    }

    return (
        <button
            ref={buttonRef}
            type="button"
            data-title-box
            onClick={startEdit}
            aria-label={t('retrospective.groupCard.renameGroupLabel', { title: displayTitle })}
            className={`${TITLE_BOX} group/title flex items-center gap-1.5 border-transparent text-left hover:bg-surface ${
                isUntitled ? 'text-text-secondary' : 'text-text-primary'
            } ${FOCUS_RING}`}
        >
            <span className="truncate">{displayTitle}</span>
            <Pencil
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 text-text-muted group-hover/title:text-text-primary group-focus-visible/title:text-text-primary"
            />
        </button>
    );
};

export default GroupTitleEditor;
