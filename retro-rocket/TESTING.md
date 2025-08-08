# 🧪 Testing Guide for RetroRocket

Esta guía describe cómo ejecutar y mantener los tests unitarios para RetroRocket.

## 📋 Índice

- [Configuración](#configuración)
- [Ejecutar Tests](#ejecutar-tests)
- [Estructura de Tests](#estructura-de-tests)
- [Cobertura de Código](#cobertura-de-código)
- [Mejores Prácticas](#mejores-prácticas)
- [Solución de Problemas](#solución-de-problemas)

## 🛠️ Configuración

### Instalar Dependencias de Testing

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom ts-jest @types/jest identity-obj-proxy babel-jest @babel/preset-env @babel/preset-react @babel/preset-typescript
```

### Archivos de Configuración

Los siguientes archivos ya están configurados:

- `jest.config.js` - Configuración principal de Jest
- `babel.config.js` - Configuración de Babel para Jest
- `src/test/setupTests.ts` - Setup global para tests
- `src/test/__mocks__/` - Mocks de librerías externas

## 🚀 Ejecutar Tests

### Comandos Disponibles

```bash
# Ejecutar todos los tests una vez
npm test

# Ejecutar tests en modo watch (reejecutar al cambiar archivos)
npm run test:watch

# Ejecutar tests con reporte de cobertura
npm run test:coverage

# Ejecutar tests en modo CI (sin watch, con cobertura)
npm run test:ci
```

### Ejecutar Tests Específicos

```bash
# Ejecutar tests de un archivo específico
npm test Header.test.tsx

# Ejecutar tests que coincidan con un patrón
npm test --testNamePattern="should render"

# Ejecutar tests de una carpeta específica
npm test src/components/layout/
```

## 📁 Estructura de Tests

### Convención de Nombres

- `ComponentName.test.tsx` - Tests de componentes React
- `hookName.test.ts` - Tests de hooks personalizados
- `serviceName.test.ts` - Tests de servicios y utilidades

### Ubicación de Tests

Los tests se ubican junto al código que prueban:

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Header.test.tsx
│   └── ui/
│       ├── Button.tsx
│       └── Button.test.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useAuth.test.ts
├── services/
│   ├── userService.ts
│   └── userService.test.ts
└── test/
    ├── setupTests.ts
    ├── utils/
    │   └── test-utils.tsx
    └── __mocks__/
        ├── firebase.ts
        ├── react-i18next.tsx
        └── framer-motion.tsx
```

## 📊 Cobertura de Código

### Umbrales Configurados

La configuración actual requiere:

- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Ver Reporte de Cobertura

```bash
# Generar reporte de cobertura
npm run test:coverage

# El reporte se genera en coverage/lcov-report/index.html
open coverage/lcov-report/index.html
```

### Archivos Excluidos

Los siguientes archivos están excluidos de la cobertura:

- Archivos de definición de tipos (`*.d.ts`)
- Archivo principal (`main.tsx`)
- Configuración de Vite (`vite-env.d.ts`)
- Tests (`**/*.test.ts`, `**/*.test.tsx`)
- Directorio de tests (`src/test/**/*`)
- Tipos (`src/types/**/*`)

## ✅ Mejores Prácticas

### Estructura de Tests

```typescript
describe('ComponentName', () => {
  // Setup antes de cada test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when condition', () => {
    it('should behavior', () => {
      // Arrange - Preparar datos
      const props = { /* ... */ };
      
      // Act - Ejecutar acción
      render(<Component {...props} />);
      
      // Assert - Verificar resultado
      expect(screen.getByText('Expected text')).toBeInTheDocument();
    });
  });
});
```

### Queries Recomendadas

Usar en orden de preferencia:

1. **getByRole** - Más accesible
2. **getByLabelText** - Para formularios
3. **getByText** - Para contenido
4. **getByTestId** - Como último recurso

```typescript
// ✅ Recomendado
screen.getByRole('button', { name: /save/i })
screen.getByLabelText(/email address/i)
screen.getByText(/welcome/i)

// ❌ Evitar
screen.getByTestId('save-button')
```

### Mocking

```typescript
// Mock de módulos
jest.mock('../services/firebase', () => ({
  auth: { currentUser: null },
  db: jest.fn(),
}));

// Mock de hooks
jest.mock('../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: null,
    isAuthenticated: false,
  })),
}));
```

## 🐛 Solución de Problemas

### Error: "Cannot find module"

```bash
# Verificar que las dependencias estén instaladas
npm install

# Limpiar cache de Jest
npm test -- --clearCache
```

### Error: "Firebase is not initialized"

Este error es esperado en tests. Los mocks de Firebase están configurados para simular un entorno sin conexión.

### Error: "Window is not defined"

Verificar que `jest-environment-jsdom` esté instalado y configurado en `jest.config.js`.

### Tests Lentos

```bash
# Ejecutar tests específicos en lugar de toda la suite
npm test -- --testPathPattern=Header

# Usar watch mode para desarrollo
npm run test:watch
```

### Problemas de Importación

Verificar la configuración de `moduleNameMapping` en `jest.config.js` para alias de rutas.

## 📝 Comandos Útiles

### Debug de Tests

```bash
# Ejecutar con output detallado
npm test -- --verbose

# Ejecutar un solo test
npm test -- --testNamePattern="specific test name"

# Ver qué archivos se están ejecutando
npm test -- --listTests
```

### Actualizar Snapshots

```bash
# Actualizar todos los snapshots
npm test -- --updateSnapshot

# Actualizar snapshots de un archivo específico
npm test Header.test.tsx -- --updateSnapshot
```

## 🎯 Tests Implementados

### Componentes ✅

- [x] `Header` - Navegación y menú de usuario
- [x] `RetrospectiveCard` - Tarjetas de retrospectiva
- [x] `LanguageSelector` - Selector de idioma
- [x] `Button` - Componente de botón básico

### Hooks ✅

- [x] `useAuth` - Autenticación
- [x] `useCurrentUser` - Usuario actual

### Servicios ✅

- [x] `ActionItemsService` - Gestión de elementos de acción
- [x] `UserService` - Gestión de usuarios

### Pendientes 📋

- [ ] `RetrospectiveBoard` - Tablero principal
- [ ] `ActionItemsColumn` - Columna de elementos de acción
- [ ] `useCards` - Gestión de tarjetas
- [ ] `useActionItems` - Gestión de elementos de acción
- [ ] `exportService` - Servicios de exportación
- [ ] Tests de integración

## 🚀 Siguientes Pasos

1. **Completar cobertura de componentes principales**
2. **Implementar tests de hooks complejos**
3. **Añadir tests de integración**
4. **Configurar CI/CD con tests automáticos**
5. **Implementar tests end-to-end con Playwright**

---

Para más información sobre testing con React Testing Library, consultar la [documentación oficial](https://testing-library.com/docs/react-testing-library/intro/).
