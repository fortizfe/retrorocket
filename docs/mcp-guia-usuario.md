# 🔌 Guía de usuario: conectar tu asistente de IA a RetroRocket (MCP)

RetroRocket permite conectar un asistente de IA compatible con MCP (por ejemplo,
**Claude**) a tu cuenta, para que pueda leer tus retrospectivas y ayudarte a
redactar informes, resúmenes o análisis, sin que tengas que exportar y subir
archivos a mano.

Esta guía explica, para usuarios finales, cómo conectar, qué puede hacer el
asistente y cómo revocar el acceso.

---

## ¿Qué es esto exactamente?

RetroRocket expone un **servidor MCP remoto de solo lectura**
([Model Context Protocol](https://modelcontextprotocol.io)) en:

```
https://retro-rocket.vercel.app/api/mcp
```

No necesitas copiar esta URL a mano en la mayoría de los casos: los clientes de
IA compatibles con MCP la descubren automáticamente (junto con el resto de
metadatos de autorización) en cuanto la añades como conector.

**Es estrictamente de solo lectura**: nada de lo que el asistente puede hacer a
través de este conector crea, edita o borra datos en RetroRocket. Solo puede
consultar información.

## ¿Qué puede ver y hacer el asistente?

Una vez conectado, tu asistente de IA puede usar tres herramientas:

| Herramienta | Qué devuelve |
|---|---|
| `list_retrospectives` | Todas las retrospectivas que has creado o en las que has participado (título, fecha, estado). |
| `get_retrospective_detail` | El detalle completo de una retrospectiva: tarjetas, columnas, agrupaciones, likes/reacciones, participantes, resultados de sentimiento y action items. |
| `get_retrospective_summary` | Un resumen estructurado y listo para redactar un informe a partir de esos mismos datos. |

### Tus notas de facilitador siguen siendo privadas

Las **notas del facilitador** solo se incluyen en las respuestas cuando **tú**
eres el facilitador de esa retrospectiva concreta — exactamente la misma regla
que ya se aplica en la exportación a PDF/DOCX. Si participaste en una
retrospectiva sin ser su facilitador, el asistente no podrá ver esas notas
aunque pregunte por esa retrospectiva.

## Cómo conectar

### Desde claude.ai (o la app de escritorio de Claude)

1. Ve a **Settings → Connectors** (Ajustes → Conectores).
2. Añade un conector remoto nuevo con esta URL:
   ```
   https://retro-rocket.vercel.app/api/mcp
   ```
3. Claude te llevará a un inicio de sesión normal con tu cuenta de RetroRocket
   (Google o GitHub) si no habías iniciado sesión ya. **No creas ni introduces
   ninguna contraseña nueva**: reutiliza tu cuenta existente de RetroRocket.
4. Verás una pantalla de **consentimiento** indicando qué asistente está
   pidiendo acceso y qué puede leer (tarjetas, agrupaciones, reacciones,
   participantes, sentimiento y action items; notas de facilitador solo si
   eres facilitador). Pulsa **Allow / Permitir**.
5. Listo. Ya puedes pedirle a Claude, por ejemplo: *"Lista mis retrospectivas"*
   o *"Hazme un resumen de la retrospectiva de la última sprint review"*.

### Desde Claude Code (CLI)

```bash
claude mcp add --transport http retrorocket https://retro-rocket.vercel.app/api/mcp
```

La primera vez que lo uses se abrirá el mismo flujo de autorización en el
navegador (inicio de sesión + pantalla de consentimiento) descrito arriba.

## Cómo revocar el acceso

Puedes revocar el acceso de cualquier asistente conectado en cualquier
momento, directamente desde RetroRocket:

1. Abre el menú de usuario (tu avatar, arriba a la derecha) y entra en
   **Perfil** (`/perfil`).
2. En la tarjeta **"Asistentes de IA conectados"** (justo debajo de tus
   proveedores de inicio de sesión vinculados) verás cada asistente
   autorizado, con la fecha en la que lo conectaste (*"Conectado el..."*).
3. Pulsa **Revocar** junto al asistente que quieras desconectar.

La revocación tiene efecto **inmediato**: se comprueba en cada petición, no
solo cuando el token expira. Esto significa que, aunque el asistente todavía
conserve una credencial de acceso, la siguiente vez que intente usarla será
rechazada.

> Si no tienes ningún asistente conectado todavía, esta tarjeta mostrará el
> mensaje "Todavía no hay ningún asistente de IA conectado" — es normal, no es
> un error.

## Preguntas frecuentes

**¿El asistente puede modificar o borrar algo de mis retrospectivas?**
No. El conector es exclusivamente de lectura; ninguna de sus herramientas
permite crear, editar ni borrar datos.

**¿Necesito una contraseña o API key nueva?**
No. La autorización reutiliza tu cuenta existente de RetroRocket (Google o
GitHub) mediante un consentimiento OAuth estándar.

**¿Puedo tener varios asistentes conectados a la vez?**
Sí. Cada uno aparece como una entrada independiente en "Asistentes de IA
conectados" y puedes revocarlos por separado.

**Revoqué el acceso pero el asistente sigue "recordando" datos que ya leyó
antes, ¿es normal?**
Sí: la revocación impide **nuevas** lecturas a partir de ese momento, pero no
puede borrar lo que el asistente ya haya guardado en su propia conversación.
Si quieres que "olvide" esos datos, deberás gestionarlo desde el propio
cliente de IA (por ejemplo, borrando esa conversación).

**¿Quién puede ver mis notas de facilitador a través del conector?**
Solo un asistente que esté actuando en tu nombre, y solo para las
retrospectivas en las que tú figuras como facilitador — igual que en la
exportación a PDF/DOCX.
