# Implementation Plan: README con backend hexagonal visible y enlace a la guía MCP

**Branch**: `016-readme-backend-mcp-docs` | **Date**: 2026-07-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/016-readme-backend-mcp-docs/spec.md`

## Summary

Editar el `README.md` de la raíz para cerrar dos gaps concretos y verificados
contra el estado real del repositorio: (1) el backend hexagonal ya existe y ya
se documenta, pero **solo** en la sección técnica `Backend & Services` (Tech
Stack) — no en la introducción ni en el resumen de características (`Key
Features`), donde alguien que no baja hasta Tech Stack no se entera; y (2) la
sección MCP del README (resumen + detalle) no enlaza a la guía de usuario
`docs/mcp-guia-usuario.md`, que ya existe pero hoy es indescubrible desde el
README. El trabajo es puramente de documentación: dos inserciones de texto
localizadas, sin tocar código ni el resto del contenido ya correcto.

## Technical Context

**Language/Version**: Markdown (GitHub-Flavored). Prosa de destino: **inglés**
(el README ya está íntegramente en inglés desde la feature 012; el nuevo texto
debe mantener ese idioma). El destino del nuevo enlace, `docs/mcp-guia-usuario.md`,
está en español (ver Assumptions del spec) — no se traduce como parte de esta
feature.

**Primary Dependencies**: Ninguna. Fuentes de verdad ya existentes en el repo:
`README.md` (secciones `Key Features` y `MCP Connector for AI Assistants`),
`README.md` sección `Backend & Services` (Tech Stack, ya correcta), y
`docs/mcp-guia-usuario.md` (guía ya creada, destino del enlace).

**Storage**: N/A — cambio de documentación, no persiste nada nuevo.

**Testing**: Verificación manual vía `quickstart.md` — comprobación por
lectura de que el backend hexagonal es visible antes de Tech Stack, y
comprobación con `grep`/apertura de fichero de que el enlace a la guía existe
y resuelve. No se añaden pruebas de aplicación (no hay código nuevo).

**Target Platform**: Repositorio GitHub (README renderizado en GitHub /
editores Markdown).

**Project Type**: Documentation change (edición localizada de un único
fichero, `README.md`).

**Performance Goals**: N/A.

**Constraints**:
- No duplicar de forma redundante el texto ya existente sobre el backend
  hexagonal (FR-002) ni el contenido ya existente sobre el conector MCP
  (Edge Cases del spec).
- El enlace añadido MUST resolver a un fichero real del repositorio (FR-004).
- El resto del README (ya corregido por la feature 012) MUST preservarse sin
  degradarse (FR-005).

**Scale/Scope**: Un fichero (`README.md`). Dos inserciones localizadas: una
frase en `Key Features` (backend hexagonal) y un enlace en la sección MCP
(resumen + detalle).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Este cambio es **exclusivamente de documentación** (Markdown en la raíz); no
crea ni modifica ninguna superficie de aplicación, componente de UI ni código.

| Principio | Aplicabilidad y cumplimiento |
|-----------|------------------------------|
| **I. TDD (NON-NEGOTIABLE)** | **N/A** — no hay código de producción que testear. |
| **II. Library-First** | **N/A** — no se añade capacidad de software. |
| **III. Terceros probados** | **N/A** — no se añaden dependencias. |
| **IV. SOLID** | **N/A** — sin código de dominio/servicios implicado. |
| **V. Simplicidad (KISS/YAGNI)** | **PASS** — dos inserciones de texto mínimas y localizadas, sin reestructurar secciones que ya son correctas. |
| **VI. Cobertura 80% (NON-NEGOTIABLE)** | **N/A** — no se toca `retro-rocket/src`; la cobertura no cambia. |
| **VII. E2E Playwright (NON-NEGOTIABLE)** | **N/A** — ningún flujo crítico de la app se altera. |
| **VIII. WCAG 2.1 AA (NON-NEGOTIABLE)** | **N/A** — el README no es una superficie de UI del producto. |
| **Strict types / i18n / a11y / error handling** | **N/A** — el README no es texto de interfaz gobernado por i18next; es documentación del repositorio. |
| **Real-Time Data Security** | **N/A** — esta feature no toca `firestore.rules` ni patrones de acceso a Firestore. |

**Resultado**: Sin violaciones. No se requiere *Complexity Tracking*.

## Project Structure

### Documentation (this feature)

```text
specs/016-readme-backend-mcp-docs/
├── plan.md              # Este fichero
├── research.md          # Phase 0 — verificación del estado actual del README + decisiones de redacción/ubicación
├── data-model.md        # Phase 1 — inventario de las secciones del README afectadas
├── quickstart.md        # Phase 1 — guía de verificación manual del resultado
├── contracts/
│   └── readme-sections-contract.md  # Phase 1 — contrato de contenido/anclas exactas a insertar
├── checklists/
│   └── requirements.md  # De /speckit-specify
└── tasks.md             # /speckit-tasks (NO creado aquí)
```

### Source Code (repository root)

Este cambio **no modifica código fuente**. El único entregable es `README.md`;
`docs/mcp-guia-usuario.md` es la fuente de verdad ya existente que el nuevo
enlace debe referenciar (no se edita):

```text
README.md                              # ← ÚNICO ENTREGABLE
├── ## ✨ Key Features                  # ← inserción 1: mención de backend hexagonal
│   └── ### 🔌 MCP Connector for AI Assistants  # ← inserción 2a: enlace a la guía (resumen)
├── ### Backend & Services              # ← ya correcto, no se toca (fuente de verdad del término)
└── ## 🔌 MCP Connector for AI Assistants        # ← inserción 2b: enlace a la guía (sección detallada)

docs/mcp-guia-usuario.md               # Fuente de verdad (solo lectura para esta feature) — destino del enlace
```

**Structure Decision**: El entregable es `README.md` en la raíz. No hay
subcarpetas de aplicación implicadas ni reestructuración de secciones; solo
inserciones puntuales en `Key Features` y en la sección MCP (resumen y
detalle), dejando `Backend & Services` y `docs/mcp-guia-usuario.md` como
fuentes de verdad sin modificar.

## Complexity Tracking

> Sin violaciones del Constitution Check — sección intencionadamente vacía.
