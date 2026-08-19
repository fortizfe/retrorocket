import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildTeamsTestApp, sessionCookieFor } from './teamsTestApp';
import { fakeTeam, fakeMembership, fakeProfile } from '../../application/use-cases/teams/teamsFakes';

// Route-level Supertest coverage for teams.ts (feature 054), mirroring boards.test.ts's
// convention: an Express app wired with fake TeamsPort/ProfilePort implementations (no
// real Firestore), exercising each endpoint's happy path plus the error statuses
// already proven at the use-case level (CreateTeam/GetTeamWithMembers/AddTeamMember/
// RemoveTeamMember/LeaveTeam tests under test/application/use-cases/teams/).

describe('POST /api/teams', () => {
    it('creates a team and returns 201 with a teamId', async () => {
        const { app } = buildTeamsTestApp();
        const res = await request(app)
            .post('/api/teams')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ name: 'New Team' });
        expect(res.status).toBe(201);
        expect(res.body.teamId).toBeTruthy();
    });

    it('400s on an empty name', async () => {
        const { app } = buildTeamsTestApp();
        const res = await request(app)
            .post('/api/teams')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ name: '   ' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('validation_error');
    });

    it('401s without a session cookie', async () => {
        const { app } = buildTeamsTestApp();
        const res = await request(app).post('/api/teams').send({ name: 'New Team' });
        expect(res.status).toBe(401);
    });
});

describe('GET /api/teams', () => {
    it('lists the signed-in user’s teams', async () => {
        const { app } = buildTeamsTestApp({
            teams: [fakeTeam({ id: 't1', ownerId: 'u1', createdBy: 'u1' })],
            memberships: [fakeMembership({ id: 'm1', teamId: 't1', userId: 'u1', role: 'owner' })],
        });
        const res = await request(app).get('/api/teams').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(200);
        expect(res.body.teams).toHaveLength(1);
        expect(res.body.teams[0]).toMatchObject({ id: 't1', myRole: 'owner', memberCount: 1 });
    });

    it('401s without a session cookie', async () => {
        const { app } = buildTeamsTestApp();
        const res = await request(app).get('/api/teams');
        expect(res.status).toBe(401);
    });
});

describe('GET /api/teams/:id', () => {
    it('returns team detail + roster for a current member', async () => {
        const { app } = buildTeamsTestApp({
            teams: [fakeTeam({ id: 't1', ownerId: 'owner', createdBy: 'owner' })],
            memberships: [
                fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner', role: 'owner' }),
                fakeMembership({ id: 'm2', teamId: 't1', userId: 'u1', role: 'member' }),
            ],
        });
        const res = await request(app).get('/api/teams/t1').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: 't1', ownerId: 'owner' });
        expect(res.body.members).toHaveLength(2);
    });

    it('404s for a nonexistent team', async () => {
        const { app } = buildTeamsTestApp();
        const res = await request(app).get('/api/teams/missing').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(404);
    });

    it('403s for a non-member of an existing team', async () => {
        const { app } = buildTeamsTestApp({
            teams: [fakeTeam({ id: 't1', ownerId: 'owner', createdBy: 'owner' })],
            memberships: [fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner', role: 'owner' })],
        });
        const res = await request(app).get('/api/teams/t1').set('Cookie', sessionCookieFor('outsider'));
        expect(res.status).toBe(403);
    });

    it('401s without a session cookie', async () => {
        const { app } = buildTeamsTestApp({ teams: [fakeTeam({ id: 't1' })] });
        const res = await request(app).get('/api/teams/t1');
        expect(res.status).toBe(401);
    });
});

