# Feature Specification: Idle Tab Realtime Connection Cleanup

**Feature Branch**: `045-idle-connection-cleanup`

**Created**: 2026-08-15

**Status**: Draft

**Input**: User description: "He detectado que tenemos un problema de conexiones abiertas infinitamente con pestañas abiertas sin actividad. Quiero implementar las soluciones detectadas en el informe de investigación de la retrospectiva VTeTvsH1ovbOCBTzSD22: un cliente WebSocket que reconecta indefinidamente sin límite de intentos ni de tiempo, sin respetar los cierres intencionados del servidor (sesión inválida / tablero inexistente); cada reconexión relee el tablero completo por dos vías (cliente y servidor); no hay detección de inactividad de pestaña (Page Visibility API); las sesiones inactivas no expiran a corto plazo en las rutas de tiempo real/tablero; y el servidor no poda conexiones muertas de forma proactiva. Se pide implementar las 6 mitigaciones priorizadas del informe."

## Clarifications

### Session 2026-08-15

- Q: ¿Cuánto tiempo debe permanecer una pestaña en segundo plano antes de que el sistema cierre su conexión en tiempo real (FR-001)? → A: 120 segundos (2 minutos)
- Q: Tras un fallo de red transitorio, ¿cuándo debe el sistema dejar de reintentar automáticamente y pedir un reintento manual (FR-004, SC-006)? → A: 5 minutos de reintentos totales
- Q: ¿Cómo se medirá la reducción de lecturas atribuibles a pestañas inactivas exigida por SC-004? → A: sin instrumentación nueva; validación indirecta vía logs de la plataforma, como en la investigación original
- Q: ¿Cuánto tiempo debe el servidor mantener vivas las suscripciones de datos de un tablero tras quedarse sin conexiones activas, antes de liberarlas (FR-006)? → A: 30 segundos
- Q: ¿Con qué frecuencia debe el servidor comprobar que una conexión sigue viva, y tras cuántos fallos consecutivos debe cerrarla (FR-005)? → A: comprobación cada 30 segundos, cierre tras 2 fallos consecutivos (60-90 segundos sin respuesta)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pausar la conexión en tiempo real cuando la pestaña queda en segundo plano (Priority: P1)

Un usuario abre una retrospectiva y, en algún momento, cambia a otra pestaña o aplicación sin cerrar la de la retrospectiva. Mientras la pestaña permanece en segundo plano, el sistema deja de mantener la conexión en tiempo real activa para esa pestaña. Cuando el usuario vuelve a la pestaña, la conexión se restablece automáticamente y el tablero se actualiza con el estado más reciente, sin que el usuario tenga que recargar la página.

**Why this priority**: Es la causa dominante del incidente investigado (pestañas olvidadas en segundo plano generando lecturas continuas) y la mitigación de mayor impacto con menor esfuerzo: por sí sola elimina la práctica totalidad del consumo de recursos por pestañas inactivas.

**Independent Test**: Puede probarse abriendo una retrospectiva, poniendo la pestaña en segundo plano y verificando que no se generan más lecturas/reconexiones de backend para ese tablero mientras permanece oculta; y que, al volver a primer plano, el tablero se reconecta y refresca solo, sin recarga manual.

**Acceptance Scenarios**:

1. **Given** una retrospectiva abierta y con la conexión en tiempo real activa, **When** el usuario cambia a otra pestaña o minimiza la ventana durante más de 120 segundos, **Then** la conexión en tiempo real de esa pestaña se cierra y no se generan más lecturas de backend para ese tablero desde esa pestaña.
2. **Given** una pestaña de retrospectiva cuya conexión fue pausada por inactividad, **When** el usuario vuelve a poner la pestaña en primer plano, **Then** la conexión se restablece automáticamente y el tablero muestra el estado actualizado en menos de 5 segundos, sin acción manual del usuario.
3. **Given** una retrospectiva abierta en primer plano de forma continua, **When** el usuario interactúa normalmente con ella, **Then** el comportamiento de la conexión en tiempo real no cambia respecto al actual (sin pausas ni retrasos perceptibles).

---

### User Story 2 - No reintentar indefinidamente ni sin límite ante fallos de conexión (Priority: P2)

Cuando el servidor rechaza explícitamente una conexión (por ejemplo, porque la sesión ya no es válida o el tablero ya no existe), el sistema deja de intentar reconectar automáticamente y en su lugar informa al usuario de que necesita una acción manual (volver a iniciar sesión, recargar). Ante fallos de red transitorios, el sistema sigue reintentando automáticamente pero con un límite de intentos y de tiempo total, tras el cual ofrece al usuario una forma manual de reintentar en vez de seguir reintentando para siempre.

