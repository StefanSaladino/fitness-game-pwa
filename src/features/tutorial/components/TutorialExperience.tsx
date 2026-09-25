import type { OnboardingProfile } from '../../onboarding';
import type { TutorialService } from '../tutorialService';
import { TutorialCoach } from './TutorialCoach';
import { TutorialStage } from './TutorialStage';

const STAGE_IDS = [
  'HOME',
  'LIFT',
  'PROGRAM',
  'PROGRESS',
  'GROUPS',
  'COMPETE',
  'SETTINGS',
] as const;

function currentStep(): number {
  if (typeof window === 'undefined') return 0;
  const raw = Number(
    new URLSearchParams(window.location.search).get('step') ?? '0',
  );
  if (!Number.isInteger(raw)) return 0;
  return Math.max(0, Math.min(STAGE_IDS.length - 1, raw));
}

interface TutorialExperienceProps {
  profile: OnboardingProfile;
  required: boolean;
  returnPath?: string;
  service?: TutorialService;
  onProfileChanged(): Promise<unknown> | unknown;
}

export function TutorialExperience(props: TutorialExperienceProps) {
  const stepIndex = currentStep();

  return (
    <>
      <TutorialStage stage={STAGE_IDS[stepIndex]} />
      <TutorialCoach {...props} />
    </>
  );
}
