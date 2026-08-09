# Contract: Functional Parity

**Enforces**: FR-002 through FR-011, FR-013, FR-017, SC-002. Applies to the
redesigned retrospective board before any implementation task can be marked
complete.

## Contract

Every capability below MUST behave identically to the pre-redesign
implementation. Each row names the requirement it satisfies and the
existing test(s) that must keep passing — updated only for intentional
selector/structure changes, never weakened or deleted (FR-019).

| Capability | Requirement | Verified by |
|---|---|---|
| Add, edit, delete cards; content wrapping, URL auto-link, line-break preservation | FR-002 | `CardContent.test.tsx`, `useOptimizedCards.test.ts`, `e2e/retrospective-board.spec.ts` |
| Vote, like, and add/remove emoji reactions on cards; reaction picker anchored positioning | FR-003 | `CardVoteControl.test.tsx`, `LikeButton.test.tsx`, `EmojiReactions.test.tsx`, `ReactionPicker.test.tsx`, `e2e/retrospective-board.spec.ts` |
| Drag-and-drop reorder within a column and move across columns | FR-004 | `DragDropColumn.test.tsx`, `DraggableCard.test.tsx`, `e2e/retrospective-board.spec.ts` |
| Manual and AI-suggested card grouping; collapse/expand; remove from group; disband | FR-005 | `useCardGroups.test.ts`, `GroupableColumn.test.tsx`, `GroupCard.test.tsx`, `GroupSuggestionModal.test.tsx`, `e2e/retrospective-board.spec.ts` |
| Dynamic columns render correctly at 3 or 4 count; share width without horizontal scrollbar; stack below breakpoint | FR-006 | `useRetrospectiveColumns.test.ts`, `RetrospectiveBoard.test.tsx`, `e2e/retrospective-board.spec.ts` |
| Owner-only convert-card-to-action-item (assignee + due date); action items column create/edit/delete/toggle | FR-007 | `CardMenu` coverage in `RetrospectiveBoard.test.tsx`, `useActionItems.test.ts`, `ActionItemsColumn.test.tsx`, `ActionColumnToggle.test.tsx`, `e2e/retrospective-board.spec.ts` |
| Live participant presence display and typing indicators | FR-008 | `ResponsiveParticipantDisplay.test.tsx`, `ParticipantPopover.test.tsx`, `useTypingStatus.test.ts`, `typingNoPolling.test.ts`, `e2e/concurrent-board-session.spec.ts` |
| Owner-only facilitator menu: countdown controls, sentiment enable/config, team mood dashboard, private notes | FR-009 | `FacilitatorMenu.test.tsx`, `FacilitatorMenuTabs.test.tsx`, `useCountdown.test.ts`, `NotesTab.test.tsx`, `useFacilitatorNotes.test.ts`, `e2e/facilitator-countdown.spec.ts` |
| Export to PDF/DOCX/TXT with facilitator-only options; progress/success/error feedback | FR-010 | `ImprovedExportPopover.test.tsx`, `unifiedExportService.test.ts`, `pdfExportService.test.ts`, `docxExportService.test.ts`, `txtExportService.test.ts`, `e2e/export.spec.ts` |
| Copy board ID, share link, exit to dashboard | FR-011 | `RetrospectiveTopbar` coverage in `RetrospectiveBoard.test.tsx`, `e2e/retrospective-board.spec.ts` |
| Distinct empty-column state | Edge Case (`spec.md` Edge Cases) | `GroupableColumn.test.tsx`, `e2e/retrospective-board.spec.ts` |
| All visible text sourced from i18next (en/es); no hardcoded strings | FR-013 | locale-key-coverage check (`tasks.md` T063), `retro-rocket/src/locales/en.json`/`es.json` lockstep |
| No change to real-time synchronization behavior | FR-017 | `useRetrospectiveRealtimeSync.test.ts`, `backendRealtimeClient.test.ts`, `retrospective-board-no-firestore.test.ts`, `e2e/concurrent-board-session.spec.ts`, `e2e/concurrent-board-network.spec.ts` |

## Non-goals

This contract does not cover new capabilities explicitly out of scope per
the spec's Assumptions — no new export format, no new facilitator control,
no change to conflict-resolution/sync architecture, no archiving or
history feature. Their absence is expected, not a regression.

## Verification procedure

1. Establish the pre-redesign baseline once, in `tasks.md`'s Setup phase,
   by running the full `type-check` / `lint` / `test:coverage` / `e2e`
   suite and recording it passing — since every test named in this contract
   is part of that suite, this full-suite pass is sufficient baseline
   confirmation for every row; no separate per-row pass is required before
   implementation starts.
2. After implementation, re-run the full set — every row MUST still pass.
3. Coverage thresholds in `vitest.config.ts` (branches 78 / functions 64 /
   lines 50 / statements 50) MUST NOT drop between the baseline and the
   final run.
