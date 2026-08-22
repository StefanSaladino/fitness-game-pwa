import type { AppSection } from '../../../components/layout';
import type { OnboardingProfile } from '../../onboarding';
import type { ExerciseProgressService } from '../progressService';
import { useExerciseProgress } from '../hooks/useExerciseProgress';
import { ExerciseProgressError, ExerciseProgressLoading, ExerciseProgressScreen } from './ExerciseProgressScreen';

interface ExerciseProgressControllerProps {
  profile: OnboardingProfile;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  service?: ExerciseProgressService;
}

export function ExerciseProgressController({ profile, onNavigate, onSignOut, service }: ExerciseProgressControllerProps) {
  const progress = useExerciseProgress(service);

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
      exercises={progress.exercises}
      history={progress.history}
      historyError={progress.historyError}
      historyStatus={progress.historyStatus}
      onNavigate={onNavigate}
      onRetryHistory={() => void progress.retryHistory()}
      onSelectExercise={progress.selectExercise}
      onSignOut={onSignOut}
      profile={profile}
      selectedExercise={progress.selectedExercise}
    />
  );
}
