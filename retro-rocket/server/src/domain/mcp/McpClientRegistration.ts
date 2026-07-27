export interface McpClientRegistrationData {
    clientId: string;
    clientName: string;
    redirectUris: string[];
    tokenEndpointAuthMethod: 'none';
    createdAt: number;
}

/**
 * A Dynamic Client Registration record (data-model.md "McpClientRegistration") — one row
 * per distinct AI client application, not per user. Public client only (PKCE, no secret),
 * since MCP clients are typically installed apps/browser-based, not confidential clients.
 */
export class McpClientRegistration {
    constructor(public readonly data: McpClientRegistrationData) {}

    static register(params: { clientId: string; clientName: string; redirectUris: string[]; nowSeconds: number }): McpClientRegistration {
        return new McpClientRegistration({
            clientId: params.clientId,
            clientName: params.clientName,
            redirectUris: params.redirectUris,
            tokenEndpointAuthMethod: 'none',
            createdAt: params.nowSeconds,
        });
    }

    allowsRedirectUri(redirectUri: string): boolean {
        return this.data.redirectUris.includes(redirectUri);
    }
}
