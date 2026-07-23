# Phase 0 Research: README alineado al estado actual de la aplicación

**Feature**: 012-readme-accuracy-update | **Date**: 2026-07-23

Este documento fija la **fuente de verdad** contra la que se audita el README y
registra, por cada punto, la Decisión / Motivo / Alternativas. El README es un
documento en español que ha derivado respecto a la aplicación; el resultado debe
quedar **en inglés** (clarificación 2026-07-23) y fácticamente correcto.

Metodología: cada afirmación del README actual se clasifica en **KEEP** (correcta,
solo traducir), **FIX** (existe pero cambió), **REMOVE** (inexistente/obsoleta) o
**ADD** (capacidad real hoy omitida).

---

## R0. Idioma del documento (clarificación)

**Decision**: Reescribir el README completo en **inglés**, incluidas las secciones
hoy correctas escritas en español (theming/WCAG, guía de uso).
**Rationale**: Clarificación explícita del usuario (sesión 2026-07-23). Un README en
inglés amplía la audiencia de contribución y es la lingua franca del ecosistema.
**Alternatives**: Mantener español (rechazado por la clarificación); bilingüe
(rechazado — YAGNI, duplica mantenimiento).

---

## R1. Variables de entorno (FR-002) — FIX

**Decision**: Documentar `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
`VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
`VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` y (opcional, para E2E)
`VITE_USE_FIREBASE_EMULATOR`. Eliminar todo `REACT_APP_*`.
**Fuente de verdad**: `retro-rocket/.env.example`, `retro-rocket/src/lib/services/firebase.ts`,
`retro-rocket/src/vite-env.d.ts`, `retro-rocket/playwright.config.ts`.
**Rationale**: La app usa Vite; los `REACT_APP_*` (convención Create React App) no se
leen y confunden en instalación y en el despliegue Vercel.

---

## R2. Estructura del proyecto / arquitectura (FR-008) — FIX (reescritura)

**Decision**: Sustituir el árbol `src/components|hooks|services|contexts|...` por la
estructura **feature-first** real bajo `retro-rocket/src/`:
- `src/features/`: `auth/`, `create-board/`, `dashboard/`, `dev-tools/`, y `boards/`
  con submódulos `retrospective/`, `countdown/`, `facilitator/`, `export/`,
  `participants/`, `sentiment/`, `clustering/`, `types/`.
- `src/lib/`: `components/`, `contexts/`, `hooks/`, `services/`, `theme/`, `utils/`.
- `src/pages/`, `src/i18n/`, `src/locales/{es,en}.json`, `src/styles/`, `src/test/`.
**Fuente de verdad**: `ls retro-rocket/src/**`.
**Rationale**: Las rutas actuales del README (`src/components/retrospective/RetrospectiveBoard.tsx`,
`src/services/firebase.ts`, `src/hooks/useCards.ts`, …) no existen; un contribuidor
las buscaría en vano.
**Nota de ubicación**: la app vive en la subcarpeta `retro-rocket/`; el README debe
dejar sin ambigüedad la ruta (clonar el repo `retrorocket`, luego `cd retro-rocket`).

---

## R3. Capacidades omitidas (FR-006) — ADD

**Decision**: Añadir dos capacidades hoy ausentes del README:
1. **Análisis de sentimiento con IA en el dispositivo + estado de ánimo del equipo**
   (feature 011): badges de sentimiento por tarjeta, panel de *team-mood* para
   facilitadores; inferencia 100% on-device (los textos no salen del navegador).
2. **Agrupación asistida / *clustering*** (`src/features/boards/clustering/`) —
   **condicionado**: documentar como función disponible **solo si se verifica que es
   user-facing** (accesible desde la interfaz, no dev-only/experimental); si no lo es,
   omitir o describir como experimental (FR-006/SC-007).
**Fuente de verdad**: `retro-rocket/src/features/boards/sentiment/**`,
`.../clustering/**`, feature 011 en `specs/011-ai-sentiment-accuracy/`.
**Rationale**: Son capacidades significativas para usuarios/facilitadores; omitirlas
deja el producto infra-representado.
**Alternatives**: Describir sentimiento como "roadmap" (rechazado — ya está entregado).

---

## R4. Sistema de votación vs. likes/reacciones (FR-005) — FIX

