import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { TrainingProgramProfileService } from './trainingProgramProfileService';
import { TrainingProgramAccessSection } from './TrainingProgramAccessSection';

function service(): TrainingProgramProfileService {
  return {
    load: vi.fn(async () => null),
    update: vi.fn(async (input) => ({
      userId: 'user-1',
      accessMode: input.accessMode,
      equipmentKeys: [...input.equipmentKeys],
      revision: 1,
      createdAt: '2026-09-22T19:00:00.000Z',
      updatedAt: '2026-09-22T19:00:00.000Z',
    })),
  };
}

describe('TrainingProgramAccessSection', () => {
  it('requires an explicit setup choice instead of silently assuming commercial-gym access', async () => {
    const api = service();
    render(<TrainingProgramAccessSection service={api} userId="user-1" />);

    expect(await screen.findByRole('combobox', { name: 'Training setup' })).toHaveTextContent('Choose a setup');
    expect(screen.getByRole('button', { name: 'Save equipment access' })).toBeDisabled();
  });

  it('saves an explicit custom/home equipment profile and surfaces deferred band support honestly', async () => {
    const user = userEvent.setup();
    const api = service();
    render(<TrainingProgramAccessSection service={api} userId="user-1" />);

    await user.click(await screen.findByRole('combobox', { name: 'Training setup' }));
    await user.click(await screen.findByRole('option', { name: 'Custom / home setup' }));

    await user.click(screen.getByRole('checkbox', { name: /Dumbbells/ }));
    await user.click(screen.getByRole('checkbox', { name: /Resistance bands/ }));

    expect(screen.getByText(/band exercises are not used by training-program-v1 yet/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save equipment access' }));

    await waitFor(() => expect(api.update).toHaveBeenCalledWith({
      accessMode: 'CUSTOM',
      equipmentKeys: ['DUMBBELLS', 'BANDS'],
      expectedRevision: 0,
    }));
    expect(await screen.findByText('Training equipment saved.')).toBeInTheDocument();
  });

  it('does not persist a custom equipment list for commercial-gym mode', async () => {
    const user = userEvent.setup();
    const api: TrainingProgramProfileService = {
      load: vi.fn(async () => ({
        userId: 'user-1',
        accessMode: 'CUSTOM' as const,
        equipmentKeys: ['DUMBBELLS' as const],
        revision: 4,
        createdAt: '2026-09-22T19:00:00.000Z',
        updatedAt: '2026-09-22T19:05:00.000Z',
      })),
      update: vi.fn(async (input) => ({
        userId: 'user-1',
        accessMode: input.accessMode,
        equipmentKeys: [],
        revision: 5,
        createdAt: '2026-09-22T19:00:00.000Z',
        updatedAt: '2026-09-22T19:06:00.000Z',
      })),
    };

    render(<TrainingProgramAccessSection service={api} userId="user-1" />);
    await screen.findByRole('checkbox', { name: /Dumbbells/ });

    await user.click(screen.getByRole('combobox', { name: 'Training setup' }));
    await user.click(await screen.findByRole('option', { name: 'Commercial gym' }));
    await user.click(screen.getByRole('button', { name: 'Save equipment access' }));

    await waitFor(() => expect(api.update).toHaveBeenCalledWith({
      accessMode: 'COMMERCIAL_GYM',
      equipmentKeys: [],
      expectedRevision: 4,
    }));
  });
});
