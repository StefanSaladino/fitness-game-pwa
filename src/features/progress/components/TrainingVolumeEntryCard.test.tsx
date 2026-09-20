import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TrainingVolumeEntryCard } from './TrainingVolumeEntryCard';

describe('TrainingVolumeEntryCard', () => {
  it('keeps Progress compact and delegates the dedicated volume destination', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();

    render(<TrainingVolumeEntryCard onOpen={onOpen} />);

    expect(screen.getByRole('heading', { name: 'Check volume targets' })).toBeInTheDocument();
    expect(screen.getByText(/7-day and 28-day effective-set targets/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view targets/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
