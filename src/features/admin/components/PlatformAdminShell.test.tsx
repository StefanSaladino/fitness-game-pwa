import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlatformAdminShell } from './PlatformAdminShell';

describe('PlatformAdminShell', () => {
  it('exposes real admin destinations and back navigation', () => {
    const onNavigate = vi.fn();
    const onBack = vi.fn();
    render(
      <PlatformAdminShell
        activeSection="users"
        mobileTitle="Users"
        onBackToApp={onBack}
        onNavigate={onNavigate}
      >
        <p>Admin content</p>
      </PlatformAdminShell>,
    );

    expect(screen.getAllByRole('button', { name: 'Users' })[0]).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('button', { name: 'Moderation' })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Capacity' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /Back/ })[0]);
    expect(onNavigate).toHaveBeenCalledWith('capacity');
    expect(onBack).toHaveBeenCalledOnce();
  });
});
