import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import { BADGE_CATALOG } from '../badgeCatalog';
import { BadgeGalleryScreen } from './BadgeGalleryRoute';

const profile: OnboardingProfile = {
  id: 'user-1',
  username: 'stefan',
  displayName: 'Stefan',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-08-18T00:00:00.000Z',
  preferredWeightUnit: 'KG',
};

describe('BadgeGalleryScreen', () => {
  it('shows the complete collection while deriving earned state only from server badges', () => {
    const onNavigate = vi.fn();
    const { container } = render(
      <BadgeGalleryScreen
        badges={[
          { badgeKey: 'FIRST_PR', earnedAt: '2026-08-20T12:00:00.000Z' },
          { badgeKey: 'GOAL_WEEK_1', earnedAt: '2026-08-24T12:00:00.000Z' },
        ]}
        onNavigate={onNavigate}
        onSignOut={() => undefined}
        profile={profile}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Badge gallery' })).toBeInTheDocument();
    expect(screen.getByLabelText(`2 of ${BADGE_CATALOG.length} badges earned`)).toBeInTheDocument();
    expect(container.querySelectorAll('[data-badge-gallery-item]')).toHaveLength(BADGE_CATALOG.length);
    expect(container.querySelectorAll('[data-badge-state="earned"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-badge-state="locked"]')).toHaveLength(BADGE_CATALOG.length - 2);
    expect(container.querySelectorAll('[data-badge-emblem="top-set"]')).toHaveLength(BADGE_CATALOG.length);

    fireEvent.click(screen.getByRole('button', { name: 'Earned 2' }));
    expect(container.querySelectorAll('[data-badge-gallery-item]')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: `Locked ${BADGE_CATALOG.length - 2}` }));
    expect(container.querySelectorAll('[data-badge-gallery-item]')).toHaveLength(BADGE_CATALOG.length - 2);

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(container.querySelectorAll('[data-badge-gallery-item]')).toHaveLength(BADGE_CATALOG.length);

    fireEvent.click(screen.getByRole('button', { name: 'Back to progress' }));
    expect(onNavigate).toHaveBeenCalledWith('progress');
  });
});