describe('POST /api/teams/:id/members', () => {
    it('adds an existing user by email and returns 201', async () => {
        const { app } = buildTeamsTestApp({
            teams: [fakeTeam({ id: 't1', ownerId: 'owner', createdBy: 'owner' })],
            memberships: [fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner', role: 'owner' })],
            profiles: [fakeProfile({ uid: 'u2', email: 'u2@example.com', displayName: 'U2' })],
        });
        const res = await request(app)
            .post('/api/teams/t1/members')
            .set('Cookie', sessionCookieFor('owner'))
            .send({ email: 'u2@example.com' });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ userId: 'u2', role: 'member' });
    });

    it('403s when the requester is not the team owner', async () => {
        const { app } = buildTeamsTestApp({
            teams: [fakeTeam({ id: 't1', ownerId: 'owner', createdBy: 'owner' })],
            memberships: [
                fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner', role: 'owner' }),
                fakeMembership({ id: 'm2', teamId: 't1', userId: 'u1', role: 'member' }),
            ],
            profiles: [fakeProfile({ uid: 'u2', email: 'u2@example.com' })],
        });
        const res = await request(app)
            .post('/api/teams/t1/members')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ email: 'u2@example.com' });
        expect(res.status).toBe(403);
    });

    it('404s for a nonexistent team', async () => {
        const { app } = buildTeamsTestApp();
        const res = await request(app)
            .post('/api/teams/missing/members')
            .set('Cookie', sessionCookieFor('owner'))
            .send({ email: 'u2@example.com' });
        expect(res.status).toBe(404);
    });

    it('404s with user_not_found when no RetroRocket account matches the email', async () => {
        const { app } = buildTeamsTestApp({
            teams: [fakeTeam({ id: 't1', ownerId: 'owner', createdBy: 'owner' })],
            memberships: [fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner', role: 'owner' })],
        });
        const res = await request(app)
            .post('/api/teams/t1/members')
            .set('Cookie', sessionCookieFor('owner'))
            .send({ email: 'nobody@example.com' });
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('user_not_found');
    });

    it('409s when the user is already a member of the team', async () => {
        const { app } = buildTeamsTestApp({
            teams: [fakeTeam({ id: 't1', ownerId: 'owner', createdBy: 'owner' })],
            memberships: [
                fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner', role: 'owner' }),
                fakeMembership({ id: 'm2', teamId: 't1', userId: 'u2', role: 'member' }),
            ],
            profiles: [fakeProfile({ uid: 'u2', email: 'u2@example.com' })],
        });
        const res = await request(app)
            .post('/api/teams/t1/members')
            .set('Cookie', sessionCookieFor('owner'))
            .send({ email: 'u2@example.com' });
        expect(res.status).toBe(409);
    });

    it('401s without a session cookie', async () => {
        const { app } = buildTeamsTestApp({ teams: [fakeTeam({ id: 't1' })] });
        const res = await request(app).post('/api/teams/t1/members').send({ email: 'u2@example.com' });
        expect(res.status).toBe(401);
    });
});

describe('DELETE /api/teams/:id/members/:userId', () => {
    it('204s when the owner removes another member', async () => {
        const { app } = buildTeamsTestApp({
            teams: [fakeTeam({ id: 't1', ownerId: 'owner', createdBy: 'owner' })],
            memberships: [
                fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner', role: 'owner' }),
                fakeMembership({ id: 'm2', teamId: 't1', userId: 'u1', role: 'member' }),
            ],
        });
        const res = await request(app)
            .delete('/api/teams/t1/members/u1')
            .set('Cookie', sessionCookieFor('owner'));
        expect(res.status).toBe(204);
    });

    it('204s when a non-owner member voluntarily removes themself', async () => {
        const { app } = buildTeamsTestApp({
            teams: [fakeTeam({ id: 't1', ownerId: 'owner', createdBy: 'owner' })],
            memberships: [
                fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner', role: 'owner' }),
                fakeMembership({ id: 'm2', teamId: 't1', userId: 'u1', role: 'member' }),
            ],
        });
        const res = await request(app)
            .delete('/api/teams/t1/members/u1')
            .set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(204);
    });

    it('403s when a non-owner tries to remove someone else', async () => {
        const { app } = buildTeamsTestApp({
            teams: [fakeTeam({ id: 't1', ownerId: 'owner', createdBy: 'owner' })],
            memberships: [
                fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner', role: 'owner' }),
                fakeMembership({ id: 'm2', teamId: 't1', userId: 'u1', role: 'member' }),
                fakeMembership({ id: 'm3', teamId: 't1', userId: 'u2', role: 'member' }),
            ],
        });
        const res = await request(app)
            .delete('/api/teams/t1/members/u2')
            .set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(403);
    });

    it('404s when the target user is not a member of the team', async () => {
        const { app } = buildTeamsTestApp({
            teams: [fakeTeam({ id: 't1', ownerId: 'owner', createdBy: 'owner' })],
            memberships: [fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner', role: 'owner' })],
        });
        const res = await request(app)
            .delete('/api/teams/t1/members/ghost')
            .set('Cookie', sessionCookieFor('owner'));
        expect(res.status).toBe(404);
    });

    it('returns 200 with teamEmptied: true when the sole-remaining owner leaves', async () => {
        const { app } = buildTeamsTestApp({
            teams: [fakeTeam({ id: 't1', ownerId: 'owner', createdBy: 'owner' })],
            memberships: [fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner', role: 'owner' })],
        });
        const res = await request(app)
            .delete('/api/teams/t1/members/owner')
            .set('Cookie', sessionCookieFor('owner'));
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ teamEmptied: true });
    });

    it('204s (ownership transferred, not emptied) when the owner leaves a team with other members', async () => {
        const { app } = buildTeamsTestApp({
            teams: [fakeTeam({ id: 't1', ownerId: 'owner', createdBy: 'owner' })],
            memberships: [
                fakeMembership({ id: 'm1', teamId: 't1', userId: 'owner', role: 'owner' }),
                fakeMembership({ id: 'm2', teamId: 't1', userId: 'u1', role: 'member' }),
            ],
        });
        const res = await request(app)
            .delete('/api/teams/t1/members/owner')
            .set('Cookie', sessionCookieFor('owner'));
        expect(res.status).toBe(204);
    });

    it('401s without a session cookie', async () => {
        const { app } = buildTeamsTestApp({ teams: [fakeTeam({ id: 't1' })] });
        const res = await request(app).delete('/api/teams/t1/members/u1');
        expect(res.status).toBe(401);
    });
});
