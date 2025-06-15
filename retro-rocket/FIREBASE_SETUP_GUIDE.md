# Firebase Setup Guide for Retro Rocket

## 🔥 Quick Firebase Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it `retro-rocket` (or your preferred name)
4. Enable Google Analytics (optional)
5. Create project

### 2. Enable Authentication
1. In Firebase Console, go to **Authentication**
2. Click **Get started**
3. Go to **Sign-in method** tab
4. Enable **Google** provider
5. Add your domain (localhost:5173 for development)

### 3. Enable Firestore Database
1. Go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (for development)
4. Select a location

### 4. Get Configuration
1. Go to **Project Settings** (gear icon)
2. Scroll to **Your apps**
3. Click **Web** icon (`</>`)
4. Register app with name `retro-rocket`
5. Copy the config object

### 5. Create Environment File
Create `.env.local` in project root:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 6. Test Authentication
1. Restart dev server: `npm run dev`
2. Go to http://localhost:5173
3. Click "Sign in with Google"
4. Complete Google OAuth flow
5. Should redirect to Dashboard

### 7. Firestore Security Rules (Production)
Replace the default rules in **Firestore** > **Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read/write retrospectives they created
    match /retrospectives/{retrospectiveId} {
      allow read, write: if request.auth != null && 
        resource.data.createdBy == request.auth.uid;
      allow create: if request.auth != null;
    }
    
    // Participants and cards inherit retrospective permissions
    match /retrospectives/{retrospectiveId}/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 8. Deploy to Production
For production deployment:

1. **Vercel**: Add environment variables in dashboard
2. **Netlify**: Add in Site Settings > Environment Variables  
3. **Firebase Hosting**: Use `firebase deploy`

## 🔧 Troubleshooting

### Common Issues

1. **"Firebase not initialized"**
   - Check `.env.local` file exists
   - Verify all VITE_FIREBASE_* variables are set
   - Restart dev server

2. **Google Sign-in fails**
   - Add domain to authorized domains in Firebase Console
   - Check browser console for CORS errors

3. **Firestore permission denied**
   - Update security rules as shown above
   - Ensure user is authenticated

4. **Environment variables not loading**
   - File must be named `.env.local` exactly
   - Variables must start with `VITE_`
   - Restart dev server after changes

### Development vs Production

**Development** (without Firebase):
- App runs in mock mode
- No real authentication
- No data persistence
- Good for UI development

**Production** (with Firebase):
- Real Google authentication
- Data persisted in Firestore
- User sessions maintained
- Ready for production use

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Run `./test-auth-setup.sh` to verify setup
3. Check Firebase Console for configuration
4. Ensure all environment variables are correct
