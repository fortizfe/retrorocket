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

    describe('Basic functionality', () => {
        it('should have required methods', () => {
            const service = AccountLinkingService.getInstance();

            expect(typeof service.signInWithAccountLinking).toBe('function');
            expect(typeof service.getLinkedProviders).toBe('function');
        });

        it('should handle errors gracefully', async () => {
            const service = AccountLinkingService.getInstance();

            // Test that methods exist and can be called (even if they fail)
            await expect(service.signInWithAccountLinking('google')).rejects.toThrow();

            // getLinkedProviders returns empty array on error
            const result = await service.getLinkedProviders('test@example.com');
            expect(Array.isArray(result)).toBe(true);
        });
    });
});
