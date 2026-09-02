import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LIFTING_BADGE_KEYS, type LiftingBadgeProgressSnapshot } from '../model';
import { BadgeCollection } from './BadgeCollection';

const snapshot: LiftingBadgeProgressSnapshot = {
  prCount: 4,
  liftingDayCount: 7,
  goalsHit: 1,
  bestCompletedWeekStreak: 2,
  cardioBonusDayCount: 3,
  badges: [{ badgeKey: 'GOAL_STREAK_2', earnedAt: '2026-08-17T04:00:00.000Z' }],
};

describe('BadgeCollection', () => {
  it('renders the full collection with authoritative partial progress and accessible bars', () => {
    const { container } = render(<BadgeCollection snapshot={snapshot} />);

    expect(screen.getByRole('heading', { name: 'Badge collection' })).toBeInTheDocument();
    expect(screen.getByText('1 / 14 earned')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-badge-key]')).toHaveLength(LIFTING_BADGE_KEYS.length);
    expect(container.querySelectorAll('[data-badge-status="earned"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-badge-status="locked"]')).toHaveLength(13);

    expect(screen.getByText('4 / 5 PRs')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '5 PRs progress' })).toHaveAttribute('aria-valuenow', '4');
    expect(screen.getByRole('progressbar', { name: '5 PRs progress' })).toHaveAttribute('aria-valuemax', '5');

    expect(screen.getByText('7 / 10 lift days')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '10 Lift Days progress' })).toHaveAttribute('aria-valuenow', '7');

    expect(screen.getByText('3 / 5 cardio days')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '5 Cardio Bonus Days progress' })).toHaveAttribute('aria-valuenow', '3');

    expect(screen.queryByRole('progressbar', { name: 'First PR progress' })).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar', { name: 'Target Hit progress' })).not.toBeInTheDocument();
    expect(container.querySelector('[data-badge-key="GOAL_STREAK_2"]')).toHaveAttribute('data-badge-status', 'earned');
    expect(screen.getByAltText('50 Lift Days badge')).toBeInTheDocument();
  });
});
