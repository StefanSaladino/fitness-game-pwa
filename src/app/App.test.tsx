import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  getAppUrl: () => 'http://localhost:5173',
  getSupabaseClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => undefined } },
      }),
    },
  }),
}));

describe('App authentication gate', () => {
  it('restores the session before rendering the signed-out experience', async () => {
    render(<App />);
    expect(screen.getByText('Loading session…')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create an account' })).toBeInTheDocument();
  });
});
