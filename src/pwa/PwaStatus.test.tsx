import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PwaService, PwaSnapshot } from './pwaService';
import { PwaStatus } from './PwaStatus';

function fakeService(initial: Partial<PwaSnapshot> = {}) {
  let snapshot: PwaSnapshot = {
    online: true,
    standalone: false,
    installAvailable: false,
    updateAvailable: false,
    applyingUpdate: false,
    serviceWorkerError: false,
    ...initial,
  };
  const listeners = new Set<() => void>();
  const service: PwaService = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    start: vi.fn(() => () => undefined),
    requestInstall: vi.fn(async () => 'accepted' as const),
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
    render(<PwaStatus service={fake.service} />);

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
    fireEvent.click(screen.getByRole('button', { name: 'Update app' }));
    expect(fake.service.applyUpdate).toHaveBeenCalledTimes(1);
  });

  it('hides install affordance in standalone mode', () => {
    const fake = fakeService({ standalone: true, installAvailable: true });
    render(<PwaStatus service={fake.service} />);
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument();
  });
});
