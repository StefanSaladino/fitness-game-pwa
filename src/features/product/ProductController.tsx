import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { TopSetLoadingScreen } from '../../components/feedback/TopSetLoadingScreen';
import type { AppSection } from '../../components/layout';
import {
  navigateToPath,
  productPathForSection,
  type ProductPathSection,
} from '../../lib/appNavigation';
import { signOut } from '../auth/authService';
import type { DashboardService } from '../dashboard';
import type { CardioService } from '../cardio';
import type { GroupService, GroupSummary } from '../groups';
import type { GroupChatService } from '../groups/chat';
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
import { persistSelectedGroupPreference, resolveSelectedGroupId } from './selectedGroupPreference';

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
const OptionalGroupSetupController = lazy(async () => {
  const module = await import('../groups/components/OptionalGroupSetupController');
  return { default: module.OptionalGroupSetupController };
});
const ExerciseProgressController = lazy(async () => {
  const module = await import('../progress/components/ExerciseProgressController');
  return { default: module.ExerciseProgressController };
});
const CompetitionController = lazy(async () => {
  const module = await import('../social/components/CompetitionController');
  return { default: module.CompetitionController };
});
const WorkoutController = lazy(async () => {
  const module = await import('../workout/components/WorkoutController');
  return { default: module.WorkoutController };
});

interface ProductControllerProps {
  profile: OnboardingProfile;
  groups: GroupSummary[];
  onGroupsChanged: () => Promise<unknown> | unknown;
  requestedSection?: ProductPathSection;
  groupService?: GroupService;
  groupChatService?: GroupChatService;
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
  return <TopSetLoadingScreen label="Loading section…" />;
}

function initialProductSection(): AppSection {
  if (typeof window === 'undefined') return 'home';
  const requested = new URLSearchParams(window.location.search).get('section');
  return requested === 'groups' || requested === 'workouts' || requested === 'cardio'
    || requested === 'progress' || requested === 'compete' ? requested : 'home';
}

export function ProductController({
  profile,
  groups,
  onGroupsChanged,
  requestedSection,
  groupService,
  groupChatService,
  dashboardService,
  workoutService,
  workoutExerciseService,
  exercisePickerService,
  workoutSetService,
  workoutMutationService,
  progressService,
  socialService,
  reportService,
  cardioService,
}: ProductControllerProps) {
  const [internalSection, setInternalSection] = useState<AppSection>(initialProductSection);
  const activeSection = requestedSection ?? internalSection;
  const [selectedGroupId, setSelectedGroupId] = useState(
    () => resolveSelectedGroupId(profile.id, groups),
  );

  useEffect(() => {
    if (groups.some((group) => group.id === selectedGroupId)) return;
    setSelectedGroupId(resolveSelectedGroupId(profile.id, groups));
  }, [groups, profile.id, selectedGroupId]);

  useEffect(() => {
    const validSelection = groups.some((group) => group.id === selectedGroupId)
      ? selectedGroupId
      : '';
    persistSelectedGroupPreference(profile.id, validSelection);
  }, [groups, profile.id, selectedGroupId]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? null,
    [groups, selectedGroupId],
  );

  const onNavigate = (section: AppSection) => {
    if (section === 'profile') {
      navigateToPath('/settings');
      return;
    }
    if (
      section === 'home'
      || section === 'groups'
      || section === 'workouts'
      || section === 'cardio'
      || section === 'progress'
      || section === 'compete'
    ) {
      setInternalSection(section);
      navigateToPath(productPathForSection(section));
    }
  };

  const onSignOut = () => { void signOut(); };

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
    section = (
      <CardioController
        onNavigate={onNavigate}
        onSignOut={onSignOut}
        profile={profile}
        service={cardioService}
      />
    );
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
      <CompetitionController
        groups={groups}
        onNavigate={onNavigate}
        onSelectGroup={setSelectedGroupId}
        onSignOut={onSignOut}
        profile={profile}
        reportService={reportService}
        selectedGroupId={selectedGroup?.id ?? ''}
        service={socialService}
      />
    );
  } else if (activeSection === 'groups') {
    section = selectedGroup ? (
      <GroupAdministrationController
        chatService={groupChatService}
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
    ) : (
      <OptionalGroupSetupController
        activeItem="groups"
        onMembershipReady={onGroupsChanged}
        onNavigate={onNavigate}
        onSignOut={onSignOut}
        profile={profile}
        service={groupService}
      />
    );
  } else {
    section = (
      <DashboardController
        group={selectedGroup}
        groupCount={groups.length}
        groupService={groupService}
        onGroupsChanged={onGroupsChanged}
        onNavigate={onNavigate}
        onSignOut={onSignOut}
        profile={profile}
        service={dashboardService}
      />
    );
  }

  return <Suspense fallback={<ProductSectionFallback />}>{section}</Suspense>;
}
