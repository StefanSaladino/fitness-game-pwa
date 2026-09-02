import { describe, expect, it } from 'vitest';
import {
  TOP_SET_LOCAL_DEVELOPMENT_ORIGIN,
  TOP_SET_PRODUCTION_ORIGIN,
  resolveTopSetAppOrigin,
} from './appOrigin';

describe('resolveTopSetAppOrigin', () => {
  it('uses the production origin for the production site', () => {
    expect(resolveTopSetAppOrigin({
      browserOrigin: TOP_SET_PRODUCTION_ORIGIN,
      configuredOrigin: TOP_SET_LOCAL_DEVELOPMENT_ORIGIN,
      isDev: false,
    })).toBe(TOP_SET_PRODUCTION_ORIGIN);
  });

  it('allows a Top Set Netlify preview in a production build', () => {
    expect(resolveTopSetAppOrigin({
      browserOrigin: 'https://deploy-preview-42--topset2026.netlify.app',
      isDev: false,
    })).toBe('https://deploy-preview-42--topset2026.netlify.app');
  });

  it('allows only the canonical localhost origin in a development build', () => {
    expect(resolveTopSetAppOrigin({
      browserOrigin: TOP_SET_LOCAL_DEVELOPMENT_ORIGIN,
      isDev: true,
    })).toBe(TOP_SET_LOCAL_DEVELOPMENT_ORIGIN);

    expect(() => resolveTopSetAppOrigin({
      browserOrigin: 'http://localhost:5174',
      isDev: true,
    })).toThrow('Top Set authentication is not allowed from browser origin');

    expect(() => resolveTopSetAppOrigin({
      browserOrigin: 'http://127.0.0.1:5173',
      isDev: true,
    })).toThrow('Top Set authentication is not allowed from browser origin');

    expect(() => resolveTopSetAppOrigin({
      browserOrigin: TOP_SET_LOCAL_DEVELOPMENT_ORIGIN,
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
      configuredOrigin: TOP_SET_LOCAL_DEVELOPMENT_ORIGIN,
      isDev: false,
    })).toThrow('Top Set authentication is not allowed from configured origin');
  });

  it('falls back to the production origin when no browser or configured origin exists', () => {
    expect(resolveTopSetAppOrigin({ isDev: false })).toBe(TOP_SET_PRODUCTION_ORIGIN);
  });
});
