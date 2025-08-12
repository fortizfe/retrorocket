/**
 * Script para arreglar los joinedBoards de usuarios existentes
 * Este script busca en la colección de participantes y actualiza 
 * los perfiles de usuario con los tableros a los que están unidos
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

// Configuración de Firebase (usa tu configuración)
const firebaseConfig = {
    // Agrega tu configuración aquí
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixJoinedBoards() {
    console.log('🔧 Starting joined boards fix...');

    try {
        // 1. Obtener todos los participantes
        const participantsSnapshot = await getDocs(collection(db, 'participants'));
        console.log(`📊 Found ${participantsSnapshot.size} participants`);

        // 2. Agrupar por userId
        const userBoardsMap = new Map();

        participantsSnapshot.forEach(doc => {
            const data = doc.data();
            const { userId, retrospectiveId } = data;

            if (userId && retrospectiveId) {
                if (!userBoardsMap.has(userId)) {
                    userBoardsMap.set(userId, new Set());
                }
                userBoardsMap.get(userId).add(retrospectiveId);
            }
        });

        console.log(`👥 Found ${userBoardsMap.size} unique users with participations`);

        // 3. Actualizar cada perfil de usuario
        for (const [userId, boardIds] of userBoardsMap) {
            const boardIdsArray = Array.from(boardIds);

            console.log(`🔄 Updating user ${userId} with ${boardIdsArray.length} joined boards:`, boardIdsArray);

            try {
                await updateDoc(doc(db, 'users', userId), {
                    joinedBoards: boardIdsArray,
                    updatedAt: new Date()
                });
                console.log(`✅ Updated user ${userId}`);
            } catch (error) {
                console.error(`❌ Error updating user ${userId}:`, error);
            }
        }

        console.log('🎉 Migration completed!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
}

// Solo ejecutar si es llamado directamente
if (typeof window === 'undefined') {
    fixJoinedBoards();
} else {
    // Para uso en browser
    window.fixJoinedBoards = fixJoinedBoards;
    console.log('🔧 Fix function available as window.fixJoinedBoards()');
}

export { fixJoinedBoards };
