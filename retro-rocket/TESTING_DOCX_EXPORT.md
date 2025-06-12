# 🧪 Guía de Testing - Exportación DOCX

## 📋 **Lista de Verificación Completa**

### **✅ Test 1: Funcionalidad Básica**

**Objetivo:** Verificar que la exportación DOCX básica funciona correctamente.

**Pasos:**
1. Abrir cualquier retrospectiva con contenido
2. Localizar el botón **"Word"** en la cabecera (junto al botón PDF)
3. Hacer clic en el botón "Word"
4. Verificar que se descarga un archivo `.docx`
5. Abrir el archivo con Microsoft Word o Google Docs

**Resultados Esperados:**
- ✅ El archivo se descarga automáticamente
- ✅ El nombre del archivo sigue el patrón: `retrospectiva-[título]-[fecha].docx`
- ✅ El documento se abre correctamente
- ✅ Contiene el título de la retrospectiva
- ✅ Muestra todas las columnas con sus tarjetas
- ✅ Los textos son legibles (sin caracteres extraños)

---

### **✅ Test 2: Opciones de Configuración**

**Objetivo:** Probar el modal de configuración y las opciones de exportación.

**Pasos:**
1. Hacer clic en el icono de **configuración** (⚙️) junto al botón Word
2. Verificar que se abre el modal de opciones
3. Probar todas las combinaciones de checkboxes:
   - ☑️ Incluir lista de participantes
   - ☑️ Incluir estadísticas de votación
   - ☑️ Mostrar detalles de agrupaciones
   - ☑️ Agregar notas del facilitador
4. Escribir texto en el campo "Notas del facilitador"
5. Hacer clic en "Exportar DOCX"

**Resultados Esperados:**
- ✅ Modal se abre y cierra correctamente
- ✅ Checkboxes funcionan adecuadamente
- ✅ Campo de texto para notas aparece/desaparece según selección
- ✅ El documento final incluye solo las secciones seleccionadas
- ✅ Las notas del facilitador aparecen al final del documento

---

### **✅ Test 3: Contenido de Tarjetas**

**Objetivo:** Verificar que todo el contenido de las tarjetas se exporta correctamente.

**Preparación:**
1. Crear tarjetas con:
   - Texto con acentos: "Esta tarjeta tiene acentos: ñ, ú, é, í, ó, á"
   - Diferentes colores de fondo
   - Votos (usar el botón +/-)
   - Likes (hacer clic en ❤️)
   - Reacciones (agregar emojis: 😊, 👍, 🎉, etc.)
   - Diferentes autores

**Pasos de Testing:**
1. Exportar la retrospectiva con todas las opciones habilitadas
2. Abrir el documento generado
3. Verificar cada tarjeta individualmente

**Resultados Esperados:**
- ✅ **Contenido de texto:** Se muestra completo y legible
- ✅ **Caracteres especiales:** ñ, acentos se ven correctamente
- ✅ **Colores de fondo:** Las tarjetas mantienen sus colores
- ✅ **Información del autor:** Aparece el nombre de quien creó la tarjeta
- ✅ **Votos:** Se muestra el número de votos
- ✅ **Likes:** Se indica la cantidad de likes
- ✅ **Reacciones:** Los emojis y sus conteos aparecen correctamente

---

### **✅ Test 4: Agrupaciones de Tarjetas**

**Objetivo:** Probar que las agrupaciones se exportan con la jerarquía correcta.

**Preparación:**
1. Crear varios grupos de tarjetas
2. Asegurarse de tener:
   - Tarjetas principales (head cards)
   - Tarjetas miembro en grupos
   - Tarjetas sueltas (sin agrupar)

**Pasos:**
1. Exportar con "Mostrar detalles de agrupaciones" habilitado
2. Verificar la estructura en el documento

**Resultados Esperados:**
- ✅ **Títulos de grupo:** Aparecen en azul y destacados
- ✅ **Tarjeta principal:** Marcada con `[Principal]`
- ✅ **Indentación:** Las tarjetas del grupo están indentadas
- ✅ **Estadísticas del grupo:** Muestra votos, likes, cantidad de tarjetas
- ✅ **Tarjetas sueltas:** Aparecen sin indentación

---

### **✅ Test 5: Estadísticas**

**Objetivo:** Verificar que la tabla de estadísticas es precisa.

**Pasos:**
1. Contar manualmente:
   - Total de tarjetas en la retrospectiva
   - Total de grupos creados
   - Suma de todos los votos
   - Suma de todos los likes
   - Suma de todas las reacciones
2. Exportar con "Incluir estadísticas" habilitado
3. Comparar los números en la tabla del documento

**Resultados Esperados:**
- ✅ **Tabla bien formateada:** Bordes y encabezados claros
- ✅ **Números precisos:** Coinciden con el conteo manual
- ✅ **Todas las métricas:** Total tarjetas, grupos, votos, likes, reacciones

---

### **✅ Test 6: Participantes**

**Objetivo:** Probar la sección de participantes.

