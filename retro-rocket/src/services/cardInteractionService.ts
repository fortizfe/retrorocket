import {
    updateDoc,
    doc,
    getDoc,
    arrayUnion,
    arrayRemove,
    serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Like, Reaction, EmojiReaction } from '../types/card';
import { FIRESTORE_COLLECTIONS } from '../utils/constants';

/**
 * Toggle like on a card - each user can only like once
 */
export const toggleLike = async (
    cardId: string,
    userId: string,
    username: string
): Promise<void> => {
    try {
        const cardRef = doc(db as any, FIRESTORE_COLLECTIONS.CARDS, cardId);
        const cardSnapshot = await getDoc(cardRef);

        if (!cardSnapshot.exists()) {
            throw new Error('Card not found');
        }

        const cardData = cardSnapshot.data();
        const likes: Like[] = cardData.likes || [];

        // Check if user already liked
        const existingLikeIndex = likes.findIndex(like => like.userId === userId);

        if (existingLikeIndex >= 0) {
            // Remove like
            const likeToRemove = likes[existingLikeIndex];
            await updateDoc(cardRef, {
                likes: arrayRemove(likeToRemove),
                updatedAt: serverTimestamp()
            });
        } else {
            // Add like
            const newLike: Like = {
                userId,
                username,
                timestamp: new Date()
            };
            await updateDoc(cardRef, {
                likes: arrayUnion(newLike),
                updatedAt: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        throw new Error('Failed to toggle like');
    }
};

/**
 * Add or update emoji reaction - each user can only have one reaction per card
 */
export const addOrUpdateReaction = async (
    cardId: string,
    userId: string,
    username: string,
    emoji: EmojiReaction
): Promise<void> => {
    try {
        console.log('Adding reaction:', { cardId, userId, username, emoji });
        const cardRef = doc(db as any, FIRESTORE_COLLECTIONS.CARDS, cardId);
        const cardSnapshot = await getDoc(cardRef);

        if (!cardSnapshot.exists()) {
            throw new Error('Card not found');
        }

        const cardData = cardSnapshot.data();
        const reactions: Reaction[] = cardData.reactions ?? [];

        // Remove any existing reaction from this user
        const userReactions = reactions.filter(reaction => reaction.userId === userId);
        for (const reaction of userReactions) {
            await updateDoc(cardRef, {
                reactions: arrayRemove(reaction)
            });
        }

        // Add new reaction
        const newReaction: Reaction = {
            userId,
            username,
            emoji,
            timestamp: new Date()
        };

        console.log('Adding new reaction:', newReaction);
        await updateDoc(cardRef, {
            reactions: arrayUnion(newReaction),
            updatedAt: serverTimestamp()
        });
        console.log('Reaction added successfully');
    } catch (error) {
        console.error('Error adding reaction:', error);
        throw new Error('Failed to add reaction');
    }
};

/**
 * Remove user's reaction from a card
 */
export const removeReaction = async (
    cardId: string,
    userId: string
): Promise<void> => {
    try {
        const cardRef = doc(db as any, FIRESTORE_COLLECTIONS.CARDS, cardId);
        const cardSnapshot = await getDoc(cardRef);

        if (!cardSnapshot.exists()) {
            throw new Error('Card not found');
        }

        const cardData = cardSnapshot.data();
        const reactions: Reaction[] = cardData.reactions || [];

        // Find and remove user's reaction
        const userReaction = reactions.find(reaction => reaction.userId === userId);
        if (userReaction) {
            await updateDoc(cardRef, {
                reactions: arrayRemove(userReaction),
                updatedAt: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error removing reaction:', error);
        throw new Error('Failed to remove reaction');
    }
};

/**
 * Update card order for drag and drop
 */
export const updateCardOrder = async (
    cardId: string,
    newOrder: number,
    newColumn?: string
): Promise<void> => {
    try {
        const cardRef = doc(db as any, FIRESTORE_COLLECTIONS.CARDS, cardId);
        const updateData: any = {
            order: newOrder,
            updatedAt: serverTimestamp()
        };

        if (newColumn) {
            updateData.column = newColumn;
        }

        await updateDoc(cardRef, updateData);
    } catch (error) {
        console.error('Error updating card order:', error);
        throw new Error('Failed to update card order');
    }
};

/**
 * Batch update multiple cards order (for reordering)
 */
export const batchUpdateCardOrder = async (
    updates: Array<{ cardId: string; order: number; column?: string }>
): Promise<void> => {
    try {
        // For simplicity, we'll update one by one
        // In production, you might want to use batch writes
        const promises = updates.map(update =>
            updateCardOrder(update.cardId, update.order, update.column)
        );

        await Promise.all(promises);
    } catch (error) {
        console.error('Error batch updating card order:', error);
        throw new Error('Failed to update cards order');
    }
};
