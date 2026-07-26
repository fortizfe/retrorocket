# MCP para RetroRocket — Historias de usuario y prompts de Speckit

**Rol**: Product Owner (borrador de trabajo, no es un spec oficial de Speckit)

**Creado**: 2026-07-23

**Contexto de la investigación**: RetroRocket es hoy una SPA (React + Firestore vía SDK
cliente) sin backend propio. Exponer datos vía MCP requiere añadir un servicio HTTP
nuevo (recomendado: función serverless Node.js en Vercel, ya usado como hosting, con
`mcp-handler` + `@modelcontextprotocol/sdk`, sin coste ni tarjeta de crédito). La
autorización en MCP es opcional según la especificación, pero como se ha decidido que
**cualquier usuario de RetroRocket** debe poder conectar su propia cuenta, hace falta
un flujo OAuth 2.1 (PKCE) que delegue en Firebase Authentication como proveedor de
identidad — existen patrones/librerías OSS gratuitas para este puente (p. ej.
middlewares tipo `mcp-oauth-firebase`), por lo que sigue siendo viable sin herramientas
de pago.

**Decisiones ya tomadas contigo (2026-07-23)**:

- **Alcance de usuarios**: cualquier usuario de RetroRocket (no solo uso personal) →
  requiere OAuth 2.1 real, no un token estático.
- **Capacidades de esta primera versión**: **solo lectura** (generar informes). Crear o
  editar action items vía IA queda fuera de esta iteración.
- **Destino de "generar tareas"**: cuando se aborde (fase futura, no en esta iteración),
  las tareas se crearán en **Jira** (Jira Cloud Free permite acceso a su REST API,
  aunque con límites de tasa más estrictos que los planes de pago).

**Recomendación de scoping**: dado que la Constitución del proyecto exige simplicidad
(YAGNI) e historias independientemente entregables, propongo trabajar esto como **dos
features de Speckit separadas**: la Feature A (lectura/informes) de abajo es la que
debería ejecutarse ahora; la Feature B (Jira) queda documentada como idea de backlog
para un ciclo posterior, una vez la primera esté validada en producción.

---

## Feature A (MVP) — Informes de retrospectiva vía MCP

### Prompt para `/speckit.specify`

Copia y pega esto como argumento del comando (ajusta el texto libremente, es tuyo):

```text
Quiero que RetroRocket exponga un servidor MCP remoto de solo lectura para que
clientes de IA (como Claude) puedan generar informes de mis retrospectivas.
Cualquier usuario de RetroRocket debe poder conectar su propio cliente de IA
autenticándose con su cuenta existente de RetroRocket (Google/GitHub vía Firebase
Auth), y debe poder revocar ese acceso en cualquier momento. A través del conector,
el modelo de IA debe poder: listar las retrospectivas del usuario, consultar el
detalle de una retrospectiva concreta (tarjetas, agrupaciones, likes/reacciones,
participantes, resultados de sentimiento y action items) y obtener un resumen
estructurado apto para redactar un informe. Las notas del facilitador son privadas
y solo deben incluirse cuando quien pregunta es el propio facilitador de esa
retrospectiva, igual que ya ocurre en la exportación a PDF/DOCX. Esta primera
versión es exclusivamente de lectura: no debe crear, editar ni borrar nada en
Firestore.
```

### Historias de usuario

#### Historia 1 — Conectar mi cuenta de RetroRocket a mi cliente de IA (Priority: P1)

Como usuario de RetroRocket, quiero añadir RetroRocket como conector MCP en mi
cliente de IA (p. ej. Claude) autenticándome con la misma cuenta que ya uso en la
app, para que el modelo solo pueda ver las retrospectivas a las que yo tengo acceso.

**Por qué esta prioridad**: sin autenticación funcionando no hay nada más que
construir; es la puerta de entrada de toda la funcionalidad.

**Prueba independiente**: se puede validar por sí sola conectando el conector desde
un cliente MCP real y comprobando que la autorización se completa y que un intento de
uso sin autenticar es rechazado.

