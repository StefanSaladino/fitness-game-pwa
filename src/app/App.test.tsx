import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: () => true,

  getAppUrl: () => 'http://localhost:5173',

  getSupabaseClient: () => ({
    auth: {
      getSession: async () => ({
        data: {
          session: null,
        },
        error: null,
      }),

      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => undefined,
          },
        },
      }),
    },
  }),
}));

describe('App foundation', () => {
  it('loads the auth session and renders the signed-out shell', async () => {
    render(<App />);

    // Initial AuthProvider state is intentionally asynchronous.
    expect(screen.getByText('Loading session…')).toBeInTheDocument();

    // Once session restoration completes with no authenticated user,
    // the application should deterministically show Sign In.
    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Sign in' }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Forgot password?' }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Create an account' }),
    ).toBeInTheDocument();
  });
});