import { verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { SortingStrategy } from '@dnd-kit/sortable';
import type { DragIntent } from './dragIntent';

/**
 * Wraps the vertical list strategy so siblings stay put while the user is hovering to
 * group (pendingGroup / group): displacement means "reorder", and shifting the target
 * away from under the cursor would make grouping impossible (spec 059, B2/B3).
 * The intent is read lazily on every call.
 */
export const intentAwareSortingStrategy =
    (getIntent: () => DragIntent): SortingStrategy =>
    (args) => {
        // Grouped (`member:*`) sources are dragged with useDraggable, not sortable, so dnd-kit
        // reports activeIndex -1: no displacement, the insertion line is the only feedback (D1).
        if (args.activeIndex === -1) return null;
        const { kind } = getIntent();
        if (kind === 'pendingGroup' || kind === 'group') return null;
        return verticalListSortingStrategy(args);
    };
