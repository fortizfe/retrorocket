import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDocs,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    writeBatch,
    getDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { CardGroup, Card, Reaction } from '../types/card';
import { FIRESTORE_COLLECTIONS } from '../utils/constants';

const groupsCollection = collection(db as any, FIRESTORE_COLLECTIONS.GROUPS);

/**
 * Create a new card group
 */
export const createCardGroup = async (
    retrospectiveId: string,
    headCardId: string,
    memberCardIds: string[],
    createdBy: string,
    customTitle?: string
): Promise<string> => {
    try {
        console.log('createCardGroup service called with:', {
            retrospectiveId,
            headCardId,
            memberCardIds,
            createdBy,
            customTitle
        });

        // Validate inputs
        if (!retrospectiveId || !headCardId || !createdBy) {
            const error = 'Missing required parameters for group creation';
            console.error(error, { retrospectiveId, headCardId, createdBy });
            throw new Error(error);
        }

        if (memberCardIds.length === 0) {
            const error = 'At least one member card is required to create a group';
            console.error(error);
            throw new Error(error);
        }

        console.log('Input validation passed, fetching head card...');

        // Get head card to determine column and order
        const headCardRef = doc(db as any, FIRESTORE_COLLECTIONS.CARDS, headCardId);
        console.log('Head card reference created:', headCardRef.path);
        console.log('Head card reference created:', headCardRef.path);

        const headCardSnap = await getDoc(headCardRef);
        console.log('Head card document fetched, exists:', headCardSnap.exists());

        if (!headCardSnap.exists()) {
            const error = `Head card not found: ${headCardId}`;
            console.error(error);
            throw new Error(error);
        }

        const headCard = headCardSnap.data() as Card;
        console.log('Head card data:', headCard);

        // Validate that head card belongs to the retrospective
        if (headCard.retrospectiveId !== retrospectiveId) {
            const error = 'Head card does not belong to the specified retrospective';
            console.error(error, {
                cardRetroId: headCard.retrospectiveId,
                expectedRetroId: retrospectiveId
            });
            throw new Error(error);
        }

        console.log('Head card validation passed, creating group document...'); console.log('Head card validation passed, creating group document...');

        // Create the group document first
        const groupData: Partial<Omit<CardGroup, 'id'>> = {
            retrospectiveId,
            column: headCard.column,
            headCardId,
            memberCardIds,
            isCollapsed: false,
            createdAt: new Date(),
            createdBy,
            order: headCard.order ?? 0
        };

        // Add title only if it's provided (avoid undefined fields in Firestore)
        if (customTitle) {
            groupData.title = customTitle;
        }

        console.log('Group data prepared:', groupData);
        console.log('Groups collection reference:', groupsCollection);

        const groupRef = await addDoc(groupsCollection, {
            ...groupData,
            createdAt: serverTimestamp()
        });

        const groupId = groupRef.id;
        console.log('Group document created successfully with ID:', groupId);

        // Now update all cards with batch operation
        console.log('Starting batch update of cards...');
        const batch = writeBatch(db as any);

        // Update head card
        console.log('Updating head card:', headCardId);
        batch.update(headCardRef, {
            groupId: groupId,
            isGroupHead: true,
            updatedAt: serverTimestamp()
        });

        // Update member cards
        console.log('Updating member cards:', memberCardIds);
        memberCardIds.forEach((cardId, index) => {
            console.log(`Updating member card ${index + 1}/${memberCardIds.length}:`, cardId);
            const cardRef = doc(db as any, FIRESTORE_COLLECTIONS.CARDS, cardId);
            batch.update(cardRef, {
                groupId: groupId,
                isGroupHead: false,
                groupOrder: index,
                updatedAt: serverTimestamp()
            });
        });

        console.log('Committing batch update...');
        await batch.commit();
        console.log('Batch update committed successfully');

        console.log('Group creation completed successfully, returning groupId:', groupId);
        return groupId;
    } catch (error) {
        console.error('Error creating card group:', error);
        throw new Error(`Failed to create card group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

/**
 * Disband a card group
 */
export const disbandCardGroup = async (groupId: string): Promise<void> => {
    try {
        const batch = writeBatch(db as any);

        // Get group data
        const groupRef = doc(db as any, FIRESTORE_COLLECTIONS.GROUPS, groupId);
        const groupSnap = await getDoc(groupRef);

        if (!groupSnap.exists()) {
            throw new Error('Group not found');
        }

        const group = groupSnap.data() as CardGroup;

        // Remove group references from all cards
        const allCardIds = [group.headCardId, ...group.memberCardIds];

        allCardIds.forEach(cardId => {
            const cardRef = doc(db as any, FIRESTORE_COLLECTIONS.CARDS, cardId);
            batch.update(cardRef, {
                groupId: null,
                isGroupHead: null,
                groupOrder: null,
                updatedAt: serverTimestamp()
            });
        });

        // Delete the group
        batch.delete(groupRef);

        await batch.commit();
    } catch (error) {
        console.error('Error disbanding card group:', error);
        throw new Error('Failed to disband card group');
    }
};

/**
 * Add a card to an existing group
 */
export const addCardToGroup = async (groupId: string, cardId: string): Promise<void> => {
    try {
        const batch = writeBatch(db as any);

        // Get group data
        const groupRef = doc(db as any, FIRESTORE_COLLECTIONS.GROUPS, groupId);
        const groupSnap = await getDoc(groupRef);

        if (!groupSnap.exists()) {
            throw new Error('Group not found');
        }

        const group = groupSnap.data() as CardGroup;

        // Update group with new member
        const newMemberCardIds = [...group.memberCardIds, cardId];
        batch.update(groupRef, {
            memberCardIds: newMemberCardIds,
            updatedAt: serverTimestamp()
        });

        // Update card
        const cardRef = doc(db as any, FIRESTORE_COLLECTIONS.CARDS, cardId);
        batch.update(cardRef, {
            groupId,
            isGroupHead: false,
            groupOrder: newMemberCardIds.length - 1,
            updatedAt: serverTimestamp()
        });

        await batch.commit();
    } catch (error) {
        console.error('Error adding card to group:', error);
        throw new Error('Failed to add card to group');
    }
};

/**
 * Remove a card from a group
 */
export const removeCardFromGroup = async (cardId: string): Promise<void> => {
    try {
        // First get the card to find its group
        const cardRef = doc(db as any, FIRESTORE_COLLECTIONS.CARDS, cardId);
        const cardSnap = await getDoc(cardRef);

        if (!cardSnap.exists()) {
            throw new Error('Card not found');
        }

        const card = cardSnap.data() as Card;
        if (!card.groupId) {
            throw new Error('Card is not in a group');
        }

        const batch = writeBatch(db as any);

        // Get group data
        const groupRef = doc(db as any, FIRESTORE_COLLECTIONS.GROUPS, card.groupId);
        const groupSnap = await getDoc(groupRef);

        if (!groupSnap.exists()) {
            throw new Error('Group not found');
        }

        const group = groupSnap.data() as CardGroup;

        // Check if removing the head card
        if (group.headCardId === cardId) {
            // If removing head card and there are members, promote first member
            if (group.memberCardIds.length > 0) {
                const newHeadCardId = group.memberCardIds[0];
                const newMemberCardIds = group.memberCardIds.slice(1);

                // Update group
                batch.update(groupRef, {
                    headCardId: newHeadCardId,
                    memberCardIds: newMemberCardIds,
                    updatedAt: serverTimestamp()
                });

                // Update new head card
                const newHeadCardRef = doc(db as any, FIRESTORE_COLLECTIONS.CARDS, newHeadCardId);
                batch.update(newHeadCardRef, {
                    isGroupHead: true,
                    groupOrder: null,
                    updatedAt: serverTimestamp()
                });

                // Update remaining member cards order
                newMemberCardIds.forEach((memberId, index) => {
                    const memberRef = doc(db as any, FIRESTORE_COLLECTIONS.CARDS, memberId);
                    batch.update(memberRef, {
                        groupOrder: index,
                        updatedAt: serverTimestamp()
                    });
                });
            } else {
                // No members left, disband the group
                batch.delete(groupRef);
            }
        } else {
            // Removing a member card
            const newMemberCardIds = group.memberCardIds.filter(id => id !== cardId);

            batch.update(groupRef, {
                memberCardIds: newMemberCardIds,
                updatedAt: serverTimestamp()
            });

            // Update remaining member cards order
            newMemberCardIds.forEach((memberId, index) => {
                const memberRef = doc(db as any, FIRESTORE_COLLECTIONS.CARDS, memberId);
                batch.update(memberRef, {
                    groupOrder: index,
                    updatedAt: serverTimestamp()
                });
            });
        }

        // Remove group references from the removed card
        batch.update(cardRef, {
            groupId: null,
            isGroupHead: null,
            groupOrder: null,
            updatedAt: serverTimestamp()
        });

        await batch.commit();
    } catch (error) {
        console.error('Error removing card from group:', error);
        throw new Error('Failed to remove card from group');
    }
};

/**
 * Update group collapse state
 */
export const updateGroupCollapseState = async (groupId: string, isCollapsed: boolean): Promise<void> => {
    try {
        const groupRef = doc(db as any, FIRESTORE_COLLECTIONS.GROUPS, groupId);
        await updateDoc(groupRef, {
            isCollapsed,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating group collapse state:', error);
        throw new Error('Failed to update group collapse state');
    }
};

/**
 * Get groups for a retrospective
 */
export const getRetrospectiveGroups = async (retrospectiveId: string): Promise<CardGroup[]> => {
    try {
        const q = query(
            groupsCollection,
            where('retrospectiveId', '==', retrospectiveId),
            orderBy('order', 'asc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as CardGroup[];
    } catch (error) {
        console.error('Error getting retrospective groups:', error);
        throw new Error('Failed to get retrospective groups');
    }
};

/**
 * Subscribe to groups for a retrospective
 */
export const subscribeToRetrospectiveGroups = (
    retrospectiveId: string,
    callback: (groups: CardGroup[]) => void
): (() => void) => {
    const q = query(
        groupsCollection,
        where('retrospectiveId', '==', retrospectiveId),
        orderBy('order', 'asc')
    );

    return onSnapshot(q, (querySnapshot) => {
        const groups = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as CardGroup[];

        callback(groups);
    }, (error) => {
        console.error('Error in groups subscription:', error);
    });
};

/**
 * Calculate group aggregations (votes, likes, reactions)
 */
export const calculateGroupAggregations = (group: CardGroup, cards: Card[]): CardGroup => {
    const groupCards = cards.filter(card =>
        card.id === group.headCardId || group.memberCardIds.includes(card.id)
    );

    let totalVotes = 0;
    let totalLikes = 0;
    const allReactions: Reaction[] = [];

    groupCards.forEach(card => {
        totalVotes += card.votes ?? 0;
        totalLikes += card.likes?.length ?? 0;
        if (card.reactions) {
            allReactions.push(...card.reactions);
        }
    });

    return {
        ...group,
        totalVotes,
        totalLikes,
        allReactions
    };
};
