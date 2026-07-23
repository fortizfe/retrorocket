# Contract: README Accuracy & Structure

**Feature**: 012-readme-accuracy-update | **Type**: Documentation deliverable

Contrato que el `README.md` de la raíz DEBE cumplir tras esta feature. Es la
interfaz "consumible" por lectores humanos (usuarios, evaluadores, contribuidores).
Sirve como criterio de aceptación verificable por el `quickstart.md`.

## C1. Outline canónico (encabezados en inglés)

El README DEBE presentar, en este orden, secciones equivalentes a:

1. `# 🚀 RetroRocket` — Overview
2. `## ✨ Key Features`
3. `## 🛠️ Tech Stack`
4. `## 🏗️ Project Architecture`
5. `## 🎨 Theming & Accessibility (WCAG 2.1 AA)`
6. `## 🚀 Getting Started` (Prerequisites, Clone, Install, Configure Firebase/env, Run)
7. `## 🔐 Firestore Security Rules` (real o marcado como ejemplo)
8. `## 📖 Usage Guide`
9. `## 🧪 Testing, Quality & CI`
10. `## ☁️ Deployment`
11. `## 🤝 Contributing`
12. `## 📊 Roadmap`
13. `## 📝 License` + footer

> Los emojis y el estilo del README actual pueden conservarse; lo obligatorio es la
> cobertura de secciones y su exactitud, no el wording literal.

## C2. Contrato de exactitud (por afirmación)

- **A1**: Toda variable de entorno citada DEBE existir en `retro-rocket/.env.example`
  y usar el prefijo `VITE_`. Prohibido `REACT_APP_*`.
- **A2**: Todo comando citado DEBE ser un script real de `retro-rocket/package.json`
  (`dev`, `build`, `preview`, `type-check`, `lint`, `test`, `test:coverage`,
  `emulators`, `e2e`, `test:accuracy`) y describirse conforme a lo que hace.
- **A3**: Toda ruta de fichero/carpeta citada DEBE existir en el repo (resuelta desde
  la raíz o desde `retro-rocket/`, sin ambigüedad).
- **A4**: Toda característica/paso de uso descrito DEBE corresponder a una función real
  hoy presente (sin votación 👍/👎 como interacción activa; sin proveedor Apple).
- **A5**: Las dependencias citadas en Tech Stack DEBEN existir en
  `retro-rocket/package.json` (incluye `@react-pdf/renderer`, `docx`,
  `@huggingface/transformers`; excluye `jsPDF`).
- **A6**: El ejemplo/enlace de reglas Firestore DEBE reflejar `retro-rocket/firestore.rules`
  (o enlazarlo) y NO presentar reglas más permisivas como el estado real.
- **A7**: El roadmap NO DEBE listar como pendiente nada ya entregado (CI/CD,
  tests automatizados, cobertura, WCAG/theming).
- **A8**: NO DEBE haber enlaces cuyo destino sea `(#)` (placeholder).
- **A9**: Las capacidades **AI sentiment/team-mood** y **clustering** DEBEN estar
  documentadas en Key Features y/o Usage Guide.

## C3. Contrato de idioma

- **L1**: El 100% del contenido DEBE estar en **inglés**. 0 palabras/frases de prosa
  en español (se toleran nombres propios y `id`s de código citados literalmente).

## C4. Contrato de preservación

- **P1**: El contenido hoy correcto (theming/WCAG con sus rutas, plantillas, selector
  de emoji, participantes, countdown, notas, agrupación) DEBE preservarse traducido,
  sin pérdida de precisión (p. ej. las rutas de theming siguen siendo válidas).

## C5. Verificación (resumen; detalle en quickstart.md)

| Regla | Método de verificación |
|-------|------------------------|
| A1, A5, A8, L1 | `grep` de tokens prohibidos (`REACT_APP_`, `jsPDF`, `](#)`) → 0 coincidencias; muestreo de prosa en español |
| A2 | Cada comando ∈ `package.json` scripts |
| A3 | Cada ruta citada resuelve con `ls`/`test -e` |
| A4, A9 | Revisión contra UI/código (checklist por sección) |
| A6 | Diff conceptual contra `firestore.rules` |
| A7 | Revisión de roadmap contra `.github/workflows/ci.yml` y features entregadas |
| P1 | Rutas de theming siguen existiendo tras la traducción |
