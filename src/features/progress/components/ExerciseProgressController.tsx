import type { AppSection } from '../../../components/layout';
import type { OnboardingProfile } from '../../onboarding';
import type { ExerciseAnalyticsTrackingService } from '../analyticsTrackingService';
import type { ExerciseProgressService } from '../progressService';
import { useExerciseAnalyticsTracking } from '../hooks/useExerciseAnalyticsTracking';
import { useExerciseProgress } from '../hooks/useExerciseProgress';
import { ExerciseProgressError, ExerciseProgressLoading, ExerciseProgressScreen } from './ExerciseProgressScreen';

interface ExerciseProgressControllerProps {
  profile: OnboardingProfile;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  service?: ExerciseProgressService;
  analyticsTrackingService?: ExerciseAnalyticsTrackingService;
}

const EMPTY_ANALYTICS_TRACKING_SERVICE: ExerciseAnalyticsTrackingService = {
  listTrackedExerciseIds: async () => [],
  setTracked: async (_exerciseId, tracked) => tracked,
};

export function ExerciseProgressController({ profile, onNavigate, onSignOut, service, analyticsTrackingService }: ExerciseProgressControllerProps) {
  const progress = useExerciseProgress(service);
  const tracking = useExerciseAnalyticsTracking(
    analyticsTrackingService ?? (service ? EMPTY_ANALYTICS_TRACKING_SERVICE : undefined),
  );

  if (progress.status === 'loading') {
    return <ExerciseProgressLoading onNavigate={onNavigate} onSignOut={onSignOut} profile={profile} />;
  }

  if (progress.status === 'error') {
    return (
      <ExerciseProgressError
        message={progress.error}
        onNavigate={onNavigate}
        onRetry={() => void progress.retry()}
        onSignOut={onSignOut}
        profile={profile}
      />
    );
  }

  return (
    <ExerciseProgressScreen
      analytics={progress.analytics}
      analyticsTrackingBusyExerciseId={tracking.busyExerciseId}
      analyticsTrackingError={tracking.error}
      analyticsTrackingStatus={tracking.status}
      calendarAnalytics={progress.calendarAnalytics}
      calendarError={progress.calendarError}
      calendarStatus={progress.calendarStatus}
      exercises={progress.exercises}
      history={progress.history}
      historyError={progress.historyError}
      historyStatus={progress.historyStatus}
      onNavigate={onNavigate}
      onRetryCalendar={() => void progress.retryCalendar()}
      onRetryHistory={() => void progress.retryHistory()}
      onSelectExercise={progress.selectExercise}
      onSignOut={onSignOut}
      onUntrackExercise={async (exerciseId) => {
        const changed = await tracking.setTracked(exerciseId, false);
        if (!changed) return;
        await progress.retry();
      }}
      profile={profile}
      selectedExercise={progress.selectedExercise}
    />
  );
}
