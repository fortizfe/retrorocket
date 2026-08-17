import { execFileSync } from 'node:child_process';

export const DEFAULT_POOL_SIZE = 5;

/**
 * Pure logic: assign a pull request to one of a fixed pool of alias slots.
 * See specs/048-firebase-preview-deploy-config/contracts/pr-preview-alias-cli.md.
 *
 * @param {number} prNumber
 * @param {number} [poolSize]
 * @returns {number} slot number, 1-indexed
 */
export function computeSlot(prNumber, poolSize = DEFAULT_POOL_SIZE) {
    if (!Number.isInteger(prNumber) || prNumber < 0) {
        throw new Error(`Invalid pull request number: ${prNumber}`);
    }
    return (prNumber % poolSize) + 1;
}

/** @param {number} slot @returns {string} */
export function slotHostname(slot) {
    return `retro-rocket-pr-slot-${slot}.vercel.app`;
}

/** @param {number} slot @returns {string} */
export function redirectBaseUrl(slot) {
    return `https://${slotHostname(slot)}`;
}

function parseArgs(argv) {
    const args = { pr: undefined, url: undefined, token: undefined, branch: undefined };
    for (let i = 0; i < argv.length; i += 1) {
        const flag = argv[i];
        const value = argv[i + 1];
        if (flag === '--pr') args.pr = Number(value);
        if (flag === '--url') args.url = value;
        if (flag === '--token') args.token = value;
        if (flag === '--branch') args.branch = value;
    }
    return args;
}

/**
 * Sets OAUTH_REDIRECT_BASE_URL as a real, branch-scoped Vercel-stored Preview
 * environment variable — NOT a local .env file edit. Confirmed live (2026-08-17):
 * a Vercel Function's runtime environment is injected by Vercel's platform from its
 * own stored project config at deploy time; appending to the locally-pulled
 * `.env.preview.local` before `vercel build` has zero effect on the deployed
 * function, regardless of what the built .vc-config.json's (empty) `environment`
 * field might suggest either way. This is why FR-005/sign-in didn't actually work on
 * the first live PR despite the earlier (wrong) file-injection approach passing CI.
 */
async function runSetRedirect(argv) {
    const { pr, branch, token } = parseArgs(argv);
    if (pr === undefined || Number.isNaN(pr) || !branch || !token) {
        console.error('Usage: assign-alias.mjs set-redirect --pr <number> --branch <name> --token <vercel-token>');
        return 1;
    }
    const slot = computeSlot(pr);
    const value = redirectBaseUrl(slot);
    try {
        try {
            execFileSync('vercel', ['env', 'rm', 'OAUTH_REDIRECT_BASE_URL', 'preview', branch, '--yes', '--token', token]);
        } catch {
            // No-op: nothing to remove on this branch's first deploy.
        }
        execFileSync('vercel', ['env', 'add', 'OAUTH_REDIRECT_BASE_URL', 'preview', branch, '--token', token], { input: value });
    } catch (error) {
        console.error(`Failed to set OAUTH_REDIRECT_BASE_URL for branch ${branch}: ${error.message}`);
        return 1;
    }
    console.log(`slot=${slot}`);
    console.log(`OAUTH_REDIRECT_BASE_URL=${value}`);
    return 0;
}

async function runAlias(argv) {
    const { pr, url, token } = parseArgs(argv);
    if (pr === undefined || Number.isNaN(pr) || !url || !token) {
        console.error('Usage: assign-alias.mjs alias --pr <number> --url <deployment-url> --token <vercel-token>');
        return 1;
    }
    const slot = computeSlot(pr);
    const hostname = slotHostname(slot);
    try {
        execFileSync('vercel', ['alias', 'set', url, hostname, '--token', token]);
    } catch (error) {
        console.error(`vercel alias set failed: ${error.message}`);
        return 1;
    }
    return 0;
}

/**
 * @param {string[]} argv
 * @returns {Promise<number>} exit code
 */
export async function run(argv) {
    const [subcommand, ...rest] = argv;
    if (subcommand === 'set-redirect') return runSetRedirect(rest);
    if (subcommand === 'alias') return runAlias(rest);
    console.error('Usage: assign-alias.mjs <set-redirect|alias> [...args]');
    return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    run(process.argv.slice(2)).then((exitCode) => process.exit(exitCode));
}
