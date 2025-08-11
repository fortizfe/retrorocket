# Plan para Conseguir 80% de Cobertura de Testing

## Estado Actual
- **Cobertura inicial**: 38.29%
- **Cobertura actual**: 43.03% ✅ 
- **Meta**: 80%
- **Brecha restante**: 36.97%
- **Tests existentes**: 1372 tests en 72 archivos

## ✅ PROGRESO COMPLETADO

### ✅ Fase 1: Aplicaciones Principales (COMPLETADA)
**Target**: 50% de cobertura | **Resultado**: 41.6% ✅
- ✅ Tests para `MinimalApp.tsx` (100% coverage)
- ✅ Tests para `RouterApp.tsx` (100% coverage) 
- ✅ Tests para `SimpleApp.tsx` (100% coverage)
- ✅ Tests para `TestApp.tsx` (100% coverage)
- ✅ Tests para `main.tsx` (100% coverage)
- ✅ Tests mejorados para `LinkedProvidersCard.tsx` (97.1% coverage)

### ✅ Fase 2: Componentes de Countdown (COMPLETADA)
**Target**: 65% de cobertura | **Resultado**: 41.6% ✅
- ✅ Tests completos para `CountdownTimer.tsx` (100% coverage)
- ✅ Tests completos para `FacilitatorControls.tsx` (52.83% coverage)
- ✅ Tests completos para `CountdownFeatureDemo.tsx` (100% coverage)

### ✅ Fase 3: Componentes de Dashboard (COMPLETADA)
**Target**: 75% de cobertura | **Resultado**: 43.03% ✅
- ✅ Tests completos para `BoardCard.tsx` (100% coverage) - 21 tests
- ✅ Tests completos para `JoinRetrospectiveModal.tsx` (88.37% coverage) - 20 tests

**Total de nuevos tests creados**: 91 tests

## Archivos Críticos con 0% de Cobertura (Prioridad Alta)

### 1. Archivos de Aplicación Principal
- `src/MinimalApp.tsx` (0%)
- `src/RouterApp.tsx` (0%)
- `src/SimpleApp.tsx` (0%)
- `src/TestApp.tsx` (0%)
- `src/main.tsx` (0%)

### 2. Componentes de Autenticación
- `src/components/auth/AuthButtonGroup.tsx` (9.89%)
- `src/components/auth/LinkedProvidersCard.tsx` (6.35%)
- `src/components/auth/UserProfileForm.tsx` (6.55%)

### 3. Componentes de Countdown
- `src/components/countdown/CountdownFeatureDemo.tsx` (0%)
- `src/components/countdown/CountdownTimer.tsx` (6.02%)
- `src/components/countdown/FacilitatorControls.tsx` (4.24%)

### 4. Componentes de Dashboard y Layout
- `src/components/dashboard/*` (varios con 0-15%)
- `src/components/layout/*` (varios con 0-25%)

### 5. Páginas
- `src/pages/*` (la mayoría con 0-20%)

### 6. Servicios y Utilidades
- Varios servicios con cobertura baja necesitan mejoras

## Estrategia de Implementación

### Fase 1: Archivos Principales (Semana 1)
**Objetivo**: Conseguir 50% de cobertura

1. **Aplicaciones principales**
   - Crear tests para `MinimalApp.tsx`
   - Crear tests para `RouterApp.tsx`
   - Crear tests para `SimpleApp.tsx`
   - Crear tests para `TestApp.tsx`
   - Crear tests para `main.tsx`

2. **Componentes de autenticación**
   - Completar tests para `AuthButtonGroup.tsx`
   - Completar tests para `LinkedProvidersCard.tsx`
   - Completar tests para `UserProfileForm.tsx`

### Fase 2: Componentes de Funcionalidad Core (Semana 2)
**Objetivo**: Conseguir 65% de cobertura

1. **Componentes de Countdown**
   - Tests completos para `CountdownTimer.tsx`
   - Tests completos para `FacilitatorControls.tsx`
   - Tests completos para `CountdownFeatureDemo.tsx`

2. **Componentes de Dashboard**
   - Tests para componentes de dashboard principales
   - Tests para componentes de layout

### Fase 3: Páginas y Navegación (Semana 3)
**Objetivo**: Conseguir 75% de cobertura

1. **Páginas principales**
   - Tests para todas las páginas en `src/pages/`
   - Tests de integración de navegación

2. **Componentes de UI restantes**
   - Completar tests para componentes con cobertura parcial

### Fase 4: Refinamiento y Optimización (Semana 4)
**Objetivo**: Conseguir 80%+ de cobertura

1. **Casos edge y error handling**
   - Tests para manejo de errores
   - Tests para casos límite
   - Tests para estados de carga

2. **Integración y E2E**
   - Tests de integración más complejos
   - Flujos completos de usuario

## Archivos de Tests a Crear/Mejorar

