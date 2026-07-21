import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatDate, generateUniqueId, isEmpty } from '@/lib/utils/helpers';

describe('helpers utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('formatDate', () => {
        it('should format date correctly', () => {
            const date = new Date('2024-01-15T10:30:00Z');
            const formatted = formatDate(date);
            expect(formatted).toBe('January 15, 2024');
        });

        it('should handle different dates correctly', () => {
            const date1 = new Date('2023-12-25T00:00:00Z');
            const date2 = new Date('2024-07-04T12:00:00Z');

            expect(formatDate(date1)).toBe('December 25, 2023');
            expect(formatDate(date2)).toBe('July 4, 2024');
        });
    });

    describe('generateUniqueId', () => {
        it('should generate a string ID starting with "id-"', () => {
            const id = generateUniqueId();
            expect(id).toMatch(/^id-[a-z0-9]+$/);
        });

        it('should generate unique IDs', () => {
            const ids = Array.from({ length: 100 }, () => generateUniqueId());
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(100);
        });
    });

    describe('isEmpty', () => {
        it('should return true for empty values', () => {
            expect(isEmpty(null)).toBe(true);
            expect(isEmpty(undefined)).toBe(true);
            expect(isEmpty('')).toBe(true);
        });

        it('should return false for non-empty values', () => {
            expect(isEmpty('hello')).toBe(false);
            expect(isEmpty(0)).toBe(false);
            expect(isEmpty(false)).toBe(false);
            expect(isEmpty([])).toBe(false);
            expect(isEmpty({})).toBe(false);
        });
    });
});
