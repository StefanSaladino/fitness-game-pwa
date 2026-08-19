import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { GroupSummary } from '../groups';
import type { OnboardingProfile } from '../onboarding';

vi.mock('../dashboard', () => ({
  DashboardController: ({ group, onNavigate }: { group: GroupSummary; onNavigate: (section: 'groups') => void }) => (
    <div>
      <p>Dashboard for {group.name}</p>
      <button onClick={() => onNavigate('groups')} type="button">Open groups</button>
    </div>
  ),
}));

vi.mock('../groups', () => ({
  GroupAdministrationController: ({ selectedGroupId }: { selectedGroupId: string }) => <p>Admin for {selectedGroupId}</p>,
}));

import { ProductController } from './ProductController';

const profile: OnboardingProfile = {
  id: 'user-1', username: 'stefan', displayName: 'Stefan', timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4, pendingWeeklyWorkoutTarget: null, onboardingCompletedAt: '2026-08-18T00:00:00Z',
};
const groups: GroupSummary[] = [
  { id: 'group-1', name: 'Iron Crew', memberCount: 3, role: 'OWNER', joinedAt: '2026-08-18T00:00:00Z', createdAt: '2026-08-18T00:00:00Z' },
  { id: 'group-2', name: 'Friday Crew', memberCount: 4, role: 'MEMBER', joinedAt: '2026-08-19T00:00:00Z', createdAt: '2026-08-19T00:00:00Z' },
];

describe('ProductController', () => {
  it('owns product-section navigation instead of putting routing into presentation components', async () => {
    const user = userEvent.setup();
    render(<ProductController groups={groups} onGroupsChanged={vi.fn()} profile={profile} />);

    expect(screen.getByText('Dashboard for Iron Crew')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open groups' }));
    expect(screen.getByText('Admin for group-1')).toBeInTheDocument();
  });
});
