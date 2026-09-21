import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TrainingVolumeEntryCard } from './TrainingVolumeEntryCard';

describe('TrainingVolumeEntryCard', () => {
  it('keeps Progress compact and exposes volume targets plus completed reports', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();

    render(<TrainingVolumeEntryCard onOpen={onOpen} />);

    expect(
      screen.getByRole('heading', {
        name: 'Volume targets & completed reports',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /check current effective-set targets or review completed weekly and monthly training reports/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: /training reports/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /volume targets/i }),
    );

    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
