import { createRoot } from 'react-dom/client';
import type { OnboardingProfile } from '../../src/features/onboarding';
import { buildExerciseAnalytics } from '../../src/features/progress/exerciseAnalytics';
import { ExerciseProgressScreen } from '../../src/features/progress/components/ExerciseProgressScreen';
import type { ExerciseProgressHistoryEntry, ExerciseProgressSummary } from '../../src/features/progress/model';
import '../../src/styles/global.css';

const profile: OnboardingProfile = {
  id: '81111111-1111-4111-8111-111111111111',
  username: 'stefan',
  displayName: 'Stefan',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-08-20T20:00:00Z',
  profileCode: 'FG-8111111111',
};

const bench: ExerciseProgressSummary = {
  exerciseId: 'bench',
  canonicalName: 'Barbell Bench Press',
  measurementType: 'WEIGHT_REPS',
  metricType: 'E1RM',
  bestValue: 128.3,
  bestWeightKg: 110,
  bestReps: 5,
  achievedAt: '2026-08-21T18:00:00Z',
  previousPrValue: 122.5,
  sessionCount: 4,
  observationCount: 4,
  firstPerformedAt: '2026-08-01T18:00:00Z',
  lastPerformedAt: '2026-08-21T18:00:00Z',
  averageDaysBetweenSessions: 6.7,
  latestMetricValue: 128.3,
  latestWeightKg: 110,
  latestReps: 5,
  latestObservedAt: '2026-08-21T18:00:00Z',
};

const history: ExerciseProgressHistoryEntry[] = [
  {
    workoutId: 'bench-1', scoringDate: '2026-08-01', observedAt: '2026-08-01T18:00:00Z', metricType: 'E1RM', metricValue: 110,
    weightKg: 95, reps: 5, previousPrValue: null, isBaseline: true, isPr: false, isCurrentPr: false,
    completedWorkingSets: 3, sessionVolumeKgReps: 1850, heaviestWeightKg: 100, maxCompletedReps: 8,
    plainBodyweightSets: 0, addedWeightSets: 0, assistedSets: 0,
  },
  {
    workoutId: 'bench-2', scoringDate: '2026-08-08', observedAt: '2026-08-08T18:00:00Z', metricType: 'E1RM', metricValue: 116.7,
    weightKg: 100, reps: 5, previousPrValue: 110, isBaseline: false, isPr: true, isCurrentPr: false,
    completedWorkingSets: 4, sessionVolumeKgReps: 2050, heaviestWeightKg: 102.5, maxCompletedReps: 8,
    plainBodyweightSets: 0, addedWeightSets: 0, assistedSets: 0,
  },
  {
    workoutId: 'bench-3', scoringDate: '2026-08-15', observedAt: '2026-08-15T18:00:00Z', metricType: 'E1RM', metricValue: 122.5,
    weightKg: 105, reps: 5, previousPrValue: 116.7, isBaseline: false, isPr: true, isCurrentPr: false,
    completedWorkingSets: 4, sessionVolumeKgReps: 2240, heaviestWeightKg: 107.5, maxCompletedReps: 7,
    plainBodyweightSets: 0, addedWeightSets: 0, assistedSets: 0,
  },
  {
    workoutId: 'bench-4', scoringDate: '2026-08-21', observedAt: '2026-08-21T18:00:00Z', metricType: 'E1RM', metricValue: 128.3,
    weightKg: 110, reps: 5, previousPrValue: 122.5, isBaseline: false, isPr: true, isCurrentPr: true,
    completedWorkingSets: 4, sessionVolumeKgReps: 2380, heaviestWeightKg: 110, maxCompletedReps: 6,
    plainBodyweightSets: 0, addedWeightSets: 0, assistedSets: 0,
  },
];

createRoot(document.getElementById('root')!).render(
  <ExerciseProgressScreen
    analytics={buildExerciseAnalytics(bench, history)}
    exercises={[bench]}
    history={history}
    historyError=""
    historyStatus="ready"
    onNavigate={() => undefined}
    onRetryHistory={() => undefined}
    onSelectExercise={() => undefined}
    onSignOut={() => undefined}
    profile={profile}
    selectedExercise={bench}
  />,
);
