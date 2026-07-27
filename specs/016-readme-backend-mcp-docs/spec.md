# Feature Specification: README con backend hexagonal visible y enlace a la guía MCP

**Feature Branch**: `016-readme-backend-mcp-docs`

**Created**: 2026-07-27

**Status**: Draft

**Input**: User description: "Quiero actualizar el readme.md general para añadir que ya se dispone de un backend hexagonal y también añadir que tenemos un connector MCP con un link a la guia que acabamos de hacer"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver que RetroRocket ya tiene un backend propio (Priority: P1)

Una persona (evaluadora, contribuyente o usuaria técnica) lee el `README.md` de la
raíz y, sin tener que abrir el código, entiende que RetroRocket ya no es solo una
SPA contra Firestore: dispone de un **backend propio con arquitectura hexagonal**
que orquesta autenticación, sesión y el conector MCP.

**Why this priority**: es la afirmación de arquitectura más relevante que falta
resaltar; sin ella, alguien que solo lee el resumen del proyecto (no la sección
técnica de Tech Stack) puede seguir asumiendo que RetroRocket es "solo frontend +
Firestore", lo cual ya no es cierto desde la feature 014.

**Independent Test**: se puede validar leyendo únicamente la introducción y el
resumen de características del README (sin bajar a Tech Stack) y comprobando que
queda claro, sin ambigüedad, que existe un backend hexagonal propio.

**Acceptance Scenarios**:

1. **Given** el README actual, **When** una persona lee la introducción y el
   resumen de características, **Then** encuentra una mención explícita a que
   RetroRocket dispone de un backend propio con **arquitectura hexagonal**.
2. **Given** la sección técnica existente que ya menciona el backend hexagonal
   (Tech Stack), **When** se añade la mención más visible del punto anterior,
   **Then** ambas menciones son consistentes entre sí (mismo nombre de
   arquitectura, sin contradicciones) y ninguna de las dos queda duplicada de
   forma redundante o confusa.

---

### User Story 2 - Encontrar la guía de conexión del conector MCP desde el README (Priority: P1)

Un usuario que lee la sección "MCP Connector for AI Assistants" del README quiere
conectar su propio asistente de IA (p. ej. Claude), pero esa sección solo resume
el flujo técnico (OAuth, herramientas disponibles). Necesita un enlace directo a
la guía de usuario paso a paso ya existente en el repositorio
(`docs/mcp-guia-usuario.md`) para completar la conexión sin tener que
adivinar rutas ni buscar en `docs/`.

**Why this priority**: es el gap concreto y verificable que motiva esta feature:
la guía ya existe pero hoy no está enlazada desde ningún sitio visible del
README, por lo que un usuario que solo lee el README no sabe que existe.

**Independent Test**: se puede validar de forma aislada abriendo la sección MCP
del README, localizando el enlace a la guía, y confirmando que ese enlace
apunta a un fichero que existe realmente en el repositorio.

**Acceptance Scenarios**:

1. **Given** la sección "MCP Connector for AI Assistants" del README (tanto el
   resumen en Key Features como la sección detallada), **When** una persona la
   lee, **Then** encuentra un enlace explícito a la guía de usuario paso a paso
   del conector MCP.
2. **Given** el enlace añadido, **When** se resuelve como ruta relativa desde la
   raíz del repositorio, **Then** apunta a un fichero que existe (no es un
   marcador de posición ni una ruta rota).

---

### Edge Cases

- El README ya menciona el backend hexagonal en la sección **Tech Stack**
  (`Backend & Services`): la nueva mención en la introducción/resumen de
  características no debe repetir el mismo texto palabra por palabra ni
  contradecirlo, sino complementarlo (visibilidad temprana + detalle técnico
  donde ya estaba).
- El README ya tiene una sección completa de MCP (resumen en Key Features +
  sección detallada "How to connect" / "Managing and revoking access" /
  "Privacy" / "Read-only, by design"): el nuevo enlace a la guía debe añadirse
  sin duplicar contenido que esa sección ya explica, dejando claro que la guía
  es el complemento paso a paso para el usuario final.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El `README.md` de la raíz MUST mencionar explícitamente, en la
  introducción o en el resumen de características (no solo en la sección
  técnica de Tech Stack), que RetroRocket dispone de un backend propio con
  **arquitectura hexagonal**.
- **FR-002**: La mención añadida en FR-001 MUST ser coherente con la mención ya
  existente en la sección `Backend & Services` (mismo término de arquitectura,
  sin contradicciones), y MUST NOT duplicar ese mismo texto de forma redundante.
- **FR-003**: El `README.md` MUST incluir un enlace explícito a la guía de
  usuario del conector MCP (`docs/mcp-guia-usuario.md`) desde la sección
  existente sobre el conector MCP (tanto en el resumen de Key Features como en
  la sección detallada "MCP Connector for AI Assistants").
- **FR-004**: El enlace añadido en FR-003 MUST resolver a un fichero que existe
  realmente en el repositorio en el momento de la actualización.
- **FR-005**: El resto del contenido ya correcto del README (Key Features,
  Tech Stack, arquitectura, guía de uso, testing, deployment, roadmap, enlaces)
  MUST preservarse sin degradarse al realizar estos dos cambios.

### Key Entities *(include if feature involves data)*

- **README (raíz)**: documento de entrada del repositorio; objeto de esta
  feature. Secciones afectadas: introducción/resumen de características (Key
  Features) y sección "MCP Connector for AI Assistants".
- **Guía de usuario MCP** (`docs/mcp-guia-usuario.md`): documento ya existente
  con las instrucciones paso a paso para conectar y revocar un asistente de IA
  vía MCP; es el destino del enlace que esta feature añade.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona que lee únicamente la introducción y el resumen de
  características del README (sin bajar a Tech Stack) identifica correctamente,
  en el 100% de los casos, que RetroRocket tiene un backend propio con
  arquitectura hexagonal.
- **SC-002**: El 100% de los enlaces nuevos añadidos por esta feature resuelven
  a un destino real dentro del repositorio (0 enlaces rotos o de marcador de
  posición).
- **SC-003**: Una persona que lee la sección MCP del README puede llegar a la
  guía de conexión paso a paso sin salir del documento ni buscar manualmente en
  la carpeta `docs/`.
- **SC-004**: 0 secciones del README que ya eran correctas antes de esta
  feature quedan degradadas, eliminadas o contradichas tras el cambio.

## Assumptions

- El README objetivo es el de la raíz del repositorio (`README.md`), el mismo
  ya corregido íntegramente en inglés por la feature 012; esta feature preserva
  ese idioma para el contenido nuevo.
- La guía enlazada es la ya existente en `docs/mcp-guia-usuario.md` (creada como
  parte del trabajo de la feature 015); esta feature no crea ni modifica el
  contenido de la guía, solo añade el enlace desde el README.
- El backend hexagonal ya mencionado en `Backend & Services` (Tech Stack) es la
  fuente de verdad sobre su nombre/naturaleza; esta feature no cambia esa
  descripción técnica, solo añade visibilidad adicional en un lugar más
  temprano del documento.
- No se requiere traducir ni duplicar la guía MCP a inglés para esta feature: el
  README (en inglés) puede enlazar a un documento en español, igual que ya
  enlaza a otros ficheros de `specs/` que no están traducidos.
