# 🧪 Demo y Testing de RetroRocket

## Modo Demo (Sin Firebase)

Para probar la aplicación sin configurar Firebase, usa las credenciales demo incluidas en `.env`.

La aplicación funcionará con datos mock y almacenamiento local.

## Tests Manuales

### 1. Crear Retrospectiva
- [ ] Ve a la página principal
- [ ] Ingresa tu nombre
- [ ] Escribe un título para la retrospectiva
- [ ] Haz clic en "Crear Retrospectiva"
- [ ] Verifica que se genere un ID único
- [ ] Confirma que puedes compartir el enlace

### 2. Unirse a Retrospectiva
- [ ] Copia el ID de una retrospectiva existente
- [ ] Abre otra ventana/pestaña
- [ ] Ingresa tu nombre (diferente)
- [ ] Pega el ID de la retrospectiva
- [ ] Haz clic en "Unirse"
- [ ] Verifica que apareces en la lista de participantes

### 3. Crear Tarjetas
- [ ] En cada columna, haz clic en "Agregar"
- [ ] Escribe contenido para la tarjeta
- [ ] Haz clic en "Crear tarjeta"
- [ ] Verifica que la tarjeta aparece inmediatamente
- [ ] Confirma que muestra tu nombre como autor

### 4. Interacciones con Tarjetas
- [ ] Vota en tarjetas (tuyas y de otros)
- [ ] Edita una tarjeta propia
- [ ] Intenta editar una tarjeta de otro (debe estar deshabilitado)
- [ ] Elimina una tarjeta propia
- [ ] Verifica que los cambios se reflejan en tiempo real

### 5. Colaboración en Tiempo Real
- [ ] Con múltiples ventanas abiertas
- [ ] Crea una tarjeta en una ventana
- [ ] Verifica que aparece en las otras ventanas
- [ ] Vota en una tarjeta desde otra ventana
- [ ] Confirma que el contador se actualiza en tiempo real

### 6. Funcionalidades de UI
- [ ] Prueba la aplicación en móvil
- [ ] Verifica que las animaciones funcionan
- [ ] Prueba los estados de carga
- [ ] Confirma que los errores se muestran apropiadamente
- [ ] Verifica que los tooltips y feedback visual funcionan

## Testing con Firebase Real

### Prerequisitos
- Proyecto Firebase configurado
- Variables de entorno reales en `.env`
- Reglas de Firestore apropiadas

### Tests de Persistencia
- [ ] Crea una retrospectiva
- [ ] Cierra el navegador
- [ ] Abre la retrospectiva con el mismo ID
- [ ] Verifica que los datos persisten
- [ ] Confirma que puedes continuar trabajando

### Tests de Rendimiento
- [ ] Crea 20+ tarjetas
- [ ] Verifica que la aplicación sigue siendo responsiva
- [ ] Prueba con múltiples participantes simultáneos
- [ ] Confirma que no hay retrasos notables

## Datos de Prueba

### Nombres de Participantes de Prueba
- Ana García (Product Owner)
- Carlos López (Scrum Master)
- Elena Martín (Developer)
- Javier Ruiz (Designer)
- Laura Sánchez (QA Tester)

### Ejemplos de Tarjetas

#### Qué me ayudó
- "Las daily meetings cortas y enfocadas"
- "La documentación técnica actualizada"
- "El pair programming en tareas complejas"
- "La comunicación proactiva del equipo"

#### Qué me retrasó
- "Dependencias externas no resueltas a tiempo"
- "Requisitos poco claros al inicio del sprint"
- "Problemas de rendimiento en el entorno de testing"
- "Reuniones sin agenda definida"

#### Qué podemos hacer mejor
- "Definir criterios de aceptación más específicos"
- "Implementar tests automatizados desde el principio"
- "Mejorar la estimación de tareas técnicas"
- "Establecer un proceso de code review más estructurado"

## Checklist de Producción

Antes de desplegar a producción:

- [ ] Firebase configurado con reglas de seguridad apropiadas
- [ ] Variables de entorno configuradas en Vercel
- [ ] Tests manuales completados exitosamente
- [ ] Verificación de rendimiento realizada
- [ ] Documentación actualizada
- [ ] Backup de configuración realizado

## Reportar Problemas

Si encuentras bugs o problemas:

1. Describe el comportamiento esperado vs actual
2. Incluye pasos para reproducir el problema
3. Especifica navegador y versión
4. Adjunta capturas de pantalla si es relevante
5. Incluye logs de la consola del navegador

¡Gracias por probar RetroRocket! 🚀
