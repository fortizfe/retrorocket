import type { ClockPort, RandomPort } from '../../ports';
import type { McpClientStorePort } from '../../ports/mcp';
import { McpClientRegistration } from '../../../domain/mcp/McpClientRegistration';
import { AppError } from '../../../domain/errors';

export interface RegisterMcpClientDeps {
    clientStore: McpClientStorePort;
    clock: ClockPort;
    random: RandomPort;
}

export interface RegisterMcpClientInput {
    clientName: string;
    redirectUris: string[];
}

/** Dynamic Client Registration (contracts/oauth-endpoints.md `POST /api/mcp/register`). */
export async function registerMcpClient(
    deps: RegisterMcpClientDeps,
    input: RegisterMcpClientInput,
): Promise<McpClientRegistration> {
    if (!input.clientName || input.clientName.trim() === '') {
        throw new AppError('invalid_request', 'client_name is required', 400);
    }
    if (!Array.isArray(input.redirectUris) || input.redirectUris.length === 0) {
        throw new AppError('invalid_request', 'redirect_uris is required and must be non-empty', 400);
    }

    const client = McpClientRegistration.register({
        clientId: deps.random.state(),
        clientName: input.clientName,
        redirectUris: input.redirectUris,
        nowSeconds: deps.clock.nowSeconds(),
    });
    await deps.clientStore.register(client);
    return client;
}
