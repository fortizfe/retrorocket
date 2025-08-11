# Plan Optimizado para 80% de Cobertura

## 📊 Estado Actual (Agosto 2025)
- **Cobertura actual**: 49.71% 
- **Meta objetivo**: 80%
- **Brecha a cubrir**: 30.29%
- **Tests existentes**: 1,729 tests en 84 archivos ✅

## 🎯 Análisis de Impacto por Área

### 🔴 CRÍTICO - 0% Cobertura (Impacto Alto)
1. **Main Entry Point**
   - `main.tsx` (0% - 12 líneas sin cubrir)

2. **Archivos de testing/utilidad raíz** 
   - `.babelrc.js`, test scripts varios (257 líneas sin cubrir)

3. **Componentes Retrospective Major**
   - `DocxExporter.tsx` (0% - 492 líneas)
   - `PdfExporter.tsx` (0% - 404 líneas) 
   - `UnifiedExporter.tsx` (0% - 775 líneas)
   - `DragDropColumn.tsx` (5.88%)
   - `RetrospectiveBoard.tsx` (7.6%)
   - `GroupableColumn.tsx` (5.78%)

4. **Páginas principales**
   - `Home.tsx` (0%)
   - `Home-new.tsx` (0%)
   - `Dashboard.tsx` (7.88%)
   - `RetrospectivePage.tsx` (7.54%)
   - `Landing.tsx` (4.48%)
   - `Profile.tsx` (7.4%)

5. **Hooks críticos**
   - `useCardColors.ts` (0%)
   - `useColumnSortGroup.ts` (0%)
   - `useExportDocx.ts` (0%)
   - `useExportPdf.ts` (0%)
   - `useFirestore.ts` (0%)

### 🟡 MEDIO - Baja cobertura (20-60%)
1. **Contextos**
   - `UserContext.tsx` (15.33% - 335 líneas)
   - `TypingProvider.tsx` (19.23%)

2. **Servicios importantes**
   - `accountLinking.ts` (14.32% - 582 líneas)
   - `docxExportService.ts` (16.19% - 671 líneas)
   - `authProvider.ts` (54.28%)

3. **Hooks con funcionalidad importante**
   - Múltiples hooks con 0-20% cobertura

## 🚀 Plan de Ejecución por Prioridad

### FASE 1: Quick Wins (1-2 días) - Objetivo: 55%
**Archivos pequeños con alto impacto**

1. **main.tsx** (12 líneas) ⚡
   ```typescript
   // Test básico de inicialización
   // Mock de ReactDOM.createRoot
   // Test de rendering de App
   ```

2. **Páginas principales** (1,102 líneas totales) 🎯
   ```bash
   src/test/pages/
   ├── Home.test.tsx - tests básicos de rendering
   ├── Dashboard.test.tsx - tests de navegación
   ├── RetrospectivePage.test.tsx - tests de carga
   ├── Landing.test.tsx - tests de componentes
   └── Profile.test.tsx - tests de perfil
   ```

3. **Hooks críticos simples** ⚡
   ```bash
   - useCardColors.ts - tests de utils de colores
   - useAuth.ts - mock de Firebase auth
   - useCurrentUser.ts - tests de contexto
   ```

### FASE 2: Componentes Core (3-4 días) - Objetivo: 65%  
**Componentes retrospectivos con funcionalidad esencial**

1. **RetrospectiveBoard.tsx** (239 líneas) 🎯
   ```typescript
   // Tests de rendering de tablero
   // Tests de drag & drop (mocked)
   // Tests de estados de carga
   // Tests de interacciones básicas
   ```

2. **DragDropColumn.tsx** (183 líneas) 🎯
   ```typescript
   // Tests con dnd-kit mocked
   // Tests de reordenamiento
   // Tests de estados de drag
   ```

3. **GroupableColumn.tsx** (414 líneas) 🎯
   ```typescript
   // Tests de agrupación
   // Tests de expansión/colapso
   // Tests de interacciones de grupo
   ```

### FASE 3: Exporters & Services (3-4 días) - Objetivo: 72%
**Funcionalidad de exportación y servicios críticos**

1. **DocxExporter.tsx** (492 líneas) 📄
   ```typescript
   // Mock de docx library
   // Tests de generación de documento
   // Tests de estructura de contenido
   // Tests de manejo de errores
   ```

2. **PdfExporter.tsx** (404 líneas) 📄
   ```typescript
   // Mock de jsPDF y html2canvas
   // Tests de generación PDF
   // Tests de captura de contenido
   ```

3. **UnifiedExporter.tsx** (775 líneas) 📄
   ```typescript
   // Tests de selección de formato
   // Tests de flujo de exportación
   // Tests de UI de exportación
   ```

4. **accountLinking.ts** (582 líneas) 🔗
   ```typescript
   // Mock de Firebase Auth
   // Tests de vinculación de cuentas
   // Tests de manejo de errores
   ```

### FASE 4: Context & Advanced Features (2-3 días) - Objetivo: 80%+
**Contextos y funcionalidades avanzadas**

1. **UserContext.tsx** (335 líneas) 👤
   ```typescript
   // Tests de provider
   // Tests de estado de usuario
   // Tests de persistencia
   ```

