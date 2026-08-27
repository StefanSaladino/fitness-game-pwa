import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrivacyPolicyPage } from './PrivacyPolicyPage';
import { TermsOfServicePage } from './TermsOfServicePage';

describe('public legal pages', () => {
  it('publishes the Top Set terms without requiring authentication', () => {
    const { container } = render(<TermsOfServicePage />);
    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument();
    expect(screen.getByText(/exercise carries inherent risk/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/');
    expect(container.querySelector('[data-legal-composition] [data-app-surface="primary"]')).toBeInTheDocument();
  });

  it('describes the actual account, workout, group, offline, and deletion data surfaces', () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText(/supabase is used for authentication/i)).toBeInTheDocument();
    expect(screen.getByText(/IndexedDB/i)).toBeInTheDocument();
    expect(screen.getByText(/request account deletion through Settings/i)).toBeInTheDocument();
  });
});
