# Phase 0 Research: README con backend hexagonal visible y enlace a la guía MCP

No hay `[NEEDS CLARIFICATION]` pendientes en el spec ni en el Technical
Context del plan: el alcance (qué README, qué backend, qué guía) ya estaba
fijado por trabajo previo de esta misma sesión (features 012, 014, 015). Esta
sección documenta la verificación del estado real y las decisiones de
redacción/ubicación tomadas para minimizar el riesgo de duplicar contenido ya
correcto.

## R1 — ¿Dónde se menciona hoy el backend hexagonal en el README?

**Hallazgo**: `README.md:96` (sección `### Backend & Services`, dentro de
`## 🛠️ Tech Stack`):

> **Hexagonal backend** (TypeScript + **Express 5**) served same-origin under
> `/api/*` as Vercel serverless functions — see
> [`retro-rocket/server/README.md`](retro-rocket/server/README.md). ...

**Decisión**: esta mención es correcta y se conserva sin cambios (es la
fuente de verdad del término "hexagonal backend"). La sección `Key Features`
(líneas 10-84) **no** menciona el backend en ningún punto — ni como
característica propia ni de pasada. Se añade una única frase nueva en `Key
Features`, sin repetir la explicación técnica (Express 5, `/api/*`, Vercel
serverless) que ya vive en Tech Stack.

**Alternativas consideradas**: (a) mover la explicación completa de Tech
Stack a Key Features — rechazada, duplicaría contenido y Key Features es
resumen orientado a usuario/producto, no a stack técnico; (b) añadirlo solo en
la introducción (párrafo 1) — rechazada frente a añadirlo como bullet de Key
Features, porque Key Features es donde ya viven el resto de bloques
temáticos (Auth, Real-Time, MCP, etc.) y mantiene el documento consistente.

## R2 — ¿Dónde debe ir la mención en `Key Features` sin invadir otro bloque?

**Decisión**: añadir un bloque nuevo y breve `### 🏗️ Backend Architecture` (o
una frase dentro de un bloque existente afín). Se opta por un **bloque nuevo
corto** en `Key Features`, justo antes de `### 🎨 Experience` (después de
`### 🔌 MCP Connector for AI Assistants`, línea 74), porque:
- Todos los demás bloques de `Key Features` son temáticos con su propio
  emoji-heading (Auth, Real-Time, Cards, Grouping, Facilitator, AI Sentiment,
  Export, MCP, Experience, Persistence) — insertar la frase suelta dentro de
  otro bloque (p. ej. Persistence) mezclaría temas dispares.
- Un bloque de 1-2 bullets es proporcional al tamaño del gap (no se necesita
  una sección extensa; el detalle ya vive en Tech Stack).

**Alternativas consideradas**: insertarlo dentro de `### 💾 Persistence &
Resilience` (ambos hablan de la capa de datos/servidor) — rechazada porque
Persistence habla específicamente de Firestore/estados de carga, no de la
arquitectura del backend; mezclarlos sería confuso.

## R3 — ¿Dónde enlazar la guía MCP sin duplicar la sección MCP ya existente?

**Hallazgo**: la sección MCP ya tiene dos apariciones:
- Resumen en `Key Features`: `README.md:61-73` (`### 🔌 MCP Connector for AI
  Assistants`), termina con un enlace ancla interno ya existente a la sección
  detallada (`README.md:73`: `See [MCP Connector](#-mcp-connector-for-ai-assistants-1) below.`).
- Sección detallada: `README.md:247-284` (`## 🔌 MCP Connector for AI
  Assistants`), con subsecciones "How to connect", "Managing and revoking
  access", "Privacy: facilitator notes", "Read-only, by design".

**Decisión**: añadir el enlace a `docs/mcp-guia-usuario.md` en **dos puntos**:
1. Al final del resumen en `Key Features` (línea 73), junto al enlace ancla
   ya existente, para que quien solo lee el resumen ya vea la guía.
2. Al final de la sección detallada "How to connect" (tras línea 264), como
   enlace explícito a la guía paso a paso, ya que es el punto donde el
   usuario termina de leer cómo conectar y necesita el siguiente paso
   accionable.

No se inserta en "Managing and revoking access" ni en las demás subsecciones
para no duplicar el mismo enlace más de dos veces (ver Constraints del plan:
no duplicar contenido de forma redundante).

**Alternativas consideradas**: un único enlace solo en la sección detallada —
rechazada porque el resumen de Key Features ya contiene una frase de cierre
("See [MCP Connector] below") que es el lugar natural donde añadir también la
guía sin coste adicional de lectura.

## R4 — ¿El enlace debe ser relativo o con ruta desde la raíz?

**Decisión**: enlace Markdown relativo `docs/mcp-guia-usuario.md`, igual que
el patrón ya usado por el propio README para otros ficheros del repo (p. ej.
`retro-rocket/server/README.md` en línea 97, `LICENSE` en línea 387). Se
verifica su existencia con `test -f docs/mcp-guia-usuario.md` antes de darlo
por válido (FR-004 / SC-002).

**Alternativas consideradas**: URL absoluta a GitHub (`https://github.com/.../docs/mcp-guia-usuario.md`)
— rechazada porque el README no usa URLs absolutas de GitHub para
referenciar ficheros propios en ningún otro punto; sería inconsistente con el
estilo ya establecido.
