# 🚀 RetroRocket

**RetroRocket** es una herramienta moderna y colaborativa diseñada para ayudar a equipos Scrum a gestionar sus retrospectivas de manera divertida y efectiva. La aplicación permite a los usuarios crear y participar en paneles de retrospectiva con tres columnas estructuradas para facilitar la reflexión del equipo.

## ✨ Características Principales

### 🔐 Sistema de Autenticación Avanzado
- **Múltiples Proveedores**: Soporte para Google, GitHub (con preparación para Apple)
- **Vinculación Automática**: Un solo perfil por email, sin importar el proveedor usado
- **Sincronización Inteligente**: Detecta y vincula automáticamente cuentas existentes
- **Gestión de Proveedores**: Añade y gestiona múltiples métodos de autenticación desde el perfil

### 👥 Colaboración en Tiempo Real
- **Múltiples Participantes**: Trabaja simultáneamente con tu equipo
- **Sincronización Instantánea**: Cambios en tiempo real para todos los usuarios
- **Sistema de Participantes Avanzado**: 
  - Avatares apilados con visualización compacta
  - Popover interactivo con lista completa
  - Información temporal (tiempo de conexión)
  - Contador de participantes activos vs totales
  - Estados de conexión en tiempo real

### 📝 Sistema Completo de Tarjetas
- **Plantillas de Tableros**: Múltiples formatos (Default, Mad-Sad-Glad, Start-Stop-Continue)
- **Columna de Elementos de Acción**: Incluida automáticamente en todas las plantillas
- **Votación y Reacciones**: Sistema completo de thumbs up/down, likes y reacciones emoji
- **Emojis en Tarjetas**: Selector integrado con 6 categorías (240+ emojis)
- **Edición en Tiempo Real**: Edita y elimina tus propias tarjetas
- **Colores Personalizables**: Sistema de colores pastel para organización visual

### 🎯 Modo Facilitador Avanzado
- **Countdown Timer**: Temporizador configurable con controles completos
  - Configuración flexible (minutos y segundos)
  - Estados visuales (en curso, pausado, terminado)
  - Barra de progreso con indicadores
  - Sincronización en tiempo real para todos los participantes
  - Notificación sonora al finalizar
  - Controles exclusivos para el facilitador (crear, iniciar, pausar, reiniciar, eliminar)
- **Notas del Facilitador**: Sistema de anotaciones privadas
  - Creación y edición de notas durante la retrospectiva
  - Persistencia en tiempo real
  - Formato de fecha y hora automático
  - Control completo (crear, editar, eliminar)

### 🔗 Sistema de Agrupación Inteligente
- **Agrupación Manual**: Arrastra y suelta tarjetas para crear grupos
- **Tarjetas Principales**: Designa tarjetas como líderes de grupo
- **Jerarquía Visual**: Indentación clara para mostrar relaciones
- **Estadísticas de Grupo**: Conteo automático de votos, likes y participación

### 📄 Exportación Profesional
- **Formato PDF**: Exportación optimizada para compartir y archivar
- **Formato DOCX**: Documentos de Microsoft Word editables
- **Configuración Avanzada**: Control granular sobre qué incluir
- **Contenido Completo**: Tarjetas, agrupaciones, estadísticas, participantes y notas del facilitador
- **Inclusión de Notas**: Opción para incluir notas del facilitador en las exportaciones

### 🎨 Experiencia de Usuario
- **Interfaz Moderna**: Diseño limpio inspirado en Notion/Linear/Vercel
- **Animaciones Fluidas**: Transiciones suaves con Framer Motion
- **Responsive**: Funciona perfectamente en móviles y escritorio
- **Dark/Light Mode**: Tema claro y oscuro automático
- **Sistema de Emojis Unificado**: Selector de emojis consistente en toda la aplicación
- **Posicionamiento Inteligente**: Los elementos emergentes se posicionan automáticamente

