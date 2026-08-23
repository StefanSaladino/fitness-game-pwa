import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppSection } from '../../components/layout';
import type { GroupSummary } from '../groups';
import type { OnboardingProfile } from '../onboarding';

vi.mock('../dashboard/components/DashboardController', () => ({
  DashboardController: ({ group, onNavigate }: { group: GroupSummary; onNavigate: (section: AppSection) => void }) => (
    <div>
      <p>Dashboard for {group.name}</p>
      <button onClick={() => onNavigate('groups')} type="button">Open groups</button>
      <button onClick={() => onNavigate('progress')} type="button">Open progress</button>
      <button onClick={() => onNavigate('compete')} type="button">Open competition</button>
    </div>
  ),
}));

vi.mock('../groups/components/GroupAdministrationController', () => ({
  GroupAdministrationController: ({ selectedGroupId }: { selectedGroupId: string }) => <p>Admin for {selectedGroupId}</p>,
}));

vi.mock('../progress/components/ExerciseProgressController', () => ({
  ExerciseProgressController: () => <p>Progress screen</p>,
}));

vi.mock('../social/components/GroupSocialController', () => ({
  GroupSocialController: ({ selectedGroupId }: { selectedGroupId: string }) => <p>Competition for {selectedGroupId}</p>,
}));

import { ProductController } from './ProductController';

const profile: OnboardingProfile = {
  id: 'user-1', username: 'stefan', displayName: 'Stefan', timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4, pendingWeeklyWorkoutTarget: null, onboardingCompletedAt: '2026-08-18T00:00:00Z',
  preferredWeightUnit: 'KG',
};
const groups: GroupSummary[] = [
  { id: 'group-1', name: 'Iron Crew', memberCount: 3, role: 'OWNER', joinedAt: '2026-08-18T00:00:00Z', createdAt: '2026-08-18T00:00:00Z' },
  { id: 'group-2', name: 'Friday Crew', memberCount: 4, role: 'MEMBER', joinedAt: '2026-08-19T00:00:00Z', createdAt: '2026-08-19T00:00:00Z' },
];

afterEach(() => window.history.replaceState({}, '', '/'));

describe('ProductController', () => {
  it('owns product-section navigation instead of putting routing into presentation components', async () => {
    const user = userEvent.setup();
    render(<ProductController groups={groups} onGroupsChanged={vi.fn()} profile={profile} />);

    expect(await screen.findByText('Dashboard for Iron Crew')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open progress' }));
    expect(await screen.findByText('Progress screen')).toBeInTheDocument();
  });

  it('still routes group administration through the same controller boundary', async () => {
    const user = userEvent.setup();
    render(<ProductController groups={groups} onGroupsChanged={vi.fn()} profile={profile} />);

    await screen.findByText('Dashboard for Iron Crew');
    await user.click(screen.getByRole('button', { name: 'Open groups' }));
    expect(await screen.findByText('Admin for group-1')).toBeInTheDocument();
  });

  it('honors the bounded Settings deep link into the existing Groups controller', async () => {
    window.history.replaceState({}, '', '/?section=groups');
    render(<ProductController groups={groups} onGroupsChanged={vi.fn()} profile={profile} />);

    expect(await screen.findByText('Admin for group-1')).toBeInTheDocument();
  });

  it('routes group competition through the product controller boundary', async () => {
    const user = userEvent.setup();
    render(<ProductController groups={groups} onGroupsChanged={vi.fn()} profile={profile} />);

    await screen.findByText('Dashboard for Iron Crew');
    await user.click(screen.getByRole('button', { name: 'Open competition' }));
    expect(await screen.findByText('Competition for group-1')).toBeInTheDocument();
  });
});
