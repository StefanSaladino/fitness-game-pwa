import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import { LIFTING_BADGE_KEYS, type LiftingBadgeKey } from '../consistency';
import type {
  BadgeActivityMetadata,
  GlobalAllTimeLeaderboard,
  GoalActivityMetadata,
  GroupCompetitionEntry,
  GroupCompetitionLeaderboard,
  GroupReactionType,
  GroupSocialActivityMetadata,
  GroupSocialActivityType,
  GroupSocialFeedCursor,
  GroupSocialFeedItem,
  GroupSocialFeedPage,
  LiftActivityMetadata,
  PrActivityMetadata,
} from './model';

const PROFILE_PICTURE_BUCKET = 'profile-pictures';
const FEED_PAGE_SIZE = 20;
const activityTypes = new Set<GroupSocialActivityType>(['LIFT', 'PR', 'BADGE', 'GOAL']);
const reactionTypes = new Set<GroupReactionType>(['FIRE', 'STRONG', 'CLAP']);
const badgeKeys = new Set<string>(LIFTING_BADGE_KEYS);

type LeaderboardRow = {
  rank: number | string;
  member_user_id: string;
  username: string;
  display_name: string;
  profile_picture_path: string | null;
  xp: number | string;
  lifting_days: number | string;
  pr_count: number | string;
  badge_count: number | string;
  is_current_user: boolean;
  period_start: string | null;
  period_end: string | null;
};
type GlobalLeaderboardRow = Omit<LeaderboardRow, 'period_start' | 'period_end'> & {
  row_kind: 'TOP' | 'CURRENT_USER' | string;
};
type FeedRow = { activity_key:string; activity_type:string; activity_at:string; actor_user_id:string; username:string; display_name:string; profile_picture_path:string|null; metadata:unknown; fire_count:number|string; strong_count:number|string; clap_count:number|string; my_reaction:string|null };

export interface GroupSocialService {
  loadGroupLeaderboard(groupId: string): Promise<GroupCompetitionLeaderboard>;
  loadGlobalAllTimeLeaderboard(): Promise<GlobalAllTimeLeaderboard>;
  loadFeed(groupId:string, cursor?:GroupSocialFeedCursor|null):Promise<GroupSocialFeedPage>;
  setReaction(groupId:string, activityKey:string, reaction:GroupReactionType|null):Promise<void>;
}

function integerValue(value: unknown): number { const parsed=typeof value==='number'?value:Number(value); return Number.isFinite(parsed)?Math.max(0,Math.floor(parsed)):0; }
function numberValue(value: unknown): number { const parsed=typeof value==='number'?value:Number(value); return Number.isFinite(parsed)?parsed:0; }
function objectValue(value:unknown):Record<string,unknown>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function stringValue(value:unknown,fallback=''):string{return typeof value==='string'?value:fallback;}
function nullableNumber(value:unknown):number|null{if(value===null||value===undefined)return null;const parsed=typeof value==='number'?value:Number(value);return Number.isFinite(parsed)?parsed:null;}

function parseMetadata(type:GroupSocialActivityType,value:unknown):GroupSocialActivityMetadata{
  const row=objectValue(value);
  if(type==='LIFT') return {scoringDate:stringValue(row.scoringDate),title:stringValue(row.title,'Strength session'),durationMinutes:integerValue(row.durationMinutes),exerciseCount:integerValue(row.exerciseCount),xp:integerValue(row.xp)} satisfies LiftActivityMetadata;
  if(type==='PR') return {exerciseName:stringValue(row.exerciseName,'Exercise'),metricType:row.metricType==='BODYWEIGHT_REPS'?'BODYWEIGHT_REPS':'E1RM',metricValue:numberValue(row.metricValue),previousBest:numberValue(row.previousBest),weightKg:nullableNumber(row.weightKg),reps:row.reps===null||row.reps===undefined?null:integerValue(row.reps),scoringDate:stringValue(row.scoringDate)} satisfies PrActivityMetadata;
  if(type==='BADGE'){const badgeKey=stringValue(row.badgeKey);if(!badgeKeys.has(badgeKey))throw new Error('Social feed returned an unknown badge.');return {badgeKey:badgeKey as LiftingBadgeKey} satisfies BadgeActivityMetadata;}
  return {weekStart:stringValue(row.weekStart),liftingDays:integerValue(row.liftingDays),target:Math.max(1,integerValue(row.target))} satisfies GoalActivityMetadata;
}

