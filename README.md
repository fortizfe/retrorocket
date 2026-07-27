# 🚀 RetroRocket

**RetroRocket** is a modern, collaborative tool that helps Scrum teams run fun and
effective retrospectives. Teams work together on real-time boards whose columns are
defined by the chosen template, plus an automatic **action items** column for
follow-ups.

🔗 **Live app:** [retro-rocket.vercel.app](https://retro-rocket.vercel.app)

## ✨ Key Features

### 🔐 Authentication
- **Multiple providers**: sign in with **Google** or **GitHub**.
- **Multi-provider profiles**: view and manage the sign-in methods linked to your
  account from your **Profile**.

### 👥 Real-Time Collaboration
- **Multiple participants** working on the same board simultaneously.
- **Instant synchronization** of every change for all users.
- **Participant presence**: stacked avatars with a compact display, an interactive
  popover with the full list, and live connection state (active vs. total).

### 📝 Cards & Board Templates
- **Board templates**: **Default** (What helped / What hindered / What to improve),
  **Mad-Sad-Glad**, and **Start-Stop-Continue** — each with an automatic
  **action items** column.
- **Likes & emoji reactions**: like a card (❤️) or react with an emoji from a unified
  picker (6 categories, 250+ emojis). *(The legacy numeric 👍/👎 voting stepper is
  deprecated and replaced by likes + reactions.)*
- **Real-time editing**: edit and delete your own cards.
- **Custom colors**: a pastel color palette for visual organization.

### 🔗 Card Grouping & AI-Assisted Suggestions
- **Manual grouping**: drag and drop a card onto another to form a group.
- **Group suggestions**: assisted clustering proposes related cards to group together.
- **Group heads & hierarchy**: designate a lead card; clear visual indentation.
- **Group stats**: automatic counts of likes and participation per group.

### 🤖 Facilitator Mode
- **Countdown timer**: fully configurable (minutes/seconds), with visual states
  (running/paused/finished), a progress bar, a sound on completion, and real-time
  sync to every participant. Facilitator-only controls (create, start, pause, reset,
  delete).
- **Facilitator notes**: private annotations created and edited live during the
  retrospective, included in exports.
- **AI sentiment & team mood** (see below).

### 🧠 On-Device AI Sentiment & Team Mood
- **Per-card sentiment**: cards receive a positive / neutral / negative sentiment
  badge (icon + label, not color alone).
- **Team-mood dashboard**: the facilitator panel derives a single, self-consistent
  mood score, per-column percentages, and alerts.
- **100% on-device**: inference runs in a Web Worker via `@huggingface/transformers`
  (ONNX Runtime Web). **Card text never leaves the browser.**

### 📄 Export
- **PDF** (via `@react-pdf/renderer`) and **DOCX** (via `docx`) exports.
- **Granular options**: choose whether to include participants, statistics, grouping
  details, and facilitator notes.

### 🔌 MCP Connector for AI Assistants
- **Connect your own AI assistant** (e.g. Claude) to your RetroRocket account using a
  remote, read-only [Model Context Protocol](https://modelcontextprotocol.io) server —
  list your retrospectives, pull full detail or a report-ready summary, and let the
  assistant draft a report for you.
- **Your existing sign-in, no new password**: authorization reuses your Google/GitHub
  RetroRocket account via a standard OAuth 2.1 consent screen.
- **Revoke anytime**: manage every connected AI client from your **Profile** page;
  revoking takes effect immediately, checked live on every request.
- **Facilitator notes stay private**: only included when the connected user is that
  retrospective's own facilitator — the same rule already applied to PDF/DOCX export.
- **Strictly read-only**: nothing exposed through the connector can create, edit, or
  delete anything in Firestore. See [MCP Connector](#-mcp-connector-for-ai-assistants-1) below.
- **Step-by-step user guide**: see [`docs/mcp-guia-usuario.md`](docs/mcp-guia-usuario.md)
  for how to connect, what the assistant can do, and how to revoke access.

### 🏗️ Backend Architecture
- **Own hexagonal backend**: RetroRocket is no longer a Firestore-backed SPA at all —
  it ships a dedicated **hexagonal backend** that orchestrates authentication,
  session, the MCP connector, and **every board/card/participant/facilitator-tool
  read and write**, served same-origin under `/api/*` (see
  [Backend & Services](#backend--services) below for the technical detail). The
  frontend never talks to Firebase directly; real-time updates arrive over a
  per-board Server-Sent Events channel backed by the server's own Firestore listeners.

### 🎨 Experience
- Clean, modern UI with smooth **Framer Motion** animations.
- **Responsive** across mobile and desktop.
- **Light & dark themes** that meet **WCAG 2.1 AA** (see Theming below).
- **Internationalization**: Spanish and English.

### 💾 Persistence & Resilience
- **Firebase Firestore** for secure, real-time data — accessed exclusively by the
  backend's Admin SDK; the browser never holds Firestore credentials or opens a
  Firestore connection of its own.
- Explicit **loading, error, and reconnection** states for every board operation (no
  silent failures), including a visible disconnected/reconnecting indicator for the
  SSE real-time channel.

## 🛠️ Tech Stack

### Frontend
- **React 18** + **TypeScript** (strict mode)
- **Vite 4** build tool
- **Tailwind CSS 3** for styling
- **Framer Motion** for animation
- **lucide-react** for icons

### Backend & Services
- **Hexagonal backend** (TypeScript + **Express 5**) served same-origin under `/api/*` as
  Vercel serverless functions — see [`retro-rocket/server/README.md`](retro-rocket/server/README.md).
  Authentication is orchestrated entirely by the backend (server-side Google/GitHub
  OAuth and an `httpOnly` session cookie); every board/card/participant/facilitator-tool
  read and write goes through the backend's own REST + Server-Sent Events API.
- **Firebase Admin SDK** (Firestore) — backend-only. The frontend has no Firebase
  client SDK dependency at all.
- **Vercel** for hosting and deployment

### Notable Libraries
- **@dnd-kit** — accessible drag & drop
- **react-router-dom 6** — SPA routing
- **react-i18next 15** — internationalization
- **date-fns 4** — date utilities
- **@react-pdf/renderer 4** + **docx 9** — PDF / Word export
- **@huggingface/transformers 3** — on-device sentiment inference (ONNX Runtime Web)
- **react-hot-toast** — notifications

### Testing & Tooling
- **Vitest** + **Testing Library** (unit/hooks/services)
- **Playwright** (end-to-end, against the Firebase Emulator Suite)
- **ESLint** + **TypeScript** type-checking

## 🏗️ Project Architecture

The application lives in the `retro-rocket/` subfolder and follows a **feature-first**
layout:

```text
retro-rocket/
├── .env.example                 # Environment variable template (backend-only now)
├── firestore.rules              # Firestore security rules (deny-all; backend-only access)
├── package.json                 # Scripts & dependencies
├── server/                      # Hexagonal backend (Express, /api/*) — see server/README.md
├── e2e/                         # Playwright E2E specs (+ fixtures)
└── src/
    ├── App.tsx  main.tsx
    ├── features/                # Feature modules (feature-first)
    │   ├── auth/                # Authentication & profile
    │   ├── create-board/        # Board creation & templates (boardTemplates.ts)
    │   ├── dashboard/           # Dashboard
    │   ├── dev-tools/           # Development utilities
    │   └── boards/
    │       ├── retrospective/   # Board, columns, cards
    │       ├── countdown/       # Facilitator countdown timer
    │       ├── facilitator/     # Facilitator tabs (notes, sentiment, team mood)
    │       ├── export/          # PDF / DOCX export
    │       ├── participants/    # Real-time participants
    │       ├── sentiment/       # On-device AI sentiment & team mood
    │       ├── clustering/      # Card grouping & suggestions
    │       └── types/           # Shared board types
    ├── lib/                     # Cross-cutting: components, contexts, hooks,
    │                            #   services (backendApiClient), theme, utils
    ├── pages/                   # Landing, Dashboard, Profile, RetrospectivePage, …
    ├── i18n/                    # i18next config
    ├── locales/                 # es.json, en.json
    ├── styles/                  # Global styles / tokens
    └── test/                    # Vitest unit/integration tests
```

## 🎨 Theming & Accessibility (WCAG 2.1 AA)

The light and dark themes both meet **WCAG 2.1 Level AA** (a project constitution
requirement). Every color is defined **once per role** via **semantic tokens**:

- **Source of truth:** `retro-rocket/src/lib/theme/tokens.ts` (per-theme RGB
  channels), mirrored as CSS variables in `retro-rocket/src/styles/globals.css`
  (`:root` / `.dark`) and exposed through `retro-rocket/tailwind.config.js`.
- **How to use them:** in components, use semantic classes (`bg-surface`,
  `text-text-primary`, `border-border-default`, `focus-visible:ring-focus`,
  `bg-info-bg` / `text-info-fg`, …) instead of raw palette utilities
  (`bg-slate-800`, ad-hoc `dark:*` pairs).
- **Full contract & rules:** see
  `specs/009-wcag-theme-compliance/contracts/design-tokens.md`.
- **Verification:** tests in `retro-rocket/src/test/lib/theme/` check the AA contrast
  of every token/combination in both themes, and an axe audit
  (`retro-rocket/e2e/accessibility.spec.ts`) scans the screens in light and dark.

> When adding a new color, decide its *role* and add/use a token — do not introduce
> ad-hoc `dark:` pairs.

## 🚀 Getting Started

### Prerequisites
- **Node.js 22** (the version used in CI)
- **npm**
- A **Firebase** project (free tier is fine) — used by the *backend* only, via the
  Firebase Admin SDK

### 1. Clone and enter the app folder
```bash
git clone <repository-url>
cd retrorocket/retro-rocket
```
> The application package lives in the `retro-rocket/` subfolder of the repository.

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```
All Firebase configuration is now **backend-only** — see
[`.env.example`](retro-rocket/.env.example) for the full list (session signing key,
OAuth provider credentials, `FIREBASE_SERVICE_ACCOUNT`, etc.). There are no `VITE_*`
Firebase variables to set; the frontend has no Firebase configuration of its own.

### 4. Run in development
```bash
npm run dev
```
The app is available at `http://localhost:3000`.

### 5. Build for production
```bash
npm run build
npm run preview   # preview the production build locally
```

## 🔐 Firestore Security Rules

The authoritative rules live in
[`retro-rocket/firestore.rules`](retro-rocket/firestore.rules) — deploy that file to
your Firebase project (Console → Firestore Database → Rules). Every RetroRocket
collection (`retrospectives`, `participants`, `cards`, `groups`, `actionItems`,
`sentimentResults`, `typingStatus`, `countdown_timers`, `facilitatorNotes`, `users`,
`userBoardHistory`) is now **deny-all** for direct client access — the backend's
Admin SDK bypasses these rules by design and is the only reader/writer. This mirrors
the MCP connector's own state collections (`mcpClients`, `mcpAuthorizationCodes`,
`mcpConnections`), which were already deny-all.

> The snippet below is **illustrative** — always refer to `firestore.rules` as the
> source of truth.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /retrospectives/{retrospectiveId} {
      allow read, write: if false;
    }
    // ...one explicit deny per collection — see firestore.rules for the full list.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 🔌 MCP Connector for AI Assistants

RetroRocket exposes a remote, **read-only** [Model Context Protocol](https://modelcontextprotocol.io)
server so you can connect your own AI assistant (e.g. Claude) and have it draft reports
from your retrospectives, without manually exporting and uploading files.

### How to connect

1. From your MCP-compatible AI client, add RetroRocket as a remote MCP server
   (the client discovers the connection details automatically via standard OAuth
   metadata discovery and Dynamic Client Registration — no manual client setup).
2. You'll be taken through a normal Google/GitHub sign-in (if not already signed in),
   followed by a consent screen showing which AI client is requesting access.
3. Click **Allow**. The assistant can now call three read-only tools:
   - `list_retrospectives` — every retrospective you created or participated in.
   - `get_retrospective_detail` — cards, groupings, likes/reactions, participants,
     sentiment results, and action items for one retrospective.
   - `get_retrospective_summary` — a structured, report-ready summary of the same data.

For detailed, step-by-step instructions — including connecting from claude.ai and
Claude Code, and revoking access — see the
[**MCP user guide**](docs/mcp-guia-usuario.md).

### Managing and revoking access

Every AI client you've authorized is listed under **Connected AI Assistants** on your
**Profile** page, alongside your linked sign-in providers. Click **Revoke** on any entry
to disconnect it — revocation is checked live on the very next request, not just once a
token happens to expire.

### Privacy: facilitator notes

Your private facilitator notes are only ever included in a connector response when you
are the facilitator of that specific retrospective — exactly the same rule already
applied to the PDF/DOCX export. A connected AI client acting on behalf of a participant
never sees another user's facilitator notes.

### Read-only, by design

This connector cannot create, edit, or delete anything in Firestore. The only data it
writes is its own connection bookkeeping (which AI clients are authorized, and their
status) — never your retrospective data.

## 📖 Usage Guide

### Authentication
1. On the landing page, click **Sign in with Google** or **Sign in with GitHub**.
2. From your **Profile**, review and manage your linked sign-in methods.

### Create a retrospective
1. On the **Dashboard**, start a new retrospective.
2. **Pick a template**: Default (What helped / What hindered / What to improve),
   Mad-Sad-Glad, or Start-Stop-Continue — each includes an automatic **action items**
   column.
3. Give it a title (and optional description), create it, and **share the link** with
   your team.

### Join a retrospective
- Open the shared link, or enter the **retrospective ID** from the Dashboard.

### Work on the board
- **Add cards**: click **Add** in a column, type your note (emoji picker available),
  optionally pick a color, and save.
- **React**: **like** a card (❤️) or add an **emoji reaction**.
- **Group**: drag a card onto another to group them, or accept a **group suggestion**;
  designate a group head as needed.
- **Edit / delete**: only on your own cards (✏️ / 🗑️).

### Facilitator mode
- **Countdown timer**: configure minutes/seconds, then start / pause / reset / delete;
  all participants see it in real time.
- **Facilitator notes**: create and edit private notes; they can be included in
  exports.
- **Team mood**: open the facilitator **Team** tab to see the AI sentiment analysis
  and the team-mood dashboard.

### Export results
- Export to **PDF** or **DOCX** from the retrospective header; use the options to
  include participants, statistics, grouping details, and facilitator notes.

## 🧪 Testing, Quality & CI

Run locally (from `retro-rocket/`):

```bash
npm run type-check     # TypeScript (no emit)
npm run lint           # ESLint
npm run test           # Vitest (watch)
npm run test:coverage  # Vitest with coverage thresholds
npm run emulators      # Firebase Auth + Firestore emulators
npm run e2e            # Playwright E2E against the emulator suite
```

**Continuous Integration** (`.github/workflows/ci.yml`) runs on every pull request and
push to `main`:
- **Type-check, lint, and test with coverage** (Vitest coverage thresholds enforced)
- **Playwright E2E** against the Firebase Emulator Suite
- **CodeQL** static analysis
- **Gated Vercel deploys** (preview per PR, production on `main`) and preview-domain
  management
- **Automated semantic version bumps**

Branch protection on `main` requires the check, E2E, and CodeQL jobs to pass before
merge.

## ☁️ Deployment

Deployed on **Vercel**:
1. Connect the repository to Vercel.
2. Add the **backend environment variables** (see [`.env.example`](retro-rocket/.env.example) —
   session signing key, OAuth credentials, `FIREBASE_SERVICE_ACCOUNT`, etc.) in the
   Vercel project settings. There are no frontend `VITE_FIREBASE_*` variables to set.
3. Deploys are **gated** on CI: a preview deploy per pull request and a production
   deploy on push to `main`.

## 🤝 Contributing

1. **Fork** the project and create a feature branch.
2. Follow the project standards:
   - **TypeScript strict** (no unjustified `any`)
   - **ESLint** clean (mandatory gate)
   - **TDD** — tests precede implementation; coverage thresholds must not drop
   - **Conventional Commits**
   - **WCAG 2.1 AA** for any user-facing change
3. Open a Pull Request with a clear description.

Design and governance live under [`specs/`](specs/) and the project constitution
(`.specify/memory/constitution.md`).

## 📊 Roadmap

Ideas not yet implemented:

- [ ] Additional retrospective templates (4Ls, DAKI, …)
- [ ] Countdown timer alerts (customizable warnings)
- [ ] Session history with facilitator metrics
- [ ] Integrations (Slack, Teams, Jira)
- [ ] Team analytics across retrospectives
- [ ] Private retrospectives with access control
- [ ] Offline mode with later synchronization
- [ ] Public REST API for external integrations
- [ ] Native mobile app

## 📝 License

RetroRocket is released under the terms of the [`LICENSE`](LICENSE) file
(**GNU General Public License v3**).

---

**Ready to improve your retrospectives?** 🚀
[**Get started**](https://retro-rocket.vercel.app)

*Made with ❤️ for teams that want to keep improving.*
