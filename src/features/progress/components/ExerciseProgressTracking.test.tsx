import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import { buildLiftingCalendarAnalytics } from '../liftingCalendarAnalytics';
import type { ExerciseProgressSummary } from '../model';
import { ExerciseProgressScreen } from './ExerciseProgressScreen';

const profile: OnboardingProfile = {
  id: 'user-1',
  username: 'stefan',
  displayName: 'Stefan',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-08-18T00:00:00Z',
  preferredWeightUnit: 'KG',
};

const exercise: ExerciseProgressSummary = {
  exerciseId: 'bench',
  canonicalName: 'Bench Press',
  measurementType: 'WEIGHT_REPS',
  metricType: 'E1RM',
  bestValue: 122.5,
  bestWeightKg: 105,
  bestReps: 5,
  achievedAt: '2026-08-12T14:30:00Z',
  previousPrValue: 116.7,
  sessionCount: 3,
  observationCount: 3,
  firstPerformedAt: '2026-08-10T14:30:00Z',
  lastPerformedAt: '2026-08-17T14:30:00Z',
  averageDaysBetweenSessions: 3.5,
  latestMetricValue: 116.7,
  latestWeightKg: 100,
  latestReps: 5,
  latestObservedAt: '2026-08-17T14:30:00Z',
};

describe('ExerciseProgressScreen analytics tracking', () => {
  it('lets a tracked exercise be removed from deep analytics without touching its history model', async () => {
    const user = userEvent.setup();
    const onUntrackExercise = vi.fn(async () => undefined);

    render(
      <ExerciseProgressScreen
        analytics={null}
        analyticsTrackingStatus="ready"
        calendarAnalytics={buildLiftingCalendarAnalytics([])}
        calendarError=""
        calendarStatus="ready"
        exercises={[exercise]}
        history={[]}
        historyError=""
        historyStatus="ready"
        onNavigate={vi.fn()}
        onRetryCalendar={vi.fn()}
        onRetryHistory={vi.fn()}
        onSelectExercise={vi.fn()}
        onSignOut={vi.fn()}
        onUntrackExercise={onUntrackExercise}
        profile={profile}
        selectedExercise={exercise}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Untrack from analytics' }));

    expect(onUntrackExercise).toHaveBeenCalledWith('bench');
    expect(exercise.sessionCount).toBe(3);
    expect(exercise.bestValue).toBe(122.5);
  });
});
