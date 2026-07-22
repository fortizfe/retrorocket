import { readFile } from 'node:fs/promises';
import { restoreCache } from '@actions/cache';

function parseArgs(argv) {
    const args = { project: undefined, openPrNumbers: undefined };
    for (let i = 0; i < argv.length; i += 1) {
        const flag = argv[i];
        const value = argv[i + 1];
        if (flag === '--project') args.project = value;
        if (flag === '--open-pr-numbers') args.openPrNumbers = value;
    }
    return args;
}

const cacheKeyFor = (prNumber) => `preview-domain-pr-${prNumber}`;
const cachePathFor = (prNumber) => `.preview-domain-pr-${prNumber}`;

/**
 * Any authorized domain this feature could plausibly have added is a Vercel preview
 * hostname; anything else (localhost, *.firebaseapp.com, *.web.app, a custom prod domain,
 * etc.) is one of Firebase's own defaults or an unrelated entry and must never be touched.
 */
const isCandidateForRemoval = (domain) => domain.endsWith('.vercel.app');

/**
 * Resolve the hostname currently cached for one open PR, or undefined if there is none.
 * @param {string} prNumber
 */
async function resolveLegitimateHostname(prNumber) {
    const path = cachePathFor(prNumber);
    const hitKey = await restoreCache([path], cacheKeyFor(prNumber));
    if (!hitKey) return undefined;
    const content = await readFile(path, 'utf8');
    return content.trim();
}

/**
 * @param {string[]} argv
 * @returns {Promise<number>} exit code
 */
export async function run(argv) {
    const { project, openPrNumbers } = parseArgs(argv);

    if (!project || !openPrNumbers) {
        console.error('Usage: cleanup-orphans.mjs --project <id> --open-pr-numbers <comma-separated PR numbers>');
        return 1;
    }

    const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
    if (!accessToken) {
        console.error('Missing GOOGLE_ACCESS_TOKEN environment variable.');
        return 1;
    }

    const prNumbers = openPrNumbers
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

    const legitimateHostnames = new Set();
    try {
        for (const prNumber of prNumbers) {
            const hostname = await resolveLegitimateHostname(prNumber);
            if (hostname) legitimateHostnames.add(hostname);
        }
    } catch (error) {
        console.error(`Failed to resolve cached preview domains: ${error.message}`);
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
    const currentDomains = config.authorizedDomains ?? [];
    const removed = currentDomains.filter(
        (domain) => isCandidateForRemoval(domain) && !legitimateHostnames.has(domain)
    );
    const nextDomains = currentDomains.filter((domain) => !removed.includes(domain));

    const patchResponse = await fetch(`${configUrl}?updateMask=authorizedDomains`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ authorizedDomains: nextDomains }),
    });
    if (!patchResponse.ok) {
        console.error(`PATCH ${configUrl} failed with status ${patchResponse.status}`);
        return 1;
    }

    console.log(
        removed.length > 0
            ? `Removed orphaned preview domains: ${removed.join(', ')}`
            : 'No orphaned preview domains found.'
    );

    return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    run(process.argv.slice(2)).then((exitCode) => process.exit(exitCode));
}
