# Implementation Plan: README alineado al estado actual de la aplicación

**Branch**: `012-readme-accuracy-update` | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-readme-accuracy-update/spec.md`

## Summary

Reescribir el `README.md` de la raíz del repositorio para que sea **veraz,
completo y coherente** respecto al estado actual de la aplicación, y dejarlo
**íntegramente en inglés** (clarificación de sesión 2026-07-23). El trabajo es de
**documentación**: no toca código de la aplicación. El enfoque es una auditoría
sección-a-sección contra la fuente de verdad del repositorio (código bajo
`retro-rocket/`, `package.json`/scripts, `.env.example`, `.github/workflows/ci.yml`,
`firestore.rules` y funcionalidades observables), corrigiendo lo cambiado,
eliminando lo inexistente/obsoleto, añadiendo capacidades hoy omitidas (análisis de
sentimiento/estado de ánimo y *clustering*), y preservando —traducido— el contenido
que ya es correcto (p. ej. la sección de theming/WCAG). Ver el inventario de
desvíos y decisiones por sección en [research.md](./research.md).

## Technical Context

**Language/Version**: Markdown (GitHub-Flavored). Prosa de destino: **inglés**. Sin
código de aplicación implicado.

**Primary Dependencies**: Ninguna nueva. La fuente de verdad son artefactos ya
presentes en el repo: `retro-rocket/` (código React 18 + TypeScript + Vite 4),
`retro-rocket/package.json` (scripts reales), `retro-rocket/.env.example`,
`.github/workflows/ci.yml`, `retro-rocket/firestore.rules`.

**Storage**: N/A (cambio de documentación; no se persiste nada nuevo).

**Testing**: Verificación manual mediante `quickstart.md` — comprobaciones
automatizables con `grep` (tokens obsoletos, links placeholder, ausencia de español),
existencia de rutas citadas, y seguimiento de los pasos de instalación en un entorno
limpio. No se añaden pruebas unitarias/E2E de aplicación (no hay código nuevo).

**Target Platform**: Repositorio GitHub (README renderizado en GitHub / editores).

**Project Type**: Documentation change (single-file deliverable en la raíz).

**Performance Goals**: N/A.

**Constraints**:
- README **100% en inglés** (SC-008); 0 tokens obsoletos (`REACT_APP_*`, `jsPDF`,
  árbol `src/components|hooks|services`), 0 enlaces *placeholder* (`(#)`).
- No presentar ejemplos ilustrativos (reglas Firestore, variables) como el estado
  real: deben alinearse con la fuente de verdad o marcarse como ejemplo (FR-013;
  cumple "Real-Time Data Security" del constitution al no publicar reglas más
  débiles que las reales).

**Scale/Scope**: Un fichero (`README.md`, ~540 líneas hoy). ~13 secciones a auditar;
2 capacidades a añadir; ~8 correcciones fácticas concretas (ver research.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Este cambio es **exclusivamente de documentación** (Markdown en la raíz); no crea ni
modifica ninguna superficie de aplicación ni código.

| Principio | Aplicabilidad y cumplimiento |
|-----------|------------------------------|
| **I. TDD (NON-NEGOTIABLE)** | **N/A** — no hay código de producción; nada que testear con red-green-refactor. |
| **II. Library-First** | **N/A** — no se añade capacidad de software. |
| **III. Terceros probados** | **N/A** — no se añaden dependencias. |
| **IV. SOLID** | **N/A** — sin código de dominio/servicios. |
| **V. Simplicidad (KISS/YAGNI)** | **PASS** — el alcance se limita a alinear el README con la realidad; sin secciones especulativas ni contenido "aspiracional" presentado como real. |
| **VI. Cobertura 80% (NON-NEGOTIABLE)** | **N/A** — no hay código; la cobertura no cambia (no se toca `retro-rocket/src`). |
| **VII. E2E Playwright (NON-NEGOTIABLE)** | **N/A** — no se altera ningún flujo crítico de la app. |
| **VIII. WCAG 2.1 AA (NON-NEGOTIABLE)** | **N/A** — no hay superficie de UI de la aplicación; el README es documentación del repo, no una pantalla del producto. |
| **Strict types / i18n / a11y / error handling** | **i18n: no aplica al README** — el principio gobierna texto de UI vía i18next; el README es documentación del proyecto, no cadena de interfaz, y la clarificación fija su idioma en inglés. |
| **Real-Time Data Security** | **PASS (relevante)** — el README incluye un ejemplo de reglas Firestore que hoy no coincide con `firestore.rules`; se alineará con la fuente de verdad o se marcará explícitamente como ilustrativo, sin publicar reglas más permisivas que las reales. |

**Resultado**: Sin violaciones. No se requiere *Complexity Tracking*.

## Project Structure

### Documentation (this feature)

```text
specs/012-readme-accuracy-update/
├── plan.md              # Este fichero
├── research.md          # Phase 0 — auditoría: fuente de verdad + decisiones por sección
├── data-model.md        # Phase 1 — arquitectura de información destino del README (inventario de secciones)
├── quickstart.md        # Phase 1 — guía de verificación del README corregido
├── contracts/
│   └── readme-accuracy-contract.md  # Phase 1 — contrato de exactitud + outline canónico destino
├── checklists/
│   └── requirements.md  # De /speckit-specify (+ clarify)
└── tasks.md             # /speckit-tasks (NO creado aquí)
```

### Source Code (repository root)

Este cambio **no modifica código fuente**. El único artefacto entregable es el
README de la raíz; el árbol de aplicación es la **fuente de verdad** que la
documentación debe reflejar (no se edita):

```text
README.md                              # ← ÚNICO ENTREGABLE (reescrito, en inglés)

retro-rocket/                          # Fuente de verdad (solo lectura para esta feature)
├── package.json                       # scripts reales (dev/build/preview/test/test:coverage/e2e/emulators/lint/type-check)
├── .env.example                       # variables reales: VITE_FIREBASE_*, VITE_USE_FIREBASE_EMULATOR
├── firestore.rules                    # reglas reales (auth no-anónima; colecciones top-level)
└── src/
    ├── features/                      # arquitectura feature-first (reemplaza el árbol obsoleto del README)
    │   ├── auth/  create-board/  dashboard/  dev-tools/
    │   └── boards/{retrospective,countdown,facilitator,export,participants,
    │              sentiment,clustering,types}
    ├── lib/{components,contexts,hooks,services,theme,utils}
    ├── pages/  i18n/  locales/{es,en}.json  styles/  test/

.github/workflows/ci.yml               # jobs reales: CodeQL, checks (type-check/lint/coverage),
                                       # Playwright E2E (emulador), deploy preview/prod, semver, preview domains
```

**Structure Decision**: El entregable es **`README.md` en la raíz del repositorio**.
La aplicación vive en la subcarpeta `retro-rocket/` con organización *feature-first*
(`src/features/**`, `src/lib/**`), que es la estructura que el README debe describir
—sustituyendo el árbol `src/components|hooks|services` hoy documentado, inexistente.
No hay cambios en el árbol de código; la única escritura es el README.

## Complexity Tracking

> Sin violaciones del Constitution Check — sección intencionadamente vacía.
