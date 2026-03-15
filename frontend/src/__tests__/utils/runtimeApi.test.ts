import { describe, expect, it } from 'vitest';

import { resolveWebFallbackUrl } from '../../utils/runtimeApi';

describe('resolveWebFallbackUrl', () => {
  it('prefers an explicit API URL when configured', () => {
    expect(resolveWebFallbackUrl({
      explicitApiUrl: 'https://api.example.com',
      currentOrigin: 'https://fmrl.tryambakam.space',
      isDev: false,
    })).toBe('https://api.example.com');
  });

  it('uses the current origin in production when no API URL override exists', () => {
    expect(resolveWebFallbackUrl({
      currentOrigin: 'https://fmrl.tryambakam.space',
      isDev: false,
    })).toBe('https://fmrl.tryambakam.space');
  });

  it('keeps localhost backend fallback during local development', () => {
    expect(resolveWebFallbackUrl({
      currentOrigin: 'http://localhost:5173',
      isDev: true,
    })).toBe('http://localhost:8000');
  });
});