### 💾 Persistencia y Seguridad
- **Firebase Firestore**: Base de datos en tiempo real y segura
- **Estados de Carga**: Indicadores visuales para todas las operaciones
- **Manejo de Errores**: Gestión robusta de fallos y reconexión
- **Backup Automático**: Todos los datos se sincronizan continuamente

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** con TypeScript para una base sólida y tipado
- **Vite** como build tool para desarrollo rápido
- **Tailwind CSS** para estilos utilitarios y responsive design
- **Framer Motion** para animaciones fluidas y profesionales
- **Lucide React** para iconos consistentes y modernos

### Backend y Servicios
- **Firebase Firestore v10** para base de datos en tiempo real
- **Firebase Auth** para autenticación multi-proveedor
- **Vercel** para deployment y edge functions

### Funcionalidades Avanzadas
- **@dnd-kit** para drag & drop nativo y accesible
- **react-hot-toast** para notificaciones elegantes
- **react-router-dom** para navegación SPA
- **jsPDF** y **html2canvas** para exportación PDF
- **docx** para generación de documentos Word
- **react-i18next** para internacionalización completa
- **framer-motion** para animaciones y transiciones

## 🏗️ Arquitectura del Proyecto

```
src/
├── components/
│   ├── ui/              # Componentes base (Button, Input, Card, Loading, etc.)
│   ├── retrospective/   # Componentes específicos de retrospectiva
│   │   ├── RetrospectiveBoard.tsx
│   │   ├── RetrospectiveColumn.tsx
│   │   ├── RetrospectiveCard.tsx
│   │   ├── EmojiReactions.tsx    # Reacciones emoji en tarjetas
│   │   ├── PdfExporter.tsx
│   │   └── DocxExporter.tsx
│   ├── auth/            # Componentes de autenticación
│   │   ├── AuthButtonGroup.tsx
│   │   └── LinkedProvidersCard.tsx
│   ├── create-board/    # Creación de tableros con plantillas
│   │   ├── CreateBoardFlow.tsx
│   │   └── BoardTemplateSelector.tsx
│   ├── countdown/       # Sistema de countdown para facilitadores
│   │   ├── CountdownTimer.tsx
│   │   ├── FacilitatorMenu.tsx
│   │   └── CountdownFeatureDemo.tsx
│   ├── facilitator/     # Herramientas del facilitador
│   │   └── FacilitatorNotes.tsx
│   ├── participants/    # Sistema avanzado de participantes
│   │   ├── UserAvatar.tsx
│   │   ├── CompactAvatarGroup.tsx
│   │   ├── ParticipantList.tsx
│   │   ├── ParticipantPopover.tsx
│   │   └── ResponsiveParticipantDisplay.tsx
│   ├── layout/          # Layout y navegación
│   └── forms/           # Formularios reutilizables
├── hooks/               # Custom React hooks
│   ├── useCards.ts      # Gestión de tarjetas en tiempo real
│   ├── useAuth.ts       # Autenticación y estado del usuario
│   ├── useCardGroups.ts # Agrupación de tarjetas
│   ├── useCountdown.ts  # Hook del sistema countdown
│   ├── useFacilitatorNotes.ts # Gestión de notas del facilitador
│   ├── useExportPdf.ts  # Exportación PDF
│   └── useExportDocx.ts # Exportación DOCX
├── services/            # Servicios de Firebase y API
│   ├── firebase.ts      # Configuración de Firebase
│   ├── userService.ts   # Gestión de usuarios y perfiles
│   ├── accountLinking.ts # Vinculación de cuentas
│   ├── cardService.ts   # CRUD de tarjetas
│   ├── countdownService.ts # Servicio del countdown timer
│   ├── facilitatorNotesService.ts # Servicio de notas del facilitador
│   ├── pdfExportService.ts # Generación de PDFs
│   └── docxExportService.ts # Generación de DOCX
├── contexts/            # Context providers
│   ├── UserContext.tsx  # Estado global del usuario
│   └── TypingProvider.tsx # Indicadores de escritura
├── types/               # Definiciones de TypeScript
│   ├── user.ts          # Tipos de usuario y autenticación
│   ├── retrospective.ts # Tipos de retrospectiva
│   ├── card.ts          # Tipos de tarjetas y grupos
│   ├── countdown.ts     # Tipos del sistema countdown
│   └── facilitatorNotes.ts # Tipos de notas del facilitador
├── templates/           # Plantillas de tableros
│   └── boardTemplates.ts # Definiciones de plantillas
├── utils/               # Utilidades y constantes
│   ├── emojiConstants.ts # Constantes de emojis unificadas
│   └── dateUtils.ts     # Utilidades de fecha
├── pages/               # Páginas principales
│   ├── Landing.tsx      # Página de inicio
│   ├── Dashboard.tsx    # Panel principal
│   └── Profile.tsx      # Perfil de usuario
└── styles/              # Estilos globales
```

