# 🧪 Guía de Pruebas - Exportación PDF de Retrospectivas

## 📋 **CHECKLIST DE PRUEBAS COMPLETAS**

### **✅ Pruebas Básicas de Funcionalidad**

#### **1. Visibilidad del Botón de Exportación**
- [ ] **Desktop (1024px+)**: Botón visible en header de retrospectiva
- [ ] **Tablet (768px-1023px)**: Botón visible pero compacto
- [ ] **Mobile (< 768px)**: Botón oculto correctamente
- [ ] **Sin tarjetas**: Botón deshabilitado con mensaje apropiado
- [ ] **Con tarjetas**: Botón habilitado y funcional

#### **2. Exportación Rápida (Un Clic)**
- [ ] **Click en "Exportar PDF"**: Inicia descarga inmediata
- [ ] **Indicador de progreso**: Muestra "Cargando..." durante generación
- [ ] **Descarga automática**: Archivo PDF se descarga al completarse
- [ ] **Notificación de éxito**: Mensaje verde aparece por 3 segundos
- [ ] **Nombre de archivo**: Formato `retrospectiva-[título]-[fecha].pdf`

#### **3. Modal de Opciones Avanzadas**
- [ ] **Click en icono ⚙️**: Abre modal de configuración
- [ ] **Opciones por defecto**: Todas marcadas inicialmente
- [ ] **Toggle opciones**: Checkboxes funcionan correctamente
- [ ] **Botón "Cancelar"**: Cierra modal sin exportar
- [ ] **Botón "Exportar PDF"**: Procesa con opciones seleccionadas

### **✅ Pruebas de Contenido del PDF**

#### **4. Estructura del Documento**
- [ ] **Header**: Logo RetroRocket y título de retrospectiva presentes
- [ ] **Información**: Fecha de exportación y creación correctas
- [ ] **Participantes**: Lista aparece cuando opción está habilitada
- [ ] **Estadísticas**: Conteos correctos de tarjetas, grupos, votos
- [ ] **Footer**: Numeración de páginas y timestamp presentes

#### **5. Contenido por Columnas**
**Para cada columna ("Qué me ayudó", "Qué me retrasó", "Qué podemos hacer mejor"):**

- [ ] **Título de columna**: Icono y nombre correctos
- [ ] **Descripción**: Texto descriptivo de la columna
- [ ] **Grupos expandidos**: Tarjetas agrupadas con indentación
- [ ] **Tarjeta principal**: Marcada como "✨ Principal"
- [ ] **Tarjetas miembro**: Indentadas con líneas de conexión
- [ ] **Tarjetas individuales**: No agrupadas mostradas normalmente

#### **6. Metadatos de Tarjetas**
- [ ] **Contenido**: Texto completo de cada tarjeta
- [ ] **Autor**: Nombre del creador de la tarjeta
- [ ] **Votos**: Conteo correcto de votos (👍)
- [ ] **Likes**: Conteo correcto de likes (❤️)
- [ ] **Reacciones**: Conteo correcto de reacciones (😊)
- [ ] **Colores**: Fondos de tarjetas mantienen color original

### **✅ Pruebas de Agrupaciones**

#### **7. Grupos Sin Título Personalizado**
- [ ] **Título automático**: "Grupo de X tarjetas"
- [ ] **Estadísticas de grupo**: Totales de votos/likes correctos
- [ ] **Jerarquía visual**: Principal destacada, miembros indentados
- [ ] **Orden correcto**: Tarjetas en el orden esperado

#### **8. Grupos Con Título Personalizado**
- [ ] **Título personalizado**: Se muestra en lugar del genérico
- [ ] **Preservación**: Título se mantiene igual al del panel
- [ ] **Formato**: Texto se ajusta correctamente al ancho de página

### **✅ Pruebas de Escenarios Complejos**

#### **9. Retrospectiva Grande (30+ tarjetas)**
- [ ] **Múltiples páginas**: Contenido se distribuye correctamente
- [ ] **Saltos de página**: No corta tarjetas a la mitad
- [ ] **Numeración**: Páginas numeradas correctamente
- [ ] **Performance**: Exportación completa en <10 segundos

#### **10. Retrospectiva Con Muchos Grupos**
- [ ] **Múltiples grupos por columna**: Todos aparecen en PDF
- [ ] **Estadísticas agregadas**: Cálculos correctos por grupo
- [ ] **Espaciado**: Separación adecuada entre grupos
- [ ] **Legibilidad**: Estructura jerárquica clara

#### **11. Contenido Especial**
- [ ] **Texto largo**: Tarjetas con mucho texto se ajustan
- [ ] **Caracteres especiales**: Emojis y símbolos se preservan
- [ ] **Nombres largos**: Nombres de usuarios largos se manejan
- [ ] **Títulos largos**: Títulos de retrospectiva largos se ajustan

### **✅ Pruebas de Configuración**

#### **12. Opciones de Exportación**
**Con "Incluir participantes" DESHABILITADO:**
- [ ] **Sin sección de participantes**: No aparece en el PDF
- [ ] **Conteo**: Estadística general sigue apareciendo