**Why this priority**: Es la segunda causa directa del incidente: sin este límite, cualquier corte de red prolongado o rechazo del servidor se convierte en un bucle de reconexión perpetuo que sigue consumiendo recursos aunque la pestaña esté en primer plano.

**Independent Test**: Puede probarse simulando un rechazo explícito del servidor (sesión inválida / tablero inexistente) y verificando que el cliente no vuelve a intentar conectar automáticamente; y simulando una caída de red prolongada, verificando que los reintentos automáticos cesan tras el límite configurado y se ofrece un reintento manual.

**Acceptance Scenarios**:

1. **Given** una pestaña con una conexión en tiempo real activa, **When** el servidor cierra la conexión porque la sesión ya no es válida o el tablero ya no existe, **Then** el cliente no reintenta conectar automáticamente y muestra al usuario un mensaje claro indicando la acción manual necesaria.
2. **Given** una pestaña que no consigue reconectar por un problema de red, **When** el tiempo total transcurrido desde el primer fallo supera los 5 minutos, **Then** el cliente deja de reintentar automáticamente y ofrece al usuario un botón o acción explícita para reintentar manualmente.
3. **Given** una caída de red breve y puntual, **When** la red se restablece dentro del límite de reintentos, **Then** la conexión se recupera automáticamente sin intervención del usuario, igual que hoy.

---

### User Story 3 - El servidor cierra de forma proactiva las conexiones que ya no responden (Priority: P3)

El servidor comprueba periódicamente que cada conexión en tiempo real sigue viva. Si una conexión deja de responder (por ejemplo, por un portátil suspendido o un cambio de red que no cierra la conexión de forma limpia), el servidor la da por finalizada y libera los recursos asociados en vez de esperar a que la capa de red la detecte por su cuenta, que puede tardar mucho más.

**Why this priority**: Reduce el tiempo durante el cual una conexión "zombie" sigue contando como participante activo y reteniendo recursos en el servidor, acortando la ventana de exposición del resto de mitigaciones.

**Independent Test**: Puede probarse estableciendo una conexión y simulando que el cliente deja de responder (sin cerrar la conexión de forma limpia), y verificando que el servidor la da por finalizada y libera sus recursos dentro de un tiempo acotado y sensiblemente menor que el actual.

**Acceptance Scenarios**:

1. **Given** una conexión en tiempo real establecida y saludable, **When** el cliente deja de responder a 2 comprobaciones de actividad consecutivas del servidor (cada 30 segundos), **Then** el servidor cierra esa conexión y libera sus recursos dentro de 60-90 segundos desde el último fallo.
2. **Given** una conexión en tiempo real que sigue respondiendo con normalidad a las comprobaciones de actividad, **When** pasa el tiempo, **Then** la conexión permanece abierta sin interrupciones.

---

### User Story 4 - Evitar recargas completas innecesarias del tablero en reconexiones seguidas (Priority: P4)

Cuando una misma pestaña se desconecta y reconecta varias veces en un intervalo corto de tiempo (por ejemplo, una red inestable con cortes intermitentes), el sistema evita reconstruir desde cero todas las suscripciones de datos del tablero en cada micro-reconexión, siempre que ningún otro participante haya necesitado que se liberaran mientras tanto.

**Why this priority**: Reduce el coste de la parte "doble" del problema descrito en la investigación (recarga completa tanto en cliente como en servidor en cada reconexión), pero solo aporta valor una vez que las mitigaciones P1–P3 ya han acotado la frecuencia de reconexión; por eso tiene menor prioridad relativa.

**Independent Test**: Puede probarse provocando varias desconexiones y reconexiones rápidas y consecutivas de una misma pestaña sobre el mismo tablero, y verificando que el coste de recarga completa de datos del tablero en el servidor no se repite en cada una de ellas, sino solo tras un margen de gracia sin ninguna conexión activa.

**Acceptance Scenarios**:

1. **Given** un tablero con una única pestaña conectada que sufre una reconexión breve, **When** la reconexión ocurre dentro de los 30 segundos siguientes, **Then** el servidor reutiliza las suscripciones de datos existentes en vez de reconstruirlas por completo.
2. **Given** un tablero cuya última conexión se cerró y no vuelve a conectarse nadie en 30 segundos, **When** ese margen expira, **Then** el servidor libera las suscripciones de datos de ese tablero como ocurre hoy.

---

### User Story 5 - Las sesiones inactivas dejan de mantener conexiones en tiempo real (Priority: P5)

Una sesión de usuario que lleva inactiva más allá de su ventana de validez a corto plazo ya no puede abrir ni mantener conexiones en tiempo real ni solicitudes al tablero; el usuario debe refrescar su sesión (de forma transparente si sigue activo, o volviendo a iniciar sesión si no lo está) antes de continuar.

