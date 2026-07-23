# Feature Specification: README alineado al estado actual de la aplicación

**Feature Branch**: `012-readme-accuracy-update`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Quiero revisar el fichero readme.md del folder principal y ajustar su contenido al estado actual de la aplicación. Eliminado las cosas que no apliquen o no sean ciertas y corrigiendo las que se hayan modificado o cambiado."

## Clarifications

### Session 2026-07-23

- Q: ¿Cuál es el idioma objetivo del `README.md` tras la actualización? → A: Inglés — el README completo debe quedar en inglés (traduciendo también las secciones hoy correctas escritas en español).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configurar y arrancar el proyecto sin instrucciones falsas (Priority: P1)

Una persona que llega por primera vez al repositorio sigue la sección de instalación y configuración del `README.md` (raíz) para dejar la aplicación funcionando en local. Cada comando, ruta y variable que ejecuta o copia coincide con la realidad del proyecto, de modo que llega a la app corriendo sin quedar bloqueada por una instrucción incorrecta.

**Why this priority**: El README es la puerta de entrada; una instrucción de arranque incorrecta bloquea por completo a un recién llegado antes de poder usar nada. Es el mayor coste de una documentación desactualizada.

**Independent Test**: Seguir la sección "Instalación y Configuración" paso a paso en un entorno limpio; se puede validar de forma aislada comprobando que ninguna variable, ruta de carpeta o comando falla o no existe.

**Acceptance Scenarios**:

1. **Given** un clon limpio del repositorio, **When** la persona sigue los pasos de instalación del README, **Then** las rutas de carpeta indicadas (ubicación de la aplicación, del `.env.example`) existen tal cual se describen.
2. **Given** la sección de configuración de entorno, **When** la persona copia las variables de entorno documentadas, **Then** los nombres de variable coinciden con los que la aplicación realmente consume (prefijo actual del build tool), sin nombres obsoletos.
3. **Given** la sección de ejecución, **When** la persona ejecuta los comandos listados (desarrollo, build, tests, emuladores), **Then** todos existen como scripts reales del proyecto y hacen lo que el README dice.

---

### User Story 2 - Entender qué hace hoy la aplicación (características reales) (Priority: P1)

Una persona (usuaria o evaluadora) lee las secciones de características y guía de uso para saber qué ofrece la herramienta. Todo lo listado existe y funciona; no hay características descritas que se hayan retirado ni omisiones de capacidades relevantes ya presentes.

**Why this priority**: El README vende y explica el producto. Prometer funciones inexistentes (o describir interacciones ya retiradas) confunde a usuarios y evaluadores y erosiona la confianza; omitir una capacidad importante ya construida la deja invisible.

**Independent Test**: Contrastar cada característica y paso de la guía de uso contra la aplicación en funcionamiento; se valida de forma aislada verificando que cada afirmación es reproducible y que las capacidades relevantes existentes aparecen documentadas.

**Acceptance Scenarios**:

1. **Given** la lista de características y la guía de uso, **When** se contrasta cada afirmación con la app, **Then** no queda ninguna que describa una interacción o función que ya no existe.
2. **Given** el conjunto de capacidades relevantes hoy presentes en la app, **When** se revisa el README, **Then** las que sean significativas para usuarios o facilitadores están documentadas (no omitidas).
3. **Given** las descripciones de flujos (crear retrospectiva, trabajar con tarjetas, modo facilitador, exportar), **When** una persona los sigue en la app real, **Then** los pasos y controles descritos se corresponden con la interfaz actual.

---

### User Story 3 - Contribuir con una imagen fiel de estructura y tooling (Priority: P2)

Una persona que quiere contribuir consulta las secciones de arquitectura, stack, estándares de código y calidad para orientarse. La estructura de carpetas, el tooling y los procesos descritos reflejan el proyecto actual, de modo que sabe dónde vive cada cosa y qué controles debe pasar su cambio.

**Why this priority**: Una arquitectura documentada incorrecta hace perder tiempo a quien contribuye buscando ficheros que no están donde el README dice, y desconocer los controles de calidad reales genera PRs que fallan CI.

**Independent Test**: Comparar el árbol de estructura y las afirmaciones de tooling/calidad del README con el repositorio real; se valida de forma aislada comprobando que las rutas citadas existen y que los procesos descritos coinciden con los realmente configurados.

**Acceptance Scenarios**:

1. **Given** la sección de arquitectura del proyecto, **When** se contrastan las rutas con el repositorio, **Then** la organización descrita refleja la estructura real actual (sin rutas inexistentes).
2. **Given** las menciones a pruebas, cobertura, linting, accesibilidad y CI/CD, **When** se comparan con la configuración real, **Then** lo descrito coincide con los procesos y comandos existentes.
3. **Given** las secciones que sí son correctas hoy, **When** se revisa el documento, **Then** dicho contenido correcto se preserva (no se degrada al corregir el resto).