**Con "Incluir estadísticas" DESHABILITADO:**
- [ ] **Sin estadísticas**: Sección de estadísticas omitida
- [ ] **Contenido directo**: Va directo a columnas

**Con "Incluir detalles de grupos" DESHABILITADO:**
- [ ] **Sin estadísticas de grupo**: Solo títulos de grupos
- [ ] **Estructura preservada**: Agrupaciones siguen visibles

#### **13. Combinaciones de Opciones**
- [ ] **Todas deshabilitadas**: PDF mínimo solo con tarjetas
- [ ] **Solo participantes**: PDF con participantes únicamente
- [ ] **Solo estadísticas**: PDF con estadísticas únicamente
- [ ] **Combinaciones mixtas**: Funcionan según selección

### **✅ Pruebas de Error y Edge Cases**

#### **14. Manejo de Errores**
- [ ] **Sin conexión**: Error apropiado si no hay internet
- [ ] **Datos corruptos**: Manejo graceful de datos inválidos
- [ ] **Memoria limitada**: No falla con retrospectivas muy grandes
- [ ] **Timeout**: No se cuelga indefinidamente

#### **15. Edge Cases**
- [ ] **Retrospectiva vacía**: PDF con mensaje apropiado
- [ ] **Solo grupos sin tarjetas**: Manejo correcto
- [ ] **Tarjetas sin autor**: Se muestra "Anónimo" o similar
- [ ] **Fechas inválidas**: Formateo seguro de fechas

### **✅ Pruebas de Compatibilidad**

#### **16. Navegadores**
- [ ] **Chrome**: Descarga y visualización correcta
- [ ] **Firefox**: Funciona sin problemas
- [ ] **Safari**: Compatible en macOS
- [ ] **Edge**: Funciona en Windows

#### **17. Dispositivos**
- [ ] **Windows**: PDF se abre con lector predeterminado
- [ ] **macOS**: Compatible con Preview y otros lectores
- [ ] **iOS**: Se puede abrir en dispositivos móviles
- [ ] **Android**: Accesible en tabletas y teléfonos

## 🧪 **ESCENARIOS DE PRUEBA ESPECÍFICOS**

### **Escenario 1: Retrospectiva Típica**
```
📊 Datos de prueba:
- 12-15 tarjetas distribuidas en 3 columnas
- 2-3 grupos por columna
- 4-5 participantes
- Mezcla de tarjetas con/sin votos y likes

🎯 Resultado esperado:
- PDF de 2-3 páginas
- Estructura clara y legible
- Todos los datos presentes
- Descarga en <5 segundos
```

### **Escenario 2: Retrospectiva Compleja**
```
📊 Datos de prueba:
- 30+ tarjetas por columna
- 5+ grupos con títulos personalizados
- 10+ participantes
- Tarjetas con contenido extenso

🎯 Resultado esperado:
- PDF de 5+ páginas
- Saltos de página apropiados
- Títulos de grupos preservados
- Performance aceptable (<15 segundos)
```

### **Escenario 3: Retrospectiva Mínima**
```
📊 Datos de prueba:
- 3-5 tarjetas sin agrupar
- 1-2 participantes
- Sin votos ni reacciones

🎯 Resultado esperado:
- PDF de 1 página
- Contenido centrado y bien distribuido
- Información básica presente
- Descarga inmediata
```

## 📱 **PRUEBAS DE USABILIDAD**

### **18. Experiencia de Usuario**
- [ ] **Intuitividad**: Usuario encuentra fácilmente el botón
- [ ] **Claridad**: Opciones de configuración son comprensibles
- [ ] **Feedback**: Estados de carga y éxito son claros
- [ ] **Accesibilidad**: Funciona con lectores de pantalla

### **19. Flujo Completo**
1. [ ] **Crear retrospectiva** con contenido variado
2. [ ] **Agregar participantes** al panel
3. [ ] **Crear tarjetas** en diferentes columnas
4. [ ] **Agrupar algunas tarjetas** manualmente
5. [ ] **Votar y reaccionar** a tarjetas
6. [ ] **Exportar con configuración por defecto**
7. [ ] **Verificar PDF generado** tiene todo el contenido
8. [ ] **Exportar con opciones personalizadas**
9. [ ] **Comparar ambos PDFs** para diferencias

## ✅ **CRITERIOS DE ACEPTACIÓN**

**La funcionalidad se considera EXITOSA si:**

- ✅ **Funcionalidad básica**: Botón exporta PDF correctamente
- ✅ **Contenido completo**: Toda la información aparece en PDF
- ✅ **Formato profesional**: PDF es legible y bien estructurado
- ✅ **Configurabilidad**: Opciones funcionan como se especifica
- ✅ **Robustez**: No hay errores críticos en casos comunes
- ✅ **Performance**: Exportación completa en tiempo razonable
- ✅ **Accesibilidad**: Cumple con estándares básicos
- ✅ **Compatibilidad**: Funciona en navegadores principales

**🏆 ¡La funcionalidad está lista cuando todas las pruebas pasan exitosamente!**
