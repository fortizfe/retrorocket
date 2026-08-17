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
    const args = { pr: undefined, url: undefined, token: undefined };
    for (let i = 0; i < argv.length; i += 1) {
        const flag = argv[i];
        const value = argv[i + 1];
        if (flag === '--pr') args.pr = Number(value);
        if (flag === '--url') args.url = value;
        if (flag === '--token') args.token = value;
    }
    return args;
}

async function runCompute(argv) {
    const { pr } = parseArgs(argv);
    if (pr === undefined || Number.isNaN(pr)) {
        console.error('Usage: assign-alias.mjs compute --pr <number>');
        return 1;
    }
    const slot = computeSlot(pr);
    console.log(`slot=${slot}`);
    console.log(`OAUTH_REDIRECT_BASE_URL=${redirectBaseUrl(slot)}`);
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
    if (subcommand === 'compute') return runCompute(rest);
    if (subcommand === 'alias') return runAlias(rest);
    console.error('Usage: assign-alias.mjs <compute|alias> [...args]');
    return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    run(process.argv.slice(2)).then((exitCode) => process.exit(exitCode));
}
