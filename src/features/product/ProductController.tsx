import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppSection } from '../../components/layout';
import { navigateToPath } from '../../lib/appNavigation';
import { signOut } from '../auth/authService';
import type { DashboardService } from '../dashboard';
import type { CardioService } from '../cardio';
import type { GroupService, GroupSummary } from '../groups';
import type { OnboardingProfile } from '../onboarding';
import type { UserReportService } from '../moderation';
import type { ExerciseProgressService } from '../progress';
import type { GroupSocialService } from '../social';
import type {
  ExercisePickerService,
  WorkoutExerciseService,
  WorkoutMutationService,
  WorkoutService,
  WorkoutSetService,
} from '../workout';

const DashboardController = lazy(async () => {
  const module = await import('../dashboard/components/DashboardController');
  return { default: module.DashboardController };
});
const CardioController = lazy(async () => {
  const module = await import('../cardio/components/CardioController');
  return { default: module.CardioController };
});
const GroupAdministrationController = lazy(async () => {
  const module = await import('../groups/components/GroupAdministrationController');
  return { default: module.GroupAdministrationController };
});
const ExerciseProgressController = lazy(async () => {
  const module = await import('../progress/components/ExerciseProgressController');
  return { default: module.ExerciseProgressController };
});
const GroupSocialController = lazy(async () => {
  const module = await import('../social/components/GroupSocialController');
  return { default: module.GroupSocialController };
});
const WorkoutController = lazy(async () => {
  const module = await import('../workout/components/WorkoutController');
  return { default: module.WorkoutController };
});

interface ProductControllerProps {
  profile: OnboardingProfile;
  groups: GroupSummary[];
  onGroupsChanged: () => Promise<unknown> | unknown;
  groupService?: GroupService;
  dashboardService?: DashboardService;
  workoutService?: WorkoutService;
  workoutExerciseService?: WorkoutExerciseService;
  exercisePickerService?: ExercisePickerService;
  workoutSetService?: WorkoutSetService;
  workoutMutationService?: WorkoutMutationService;
  progressService?: ExerciseProgressService;
  socialService?: GroupSocialService;
  reportService?: UserReportService;
  cardioService?: CardioService;
}

function ProductSectionFallback() {
  return <div aria-live="polite" role="status">Loading…</div>;
}

function initialProductSection(): AppSection {
  if (typeof window === 'undefined') return 'home';
  const requested = new URLSearchParams(window.location.search).get('section');
  return requested === 'groups' || requested === 'workouts' || requested === 'cardio'
    || requested === 'progress' || requested === 'compete' ? requested : 'home';
}

export function ProductController({ profile, groups, onGroupsChanged, groupService, dashboardService, workoutService, workoutExerciseService, exercisePickerService, workoutSetService, workoutMutationService, progressService, socialService, reportService, cardioService }: ProductControllerProps) {
  const [activeSection, setActiveSection] = useState<AppSection>(initialProductSection);
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? '');

  useEffect(() => {
    if (!groups.some((group) => group.id === selectedGroupId)) setSelectedGroupId(groups[0]?.id ?? '');
  }, [groups, selectedGroupId]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? groups[0],
    [groups, selectedGroupId],
  );

  const onNavigate = (section: AppSection) => {
    if (section === 'profile') {
      navigateToPath('/settings');
      return;
    }
    if (section === 'home' || section === 'groups' || section === 'workouts' || section === 'cardio' || section === 'progress' || section === 'compete') setActiveSection(section);
  };
  const onSignOut = () => { void signOut(); };

  if (!selectedGroup) return null;

  let section: ReactNode;

  if (activeSection === 'workouts') {
    section = (
      <WorkoutController
        onNavigate={onNavigate}
        onSignOut={onSignOut}
        profile={profile}
        service={workoutService}
        exerciseService={workoutExerciseService}
        pickerService={exercisePickerService}
        setService={workoutSetService}
        mutationService={workoutMutationService}
      />
    );
  } else if (activeSection === 'cardio') {
    section = <CardioController onNavigate={onNavigate} onSignOut={onSignOut} profile={profile} service={cardioService} />;
  } else if (activeSection === 'progress') {
    section = (
      <ExerciseProgressController
        onNavigate={onNavigate}
        onSignOut={onSignOut}
        profile={profile}
        service={progressService}
      />
    );
  } else if (activeSection === 'compete') {
    section = (
      <GroupSocialController
        key={selectedGroup.id}
        groups={groups}
        onNavigate={onNavigate}
        onSelectGroup={setSelectedGroupId}
        onSignOut={onSignOut}
        profile={profile}
        selectedGroupId={selectedGroup.id}
        service={socialService}
        reportService={reportService}
      />
    );
  } else if (activeSection === 'groups') {
    section = (
      <GroupAdministrationController
        groups={groups}
        onGroupsChanged={onGroupsChanged}
        onNavigate={onNavigate}
        onSelectGroup={setSelectedGroupId}
        onSignOut={onSignOut}
        profile={profile}
        selectedGroupId={selectedGroup.id}
        userId={profile.id}
        service={groupService}
      />
    );
  } else {
    section = (
      <DashboardController
        group={selectedGroup}
        onNavigate={onNavigate}
        onSignOut={onSignOut}
        profile={profile}
        service={dashboardService}
      />
    );
  }

  return <Suspense fallback={<ProductSectionFallback />}>{section}</Suspense>;
}
