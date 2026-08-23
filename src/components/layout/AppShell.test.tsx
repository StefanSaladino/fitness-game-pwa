import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('keeps five primary destinations and routes account access separately', async () => {
    const onNavigate = vi.fn();
    render(
      <AppShell activeItem="home" onNavigate={onNavigate} userLabel="Stefan" userMeta="@stefan">
        <h1>Dashboard</h1>
      </AppShell>,
    );

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();

    const homeItems = screen.getAllByRole('button', { name: 'Home' });
    expect(homeItems.every((item) => item.getAttribute('aria-current') === 'page')).toBe(true);
    expect(screen.getAllByRole('button', { name: 'Lift' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Groups' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Progress' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Compete' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Profile' })).not.toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'Lift' })[0]);
    expect(onNavigate).toHaveBeenCalledWith('workouts');

    await userEvent.click(screen.getAllByRole('button', { name: 'Open Profile and Settings for Stefan' })[0]);
    expect(onNavigate).toHaveBeenCalledWith('profile');
  });
});