**Escenarios de aceptación**:

1. **Given** un usuario con cuenta activa en RetroRocket, **When** añade el conector
   MCP desde su cliente de IA e inicia el flujo de autorización, **Then** el cliente
   de IA queda vinculado a su cuenta de RetroRocket sin necesidad de credenciales
   nuevas.
2. **Given** un conector ya autorizado, **When** el usuario lo revoca desde
   RetroRocket o desde su cliente de IA, **Then** cualquier llamada posterior con ese
   token es rechazada.
3. **Given** un cliente de IA sin autorización, **When** intenta invocar cualquier
   herramienta del conector, **Then** la petición se rechaza sin exponer datos.

---

#### Historia 2 — Obtener el detalle de una retrospectiva para generar un informe (Priority: P1)

Como usuario, quiero pedirle a mi asistente de IA que consulte una retrospectiva
concreta (tarjetas, agrupaciones, reacciones, sentimiento y action items) para que
redacte un informe o resumen sin que yo tenga que copiar manualmente el contenido del
tablero.

**Por qué esta prioridad**: es el caso de uso principal solicitado ("sacar informes")
y el que aporta valor por sí mismo aunque no exista nada más.

**Prueba independiente**: se puede probar de forma aislada pidiendo al modelo un
resumen de una retrospectiva conocida y verificando que los datos citados coinciden
con los del tablero real.

**Escenarios de aceptación**:

1. **Given** una retrospectiva con tarjetas, grupos y action items, **When** el
   modelo de IA solicita su detalle vía MCP, **Then** recibe el contenido de las
   tarjetas, su columna, agrupaciones, likes/reacciones, participantes y los action
   items asociados.
2. **Given** una retrospectiva con notas de facilitador, **When** quien pregunta no es
   el facilitador de esa retrospectiva, **Then** las notas del facilitador no se
   incluyen en la respuesta.
3. **Given** una retrospectiva con resultados de sentimiento calculados, **When** se
   consulta el detalle, **Then** el resumen de sentimiento/mood del equipo se incluye
   como parte de los datos.
4. **Given** un identificador de retrospectiva inexistente o al que el usuario no
   tiene acceso, **When** se solicita su detalle, **Then** el conector responde con un
   error claro sin filtrar si la retrospectiva existe.

---

#### Historia 3 — Listar mis retrospectivas para elegir sobre cuál preguntar (Priority: P2)

Como usuario, quiero que mi asistente de IA pueda listar mis retrospectivas
(dashboard) para poder pedir un informe sin tener que buscar y pegar yo el
identificador del tablero.

**Por qué esta prioridad**: mejora la experiencia de la Historia 2 pero no es
imprescindible para obtener valor (el usuario podría facilitar el ID manualmente).

**Prueba independiente**: se puede probar pidiendo al modelo "qué retrospectivas
tengo" y comprobando que la lista coincide con el dashboard del usuario.

**Escenarios de aceptación**:

1. **Given** un usuario con varias retrospectivas creadas o en las que participó,
   **When** el modelo de IA solicita la lista, **Then** recibe título, fecha y
   estado (activa/cerrada) de cada una.
2. **Given** un usuario sin retrospectivas, **When** se solicita la lista, **Then**
   se recibe una lista vacía, no un error.

---

#### Historia 4 — Informe narrativo listo para compartir (Priority: P3)

Como facilitador, quiero pedirle a mi asistente de IA un informe en formato texto
(resumen ejecutivo, temas destacados, estado de ánimo del equipo y acciones
acordadas) para compartirlo directamente con el equipo o dirección, sin tener que
maquetarlo yo mismo.

**Por qué esta prioridad**: es "azúcar" sobre las Historias 1-2: el modelo ya puede
generar esto por sí mismo combinando los datos devueltos, así que solo aporta valor
adicional si RetroRocket ofrece una herramienta MCP dedicada (`prompt`) que garantice
un formato consistente.

