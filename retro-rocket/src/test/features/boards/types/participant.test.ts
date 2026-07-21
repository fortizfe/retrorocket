import { describe, it, expect } from 'vitest';
import { Participant } from '@/features/boards/types/participant';

describe('Participant Types', () => {
    describe('Participant interface', () => {
        it('should have correct structure with required properties', () => {
            const participant: Participant = {
                id: 'participant123',
                name: 'John Doe',
                userId: 'user456',
                retrospectiveId: 'retro789',
                joinedAt: new Date(),
                isActive: true
            };

            expect(typeof participant.id).toBe('string');
            expect(typeof participant.name).toBe('string');
            expect(typeof participant.userId).toBe('string');
            expect(typeof participant.retrospectiveId).toBe('string');
            expect(participant.joinedAt).toBeInstanceOf(Date);
            expect(typeof participant.isActive).toBe('boolean');

            // Required properties
            expect(participant).toHaveProperty('id');
            expect(participant).toHaveProperty('name');
            expect(participant).toHaveProperty('userId');
            expect(participant).toHaveProperty('retrospectiveId');
            expect(participant).toHaveProperty('joinedAt');
            expect(participant).toHaveProperty('isActive');
        });

        it('should handle optional photoURL property', () => {
            const withPhoto: Participant = {
                id: 'participant456',
                name: 'Jane Smith',
                userId: 'user789',
                retrospectiveId: 'retro101',
                joinedAt: new Date(),
                isActive: true,
                photoURL: 'https://example.com/photo.jpg'
            };

            const withoutPhoto: Participant = {
                id: 'participant789',
                name: 'Bob Johnson',
                userId: 'user101',
                retrospectiveId: 'retro202',
                joinedAt: new Date(),
                isActive: false
            };

            const withNullPhoto: Participant = {
                id: 'participant101',
                name: 'Alice Brown',
                userId: 'user202',
                retrospectiveId: 'retro303',
                joinedAt: new Date(),
                isActive: true,
                photoURL: null
            };

            expect(withPhoto.photoURL).toBe('https://example.com/photo.jpg');
            expect(withoutPhoto.photoURL).toBeUndefined();
            expect(withNullPhoto.photoURL).toBeNull();
        });

        it('should handle active and inactive participants', () => {
            const activeParticipant: Participant = {
                id: 'active123',
                name: 'Active User',
                userId: 'user123',
                retrospectiveId: 'retro123',
                joinedAt: new Date(),
                isActive: true
            };

            const inactiveParticipant: Participant = {
                id: 'inactive456',
                name: 'Inactive User',
                userId: 'user456',
                retrospectiveId: 'retro123',
                joinedAt: new Date(),
                isActive: false
            };

            expect(activeParticipant.isActive).toBe(true);
            expect(inactiveParticipant.isActive).toBe(false);
        });

        it('should validate date properties', () => {
            const joinDate = new Date('2024-06-01T10:00:00Z');
            const participant: Participant = {
                id: 'date-test',
                name: 'Date Test User',
                userId: 'user-date',
                retrospectiveId: 'retro-date',
                joinedAt: joinDate,
                isActive: true
            };

            expect(participant.joinedAt.getTime()).toBe(joinDate.getTime());
            expect(participant.joinedAt.getFullYear()).toBe(2024);
            expect(participant.joinedAt.getMonth()).toBe(5); // June is month 5 (0-indexed)
        });

        it('should handle different participant names', () => {
            const participants: Participant[] = [
                {
                    id: 'p1',
                    name: 'John Doe',
                    userId: 'u1',
                    retrospectiveId: 'retro1',
                    joinedAt: new Date(),
                    isActive: true
                },
                {
                    id: 'p2',
                    name: 'María García',
                    userId: 'u2',
                    retrospectiveId: 'retro1',
                    joinedAt: new Date(),
                    isActive: true
                },
                {
                    id: 'p3',
                    name: '李伟',
                    userId: 'u3',
                    retrospectiveId: 'retro1',
                    joinedAt: new Date(),
                    isActive: false
                }
            ];

            expect(participants[0].name).toBe('John Doe');
            expect(participants[1].name).toBe('María García');
            expect(participants[2].name).toBe('李伟');
            expect(participants.filter(p => p.isActive)).toHaveLength(2);
        });

        it('should handle same user in different retrospectives', () => {
            const sameUserDifferentRetros: Participant[] = [
                {
                    id: 'p1',
                    name: 'John Doe',
                    userId: 'user123',
                    retrospectiveId: 'retro1',
                    joinedAt: new Date('2024-01-01'),
                    isActive: true
                },
                {
                    id: 'p2',
                    name: 'John Doe',
                    userId: 'user123',
                    retrospectiveId: 'retro2',
                    joinedAt: new Date('2024-02-01'),
                    isActive: true
                }
            ];

            expect(sameUserDifferentRetros[0].userId).toBe(sameUserDifferentRetros[1].userId);
            expect(sameUserDifferentRetros[0].retrospectiveId).not.toBe(sameUserDifferentRetros[1].retrospectiveId);
            expect(sameUserDifferentRetros[0].id).not.toBe(sameUserDifferentRetros[1].id);
        });
    });

    describe('Type Compatibility and Utilities', () => {
        it('should work with type guards', () => {
            const isActiveParticipant = (participant: Participant): boolean => {
                return participant.isActive;
            };

            const hasPhoto = (participant: Participant): boolean => {
                return participant.photoURL !== undefined && participant.photoURL !== null;
            };

            const activeWithPhoto: Participant = {
                id: 'test1',
                name: 'Test User',
                userId: 'user1',
                retrospectiveId: 'retro1',
                joinedAt: new Date(),
                isActive: true,
                photoURL: 'https://example.com/photo.jpg'
            };

            const inactiveWithoutPhoto: Participant = {
                id: 'test2',
                name: 'Test User 2',
                userId: 'user2',
                retrospectiveId: 'retro1',
                joinedAt: new Date(),
                isActive: false
            };

            expect(isActiveParticipant(activeWithPhoto)).toBe(true);
            expect(isActiveParticipant(inactiveWithoutPhoto)).toBe(false);
            expect(hasPhoto(activeWithPhoto)).toBe(true);
            expect(hasPhoto(inactiveWithoutPhoto)).toBe(false);
        });

        it('should work with array operations', () => {
            const participants: Participant[] = [
                {
                    id: 'p1',
                    name: 'Alice',
                    userId: 'u1',
                    retrospectiveId: 'retro1',
                    joinedAt: new Date('2024-01-01'),
                    isActive: true,
                    photoURL: 'https://example.com/alice.jpg'
                },
                {
                    id: 'p2',
                    name: 'Bob',
                    userId: 'u2',
                    retrospectiveId: 'retro1',
                    joinedAt: new Date('2024-01-02'),
                    isActive: false,
                    photoURL: null
                },
                {
                    id: 'p3',
                    name: 'Charlie',
                    userId: 'u3',
                    retrospectiveId: 'retro1',
                    joinedAt: new Date('2024-01-03'),
                    isActive: true
                }
            ];

            const activeParticipants = participants.filter(p => p.isActive);
            const participantNames = participants.map(p => p.name);
            const participantsWithPhotos = participants.filter(p => p.photoURL);

            expect(activeParticipants).toHaveLength(2);
            expect(activeParticipants.map(p => p.name)).toEqual(['Alice', 'Charlie']);

            expect(participantNames).toEqual(['Alice', 'Bob', 'Charlie']);

            expect(participantsWithPhotos).toHaveLength(1);
            expect(participantsWithPhotos[0].name).toBe('Alice');
        });

        it('should handle participant sorting', () => {
            const participants: Participant[] = [
                {
                    id: 'p1',
                    name: 'Charlie',
                    userId: 'u3',
                    retrospectiveId: 'retro1',
                    joinedAt: new Date('2024-01-03'),
                    isActive: true
                },
                {
                    id: 'p2',
                    name: 'Alice',
                    userId: 'u1',
                    retrospectiveId: 'retro1',
                    joinedAt: new Date('2024-01-01'),
                    isActive: false
                },
                {
                    id: 'p3',
                    name: 'Bob',
                    userId: 'u2',
                    retrospectiveId: 'retro1',
                    joinedAt: new Date('2024-01-02'),
                    isActive: true
                }
            ];

            // Sort by name alphabetically
            const sortedByName = [...participants].sort((a, b) => a.name.localeCompare(b.name));

            // Sort by join date (earliest first)
            const sortedByJoinDate = [...participants].sort((a, b) =>
                a.joinedAt.getTime() - b.joinedAt.getTime()
            );

            // Sort active participants first, then by name
            const sortedActiveFirst = [...participants].sort((a, b) => {
                if (a.isActive === b.isActive) {
                    return a.name.localeCompare(b.name);
                }
                return a.isActive ? -1 : 1;
            });

            expect(sortedByName.map(p => p.name)).toEqual(['Alice', 'Bob', 'Charlie']);
            expect(sortedByJoinDate.map(p => p.name)).toEqual(['Alice', 'Bob', 'Charlie']);
            expect(sortedActiveFirst.map(p => p.name)).toEqual(['Bob', 'Charlie', 'Alice']);
        });

        it('should handle participant grouping', () => {
            const participants: Participant[] = [
                {
                    id: 'p1',
                    name: 'Alice',
                    userId: 'u1',
                    retrospectiveId: 'retro1',
                    joinedAt: new Date(),
                    isActive: true
                },
                {
                    id: 'p2',
                    name: 'Bob',
                    userId: 'u2',
                    retrospectiveId: 'retro1',
                    joinedAt: new Date(),
                    isActive: false
                },
                {
                    id: 'p3',
                    name: 'Charlie',
                    userId: 'u3',
                    retrospectiveId: 'retro2',
                    joinedAt: new Date(),
                    isActive: true
                }
            ];

            // Group by retrospective
            const byRetrospective = participants.reduce((acc, participant) => {
                const retro = participant.retrospectiveId;
                if (!acc[retro]) {
                    acc[retro] = [];
                }
                acc[retro].push(participant);
                return acc;
            }, {} as Record<string, Participant[]>);

            // Group by active status
            const byActiveStatus = participants.reduce((acc, participant) => {
                const key = participant.isActive ? 'active' : 'inactive';
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(participant);
                return acc;
            }, {} as Record<string, Participant[]>);

            expect(Object.keys(byRetrospective)).toEqual(['retro1', 'retro2']);
            expect(byRetrospective['retro1']).toHaveLength(2);
            expect(byRetrospective['retro2']).toHaveLength(1);

            expect(Object.keys(byActiveStatus)).toEqual(['active', 'inactive']);
            expect(byActiveStatus['active']).toHaveLength(2);
            expect(byActiveStatus['inactive']).toHaveLength(1);
        });

        it('should handle participant statistics', () => {
            const participants: Participant[] = [
                {
                    id: 'p1',
                    name: 'Alice',
                    userId: 'u1',
                    retrospectiveId: 'retro1',
                    joinedAt: new Date('2024-01-01T10:00:00Z'),
                    isActive: true,
                    photoURL: 'photo1.jpg'
                },
                {
                    id: 'p2',
                    name: 'Bob',
                    userId: 'u2',
                    retrospectiveId: 'retro1',
                    joinedAt: new Date('2024-01-01T11:00:00Z'),
                    isActive: false
                },
                {
                    id: 'p3',
                    name: 'Charlie',
                    userId: 'u3',
                    retrospectiveId: 'retro1',
                    joinedAt: new Date('2024-01-01T12:00:00Z'),
                    isActive: true,
                    photoURL: 'photo3.jpg'
                }
            ];

            const stats = {
                total: participants.length,
                active: participants.filter(p => p.isActive).length,
                inactive: participants.filter(p => !p.isActive).length,
                withPhotos: participants.filter(p => p.photoURL).length,
                withoutPhotos: participants.filter(p => !p.photoURL).length
            };

            expect(stats.total).toBe(3);
            expect(stats.active).toBe(2);
            expect(stats.inactive).toBe(1);
            expect(stats.withPhotos).toBe(2);
            expect(stats.withoutPhotos).toBe(1);
            expect(stats.active + stats.inactive).toBe(stats.total);
            expect(stats.withPhotos + stats.withoutPhotos).toBe(stats.total);
        });
    });
});
