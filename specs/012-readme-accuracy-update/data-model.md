# Phase 1 Data Model: README alineado al estado actual de la aplicación

**Feature**: 012-readme-accuracy-update | **Date**: 2026-07-23

Al ser una feature de documentación, el "modelo de datos" es la **arquitectura de
información destino** del README: el inventario de secciones (en inglés), el contenido
veraz que cada una debe contener y su **referencia a la fuente de verdad**. Cada
sección es una "entidad" con: propósito, contenido requerido, acción (KEEP/FIX/
REMOVE/ADD, ver [research.md](./research.md)) y fuente de verdad para validar.

## Entidad transversal: "Claim" (afirmación)

Unidad mínima verificable del README.

| Atributo | Descripción |
|----------|-------------|
| `text` | La afirmación redactada (en inglés). |
| `sourceOfTruth` | Ruta/artefacto del repo que la respalda (código, script, config). |
| `status` | `accurate` (respaldada) \| `illustrative` (marcada como ejemplo). |
| `language` | Debe ser `en` (inglés) en el resultado. |

**Reglas de validez (FR-001/FR-012/FR-013/FR-014)**
- Toda `Claim` de tipo `accurate` MUST poder mapearse a un `sourceOfTruth` existente.
- Ninguna `Claim` puede presentar como real algo `illustrative` (p. ej. reglas
  Firestore) sin marcarlo como ejemplo.
- `language` MUST ser `en` para el 100% de las `Claim` (SC-008).
- No pueden quedar `Claim` que describan funciones inexistentes (SC-002).

## Inventario de secciones destino (orden canónico)

> Encabezados finales en inglés. "Acción" resume research.md.

| # | Sección (EN) | Propósito | Contenido requerido | Acción | Fuente de verdad |
|---|--------------|-----------|---------------------|--------|------------------|
| 1 | **Overview** | Qué es RetroRocket | Herramienta colaborativa de retros; columnas según plantilla + columna de *action items* (no "tres columnas" fijas) | FIX+traducir | `boardTemplates.ts` |
| 2 | **Key Features** | Lista de capacidades reales | Auth (Google/GitHub), colaboración/participantes en tiempo real, tarjetas (likes + reacciones emoji; **sin** votación 👍/👎 activa), plantillas, colores, facilitador (countdown + notas), **AI sentiment & team-mood**, agrupación manual (+ **clustering** solo si user-facing verificado), exportación PDF/DOCX, theming claro/oscuro, i18n ES/EN | FIX+ADD | `src/features/**`, feature 011 |
| 3 | **Tech Stack** | Tecnologías reales | React 18 + TS strict, Vite 4, Tailwind 3.3, framer-motion, lucide, Firebase 10, @dnd-kit, react-router 6, react-i18next 15, date-fns 4, @react-pdf/renderer 4, docx 9, **@huggingface/transformers 3** (on-device). **Sin jsPDF** | FIX | `package.json` |
| 4 | **Project Architecture** | Dónde vive el código | Árbol feature-first bajo `retro-rocket/src/` (`features/**`, `lib/**`, `pages/`, `i18n/`, `locales/`, `test/`) | FIX (reescribir) | `ls src/**` |
| 5 | **Theming & Accessibility (WCAG 2.1 AA)** | Contrato de temas/tokens | Contenido actual (rutas verificadas), traducido | KEEP+traducir | sección ya verificada |
| 6 | **Getting Started / Setup** | Instalar y arrancar | Prerequisitos **Node 22** + npm; clonar `retrorocket` → `cd retro-rocket`; `npm install`; `cp .env.example .env` con **VITE_FIREBASE_***; scripts `dev`/`build`/`preview` | FIX | `package.json`, `.env.example`, CI |
| 7 | **Firebase / Firestore rules** | Config backend | Enlazar/alinear con `firestore.rules` real (auth no-anónima; colecciones top-level) o marcar como ejemplo | FIX (ilustrativo) | `firestore.rules`, `constants.ts` |
| 8 | **Usage Guide** | Flujos de uso | Crear/unirse, tarjetas (añadir, like, reaccionar, color, editar/eliminar propias), agrupar, **facilitador (countdown, notas, sentimiento/team-mood)**, exportar | FIX+ADD+traducir | UI observable |
| 9 | **Testing & Quality / CI** | Controles reales | Vitest + cobertura, ESLint, type-check, **Playwright E2E (emulador Firebase)**, **CodeQL**, semver auto, deploys Vercel gated; comandos `test`/`test:coverage`/`e2e`/`emulators`/`lint`/`type-check` | ADD/FIX | `.github/workflows/ci.yml`, `package.json` |
| 10 | **Deployment** | Publicar | Vercel; variables **VITE_*** en el dashboard; deploy en push a main (gated) | FIX | CI, `.env.example` |
| 11 | **Contributing** | Cómo contribuir | Estándares (TS strict, ESLint, Conventional Commits, TDD); referencia a `specs/` y al constitution | KEEP+traducir | constitution, repo |
| 12 | **Roadmap** | Futuro real | Retirar lo ya entregado (CI, tests, WCAG, bundle) ; dejar solo pendientes reales (4Ls/DAKI, integraciones, historial, PWA, etc. si no están hechos) | FIX | CI, features |
| 13 | **License / Footer** | Metadatos y enlaces | MIT (`LICENSE`); año correcto; **sin enlaces `(#)`**; URL app en vivo si válida | FIX | `LICENSE`, README |

## Transición de estado (por afirmación)

```
(README actual, ES)
  KEEP  --translate-->            (EN, verbatim veraz)
  FIX   --correct + translate-->  (EN, alineada a fuente de verdad)
  REMOVE --delete-->              (∅)
  ADD   --author + translate-->   (EN, nueva, con fuente de verdad)
```

## Invariantes del resultado

- **I1 (idioma)**: 100% del README en inglés — 0 fragmentos en español (SC-008).
- **I2 (exactitud)**: 0 afirmaciones sobre funciones inexistentes (SC-002); 100% de
  variables/comandos citados coinciden con los reales (SC-003).
- **I3 (rutas)**: 100% de rutas citadas (arquitectura/instalación/theming) existen
  (SC-004).
- **I4 (roadmap)**: 0 ítems entregados listados como pendientes (SC-005).
- **I5 (enlaces)**: 0 enlaces `(#)` sin destino (SC-006); todo enlace externo
  conservado es alcanzable (FR-011).
- **I6 (completitud)**: capacidades user-facing presentes y omitidas documentadas —
  sentiment/team-mood (confirmado) y clustering **solo si verificado user-facing**
  (SC-007); 0 capacidad no verificada presentada como disponible.
- **I7 (seguridad)**: el ejemplo de reglas no presenta reglas más débiles que
  `firestore.rules` como reales (FR-013).
