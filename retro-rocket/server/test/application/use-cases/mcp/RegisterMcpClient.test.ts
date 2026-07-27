import { describe, it, expect } from 'vitest';
import { registerMcpClient } from '../../../../src/application/use-cases/mcp/RegisterMcpClient';
import { AppError } from '../../../../src/domain/errors';
import { inMemoryClientStore, fixedClock, sequentialRandom } from './mcpFakes';

describe('registerMcpClient', () => {
    it('registers a new public client and returns its clientId', async () => {
        const clientStore = inMemoryClientStore();
        const client = await registerMcpClient(
            { clientStore, clock: fixedClock(), random: sequentialRandom() },
            { clientName: 'Claude', redirectUris: ['https://claude.ai/callback'] },
        );
        expect(client.data.clientName).toBe('Claude');
        expect(client.data.tokenEndpointAuthMethod).toBe('none');
        expect(await clientStore.getById(client.data.clientId)).not.toBeNull();
    });

    it('rejects a missing client_name', async () => {
        await expect(
            registerMcpClient(
                { clientStore: inMemoryClientStore(), clock: fixedClock(), random: sequentialRandom() },
                { clientName: '', redirectUris: ['https://x/callback'] },
            ),
        ).rejects.toThrow(AppError);
    });

    it('rejects empty redirect_uris', async () => {
        await expect(
            registerMcpClient(
                { clientStore: inMemoryClientStore(), clock: fixedClock(), random: sequentialRandom() },
                { clientName: 'Claude', redirectUris: [] },
            ),
        ).rejects.toThrow(AppError);
    });
});