export function createGroupSocialService(client:SupabaseClient=getSupabaseClient()):GroupSocialService{
  const publicPictureUrl=(path:string|null):string|null=>path?client.storage.from(PROFILE_PICTURE_BUCKET).getPublicUrl(path).data.publicUrl:null;
  const mapEntry=(row:Omit<LeaderboardRow,'period_start'|'period_end'>):GroupCompetitionEntry=>({
    rank:Math.max(1,integerValue(row.rank)),
    userId:row.member_user_id,
    username:row.username,
    displayName:row.display_name,
    profilePictureUrl:publicPictureUrl(row.profile_picture_path),
    xp:integerValue(row.xp),
    liftingDays:integerValue(row.lifting_days),
    prCount:integerValue(row.pr_count),
    badgeCount:integerValue(row.badge_count),
    isCurrentUser:row.is_current_user,
  });

  return {
    async loadGroupLeaderboard(groupId){
      const result=await client.rpc('get_group_competition_leaderboard',{p_group_id:groupId});
      if(result.error)throw result.error;
      const rows=(result.data??[]) as LeaderboardRow[];
      return {period:'WEEK',periodStart:rows[0]?.period_start??null,periodEnd:rows[0]?.period_end??null,entries:rows.map(mapEntry)};
    },
    async loadGlobalAllTimeLeaderboard(){
      const result=await client.rpc('get_global_all_time_leaderboard');
      if(result.error)throw result.error;
      const rows=(result.data??[]) as GlobalLeaderboardRow[];
      const top10=rows.filter(row=>row.row_kind==='TOP').map(mapEntry);
      const currentRow=rows.find(row=>row.row_kind==='CURRENT_USER')??null;
      return {top10,currentUser:currentRow?mapEntry(currentRow):null};
    },
    async loadFeed(groupId,cursor=null){const result=await client.rpc('get_group_social_feed',{p_group_id:groupId,p_limit:FEED_PAGE_SIZE+1,p_before_activity_at:cursor?.activityAt??null,p_before_activity_key:cursor?.activityKey??null});if(result.error)throw result.error;const rows=(result.data??[]) as FeedRow[];const hasMore=rows.length>FEED_PAGE_SIZE;const visibleRows=rows.slice(0,FEED_PAGE_SIZE);const items:GroupSocialFeedItem[]=visibleRows.map(row=>{if(!activityTypes.has(row.activity_type as GroupSocialActivityType))throw new Error('Social feed returned an unknown activity type.');const type=row.activity_type as GroupSocialActivityType;const myReaction=row.my_reaction&&reactionTypes.has(row.my_reaction as GroupReactionType)?row.my_reaction as GroupReactionType:null;return {activityKey:row.activity_key,activityType:type,activityAt:row.activity_at,actorUserId:row.actor_user_id,username:row.username,displayName:row.display_name,profilePictureUrl:publicPictureUrl(row.profile_picture_path),metadata:parseMetadata(type,row.metadata),reactions:{FIRE:integerValue(row.fire_count),STRONG:integerValue(row.strong_count),CLAP:integerValue(row.clap_count)},myReaction};});const last=items.at(-1);return {items,nextCursor:hasMore&&last?{activityAt:last.activityAt,activityKey:last.activityKey}:null};},
    async setReaction(groupId,activityKey,reaction){const result=await client.rpc('set_group_activity_reaction',{p_group_id:groupId,p_activity_key:activityKey,p_reaction_type:reaction});if(result.error)throw result.error;},
  };
}
