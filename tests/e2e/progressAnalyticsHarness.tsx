import { createRoot } from 'react-dom/client';
import type { OnboardingProfile } from '../../src/features/onboarding';
import { buildExerciseAnalytics } from '../../src/features/progress/exerciseAnalytics';
import { buildLiftingCalendarAnalytics } from '../../src/features/progress/liftingCalendarAnalytics';
import { ExerciseProgressScreen } from '../../src/features/progress/components/ExerciseProgressScreen';
import type { ExerciseProgressHistoryEntry, ExerciseProgressSummary, LiftingCalendarSummary } from '../../src/features/progress/model';
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


const calendarSummaries: LiftingCalendarSummary[] = [
  { periodKind: 'WEEK', periodStart: '2026-07-27', periodEnd: '2026-08-02', completedLiftingSessions: 2, exerciseCount: 5, completedWorkingSets: 20, volumeKgReps: 9800, prCount: 1 },
  { periodKind: 'WEEK', periodStart: '2026-08-03', periodEnd: '2026-08-09', completedLiftingSessions: 3, exerciseCount: 6, completedWorkingSets: 27, volumeKgReps: 12100, prCount: 2 },
  { periodKind: 'WEEK', periodStart: '2026-08-10', periodEnd: '2026-08-16', completedLiftingSessions: 2, exerciseCount: 6, completedWorkingSets: 24, volumeKgReps: 11400, prCount: 1 },
  { periodKind: 'WEEK', periodStart: '2026-08-17', periodEnd: '2026-08-23', completedLiftingSessions: 4, exerciseCount: 8, completedWorkingSets: 36, volumeKgReps: 15100, prCount: 3 },
  { periodKind: 'MONTH', periodStart: '2026-06-01', periodEnd: '2026-06-30', completedLiftingSessions: 8, exerciseCount: 9, completedWorkingSets: 82, volumeKgReps: 38600, prCount: 3 },
  { periodKind: 'MONTH', periodStart: '2026-07-01', periodEnd: '2026-07-31', completedLiftingSessions: 10, exerciseCount: 10, completedWorkingSets: 96, volumeKgReps: 45100, prCount: 4 },
  { periodKind: 'MONTH', periodStart: '2026-08-01', periodEnd: '2026-08-31', completedLiftingSessions: 11, exerciseCount: 12, completedWorkingSets: 111, volumeKgReps: 52750, prCount: 7 },
];

createRoot(document.getElementById('root')!).render(
  <ExerciseProgressScreen
    analytics={buildExerciseAnalytics(bench, history)}
    calendarAnalytics={buildLiftingCalendarAnalytics(calendarSummaries)}
    calendarError=""
    calendarStatus="ready"
    exercises={[bench]}
    history={history}
    historyError=""
    historyStatus="ready"
    onNavigate={() => undefined}
    onRetryCalendar={() => undefined}
    onRetryHistory={() => undefined}
    onSelectExercise={() => undefined}
    onSignOut={() => undefined}
    profile={profile}
    selectedExercise={bench}
  />,
);
