import { createRoot } from 'react-dom/client';
import { CardioScreen } from '../../src/features/cardio/components/CardioScreen';
import type { CardioSnapshot } from '../../src/features/cardio/model';
import type { OnboardingProfile } from '../../src/features/onboarding';
import '../../src/styles/global.css';

const profile: OnboardingProfile = {
  id: '82222222-2222-4222-8222-222222222222',
  username: 'stefan',
  displayName: 'Stefan',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-08-20T20:00:00Z',
  profileCode: 'FG-8222222222',
  preferredWeightUnit: 'KG',
};

const snapshot: CardioSnapshot = {
  summary: {
    totalActivities: 18,
    totalActiveMinutes: 615,
    last30DaysActivities: 6,
    last30DaysActiveMinutes: 205,
    last30DaysBonusXp: 45,
    lastActivityAt: '2026-08-24T13:00:00Z',
  },
  history: [
    {
      workoutId: 'cardio-running',
      category: 'RUNNING',
      scoringDate: '2026-08-24',
      startedAt: '2026-08-24T12:30:00Z',
      endedAt: '2026-08-24T13:00:00Z',
      activeDurationSeconds: 1800,
      qualifiesCardioBonus: true,
      dailyBonusXp: 10,
      notes: 'Easy recovery run',
    },
    {
      workoutId: 'cardio-walk',
      category: 'WALKING_HIKING',
      scoringDate: '2026-08-22',
      startedAt: '2026-08-22T17:00:00Z',
      endedAt: '2026-08-22T17:40:00Z',
      activeDurationSeconds: 2400,
      qualifiesCardioBonus: true,
      dailyBonusXp: 10,
      notes: null,
    },
  ],
};

createRoot(document.getElementById('root')!).render(
  <CardioScreen
    busy={false}
    error=""
    log={async () => true}
    onNavigate={() => undefined}
    onSignOut={() => undefined}
    profile={profile}
    remove={async () => true}
    retry={async () => undefined}
    snapshot={snapshot}
    status="ready"
  />,
);
