// Test para verificar la lógica de ownership en la exportación
console.log('=== TEST: Control de ownership para notas del facilitador ===');

// Caso 1: Usuario propietario
const ownerUser = { uid: 'user-123' };
const retrospective = {
    id: 'retro-456',
    createdBy: 'user-123',
    title: 'Mi Retrospectiva'
};

const isOwner1 = ownerUser.uid === retrospective.createdBy;
console.log('✅ Caso 1 - Usuario propietario:');
console.log('- Usuario ID:', ownerUser.uid);
console.log('- Creador del tablero:', retrospective.createdBy);
console.log('- ¿Es propietario?:', isOwner1);
console.log('- ¿Debe ver el checkbox?:', isOwner1 ? 'SÍ' : 'NO');

console.log('\n');

// Caso 2: Usuario NO propietario
const nonOwnerUser = { uid: 'user-789' };

const isOwner2 = nonOwnerUser.uid === retrospective.createdBy;
console.log('❌ Caso 2 - Usuario NO propietario:');
console.log('- Usuario ID:', nonOwnerUser.uid);
console.log('- Creador del tablero:', retrospective.createdBy);
console.log('- ¿Es propietario?:', isOwner2);
console.log('- ¿Debe ver el checkbox?:', isOwner2 ? 'SÍ' : 'NO');

console.log('\n');

// Caso 3: Usuario sin autenticar
const noUser = null;

const isOwner3 = noUser?.uid === retrospective.createdBy;
console.log('🚫 Caso 3 - Usuario sin autenticar:');
console.log('- Usuario ID:', noUser?.uid || 'null');
console.log('- Creador del tablero:', retrospective.createdBy);
console.log('- ¿Es propietario?:', isOwner3);
console.log('- ¿Debe ver el checkbox?:', isOwner3 ? 'SÍ' : 'NO');

console.log('\n🎯 Solo el propietario del tablero puede ver y usar las notas del facilitador');
