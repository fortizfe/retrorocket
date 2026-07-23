---
description: "Task list for feature implementation"
---

# Tasks: README alineado al estado actual de la aplicación

**Input**: Design documents from `/specs/012-readme-accuracy-update/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: No aplican pruebas unitarias/E2E — es una feature de **documentación** sin
código de aplicación. La verificación se hace con `quickstart.md` (greps de tokens
obsoletos, existencia de rutas, comandos ∈ scripts, idioma inglés). Las tareas de
verificación por historia sustituyen a los tests.

**Organization**: Tareas agrupadas por las 4 historias de usuario del spec. Cada
historia posee un conjunto de **secciones** del README y es verificable de forma
independiente con el subconjunto correspondiente del `quickstart.md`.

## ⚠️ Restricción de fichero único

El **único entregable** es `README.md` en la **raíz del repositorio**. Todas las tareas
de contenido editan ese mismo fichero, por lo que son **secuenciales** (sin `[P]` entre
ellas). Las historias se organizan para **verificación independiente**, no para edición
en paralelo. La aplicación bajo `retro-rocket/` es **fuente de verdad de solo lectura**.

## Path Conventions

- Entregable: `README.md` (raíz del repo).
- Fuente de verdad (solo lectura): `retro-rocket/**`, `.github/workflows/ci.yml`,
  `retro-rocket/firestore.rules`, `retro-rocket/.env.example`, `retro-rocket/package.json`.
- Referencias de diseño: `specs/012-readme-accuracy-update/{research,data-model,quickstart}.md`,
  `contracts/readme-accuracy-contract.md`.

---

## Phase 1: Setup

**Purpose**: Fundamentar las ediciones en hechos verificados y preparar el trabajo.

- [X] T001 [P] Re-verificar los hechos de fuente de verdad contra el repo siguiendo `quickstart.md` §C/§D: variables en `retro-rocket/.env.example`, scripts en `retro-rocket/package.json`, versión de Node en `.github/workflows/ci.yml`, y rutas clave bajo `retro-rocket/src/**`; anotar cualquier delta respecto a `specs/012-readme-accuracy-update/research.md`. **Determinar además si `clustering` (`retro-rocket/src/features/boards/clustering/`) es user-facing** (accesible desde la interfaz, no dev-only/experimental) y registrar el veredicto — condiciona T010/T012 (FR-006).
- [X] T002 [P] Confirmar que el trabajo se hace sobre una rama dedicada (p. ej. `012-readme-accuracy-update`) apuntando al `README.md` de la raíz; crearla si no existe.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Estructura base del documento sobre la que cada historia rellena sus secciones.

**⚠️ CRITICAL**: Ninguna historia puede completar sus secciones hasta tener el esqueleto.

- [X] T003 Crear en `README.md` el esqueleto de secciones canónico **en inglés** con los 13 encabezados de `contracts/readme-accuracy-contract.md` §C1 (Overview, Key Features, Tech Stack, Project Architecture, Theming & Accessibility, Getting Started, Firestore Security Rules, Usage Guide, Testing/Quality & CI, Deployment, Contributing, Roadmap, License), con marcadores breves; el contenido se rellena por historia.
- [X] T004 Redactar la sección **Overview** (§1) en inglés en `README.md`, corrigiendo "tres columnas estructuradas" por "columnas según plantilla + una columna automática de *action items*" (research R10; FR-001).

**Checkpoint**: Esqueleto en inglés listo — las historias pueden completar sus secciones.

---

## Phase 3: User Story 1 - Configurar y arrancar sin instrucciones falsas (Priority: P1) 🎯 MVP

**Goal**: Un recién llegado sigue instalación/configuración/despliegue sin toparse con una variable, ruta o comando incorrecto.

**Independent Test**: `quickstart.md` §A (`VITE_FIREBASE_` presente, `REACT_APP_` = 0), §C (rutas existen), §D (comandos ∈ scripts), §F (setup en entorno limpio) sin fallos.

### Implementation for User Story 1

- [X] T005 [US1] Reescribir **Getting Started** (§6) en `README.md`: prerequisitos **Node 22** + npm; secuencia de ruta **sin ambigüedad** — clonar el repo (carpeta `retrorocket`) → `cd retrorocket/retro-rocket` (la app vive en la subcarpeta `retro-rocket/`); `npm install`; `cp .env.example .env` con variables **`VITE_FIREBASE_*`** (+ opcional `VITE_USE_FIREBASE_EMULATOR`); scripts `dev`/`build`/`preview` (research R1/R6; FR-002/FR-003/FR-004). Usar esta misma secuencia de ruta de forma consistente en todo el README.
- [X] T006 [US1] Reescribir **Firestore Security Rules** (§7) en `README.md` para reflejar `retro-rocket/firestore.rules` (usuarios autenticados **no anónimos**; colecciones top-level `retrospectives`/`participants`/`cards`/`groups`/`actionItems`/`sentimentResults`/`typingStatus`/`countdown_timers`) o enlazar el fichero marcando cualquier fragmento como ejemplo ilustrativo (research R7; FR-013).
- [X] T007 [US1] Reescribir **Deployment** (§10) en `README.md`: Vercel con variables **`VITE_*`** en el dashboard (usar **exactamente la misma lista** de variables que en Getting Started/T005 para evitar divergencia); despliegue *gated* en push a `main` (research R8/R9; FR-002/FR-009).
- [X] T008 [US1] Verificar US1: ejecutar `quickstart.md` §A (`grep REACT_APP_` → 0), §C (rutas citadas existen), §D (cada comando citado ∈ `retro-rocket/package.json` scripts); confirmar 0 fallos.

**Checkpoint**: La ruta de puesta en marcha del README es correcta y verificable — MVP demostrable.

---

## Phase 4: User Story 2 - Entender qué hace hoy la aplicación (Priority: P1)

**Goal**: Características y guía de uso reflejan la realidad: añadir sentimiento/clustering, retirar votación 👍/👎 y proveedor Apple, corregir herramientas de exportación.

**Independent Test**: `quickstart.md` §A (sentiment/clustering/@react-pdf presentes; sin `jsPDF`), §E (sin 👍/👎 activa, sin Apple) sin fallos.

### Implementation for User Story 2

- [X] T009 [US2] Reescribir **Key Features** (§2) en `README.md`: auth **Google/GitHub** (eliminar Apple), colaboración/participantes en tiempo real, tarjetas (**likes + reacciones emoji**; retirar votación 👍/👎 activa; indicar `votes` **deprecado**), plantillas + colores, facilitador (countdown + notas), theming, i18n ES/EN (research R3/R4/R9; FR-005/FR-006).
- [X] T010 [US2] Añadir a Key Features/Usage en `README.md` el **análisis de sentimiento on-device + panel de estado de ánimo del equipo** (confirmado user-facing; los textos no salen del navegador). Añadir la **agrupación asistida (*clustering*)** **solo si T001 la verificó como user-facing**; si no lo es, omitirla o describirla explícitamente como experimental/no disponible — nunca como función disponible (research R3; FR-006; SC-007).
- [X] T011 [US2] Reescribir **Usage Guide** (§8) en `README.md`: crear/unirse, tarjetas (añadir, like, reaccionar, color, editar/eliminar propias), agrupar, facilitador (countdown, notas, sentimiento/team-mood), exportar; corregir la exportación a **`@react-pdf/renderer` + `docx`** y **eliminar `jsPDF`** (research R5; FR-005/FR-007).
- [X] T012 [US2] Verificar US2: `quickstart.md` §A (`sentiment` y `@react-pdf/renderer` presentes; `jsPDF` = 0; `clustering` presente **solo si** T001 lo verificó user-facing), §E (sin 👍/👎 activa, sin proveedor Apple, y ninguna capacidad no verificada presentada como disponible — FR-006/SC-002); confirmar 0 fallos.

**Checkpoint**: La descripción del producto es veraz y completa (incluye IA y clustering).

---

## Phase 5: User Story 3 - Estructura y tooling fieles (Priority: P2)

**Goal**: Arquitectura, stack, testing/CI y contribución reflejan el proyecto; se preserva (traducido) el contenido correcto de theming.

**Independent Test**: `quickstart.md` §C (rutas theming/features existen), §E (cada lib del stack ∈ `package.json`; árbol feature-first coincide con `ls src/**`) sin fallos.

### Implementation for User Story 3

- [X] T013 [US3] Reescribir **Tech Stack** (§3) en `README.md` a las dependencias reales (React 18/TS strict, Vite 4, Tailwind 3.3, framer-motion, lucide, Firebase 10, @dnd-kit, react-router 6, react-i18next 15, date-fns 4, `@react-pdf/renderer` 4, `docx` 9, `@huggingface/transformers` 3); eliminar `jsPDF` (research R5/R6; FR-005/FR-009).
- [X] T014 [US3] Reescribir **Project Architecture** (§4) en `README.md` al árbol *feature-first* bajo `retro-rocket/src` (`features/**`, `lib/**`, `pages/`, `i18n/`, `locales/`, `styles/`, `test/`), eliminando el árbol obsoleto `src/components|hooks|services` (research R2; FR-008; SC-004).
- [X] T015 [US3] Traducir a inglés y verificar **Theming & Accessibility (WCAG 2.1 AA)** (§5) en `README.md`, conservando las rutas verificadas (`retro-rocket/src/lib/theme/tokens.ts`, `retro-rocket/src/styles/globals.css`, `retro-rocket/tailwind.config.js`, `specs/009-wcag-theme-compliance/contracts/design-tokens.md`, `retro-rocket/src/test/lib/theme/`, `retro-rocket/e2e/accessibility.spec.ts`) (research R10; FR-012).
- [X] T016 [US3] Añadir **Testing, Quality & CI** (§9) en `README.md`: Vitest + cobertura, ESLint, type-check, **Playwright E2E (Firebase Emulator Suite)**, **CodeQL**, versionado semántico automático, despliegues Vercel *gated*; comandos `test`/`test:coverage`/`e2e`/`emulators`/`lint`/`type-check` (research R8; FR-009).
- [X] T017 [US3] Reescribir **Contributing** (§11) en `README.md`: estándares (TS strict, ESLint, Conventional Commits, TDD) y referencia a `specs/` y al *constitution* del proyecto (FR-009).
- [X] T018 [US3] Verificar US3: `quickstart.md` §C (rutas de theming y de features existen), §E (cada lib citada ∈ `retro-rocket/package.json`; la arquitectura coincide con `ls retro-rocket/src/**`); confirmar 0 fallos.

**Checkpoint**: Estructura, stack y controles de calidad documentados con exactitud; theming preservado en inglés.

---

## Phase 6: User Story 4 - Roadmap, enlaces y metadatos coherentes (Priority: P3)

**Goal**: El roadmap no lista nada ya entregado; sin enlaces muertos; metadatos correctos.

**Independent Test**: `quickstart.md` §A (`grep ](#)` → 0), §E (roadmap vs `.github/workflows/ci.yml`: 0 entregados como pendientes) sin fallos.

### Implementation for User Story 4

- [X] T019 [US4] Reescribir **Roadmap** (§12) en `README.md`: retirar lo ya entregado (CI/CD con GitHub Actions, tests automatizados/cobertura, WCAG/theming, bundle/lazy-loading si aplica); dejar solo pendientes reales (research R8; FR-010; SC-005).
- [X] T020 [US4] Corregir **License** y pie (§13) en `README.md`: mantener MIT (`LICENSE` presente), corregir el año de copyright, eliminar los enlaces *placeholder* Ver Demo/Documentación/Comunidad (`](#)`) o apuntarlos a destinos reales; conservar la URL de la app en vivo si es válida (research R9; FR-011; SC-006).
- [X] T021 [US4] Verificar US4: `quickstart.md` §A (`grep ](#)` → 0) y revisar el roadmap contra `.github/workflows/ci.yml` (0 ítems entregados como pendientes); confirmar 0 fallos.

**Checkpoint**: Roadmap, enlaces y metadatos coherentes con el estado actual.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Propiedades transversales de todo el documento.

- [X] T022 Barrido de **idioma inglés** en todo `README.md`: 0 prosa en español (`quickstart.md` §B), tono/estilo coherentes en todas las secciones (FR-014; SC-008).
- [X] T023 Auditoría final de **enlaces y rutas** de `README.md`: toda ruta citada existe (`quickstart.md` §C); ningún enlace resuelve a `](#)` (`quickstart.md` §A); y todo enlace externo conservado (p. ej. la URL de la app en vivo) se comprueba **alcanzable** (no roto) — si no se puede confirmar, se elimina o sustituye (FR-011).
- [X] T024 Ejecutar la validación completa de `quickstart.md` (§A–§F) de principio a fin y confirmar que pasan todos los criterios de aceptación (SC-001 … SC-008); opcionalmente validar los pasos de "Getting Started" en un entorno limpio.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; **bloquea todas las historias** (crea el esqueleto y el Overview).
- **US1 / US2 / US3 / US4 (Phases 3–6)**: dependen de Foundational. Como todas editan el **mismo** `README.md`, se ejecutan **en serie** (recomendado en orden de prioridad P1 → P1 → P2 → P3), no en paralelo.
- **Polish (Phase 7)**: depende de que todas las secciones deseadas estén completas.

### Within each story

- Cada historia primero **edita sus secciones**, luego ejecuta su **tarea de verificación** (que depende de las ediciones de esa historia).
- La tarea de verificación de una historia no debe ejecutarse hasta que sus ediciones estén completas.

### Parallel Opportunities

- **Solo el Setup admite paralelo**: T001 y T002 son independientes ([P]).
- Las tareas de contenido **no** son `[P]` entre sí (un único fichero `README.md`).
- Dentro de una tarea de verificación, las comprobaciones de solo lectura del `quickstart.md` (greps/`ls`) pueden lanzarse juntas.

---

## Implementation Strategy

### MVP (User Story 1)

1. Phase 1 Setup → Phase 2 Foundational → Phase 3 US1.
2. **STOP & VALIDATE**: seguir el "Getting Started" en un entorno limpio (quickstart §F) sin fallos.
3. Entrega: esto resuelve el mayor coste (bloqueo de arranque por instrucciones falsas).

### Incremental delivery

1. Setup + Foundational → esqueleto en inglés + Overview.
2. + US1 → puesta en marcha correcta (MVP).
3. + US2 → características y uso veraces (incluye IA/clustering; sin votación/Apple).
4. + US3 → estructura, stack y CI fieles; theming preservado.
5. + US4 → roadmap/enlaces/metadatos coherentes.
6. Polish → inglés al 100%, auditoría de enlaces/rutas, validación completa del quickstart.

---

## Notes

- [P] = distinto fichero, sin dependencias; aquí solo aplica al Setup (T001, T002).
- [Story] mapea la tarea a su historia para trazabilidad.
- Verificación = ejecutar el subconjunto correspondiente de `quickstart.md` (no hay tests de código).
- Fuente de verdad de solo lectura: `retro-rocket/**`, `.github/workflows/ci.yml`, `firestore.rules`.
- Commit tras cada tarea o grupo lógico; parar en cualquier checkpoint para validar la historia.
- Evitar presentar ejemplos ilustrativos (reglas Firestore) como estado real (FR-013).
