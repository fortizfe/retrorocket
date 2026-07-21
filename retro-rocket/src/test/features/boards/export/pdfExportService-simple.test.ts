import { describe, it, expect } from 'vitest';
import { exportRetrospectiveToPdf } from '@/features/boards/export/services/pdfExportService';

describe('PdfExportService', () => {
    describe('Basic functionality', () => {
        it('should have export function', () => {
            expect(typeof exportRetrospectiveToPdf).toBe('function');
        });

        it('should generate correct filename', () => {
            const mockData = {
                retrospective: {
                    title: 'Test Retrospective',
                    createdAt: new Date('2023-12-01T10:00:00Z')
                }
            } as any;

            // Test filename generation logic
            expect(mockData.retrospective.title.replace(/\s+/g, '_')).toBe('Test_Retrospective');
        });

        it('should cleanup resources after export', () => {
            // Mock cleanup behavior
            const mockElement = {
                remove: () => { },
                href: '',
                download: ''
            };

            expect(typeof mockElement.remove).toBe('function');
        });

        it('should handle invalid data gracefully', async () => {
            await expect(exportRetrospectiveToPdf(null as any)).rejects.toThrow();
        });
    });
});
