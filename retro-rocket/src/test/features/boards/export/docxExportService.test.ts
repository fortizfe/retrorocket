import { describe, it, expect } from 'vitest';
import { DocxExportService } from '@/features/boards/export/services/docxExportService';

describe('DocxExportService', () => {
    describe('Basic functionality', () => {
        it('should create an instance', () => {
            const service = new DocxExportService();
            expect(service).toBeDefined();
            expect(service).toBeInstanceOf(DocxExportService);
        });

        it('should have required methods', () => {
            const service = new DocxExportService();
            expect(typeof service.exportRetrospective).toBe('function');
        });

        it('should throw error for invalid data', async () => {
            const service = new DocxExportService();
            await expect(service.exportRetrospective(null as any)).rejects.toThrow();
        });
    });
});