**Decision**: Describir el modelo actual: **likes** (❤️) y **reacciones emoji** por
tarjeta; retirar la afirmación de "votación 👍/👎". Indicar que la votación numérica
(`votes`) está **deprecada** (se conserva solo por compatibilidad; los grupos exponen
`totalVotes` como agregado histórico).
**Fuente de verdad**: `retro-rocket/src/features/boards/types/card.ts`
(`votes?: number; // Deprecated`), y el comentario del E2E de card-lifecycle
("modern replacement for the deprecated numeric vote stepper").
**Rationale**: Describir 👍/👎 como interacción activa es inexacto.
**Matiz constitucional**: el constitution (VII) menciona "voting" entre flujos
críticos; el README no lo niega, solo refleja que la interacción vigente es
like/reacción y que el conteo numérico quedó deprecado.

---

## R5. Exportación PDF/DOCX (FR-005/FR-009) — FIX

**Decision**: Documentar la exportación con **`@react-pdf/renderer`** (PDF) y
**`docx`** (Word); `html2canvas` puede seguir citándose si participa en captura.
Eliminar la mención a **`jsPDF`**.
**Fuente de verdad**: `retro-rocket/package.json` (`@react-pdf/renderer ^4.3.0`,
`docx ^9.5.0`, `html2canvas ^1.4.1`; `jspdf` **no** está en dependencias).
**Rationale**: `jsPDF` no es dependencia del proyecto; citarlo es incorrecto.

---

## R6. Stack tecnológico y prerequisitos (FR-004/FR-009) — FIX

**Decision**: Actualizar el stack a lo real y **Node 22** (no "18+"):
- React 18, TypeScript strict, **Vite 4**, Tailwind CSS 3.3, framer-motion 10,
  lucide-react, Firebase 10, @dnd-kit, react-hot-toast, react-router-dom 6,
  react-i18next 15, date-fns 4, `@react-pdf/renderer` 4, `docx` 9,
  **@huggingface/transformers 3** (inferencia on-device del sentimiento).
- Prerequisitos: **Node.js 22** (el usado en CI), npm.
- Scripts reales a documentar: `dev`, `build`, `preview`, `type-check`, `lint`,
  `test`, `test:coverage`, `emulators`, `e2e` (+ `test:accuracy` gated).
**Fuente de verdad**: `retro-rocket/package.json`, `.github/workflows/ci.yml`
(`node-version: 22`).
**Rationale**: "Node 18+" y el listado de libs quedaron desfasados.

---

## R7. Reglas de Firestore de ejemplo (FR-013) — FIX / marcar como ilustrativo

**Decision**: Reemplazar el ejemplo de reglas del README por el **contenido real** de
`retro-rocket/firestore.rules` (acceso solo a usuarios autenticados **no anónimos**;
colecciones top-level `retrospectives`, `participants`, `cards`, `groups`,
`actionItems`, `sentimentResults`, `typingStatus`, `countdown_timers`) —o bien
enlazar al fichero y marcar cualquier fragmento como ilustrativo. No publicar las
reglas laxas actuales del README (`allow read: if true`, subcolección `cards`) como
si fueran las vigentes.
**Fuente de verdad**: `retro-rocket/firestore.rules`,
`retro-rocket/src/lib/utils/constants.ts` (`FIRESTORE_COLLECTIONS`).
**Rationale**: El ejemplo actual describe un modelo de seguridad (lectura pública,
subcolecciones) que no es el real; presentar reglas más débiles que las de producción
es engañoso y roza "Real-Time Data Security" del constitution.

---

## R8. Calidad, testing y CI/CD (FR-009/FR-010) — FIX + mover de roadmap a "estado actual"

