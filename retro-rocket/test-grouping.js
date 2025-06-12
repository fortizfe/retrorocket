// Test script to verify grouping functionality
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBEW_QWejbAe9Hd0OQZwseeNmRBmtjaowI",
    authDomain: "retrorocket-3284d.firebaseapp.com",
    projectId: "retrorocket-3284d",
    storageBucket: "retrorocket-3284d.firebasestorage.app",
    messagingSenderId: "1056932035672",
    appId: "1:1056932035672:web:849c139b684c6a1e755e2d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testGroupCreation() {
    try {
        console.log('Testing Firestore connection...');

        const groupsCollection = collection(db, 'groups');
        const testGroup = {
            retrospectiveId: 'test-retro-id',
            column: 'helped',
            headCardId: 'test-head-card',
            memberCardIds: ['test-member-1', 'test-member-2'],
            title: null,
            isCollapsed: false,
            createdAt: serverTimestamp(),
            createdBy: 'test-user',
            order: 0
        };

        console.log('Creating test group:', testGroup);
        const docRef = await addDoc(groupsCollection, testGroup);
        console.log('✅ Test group created successfully with ID:', docRef.id);

    } catch (error) {
        console.error('❌ Error creating test group:', error);
        console.error('Error details:', error.message);
    }
}

testGroupCreation();
