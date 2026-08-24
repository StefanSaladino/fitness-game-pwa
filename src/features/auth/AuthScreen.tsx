import { useState } from 'react';
import { AuthLayout } from './components/AuthLayout';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';
import { SignInForm } from './components/SignInForm';
import { SignUpForm } from './components/SignUpForm';
import { VerifyEmailPanel } from './components/VerifyEmailPanel';
import { useAuthActions } from './hooks/useAuthActions';
import type { SignInCredentials, SignUpCredentials } from './authValidation';

type Mode = 'signin' | 'signup' | 'forgot' | 'verify-email';

const content: Record<Exclude<Mode, 'verify-email'>, { eyebrow?: string; title: string; description: string }> = {
  signin: {
    title: 'Sign in',
    description: 'Get back to your training.',
  },
  signup: {
    title: 'Create account',
    description: 'Set up your account. Your training profile comes next.',
  },
  forgot: {
    eyebrow: 'ACCOUNT RECOVERY',
    title: 'Reset password',
    description: 'Enter your email and we’ll send recovery instructions.',
  },
};

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [verificationEmail, setVerificationEmail] = useState('');
  const actions = useAuthActions();

  function move(nextMode: Mode) {
    actions.clearFeedback();
    setMode(nextMode);
  }

  async function submitSignIn(input: SignInCredentials) {
    return actions.signIn(input.email, input.password);
  }

  async function submitSignUp(input: SignUpCredentials) {
    const result = await actions.signUp({ email: input.email, password: input.password, displayName: input.displayName });
    if (result.ok && result.requiresEmailConfirmation) {
      setVerificationEmail(input.email);
      setMode('verify-email');
    }
  }

  if (mode === 'verify-email') {
    return (
      <AuthLayout description="We sent a confirmation link so we can verify the address belongs to you." eyebrow="VERIFY EMAIL" title="Check your email">
        <VerifyEmailPanel email={verificationEmail} onBackToSignIn={() => move('signin')} />
      </AuthLayout>
    );
  }

  const copy = content[mode];

  return (
    <AuthLayout description={copy.description} eyebrow={copy.eyebrow} title={copy.title}>
      {mode === 'signin' ? <SignInForm busy={actions.busy} error={actions.error} onCreateAccount={() => move('signup')} onForgotPassword={() => move('forgot')} onSubmit={submitSignIn} /> : null}
      {mode === 'signup' ? <SignUpForm busy={actions.busy} error={actions.error} onBack={() => move('signin')} onSubmit={submitSignUp} /> : null}
      {mode === 'forgot' ? <ForgotPasswordForm busy={actions.busy} error={actions.error} message={actions.message} onBack={() => move('signin')} onSubmit={actions.requestPasswordReset} /> : null}
    </AuthLayout>
  );
}
