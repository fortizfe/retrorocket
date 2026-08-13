/**
 * Hand-curated, fictional-but-realistic Demo Dataset (data-model.md's `Demo
 * Dataset` entity) seeded by `landing-capture.ts` before capturing Media
 * Assets — never real user/customer data (FR-005).
 */

export const DEMO_PRESENTER = {
    email: 'landing-demo-presenter@example.com',
    displayName: 'Alex Rivera',
};

/** Extra boards so the Dashboard capture (the `capabilities` section) shows a populated list, not a single lonely board. */
export const DEMO_DASHBOARD_BOARDS: readonly string[] = [
    'Platform Squad Retro',
    'Q3 Growth Team',
];

/** The board actually opened for the `howItWorks` section capture. */
export const DEMO_BOARD_TITLE = 'Product Design Weekly';

// Only 'helped' | 'hindered' | 'improve' are regular card columns
// (src/lib/utils/constants.ts getColumns()) populated via POST
// /api/retrospectives/:id/cards. The board's 4th panel ("Elementos de
// Acción") is a structurally distinct feature (action items, created via a
// separate endpoint with no custom-content support) — intentionally left
// unseeded here rather than shown empty/placeholder-worded.
export const DEMO_CARDS: Record<'helped' | 'hindered' | 'improve', string[]> = {
    helped: [
        'Pairing sessions helped us ship the onboarding flow a week early',
        'Clear async updates in Slack kept everyone unblocked',
        'The new component library sped up handoff to engineering',
    ],
    hindered: [
        'Too many overlapping meetings on Wednesdays',
        'The staging environment was flaky for most of the sprint',
    ],
    // Still genuine forward-looking suggestions (the "improve" column's
    // purpose) but phrased the way an engaged team actually writes them —
    // enthusiastic about a change already paying off, not flatly neutral —
    // which also gives the sentiment-analysis capture (FR-004's `sentiment`
    // section) a realistic, not artificially inflated, positive-leaning mood
    // to show off.
    improve: [
        'Really glad we started documenting the API contract early — worth doing for every sprint',
        'Loved rotating note-taking duty this time, let us keep that going',
        'Excited to set up a shared staging health-check dashboard next sprint',
        'A no-meeting block on Wednesdays would be a great addition to the calendar',
    ],
};
