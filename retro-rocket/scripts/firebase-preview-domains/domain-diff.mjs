/**
 * Pure logic: given the current authorizedDomains array and an optional hostname to add
 * and/or remove, compute the next array. No network I/O — see sync-domain.mjs/
 * cleanup-orphans.mjs for the CLIs that call this against the real Identity Toolkit API.
 *
 * @param {string[]} currentDomains
 * @param {{ add?: string, remove?: string }} changes
 * @returns {string[]}
 */
export function computeNextDomains(currentDomains, { add, remove } = {}) {
    let next = remove ? currentDomains.filter((domain) => domain !== remove) : [...currentDomains];

    if (add && !next.includes(add)) {
        next = [...next, add];
    }

    return next;
}
