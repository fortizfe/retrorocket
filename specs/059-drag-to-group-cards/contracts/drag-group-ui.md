# Contract: Drag-to-Group UI behavior, components & accessibility

**Feature**: 059-drag-to-group-cards | Frontend: `retro-rocket/src/features/boards/` | Revised after clarify session 2026-10-21

The behaviour IDs are the test targets for `/speckit-tasks`. Values marked ⟨skill⟩ are finalised with the Principle IX skills (`animate`, `apple-design`, `emil-design-eng`) and checked with `review-animations`.

## Components & public interfaces

| Unit | Location | Interface |
|---|---|---|
| `columnOrder` (pure) | `clustering/dnd/columnOrder.ts` | `buildColumnItems(cards, groups, columnId): ColumnItem[]`, `computeOrder(items, { beforeId?, afterId? }): { order } \| { renormalize: Array<{kind,id,order}> }` |
| `dragIntent` (pure) | `clustering/dnd/dragIntent.ts` | `ZONE_EDGE`, `GROUP_EDGE_MAX_PX`, `DWELL_MS`, `resolveZone(draggedRect, overRect, overKind)`, `nextIntent(prev, input, now)` |
| `intentAwareSortingStrategy` | `clustering/dnd/intentAwareSortingStrategy.ts` | `(getIntent) => SortingStrategy` |
| `buildDragAnnouncements` | `clustering/dnd/dragAnnouncements.ts` | `(t, getLabel, getIntent) => { announcements, screenReaderInstructions }` |
| `useDragIntent` | `clustering/dnd/useDragIntent.ts` | `{ intent, intentRef, handlers, reset, toggleKeyboardIntent }` |
| `ColumnDndProvider` | `clustering/dnd/ColumnDndProvider.tsx` | Owns the column `DndContext`, sensors, collision, `DragOverlay`, cursor, the `G` key listener and the live region. It resolves drops into `requestMove` |
| `ColumnGroupingContext` | `clustering/dnd/ColumnGroupingContext.ts` | See data-model.md. Hook: `useColumnGroupingContext()`, which throws outside a provider |
| `ColumnItemList` | `clustering/components/ColumnItemList.tsx` | Renders interleaved `ColumnItem`s in a single `SortableContext` (modes `none`/`suggestions`). Groups are `useSortable({ disabled: { draggable: true } })` |
| `GroupTitleEditor` | `clustering/components/GroupTitleEditor.tsx` | `{ title?; isReadOnly?; autoEdit?; onAutoEditConsumed?(); onCommit(title: string \| null): Promise<void> }` |
| `CardGroupingMenu` | `clustering/components/CardGroupingMenu.tsx` | `{ sourceCard: Card }`. The variant ("Group with…" or "Move to group…" plus "Remove from group") comes from `sourceCard.groupId` |
| `GroupCard` (changed) | `clustering/components/GroupCard.tsx` | Renders `GroupTitleEditor`; member cards get drag handles (`useDraggable member:*`); armed feedback; props `autoEditTitle`, `onAutoEditConsumed`, `onRenameGroup` |
| `GroupableColumn` (changed) | `clustering/components/GroupableColumn.tsx` | Provides the context and provider; renders `ColumnItemList` (modes `none`/`suggestions`) or groups + `GroupedCardList` (mode `user`); teardown confirm (FR-033); props `onCardMove`, `onGroupRename`, `onColumnRenormalize` |
| `DragDropColumn` (changed) | `retrospective/components/DragDropColumn.tsx` | `SortableContext` only, used for the `user` mode sections |
| `SortableCard` / `DraggableCard` (changed) | `retrospective/components/` | Armed feedback and insertion line; `CardGroupingMenu` in the footer `actions` slot |

## Behaviors

### Pointer drag: ungrouped source

| ID | Given / When | Then |
|---|---|---|
| B1 | Over item T (card or group); dragged centre in T's edge band (25%; for a group, at most 16px) | `reorder`; sortable displacement; accent insertion line; no armed feedback |
| B2 | Centre in T's middle for less than 180 ms | `pendingGroup`; **no displacement**; no feedback |
| B3 | Centre in T's middle for at least 180 ms | `group(T)`; T gets `data-group-target="armed"`: ≈1.02 spring ⟨skill⟩, `ring-2 ring-action`, frosted surface, "Drop to group" badge |
| B4 | Leave the centre or change target | Timer cleared; feedback removed; back to B1 or B6 |
| B5 | Release on `group(card T)` | `requestMove(src, {card T})` → the group **appears in T's slot** (no jump; `layout` cross-fade ⟨skill⟩); title auto-edit on this client |
| B5b | Release on `group(group G)` | `requestMove(src, {group G})` → appended as the last member; animates in |
| B6 | Outside the column | `outside`; cursor `not-allowed`; no indicators |
| B7 | Release outside | Spring back ⟨skill⟩; zero network calls |
| B8 | Displayed mode `user` | No group intent; reorder stays inside the author section (`containerId`); `/cards/reorder` as today |
| B9 | Release on `reorder` (modes `none`/`suggestions`) | `requestMove(src, {position: computeOrder(before/after)})`, a single write. If the precision guard trips, `onColumnRenormalize` runs first, then the placement |

