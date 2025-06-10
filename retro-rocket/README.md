# 🚀 RetroRocket

RetroRocket es una herramienta moderna y colaborativa diseñada para ayudar a equipos Scrum a gestionar sus retrospectivas de manera divertida y efectiva. La aplicación permite a los usuarios crear y participar en paneles de retrospectiva con tres columnas estructuradas para facilitar la reflexión del equipo.

## ✨ Características

- **🚫 Sin Registro**: Los usuarios pueden unirse simplemente ingresando su nombre
- **👥 Colaboración en Tiempo Real**: Múltiples participantes pueden trabajar simultáneamente
- **💾 Persistencia de Datos**: Toda la información se almacena en Firebase Firestore
- **🎨 Interfaz Moderna**: Diseño limpio inspirado en Notion/Linear/Vercel
- **⚡ Interacciones Fluidas**: Animaciones suaves y estados de carga
- **📱 Responsive**: Funciona perfectamente en móviles y escritorio
- **🗳️ Sistema de Votación**: Los participantes pueden votar en las tarjetas
- **✏️ Edición en Tiempo Real**: Editar y eliminar tarjetas propias

## 🛠️ Tecnologías

- **Frontend**: React 18 + TypeScript
- **Animations**: Framer Motion
- **UI Components**: Lucide React Icons
- **Database**: Firebase Firestore v10
- **Styling**: Tailwind CSS v3
- **Build Tool**: Vite
- **Deployment**: Vercel Ready

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── ui/              # Componentes reutilizables (Button, Input, Card, etc.)
│   ├── retrospective/   # Componentes específicos de retrospectiva
│   ├── layout/          # Componentes de layout
│   └── forms/           # Formularios
├── hooks/               # Custom React hooks
├── services/            # Servicios de Firebase y API
├── types/               # Definiciones de TypeScript
├── utils/               # Utilidades y constantes
├── pages/               # Páginas principales
└── styles/              # Estilos globales
```

## 🚀 Instalación y Configuración

### Prerequisitos

- Node.js 18+ 
- npm o yarn
- Cuenta de Firebase (gratuita)

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd retro-rocket
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Firebase

1. Crear un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilitar Firestore Database
3. Copiar las credenciales de configuración
4. Crear archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
```

5. Llenar las variables de entorno:

```env
REACT_APP_FIREBASE_API_KEY=tu_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=tu_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
REACT_APP_FIREBASE_APP_ID=tu_app_id
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

## 📖 Uso

### Crear una Retrospectiva

1. Ve a la página principal
2. Ingresa tu nombre
3. Escribe un título para la retrospectiva
4. Haz clic en "Crear Retrospectiva"
5. Comparte el ID o enlace con tu equipo

### Unirse a una Retrospectiva

1. Ve a la página principal
2. Ingresa tu nombre
3. Ingresa el ID de la retrospectiva
4. Haz clic en "Unirse"

### Durante la Retrospectiva

- **Agregar tarjetas**: Haz clic en "Agregar" en cualquier columna
- **Votar**: Usa los botones de pulgar arriba/abajo
- **Editar**: Haz clic en el ícono de edición (solo tus tarjetas)
- **Eliminar**: Haz clic en el ícono de basura (solo tus tarjetas)

## 🏗️ Arquitectura

### Componentes Principales

- **RetrospectiveBoard**: Panel principal con las tres columnas
- **RetrospectiveColumn**: Cada columna individual
- **RetrospectiveCard**: Tarjetas individuales con funcionalidad completa

### Hooks Personalizados

- **useRetrospective**: Gestión de datos de retrospectiva
- **useCards**: Gestión de tarjetas con suscripciones en tiempo real
- **useParticipants**: Gestión de participantes

### Servicios

- **cardService**: CRUD de tarjetas con Firestore
- **retrospectiveService**: Gestión de retrospectivas
- **participantService**: Gestión de participantes

## 🎨 Diseño

El diseño sigue principios modernos:

- **Colores**: Paleta suave con acentos en azul
- **Tipografía**: Inter como fuente principal
- **Espaciado**: Sistema consistente basado en Tailwind
- **Animaciones**: Transiciones suaves con Framer Motion
- **Responsive**: Mobile-first design

## 🚀 Deployment en Vercel

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno en Vercel
3. Deploy automático en cada push

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

Si encuentras algún problema o tienes preguntas:

1. Revisa los [Issues](../../issues) existentes
2. Crea un nuevo issue si es necesario
3. Incluye detalles del error y pasos para reproducirlo

---

**Hecho con ❤️ para equipos que quieren mejorar continuamente**
│   ├── types
│   ├── utils
│   ├── pages
│   ├── styles
│   ├── App.tsx
│   └── main.tsx
├── public
│   └── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

## Getting Started

To get started with RetroRocket, follow these steps:

1. **Clone the Repository**:
   ```
   git clone https://github.com/yourusername/retro-rocket.git
   cd retro-rocket
   ```

2. **Install Dependencies**:
   ```
   npm install
   ```

3. **Set Up Firebase**:
   - Create a Firebase project and configure Firestore.
   - Update the Firebase configuration in `src/services/firebase.ts`.

4. **Run the Application**:
   ```
   npm run dev
   ```

5. **Open in Browser**:
   Navigate to `http://localhost:3000` to view the application.

## Contributing

Contributions are welcome! If you have suggestions for improvements or new features, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.