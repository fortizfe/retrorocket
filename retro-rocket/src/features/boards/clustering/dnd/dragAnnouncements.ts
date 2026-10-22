import type { Announcements, ScreenReaderInstructions } from '@dnd-kit/core';
import type { DragIntent } from './dragIntent';

/** i18next-like translate function; keys are full keys. */
type Translate = (key: string, params?: Record<string, unknown>) => string;

const P = 'retrospective.dragGroup.a11y.';

interface SortableData {
    index: number;
    items: unknown[];
}

/**
 * Screen-reader announcements for the column drag (spec 059, research §6). Intent and
 * labels are read at announcement time. Successful outcomes are announced by the provider
 * after the server confirms, so onDragEnd only speaks for cancel-like outcomes.
 */
export function buildDragAnnouncements(
    t: Translate,
    getLabel: (id: string | number) => string,
    getIntent: () => DragIntent,
): { announcements: Announcements; screenReaderInstructions: ScreenReaderInstructions } {
    const announcements: Announcements = {
        onDragStart: () => t(`${P}pickedUp`),
        onDragOver: ({ over }) => {
            const intent = getIntent();
            if (!over || intent.kind === 'outside') return t(`${P}outside`);
            if (intent.kind === 'none') return t(`${P}ownGroup`);
            if (intent.kind === 'group') {
                const label = getLabel(over.id);
                return t(intent.target.kind === 'group' ? `${P}overGroupGroup` : `${P}overTargetGroup`, { label });
            }
            const sortable = over.data.current?.sortable as SortableData | undefined;
            if (!sortable) return undefined;
            return t(`${P}overTargetReorder`, { position: sortable.index + 1, total: sortable.items.length });
        },
        onDragEnd: () => {
            const { kind } = getIntent();
            return kind === 'none' || kind === 'outside' ? t(`${P}cancelled`) : undefined;
        },
        onDragCancel: () => t(`${P}cancelled`),
    };
    return { announcements, screenReaderInstructions: { draggable: t(`${P}instructions`) } };
}
