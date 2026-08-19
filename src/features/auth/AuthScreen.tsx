import { useState } from 'react';
import { AuthLayout } from './components/AuthLayout';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';
import { SignInForm } from './components/SignInForm';
import { SignUpForm } from './components/SignUpForm';
import { VerifyEmailPanel } from './components/VerifyEmailPanel';
import { useAuthActions } from './hooks/useAuthActions';
import type { SignInCredentials, SignUpCredentials } from './authValidation';

type Mode = 'signin' | 'signup' | 'forgot' | 'verify-email';

const content: Record<Exclude<Mode, 'verify-email'>, { eyebrow: string; title: string; description: string }> = {
  signin: {
    eyebrow: 'WELCOME BACK',
    title: 'Sign in',
    description: 'Pick up your streak, weekly target, and personal progress where you left off.',
  },
  signup: {
    eyebrow: 'CREATE ACCOUNT',
    title: 'Start your run',
    description: 'Create your account first. Your username, timezone, and weekly lifting target come next.',
  },
  forgot: {
    eyebrow: 'ACCOUNT RECOVERY',
    title: 'Reset password',
    description: 'Enter your email and we will send a secure recovery link without revealing whether an account exists.',
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
    const result = await actions.signUp({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
    });

    if (result.ok && result.requiresEmailConfirmation) {
      setVerificationEmail(input.email);
      setMode('verify-email');
    }
  }

  if (mode === 'verify-email') {
    return (
      <AuthLayout
        description="Email confirmation protects account ownership before onboarding begins."
        eyebrow="VERIFY EMAIL"
        title="One quick check"
      >
        <VerifyEmailPanel email={verificationEmail} onBackToSignIn={() => move('signin')} />
      </AuthLayout>
    );
  }

  const copy = content[mode];

  return (
    <AuthLayout description={copy.description} eyebrow={copy.eyebrow} title={copy.title}>
      {mode === 'signin' ? (
        <SignInForm
          busy={actions.busy}
          error={actions.error}
          onCreateAccount={() => move('signup')}
          onForgotPassword={() => move('forgot')}
          onSubmit={submitSignIn}
        />
      ) : null}

      {mode === 'signup' ? (
        <SignUpForm
          busy={actions.busy}
          error={actions.error}
          onBack={() => move('signin')}
          onSubmit={submitSignUp}
        />
      ) : null}

      {mode === 'forgot' ? (
        <ForgotPasswordForm
          busy={actions.busy}
          error={actions.error}
          message={actions.message}
          onBack={() => move('signin')}
          onSubmit={actions.requestPasswordReset}
        />
      ) : null}
    </AuthLayout>
  );
}
