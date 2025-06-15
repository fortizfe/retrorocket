# GitHub Authentication - Production Setup Guide

## 🔧 Configuración para Producción

### 1. **Firebase Console Configuration**

#### Paso 1: Habilitar GitHub Provider
1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. Ve a **Authentication** → **Sign-in method**
4. Encuentra **GitHub** en la lista
5. Haz clic en **Enable**

#### Paso 2: Obtener credenciales OAuth de GitHub

##### a) Crear GitHub OAuth App
1. Ve a [GitHub Settings](https://github.com/settings/developers)
2. Clic en **Developer settings**
3. Clic en **OAuth Apps**
4. Clic en **New OAuth App**

##### b) Configurar la aplicación
```
Application name: Retro Rocket
Homepage URL: https://tu-dominio.com
Application description: Retrospective boards for agile teams
Authorization callback URL: https://retro-rocket.firebaseapp.com/__/auth/handler
```

**⚠️ IMPORTANTE:** Cambia `retro-rocket` por el ID real de tu proyecto Firebase.

##### c) Obtener credenciales
Después de crear la app, obtendrás:
- **Client ID** (público)
- **Client Secret** (privado, muy importante mantenerlo seguro)

#### Paso 3: Configurar en Firebase
1. En Firebase Console, en la configuración de GitHub:
2. Pega el **Client ID** de GitHub
3. Pega el **Client Secret** de GitHub  
4. Guarda los cambios

### 2. **Variables de Entorno**

#### Para Desarrollo Local
Crea `.env.local`:
```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

#### Para Vercel/Netlify
Configurar las mismas variables en el dashboard de despliegue.

### 3. **Testing en Desarrollo**

#### Configurar Localhost para GitHub OAuth
GitHub requiere HTTPS para OAuth, pero puedes usar localhost:

```bash
# En la GitHub OAuth App, añadir como callback URL adicional:
http://localhost:3000/__/auth/handler
```

#### Ejecutar tests
```bash
npm run dev
# Ve a http://localhost:3000
# Prueba el botón "Continuar con GitHub"
```

### 4. **Deploy a Producción**

#### Vercel
```bash
npm install -g vercel
vercel --prod
```

#### Netlify
```bash
npm run build
# Subir carpeta dist/ a Netlify
```

#### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

---

## 🔒 Seguridad

### GitHub OAuth Scopes
La aplicación solicita únicamente:
- `user:email` - Para obtener el email del usuario
- Perfil público básico (por defecto)

### Firestore Rules
Asegúrate de que las reglas de Firestore están configuradas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Retrospectives - owners and participants can access
    match /retrospectives/{retroId} {
      allow read, write: if request.auth != null && 
        (resource.data.createdBy == request.auth.uid || 
         request.auth.uid in resource.data.participants);
    }
  }
}
```

---

## 🧪 Testing Checklist

### ✅ Funcionalidad Básica
- [ ] Landing page muestra botones Google y GitHub
- [ ] Botón GitHub tiene estilo oscuro correcto
- [ ] Botón Apple muestra "Próximamente"
- [ ] Clic en GitHub abre popup OAuth
- [ ] Después del login, formulario de configuración aparece
- [ ] Perfil se guarda correctamente en Firestore
- [ ] Redirección a dashboard funciona

### ✅ Estados de Error
- [ ] Error de OAuth maneja gracefully
- [ ] Error de red muestra mensaje apropiado
- [ ] Cancelación de OAuth no rompe la aplicación

### ✅ Responsive Design
- [ ] Botones se ven bien en móvil
- [ ] Popup OAuth funciona en móvil
- [ ] Formulario de perfil responsive

### ✅ Flujo de Usuario
- [ ] Usuario nuevo: configuración inicial obligatoria
- [ ] Usuario existente: login directo a dashboard
- [ ] Logout funciona correctamente
- [ ] Sesión persiste entre recargas

---

## 🎯 Monitoreo

### Firebase Analytics
Configurar eventos para tracking:
```javascript
// En cada sign-in exitoso
analytics.logEvent('login', {
  method: 'github' // o 'google'
});

// En configuración de perfil
analytics.logEvent('sign_up', {
  method: 'github'
});
```

### Error Monitoring
Configurar Sentry o similar para capturar errores de OAuth.

---

## 🔄 Rollback Plan

Si hay problemas con GitHub:

1. **Deshabilitar temporalmente:**
   ```typescript
   // En authProvider.ts
   const authProviders = {
     google: new GoogleAuthProvider(),
     // github: new GithubAuthProvider(), // Comentar
   } as const;
   ```

2. **Revert completo:**
   ```bash
   git revert [commit-hash-github-implementation]
   ```

---

## 📞 Soporte

### Errores Comunes

**Error: redirect_uri_mismatch**
- Verificar que la URL de callback en GitHub OAuth App sea exacta
- Revisar dominio en Firebase Auth settings

**Error: OAuth app not found**
- Verificar Client ID en Firebase Console
- Confirmar que la GitHub OAuth App existe

**Error: Invalid client secret**
- Regenerar Client Secret en GitHub
- Actualizar en Firebase Console

### Logs Útiles
```bash
# Firebase Functions logs
firebase functions:log

# Vercel logs
vercel logs [deployment-url]

# Browser DevTools
# Network tab → Ver requests a /__/auth/handler
```

---

## 🎉 ¡Listo para Producción!

Una vez completados estos pasos, tendrás:
- ✅ Autenticación con Google y GitHub funcionando
- ✅ Flujo de usuario unificado y pulido
- ✅ Infraestructura escalable para más proveedores
- ✅ Monitoreo y error handling robusto

**¡Tu aplicación Retro Rocket está lista para el siguiente nivel!** 🚀