2. **Hooks avanzados** 🎣
   ```typescript
   // useFirestore.ts - mock de Firestore
   // useExportDocx.ts, useExportPdf.ts
   // useParticipants.ts, useTypingStatus.ts
   ```

3. **Componentes UI avanzados** 🎨
   ```typescript
   // EmojiReactions.tsx
   // TypingPreview.tsx
   // TextareaWithEmoji.tsx
   ```

## 📝 Templates de Tests Optimizados

### Template Main.tsx
```typescript
import { describe, it, expect, vi } from 'vitest';

// Mock ReactDOM antes de importar
vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
    unmount: vi.fn(),
  })),
}));

// Mock App component
vi.mock('./App', () => ({
  default: () => <div data-testid="app">App</div>,
}));

describe('main.tsx', () => {
  it('should create root and render App', async () => {
    const { createRoot } = await import('react-dom/client');
    await import('./main');
    
    expect(createRoot).toHaveBeenCalledWith(
      expect.any(Element)
    );
  });
});
```

### Template Página Básica
```typescript
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import HomePage from '../HomePage';

// Mock componentes pesados
vi.mock('../components/expensive-component', () => ({
  default: () => <div data-testid="mocked-component" />
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('HomePage', () => {
  it('renders without crashing', () => {
    renderWithRouter(<HomePage />);
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  it('displays main content', () => {
    renderWithRouter(<HomePage />);
    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });
});
```

### Template Exporter
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import DocxExporter from '../DocxExporter';

// Mock docx library
vi.mock('docx', () => ({
  Document: vi.fn(),
  Packer: {
    toBlob: vi.fn(() => Promise.resolve(new Blob())),
  },
  Paragraph: vi.fn(),
  TextRun: vi.fn(),
}));

// Mock file-saver
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

describe('DocxExporter', () => {
  const mockData = {
    title: 'Test Retrospective',
    cards: [{ id: '1', text: 'Test card' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders export button', () => {
    render(<DocxExporter data={mockData} />);
    expect(screen.getByText(/export/i)).toBeInTheDocument();
  });

  it('generates document on export', async () => {
    render(<DocxExporter data={mockData} />);
    
    const exportBtn = screen.getByText(/export/i);
    await userEvent.click(exportBtn);
    
    expect(Document).toHaveBeenCalled();
  });
});
```

## ⚡ Comandos de Ejecución

### Scripts para desarrollo rápido
```bash
# Test específicos por área
npm run test:coverage -- src/test/pages/
npm run test:coverage -- src/test/components/retrospective/
npm run test:coverage -- src/test/hooks/

# Watch mode para desarrollo
npm run test:coverage:watch

# Check de threshold específico
npm run test:threshold

# Análisis de cobertura detallado
npx vitest run --coverage --reporter=verbose
```

### Tracking automático
```bash
# Script para tracking diario
./track-coverage.sh > coverage-progress.log

# Ver progreso específico
grep "All files" coverage-progress.log | tail -5
```

## 🎯 Métricas Objetivo Detalladas

| Fase | Días | Cobertura | Componentes Clave | Líneas Cubiertas |
|------|------|-----------|-------------------|------------------|
| Actual | - | 49.71% | - | 8,239/16,572 |
| Fase 1 | 1-2 | 55% | Pages + main.tsx | +900 líneas |
| Fase 2 | 3-4 | 65% | Retrospective core | +1,600 líneas |
| Fase 3 | 3-4 | 72% | Exporters + Services | +2,100 líneas |
| Fase 4 | 2-3 | 80%+ | Context + Advanced | +1,300 líneas |

## 🔧 Optimizaciones de Performance

### Mocking Strategy
```typescript
// Mock pesado una vez por archivo
vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock Firebase de forma global
vi.mock('../services/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
}));
```

### Test Utils Compartidos
```typescript
// src/test/utils/test-utils.tsx
export const renderWithProviders = (
  component: React.ReactElement,
  options = {}
) => {
  return render(
    <BrowserRouter>
      <UserProvider>
        <I18nextProvider i18n={i18n}>
          {component}
        </I18nextProvider>
      </UserProvider>
    </BrowserRouter>,
    options
  );
};
```

## 📈 Cronograma de Implementación

### Semana 1: Fundamentos (Fase 1-2)
- **Lunes**: main.tsx + Home/Landing pages
- **Martes**: Dashboard + Profile pages  
- **Miércoles**: RetrospectivePage + basic hooks
- **Jueves**: RetrospectiveBoard component
- **Viernes**: DragDropColumn + GroupableColumn

### Semana 2: Core Features (Fase 3-4)
- **Lunes**: DocxExporter component
- **Martes**: PdfExporter component
- **Miércoles**: UnifiedExporter + accountLinking service
- **Jueves**: UserContext + advanced hooks
- **Viernes**: Refinamiento y optimización

**Resultado esperado**: 80%+ cobertura en 10 días laborales

## 🏆 Criterios de Éxito

1. **Cobertura global**: ≥80%
2. **Cobertura por función**: ≥75%
3. **Cobertura por rama**: ≥75%
4. **Tests estables**: 100% passing
5. **Performance**: Tests ejecutan en <30s
6. **Mantenibilidad**: Mocks bien organizados

Este plan optimizado se enfoca en el máximo impacto con mínimo esfuerzo, priorizando archivos grandes con 0% cobertura sobre optimizaciones menores.
