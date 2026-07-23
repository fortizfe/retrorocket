# Quickstart: Verificación del README corregido

**Feature**: 012-readme-accuracy-update | **Date**: 2026-07-23

Guía runnable para validar que el `README.md` cumple el
[contrato de exactitud](./contracts/readme-accuracy-contract.md) y los criterios de
éxito del [spec](./spec.md). Ejecutar desde la **raíz del repositorio**.

## Prerequisitos

- Repo clonado; `README.md` en la raíz ya reescrito.
- Herramientas: `grep`, `ls`, `git`. Para la validación funcional (opcional):
  Node 22 + npm y una cuenta Firebase.

---

## A. Comprobaciones automáticas (tokens prohibidos y enlaces) — SC-002/003/006/008

Todas deben devolver **0 coincidencias**:

```bash
# A1/A5 — variables y libs obsoletas
grep -nE "REACT_APP_" README.md            # → vacío (SC-003)
grep -n "jsPDF" README.md                  # → vacío (R5)

# A3/R2 — árbol de carpetas obsoleto
grep -nE "src/(components|hooks|services)/" README.md   # → vacío (estructura vieja)

# A8 — enlaces placeholder
grep -nE "\]\(#\)" README.md               # → vacío (SC-006)
```

**Alcanzabilidad de enlaces reales (FR-011)**: extraer los enlaces externos y
comprobar que no están rotos; los no alcanzables se eliminan o sustituyen:

```bash
grep -oE "https?://[^) ]+" README.md | sort -u | while read -r url; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -I --max-time 10 "$url")
  echo "$code  $url"          # revisar: 4xx/5xx/000 → roto → corregir/eliminar
done
```

Presencia esperada (deben devolver **≥1 coincidencia**):

```bash
grep -nE "VITE_FIREBASE_" README.md                 # variables correctas
grep -niE "sentiment|team.?mood" README.md          # capacidad IA documentada (SC-007)
grep -niE "clustering" README.md                     # clustering documentado (SC-007)
grep -niE "playwright|codeql|vitest|coverage" README.md   # calidad/CI real (R8)
grep -niE "@react-pdf/renderer|docx" README.md       # export real (R5)
```

## B. Idioma inglés — SC-008 / L1

- Revisar visualmente que no queda prosa en español. Ayuda (marcadores frecuentes):

```bash
grep -niE "\b(el|la|los|las|para|con|una|según|análisis|tarjetas|equipo)\b" README.md
# Revisar cada hit: deben ser 0 en prosa (se toleran nombres propios / ids de código).
```

## C. Rutas citadas existen — SC-004 / A3

Para cada ruta que el README mencione (arquitectura, instalación, theming),
comprobar que existe. Ejemplos clave que DEBEN existir:

```bash
test -e retro-rocket/.env.example && echo OK
test -e retro-rocket/src/features/boards/sentiment && echo OK
test -e retro-rocket/src/features/boards/clustering && echo OK
test -e retro-rocket/src/lib/theme/tokens.ts && echo OK
test -e retro-rocket/firestore.rules && echo OK
test -e .github/workflows/ci.yml && echo OK
```

## D. Comandos citados son scripts reales — A2

Cada comando `npm run <x>` del README debe estar en los scripts:

```bash
node -e "console.log(Object.keys(require('./retro-rocket/package.json').scripts))"
# Verificar que dev, build, preview, type-check, lint, test, test:coverage,
# emulators, e2e (y test:accuracy si se cita) aparecen.
```

## E. Verificación por sección (manual, contra fuente de verdad) — SC-001/002/005/007

Recorrer el [inventario de secciones](./data-model.md) y confirmar por cada una:

- **Tech Stack**: cada lib citada ∈ `retro-rocket/package.json`; Node **22**.
- **Architecture**: el árbol coincide con `ls retro-rocket/src/**` (feature-first).
- **Key Features / Usage**: sin votación 👍/👎 activa; sin proveedor Apple; incluye
  likes + reacciones, sentimiento/team-mood, clustering, countdown, notas, export.
- **Firestore rules**: coinciden con `retro-rocket/firestore.rules` o marcadas como
  ejemplo (A6).
- **Roadmap**: ningún ítem ya entregado (CI, tests, WCAG) figura como pendiente (SC-005).

## F. Validación funcional del "Getting Started" (opcional) — SC-001

En un entorno limpio, seguir la sección de instalación **tal cual está escrita**:

```bash
git clone <repo-url> && cd retrorocket/retro-rocket
npm install
cp .env.example .env    # completar VITE_FIREBASE_*
npm run dev             # app en http://localhost:3000
```

**Resultado esperado**: ningún paso falla por una instrucción incorrecta (ruta,
variable o comando inexistente).

---

## Resultado de aceptación

La feature se considera validada cuando: A (0/≥1 según corresponda), B (inglés),
C (rutas), D (scripts) y E (por sección) pasan, y F no encuentra instrucciones
falsas. Esto cubre SC-001 … SC-008.
