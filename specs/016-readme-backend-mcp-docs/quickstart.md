# Quickstart: Validating the README updates

No requiere levantar la aplicación (feature de documentación pura). Todas las
comprobaciones son sobre el propio repositorio.

## 1. Confirmar que el fichero destino del enlace existe

```bash
test -f docs/mcp-guia-usuario.md && echo "OK: guía existe"
```
Expected: `OK: guía existe`. Si falla, el Contrato 2/3 no puede cumplirse
(FR-004 / SC-002).

## 2. Confirmar la mención del backend hexagonal fuera de Tech Stack

```bash
awk '/^## ✨ Key Features/,/^## 🛠️ Tech Stack/' README.md | grep -i "hexagonal"
```
Expected: al menos 1 línea de salida dentro del rango de `Key Features` (no
solo en `Tech Stack`). Antes de la implementación, este comando **no**
produce salida — es el gap que la feature cierra (User Story 1 / SC-001).

## 3. Confirmar que la mención ya existente en Tech Stack se conserva

```bash
grep -n "Hexagonal backend" README.md
```
Expected: sigue apareciendo la línea ya existente en `Backend & Services`
(hoy en `README.md:96`), sin duplicados idénticos adicionales.

## 4. Confirmar los dos enlaces nuevos a la guía MCP

```bash
grep -n "mcp-guia-usuario.md" README.md
```
Expected: **2** coincidencias tras la implementación — una dentro del resumen
`Key Features` (sección MCP) y otra dentro de la sección detallada "MCP
Connector for AI Assistants" (User Story 2 / SC-003). Antes de la
implementación: 0 coincidencias — es el gap que la feature cierra.

## 5. Verificar que no se rompe el resto del documento

```bash
diff <(git show HEAD:README.md) README.md
```
Expected: el `diff` solo muestra las líneas añadidas por esta feature (el
bloque nuevo de Key Features y los dos enlaces); ninguna línea preexistente
se elimina o modifica (SC-004 / invariante de `data-model.md`).

## 6. Revisión visual (opcional)

Renderizar `README.md` en un visor Markdown (GitHub o editor) y confirmar que:
- El nuevo bloque de arquitectura queda bien integrado visualmente entre los
  demás bloques de `Key Features`.
- Ambos enlaces a la guía son clicables y navegan al fichero correcto.
