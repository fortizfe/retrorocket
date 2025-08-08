/**
 * Tests básicos para verificar que el entorno de testing está funcionando correctamente
 */

describe('Testing Environment', () => {
    it('should be able to run basic tests', () => {
        expect(true).toBe(true);
    });

    it('should have access to mocked localStorage', () => {
        expect(window.localStorage).toBeDefined();
        expect(typeof window.localStorage.getItem).toBe('function');
    });

    it('should have access to mocked import.meta.env', () => {
        expect((global as any).import.meta.env).toBeDefined();
        expect((global as any).import.meta.env.VITE_FIREBASE_API_KEY).toBe('demo-api-key');
    });

    it('should be able to perform basic assertions', () => {
        const testObj = { name: 'test', value: 42 };
        expect(testObj.name).toBe('test');
        expect(testObj.value).toBeGreaterThan(40);
        expect(testObj).toHaveProperty('name');
    });

    it('should handle async operations', async () => {
        const asyncOperation = () => Promise.resolve('success');
        const result = await asyncOperation();
        expect(result).toBe('success');
    });

    it('should work with mock functions', () => {
        const mockFn = jest.fn();
        mockFn('test', 123);

        expect(mockFn).toHaveBeenCalledWith('test', 123);
        expect(mockFn).toHaveBeenCalledTimes(1);
    });
});

describe('Browser APIs Mocking', () => {
    it('should have IntersectionObserver mocked', () => {
        expect(window.IntersectionObserver).toBeDefined();
        const observer = new window.IntersectionObserver(() => { });
        expect(observer).toBeDefined();
    });

    it('should have ResizeObserver mocked', () => {
        expect(window.ResizeObserver).toBeDefined();
        const observer = new window.ResizeObserver(() => { });
        expect(observer).toBeDefined();
    });

    it('should have matchMedia mocked', () => {
        expect(window.matchMedia).toBeDefined();
        const mediaQuery = window.matchMedia('(min-width: 768px)');
        expect(mediaQuery.matches).toBe(false);
    });
});
