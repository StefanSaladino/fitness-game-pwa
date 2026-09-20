import type { AppSection } from '../../../components/layout';
import { navigateToPath, TRAINING_VOLUME_PATH, usePathname } from '../../../lib/appNavigation';
import type { OnboardingProfile } from '../../onboarding';
import type { ExerciseAnalyticsTrackingService } from '../analyticsTrackingService';
import type { MusclePerformanceService } from '../musclePerformanceService';
import type { ExerciseProgressService } from '../progressService';
import { useExerciseAnalyticsTracking } from '../hooks/useExerciseAnalyticsTracking';
import { useExerciseProgress } from '../hooks/useExerciseProgress';
import {
  createEmptyMusclePerformanceService,
  useMuscleVolumeRecommendations,
} from '../hooks/useMuscleVolumeRecommendations';
import { ExerciseProgressError, ExerciseProgressLoading, ExerciseProgressScreen } from './ExerciseProgressScreen';
import { TrainingVolumeScreen } from './TrainingVolumeScreen';

interface ExerciseProgressControllerProps {
  profile: OnboardingProfile;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  service?: ExerciseProgressService;
  analyticsTrackingService?: ExerciseAnalyticsTrackingService;
  musclePerformanceService?: MusclePerformanceService;
}

const EMPTY_ANALYTICS_TRACKING_SERVICE: ExerciseAnalyticsTrackingService = {
  listTrackedExerciseIds: async () => [],
  setTracked: async (_exerciseId, tracked) => tracked,
};

export function ExerciseProgressController({
  profile,
  onNavigate,
  onSignOut,
  service,
  analyticsTrackingService,
  musclePerformanceService,
}: ExerciseProgressControllerProps) {
  const pathname = usePathname();
  const progress = useExerciseProgress(service);
  const tracking = useExerciseAnalyticsTracking(
    analyticsTrackingService ?? (service ? EMPTY_ANALYTICS_TRACKING_SERVICE : undefined),
  );
  const volumeRecommendations = useMuscleVolumeRecommendations(
    progress.muscleVolume,
    pathname === TRAINING_VOLUME_PATH,
    musclePerformanceService
      ?? (service ? createEmptyMusclePerformanceService() : undefined),
  );

  if (pathname === TRAINING_VOLUME_PATH) {
    return (
      <TrainingVolumeScreen
        error={progress.muscleVolumeError}
        onBack={() => navigateToPath('/progress')}
        onNavigate={onNavigate}
        onRetry={() => void progress.retryMuscleVolume()}
        onRetryRecommendations={() => void volumeRecommendations.retry()}
        onSignOut={onSignOut}
        profile={profile}
        recommendationError={volumeRecommendations.error}
        recommendationStatus={volumeRecommendations.status}
        recommendations={volumeRecommendations.recommendations}
        rows={progress.muscleVolume}
        status={progress.muscleVolumeStatus}
      />
    );
  }

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
      onOpenTrainingVolume={() => navigateToPath(TRAINING_VOLUME_PATH)}
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
