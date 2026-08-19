# Phase 0 Research: Team Retrospective Metrics Dashboard

No `NEEDS CLARIFICATION` markers remain in the Technical Context (this feature reuses the existing
web-app stack unchanged — see plan.md). The items below are the design decisions this feature still
needed to make, each with rationale and rejected alternatives.

## 1. A dedicated port/adapter for the cross-collection aggregation

**Decision**: Introduce a new, narrow `TeamMetricsPort` (`server/src/application/ports/teamMetrics.ts`)
with a single method, `getTeamMetrics(teamId): Promise<TeamMetricsSummary>`, implemented by a new
`FirestoreTeamMetricsAdapter` that reads `retrospectives`, `actionItems`, and `sentimentResults`
directly (all three by `teamId`/`retrospectiveId`, read-only).

**Rationale**: None of the four existing ports naturally owns this read. `TeamsPort` (054) owns
`teams`/`teamMemberships` invariants, not board/action-item/sentiment data. `BoardsPort` is scoped to
"my boards" (creator + joined-by-uid), not "every board a team owns" — extending it would blur its
existing contract and risk regressing 054/055's already-tested behavior. `ActionItemPort` and
`SentimentResultPort` are both scoped per-retrospective, not per-team. A small dedicated port keeps
each existing interface's responsibility exactly as-is (Interface Segregation) and gives the new
capability one clear, testable home.

**Alternatives considered**:
- **Extend `TeamsPort` with a `getTeamMetrics` method.** Rejected: would make the Teams port
  responsible for board/action-item/sentiment schema knowledge it doesn't otherwise have, coupling
  054's tested interface to three unrelated collections.
- **Extend `BoardsPort.listBoardsForUser`-style filtering to "boards by team, any creator/joiner".**
  Rejected: `BoardsPort`'s existing contract (`listBoardsForUser`) is explicitly scoped to a single
  uid's own created/joined boards (see its doc comment) — this feature needs every retrospective a
  team owns, regardless of who created or joined it, which is a materially different (and broader)
  read than what that port promises today.
- **Compute everything client-side by fetching each retrospective's cards + sentiment results
  individually.** Rejected outright: violates constitution Principle IV (Firestore access must sit
  behind testable server-side interfaces, never coupled directly to UI) and would require N
  additional round-trips per panel load instead of one.

## 2. Authorization: reuse `TeamsPort.getMembership`, checked per request

**Decision**: The new `GET /api/teams/:id/metrics` route calls `deps.teamsPort.getMembership(teamId,
session.sub)` first; a `null` result throws the same `ForbiddenError` (`403 forbidden`) pattern
`getTeamWithMembers` (054) already uses, before any metrics are computed. No membership-change
listener or live session monitoring is added.

**Rationale**: Directly implements the Clarifications session's first answer (2026-08-19): access is
re-checked on the next request, not actively torn down mid-session. Reusing
`TeamsPort.getMembership` (already implemented, already tested by 054) keeps the "is this uid a
current member" invariant owned in exactly one place, per Interface Segregation/Dependency Inversion
— identical precedent to 055's `CreateBoard` membership check (055 research.md item 2).

**Alternatives considered**:
- **A live-updating panel that re-checks membership on an interval or via a realtime listener.**
  Rejected by the clarification itself — FR-011 explicitly does not require real-time updates, and
  this would add meaningful complexity (a new realtime channel) for a case the user decided isn't
  worth it.

## 3. Retrospective count and average participants

**Decision**: `FirestoreTeamMetricsAdapter` queries `retrospectives` where `teamId == teamId` (same
field 055 already introduced, same collection `FirestoreBoardsAdapter` already queries). Count is
`snapshot.size`; average participants is the mean of each returned doc's existing `participantCount`
field, computed in-memory (no new stored aggregate).

**Rationale**: `participantCount` already exists on every retrospective doc (maintained via
`FieldValue.increment(1)` on join, per `application/ports/boards.ts`) — no new field, no new write
path. A single un-filtered query over `teamId` mirrors the exact pattern `FirestoreBoardsAdapter`
already uses for `createdBy`/team-name lookups.

**Alternatives considered**:
- **Maintain a running aggregate on the `teams` doc (denormalized count/average), updated on every
  board create/join.** Rejected: adds write-path complexity and a new invariant to keep in sync
  across `CreateBoard`/`joinBoard`/`deleteBoard` for a value that's cheap to compute on read at this
  scale (Simplicity/YAGNI) — same reasoning 055 research.md item 1 used to reject denormalizing
  `teamName`.

## 4. Action items created — total only, chunked lookup

