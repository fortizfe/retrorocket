# 🔥 Guía de Configuración de Firebase para RetroRocket

## Paso 1: Crear Proyecto Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Crear un proyecto" 
3. Asigna un nombre: `retro-rocket-[tu-nombre]`
4. Acepta los términos y condiciones
5. Haz clic en "Crear proyecto"

## Paso 2: Configurar Firestore Database

1. En el panel lateral, selecciona **"Firestore Database"**
2. Haz clic en **"Crear base de datos"**
3. Selecciona **"Comenzar en modo de prueba"** (para desarrollo)
4. Elige una ubicación cercana a tu región
5. Haz clic en **"Listo"**

## Paso 3: Configurar Reglas de Firestore (Opcional para desarrollo)

Ve a la pestaña **"Reglas"** y reemplaza las reglas por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir lectura y escritura en modo de desarrollo
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **IMPORTANTE**: Estas reglas son solo para desarrollo. Para producción, implementa reglas de seguridad apropiadas.

## Paso 4: Obtener Credenciales

1. Ve a **"Configuración del proyecto"** (ícono de engranaje)
2. Baja hasta la sección **"Tus aplicaciones"**
3. Haz clic en **"</> Web"**
4. Asigna un nombre a tu app: `retro-rocket-web`
5. NO selecciones "Firebase Hosting" por ahora
6. Haz clic en **"Registrar app"**
7. Copia las credenciales que aparecen

## Paso 5: Configurar Variables de Entorno

1. Abre el archivo `.env` en la raíz del proyecto
2. Reemplaza los valores demo con tus credenciales reales:

```env
REACT_APP_FIREBASE_API_KEY=tu_api_key_real
REACT_APP_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=tu_project_id_real
REACT_APP_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id_real
REACT_APP_FIREBASE_APP_ID=tu_app_id_real
```

## Paso 6: Probar la Conexión

1. Ejecuta `npm run dev`
2. Ve a `http://localhost:3000`
3. Intenta crear una retrospectiva
4. Ve a Firebase Console > Firestore Database para verificar que se crean los documentos

## Estructura de Datos en Firestore

La aplicación creará automáticamente estas colecciones:

### `retrospectives`
```json
{
  "id": "auto-generated",
  "title": "Mi Retrospectiva",
  "description": "Descripción opcional",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "participantCount": 0,
  "isActive": true
}
```

### `cards`
```json
{
  "id": "auto-generated",
  "content": "Mi tarjeta de feedback",
  "column": "helped|hindered|improve",
  "createdBy": "Nombre del participante",
  "retrospectiveId": "id-de-la-retrospectiva",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "votes": 0
}
```

### `participants`
```json
{
  "id": "auto-generated",
  "name": "Nombre del participante",
  "retrospectiveId": "id-de-la-retrospectiva",
  "joinedAt": "timestamp",
  "isActive": true
}
```

## Configuración para Producción

Para producción, actualiza las reglas de Firestore para mayor seguridad:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Retrospectives: solo lectura
    match /retrospectives/{retrospectiveId} {
      allow read: if true;
      allow create: if true;
      allow update: if request.auth == null; // Para participantCount
    }
    
    // Cards: crear/leer/actualizar/eliminar
    match /cards/{cardId} {
      allow read, create: if true;
      allow update, delete: if resource.data.createdBy == request.auth.token.name;
    }
    
    // Participants: crear/leer/actualizar
    match /participants/{participantId} {
      allow read, create, update: if true;
    }
  }
}
```

## Solución de Problemas

### Error: "FirebaseError: Missing or insufficient permissions"
- Verifica que las reglas de Firestore permitan las operaciones
- En desarrollo, usa las reglas permisivas mostradas arriba

### Error: "FirebaseError: Project not found"
- Verifica que el PROJECT_ID en .env sea correcto
- Asegúrate de haber habilitado Firestore en el proyecto

### Error de CORS
- Agrega tu dominio a la lista de dominios autorizados en Firebase Console
- Ve a Authentication > Settings > Authorized domains

¡Listo! Tu Firebase está configurado para RetroRocket 🚀
