import { describe, it, expect } from 'vitest';
import { AccountLinkingService } from '../../services/accountLinking';

describe('AccountLinkingService', () => {
    describe('Singleton pattern', () => {
        it('should return same instance', () => {
            const instance1 = AccountLinkingService.getInstance();
            const instance2 = AccountLinkingService.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe('Error handling', () => {
        it('should throw error when Firebase Auth is not initialized', async () => {
            const service = AccountLinkingService.getInstance();

            await expect(service.signInWithAccountLinking('google')).rejects.toThrow('Firebase Auth is not initialized');
        });

        it('should handle getLinkedProviders without auth', async () => {
            const service = AccountLinkingService.getInstance();

            await expect(service.getLinkedProviders('test@example.com')).rejects.toThrow('Firebase Auth is not initialized');
        });
    });
});