**Decision**: Documentar como **ya existentes**: suite Vitest con umbral de cobertura,
ESLint + type-check, **Playwright E2E contra Firebase Emulator Suite**, análisis
**CodeQL**, versionado semántico automático, despliegues Vercel *gated* (preview/prod)
y gestión de dominios de preview — todos en `.github/workflows/ci.yml`. Retirar del
roadmap los ítems ya entregados ("CI/CD mejorado con GitHub Actions", "Tests
automatizados", "WCAG"/theming, "Optimización de bundle/lazy loading" si ya aplica).
**Fuente de verdad**: `.github/workflows/ci.yml` (jobs: CodeQL Analysis; Type-check,
lint, and test with coverage; Playwright E2E; Deploy Preview/Production; Semantic
Versioning; Firebase preview domains), `retro-rocket/vitest.config.ts`,
`retro-rocket/playwright.config.ts`, `retro-rocket/e2e/`.
**Rationale**: Listar como "pendiente" lo ya entregado transmite abandono (SC-005).

---

## R9. Enlaces, autenticación y metadatos (FR-011) — FIX/REMOVE

**Decision**:
- **Enlaces del pie**: `Ver Demo (#)`, `Documentación (#)`, `Comunidad (#)` son
  *placeholders* muertos → eliminarlos o apuntarlos a destinos reales (p. ej.
  el propio README / la app en vivo). Conservar la URL de la app si es válida
  (`https://retro-rocket.vercel.app`).
- **Autenticación**: proveedores reales = **Google** y **GitHub**. Retirar
  "con preparación para Apple" salvo que exista soporte real (no se halla
  `AppleAuthProvider` en el código) → REMOVE.
- **Metadatos**: revisar año de copyright (2024 → actual si procede) y licencia MIT
  (correcta; `LICENSE` presente en la raíz).
**Fuente de verdad**: `retro-rocket/src/lib/services/*` (solo `GoogleAuthProvider`,
`GithubAuthProvider`), `LICENSE`, README actual.
**Rationale**: Enlaces `(#)` y capacidades "preparadas" inexistentes restan
credibilidad.

---

## R10. Contenido correcto a preservar (FR-012) — KEEP (traducir)

**Decision**: Preservar, **traducido al inglés**, el contenido que ya es veraz:
- **Theming & Accesibilidad (WCAG 2.1 AA)**: rutas reales verificadas
  (`src/lib/theme/tokens.ts`, `src/styles/globals.css`, `tailwind.config.js`,
  `specs/009-wcag-theme-compliance/contracts/design-tokens.md`, `src/test/lib/theme/`,
  `e2e/accessibility.spec.ts`).
- **Plantillas de tablero**: `default` (helped/hindered/improve), `madSadGlad`,
  `startStopContinue`, todas con columna automática de *action items*.
- **Selector de emoji**: 6 categorías (Emotions, Gestures, Objects, Activities, Food,
  Symbols), ~250+ emojis — dato correcto (`emojiConstants.ts`).
- **Colaboración en tiempo real, participantes, countdown, notas del facilitador,
  agrupación manual** — describen funciones reales.
**Fuente de verdad**: `retro-rocket/src/features/create-board/boardTemplates.ts`,
`retro-rocket/src/lib/utils/emojiConstants.ts`, secciones de theming ya verificadas.
**Rationale**: No degradar lo correcto; el riesgo de una reescritura es perder
precisión ya lograda.
**Matiz**: la introducción dice "tres columnas estructuradas"; con múltiples
plantillas + columna de acción esto es impreciso → describir "columnas estructuradas
según plantilla, más una columna de *action items*".

---

## Resumen de decisiones por sección del README

| Sección del README actual | Acción |
|---------------------------|--------|
| Intro ("tres columnas") | FIX (columnas según plantilla + action items) + traducir |
| Autenticación (Apple) | FIX/REMOVE (solo Google/GitHub) + traducir |
| Colaboración / Participantes | KEEP + traducir |
| Sistema de tarjetas (votación 👍/👎) | FIX (likes + reacciones; votos deprecados) |
| Facilitador (countdown, notas) | KEEP + traducir; **ADD** sentimiento/team-mood |
| Agrupación | KEEP + traducir; **ADD** clustering **solo si user-facing** (verificar) |
| Exportación (jsPDF) | FIX (@react-pdf/renderer + docx) |
| UX / Theming (WCAG) | KEEP + traducir (rutas verificadas) |
| Stack tecnológico | FIX (Vite 4, Node 22, libs reales, +transformers) |
| Arquitectura (árbol src) | FIX (reescribir a feature-first) |
| Instalación (REACT_APP_*, rutas) | FIX (VITE_*, subcarpeta retro-rocket/) |
| Reglas Firestore de ejemplo | FIX (alinear a firestore.rules o marcar ilustrativo) |
| Deployment (variables) | FIX (VITE_*) |
| Roadmap / Mejoras técnicas | FIX (retirar lo ya entregado: CI, tests, WCAG) |
| Enlaces del pie (#) | REMOVE/FIX |
| Metadatos (año, licencia) | FIX menor / KEEP |
| **Capacidad de IA (sentimiento)** | **ADD** |
| **Clustering** | **ADD si user-facing** (verificar; si no, omitir/experimental) |

Sin `NEEDS CLARIFICATION` restantes.