**Why this priority**: Es una salvaguarda adicional de última línea: acota en el tiempo cualquier escenario no cubierto por las mitigaciones anteriores (por ejemplo, una pestaña que sigue en primer plano pero cuyo usuario ya no está presente), pero su impacto es menor que el de P1–P3 porque la ventana de validez a corto plazo ya es relativamente amplia.

**Independent Test**: Puede probarse dejando una sesión sin actividad real más allá de su ventana de validez a corto plazo y verificando que las siguientes solicitudes de conexión en tiempo real o de datos del tablero son rechazadas hasta que la sesión se refresca.

**Acceptance Scenarios**:

1. **Given** una sesión que ha superado su ventana de validez a corto plazo sin refrescarse, **When** esa sesión intenta abrir o mantener una conexión en tiempo real o solicitar datos del tablero, **Then** la solicitud es rechazada y se exige refrescar la sesión antes de continuar.
2. **Given** una sesión activa que se refresca con normalidad antes de superar su ventana de validez a corto plazo, **When** continúa usando el tablero, **Then** no percibe ninguna interrupción.

---

### Edge Cases

- ¿Qué ocurre si el usuario tiene la misma retrospectiva abierta en dos pestañas distintas y solo una de ellas pasa a segundo plano? La pestaña en segundo plano debe pausar su propia conexión sin afectar a la conexión de la otra pestaña, que sigue activa con normalidad.
- ¿Qué ocurre si el usuario vuelve a primer plano justo dentro de los 120 segundos de gracia, antes de que la conexión llegara a cerrarse? No debe producirse ninguna desconexión ni recarga visible: la conexión existente se mantiene tal cual.
- ¿Qué ocurre si el servidor rechaza la reconexión por sesión inválida justo mientras el usuario está mirando la pestaña activamente? El usuario debe ver un mensaje claro invitándole a volver a iniciar sesión, no un fallo silencioso ni reintentos infinitos en segundo plano.
- ¿Qué ocurre si varios participantes están conectados al mismo tablero y uno de ellos sufre una reconexión breve? Las suscripciones de datos compartidas del tablero no deben verse afectadas mientras siga habiendo al menos otro participante conectado.
- ¿Qué ocurre si un usuario dedicado permanece inactivo (sin interacción) pero con la pestaña en primer plano durante mucho tiempo, superando la ventana de validez de sesión a corto plazo? Debe tratarse igual que cualquier sesión caducada: se exige refresco de sesión antes de continuar recibiendo actualizaciones.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE detectar cuándo una pestaña del navegador con una retrospectiva abierta pasa a segundo plano (deja de estar visible/activa) y, transcurridos 120 segundos (2 minutos) en ese estado, DEBE cerrar la conexión en tiempo real asociada a esa pestaña en vez de mantenerla abierta indefinidamente.
- **FR-002**: El sistema DEBE restablecer automáticamente la conexión en tiempo real de una pestaña previamente pausada por inactividad en cuanto esa pestaña vuelve a primer plano, sin requerir que el usuario recargue la página.
- **FR-003**: El sistema NO DEBE reintentar conectar automáticamente cuando el servidor rechaza explícitamente la conexión por sesión inválida/expirada o por tablero inexistente; en su lugar DEBE informar al usuario de que se requiere una acción manual.
- **FR-004**: El sistema DEBE limitar los reintentos automáticos de reconexión ante fallos de red transitorios a un máximo de 5 minutos de tiempo total transcurrido desde el primer fallo, y DEBE ofrecer al usuario una acción manual de reintento una vez superado ese límite.
- **FR-005**: El servidor DEBE comprobar cada 30 segundos que cada conexión en tiempo real sigue activa, y DEBE cerrar y liberar los recursos de cualquier conexión que falle 2 comprobaciones consecutivas (60-90 segundos sin respuesta), en vez de depender únicamente de que la capa de red detecte la caída.
- **FR-006**: El servidor NO DEBE reconstruir por completo las suscripciones de datos de un tablero en cada reconexión aislada; DEBE mantenerlas vivas durante 30 segundos tras quedarse sin conexiones activas, reutilizándolas si una nueva conexión llega dentro de ese margen.
- **FR-007**: El sistema DEBE rechazar solicitudes de conexión en tiempo real y de datos del tablero provenientes de sesiones que hayan superado su ventana de validez a corto plazo sin refrescarse, exigiendo un refresco de sesión antes de continuar.
- **FR-008**: El comportamiento anterior NO DEBE introducir retrasos ni fricción perceptibles para una pestaña que permanece en primer plano y en uso activo continuo; solo debe afectar a pestañas inactivas, conexiones rechazadas explícitamente, o reintentos que superen los límites definidos.
- **FR-009**: Cuando una pestaña pausada por inactividad se reconecta, el sistema DEBE mostrar al usuario el estado más reciente del tablero (no un estado obsoleto), de forma equivalente a como se comporta hoy una reconexión.