## 🚀 Instalación y Configuración

### Prerequisitos
- **Node.js 18+** 
- **npm** o **yarn**
- **Cuenta de Firebase** (gratuita)

### 1. Clonar el repositorio
```bash
git clone [repository-url]
cd retro-rocket
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar Firebase

#### 3.1 Crear proyecto Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. Habilita **Firestore Database**
4. Configura **Firebase Authentication** con Google y GitHub

#### 3.2 Configurar variables de entorno
```bash
cp .env.example .env
```

Completa el archivo `.env`:
```env
REACT_APP_FIREBASE_API_KEY=tu_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=tu_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
REACT_APP_FIREBASE_APP_ID=tu_app_id
```

#### 3.3 Configurar reglas de Firestore
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Retrospectives are public but controlled
    match /retrospectives/{retrospectiveId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Cards are public within retrospectives
    match /retrospectives/{retrospectiveId}/cards/{cardId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 4. Ejecutar en desarrollo
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`

### 5. Build para producción
```bash
npm run build
```

## 📖 Guía de Uso

### Autenticación y Perfil

#### Iniciar Sesión
1. Ve a la página principal
2. Haz clic en "Iniciar Sesión con Google" o "Iniciar Sesión con GitHub"
3. Autoriza la aplicación en el proveedor seleccionado

#### Vincular Proveedores Adicionales
1. Ve a tu **Perfil** una vez autenticado
2. En la sección "Métodos de Inicio de Sesión", haz clic en **"Vincular"** junto al proveedor deseado
3. Autoriza la vinculación - ahora podrás iniciar sesión con cualquier método

### Crear una Retrospectiva
1. En el **Dashboard**, haz clic en "Nueva Retrospectiva"
2. **Selecciona una plantilla**:
   - **Default**: Qué me ayudó, Qué me retrasó, Qué podemos hacer mejor
   - **Mad-Sad-Glad**: Mad, Sad, Glad
   - **Start-Stop-Continue**: Start, Stop, Continue
   - Todas incluyen automáticamente la columna "Elementos de acción"
3. Completa el formulario:
   - **Título**: Nombre descriptivo de la retrospectiva
   - **Descripción**: Contexto adicional (opcional)
4. Haz clic en "Crear Retrospectiva"
5. **Comparte el enlace** con tu equipo

### Unirse a una Retrospectiva
1. Utiliza el enlace compartido por el creador, o
2. Ve al Dashboard y ingresa el **ID de retrospectiva** en "Unirse a una Retrospectiva"

### Trabajar en la Retrospectiva

#### Agregar Tarjetas
1. Haz clic en **"+ Agregar"** en cualquier columna
2. Escribe tu comentario (puedes usar el selector de emojis 😊)
3. Selecciona un color (opcional)
4. Haz clic en "Guardar"

#### Reaccionar a Tarjetas
- **Votos**: Usa los botones 👍/👎 para votar tarjetas
- **Likes**: Haz clic en ❤️ para dar like
- **Reacciones Emoji**: Haz clic en 😊 y selecciona de 6 categorías (240+ emojis)
  - Emociones, Gestos, Objetos, Actividades, Comida, Símbolos

#### Agrupar Tarjetas
1. **Arrastra una tarjeta** sobre otra para crear un grupo
2. **Designa tarjetas principales** haciendo clic en el icono de estrella
3. **Reorganiza grupos** arrastrando tarjetas dentro y fuera

