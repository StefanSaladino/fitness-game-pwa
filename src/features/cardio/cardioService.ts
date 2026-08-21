import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import type { CardioCategory, CardioHistoryEntry, CardioLogInput, CardioSnapshot, CardioSummary } from './model';

type HistoryRow={workout_id:string;category:CardioCategory;scoring_date:string;started_at:string;ended_at:string;active_duration_seconds:number|string;qualifies_cardio_bonus:boolean;daily_bonus_xp:number|string;notes:string|null};
type SummaryRow={total_activities:number|string;total_active_minutes:number|string;last_30_days_activities:number|string;last_30_days_active_minutes:number|string;last_30_days_bonus_xp:number|string;last_activity_at:string|null};
export interface CardioService{load():Promise<CardioSnapshot>;log(input:CardioLogInput):Promise<string>;remove(workoutId:string):Promise<string>}
const n=(value:number|string)=>{const parsed=typeof value==='number'?value:Number(value);return Number.isFinite(parsed)?parsed:0};
function mapHistory(row:HistoryRow):CardioHistoryEntry{return{workoutId:row.workout_id,category:row.category,scoringDate:row.scoring_date,startedAt:row.started_at,endedAt:row.ended_at,activeDurationSeconds:n(row.active_duration_seconds),qualifiesCardioBonus:Boolean(row.qualifies_cardio_bonus),dailyBonusXp:n(row.daily_bonus_xp),notes:row.notes}}
function mapSummary(row:SummaryRow|undefined):CardioSummary{return{totalActivities:n(row?.total_activities??0),totalActiveMinutes:n(row?.total_active_minutes??0),last30DaysActivities:n(row?.last_30_days_activities??0),last30DaysActiveMinutes:n(row?.last_30_days_active_minutes??0),last30DaysBonusXp:n(row?.last_30_days_bonus_xp??0),lastActivityAt:row?.last_activity_at??null}}
export function createCardioService(client:SupabaseClient=getSupabaseClient()):CardioService{return{
 async load(){const [history,summary]=await Promise.all([client.rpc('get_my_cardio_history',{p_limit:50}),client.rpc('get_my_cardio_summary')]);if(history.error)throw history.error;if(summary.error)throw summary.error;return{history:((history.data??[]) as HistoryRow[]).map(mapHistory),summary:mapSummary((summary.data as SummaryRow[]|null)?.[0])}},
 async log(input){const {data,error}=await client.rpc('log_cardio_activity',{p_category:input.category,p_active_duration_seconds:input.activeDurationMinutes*60,p_notes:(input.notes??'').trim()||null});if(error)throw error;if(typeof data!=='string')throw new Error('Cardio activity was not saved.');return data},
 async remove(workoutId){const {data,error}=await client.rpc('delete_cardio_activity',{p_workout_id:workoutId});if(error)throw error;if(typeof data!=='string')throw new Error('Cardio activity was not removed.');return data},
}}
