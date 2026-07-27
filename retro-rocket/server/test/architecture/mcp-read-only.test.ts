import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const FILE = path.resolve(__dirname, '../../src/adapters/firebase/FirestoreRetrospectiveReadAdapter.ts');

/**
 * FR-013: nothing exposed through the MCP connector may create, edit, or delete
 * retrospective data. FirestoreRetrospectiveReadAdapter is the sole Firestore access
 * point for that data. Rather than a naive text scan for `.set(`/`.update(`/`.delete(`
 * (which false-positives on ordinary JS `Map`/`Set` usage — `entries.set(...)` is not a
 * Firestore write), this asserts every public async method on the class is read-shaped
 * (`get*`/`list*`), matching `RetrospectiveReadPort`'s interface exactly.
 */
describe('MCP retrospective read-adapter is read-only', () => {
    it('FirestoreRetrospectiveReadAdapter.ts exposes only get*/list* public methods', () => {
        const src = readFileSync(FILE, 'utf8');
        const methodNames = [...src.matchAll(/^\s{4}async (\w+)\(/gm)].map((m) => m[1]);
        expect(methodNames.length).toBeGreaterThan(0);
        const nonReadMethods = methodNames.filter((name) => !/^(get|list)[A-Z]/.test(name));
        expect(nonReadMethods, `non-read-shaped methods found: ${nonReadMethods.join(', ')}`).toEqual([]);
    });

    it('never calls a Firestore document/collection write method (set/update/delete/add on a Firestore ref)', () => {
        const src = readFileSync(FILE, 'utf8');
        // Firestore write calls in this codebase are always chained directly off
        // `.doc(...)` or `.collection(...)` — unlike Map/Set's `.set()`, which operates
        // on a bare local identifier. Requiring the immediately preceding token to be a
        // Firestore accessor call keeps this free of the Map/Set false positive.
        const firestoreWritePattern = /\.(?:doc|collection)\([^)]*\)\s*\.(set|update|delete|add)\(/;
        expect(firestoreWritePattern.test(src)).toBe(false);
    });
});
