import { describe, it, expect } from 'vitest';
import { JoseMcpTokenAdapter } from '../../../src/adapters/session/JoseMcpTokenAdapter';

const NOW = Math.floor(Date.now() / 1000);
const CLAIMS = { sub: 'u1', connectionId: 'conn1', clientId: 'client1' };

describe('JoseMcpTokenAdapter', () => {
    const svc = new JoseMcpTokenAdapter('test-mcp-signing-key-0123456789');

    it('issues a verifiable access token carrying sub/connectionId/clientId', async () => {
        const token = await svc.issue(CLAIMS, NOW, 3600);
        const verified = await svc.verify(token, NOW);
        expect(verified).toEqual(CLAIMS);
    });

    it('rejects a token verified with a different signing key', async () => {
        const token = await svc.issue(CLAIMS, NOW, 3600);
        const other = new JoseMcpTokenAdapter('a-completely-different-key-9876');
        expect(await other.verify(token, NOW)).toBeNull();
    });

    it('rejects a tampered token', async () => {
        const token = await svc.issue(CLAIMS, NOW, 3600);
        const tampered = token.slice(0, -3) + 'aaa';
        expect(await svc.verify(tampered, NOW)).toBeNull();
    });

    it('rejects an expired token', async () => {
        const token = await svc.issue(CLAIMS, NOW, 3600);
        expect(await svc.verify(token, NOW + 3601)).toBeNull();
    });

    it('rejects a malformed/non-JWT string', async () => {
        expect(await svc.verify('not-a-jwt', NOW)).toBeNull();
    });
});
