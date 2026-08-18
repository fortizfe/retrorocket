# Contract: `typing.*` i18n keys

Governs `src/locales/en.json` and `src/locales/es.json`, `typing` namespace.
Traces to spec.md FR-002/FR-003 and the 2026-08-18 clarification on i18n
delivery.

## Key contract

| Key | Interpolation variables | `en.json` value | `es.json` value | Status |
|---|---|---|---|---|
| `typing.single` | `username` | `"{{username}} is typing"` | `"{{username}} está escribiendo"` | Existing key — currently defined but **unused** by `TypingPreview.tsx`; this feature wires it up. Values MUST NOT change (Spanish value already matches the current hardcoded string verbatim, so existing E2E string assertions keep passing). |
| `typing.double` | `username1`, `username2` | `"{{username1}} and {{username2}} are typing"` | `"{{username1}} y {{username2}} están escribiendo"` | Same as above. |
| `typing.multiple` | `username`, `count` | `"{{username}} and {{count}} more are typing"` | `"{{username}} y {{count}} más están escribiendo"` | Same as above. |
| `typing.anonymous` | none | `"A user is typing"` | `"Un usuario está escribiendo"` | **New key.** No interpolation — the whole point is that it carries no per-typist data. |

## Consistency rules

- Both locale files MUST define all four keys under the same `typing`
  namespace, in the same relative position (mirrors the existing convention
  visible throughout both files, e.g. the `participants` namespace directly
  above `typing`).
- `typing.anonymous` MUST NOT accept an interpolation variable — this is the
  structural guarantee (not just a convention) that no per-typist data can
  leak through this string, independent of what any call site passes in.
- No other locale files exist in the project at this time (`en`/`es` only,
  per `useLanguage.ts`'s `getAvailableLanguages()`); no third locale is in
  scope.

## Consumer contract

`TypingPreview.tsx` MUST obtain `t` via the project's existing
`useLanguage()` hook (`src/lib/hooks/useLanguage.ts`), matching every other
`src/lib/components/ui/*` component that already needs translations (e.g.
`BottomSheet.tsx`, `ColorPicker.tsx`, `DatePicker.tsx`) — not a bespoke
`useTranslation()` call, so the component stays consistent with the rest of
the codebase's language-switching behavior (including `currentLanguage`
reactivity, already handled by the shared hook).