---

### User Story 4 - Roadmap, enlaces y metadatos coherentes (Priority: P3)

Una persona lee el roadmap, los enlaces del pie y los metadatos (licencia, año, URLs). Los elementos ya entregados no aparecen como "pendientes", los enlaces llevan a destinos válidos o se retiran si son marcadores de posición, y los metadatos son correctos.

**Why this priority**: Es el nivel de menor impacto funcional, pero un roadmap con cosas ya hechas y enlaces muertos transmiten abandono y restan credibilidad.

**Independent Test**: Revisar cada ítem de roadmap contra lo ya entregado y cada enlace/metadato contra su validez; se valida de forma aislada marcando incoherencias sin depender de las otras secciones.

**Acceptance Scenarios**:

1. **Given** la lista de roadmap ("próximas funcionalidades" y "mejoras técnicas"), **When** se contrasta con lo ya entregado, **Then** ningún elemento ya implementado figura como pendiente.
2. **Given** los enlaces del documento (demo, documentación, comunidad, app en vivo), **When** se revisan, **Then** los que apunten a un marcador de posición sin destino real se corrigen o se eliminan.
3. **Given** los metadatos (licencia, año de copyright, URLs), **When** se revisan, **Then** son correctos y coherentes con el estado actual.

---

### Edge Cases

- ¿Qué ocurre si una sección mezcla afirmaciones ciertas y obsoletas en el mismo bloque? Debe corregirse la parte obsoleta preservando la cierta, sin borrar el bloque completo.
- ¿Cómo se trata una capacidad presente en el código pero deshabilitada por defecto o considerada obsoleta/deprecated? Debe documentarse su estado real (p. ej. reemplazada por otra) en lugar de describirla como activa.
- ¿Qué pasa con contenido "aspiracional" (ejemplos de reglas de seguridad, paletas, valores) que no refleja la configuración real? Debe alinearse con la fuente de verdad del repositorio o marcarse claramente como ejemplo ilustrativo, nunca presentarse como el estado real.
- ¿Y si el README y una sección ya correcta (p. ej. theming/accesibilidad) usan rutas relativas a la subcarpeta de la aplicación? Las rutas deben quedar sin ambigüedad respecto a la raíz del repositorio frente a la carpeta de la aplicación.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(principio general; los FR-002…FR-014 son sus casos concretos)*: El `README.md` de la raíz del repositorio MUST reflejar de forma veraz el estado actual de la aplicación; toda afirmación que no sea cierta hoy MUST corregirse o eliminarse.
- **FR-002**: Las variables de entorno documentadas MUST coincidir exactamente con las que la aplicación consume realmente (nombres y prefijo del build tool actual), eliminando cualquier nomenclatura obsoleta.
- **FR-003**: Las rutas de carpeta/fichero citadas para la instalación y configuración (ubicación de la aplicación dentro del repositorio, fichero de ejemplo de entorno) MUST corresponder con la ubicación real, sin ambigüedad entre la raíz del repositorio y la subcarpeta de la aplicación.
- **FR-004**: Los comandos documentados (desarrollo, build, previsualización, pruebas, cobertura, emuladores, e2e, linting, type-check) MUST existir como scripts reales del proyecto y describirse conforme a lo que hacen.
- **FR-005**: La lista de características MUST eliminar toda función descrita que ya no exista o haya sido reemplazada, y MUST reflejar el estado real de las que hayan cambiado (incluyendo indicar cuándo una interacción fue sustituida por otra).
- **FR-006**: El README MUST incorporar las capacidades **user-facing** actualmente presentes que hoy están omitidas —como mínimo el **análisis de sentimiento con IA + panel de estado de ánimo del equipo**—, de modo que la descripción del producto esté completa para usuarios y facilitadores. Una capacidad solo se documenta como disponible tras **verificar que es realmente user-facing** (accesible desde la interfaz, no dev-only/experimental); si no lo es, MUST NOT presentarse como función disponible.
- **FR-007**: Las guías de uso (crear/unirse a retrospectiva, trabajar con tarjetas, agrupar, modo facilitador, exportar) MUST describir los pasos y controles tal como aparecen en la interfaz actual.
- **FR-008**: La sección de arquitectura/estructura MUST reflejar la organización real del código actual, eliminando rutas y módulos inexistentes.
- **FR-009**: Las afirmaciones sobre calidad y procesos (pruebas automatizadas, cobertura, linting, accesibilidad, CI/CD, versionado, despliegue) MUST coincidir con lo realmente configurado en el repositorio.
- **FR-010**: El roadmap MUST dejar de listar como pendiente cualquier elemento ya entregado; los ítems entregados se retiran o se marcan como completados.
- **FR-011**: Los enlaces y metadatos (enlaces del pie, URL de la app en vivo, licencia, año de copyright) MUST ser válidos y coherentes; los marcadores de posición sin destino real MUST corregirse o eliminarse. Todo enlace conservado que apunte a un destino real MUST verificarse como **alcanzable** (no roto); un enlace que no se pueda confirmar alcanzable MUST eliminarse o sustituirse.
- **FR-012**: El contenido que hoy ya es correcto MUST preservarse (no degradarse) durante la corrección del resto.
- **FR-013**: Los ejemplos ilustrativos que no reflejen la configuración real (p. ej. reglas de seguridad o valores de muestra) MUST alinearse con la fuente de verdad del repositorio o marcarse inequívocamente como ejemplo, nunca presentarse como el estado real.
- **FR-014**: El `README.md` resultante MUST estar redactado íntegramente en **inglés**, incluidas las secciones hoy correctas que están en español (p. ej. theming/accesibilidad), con un estilo y tono coherentes en todo el documento; no MUST quedar contenido en español.