### Pointer drag: grouped source (Story 6)

| ID | Given / When | Then |
|---|---|---|
| D1 | Drag a member or head via its handle | Overlay lifts; the source dims; **no sortable displacement**; insertion line only |
| D2 | Release on the edge of an item | `requestMove(src, {position})` → it becomes ungrouped at that slot; S dissolves if 1 card is left, and the remaining card takes S's slot |
| D3 | Release on `group(card T)` | Leaves S and creates the group in T's slot; title auto-edit |
| D4 | Release on `group(group G ≠ S)` | Moves into G atomically; S dissolves if 1 card is left |
| D5 | Over its own group S | Intent `none`; no feedback; release is a no-op with spring back |
| D6 | Release on the column catch-all below the items | `position` = end of the column |
| D7 | Mode `user` | Member drag handles aren't rendered |

### Keyboard drag

| ID | Given / When | Then |
|---|---|---|
| K1 | Space/Enter on a drag handle | Picked up; `pickedUp` announcement; intent `reorder` |
| K2 | Arrow keys | Move; announce position or "over {label}" |
| K3 | `G` while over a card or group target (grouping enabled, not own group) | Toggle `reorder ⇄ group`; announce |
| K4 | Space/Enter | Apply the current intent (B5/B5b/B9/D2–D4) |
| K5 | Escape | Cancel; announce; no change |

### Inline title (`GroupTitleEditor`)

| ID | Given / When | Then |
|---|---|---|
| T1 | Click, or Enter/Space on the display button | Edit; focus; select all; no layout shift |
| T2 | `autoEdit` | Same as T1, then `onAutoEditConsumed()` |
| T3 | Enter or blur with a changed value | `onCommit(trimmed \|\| null)`; optimistic display; focus back to the display button after Enter |
| T4 | Unchanged value | No commit |
| T5 | Escape | Restore; no commit; `stopPropagation` |
| T6 | Commit fails | Revert; `toast.error(renameError)` |
| T7 | `title` absent | Show `defaultGroupTitle` |
| T8 | `isReadOnly` | Plain text |
| T9 | Unmounted during edit | No error, no commit |

### Menus (`CardGroupingMenu`)

| ID | Given / When | Then |
|---|---|---|
| G1 | Ungrouped card, grouping enabled, at least 1 candidate | "Group with…" trigger, for every participant |
| G2 | Grouped card, grouping enabled | "Move to group…" trigger, with a "Remove from group" item inside |
| G3 | Mode `user`, or no candidates and nothing to remove | No trigger |
| G4 | Open | `role="listbox"` labelled `pickerTitle`/`moveTitle`: groups first (title + count, excluding the own group), then ungrouped cards (excerpt; author omitted when anonymous). First option active |
| G5 | Arrows, Home/End, Enter | Select → `requestMove` → close. Focus goes to the new group's title (create), or to the source card's new location (otherwise) |
| G6 | "Remove from group" | `requestMove(src, {position: right after the group})` (or C2b); announce; S dissolves if 1 card is left |
| G7 | Escape or outside click | Close; focus returns to the trigger |

### Mode-switch safeguard (FR-033)