**Prueba independiente**: se puede probar pidiendo el informe narrativo y comparando
su contenido con los datos crudos de la retrospectiva.

**Escenarios de aceptación**:

1. **Given** una retrospectiva con datos suficientes, **When** el usuario pide un
   informe narrativo, **Then** el resultado incluye resumen, temas, estado de ánimo y
   action items pendientes/completados, en un formato de texto legible.

---

### Casos límite

- ¿Qué ocurre si el usuario revoca el acceso mientras el modelo está a mitad de una
  conversación con varias llamadas encadenadas?
- ¿Qué ocurre si se solicita el detalle de una retrospectiva que aún está activa
  (en curso, con otros participantes escribiendo en tiempo real)? ¿el informe debe
  indicar que los datos son un "snapshot" del momento de la consulta?
- ¿Cómo se comporta el conector si Firestore está en un estado de error/reconexión
  (los mismos estados que ya maneja la UI)?
- ¿Qué pasa si el usuario autenticado no es facilitador ni participante de ninguna
  retrospectiva relacionada con el ID solicitado, pero sí es un usuario válido de
  RetroRocket? (ver requisito FR-004, marcado como pendiente de decisión).

### Requisitos funcionales

- **FR-001**: El sistema DEBE exponer un servidor MCP remoto (transporte Streamable
  HTTP) públicamente accesible desde clientes de IA.
- **FR-002**: El sistema DEBE requerir autenticación OAuth 2.1 ligada a la cuenta
  existente de RetroRocket (Google/GitHub vía Firebase Auth) antes de responder a
  cualquier herramienta del conector.
- **FR-003**: Los usuarios DEBEN poder revocar el acceso concedido a un cliente de IA
  en cualquier momento, y esa revocación DEBE tener efecto inmediato en llamadas
  posteriores.
- **FR-004**: El sistema DEBE limitar los datos devueltos a las retrospectivas sobre
  las que el usuario autenticado tiene acceso [NEEDS CLARIFICATION: hoy las reglas de
  Firestore permiten a cualquier usuario autenticado no anónimo leer cualquier
  retrospectiva (no solo las propias/participadas). ¿El conector MCP debe heredar ese
  mismo modelo abierto, o debe restringirse solo a retrospectivas creadas por el
  usuario o en las que consta como participante? Dado que un agente de IA puede
  encadenar consultas de forma más agresiva que una persona navegando la UI, esto
  merece una decisión explícita antes de planificar].
- **FR-005**: El sistema NO DEBE permitir, en esta versión, ninguna operación de
  escritura (crear, modificar o borrar) sobre Firestore a través del conector MCP.
- **FR-006**: El sistema DEBE excluir las notas del facilitador de cualquier
  respuesta salvo que quien realiza la consulta autenticada sea el facilitador
  propietario de esas notas, replicando la misma regla ya aplicada en la exportación
  a PDF/DOCX.
- **FR-007**: El sistema DEBE poder listar las retrospectivas visibles para el
  usuario autenticado con su título, fecha de creación y estado.
- **FR-008**: El sistema DEBE poder devolver, para una retrospectiva dada, sus
  tarjetas (contenido, columna, likes/reacciones), agrupaciones, participantes,
  resultados de sentimiento/mood y action items asociados.
- **FR-009**: El sistema DEBE responder con un error que no revele si una
  retrospectiva existe cuando el usuario no tiene acceso a ella.

### Entidades clave

- **Retrospectiva (board)**: tablero de una sesión, con plantilla, columnas, estado
  (activa/cerrada) y metadatos (título, fecha, creador).
- **Tarjeta**: nota individual dentro de una columna, con contenido, autor, likes y
  reacciones.
- **Action item**: acción acordada en la retrospectiva, con responsable y fecha de
  vencimiento opcional (ya existe como colección `actionItems`).
