import { describe, it, expect } from 'vitest';
import { updateDisplayName } from '../../../src/application/use-cases/UpdateDisplayName';
import { AppError } from '../../../src/domain/errors';
import { fixedClock, fakeIdentityStore, fakeSessionService } from './fakes';

function deps() {
    return { identityStore: fakeIdentityStore(), sessionService: fakeSessionService(), clock: fixedClock() };
}

describe('updateDisplayName', () => {
    it('persists the trimmed display name and re-issues the session', async () => {
        const d = deps();
        const result = await updateDisplayName(d, { uid: 'uid-1', displayName: '  New Name  ' });

        expect(d.identityStore.updateDisplayName).toHaveBeenCalledWith('uid-1', 'New Name');
        expect(result.user.displayName).toBe('New Name');
        expect(result.refreshedCookie.token).toBeTruthy();
        expect(result.refreshedCookie.maxAgeSeconds).toBeGreaterThan(0);
    });

    it('rejects an empty display name', async () => {
        await expect(updateDisplayName(deps(), { uid: 'uid-1', displayName: '   ' })).rejects.toThrow(AppError);
    });

    it('rejects a fully empty string', async () => {
        await expect(updateDisplayName(deps(), { uid: 'uid-1', displayName: '' })).rejects.toThrow(AppError);
    });
});
