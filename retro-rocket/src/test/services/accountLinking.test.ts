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

            // Test that main methods exist
            expect(typeof service.signInWithAccountLinking).toBe('function');
            expect(typeof service.getLinkedProviders).toBe('function');
        });
    });
});
