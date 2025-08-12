#!/usr/bin/env node

/**
 * Script de prueba para verificar la funcionalidad de tableros unidos
 * Este script debe ser ejecutado en el navegador (console) después de iniciar sesión
 */

console.log('=== Test Join Boards Functionality ===');

async function testJoinBoardFunctionality() {
    try {
        console.log('1. Testing current user data...');

        // Simular acceso a los servicios de la aplicación
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            console.log('✅ Script running in browser context');

            // Verificar si el usuario está logueado
            const user = firebase?.auth?.currentUser;
            if (!user) {
                console.log('❌ No user logged in. Please log in first.');
                return;
            }

            console.log('✅ User logged in:', user.uid);

            // Simular llamada al servicio de usuario
            console.log('2. Testing getUserBoards...');

            // Esta parte requiere acceso a los servicios de la app
            console.log('⚠️ To test fully, open browser console in the app and run:');
            console.log(`
import { userService } from './src/services/userService';

// Get current user
const user = firebase.auth().currentUser;
if (user) {
    console.log('Current user:', user.uid);
    
    // Test getUserBoards
    userService.getUserBoards(user.uid).then(boards => {
        console.log('User boards:', boards);
        console.log('Created boards:', boards.filter(b => b.isCreator));
        console.log('Joined boards:', boards.filter(b => !b.isCreator));
    }).catch(error => {
        console.error('Error getting boards:', error);
    });
    
    // Test user profile
    userService.getUserProfile(user.uid).then(profile => {
        console.log('User profile:', profile);
        console.log('Joined boards in profile:', profile?.joinedBoards || []);
    }).catch(error => {
        console.error('Error getting profile:', error);
    });
}
            `);

        } else {
            console.log('❌ Script must be run in browser context (localhost)');
        }

    } catch (error) {
        console.error('Error in test:', error);
    }
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    testJoinBoardFunctionality();
} else {
    console.log('To use this test:');
    console.log('1. Start the app (npm run dev)');
    console.log('2. Open browser developer tools');
    console.log('3. Log in to the app');
    console.log('4. Paste this script in the console');
}

// También crear una función global para testing manual
if (typeof window !== 'undefined') {
    window.testJoinBoards = testJoinBoardFunctionality;
    console.log('Global function created: window.testJoinBoards()');
}
