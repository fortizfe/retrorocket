import type { RetrospectiveListEntry, RetrospectiveReadPort } from '../../ports/mcp';

/** `list_retrospectives` MCP tool (User Story 2, FR-006). Always a live read — no caching. */
export async function listRetrospectives(
    deps: { retrospectiveReadPort: RetrospectiveReadPort },
    uid: string,
): Promise<RetrospectiveListEntry[]> {
    return deps.retrospectiveReadPort.listRetrospectivesForUser(uid);
}
