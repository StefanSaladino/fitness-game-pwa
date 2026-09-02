import { describe, expect, it } from 'vitest';
import {
  TOP_SET_PRODUCTION_ORIGIN,
  resolveTopSetAppOrigin,
} from './appOrigin';

describe('resolveTopSetAppOrigin', () => {
  it('uses the production origin for the production site', () => {
    expect(resolveTopSetAppOrigin({
      browserOrigin: TOP_SET_PRODUCTION_ORIGIN,
      configuredOrigin: 'http://localhost:5173',
      isDev: false,
    })).toBe(TOP_SET_PRODUCTION_ORIGIN);
  });

  it('allows a Top Set Netlify preview in a production build', () => {
    expect(resolveTopSetAppOrigin({
      browserOrigin: 'https://deploy-preview-42--topset2026.netlify.app',
      isDev: false,
    })).toBe('https://deploy-preview-42--topset2026.netlify.app');
  });

  it('allows localhost only in a development build', () => {
    expect(resolveTopSetAppOrigin({
      browserOrigin: 'http://localhost:5173',
      isDev: true,
    })).toBe('http://localhost:5173');

    expect(() => resolveTopSetAppOrigin({
      browserOrigin: 'http://localhost:5173',
      configuredOrigin: TOP_SET_PRODUCTION_ORIGIN,
      isDev: false,
    })).toThrow('Top Set authentication is not allowed from browser origin');
  });

  it('rejects unknown browser origins instead of silently falling back', () => {
    expect(() => resolveTopSetAppOrigin({
      browserOrigin: 'https://example.com',
      isDev: false,
    })).toThrow('Top Set authentication is not allowed from browser origin');
  });

  it('never uses a localhost configured fallback in production', () => {
    expect(() => resolveTopSetAppOrigin({
      configuredOrigin: 'http://localhost:5173',
      isDev: false,
    })).toThrow('Top Set authentication is not allowed from configured origin');
  });

  it('falls back to the production origin when no browser or configured origin exists', () => {
    expect(resolveTopSetAppOrigin({ isDev: false })).toBe(TOP_SET_PRODUCTION_ORIGIN);
  });
});
