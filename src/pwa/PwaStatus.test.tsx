import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PwaService, PwaSnapshot } from './pwaService';
import { PwaStatus } from './PwaStatus';

function fakeService(initial: Partial<PwaSnapshot> = {}) {
  let snapshot: PwaSnapshot = {
    online: true,
    standalone: false,
    platform: 'other',
    installAvailable: false,
    manualInstallAvailable: false,
    updateAvailable: false,
    applyingUpdate: false,
    serviceWorkerError: false,
    storagePersistence: 'persistent',
    storagePersistenceRequestAvailable: false,
    ...initial,
  };
  const listeners = new Set<() => void>();
  const service: PwaService = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    start: vi.fn(() => () => undefined),
    requestInstall: vi.fn(async () => 'accepted' as const),
    requestPersistentStorage: vi.fn(async () => 'persistent' as const),
    applyUpdate: vi.fn(() => true),
  };
  return {
    service,
    set(next: Partial<PwaSnapshot>) {
      snapshot = { ...snapshot, ...next };
      listeners.forEach((listener) => listener());
    },
  };
}

describe('PwaStatus', () => {
  it('offers install only when the browser exposes an install prompt', async () => {
    const fake = fakeService({ installAvailable: true });
    const { container } = render(<PwaStatus service={fake.service} />);

    expect(container.querySelector('[data-system-notice][data-kind="install"]')).toBeInTheDocument();
    expect(screen.getByText('Install Top Set')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Install' }));
    await waitFor(() => expect(fake.service.requestInstall).toHaveBeenCalledTimes(1));
  });

  it('shows an offline shell message without pretending remote data is available', () => {
    const fake = fakeService({ online: false });
    render(<PwaStatus service={fake.service} />);

    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText(/Workout changes stay on this device/)).toBeInTheDocument();
  });

  it('never applies an available update until the user chooses it', () => {
    const fake = fakeService({ updateAvailable: true });
    render(<PwaStatus service={fake.service} />);

    expect(fake.service.applyUpdate).not.toHaveBeenCalled();

    expect(screen.getByText('Update ready · v1.0.0')).toBeInTheDocument();
    expect(screen.getByText('What’s new')).toBeInTheDocument();
    expect(screen.getByText('Faster, denser workout logging on mobile')).toBeInTheDocument();
    expect(screen.getByText('Supersets, Drop Sets, and Pyramid workflows')).toBeInTheDocument();
    expect(
      screen.getByText('Selective exercise analytics and an improved exercise picker'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Update app' }));
    expect(fake.service.applyUpdate).toHaveBeenCalledTimes(1);
  });

  it('hides install affordance in standalone mode', () => {
    const fake = fakeService({ standalone: true, installAvailable: true });
    render(<PwaStatus service={fake.service} />);
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument();
  });

  it('gives iOS users manual Add to Home Screen guidance instead of a fake install button', () => {
    const fake = fakeService({ platform: 'ios', manualInstallAvailable: true });
    render(<PwaStatus service={fake.service} />);

    expect(screen.getByText('Add Top Set to Home Screen')).toBeInTheDocument();
    expect(screen.getByText(/Share → Add to Home Screen/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument();
  });

  it('allows an installed app to request persistent storage when browser data is still best effort', async () => {
    const fake = fakeService({
      standalone: true,
      storagePersistence: 'best-effort',
      storagePersistenceRequestAvailable: true,
    });
    render(<PwaStatus service={fake.service} />);

    fireEvent.click(screen.getByRole('button', { name: 'Protect data' }));
    await waitFor(() => expect(fake.service.requestPersistentStorage).toHaveBeenCalledTimes(1));
  });

  it('shows release details without applying the waiting update automatically', () => {
    const fake = fakeService({ updateAvailable: true });
    render(<PwaStatus service={fake.service} />);

    expect(screen.getByText('Update ready · v1.0.0')).toBeInTheDocument();
    expect(screen.getByText('What’s new')).toBeInTheDocument();
    expect(
      screen.getByText('Faster, denser workout logging on mobile'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Supersets, Drop Sets, and Pyramid workflows'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Selective exercise analytics and an improved exercise picker',
      ),
    ).toBeInTheDocument();

    expect(fake.service.applyUpdate).not.toHaveBeenCalled();
  });

  it('dismisses a waiting update only for the current mounted app session', () => {
    const fake = fakeService({ updateAvailable: true });

    const first = render(<PwaStatus service={fake.service} />);

    expect(
      screen.getByRole('button', { name: 'Update app' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(
      screen.queryByRole('button', { name: 'Update app' }),
    ).not.toBeInTheDocument();

    expect(fake.service.applyUpdate).not.toHaveBeenCalled();

    first.unmount();

    render(<PwaStatus service={fake.service} />);

    expect(
      screen.getByRole('button', { name: 'Update app' }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Dismiss' }),
    ).toBeInTheDocument();
  });

});
