# Phase 1 Data Model: In-App Getting Started User Guide

No persisted/backend data model changes — both entities below are static, client-bundled TypeScript structures (see research.md Decision 1), not Firestore collections or API resources.

## Guide Category

Groups related Guide Topics for the side menu.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Stable slug, e.g. `"boards-and-cards"`. Used as a React key and in the topic registry's `categoryId` foreign key. |
| `labelKey` | `string` | i18next key resolving to the category's display label (ES/EN), e.g. `guide.categories.boardsAndCards`. |
| `order` | `number` | Explicit display order in the side menu (avoids relying on object/array insertion order as an implicit contract). |

Initial categories (from spec.md Key Entities / FR-006), in display order: Getting Started (sign-in/profile), Boards & Cards, Collaboration, Anonymous Mode, Facilitator Tools, AI Sentiment & Team Mood, Exporting, Teams, Connecting AI Assistants.

## Guide Topic

A single documented capability.

| Field | Type | Notes |
|---|---|---|
| `id` (slug) | `string` | URL-safe identifier, used verbatim as the `:topicSlug` route param (research.md Decision 2), e.g. `"anonymous-mode"`. Must be unique across all topics. |
| `categoryId` | `string` | References a Guide Category's `id`. |
| `titleKey` | `string` | i18next key for the topic's display title, e.g. `guide.topics.anonymousMode.title`. |
| `summaryKey` | `string` | i18next key for a one-line summary shown in the side menu / overview listing. |
| `bodyKey` | `string` | i18next key resolving to an ordered array of plain-language paragraph/step strings — the topic's main content. Rendered as-is, no markdown parsing (research.md Decision 1). |
| `externalGuideUrl` | `string \| undefined` | When set, the topic content ends with a link to a standalone dedicated guide instead of duplicating it (FR-010) — currently only the Connecting AI Assistants (MCP) topic sets this, pointing at `docs/mcp-guia-usuario.md`'s published location. |
| `order` | `number` | Explicit display order within its category. |

### Validation rules

- Every `Guide Topic.categoryId` MUST reference an existing `Guide Category.id` (enforced by a unit test over the registry, not runtime validation — this is static, developer-authored data, not user input).
- `Guide Topic.id` MUST be unique across the whole registry (same reasoning — a build-time/test-time invariant).
- Every `titleKey`/`summaryKey`/`bodyKey` referenced by a topic MUST resolve to a real key in both `en.json` and `es.json` (existing project convention: i18n completeness is already verified for other namespaces; extend that same check, or a dedicated unit test, to the new `guide` namespace).
- FR-006's full topic list (12 topics) MUST all exist in the registry at launch — this is the concrete, testable form of SC-003.

### Relationships

```text
Guide Category (1) ──< (many) Guide Topic
```

No other entities are involved — this feature has no relationship to Firestore-backed domain entities (User, Board, Card, Team, etc.); it only *describes* those capabilities in prose, per spec.md's edge case: "the guide MUST still describe the feature generally... it documents product capability, not the individual user's current account state."

## State / lifecycle

Both entities are immutable, developer-authored, build-time data — there is no create/update/delete lifecycle, no per-user state, and no transitions to model.
