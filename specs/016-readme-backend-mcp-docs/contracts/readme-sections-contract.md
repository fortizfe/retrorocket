# Contract: contenido y anclas exactas a insertar en README.md

Este contrato fija el contenido mínimo exigible de las dos inserciones, para
que `/speckit-tasks` y la implementación tengan un objetivo verificable sin
ambigüedad de redacción exacta (la redacción final puede variar en estilo,
pero MUST cumplir cada cláusula).

## Contrato 1 — Visibilidad del backend hexagonal en Key Features

**Ubicación de inserción**: dentro de `## ✨ Key Features`, como bloque nuevo
inmediatamente después de `### 🔌 MCP Connector for AI Assistants` (línea 74
actual) y antes de `### 🎨 Experience`.

**MUST incluir**:
- Un encabezado de bloque con emoji, coherente con el estilo del resto de
  `Key Features` (p. ej. `### 🏗️ Backend Architecture`).
- El término exacto **"hexagonal"** aplicado al backend (para que sea
  coherente/buscable junto con la mención ya existente en `Backend &
  Services`, README.md:96).
- Una referencia a que el backend orquesta autenticación/sesión y sirve
  same-origin bajo `/api/*` (resumen, no la explicación técnica completa que
  ya vive en Tech Stack).

**MUST NOT**:
- Repetir literalmente la frase completa de `Backend & Services` (evitar
  duplicado redundante, FR-002).
- Introducir un nombre de arquitectura distinto o contradictorio (p. ej. no
  decir "microservicios" ni "monolito clásico").

## Contrato 2 — Enlace a la guía MCP en el resumen (Key Features)

**Ubicación de inserción**: al final de `### 🔌 MCP Connector for AI
Assistants` (tras la línea que hoy termina en `README.md:73`, junto al enlace
ancla ya existente a la sección detallada).

**MUST incluir**:
- Un enlace Markdown relativo a `docs/mcp-guia-usuario.md`.
- Texto de enlace que deje claro que es la guía paso a paso para el usuario
  final (p. ej. "step-by-step user guide").

**MUST NOT**:
- Sustituir o eliminar el enlace ancla ya existente a la sección detallada
  (`#-mcp-connector-for-ai-assistants-1`).

## Contrato 3 — Enlace a la guía MCP en la sección detallada

**Ubicación de inserción**: al final de la subsección "How to connect" dentro
de `## 🔌 MCP Connector for AI Assistants` (tras la lista de las tres
herramientas, README.md:260-264).

**MUST incluir**:
- Un enlace Markdown relativo a `docs/mcp-guia-usuario.md`.

**MUST NOT**:
- Repetir los pasos ya enumerados en "How to connect" (1-3); el enlace debe
  presentarse como complemento ("para instrucciones detalladas paso a paso,
  incluyendo cómo revocar el acceso, ver la guía"), no como sustituto.

## Verificación (aplica a los tres contratos)

- El fichero `docs/mcp-guia-usuario.md` MUST existir en el repositorio en el
  momento de aplicar la inserción (verificable con `test -f
  docs/mcp-guia-usuario.md`).
- Tras la edición, el README MUST seguir siendo Markdown válido (sin romper
  ninguna lista, tabla o bloque de código circundante).
- Ninguna de las secciones listadas como "Conservar sin cambios" en
  `data-model.md` MUST verse alterada en contenido u orden.
