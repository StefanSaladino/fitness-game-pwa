import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthLayout } from './AuthLayout';

describe('AuthLayout', () => {
  it('renders the Top Set auth brand, accessible heading, and public legal links', () => {
    const { container } = render(<AuthLayout title="Sign in" description="Get back to your training."><p>Form content</p></AuthLayout>);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByText('TOP SET')).toBeInTheDocument();
    expect(screen.getByText('See what you’ve got today.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
    expect(screen.queryByText(/level up together/i)).not.toBeInTheDocument();
    expect(container.querySelector('[data-auth-composition] [data-app-surface="primary"]')).toBeInTheDocument();
  });
});
