import React from 'react';
import GuidePage from '@/features/guide/components/GuidePage';

/**
 * `/guide` — thin route wrapper matching the `Dashboard.tsx`/`Teams.tsx`
 * convention already used for every other page-level route in this app:
 * the page itself owns no logic, it just renders the feature-owned layout
 * component.
 *
 * Unlike `Dashboard`/`Teams`, this route is intentionally NOT wrapped in
 * `AuthWrapper` — per spec.md FR-002, the guide MUST be reachable and fully
 * viewable without requiring sign-in (matching how `/` and `/dashboard`
 * are not gated at the App.tsx route-registration level either; see
 * App.tsx's route table vs. the explicit `<AuthWrapper requireAuth={true}>`
 * wrapping used only for `/mcp/consent`).
 */
const Guide: React.FC = () => <GuidePage />;

export default Guide;
