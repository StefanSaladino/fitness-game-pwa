import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import { buildExerciseAnalytics } from '../exerciseAnalytics';
import type { ExerciseProgressHistoryEntry, ExerciseProgressSummary } from '../model';
import { ExerciseProgressScreen } from './ExerciseProgressScreen';

const profile: OnboardingProfile = {
  id: 'user-1', username: 'stefan', displayName: 'Stefan', timezone: 'America/Toronto', weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null, onboardingCompletedAt: '2026-08-18T00:00:00Z',
};

const exercises: ExerciseProgressSummary[] = [
  {
    exerciseId: 'bench', canonicalName: 'Bench Press', measurementType: 'WEIGHT_REPS', metricType: 'E1RM', bestValue: 122.5,
    bestWeightKg: 105, bestReps: 5, achievedAt: '2026-08-12T14:30:00Z', previousPrValue: 116.7,
    sessionCount: 3, observationCount: 3, firstPerformedAt: '2026-08-10T14:30:00Z', lastPerformedAt: '2026-08-17T14:30:00Z',
    averageDaysBetweenSessions: 3.5, latestMetricValue: 116.7, latestWeightKg: 100, latestReps: 5, latestObservedAt: '2026-08-17T14:30:00Z',
  },
  {
    exerciseId: 'pullup', canonicalName: 'Pull Up', measurementType: 'BODYWEIGHT_REPS', metricType: 'BODYWEIGHT_REPS', bestValue: 12,
    bestWeightKg: null, bestReps: 12, achievedAt: '2026-08-18T14:30:00Z', previousPrValue: 10,
    sessionCount: 3, observationCount: 2, firstPerformedAt: '2026-08-11T14:30:00Z', lastPerformedAt: '2026-08-18T14:30:00Z',
    averageDaysBetweenSessions: 3.5, latestMetricValue: 12, latestWeightKg: null, latestReps: 12, latestObservedAt: '2026-08-18T14:30:00Z',
  },
];

const bodyweightHistory: ExerciseProgressHistoryEntry[] = [
  {
    workoutId: 'pullup-pr', scoringDate: '2026-08-18', observedAt: '2026-08-18T14:30:00Z', metricType: 'BODYWEIGHT_REPS', metricValue: 12,
    weightKg: null, reps: 12, previousPrValue: 10, isBaseline: false, isPr: true, isCurrentPr: true, completedWorkingSets: 4,
    sessionVolumeKgReps: 0, heaviestWeightKg: null, maxCompletedReps: 12, plainBodyweightSets: 4, addedWeightSets: 0, assistedSets: 0,
  },
  {
    workoutId: 'pullup-added', scoringDate: '2026-08-13', observedAt: '2026-08-13T14:30:00Z', metricType: null, metricValue: null,
    weightKg: null, reps: null, previousPrValue: null, isBaseline: false, isPr: false, isCurrentPr: false, completedWorkingSets: 4,
    sessionVolumeKgReps: 400, heaviestWeightKg: 10, maxCompletedReps: 10, plainBodyweightSets: 0, addedWeightSets: 4, assistedSets: 0,
  },
];

describe('ExerciseProgressScreen', () => {
  it('renders personal PR context and keeps added-weight bodyweight work analytics-only', async () => {
    const user = userEvent.setup();
    const onSelectExercise = vi.fn();
    render(
      <ExerciseProgressScreen
        analytics={buildExerciseAnalytics(exercises[1]!, bodyweightHistory)}
        exercises={exercises}
        history={bodyweightHistory}
        historyError=""
        historyStatus="ready"
        onNavigate={vi.fn()}
        onRetryHistory={vi.fn()}
        onSelectExercise={onSelectExercise}
        onSignOut={vi.fn()}
        profile={profile}
        selectedExercise={exercises[1]!}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Know your trend. Beat your last.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pull Up' })).toBeInTheDocument();
    const currentPr = screen.getByText('Current PR', { selector: 'dt' }).closest('div');
    const previousPr = screen.getByText('Previous PR', { selector: 'dt' }).closest('div');
    expect(currentPr).not.toBeNull();
    expect(previousPr).not.toBeNull();
    expect(within(currentPr!).getByText('12 reps', { selector: 'dd' })).toBeInTheDocument();
    expect(within(previousPr!).getByText('10 reps', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText(/Added-weight and assisted sets stay visible as analytics/i)).toBeInTheDocument();
    expect(screen.getByText('Analytics only')).toBeInTheDocument();
    expect(screen.getAllByText(/400 kg·reps/).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Rep trend' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Volume history' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'PR timeline' })).toBeInTheDocument();
    const bestWeight = screen.getByText('Best weight', { selector: 'dt' }).closest('div');
    const bestReps = screen.getByText('Best reps', { selector: 'dt' }).closest('div');
    expect(bestWeight).not.toBeNull();
    expect(bestReps).not.toBeNull();
    expect(within(bestWeight!).getByText('10 kg', { selector: 'dd' })).toBeInTheDocument();
    expect(within(bestReps!).getByText('12', { selector: 'dd' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Bench Press/i }));
    expect(onSelectExercise).toHaveBeenCalledWith('bench');
  });
});