**Preparación:**
1. Asegurarse de que hay múltiples participantes en la retrospectiva
2. Verificar que algunos participantes han creado tarjetas

**Pasos:**
1. Exportar con "Incluir lista de participantes" habilitado
2. Revisar la sección de información de la retrospectiva

**Resultados Esperados:**
- ✅ **Lista completa:** Aparecen todos los participantes
- ✅ **Nombres correctos:** Los nombres se muestran sin errores
- ✅ **Formato adecuado:** Separados por comas y legibles

---

### **✅ Test 7: Encabezado y Pie de Página**

**Objetivo:** Verificar que el documento tiene formato profesional.

**Pasos:**
1. Exportar cualquier retrospectiva
2. Revisar todas las páginas del documento
3. Verificar encabezado y pie de página

**Resultados Esperados:**
- ✅ **Encabezado:** "RetroRocket - Retrospectiva" en azul
- ✅ **Pie de página:** Fecha de generación y número de página
- ✅ **Numeración:** Páginas numeradas correctamente
- ✅ **Consistencia:** Formato igual en todas las páginas

---

### **✅ Test 8: Estados de la UI**

**Objetivo:** Probar los estados de carga, éxito y error.

**Pasos:**
1. Hacer clic en exportar y observar:
   - Estado de carga inicial
   - Barra de progreso
   - Botón deshabilitado durante exportación
   - Mensaje de éxito al completar
2. Simular error (desconectar internet) y verificar mensaje de error

**Resultados Esperados:**
- ✅ **Indicador de carga:** Spinner y texto "Exportando..."
- ✅ **Progreso visual:** Barra de progreso se llena
- ✅ **Botones deshabilitados:** No se puede hacer doble clic
- ✅ **Mensaje de éxito:** Confirmación de exportación exitosa
- ✅ **Manejo de errores:** Mensaje claro en caso de fallo

---

### **✅ Test 9: Compatibilidad de Archivos**

**Objetivo:** Verificar que el archivo .docx es compatible con diferentes aplicaciones.

**Pasos:**
1. Exportar una retrospectiva completa
2. Probar abrir el archivo con:
   - Microsoft Word (si disponible)
   - Google Docs (subir archivo)
   - LibreOffice Writer (si disponible)
   - Vista previa de macOS (si aplica)

**Resultados Esperados:**
- ✅ **Microsoft Word:** Se abre correctamente con formato
- ✅ **Google Docs:** Compatible y editable
- ✅ **LibreOffice:** Formato preservado
- ✅ **Otros visores:** Contenido legible

---

### **✅ Test 10: Casos Extremos**

**Objetivo:** Probar el comportamiento con casos límite.

**Casos a probar:**
1. **Retrospectiva vacía:** Sin tarjetas
2. **Retrospectiva grande:** 30+ tarjetas, múltiples grupos
3. **Texto muy largo:** Tarjetas con párrafos extensos
4. **Caracteres especiales:** Emojis, símbolos, URLs
5. **Nombres largos:** Títulos y participantes con nombres extensos

**Resultados Esperados:**
- ✅ **Retrospectiva vacía:** Genera documento básico sin errores
- ✅ **Retrospectiva grande:** Se mantiene performance y formato
- ✅ **Texto largo:** Se ajusta correctamente sin cortes
- ✅ **Caracteres especiales:** Se manejan adecuadamente
- ✅ **Nombres largos:** No rompen el formato

---

## 🎯 **Criterios de Aprobación**

Para considerar la funcionalidad DOCX como **completamente funcional**, debe cumplir:

### **✅ Funcionalidad Core (Obligatorio)**
- [ ] Exportación básica funciona sin errores
- [ ] Archivo .docx se descarga correctamente
- [ ] Contenido completo de tarjetas exportado
- [ ] Texto en español sin problemas de codificación
- [ ] Compatibilidad con Microsoft Word

### **✅ Características Avanzadas (Obligatorio)**
- [ ] Modal de opciones funcional
- [ ] Agrupaciones con jerarquía correcta
- [ ] Estadísticas precisas
- [ ] Colores de tarjetas preservados
- [ ] Encabezado y pie de página profesional

### **✅ Experiencia de Usuario (Deseable)**
- [ ] Estados de carga claros
- [ ] Mensajes de éxito/error informativos
- [ ] Performance adecuada (< 5 segundos para retrospectivas normales)
- [ ] UI responsiva y accesible

### **✅ Robustez (Crítico)**
- [ ] Manejo de errores sin crashes
- [ ] Casos extremos manejados correctamente
- [ ] No impacta performance de la aplicación
- [ ] Compatible con diferentes navegadores

---

## 🚀 **Resultado Final Esperado**

Al completar todos los tests satisfactoriamente, los usuarios podrán:

1. **Exportar retrospectivas completas** a formato Word profesional
2. **Personalizar el contenido** según sus necesidades
3. **Compartir fácilmente** con stakeholders y equipos
4. **Archivar documentación** de retrospectivas importantes
5. **Integrar en reportes** y presentaciones corporativas

**¡La funcionalidad DOCX está lista para uso en producción!** 📄✨
