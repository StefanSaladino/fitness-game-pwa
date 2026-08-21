import type { AppSection } from '../../../components/layout';
import type { OnboardingProfile } from '../../onboarding';
import type { CardioService } from '../cardioService';
import { useCardio } from '../hooks/useCardio';
import { CardioScreen } from './CardioScreen';
export function CardioController({profile,onNavigate,onSignOut,service}:{profile:OnboardingProfile;onNavigate:(section:AppSection)=>void;onSignOut:()=>void;service?:CardioService}){const cardio=useCardio(service);return <CardioScreen profile={profile} onNavigate={onNavigate} onSignOut={onSignOut} {...cardio}/>}