#### Editar y Eliminar
- **Editar**: Haz clic en el ícono ✏️ (solo tus propias tarjetas)
- **Eliminar**: Haz clic en el ícono 🗑️ (solo tus propias tarjetas)

### Modo Facilitador

#### Countdown Timer
1. **Como facilitador**, verás los "Controles de Facilitador" debajo de la cabecera
2. **Configurar tiempo**: Establece minutos y segundos deseados
3. **Crear timer**: Haz clic en "Crear" para configurar el temporizador
4. **Controlar sesión**: 
   - **Iniciar**: Comienza la cuenta atrás
   - **Pausar**: Detiene temporalmente el timer
   - **Reiniciar**: Vuelve al tiempo configurado inicialmente
   - **Eliminar**: Remueve completamente el temporizador
5. **Visibilidad**: Todos los participantes ven el timer en la cabecera en tiempo real

#### Notas del Facilitador
1. **Accede al panel** de notas en los controles del facilitador
2. **Crear notas**: Haz clic en "Agregar Nota" 
3. **Editar**: Modifica cualquier nota existente
4. **Eliminar**: Remueve notas que ya no necesites
5. **Exportar**: Las notas se incluyen en las exportaciones PDF/DOCX

### Exportar Resultados

#### Exportación PDF
1. Haz clic en **"PDF"** en la cabecera de la retrospectiva
2. Para opciones avanzadas, haz clic en el ícono ⚙️
3. Configura qué incluir:
   - Lista de participantes
   - Estadísticas detalladas
   - Detalles de agrupaciones
   - Notas del facilitador
4. Haz clic en "Exportar PDF"

#### Exportación DOCX (Word)
1. Haz clic en **"Word"** en la cabecera de la retrospectiva
2. Para configuración avanzada, haz clic en ⚙️
3. Selecciona opciones:
   - Participantes
   - Estadísticas
   - Detalles de grupos
   - Notas del facilitador
4. Haz clic en "Exportar DOCX"

## 🔐 Sistema de Autenticación

### Características Avanzadas

#### Vinculación Automática de Cuentas
RetroRocket implementa un sistema inteligente que:
- **Detecta emails duplicados** entre diferentes proveedores
- **Vincula automáticamente** las cuentas cuando intentas iniciar sesión
- **Preserva todos los datos** de retrospectivas y configuraciones
- **Permite múltiples métodos** de autenticación para un solo perfil

#### Flujo de Vinculación
1. **Usuario existente** (ej: registrado con Google)
2. **Intenta iniciar sesión** con GitHub usando el mismo email
3. **Sistema detecta** el conflicto de credenciales
4. **Autentica automáticamente** con Google
5. **Vincula la credencial** de GitHub al perfil existente
6. **Resultado**: Usuario puede usar Google o GitHub indistintamente

#### Gestión de Proveedores
En el **Perfil** puedes:
- **Ver todos los proveedores** vinculados a tu cuenta
- **Agregar nuevos métodos** de autenticación
- **Información de seguridad** sobre la vinculación
- **Estado en tiempo real** de todos los métodos

## 🎨 Sistema de Diseño

### Principios de Diseño
- **Claridad**: Jerarquía visual clara y comprensible
- **Consistencia**: Componentes y patrones unificados
- **Accesibilidad**: Cumple estándares WCAG 2.1
- **Responsive**: Mobile-first design que escala perfectamente

### Paleta de Colores
```css
/* Primarios */
--primary-50: #f0f9ff;
--primary-600: #2563eb;
--primary-900: #1e3a8a;

/* Semánticos */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;

/* Colores de Tarjetas */
--pastel-blue: #dbeafe;
--pastel-green: #d1fae5;
--pastel-yellow: #fef3c7;
--pastel-purple: #e9d5ff;
--pastel-pink: #fce7f3;
```