### Key Entities *(include if feature involves data)*

- **README (raíz)**: Documento de entrada del repositorio; su contenido es el objeto de esta feature. Secciones principales: introducción, características, stack, arquitectura, theming/accesibilidad, instalación/configuración, guía de uso, autenticación, sistema de diseño, despliegue, contribución, roadmap, soporte, licencia.
- **Estado real de la aplicación**: Fuente de verdad contra la que se contrasta el README — código, scripts del proyecto, fichero de ejemplo de entorno, configuración de CI/CD y calidad, y funcionalidades observables en la interfaz.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 pasos de la sección de instalación/configuración fallan al seguirse en un entorno limpio por una instrucción incorrecta (rutas, variables o comandos).
- **SC-002**: 0 características o pasos de uso descritos en el README corresponden a funciones inexistentes o retiradas de la aplicación.
- **SC-003**: 100% de las variables de entorno y comandos citados coinciden con los reales del proyecto.
- **SC-004**: 100% de las rutas de carpeta/fichero citadas en las secciones de arquitectura, instalación y theming existen en el repositorio.
- **SC-005**: 0 elementos de roadmap listados como pendientes corresponden a funcionalidades ya entregadas.
- **SC-006**: 0 enlaces del documento apuntan a un marcador de posición sin destino real.
- **SC-007**: El conjunto cerrado de capacidades user-facing hoy presentes y hoy omitidas del README está documentado: **como mínimo** el análisis de sentimiento con IA + estado de ánimo del equipo, **y** la agrupación asistida (*clustering*) **si y solo si** se verifica que es user-facing (ver research R3). 0 de esas capacidades verificadas queda sin documentar; 0 capacidad no verificada se documenta como disponible.
- **SC-008**: El 100% del `README.md` resultante está en inglés; 0 secciones o fragmentos permanecen en español.

## Assumptions

- El README objetivo es el ubicado en la raíz del repositorio (`README.md`), no un README por subcarpeta.
- La "fuente de verdad" del estado actual es el repositorio tal como está en la rama de trabajo (código, scripts, `.env.example`, configuración de CI/CD y funcionalidades observables), no versiones previas ni entornos externos.
- El alcance es únicamente el contenido del README (veracidad, completitud, coherencia e idioma); no incluye cambios de código de la aplicación ni cambiar su formato.
- El README objetivo pasa a estar en inglés (ver Clarifications). Se preserva la estructura general de secciones, salvo que una sección deba eliminarse por describir algo inexistente; el contenido correcto se conserva pero traducido al inglés.
- No se requiere validar el funcionamiento de servicios externos (Firebase, proveedor de hosting) más allá de que las instrucciones y nombres documentados sean correctos.
- El README describirá la votación numérica (`votes`) como **deprecada** (reemplazada por likes + reacciones), reflejando el estado real del código. El *constitution* aún menciona "voting" entre los flujos críticos; **alinear esa terminología del constitution queda fuera del alcance** de esta feature (requeriría un `/speckit-constitution` aparte). Documentar la realidad no constituye una violación del constitution.
- La verificación de "user-facing" (FR-006/SC-007) y de alcanzabilidad de enlaces (FR-011) se realiza contra el repositorio y la interfaz observable en el momento de la implementación; no depende de entornos externos persistentes.
