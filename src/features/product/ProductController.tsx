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
import type { ExercisePickerService, WorkoutExerciseService, WorkoutMutationService, WorkoutService, WorkoutSetService } from '../workout';

const DashboardController = lazy(async () => ({ default: (await import('../dashboard/components/DashboardController')).DashboardController }));
const CardioController = lazy(async () => ({ default: (await import('../cardio/components/CardioController')).CardioController }));
const GroupAdministrationController = lazy(async () => ({ default: (await import('../groups/components/GroupAdministrationController')).GroupAdministrationController }));
const GroupSetupController = lazy(async () => ({ default: (await import('../groups/components/GroupSetupController')).GroupSetupController }));
const ExerciseProgressController = lazy(async () => ({ default: (await import('../progress/components/ExerciseProgressController')).ExerciseProgressController }));
const GroupSocialController = lazy(async () => ({ default: (await import('../social/components/GroupSocialController')).GroupSocialController }));
const WorkoutController = lazy(async () => ({ default: (await import('../workout/components/WorkoutController')).WorkoutController }));

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

function ProductSectionFallback() { return <div aria-live="polite" role="status">Loading…</div>; }
function initialProductSection(): AppSection {
  if (typeof window === 'undefined') return 'home';
  const requested = new URLSearchParams(window.location.search).get('section');
  return requested === 'groups' || requested === 'workouts' || requested === 'cardio' || requested === 'progress' || requested === 'compete' ? requested : 'home';
}

export function ProductController(props: ProductControllerProps) {
  const { profile, groups, onGroupsChanged, groupService, dashboardService, workoutService, workoutExerciseService, exercisePickerService, workoutSetService, workoutMutationService, progressService, socialService, reportService, cardioService } = props;
  const [activeSection, setActiveSection] = useState<AppSection>(initialProductSection);
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? '');

  useEffect(() => {
    if (!groups.some((group) => group.id === selectedGroupId)) setSelectedGroupId(groups[0]?.id ?? '');
  }, [groups, selectedGroupId]);

  const selectedGroup = useMemo(() => groups.find((group) => group.id === selectedGroupId) ?? groups[0], [groups, selectedGroupId]);
  const onNavigate = (section: AppSection) => {
    if (section === 'profile') { navigateToPath('/settings'); return; }
    if (section === 'home' || section === 'groups' || section === 'workouts' || section === 'cardio' || section === 'progress' || section === 'compete') setActiveSection(section);
  };
  const onSignOut = () => { void signOut(); };

  let section: ReactNode;
  if (activeSection === 'workouts') {
    section = <WorkoutController onNavigate={onNavigate} onSignOut={onSignOut} profile={profile} service={workoutService} exerciseService={workoutExerciseService} pickerService={exercisePickerService} setService={workoutSetService} mutationService={workoutMutationService} />;
  } else if (activeSection === 'cardio') {
    section = <CardioController onNavigate={onNavigate} onSignOut={onSignOut} profile={profile} service={cardioService} />;
  } else if (activeSection === 'progress') {
    section = <ExerciseProgressController onNavigate={onNavigate} onSignOut={onSignOut} profile={profile} service={progressService} />;
  } else if (activeSection === 'groups' && !selectedGroup) {
    section = <GroupSetupController onMembershipReady={onGroupsChanged} profileCode={profile.profileCode} service={groupService} userId={profile.id} />;
  } else if (activeSection === 'groups' && selectedGroup) {
    section = <GroupAdministrationController groups={groups} onGroupsChanged={onGroupsChanged} onNavigate={onNavigate} onSelectGroup={setSelectedGroupId} onSignOut={onSignOut} profile={profile} selectedGroupId={selectedGroup.id} userId={profile.id} service={groupService} />;
  } else if (activeSection === 'compete' && selectedGroup) {
    section = <GroupSocialController key={selectedGroup.id} groups={groups} onNavigate={onNavigate} onSelectGroup={setSelectedGroupId} onSignOut={onSignOut} profile={profile} selectedGroupId={selectedGroup.id} service={socialService} reportService={reportService} />;
  } else if (activeSection === 'compete') {
    section = <GroupSetupController onMembershipReady={onGroupsChanged} profileCode={profile.profileCode} service={groupService} userId={profile.id} />;
  } else {
    section = <DashboardController group={selectedGroup} onNavigate={onNavigate} onSignOut={onSignOut} profile={profile} service={dashboardService} />;
  }

  return <Suspense fallback={<ProductSectionFallback />}>{section}</Suspense>;
}
