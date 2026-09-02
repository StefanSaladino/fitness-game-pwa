import type { Session } from '@supabase/supabase-js';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  }),
}));

import { AuthProvider, useAuth } from './AuthProvider';

function Probe() {
  const { loading, session } = useAuth();
  if (loading) return <p>loading</p>;
  return <p>{session?.user.email ?? 'signed-out'}</p>;
}

function sessionFor(email: string): Session {
  return { user: { email } } as Session;
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not let a stale getSession snapshot overwrite a newer auth callback session', async () => {
    let resolveInitial!: (value: { data: { session: Session | null }; error: null }) => void;
    const initialSession = new Promise<{ data: { session: Session | null }; error: null }>((resolve) => {
      resolveInitial = resolve;
    });
    let authListener!: (event: string, session: Session | null) => void;

    mocks.getSession.mockReturnValue(initialSession);
    mocks.onAuthStateChange.mockImplementation((listener: typeof authListener) => {
      authListener = listener;
      return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
    });

    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByText('loading')).toBeInTheDocument();

    await act(async () => {
      authListener('SIGNED_IN', sessionFor('member@example.com'));
    });
    expect(screen.getByText('member@example.com')).toBeInTheDocument();

    await act(async () => {
      resolveInitial({ data: { session: null }, error: null });
      await initialSession;
    });

    expect(screen.getByText('member@example.com')).toBeInTheDocument();
  });

  it('uses getSession as a signed-out fallback when no auth event arrives first', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mocks.unsubscribe } },
    });

    render(<AuthProvider><Probe /></AuthProvider>);

    expect(await screen.findByText('signed-out')).toBeInTheDocument();
  });
});
