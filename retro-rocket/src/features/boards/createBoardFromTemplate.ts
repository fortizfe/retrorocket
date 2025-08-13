import {
    collection,
    addDoc,
    doc,
    setDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db, FIRESTORE_COLLECTIONS } from '../../services/firebase';
import { TemplateId, BOARD_TEMPLATES, getTemplateColumns } from '../../templates/boardTemplates';

export type CreateBoardParams = {
    templateId: TemplateId;
    title: string;
    createdBy: string; // uid
    createdByName?: string;
    locale: 'es' | 'en';
};

export async function createBoardFromTemplate(params: CreateBoardParams): Promise<{ boardId: string }> {
    try {
        if (!db) {
            throw new Error('Firebase is not initialized. Please configure Firebase to use this feature.');
        }

        const { templateId, title, createdBy, createdByName, locale } = params;

        // Validar que la plantilla existe
        if (!(templateId in BOARD_TEMPLATES)) {
            throw new Error(`Invalid template ID: ${templateId}`);
        }

        // Crear el documento de retrospectiva
        const retrospectiveData = {
            title: title.trim(),
            description: '', // Podemos expandir esto en el futuro
            templateId,
            createdBy,
            createdByName: createdByName || 'Anonymous',
            locale,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            participantCount: 0,
            isActive: true
        };

        const retrospectivesCollection = collection(db, FIRESTORE_COLLECTIONS.RETROSPECTIVES);
        const retrospectiveDoc = await addDoc(retrospectivesCollection, retrospectiveData);
        const boardId = retrospectiveDoc.id;

        // Obtener las columnas de la plantilla (incluyendo la de acción)
        const templateColumns = getTemplateColumns(templateId);

        // Crear las columnas en Firestore
        const columnPromises = templateColumns.map(async (column: any, index: number) => {
            const columnData = {
                i18nKey: column.i18nKey,
                type: column.type || 'regular',
                order: index,
                defaultColor: column.defaultColor || 'bg-slate-50 dark:bg-slate-900/40',
                createdAt: serverTimestamp()
            };

            const columnDocRef = doc(
                db!,
                FIRESTORE_COLLECTIONS.RETROSPECTIVES,
                boardId,
                'columns',
                column.id
            );

            return setDoc(columnDocRef, columnData);
        });

        // Ejecutar todas las promesas de creación de columnas
        await Promise.all(columnPromises);

        return { boardId };

    } catch (error) {
        console.error('Error creating board from template:', error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Could not create board from template');
    }
}
