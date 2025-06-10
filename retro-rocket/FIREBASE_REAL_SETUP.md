# 🔥 Configuración de Firebase para RetroRocket

## 📋 Datos de tu proyecto:
- **Nombre del proyecto:** retrorocket
- **ID del proyecto:** retrorocket-3284d
- **Número del proyecto:** 1056932035672

## 🚀 Pasos para obtener las credenciales completas:

### 1. Crear una aplicación web en Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/project/retrorocket-3284d)
2. En el panel principal, busca el icono **</> (Web)**
3. Haz clic en **"Agregar app"** o **"Add app"**
4. Dale un nombre a tu app: `RetroRocket Web`
5. **NO** marques "También configurar Firebase Hosting para esta app" (por ahora)
6. Haz clic en **"Registrar app"**

### 2. Copiar las credenciales
Después del paso anterior, verás un código como este:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "retrorocket-3284d.firebaseapp.com",
  projectId: "retrorocket-3284d",
  storageBucket: "retrorocket-3284d.appspot.com",
  messagingSenderId: "1056932035672",
  appId: "1:1056932035672:web:..."
};
```

### 3. Configurar Firestore Database
1. En el menú lateral, ve a **"Firestore Database"**
2. Haz clic en **"Crear base de datos"**
3. Selecciona **"Empezar en modo de prueba"** (permitirá lectura/escritura durante 30 días)
4. Elige una ubicación (recomendado: us-central o europe-west)
5. Haz clic en **"Listo"**

### 4. Configurar las reglas de seguridad (importante)
En Firestore Database > Reglas, reemplaza el contenido con:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acceso completo a retrospectives
    match /retrospectives/{retrospectiveId} {
      allow read, write: if true;
      
      // Permitir acceso a subcollections de cards
      match /cards/{cardId} {
        allow read, write: if true;
      }
      
      // Permitir acceso a subcollections de participants
      match /participants/{participantId} {
        allow read, write: if true;
      }
    }
  }
}
```

**⚠️ Importante:** Estas reglas permiten acceso público para desarrollo. Para producción, implementa reglas más restrictivas.
```

### 5. Actualizar RetroRocket con tus credenciales
Una vez que tengas las credenciales, te ayudo a configurarlas en el proyecto.

## 🔗 Enlaces útiles:
- [Firebase Console](https://console.firebase.google.com/project/retrorocket-3284d)
- [Documentación de Firestore](https://firebase.google.com/docs/firestore)

## 📝 Próximo paso:
Completa los pasos 1-4 arriba y compárteme las credenciales de firebaseConfig para actualizar tu proyecto RetroRocket.
