import type { OnboardingProfile } from '../onboarding';

export const CURRENT_TUTORIAL_VERSION = 1 as const;

export type TutorialDestination =
  | '/'
  | '/lift'
  | '/program'
  | '/progress'
  | '/groups'
  | '/compete'
  | '/settings';

export function tutorialIsRequired(
  profile: Pick<OnboardingProfile, 'tutorialCompletedVersion'>,
): boolean {
  return (profile.tutorialCompletedVersion ?? 0) < CURRENT_TUTORIAL_VERSION;
}