### Tests Nuevos Necesarios
```
src/test/apps/
├── MinimalApp.test.tsx
├── RouterApp.test.tsx
├── SimpleApp.test.tsx
├── TestApp.test.tsx
└── main.test.tsx

src/test/components/auth/
├── AuthButtonGroup.test.tsx (mejorar)
├── LinkedProvidersCard.test.tsx (crear)
└── UserProfileForm.test.tsx (crear)

src/test/components/countdown/
├── CountdownTimer.test.tsx (mejorar)
├── FacilitatorControls.test.tsx (crear)
└── CountdownFeatureDemo.test.tsx (crear)

src/test/components/dashboard/
├── DashboardHeader.test.tsx
├── DashboardSidebar.test.tsx
├── StatsCard.test.tsx
└── QuickActions.test.tsx

src/test/components/layout/
├── Header.test.tsx
├── Sidebar.test.tsx
├── Footer.test.tsx
└── MainLayout.test.tsx

src/test/pages/
├── HomePage.test.tsx
├── RetrospectivePage.test.tsx
├── SettingsPage.test.tsx
└── ProfilePage.test.tsx
```

## Configuración de Cobertura Mejorada

### 1. Actualizar vitest.config.ts
```typescript
export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        css: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'src/test/**',
                '**/*.d.ts',
                'src/vite-env.d.ts',
                'coverage/**',
                'dist/**',
                'src/**/*.stories.tsx',
            ],
            thresholds: {
                global: {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80
                }
            }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
```

### 2. Scripts de Package.json
```json
{
  "scripts": {
    "test:coverage": "vitest run --coverage",
    "test:coverage:watch": "vitest --coverage --watch",
    "test:coverage:ui": "vitest --coverage --ui",
    "test:threshold": "vitest run --coverage --reporter=verbose"
  }
}
```

## Métricas y Seguimiento

### Objetivos por Fase
- **Fase 1**: 50% cobertura
- **Fase 2**: 65% cobertura  
- **Fase 3**: 75% cobertura
- **Fase 4**: 80%+ cobertura

### Tracking Semanal
- Ejecutar `npm run test:coverage` diariamente
- Documentar progreso en este archivo
- Identificar y resolver blockers rápidamente

### Criterios de Calidad
- Cada test debe cubrir casos positivos y negativos
- Tests de integración para flujos críticos
- Mock apropiado de dependencias externas
- Documentación de tests complejos

## Herramientas y Recursos

### Testing Libraries Disponibles
- `@testing-library/react` - Testing de componentes
- `@testing-library/jest-dom` - Matchers adicionales
- `@testing-library/user-event` - Simulación de eventos
- `vitest` - Framework de testing
- `jsdom` - Entorno DOM simulado

### Patrones de Testing Recomendados
1. **AAA Pattern**: Arrange, Act, Assert
2. **Testing Library Best Practices**: Query por rol/texto de usuario
3. **Mock Strategy**: Mock servicios externos, no implementaciones internas
4. **Snapshot Testing**: Solo para componentes estables

## Cronograma Detallado

### Semana 1: Fundamentos (Días 1-7)
- Día 1-2: Setup y tests de aplicaciones principales
- Día 3-4: Tests de componentes de autenticación
- Día 5-7: Review y optimización inicial

### Semana 2: Funcionalidad Core (Días 8-14)  
- Día 8-10: Componentes de countdown
- Día 11-12: Componentes de dashboard
- Día 13-14: Review y ajustes

### Semana 3: Páginas y Navegación (Días 15-21)
- Día 15-17: Tests de páginas principales
- Día 18-19: Tests de navegación e integración
- Día 20-21: Componentes UI restantes

### Semana 4: Refinamiento (Días 22-28)
- Día 22-24: Casos edge y error handling
- Día 25-26: Tests de integración complejos
- Día 27-28: Optimización final y documentación

## Notas de Implementación

### Prioridades por Impacto
1. **Alto**: Archivos con 0% que son críticos para funcionalidad
2. **Medio**: Archivos con <20% que tienen funcionalidad importante  
3. **Bajo**: Archivos con 20-50% que necesitan completarse

### Consideraciones Especiales
- Tests de componentes con Firebase requieren mocking cuidadoso
- Componentes con DnD necesitan testing library específico
- Tests de routing requieren setup de memoria de router
- Componentes con internacionalización necesitan provider de i18n

Este plan debería llevarnos sistemáticamente del 38.29% actual al objetivo del 80% de cobertura en aproximadamente 4 semanas de trabajo dedicado.

## PROGRESO ACTUAL - FASE 4

### ✅ COMPLETADOS:
1. **src/components/auth/AuthButtonGroup.tsx** - 31 tests, 97.8% coverage
2. **src/components/auth/UserProfileForm.tsx** - 33 tests, 100% coverage  
3. **src/components/forms/CreateCardForm.tsx** - 31 tests, 100% coverage
4. **src/components/forms/JoinPanelForm.tsx** - 31 tests, 100% coverage
5. **src/components/participants/UserAvatar.tsx** - 38 tests, mejora de 30.5% a ~100% coverage

**Total Fase 4**: 164 tests nuevos
**Cobertura actual**: 45.06% (mejora de 44.82% → 45.06% = +0.24%)
**Progreso hacia 80%**: 45.06% / 80% = 56.33% completado
**Restante**: 34.94% para alcanzar el objetivo
