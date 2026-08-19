import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ProfilePictureService } from '../profilePictureService';
import { ProfilePictureManager } from './ProfilePictureManager';

function service(): ProfilePictureService {
  return {
    get: vi.fn(async () => ({ path: null, url: null })),
    upload: vi.fn(async () => ({ path: 'user-1/photo.webp', url: 'https://cdn.test/user-1/photo.webp' })),
    remove: vi.fn(async () => undefined),
    getPublicUrl: vi.fn(() => null),
  };
}

describe('ProfilePictureManager', () => {
  it('validates and delegates a supported file through the profile-picture hook', async () => {
    const user = userEvent.setup();
    const api = service();
    render(<ProfilePictureManager displayName="Stefan" service={api} userId="user-1" />);
    await screen.findByText('Add a profile picture');

    const input = screen.getByLabelText('Choose image');
    const file = new File(['image'], 'stefan.webp', { type: 'image/webp' });
    await user.upload(input, file);
    await user.click(screen.getByRole('button', { name: 'Save picture' }));

    await waitFor(() => expect(api.upload).toHaveBeenCalledWith('user-1', file, null));
  });
});
