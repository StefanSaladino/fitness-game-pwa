import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import type { WorkoutHistorySession } from '../workoutHistoryModel';
import { WorkoutHistoryPanel } from './WorkoutHistoryPanel';

const profile: OnboardingProfile = {
  id: 'user-1',
  username: 'stefan',
  displayName: 'Stefan',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-08-18T00:00:00Z',
  preferredWeightUnit: 'LB',
};

const history: WorkoutHistorySession[] = [
  {
    id: 'workout-1',
    scoringDate: '2026-09-08',
    startedAt: '2026-09-08T20:00:00Z',
    endedAt: '2026-09-08T21:00:00Z',
    activeDurationSeconds: 3600,
    exercises: [
      {
        id: 'we-1',
        exerciseId: 'bench',
        canonicalName: 'Bench Press',
        measurementType: 'WEIGHT_REPS',
        orderIndex: 0,
        supersetGroupId: 'group-a',
        supersetOrder: 0,
        sets: [
          {
            id: 'set-1',
            setNumber: 1,
            setType: 'WORKING',
            weightKg: 100,
            reps: 5,
            bodyweightMode: null,
          },
        ],
      },
      {
        id: 'we-2',
        exerciseId: 'fly',
        canonicalName: 'Cable Fly',
        measurementType: 'WEIGHT_REPS',
        orderIndex: 1,
        supersetGroupId: 'group-a',
        supersetOrder: 1,
        sets: [
          {
            id: 'set-2',
            setNumber: 1,
            setType: 'WORKING',
            weightKg: 20,
            reps: 12,
            bodyweightMode: null,
          },
        ],
      },
      {
        id: 'we-3',
        exerciseId: 'row',
        canonicalName: 'Barbell Row',
        measurementType: 'WEIGHT_REPS',
        orderIndex: 2,
        supersetGroupId: null,
        supersetOrder: null,
        sets: [],
      },
    ],
  },
];

describe('WorkoutHistoryPanel', () => {
  it('renders completed Supersets as a history group while preserving normal exercise sets', () => {
    render(
      <WorkoutHistoryPanel
        error=""
        history={history}
        onRetry={vi.fn()}
        profile={profile}
        status="ready"
      />,
    );

    const superset = screen.getByRole('region', { name: 'Superset A' });
    expect(within(superset).getByText('A1')).toBeInTheDocument();
    expect(within(superset).getByText('Bench Press')).toBeInTheDocument();
    expect(within(superset).getByText('A2')).toBeInTheDocument();
    expect(within(superset).getByText('Cable Fly')).toBeInTheDocument();
    expect(within(superset).getByText('220.5 lb × 5')).toBeInTheDocument();
    expect(screen.getByText('Barbell Row')).toBeInTheDocument();
  });
});
