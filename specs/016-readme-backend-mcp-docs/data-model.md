# Phase 1 Data Model: README con backend hexagonal visible y enlace a la guía MCP

No hay entidades de datos de aplicación implicadas (feature de documentación
pura). Este documento inventaría, en su lugar, las **secciones del README**
afectadas o referenciadas, sus relaciones y su estado (modificar / conservar).

## Secciones y su estado

| Sección (README.md) | Líneas actuales | Estado en esta feature |
|---|---|---|
| Introducción (párrafo inicial) | 1-8 | Conservar sin cambios |
| `## ✨ Key Features` (contenedor) | 10-84 | Modificar — se añade 1 bloque nuevo |
| `### 🔌 MCP Connector for AI Assistants` (resumen) | 61-73 | Modificar — se añade 1 enlace al final |
| `### 🎨 Experience` | 75-79 | Conservar sin cambios (el bloque nuevo se inserta antes de este) |
| `## 🛠️ Tech Stack` → `### Backend & Services` | 95-99 | Conservar sin cambios — **fuente de verdad** del término "hexagonal backend" |
| `## 🔌 MCP Connector for AI Assistants` (detallada) | 247-284 | Modificar — se añade 1 enlace en "How to connect" |
| Resto de secciones (Architecture, Theming, Getting Started, Firestore Rules, Usage Guide, Testing/CI, Deployment, Contributing, Roadmap, License) | — | Conservar sin cambios |

## Relaciones

```text
Key Features (resumen)
├── ### 🏗️ Backend Architecture  [NUEVO bloque]
│     └── referencia informalmente → Backend & Services (Tech Stack)
│         (mismo término "hexagonal backend"; sin duplicar el detalle técnico)
└── ### 🔌 MCP Connector for AI Assistants (resumen)
      └── enlace nuevo → docs/mcp-guia-usuario.md
      └── enlace ya existente → #-mcp-connector-for-ai-assistants-1 (ancla interna)

Tech Stack
└── ### Backend & Services  [SIN CAMBIOS — fuente de verdad]

MCP Connector for AI Assistants (detallada)
└── "How to connect"
      └── enlace nuevo → docs/mcp-guia-usuario.md

docs/mcp-guia-usuario.md  [SIN CAMBIOS — destino de ambos enlaces nuevos]
```

## Validación de estado (no transición, es documentación estática)

No aplica un modelo de estados/transiciones (no hay entidad con ciclo de
vida). La única invariante a preservar tras la edición:

- **Invariante**: cada sección marcada "Conservar sin cambios" en la tabla
  anterior debe seguir presente, en el mismo orden relativo, con el mismo
  contenido, tras aplicar las dos inserciones (ver FR-005 / SC-004 del spec).
