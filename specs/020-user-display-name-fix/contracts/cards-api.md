# Contract: Retrospective Cards API — `createdByName` field addition

**Feature**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

This documents the one backend contract change required by this fix: the `CardDTO` shape returned by the existing retrospective-cards endpoints gains an additional optional field. No endpoint is added, removed, or renamed; no request body changes.

## Affected endpoint(s)

- `POST /api/retrospectives/:id/cards` — implemented in `retro-rocket/server/src/http/routes/retrospectives.ts`
- Any existing endpoint that reads back card lists/subscriptions for a retrospective (same `CardDTO` shape, unaffected route paths)

## Request (unchanged)

The client-facing request body for card creation is **unchanged** — the client does not send a display name. The server derives it from the authenticated session, exactly as it already does for `createdBy`.

```http
POST /api/retrospectives/{retrospectiveId}/cards
Authorization: <session cookie/token, unchanged>
Content-Type: application/json

{
  "content": "string",
  "column": "string",
  "color": "string (optional)",
  "groupId": "string (optional)"
}
```

## Response — `CardDTO` (extended)

```jsonc
{
  "id": "string",
  "content": "string",
  "column": "string",
  "createdBy": "string",          // Firebase uid — unchanged; MUST NOT be used as a display label by any client
  "createdByName": "string",      // NEW — author's display name, captured at creation time. Present on all cards created after this fix ships.
  "createdAt": "ISO 8601 string",
  "updatedAt": "ISO 8601 string",
  "retrospectiveId": "string",
  "color": "string (optional)",
  "votes": "number (optional, deprecated)",
  "likes": "Like[] (optional)",
  "reactions": "Reaction[] (optional)",
  "order": "number (optional)",
  "groupId": "string (optional)",
  "isGroupHead": "boolean (optional)",
  "groupOrder": "number (optional)"
}
```

**Backward compatibility**: `createdByName` is optional/absent on cards created before this fix ships ("legacy cards"). Clients MUST treat its absence as expected, not as an error, and fall back to the resolution algorithm in [data-model.md](../data-model.md#resolvedauthorgroup-new-internal-view-model-rendering-only) (live participant lookup, then generic fallback label). This is an additive, non-breaking change — no API version bump required.

## Server-side derivation (not client-controlled)

`createdByName` is populated in the route handler using the existing local `displayNameOf(session.user)` helper already present in `retrospectives.ts` (identical to the one used in `boards.ts` for boards):

```ts
function displayNameOf(user: PublicUser | undefined): string {
  return user?.displayName ?? user?.email ?? 'Anonymous';
}
```

It is passed alongside `createdBy: session.sub` when constructing the create-card input for the use case — never accepted from the request body, so a client cannot spoof another user's display name on a card it creates.

## Error handling

No new error conditions are introduced. Existing error handling for card creation (validation failures, auth failures) is unchanged.
