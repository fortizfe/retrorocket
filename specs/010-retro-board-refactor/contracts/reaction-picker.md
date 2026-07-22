# UI Contract: Reaction Badge & Picker

Contracts for the emoji-reaction components extracted from `EmojiReactions.tsx`.
These are the public interfaces other board code depends on; behavior is verified
by the acceptance scenarios in User Story 3.

## `useEmojiPicker(options)`

```ts
interface UseEmojiPickerOptions {
  disabled?: boolean;
  onSelect: (emoji: EmojiReaction) => void;   // add/replace reaction
  onRemove: () => void;                        // remove current reaction
  userReaction?: string | null;
}

interface UseEmojiPicker {
  open: boolean;
  setOpen: (v: boolean) => void;
  // Floating UI wiring
  refs: { setReference: (el: HTMLElement | null) => void; setFloating: (el: HTMLElement | null) => void };
  floatingStyles: React.CSSProperties;         // already-anchored; never {top:0,left:0} when open
  getReferenceProps: () => Record<string, unknown>;
  getFloatingProps: () => Record<string, unknown>;
  selectEmoji: (emoji: EmojiReaction) => void; // toggles remove if same as userReaction
}
```

**Contract guarantees**
- When `open` becomes `true`, `floatingStyles` is computed **before** the panel
  is painted (anchored at the trigger) — no position flash (FR-008).
- Placement uses `flip` + `shift` so the panel stays within the viewport near
  edges (FR-009).
- Position auto-updates on scroll/resize while open (FR-009a).
- Dismisses on emoji select, Escape, and outside click; restores focus to the
  trigger (FR-011, Principle VIII).
- No-ops when `disabled`.

## `<ReactionPicker />`

```ts
interface ReactionPickerProps {
  open: boolean;
  floatingProps: Record<string, unknown>;      // from getFloatingProps()
  setFloating: (el: HTMLElement | null) => void;
  floatingStyles: React.CSSProperties;
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  userReaction?: string | null;
  onSelect: (emoji: EmojiReaction) => void;
  onRemove: () => void;
  disabled?: boolean;
}
```

**Contract guarantees**
- Rendered in a `FloatingPortal` with `role="dialog"` and an accessible name.
- Category tabs and emoji buttons are keyboard-focusable with a visible `focus`
  ring; selected reaction is indicated by more than color alone (ring + state).
- Colors come from semantic tokens only (no hardcoded palette).
- Hint text and labels come from i18next keys (`en` + `es`).

## `<ReactionBadge />`

```ts
interface ReactionBadgeProps {
  reaction: GroupedReaction;   // { emoji, count, users }
  isMine: boolean;
  disabled?: boolean;
  onToggle: (emoji: EmojiReaction) => void;
  tooltip: string;             // localized, from the grouped tooltip builder
}
```

**Contract guarantees**
- Shows emoji + count; “mine” state uses a non-color-only cue.
- Fully keyboard-operable; localized tooltip/`aria-label`.
