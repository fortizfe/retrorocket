# 🚀 Guía de Deploy en Vercel

## Pre-requisitos

1. **Cuenta en Vercel**: Crea una cuenta en [vercel.com](https://vercel.com)
2. **Vercel CLI**: Instálalo globalmente
   ```bash
   npm install -g vercel
   ```

## Métodos de Deploy

### Método 1: Deploy Automático (Recomendado)

1. **Conecta tu repositorio en Vercel**:
   - Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
   - Haz clic en "New Project"
   - Conecta tu repositorio de GitHub
   - Selecciona el proyecto `retro-rocket`

2. **Configura las variables de entorno**:
   ```
   VITE_FIREBASE_API_KEY=AIzaSyBEW_QWejbAe9Hd0OQZwseeNmRBmtjaowI
   VITE_FIREBASE_AUTH_DOMAIN=retrorocket-3284d.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=retrorocket-3284d
   VITE_FIREBASE_STORAGE_BUCKET=retrorocket-3284d.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=1056932035672
   VITE_FIREBASE_APP_ID=1:1056932035672:web:849c139b684c6a1e755e2d
   ```

3. **Deploy automático**: Cada push a `main` desplegará automáticamente

### Método 2: Deploy Manual

1. **Ejecuta el script de deploy**:
   ```bash
   ./deploy.sh
   ```

2. **O manualmente**:
   ```bash
   npm run build
   vercel --prod
   ```

## Configuración de Vercel

### Framework Detection
Vercel detectará automáticamente que es un proyecto Vite gracias a:
- `vite.config.ts` presente
- `"framework": "vite"` en `vercel.json`

### Build Settings
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Environment Variables
Configura en el dashboard de Vercel:

| Variable | Valor |
|----------|-------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyBEW_QWejbAe9Hd0OQZwseeNmRBmtjaowI` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `retrorocket-3284d.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `retrorocket-3284d` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `retrorocket-3284d.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `1056932035672` |
| `VITE_FIREBASE_APP_ID` | `1:1056932035672:web:849c139b684c6a1e755e2d` |

## Optimizaciones Aplicadas

### Vite Configuration
- ✅ Minificación con esbuild
- ✅ Code splitting por chunks
- ✅ Optimización de dependencias
- ✅ Target ES2020+ para mejor performance

### Vercel Configuration
- ✅ Caching optimizado para assets
- ✅ SPA routing configurado
- ✅ Headers de seguridad
- ✅ Framework detection automático

### Build Optimizations
- ✅ Chunks separados para vendor, Firebase y UI
- ✅ Límites de chunk size configurados
- ✅ Sourcemaps deshabilitados en producción

## Testing del Deploy

1. **Build local**:
   ```bash
   npm run build
   npm run preview
   ```

2. **Verifica la aplicación en**: `http://localhost:3000`

## Troubleshooting

### Error: "Command failed: npm run build"
- Verifica que todas las dependencias estén instaladas
- Ejecuta `npm install` antes del deploy

### Error: Variables de entorno no definidas
- Verifica que las variables estén configuradas en Vercel
- Asegúrate de que tengan el prefijo `VITE_`

### Error: Rutas no funcionan en producción
- Verifica que `vercel.json` tenga la configuración SPA correcta
- El archivo ya está configurado correctamente

### Firebase Authentication no funciona
- Verifica que Anonymous Auth esté habilitado en Firebase Console
- Verifica las reglas de Firestore

## Performance

Después del deploy, puedes verificar la performance en:
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [WebPageTest](https://www.webpagetest.org/)

## Dominio Personalizado

1. Ve a tu proyecto en Vercel
2. Settings > Domains
3. Agrega tu dominio personalizado
4. Configura los DNS según las instrucciones

---

**¡Tu aplicación RetroRocket estará lista para usar en producción! 🎉**
