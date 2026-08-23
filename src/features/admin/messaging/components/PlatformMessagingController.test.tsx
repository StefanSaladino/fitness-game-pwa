import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PlatformMessagingService } from '../platformMessagingService';
import { PlatformMessagingController } from './PlatformMessagingController';

function service(): PlatformMessagingService {
  return {
    searchUsers: vi.fn().mockResolvedValue([]), searchGroups: vi.fn().mockResolvedValue([]),
    preview: vi.fn().mockResolvedValue({ previewId: 'preview-1', audienceType: 'ALL', audienceLabel: 'All eligible users', recipientCount: 8, confirmationPhrase: 'SEND TO 8 USERS', expiresAt: '2026-08-23T12:00:00Z' }),
    send: vi.fn().mockResolvedValue('message-1'), list: vi.fn().mockResolvedValue({ items: [], total: 0 }), edit: vi.fn(), withdraw: vi.fn(),
  };
}

describe('PlatformMessagingController', () => {
  it('locks full-app blasts to a dismissible NOTICE without acknowledgement', async () => {
    const api = service();
    render(<PlatformMessagingController service={api} />);
    expect(screen.getByText('Shown as a “What’s new” popup')).toBeInTheDocument();
    expect(screen.getByLabelText('Message type')).toBeDisabled();
    expect(screen.queryByRole('checkbox', { name: 'Require acknowledgement' })).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Subject'), 'Version update');
    await userEvent.type(screen.getByLabelText('Message'), 'A new workout experience is now available.');
    await userEvent.type(screen.getByLabelText('Audit reason'), 'Release announcement');
    await userEvent.click(screen.getByRole('button', { name: 'Preview audience' }));
    expect(await screen.findByText('SEND TO 8 USERS')).toBeInTheDocument();
    expect(api.preview).toHaveBeenCalledWith('ALL', null, 'NOTICE');
  });
});