**Decision**: Using the retrospective ids from item 3, `FirestoreTeamMetricsAdapter` queries
`actionItems` with `where('retrospectiveId', 'in', chunk)` in chunks of 30 (Firestore's `in` cap),
summing `snapshot.size` across chunks into a single total. No completion/status field is read or
written (none exists — spec Clarifications, 2026-08-19).

**Rationale**: Mirrors the exact chunking pattern `FirestoreBoardsAdapter.listBoardsForUser` already
uses for its `teams`-collection batch lookup and for resolving joined-board ids from `participants`.
Matches FR-007 exactly: a single created-count total, nothing else.

**Alternatives considered**: None materially different — this is the only reasonable read given
`actionItems` has no `teamId` field and no completion field to aggregate.

## 5. Mood evolution — reuse the scoring formula, skip column-role reclassification

**Decision**: For each of the team's retrospectives (chronological by `createdAt`), fetch its
`sentimentResults` (chunked `where('retrospectiveId', 'in', chunk)`, same pattern as item 4), filter
to confident results only via a server-side duplicate of the frontend's `isConfident` predicate
(`src/features/boards/sentiment/domain/confidence.ts`) using the same `DEFAULT_SENTIMENT_CONFIG`
thresholds, count raw positive/neutral/negative, and feed those counts into a server-side duplicate
of `calculateMoodScore` (`src/features/boards/sentiment/domain/moodScore.ts`). A retrospective with
zero confident results after filtering gets `moodScore: null` ("no data", per FR-009). The
column-role reclassification the live per-board `TeamMoodDashboard` applies (a negative card in a
"went wrong"-role column counted as neutral, per-column breakdowns) is **not** replicated.

**Rationale**: `isConfident` and `calculateMoodScore` are both tiny, dependency-free pure functions
(no React, no DOM) — duplicating them server-side is a small, easily-tested surface, guarded by
parity unit tests asserting identical output to the frontend originals for shared fixtures, so drift
between the two is caught immediately if either formula changes. Column-role reclassification, by
contrast, needs each retrospective's dynamic column configuration and each card's column assignment —
meaningfully more data and complexity to fetch per historical retrospective, for a refinement the
spec's acceptance criteria (FR-008/FR-009: "a mood value... in chronological order",
"no analyzed sentiment data... shown as no mood data") don't require. This is a deliberate Simplicity
(YAGNI) trade-off: a future iteration could add per-column drill-down if requested, without changing
this feature's contract.

**Alternatives considered**:
- **Import `computeMoodDistribution`/`calculateMoodScore` directly from `src/` into `server/src/`.**
  Rejected: frontend (`tsconfig.json`) and backend (`server/tsconfig.json`) are separate TypeScript
  compilation units with no existing cross-import precedent anywhere in the codebase; introducing one
  for two ~15-line pure functions isn't worth the coupling, especially since `computeMoodDistribution`
  itself pulls in `Card`/`DynamicColumnConfig` types this feature doesn't need.
- **Replicate the live dashboard's column-role reclassification server-side.** Would need each
  historical retrospective's dynamic column config and every card's column assignment — several
  extra reads per retrospective for a refinement not required by the spec's acceptance criteria.
  Deferred (see Decision).

## 6. No new UI dependency for mood evolution

**Decision**: Render mood evolution as a plain ordered list/table — one row per retrospective, its
date, its mood score (or an explicit "no data" state), and a text+icon trend indicator (e.g.
▲ "Improving" / ▼ "Declining" / ▬ "Stable") — never a chart.

**Rationale**: No charting library is a current dependency (`package.json` has none), and introducing
one for a single feature would violate Principle III (prefer proven, already-vetted libraries; justify
before adding a new one) for a requirement the spec never mandates as a visual chart — FR-008 only
requires the evolution be observable "in chronological order." A list also sidesteps
`prefers-reduced-motion`/WCAG 2.1 AA concerns a chart library would introduce fresh (contrast of
plotted lines, keyboard-navigable data points), consistent with Principle VIII.

**Alternatives considered**: Adding a lightweight charting library (e.g. a sparkline component) —
not rejected outright for all future iterations, but deferred: it's a bigger surface (new dependency
vetting per Principle III, new accessibility surface) than this feature's acceptance criteria need.

## 7. Full-history, unbounded aggregation

**Decision**: No date-range filter, no pagination, no "last N retrospectives" cap — every query in
items 3-5 runs unbounded over the team's full retrospective history, per the Clarifications session's
second answer (2026-08-19).

**Rationale**: Matches `FirestoreBoardsAdapter.listBoardsForUser`'s existing unbounded-query
precedent (no team's retrospective count is expected to approach a scale where a single `where`
query plus a handful of 30-id chunked lookups becomes a real latency problem, consistent with this
product's existing usage patterns). Keeps the read path simple (Simplicity/YAGNI); if usage ever
proves otherwise, pagination/caching is an isolated follow-up that doesn't change this feature's
contract (`TeamMetricsSummary`'s shape already supports adding a `hasMore`/cursor field later without
breaking existing consumers).

**Alternatives considered**: A bounded window (last 10 retrospectives / last 6 months) — explicitly
rejected during clarification (Option B) in favor of full history (Option A).

## 8. Testing approach

**Decision**:
- Backend: Vitest unit tests for the two duplicated pure functions (`isConfident`, `calculateMoodScore`
  server-side variants), including parity fixtures asserting identical output to the frontend
  originals; Vitest unit tests for `GetTeamMetrics` (membership-denied → 403; member → delegates to
  `TeamMetricsPort`) using a fake `TeamsPort`/`TeamMetricsPort`, mirroring `GetTeamWithMembers.test.ts`'s
  structure. `FirestoreTeamMetricsAdapter` stays under the project's existing, documented exception
  for thin Admin-SDK adapter code (E2E-covered, not unit-mocked) — same treatment every other
  Firestore adapter already receives.
- Frontend: Vitest + Testing Library for `useTeamMetricsQuery` (loading/error/empty/populated states)
  and each panel subcomponent (`ActivitySummary`, `ActionItemsSummary`, `MoodEvolutionList` including
  its "no data" row rendering), mirroring `useTeamQuery`/`TeamMemberList`'s existing test structure.
- E2E: Playwright scenarios extending the existing teams E2E specs — owner/member views a populated
  panel, a non-member is denied (`403`) including by direct navigation, a team with zero
  retrospectives shows the empty state, and a retrospective with no analyzed sentiment shows as
  "no data" rather than a default score.

**Rationale**: Matches constitution Principles I/VI/VII exactly as 054/055 did for their own
use-cases and UI, with the parity-fixture addition specifically to guard against the server-side mood
duplicate silently drifting from the frontend formula it's meant to mirror (research.md item 5).
