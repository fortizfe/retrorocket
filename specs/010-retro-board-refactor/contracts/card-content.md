# UI Contract: Card Content Wrapping

Contract for how card text (including links) renders. Verified by User Story 1
acceptance scenarios and SC-001. Applies to the **live** card
(`DraggableCard` → `CardContent`) and the shared `LinkifyText` primitive.

## Wrapping rules

- Content preserves intentional line breaks (`white-space: pre-wrap`) — FR-003.
- Any token, including a 200-char URL or an 80-char unbroken word, wraps within
  the card width via `overflow-wrap: anywhere` — FR-001.
- URLs remain detected and rendered as links (`target="_blank"
  rel="noopener noreferrer"`) and the link text itself wraps — FR-002.
- The card and its column ancestors carry `min-w-0` so content can shrink; the
  card never grows wider than its column, and neither overflows horizontally.

## `<LinkifyText />` (updated primitive)

```ts
interface LinkifyTextProps {
  text: string;
  className?: string;   // caller adds wrapping/typography; component ensures links wrap too
}
```

**Contract guarantees**
- Both the wrapping `<span>` and each generated `<a>` allow breaking long tokens
  (`overflow-wrap: anywhere` / `break-words`), so a single long URL cannot
  overflow.
- Link color uses the semantic `info-fg` token with a visible focus style.

## `<CardContent />` (extracted)

```ts
interface CardContentProps {
  content: string;
  className?: string;
}
```

**Contract guarantees**
- Combines `whitespace-pre-wrap` + `overflow-wrap: anywhere` + `min-w-0`.
- Text color from semantic `text-primary`; no hardcoded palette.

## Acceptance hooks (for tests)

- Card with a 200-char no-space URL → `scrollWidth <= clientWidth` on the card;
  link present and clickable.
- Card with an 80-char single word → wraps, no clipping/overflow.
- Card with manual `\n` line breaks → breaks preserved.
