import { computeNextDomains } from './domain-diff.mjs';

function parseArgs(argv) {
    const args = { project: undefined, add: undefined, remove: undefined };
    for (let i = 0; i < argv.length; i += 1) {
        const flag = argv[i];
        const value = argv[i + 1];
        if (flag === '--project') args.project = value;
        if (flag === '--add') args.add = value;
        if (flag === '--remove') args.remove = value;
    }
    return args;
}

/**
 * @param {string[]} argv
 * @returns {Promise<number>} exit code
 */
export async function run(argv) {
    const { project, add, remove } = parseArgs(argv);

    if (!project || (!add && !remove)) {
        console.error('Usage: sync-domain.mjs --project <id> [--add <hostname>] [--remove <hostname>]');
        return 1;
    }

    const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
    if (!accessToken) {
        console.error('Missing GOOGLE_ACCESS_TOKEN environment variable.');
        return 1;
    }

    const configUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${project}/config`;
    const headers = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
    };

    const getResponse = await fetch(configUrl, { headers });
    if (!getResponse.ok) {
        console.error(`GET ${configUrl} failed with status ${getResponse.status}`);
        return 1;
    }

    const config = await getResponse.json();
    const nextDomains = computeNextDomains(config.authorizedDomains ?? [], { add, remove });

    const patchResponse = await fetch(`${configUrl}?updateMask=authorizedDomains`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ authorizedDomains: nextDomains }),
    });
    if (!patchResponse.ok) {
        console.error(`PATCH ${configUrl} failed with status ${patchResponse.status}`);
        return 1;
    }

    return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    run(process.argv.slice(2)).then((exitCode) => process.exit(exitCode));
}