- **Resultado de sentimiento**: sentimiento por tarjeta y mood agregado del equipo
  para una retrospectiva.
- **Autorización MCP**: la concesión de acceso de un cliente de IA a la cuenta de un
  usuario (token, alcance, fecha de revocación).

### Criterios de éxito

- **SC-001**: Un usuario puede pasar de "conectar el conector" a recibir un informe
  de una retrospectiva concreta sin salir de la conversación con su cliente de IA.
- **SC-002**: El 100% de las respuestas del conector para retrospectivas ajenas (sin
  acceso) son rechazadas, verificado con pruebas automatizadas.
- **SC-003**: El 100% de las respuestas que incluyen notas de facilitador
  corresponden a consultas realizadas por el propio facilitador.
- **SC-004**: Ningún dato se escribe en Firestore como resultado de una llamada al
  conector MCP (verificable con pruebas que confirmen ausencia de operaciones de
  escritura).

### Supuestos

- Se reutiliza el hosting actual en Vercel (plan gratuito) para el nuevo endpoint MCP,
  sin introducir infraestructura de pago.
- La identidad del cliente de IA se resuelve siempre contra Firebase Authentication;
  no se crea un sistema de cuentas independiente para MCP.
- No se define en esta iteración un límite de peticiones/minuto propio del conector;
  se asume que los límites por defecto del hosting (Vercel) son suficientes para el
  volumen esperado de un usuario individual.
- El formato exacto de los datos devueltos (JSON de herramientas MCP) es una decisión
  técnica que corresponde a `/speckit.plan`, no a este documento.

---

## Feature B (backlog, no ejecutar todavía) — Crear tareas en Jira desde acciones acordadas

Guardo aquí la idea para cuando decidas abordarla, **después** de validar la Feature A.
No la conviertas en spec todavía: mézclala con la anterior solo si de verdad quieres
entregar ambas cosas juntas (no lo recomiendo, por la Constitución del proyecto).

### Prompt borrador para `/speckit.specify` (fase futura)

```text
Quiero ampliar el servidor MCP de RetroRocket, ya existente para informes de solo
lectura, con una herramienta de escritura que permita a un cliente de IA crear
tareas en Jira a partir de los action items acordados en una retrospectiva. El
usuario debe poder configurar sus credenciales de Jira (URL del sitio, proyecto
destino y token de API) desde RetroRocket. El modelo de IA debe poder proponer qué
action items convertir en tareas de Jira, pero la creación efectiva debe requerir
confirmación explícita del usuario antes de escribir en Jira. Cada action item de
RetroRocket que genere una tarea en Jira debe quedar enlazado con el ID de la tarea
creada para evitar duplicados si se repite la operación.
```

**Nota de viabilidad**: Jira Cloud Free incluye acceso a su API REST (autenticación
por API token), pero con límites de tasa más estrictos que los planes de pago; para
el volumen de una retrospectiva (unos pocos action items) no debería ser un problema.
Antes de convertir esto en spec, conviene confirmar contigo: ¿un token de Jira por
usuario, o una integración a nivel de equipo/proyecto compartida?

---

## Próximos pasos sugeridos (comandos de Speckit)

1. `/speckit.specify` con el prompt de la Feature A → genera `specs/0XX-.../spec.md`.
2. `/speckit.clarify` → resuelve el `[NEEDS CLARIFICATION]` de FR-004 (alcance de
   qué retrospectivas puede ver el conector) y cualquier otra ambigüedad que
   Speckit detecte.
3. `/speckit.plan` → aquí se decide la implementación real: Vercel + `mcp-handler`
   como servidor, y el puente OAuth 2.1 sobre Firebase Auth.
4. `/speckit.tasks` → desglose en tareas siguiendo TDD (Principio I de la
   Constitución).
5. `/speckit.implement` — recuerda que, según las instrucciones del proyecto, no
   debo escribir código yo mismo; este paso lo ejecutas tú (o el asistente de código)
   con el spec y el plan ya aprobados.