| ID | Given / When | Then |
|---|---|---|
| S1 | Mode `suggestions` → another mode; the column has at least 1 group with `origin === 'manual'` | Accessible confirmation `grouping.confirmTeardown` ({{count}} = all of the column's groups), **before** anything is persisted |
| S2 | Confirm | `setGroupingCriteria(new)`, then disband all of the column's groups (existing teardown) |
| S3 | Cancel | Nothing persisted; the selector still shows `suggestions`; the groups stay intact |
| S4 | No manual groups | Today's flow, no confirmation |

### Conflict

| ID | Given / When | Then |
|---|---|---|
| X1 | `requestMove` or a rename rejects with 409/404 | `toast(dragGroup.conflict)`, non-blocking; live announcement; no `pendingEditGroupId`; the board shows server truth |

## Accessibility (WCAG 2.1 AA)

| Concern | Requirement |
|---|---|
| Live region | One polite region per column, fed by dnd-kit announcements plus `useDndMonitor`/provider pushes |
| Instructions | `dragGroup.a11y.instructions`: Space, the arrow keys, G, Space, Escape |
| Armed cue | Badge text plus ring (not colour alone); the badge is `aria-hidden` |
| Focus | `focus-visible:ring-2 ring-focus` on the title button and input, menu triggers, options and member drag handles |
| Contrast | Title input text at least 4.5:1; ring, badge and insertion line at least 3:1; light and dark themes |
| Touch targets | Menu triggers, options and drag handles at least 44px below `md` |
| Reduced motion | `MotionConfig reducedMotion="user"`: no scale, spring or layout motion; the ring, surface, badge and line remain; spring-back is instant |

## i18n keys (es + en)

```
retrospective.groupCard.defaultGroupTitle      "New group" / "Nuevo grupo"
retrospective.groupCard.renameGroupLabel       "Rename group: {{title}}" / "Renombrar grupo: {{title}}"
retrospective.groupCard.groupTitleInputLabel   "Group title" / "Título del grupo"
retrospective.groupCard.renameError            "Couldn't rename the group" / "No se pudo renombrar el grupo"
retrospective.grouping.confirmTeardown         "Leaving AI suggestions mode will undo the {{count}} groups in this column, including ones created manually. Continue?" / "Salir del modo de sugerencias deshará los {{count}} grupos de esta columna, incluidos los creados manualmente. ¿Continuar?"
retrospective.dragGroup.dropToGroup            "Drop to group" / "Soltar para agrupar"
retrospective.dragGroup.groupWith              "Group with…" / "Agrupar con…"
retrospective.dragGroup.moveToGroup            "Move to group…" / "Mover a grupo…"
retrospective.dragGroup.removeFromGroup        "Remove from group" / "Quitar del grupo"
retrospective.dragGroup.pickerTitle            "Group this card with" / "Agrupar esta tarjeta con"
retrospective.dragGroup.moveTitle              "Move this card to" / "Mover esta tarjeta a"
retrospective.dragGroup.pickerGroupOption      "{{title}} ({{count}} cards)" / "{{title}} ({{count}} tarjetas)"
retrospective.dragGroup.conflict               "That card or group changed. Nothing was grouped." / "La tarjeta o el grupo ha cambiado. No se agrupó nada."
retrospective.dragGroup.a11y.instructions      (Space to pick up, arrows to move, G to switch between reordering and grouping, Space to drop, Escape to cancel)
retrospective.dragGroup.a11y.pickedUp          "Card picked up." / "Tarjeta seleccionada."
retrospective.dragGroup.a11y.overTargetGroup   "Over card \"{{label}}\". Drop to create a group with both cards." / "Sobre la tarjeta «{{label}}». Suelta para crear un grupo nuevo con ambas tarjetas."
retrospective.dragGroup.a11y.overGroupGroup    "Over group \"{{label}}\". Drop to add the card." / "Sobre el grupo «{{label}}». Suelta para añadir la tarjeta."
retrospective.dragGroup.a11y.overTargetReorder "Position {{position}} of {{total}}." / "Posición {{position}} de {{total}}."
retrospective.dragGroup.a11y.ownGroup          "Over its own group. Release to cancel." / "Sobre su propio grupo. Suelta para cancelar."
retrospective.dragGroup.a11y.outside           "Outside the column. Release to cancel." / "Fuera de la columna. Suelta para cancelar."
retrospective.dragGroup.a11y.groupCreated      "Group created." / "Grupo creado."
retrospective.dragGroup.a11y.addedToGroup      "Added to group \"{{label}}\"." / "Añadida al grupo «{{label}}»."
retrospective.dragGroup.a11y.removedFromGroup  "Card removed from the group." / "Tarjeta quitada del grupo."
retrospective.dragGroup.a11y.groupDissolved    "Group dissolved." / "Grupo deshecho."
retrospective.dragGroup.a11y.reordered         "Card moved to position {{position}}." / "Tarjeta movida a la posición {{position}}."
retrospective.dragGroup.a11y.cancelled         "Drag cancelled. Card returned to its position." / "Arrastre cancelado. La tarjeta volvió a su posición."
```

`retrospective.groupCard.groupOfCards` is no longer used by `GroupCard`. Remove it once a grep confirms there are no remaining callers.
