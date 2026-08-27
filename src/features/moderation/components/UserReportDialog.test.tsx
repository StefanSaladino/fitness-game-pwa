import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { UserReportService } from '../userReportService';
import { UserReportDialog } from './UserReportDialog';

describe('UserReportDialog', () => {
  it('submits the selected category, reason, target, and bounded evidence reference', async () => {
    const user = userEvent.setup();
    const service: UserReportService = { submit: vi.fn().mockResolvedValue({ caseId: 'case-id' }) };
    const onSubmitted = vi.fn();
    const onCancel = vi.fn();
    render(
      <UserReportDialog
        onCancel={onCancel}
        onSubmitted={onSubmitted}
        reference={{ type: 'SOCIAL_ACTIVITY', groupId: 'group-id', activityKey: 'PR:opaque' }}
        service={service}
        target={{ userId: 'target-id', username: 'alex', displayName: 'Alex' }}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(screen.getByRole('option', { name: 'Safety concern' }));
    await user.type(screen.getByLabelText('What happened?'), 'This concrete activity creates a safety concern.');
    await user.click(screen.getByRole('button', { name: 'Submit report' }));

    expect(service.submit).toHaveBeenCalledWith({
      targetUserId: 'target-id',
      category: 'SAFETY',
      reason: 'This concrete activity creates a safety concern.',
      reference: { type: 'SOCIAL_ACTIVITY', groupId: 'group-id', activityKey: 'PR:opaque' },
    });
    expect(onSubmitted).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('requires a meaningful description before creating a report', async () => {
    const user = userEvent.setup();
    const service: UserReportService = { submit: vi.fn() };
    render(
      <UserReportDialog
        onCancel={vi.fn()}
        onSubmitted={vi.fn()}
        reference={{ type: 'GROUP', groupId: 'group-id' }}
        service={service}
        target={{ userId: 'target-id', username: 'alex', displayName: 'Alex' }}
      />,
    );
    await user.type(screen.getByLabelText('What happened?'), 'short');
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('10–2,000 characters');
    expect(service.submit).not.toHaveBeenCalled();
  });
});
