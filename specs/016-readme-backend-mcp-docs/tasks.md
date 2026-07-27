---
description: "Task list for feature implementation"
---

# Tasks: README con backend hexagonal visible y enlace a la guía MCP

**Input**: Design documents from `/specs/016-readme-backend-mcp-docs/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/readme-sections-contract.md, quickstart.md

**Tests**: No aplican pruebas unitarias/E2E — es una feature de **documentación**
sin código de aplicación (Constitution Check: todos los principios N/A). La
verificación se hace con `quickstart.md` (greps + `diff`). Las tareas de
verificación por historia sustituyen a los tests.

**Organization**: Tareas agrupadas por las 2 historias de usuario del spec
(ambas P1). Cada historia toca **anclas independientes** dentro del mismo
fichero y es verificable por separado con el subconjunto correspondiente del
`quickstart.md`.

## ⚠️ Restricción de fichero único

El **único entregable** es `README.md` en la **raíz del repositorio**. Todas
las tareas de contenido editan ese mismo fichero, por lo que son
**secuenciales** (sin `[P]` entre ellas). `docs/mcp-guia-usuario.md` y la
sección `Backend & Services` de `README.md` son **fuente de verdad de solo
lectura** (no se editan).

## Path Conventions

- Entregable: `README.md` (raíz del repo).
- Fuente de verdad (solo lectura): `docs/mcp-guia-usuario.md`, sección
  `### Backend & Services` de `README.md` (línea ~96).
- Referencias de diseño: `specs/016-readme-backend-mcp-docs/{research,data-model,quickstart}.md`,
  `contracts/readme-sections-contract.md`.

---

## Phase 1: Setup

**Purpose**: Confirmar que los prerrequisitos del contrato se cumplen antes de editar.

- [X] T001 Verificar que `docs/mcp-guia-usuario.md` existe en el repositorio (`test -f docs/mcp-guia-usuario.md`), condición previa de los Contratos 2 y 3 (`contracts/readme-sections-contract.md`; FR-004).

**Nota**: no se genera una fase Foundational dedicada — no hay andamiaje
compartido que construir antes de las historias: cada una inserta contenido en
un ancla ya existente e independiente de `README.md` (bloque nuevo en `Key
Features` vs. enlaces en la sección MCP), sin depender la una de la otra.

---

## Phase 2: User Story 1 - Ver que RetroRocket ya tiene un backend hexagonal (Priority: P1) 🎯 MVP

**Goal**: Quien lee solo la introducción/`Key Features` del README (sin bajar
a Tech Stack) identifica que RetroRocket tiene un backend propio con
arquitectura hexagonal.

**Independent Test**: `quickstart.md` §2 (mención de "hexagonal" dentro del
rango `Key Features`) y §3 (la mención ya existente en `Backend & Services`
se conserva) sin fallos.

### Implementation for User Story 1

- [X] T002 [US1] Insertar en `README.md` el bloque nuevo `### 🏗️ Backend Architecture` dentro de `## ✨ Key Features`, inmediatamente después de `### 🔌 MCP Connector for AI Assistants` y antes de `### 🎨 Experience`, cumpliendo el Contrato 1 de `contracts/readme-sections-contract.md` (término "hexagonal", resumen de auth/sesión y `/api/*`, sin repetir literalmente el texto de `Backend & Services`; FR-001/FR-002).
- [X] T003 [US1] Verificar US1: ejecutar `quickstart.md` §2 (`awk`/`grep "hexagonal"` dentro del rango `Key Features` → ≥1 resultado) y §3 (`grep -n "Hexagonal backend"` → sigue apareciendo la línea de `Backend & Services`, sin duplicado idéntico); confirmar 0 fallos.

**Checkpoint**: El backend hexagonal es visible sin bajar a Tech Stack — MVP demostrable.

---

## Phase 3: User Story 2 - Encontrar la guía de conexión del conector MCP desde el README (Priority: P1)

**Goal**: Quien lee la sección MCP del README (resumen o detalle) encuentra un
enlace directo a la guía de usuario paso a paso.

