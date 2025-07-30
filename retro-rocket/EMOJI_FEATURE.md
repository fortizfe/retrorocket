# Funcionalidad de Emoticonos en Tarjetas

## Descripción

Se ha implementado una nueva funcionalidad que permite a los participantes añadir emoticonos a sus tarjetas durante las retrospectivas. Esta funcionalidad mejora la expresividad y el engagement de los participantes.

## Componentes Nuevos

### EmojiPicker
- **Ubicación**: `src/components/ui/EmojiPicker.tsx`
- **Funcionalidad**: Selector de emoticonos organizado por categorías
- **Características**:
  - Más de 240 emoticonos organizados en 6 categorías (Emociones, Gestos, Objetos, Actividades, Comida, Símbolos)
  - Posicionamiento inteligente con cálculo automático de posición
  - Renderizado mediante React Portal para evitar problemas de z-index
  - Diseño responsivo
  - Soporte para modo oscuro
  - Animaciones suaves
  - Z-index alto (9999) para aparecer por encima de todos los elementos

### TextareaWithEmoji
- **Ubicación**: `src/components/ui/TextareaWithEmoji.tsx`
- **Funcionalidad**: Textarea mejorado con selector de emoticonos integrado
- **Características**:
  - Inserción de emoticonos en la posición del cursor
  - Mantiene todas las propiedades del Textarea original
  - Control opcional para mostrar/ocultar el selector de emoticonos

## Componentes Actualizados

### DraggableCard
- Ahora usa `TextareaWithEmoji` en lugar de `Textarea` para la edición de tarjetas
- Los usuarios pueden añadir emoticonos mientras editan el contenido de sus tarjetas

### RetrospectiveColumn
- Usa `TextareaWithEmoji` para la creación de nuevas tarjetas
- Los usuarios pueden añadir emoticonos al crear nuevas tarjetas

### GroupableColumn
- Actualizado para usar `TextareaWithEmoji` en la creación de tarjetas agrupadas

### RetrospectiveCard
- Actualizado para usar `TextareaWithEmoji` en la edición de tarjetas

## Uso

### Para participantes:
1. Al crear o editar una tarjeta, aparece un icono de cara sonriente (😊) en la esquina superior derecha del área de texto
2. Hacer clic en el icono abre el selector de emoticonos
3. Seleccionar una categoría de emoticonos (Emociones, Gestos, etc.)
4. Hacer clic en cualquier emoticono para insertarlo en la posición actual del cursor
5. El selector se cierra automáticamente después de seleccionar un emoticono

### Categorías de emoticonos disponibles:
- **Emociones**: Caras y expresiones emocionales
- **Gestos**: Manos y gestos corporales
- **Objetos**: Objetos diversos, símbolos naturales
- **Actividades**: Deportes y actividades recreativas
- **Comida**: Frutas, verduras y alimentos
- **Símbolos**: Corazones, símbolos religiosos y otros

## Tecnologías Utilizadas

- React con TypeScript
- Framer Motion para animaciones
- Tailwind CSS para estilos
- Lucide React para iconos

## Beneficios

1. **Mayor expresividad**: Los participantes pueden expresar emociones y conceptos de manera más visual
2. **Mejor engagement**: Los emoticonos hacen las retrospectivas más divertidas e interactivas
3. **Comunicación mejorada**: Los emoticonos pueden ayudar a clarificar el tono o contexto de los comentarios
4. **Experiencia de usuario moderna**: Funcionalidad similar a aplicaciones de mensajería populares
