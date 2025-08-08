/**
 * Tests básicos sin dependencias de DOM para verificar que Jest funciona
 */

describe('Basic Environment Tests', () => {
    it('should be able to run basic tests', () => {
        expect(true).toBe(true);
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

    it('should handle arrays and objects', () => {
        const arr = [1, 2, 3];
        const obj = { a: 1, b: 2 };

        expect(arr).toHaveLength(3);
        expect(arr).toContain(2);
        expect(obj).toEqual({ a: 1, b: 2 });
    });

    it('should handle error scenarios', () => {
        const throwError = () => {
            throw new Error('Test error');
        };

        expect(throwError).toThrow('Test error');
    });
});
