import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('keeps five primary destinations and routes account access separately', async () => {
    const onNavigate = vi.fn();
    const onSignOut = vi.fn();
    render(
      <AppShell activeItem="home" onNavigate={onNavigate} onSignOut={onSignOut} userLabel="Stefan" userMeta="@stefan">
        <h1>Dashboard</h1>
      </AppShell>,
    );

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(within(screen.getByRole('banner')).getByText('Home')).toBeInTheDocument();

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

    await userEvent.click(screen.getAllByRole('button', { name: 'Sign out' })[0]);
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it('derives a page title from every active destination when a screen does not override it', () => {
    const { rerender } = render(
      <AppShell activeItem="workouts" userLabel="Stefan"><p>Lift content</p></AppShell>,
    );
    expect(within(screen.getByRole('banner')).getByText('Lift')).toBeInTheDocument();

    rerender(<AppShell activeItem="compete" userLabel="Stefan"><p>Compete content</p></AppShell>);
    expect(within(screen.getByRole('banner')).getByText('Compete')).toBeInTheDocument();

    rerender(<AppShell activeItem="cardio" userLabel="Stefan"><p>Cardio content</p></AppShell>);
    expect(within(screen.getByRole('banner')).getByText('Cardio')).toBeInTheDocument();
  });

  it('can override the active destination with a grounded page title while preserving Settings access', async () => {
    const onNavigate = vi.fn();
    render(
      <AppShell activeItem="groups" mobileTitle="Crew settings" onNavigate={onNavigate} userLabel="Stefan">
        <h1>Groups are optional.</h1>
      </AppShell>,
    );

    const mobileHeader = screen.getByRole('banner');
    expect(within(mobileHeader).getByText('Crew settings')).toBeInTheDocument();
    await userEvent.click(within(mobileHeader).getByRole('button', { name: 'Open Profile and Settings for Stefan' }));
    expect(onNavigate).toHaveBeenCalledWith('profile');
  });
});
