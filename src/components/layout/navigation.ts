import type { IconName } from '../ui';

export type AppSection = 'home' | 'workouts' | 'groups' | 'progress' | 'compete' | 'profile';

export interface NavigationItem {
  id: AppSection;
  label: string;
  icon: IconName;
}

export const primaryNavigation: NavigationItem[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'workouts', label: 'Workouts', icon: 'workout' },
  { id: 'groups', label: 'Groups', icon: 'groups' },
  { id: 'progress', label: 'Progress', icon: 'progress' },
  { id: 'compete', label: 'Compete', icon: 'trophy' },
  { id: 'profile', label: 'Profile', icon: 'profile' },
];