### Key Entities

- **Conexión en tiempo real**: representa el enlace activo entre una pestaña del navegador y una retrospectiva concreta; tiene un estado (activa, pausada por inactividad, cerrada) y una señal de actividad/vida asociada.
- **Sesión de usuario**: representa el inicio de sesión autenticado de un usuario; tiene tanto una ventana de validez a corto plazo (para uso continuo) como una expiración absoluta a largo plazo.
- **Suscripción de datos del tablero**: representa, en el servidor, el conjunto de datos en tiempo real de una retrospectiva que se comparte entre todas las conexiones activas de ese tablero, independientemente de cuántos participantes estén conectados en cada momento.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una pestaña de retrospectiva dejada abierta y en segundo plano de forma ininterrumpida durante 24 horas seguidas genera cero reconexiones y cero recargas completas del tablero durante ese periodo (la única reconexión ocurre, por diseño, al volver a primer plano — FR-001/FR-002), frente al consumo continuo e ilimitado actual.
- **SC-002**: Cuando la sesión de una pestaña deja de ser válida o el tablero deja de existir mientras la pestaña sigue abierta, esa pestaña deja de intentar reconectar en menos de un minuto, en vez de reintentar indefinidamente.
- **SC-003**: Al menos el 95% de los usuarios que vuelven a una pestaña previamente en segundo plano ven el tablero reconectado y con datos actualizados en menos de 5 segundos desde que la pestaña vuelve a primer plano.
- **SC-004**: El volumen de lecturas de backend atribuibles a pestañas inactivas/olvidadas, observado de forma indirecta en los logs de la plataforma (mismo método usado en la investigación del incidente original: frecuencia y patrón de peticiones repetidas sobre un mismo tablero sin actividad de usuario) durante una ventana de 7 días, se reduce en al menos un 90% respecto al incidente que motivó esta investigación.
- **SC-005**: Ningún usuario con la pestaña activa en primer plano percibe retrasos ni interrupciones nuevas en las actualizaciones en tiempo real como consecuencia de esta funcionalidad.
- **SC-006**: Tras un corte de red prolongado, ningún usuario queda con reintentos automáticos corriendo indefinidamente en segundo plano más allá de los 5 minutos definidos como límite.

## Assumptions

- Todos los periodos de gracia y límites relevantes quedan fijados por las clarificaciones de esta especificación: 120 segundos antes de pausar por segundo plano (FR-001), 5 minutos de tiempo total de reintentos ante fallos de red (FR-004), 30 segundos antes de liberar las suscripciones de datos del tablero (FR-006), y comprobación de vida cada 30 segundos con cierre tras 2 fallos consecutivos (FR-005). Añadidos en la revisión de `/speckit-analyze`: SC-001 se fija en cero reconexiones durante el periodo oculto (no un número aproximado), y SC-003 se fija en menos de 5 segundos.
- Un usuario con la misma retrospectiva abierta en varias pestañas ya se gestiona hoy como conexiones independientes por pestaña; esta funcionalidad no cambia ese comportamiento, solo añade la pausa por inactividad a cada conexión individualmente.
- Los indicadores de presencia/participantes visibles para otros usuarios quedan fuera del alcance de esta funcionalidad: pausar la conexión en tiempo real de una pestaña inactiva no pretende, por sí mismo, cambiar cómo se muestra la presencia de ese participante a los demás; ese comportamiento se mantiene como hoy salvo que se decida abordarlo en una iteración futura.
- Los dos motivos de rechazo explícito de conexión ya existentes hoy (sesión inválida y tablero inexistente) son los únicos considerados "definitivos" (sin reintento automático); cualquier otro motivo de cierre se trata como fallo transitorio sujeto al límite de reintentos.
- No se introduce ninguna opción de configuración visible para el usuario; el comportamiento descrito aplica por defecto a todas las sesiones y pestañas por igual.
- La ventana de validez de sesión a corto plazo ya existente en el sistema es el mecanismo que se reutiliza para el requisito de expiración por inactividad (FR-007), en vez de introducir un mecanismo de expiración nuevo y distinto.
- SC-004 se valida mediante observación indirecta de los logs de la plataforma (el mismo método usado para diagnosticar el incidente original), no mediante una métrica o contador nuevo añadido por esta funcionalidad; instrumentar un contador dedicado queda fuera de alcance.
