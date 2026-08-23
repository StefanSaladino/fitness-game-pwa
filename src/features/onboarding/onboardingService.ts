import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import type { OnboardingInput,OnboardingProfile } from './model';
import { assertValidOnboardingInput,MAX_WEEKLY_TARGET,MIN_WEEKLY_TARGET } from './validation';
type ProfileRow={id:string;username:string;display_name:string;timezone:string;weekly_workout_target:number;pending_weekly_workout_target:number|null;onboarding_completed_at:string|null;profile_code:string;preferred_weight_unit:'KG'|'LB'};
export interface OnboardingService{getProfile(userId:string):Promise<OnboardingProfile>;complete(input:OnboardingInput):Promise<void>;scheduleWeeklyTarget(target:number):Promise<void>}
export function createOnboardingService(client:SupabaseClient=getSupabaseClient()):OnboardingService{return{
 async getProfile(userId){const {data,error}=await client.from('profiles').select('id, username, display_name, timezone, weekly_workout_target, pending_weekly_workout_target, onboarding_completed_at, profile_code, preferred_weight_unit').eq('id',userId).single();if(error)throw error;if(!data)throw new Error('Profile not found.');const r=data as ProfileRow;return{id:r.id,username:r.username,displayName:r.display_name,timezone:r.timezone,weeklyWorkoutTarget:r.weekly_workout_target,pendingWeeklyWorkoutTarget:r.pending_weekly_workout_target,onboardingCompletedAt:r.onboarding_completed_at,profileCode:r.profile_code,preferredWeightUnit:r.preferred_weight_unit};},
 async complete(input){const v=assertValidOnboardingInput(input);const {error}=await client.rpc('complete_onboarding',{p_username:v.username,p_display_name:v.displayName,p_timezone:v.timezone,p_weekly_target:v.weeklyTarget});if(error)throw error;},
 async scheduleWeeklyTarget(target){if(!Number.isInteger(target)||target<MIN_WEEKLY_TARGET||target>MAX_WEEKLY_TARGET)throw new RangeError('Weekly target must be a whole number from 1 to 7.');const {error}=await client.rpc('schedule_weekly_target',{p_target:target});if(error)throw error;}
};}
