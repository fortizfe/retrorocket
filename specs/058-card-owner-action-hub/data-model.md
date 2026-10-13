# Data Model: Card Owner Action Hub

**Feature**: 058-card-owner-action-hub | **Date**: 2026-10-12

This feature introduces **no persisted data and no schema change**: no Firestore fields, no API payload changes and no `firestore.rules` changes. It reorganizes how existing card operations are reached. The "model" below is the client-side state that the new UI owns.

## Existing entities (unchanged)

### Card (`src/features/boards/types/card.ts`)

| Field | Type | Role in this feature |
|---|---|---|
| `id` | `string` | Target of edit/colour/delete operations. |
| `content` | `string` | Edited through the existing edit mode (unchanged). |
| `color` | `CardColor \| string` (raw, validated by `validateColor`) | Changed through the hub's colour section. One of the 15 curated `CardColor`s (spec 037). |
| `createdBy` | `string` (uid) | **Ownership**: `isOwner = currentUser === card.createdBy`. |
| `createdAt` | `Date` | Footer timestamp (unchanged). |

Server-side operations reused as they are (owner-only, enforced by `FirestoreCardAdapter`):

- `PATCH /api/cards/:id` `{ content?, color? }` → `ForbiddenError` for non-owners.
- `DELETE /api/cards/:id` → `ForbiddenError` for non-owners.

### Derived permission

```
canEditCard = canEdit && isOwner
```

- `canEdit` comes from the caller. It is `false` in grouping/selection mode (`SelectableCard`), in read-only group views (`GroupCard`, `!isReadOnly`) and in previews (`GroupSuggestionModal`).
- `canEditCard` is the **single gate** for rendering `OwnerActionMenu` (FR-001). Nothing else on the card checks ownership for owner actions.

## New client-side state

### OwnerActionMenu state (local to each card, per viewer, never persisted or synced)

| State | Meaning | Visible panel content |
|---|---|---|
| `closed` | Trigger at rest. | None; trigger only (`aria-expanded="false"`). |
| `menu` | Panel open. | Edit card · Colour grid (15 `menuitemradio`) · separator · Delete card. |
| `confirmingDelete` | User chose Delete. | Warning message + Confirm + Cancel. Announced (assertive). |
| `deleting` | Confirm activated, `onDelete` in flight. | Same as `confirmingDelete` with Confirm busy (`aria-busy`, spinner). All activations ignored. |

**Transitions**

```
closed ──activate trigger──▶ menu
menu ──Edit card──▶ closed            (+ onEdit(); card enters edit mode, hub unmounts)
menu ──select colour──▶ closed        (+ onColorChange(color); focus → trigger)
menu ──Delete card──▶ confirmingDelete
confirmingDelete ──Cancel──▶ menu
confirmingDelete ──Confirm──▶ deleting
deleting ──onDelete resolves──▶ (card unmounts; focus → post-delete target)
deleting ──onDelete rejects──▶ confirmingDelete   (+ localized error toast)
{menu, confirmingDelete} ──Escape / Tab / outside press / drag starts──▶ closed (focus → trigger)
any ──canEditCard becomes false──▶ (component unmounts; nothing sent)
```

`deleting` cannot be dismissed. Escape and outside-press are ignored until the request settles, so a delete can never end up in an unknown state.

**Validation rules**

- Only one transition at a time: a second Confirm or swatch activation while a request is in flight is ignored (spec edge case "Repeated activation").
- The colour passed to `onColorChange` is always a member of `getAvailableColors()`.

### DraggableCard additions

| State | Type | Purpose |
|---|---|---|
| `pendingColor` | `CardColor \| null` | Optimistic colour shown until `card.color` matches it (success) or the update rejects (revert + toast). Render colour is `pendingColor ?? validateColor(card.color)`. |
| `restoreTriggerFocus` | `boolean` | Set when edit mode ends (Save/Cancel), so the remounted hub trigger takes focus once, then cleared. |
| `colorAnnouncement` | `string` | Text of a polite live region that stays mounted on the card ("Colour changed to {name}"). It must not live inside the panel, which unmounts on select. |

**Removed**: `isDeleting` (moves into `OwnerActionMenu`) and `handleDelete`. The direct `ColorPicker` import and the header colour-picker block are removed.

## DOM markers (for post-delete focus)

| Attribute | Element | Used by |
|---|---|---|
| `data-card-column` | `GroupableColumn` root | `getPostDeleteFocusTarget` scope |
| `data-card-focus-target` + `tabIndex={-1}` | `DraggableCard` root `motion.div` | next/previous card focus |
| `data-add-card-trigger` | `GroupableColumn` "Add card" button | empty-column fallback |

## i18n keys (new, `es.json` + `en.json`)

Namespace `retrospective.card.ownerActions`:

| Key | es | en |
|---|---|---|
| `trigger` | Acciones de tarjeta | Card actions |
| `edit` | Editar tarjeta | Edit card |
| `colorGroup` | Cambiar color | Change colour |
| `delete` | Eliminar tarjeta | Delete card |
| `deleteConfirmMessage` | ¿Eliminar esta tarjeta? Esta acción no se puede deshacer. | Delete this card? This can't be undone. |
| `deleteConfirm` | Eliminar | Delete |
| `deleteCancel` | Cancelar | Cancel |
| `deleting` | Eliminando… | Deleting… |
| `deleteError` | No se pudo eliminar la tarjeta. Inténtalo de nuevo. | Couldn't delete the card. Please try again. |
| `colorError` | No se pudo cambiar el color. Inténtalo de nuevo. | Couldn't change the colour. Please try again. |
| `colorChanged` | Color cambiado a {{color}} | Colour changed to {{color}} |

Reused: `retrospective.card.colorPicker.*` (colour names and aria-labels), `retrospective.card.save`, `retrospective.card.cancel`, `retrospective.columns.add`.

Kept: `retrospective.card.editCard` and `retrospective.card.deleteCard` stay in the locale files (other surfaces may use them). The hub uses its own `ownerActions.*` keys.
