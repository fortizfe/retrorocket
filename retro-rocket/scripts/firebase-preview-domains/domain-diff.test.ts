import { describe, it, expect } from 'vitest';
import { computeNextDomains } from './domain-diff.mjs';

describe('computeNextDomains', () => {
    it('adds a domain that is absent', () => {
        const result = computeNextDomains(['localhost', 'a.vercel.app'], { add: 'b.vercel.app' });
        expect(result).toEqual(['localhost', 'a.vercel.app', 'b.vercel.app']);
    });

    it('does not duplicate a domain that is already present', () => {
        const result = computeNextDomains(['localhost', 'a.vercel.app'], { add: 'a.vercel.app' });
        expect(result).toEqual(['localhost', 'a.vercel.app']);
    });

    it('removes a domain that is present', () => {
        const result = computeNextDomains(['localhost', 'a.vercel.app', 'b.vercel.app'], { remove: 'a.vercel.app' });
        expect(result).toEqual(['localhost', 'b.vercel.app']);
    });

    it('is a no-op when removing a domain that is absent', () => {
        const result = computeNextDomains(['localhost', 'a.vercel.app'], { remove: 'not-there.vercel.app' });
        expect(result).toEqual(['localhost', 'a.vercel.app']);
    });

    it('applies both add and remove in a single call (FR-006 ordering guarantee)', () => {
        // The new domain is present in the result whether or not the old one existed to
        // remove — there is never a separate "remove, then add" pair of network calls.
        const result = computeNextDomains(['localhost', 'old.vercel.app'], {
            add: 'new.vercel.app',
            remove: 'old.vercel.app',
        });
        expect(result).toEqual(['localhost', 'new.vercel.app']);
    });

    it('adds the new domain even when the domain to remove is already absent', () => {
        const result = computeNextDomains(['localhost'], {
            add: 'new.vercel.app',
            remove: 'never-was-there.vercel.app',
        });
        expect(result).toEqual(['localhost', 'new.vercel.app']);
    });

    it('never reorders or drops unrelated existing entries', () => {
        const current = ['localhost', 'retrorocket-staging.firebaseapp.com', 'retrorocket-staging.web.app'];
        const result = computeNextDomains(current, { add: 'pr-42.vercel.app' });
        expect(result).toEqual([
            'localhost',
            'retrorocket-staging.firebaseapp.com',
            'retrorocket-staging.web.app',
            'pr-42.vercel.app',
        ]);
    });

    it('does not mutate the input array', () => {
        const current = ['localhost'];
        computeNextDomains(current, { add: 'new.vercel.app' });
        expect(current).toEqual(['localhost']);
    });
});
