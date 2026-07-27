# Contract: MCP Tools exposed over `/api/mcp` (Streamable HTTP)

Transport: MCP Streamable HTTP (see research.md §1). Every call requires `Authorization: Bearer <access_token>`; the server validates the token signature/expiry, then live-checks the referenced `McpConnection.status == "active"` (Clarification Q1) before executing any tool. All three tools below are read-only (FR-013) and never touch a cache (FR-014) — every field is read from Firestore at call time.

## `list_retrospectives`

**Input**: `{}` (no parameters — scope is the whole authorized account, per Clarification Q2).

**Output**:
```json
{
  "retrospectives": [
    { "id": "abc123", "title": "Sprint 42 Retro", "createdAt": "2026-07-20T10:00:00Z", "role": "facilitator" },
    { "id": "def456", "title": "Q3 Kickoff Retro", "createdAt": "2026-07-10T09:00:00Z", "role": "participant" }
  ]
}
```
- Empty `retrospectives: []` when the user has none (User Story 2, Acceptance Scenario 2) — never an error.
- `role` reflects whether the connected user is the facilitator (creator) or a participant of that retrospective; this drives whether `get_retrospective_detail`/`get_retrospective_summary` will include facilitator notes for that id.

## `get_retrospective_detail`

**Input**:
```json
{ "retrospectiveId": "abc123" }
```

**Output** (shape; sections are omitted, not null/empty-with-placeholder, when there's nothing to show — e.g. no sentiment run yet):
```json
{
  "retrospective": { "id": "abc123", "title": "Sprint 42 Retro", "createdAt": "..." },
  "cards": [ { "id": "c1", "content": "...", "column": "helped", "createdBy": "uid", "votes": 3, "reactions": [ { "emoji": "👍", "count": 2 } ] } ],
  "groups": [ { "id": "g1", "title": "Communication", "cardIds": ["c1", "c2"] } ],
  "participants": [ { "name": "Ana", "joinedAt": "..." } ],
  "sentiment": [ { "cardId": "c1", "sentiment": "positive", "confidence": 0.87 } ],
  "actionItems": [ { "content": "Set up daily standup", "assignedToName": "Ana", "dueDate": "2026-08-01" } ],
  "facilitatorNotes": [ { "content": "...", "timestamp": "..." } ]
}
```
- `facilitatorNotes` key is **absent entirely** from the JSON when the requester is not that retrospective's facilitator (User Story 4, Acceptance Scenario 2) — not `null`, not `[]`.
- Requesting an id the connection has no access to (not facilitator, not participant) or that doesn't exist → the same error (`not_found`), so existence is never leaked (FR-009).

## `get_retrospective_summary`

**Input**:
```json
{ "retrospectiveId": "abc123" }
```

**Output**: the `RetrospectiveSummary` shape from `data-model.md`:
```json
{
  "retrospective": { "id": "abc123", "title": "Sprint 42 Retro", "createdAt": "..." },
  "groupedFeedback": [ { "groupOrColumn": "Communication", "cardCount": 4, "cards": [ { "content": "...", "reactionCount": 2 } ] } ],
  "standoutItems": [ { "cardId": "c1", "content": "...", "reactionCount": 5 } ],
  "sentimentBreakdown": { "positive": 6, "neutral": 2, "negative": 1, "unanalyzed": 0 },
  "actionItems": [ { "content": "...", "assignedToName": "Ana", "dueDate": "2026-08-01" } ],
  "facilitatorNotes": ["..."]
}
```
- Same omission rule for `facilitatorNotes` and same `not_found` handling as `get_retrospective_detail`.
- Sections with no data are omitted (e.g. no `actionItems` key when there are none) rather than returned as an empty array that implies "checked, found nothing to report" ambiguity — matches User Story 5, Acceptance Scenario 3.

## Error responses (MCP tool-call errors)

Returned as an MCP tool error result (not a transport-level HTTP error, so the assistant can react to it), with a stable `code`:
- `unauthorized` — invalid/expired/revoked access token.
- `not_found` — retrospective doesn't exist or isn't accessible to this connection (never distinguished, per FR-009).
- `rate_limited` — the free-tier rate limit was hit (FR-016).