### Tipografía
- **Fuente Principal**: Inter (Google Fonts)
- **Jerarquía**: H1 (2xl) → H6 (sm) con espaciado consistente
- **Legibilidad**: Contraste optimizado para accesibilidad

## 🚀 Deployment

### Vercel (Recomendado)
1. **Conecta tu repositorio** a Vercel
2. **Configura las variables de entorno** en el dashboard de Vercel
3. **Deploy automático** en cada push a la rama main

### Configuración de Variables en Vercel
```bash
REACT_APP_FIREBASE_API_KEY=tu_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=tu_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
REACT_APP_FIREBASE_APP_ID=tu_app_id
```

### Build Local
```bash
npm run build
npm run preview  # Para previsualizar el build
```

## 🤝 Contribución

### Proceso de Contribución
1. **Fork** el proyecto
2. **Crea una rama** para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** tus cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
4. **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
5. **Abre un Pull Request** con descripción detallada

### Estándares de Código
- **TypeScript strict** para tipado completo
- **ESLint** para linting automático
- **Prettier** para formateo consistente
- **Conventional Commits** para mensajes descriptivos

### Áreas de Contribución
- 🐛 **Bug fixes** y mejoras de rendimiento
- ✨ **Nuevas funcionalidades** y componentes
- 🎨 **Mejoras de UX/UI** y accesibilidad
- 📚 **Documentación** y guías
- 🧪 **Tests** y casos de prueba

## 📊 Roadmap

### Próximas Funcionalidades
- [ ] **Templates de Retrospectiva Adicionales** (4Ls, DAKI, etc.)
- [ ] **Alertas del Countdown Timer** (avisos personalizables)
- [ ] **Historial de Sesiones** con métricas del facilitador
- [ ] **Integraciones** (Slack, Teams, Jira)
- [ ] **Analytics** de retrospectivas y métricas de equipo
- [ ] **Retrospectivas Privadas** con control de acceso
- [ ] **Modo Offline** con sincronización posterior
- [ ] **API REST** para integraciones externas
- [ ] **Móvil App** nativa (React Native)

### Mejoras Técnicas
- [ ] **Progressive Web App** (PWA) completa
- [ ] **Tests automatizados** (ampliación de cobertura actual)
- [ ] **Storybook** para documentación de componentes
- [ ] **CI/CD** mejorado con GitHub Actions
- [ ] **Monitoring** y analytics de rendimiento
- [ ] **Optimización de Bundle** y lazy loading
- [ ] **Cache Strategy** avanzada para offline

## 🆘 Soporte y Comunidad

### Obtener Ayuda
1. **Revisa la documentación** y este README
2. **Busca en Issues** existentes para problemas similares
3. **Crea un nuevo Issue** con detalles del problema:
   - Descripción clara del error
   - Pasos para reproducir
   - Información del entorno (browser, OS)
   - Screenshots si aplica

### Reportar Bugs
Utiliza la plantilla de bug report e incluye:
- **Versión** de la aplicación
- **Pasos exactos** para reproducir
- **Comportamiento esperado** vs **comportamiento actual**
- **Logs de consola** si hay errores JavaScript

### Solicitar Funcionalidades
- **Describe el problema** que la funcionalidad resolvería
- **Explica la solución** propuesta
- **Considera alternativas** y casos de uso
- **Mockups o wireframes** si es aplicable

## 📝 Licencia

Este proyecto está bajo la **Licencia MIT**. Ver [`LICENSE`](LICENSE) para más detalles.

```
MIT License

Copyright (c) 2024 RetroRocket

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

## 🙏 Agradecimientos

- **Equipo de Firebase** por la plataforma robusta y confiable
- **Vercel** por el hosting y deployment seamless  
- **Comunidad Open Source** por las librerías increíbles
- **Equipos Scrum** que inspiraron las funcionalidades

---

**¿Listo para mejorar tus retrospectivas?** 🚀

[**Iniciar Ahora**](https://retro-rocket.vercel.app) • [**Ver Demo**](#) • [**Documentación**](#) • [**Comunidad**](#)

---

*Hecho con ❤️ para equipos que quieren mejorar continuamente*