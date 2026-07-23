import { describe, it, expect } from 'vitest';
import { routeModel, routingEnabled } from '@/features/boards/sentiment/domain/modelRouting';
import type { ModelConfig } from '@/features/boards/types/sentiment';

const MULTI: ModelConfig = { id: 'multi', name: 'multi', description: '', language: 'multilingual', primary: true };
const ES: ModelConfig = { id: 'es-model', name: 'es', description: '', language: 'es', primary: false };
const EN: ModelConfig = { id: 'en-model', name: 'en', description: '', language: 'en', primary: false };

describe('routeModel (FR-008/FR-009, SC-004)', () => {
    const all = [MULTI, ES, EN];

    it('routes Spanish cards to the ES model and English cards to the EN model', () => {
        expect(routeModel('es', all)).toBe('es-model');
        expect(routeModel('en', all)).toBe('en-model');
    });

    it('routes unknown-language cards to the multilingual default (never errors)', () => {
        expect(routeModel('unknown', all)).toBe('multi');
    });

    it('falls back to the multilingual default when no model serves the language', () => {
        expect(routeModel('es', [MULTI, EN])).toBe('multi');
        expect(routeModel('en', [MULTI, ES])).toBe('multi');
    });

    it('falls back to primary, then first model, when no multilingual model is tagged', () => {
        const noMulti: ModelConfig[] = [
            { ...ES, primary: true },
            EN,
        ];
        expect(routeModel('unknown', noMulti)).toBe('es-model');
        expect(routeModel('unknown', [EN, ES])).toBe('en-model');
    });
});

describe('routingEnabled', () => {
    it('is true only with a language-specific model alongside a default', () => {
        expect(routingEnabled([MULTI, ES, EN])).toBe(true);
        expect(routingEnabled([MULTI, ES])).toBe(true);
    });

    it('is false for a single-model (default) configuration', () => {
        expect(routingEnabled([MULTI])).toBe(false);
        expect(routingEnabled([{ ...MULTI, primary: true }])).toBe(false);
    });
});
