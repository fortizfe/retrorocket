import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatDate, generateUniqueId, isEmpty } from '../../utils/helpers';

describe('helpers', () => {
    beforeEach(() => {
        // Reset any mocks before each test
        vi.clearAllMocks();
    });

    describe('formatDate', () => {
        it('should format date correctly in en-US locale', () => {
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

        it('should work with Date.now()', () => {
            const now = new Date();
            const formatted = formatDate(now);
            expect(formatted).toMatch(/\w+ \d{1,2}, \d{4}/);
        });
    });

    describe('generateUniqueId', () => {
        it('should generate a string ID starting with "id-"', () => {
            const id = generateUniqueId();
            expect(id).toMatch(/^id-[a-z0-9]+$/);
        });

        it('should generate unique IDs', () => {
            const id1 = generateUniqueId();
            const id2 = generateUniqueId();
            expect(id1).not.toBe(id2);
        });

        it('should generate IDs with consistent length structure', () => {
            const id = generateUniqueId();
            expect(id.length).toBeGreaterThan(3); // "id-" + at least some characters
            expect(id.startsWith('id-')).toBe(true);
        });

        it('should generate multiple unique IDs', () => {
            const ids = Array.from({ length: 100 }, () => generateUniqueId());
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(100);
        });
    });

    describe('isEmpty', () => {
        it('should return true for null', () => {
            expect(isEmpty(null)).toBe(true);
        });

        it('should return true for undefined', () => {
            expect(isEmpty(undefined)).toBe(true);
        });

        it('should return true for empty string', () => {
            expect(isEmpty('')).toBe(true);
        });

        it('should return false for non-empty string', () => {
            expect(isEmpty('hello')).toBe(false);
        });

        it('should return false for number 0', () => {
            expect(isEmpty(0)).toBe(false);
        });

        it('should return false for boolean false', () => {
            expect(isEmpty(false)).toBe(false);
        });

        it('should return false for arrays', () => {
            expect(isEmpty([])).toBe(false);
            expect(isEmpty([1, 2, 3])).toBe(false);
        });

        it('should return false for objects', () => {
            expect(isEmpty({})).toBe(false);
            expect(isEmpty({ key: 'value' })).toBe(false);
        });

        it('should return false for whitespace-only strings', () => {
            expect(isEmpty(' ')).toBe(false);
            expect(isEmpty('\n')).toBe(false);
            expect(isEmpty('\t')).toBe(false);
        });
    });
});
