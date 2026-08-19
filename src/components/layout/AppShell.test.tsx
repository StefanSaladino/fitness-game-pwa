import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('keeps navigation behavior outside the layout component', async () => {
    const onNavigate = vi.fn();
    render(
      <AppShell activeItem="home" onNavigate={onNavigate} userLabel="Stefan">
        <h1>Dashboard</h1>
      </AppShell>,
    );

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    const homeItems = screen.getAllByRole('button', { name: 'Home' });
    expect(homeItems.every((item) => item.getAttribute('aria-current') === 'page')).toBe(true);

    await userEvent.click(screen.getAllByRole('button', { name: 'Workouts' })[0]);
    expect(onNavigate).toHaveBeenCalledWith('workouts');
  });
});