**Independent Test**: `quickstart.md` §1 (guía existe) y §4 (2 coincidencias
de `mcp-guia-usuario.md` en `README.md`, una en cada sección) sin fallos.

### Implementation for User Story 2

- [X] T004 [US2] Añadir en `README.md`, al final de `### 🔌 MCP Connector for AI Assistants` (resumen en `Key Features`, tras la línea que hoy cierra en "See [MCP Connector] below."), un enlace relativo a `docs/mcp-guia-usuario.md` junto al enlace ancla ya existente, cumpliendo el Contrato 2 de `contracts/readme-sections-contract.md` (FR-003/FR-004).
- [X] T005 [US2] Añadir en `README.md`, al final de la subsección "How to connect" dentro de `## 🔌 MCP Connector for AI Assistants` (sección detallada, tras la lista de las tres herramientas), un enlace relativo a `docs/mcp-guia-usuario.md` como complemento (no sustituto) de los pasos ya listados, cumpliendo el Contrato 3 de `contracts/readme-sections-contract.md` (FR-003/FR-004).
- [X] T006 [US2] Verificar US2: ejecutar `quickstart.md` §1 (`test -f docs/mcp-guia-usuario.md`) y §4 (`grep -n "mcp-guia-usuario.md" README.md` → exactamente 2 coincidencias); confirmar 0 fallos.

**Checkpoint**: La guía de conexión es descubrible desde ambos puntos de la sección MCP del README.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Confirmar que el resto del documento no se degrada y que el conjunto cumple los criterios de éxito del spec.

- [X] T007 Ejecutar `quickstart.md` §5 (`diff <(git show HEAD:README.md) README.md`) y confirmar que el diff **solo** contiene las líneas añadidas por T002/T004/T005 — ninguna línea preexistente se elimina o modifica (FR-005; invariante de `data-model.md`).
- [X] T008 Ejecutar la validación completa de `quickstart.md` (§1–§6) de principio a fin y confirmar que se cumplen SC-001…SC-004 del spec; revisión visual opcional del renderizado Markdown (§6).

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: sin dependencias.
- **US1 (Phase 2)** y **US2 (Phase 3)**: ambas dependen solo de Setup (T001). No dependen entre sí (anclas independientes de `README.md`), pero como comparten el mismo fichero se ejecutan **en serie** (recomendado US1 → US2, mismo orden que en el spec).
- **Polish (Phase 4)**: depende de que US1 y US2 estén completas.

### Within each story

- Cada historia primero **inserta su contenido**, luego ejecuta su **tarea de verificación** (que depende de la inserción de esa misma historia).

### Parallel Opportunities

- Ninguna tarea de contenido es `[P]` entre sí (único fichero `README.md`).
- T002 (US1) y T004/T005 (US2) tocan regiones distintas del mismo fichero pero **no** se marcan `[P]` por la restricción de fichero único; ejecutarlas en serie evita conflictos de merge/edición.

---

## Implementation Strategy

### MVP (User Story 1)

1. Phase 1 Setup → Phase 2 US1.
2. **STOP & VALIDATE**: `quickstart.md` §2–§3 sin fallos.
3. Entrega: cierra el gap de mayor visibilidad (arquitectura del producto).

### Incremental delivery

1. Setup → prerrequisito verificado.
2. + US1 → backend hexagonal visible en `Key Features` (MVP).
3. + US2 → guía MCP enlazada desde ambos puntos de la sección MCP.
4. Polish → diff limpio + validación completa del quickstart.

---

## Notes

- No hay tareas `[P]`: único fichero `README.md` editado por todas las tareas de contenido.
- `[Story]` mapea la tarea a su historia para trazabilidad.
- Verificación = ejecutar el subconjunto correspondiente de `quickstart.md` (no hay tests de código; Constitution TDD = N/A para esta feature de documentación).
- Fuente de verdad de solo lectura: `docs/mcp-guia-usuario.md`, sección `Backend & Services` de `README.md`.
- Commit tras cada tarea o grupo lógico; parar en cualquier checkpoint para validar la historia.
