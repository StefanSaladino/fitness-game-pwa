import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  resend: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  getAppUrl: () => 'https://topset.example',
  getSupabaseClient: () => ({
    auth: {
      signUp: mocks.signUp,
      resend: mocks.resend,
      verifyOtp: mocks.verifyOtp,
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  }),
}));

import { confirmSignUp, resendSignUpConfirmation, signUp } from './authService';

describe('authService confirmation flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    mocks.resend.mockResolvedValue({ data: {}, error: null });
    mocks.verifyOtp.mockResolvedValue({ data: {}, error: null });
  });

  it('sends signup confirmation back to the current app origin', async () => {
    await signUp({ email: 'member@example.com', password: 'password123', displayName: 'Member' });

    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        emailRedirectTo: 'https://topset.example/',
      }),
    }));
  });

  it('resends signup confirmation using the same safe redirect origin', async () => {
    await resendSignUpConfirmation('member@example.com');

    expect(mocks.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'member@example.com',
      options: {
        emailRedirectTo: 'https://topset.example/',
      },
    });
  });

  it('confirms signup only when the app explicitly exchanges the token hash', async () => {
    await confirmSignUp('token-hash');

    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'token-hash',
      type: 'email',
    });
  });
});
