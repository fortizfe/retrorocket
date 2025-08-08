import { describe, it, expect } from 'vitest';

describe('Basic test setup', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have access to DOM environment', () => {
    expect(document).toBeDefined();
    expect(window).toBeDefined();
  });
});
