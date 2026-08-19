import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfilePicture } from './ProfilePicture';

describe('ProfilePicture', () => {
  it('renders a real profile picture when a source exists', () => {
    render(<ProfilePicture displayName="Stefan Saladino" src="https://cdn.test/photo.webp" />);
    expect(screen.getByRole('img', { name: 'Stefan Saladino profile picture' })).toHaveAttribute('src', 'https://cdn.test/photo.webp');
  });

  it('falls back to initials when no source exists or an image fails', () => {
    const { rerender } = render(<ProfilePicture displayName="Stefan Saladino" />);
    expect(screen.getByLabelText('Stefan Saladino profile picture placeholder')).toHaveTextContent('SS');

    rerender(<ProfilePicture displayName="Stefan Saladino" src="https://cdn.test/broken.webp" />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByLabelText('Stefan Saladino profile picture placeholder')).toHaveTextContent('SS');
  });
});
