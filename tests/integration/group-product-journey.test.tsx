import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { DashboardService, DashboardSnapshot } from '../../src/features/dashboard';
import { GroupGate, type GroupInvite, type GroupMember, type GroupService, type GroupSummary, type ManagedGroupInvite, type PendingGroupInvite } from '../../src/features/groups';
import { OnboardingScreen, type OnboardingInput, type OnboardingProfile } from '../../src/features/onboarding';
import type { ExerciseProgressService } from '../../src/features/progress';
import type { GroupSocialService } from '../../src/features/social';
import { ProductController } from '../../src/features/product';

const USER_ID='11111111-1111-4111-8111-111111111111';
const TEAMMATE_ID='22222222-2222-4222-8222-222222222222';
const GROUP_ID='33333333-3333-4333-8333-333333333333';
const SECOND_GROUP_ID='44444444-4444-4444-8444-444444444444';

const profile:OnboardingProfile={id:USER_ID,username:'stefan',displayName:'Stefan',timezone:'America/Toronto',weeklyWorkoutTarget:4,pendingWeeklyWorkoutTarget:null,onboardingCompletedAt:'2026-08-19T20:00:00Z',profileCode:'FG-1111111111',preferredWeightUnit:'KG'};

const progressService:ExerciseProgressService={
  async listOverview(){return [{exerciseId:'bench',canonicalName:'Barbell Bench Press',measurementType:'WEIGHT_REPS',metricType:'E1RM',bestValue:112,bestWeightKg:100,bestReps:4,achievedAt:'2026-08-19T22:30:00Z',previousPrValue:108,sessionCount:4,observationCount:4,firstPerformedAt:'2026-08-10T22:00:00Z',lastPerformedAt:'2026-08-19T22:30:00Z',averageDaysBetweenSessions:3,latestMetricValue:112,latestWeightKg:100,latestReps:4,latestObservedAt:'2026-08-19T22:30:00Z'}];},
  async loadCalendarSummaries(){return [
    {periodKind:'WEEK',periodStart:'2026-08-10',periodEnd:'2026-08-16',completedLiftingSessions:2,exerciseCount:5,completedWorkingSets:20,volumeKgReps:10000,prCount:1},
    {periodKind:'WEEK',periodStart:'2026-08-17',periodEnd:'2026-08-23',completedLiftingSessions:3,exerciseCount:6,completedWorkingSets:28,volumeKgReps:13200,prCount:2},
    {periodKind:'MONTH',periodStart:'2026-07-01',periodEnd:'2026-07-31',completedLiftingSessions:7,exerciseCount:8,completedWorkingSets:76,volumeKgReps:38000,prCount:2},
    {periodKind:'MONTH',periodStart:'2026-08-01',periodEnd:'2026-08-31',completedLiftingSessions:9,exerciseCount:10,completedWorkingSets:91,volumeKgReps:45500,prCount:4},
  ];},
  async loadHistory(){return [{workoutId:'lift-1',scoringDate:'2026-08-19',observedAt:'2026-08-19T22:30:00Z',metricType:'E1RM',metricValue:112,weightKg:100,reps:4,previousPrValue:108,isBaseline:false,isPr:true,isCurrentPr:true,completedWorkingSets:4,sessionVolumeKgReps:1600,heaviestWeightKg:100,maxCompletedReps:4,plainBodyweightSets:0,addedWeightSets:0,assistedSets:0}];},
};

const socialService: GroupSocialService = {
  async loadLeaderboard(_groupId, period) { return { period, periodStart: period === 'WEEK' ? '2026-08-17' : null, periodEnd: period === 'WEEK' ? '2026-08-23' : null, entries: [
    { rank: 1, userId: USER_ID, username: 'stefan', displayName: 'Stefan', profilePictureUrl: null, xp: period === 'WEEK' ? 115 : 900, liftingDays: period === 'WEEK' ? 2 : 16, prCount: 7, badgeCount: 6, isCurrentUser: true },
    { rank: 2, userId: TEAMMATE_ID, username: 'alex', displayName: 'Alex', profilePictureUrl: null, xp: period === 'WEEK' ? 90 : 850, liftingDays: period === 'WEEK' ? 2 : 15, prCount: 5, badgeCount: 4, isCurrentUser: false },
  ] }; },
  async loadFeed() { return { items: [{ activityKey: 'PR:integration-opaque', activityType: 'PR' as const, activityAt: '2026-08-19T22:30:00Z', actorUserId: USER_ID, username: 'stefan', displayName: 'Stefan', profilePictureUrl: null, metadata: { exerciseName: 'Barbell Bench Press', metricType: 'E1RM' as const, metricValue: 112, previousBest: 108, weightKg: 100, reps: 4, scoringDate: '2026-08-19' }, reactions: { FIRE: 1, STRONG: 0, CLAP: 0 }, myReaction: null }], nextCursor: null }; },
  async setReaction() {},
};

const snapshot:DashboardSnapshot={weekStart:'2026-08-17',weekEnd:'2026-08-23',weeklyTarget:4,completedLiftingDays:2,completedLiftingDates:['2026-08-17','2026-08-19'],weeklyXp:115,xpBreakdown:{workout:50,exercises:25,progression:30,cardio:10},recentLifts:[{id:'lift-1',title:'Upper body',scoringDate:'2026-08-19',startedAt:'2026-08-19T22:00:00Z',durationMinutes:54,exerciseCount:5,xp:65}],recentPrs:[{exerciseId:'bench',exerciseName:'Barbell Bench Press',metricType:'E1RM',bestValue:112,bestWeightKg:100,bestReps:4,achievedAt:'2026-08-19T22:30:00Z'}],leaderboard:[{rank:1,userId:USER_ID,username:'stefan',displayName:'Stefan',profilePictureUrl:null,xp:115,isCurrentUser:true},{rank:2,userId:TEAMMATE_ID,username:'alex',displayName:'Alex',profilePictureUrl:null,xp:90,isCurrentUser:false}],currentUserProfilePictureUrl:null,consistency:{currentWeekStart:'2026-08-17',currentWeekTarget:4,currentWeekLiftingDays:2,currentCompletedWeekStreak:2,bestCompletedWeekStreak:3,completedWeeks:4,goalsHit:3,recentWeeks:[],badges:[]}};

function createMemoryGroupService(mode:'create'|'invited'='create'):GroupService{
 let groups:GroupSummary[]=[]; let membersByGroup=new Map<string,GroupMember[]>(); let outgoing:ManagedGroupInvite[]=[];
 let pending:PendingGroupInvite[]=mode==='invited'?[{id:'invite-in',groupId:GROUP_ID,groupName:'Night Crew',invitedByUserId:TEAMMATE_ID,invitedByUsername:'alex',invitedByDisplayName:'Alex',createdAt:'2026-08-19T20:00:00Z'}]:[];
 const ownerMember:GroupMember={userId:USER_ID,username:'stefan',displayName:'Stefan',profilePicturePath:null,profilePictureUrl:null,role:'OWNER',joinedAt:'2026-08-19T20:00:00Z'};
 const teammateOwner:GroupMember={userId:TEAMMATE_ID,username:'alex',displayName:'Alex',profilePicturePath:null,profilePictureUrl:null,role:'OWNER',joinedAt:'2026-08-19T20:00:00Z'};
 const currentMember:GroupMember={...ownerMember,role:'MEMBER'};
 return {
  async listGroups(){return groups.map(g=>({...g}));},
  async createGroup(_userId,input){const id=groups.length===0?GROUP_ID:SECOND_GROUP_ID;const g:GroupSummary={id,name:input.name,memberCount:1,role:'OWNER',joinedAt:'2026-08-19T20:00:00Z',createdAt:'2026-08-19T20:00:00Z'};groups=[...groups,g];membersByGroup.set(id,[ownerMember]);return {...g};},
  async getMembers(groupId){return (membersByGroup.get(groupId)??[]).map(m=>({...m}));},
  async createInvite(_userId,groupId,recipient){expect(recipient).toBe('@alex');const invite:GroupInvite={id:'invite-out',groupId,invitedUserId:TEAMMATE_ID,invitedUsername:'alex',invitedDisplayName:'Alex',createdAt:'2026-08-19T20:10:00Z'};outgoing=[invite];return {...invite};},
  async joinByInvite(){throw new Error('Reusable invite codes are no longer supported.');},
  async listInvites(groupId){return outgoing.filter(i=>i.groupId===groupId).map(i=>({...i}));},
  async listPendingInvites(){return pending.map(i=>({...i}));},
  async acceptInvite(id){expect(id).toBe('invite-in');pending=[];const g:GroupSummary={id:GROUP_ID,name:'Night Crew',memberCount:2,role:'MEMBER',joinedAt:'2026-08-19T20:00:00Z',createdAt:'2026-08-19T20:00:00Z'};groups=[...groups,g];membersByGroup.set(GROUP_ID,[teammateOwner,currentMember]);return GROUP_ID;},
  async declineInvite(id){pending=pending.filter(i=>i.id!==id);},
  async renameGroup(id,name){groups=groups.map(g=>g.id===id?{...g,name}:g);},
  async revokeInvite(id){outgoing=outgoing.filter(i=>i.id!==id);},
  async setMemberRole(groupId,targetUserId,role){membersByGroup.set(groupId,(membersByGroup.get(groupId)??[]).map(m=>m.userId===targetUserId?{...m,role}:m));},
  async removeMember(groupId,targetUserId){const next=(membersByGroup.get(groupId)??[]).filter(m=>m.userId!==targetUserId);membersByGroup.set(groupId,next);groups=groups.map(g=>g.id===groupId?{...g,memberCount:next.length}:g);},
  async transferOwnership(groupId,targetUserId){membersByGroup.set(groupId,(membersByGroup.get(groupId)??[]).map(m=>m.userId===USER_ID?{...m,role:'MEMBER'}:m.userId===targetUserId?{...m,role:'OWNER'}:m));groups=groups.map(g=>g.id===groupId?{...g,role:'MEMBER'}:g);},
  async leaveGroup(groupId){groups=groups.filter(g=>g.id!==groupId);membersByGroup.delete(groupId);},
 };
}

function JourneyHarness({service,dashboardService}:{service:GroupService;dashboardService:DashboardService}){const[,forceRender]=useState(0);return <GroupGate service={service} userId={USER_ID}>{(groups,refreshGroups)=><ProductController dashboardService={dashboardService} groupService={service} groups={groups} onGroupsChanged={async()=>{await refreshGroups();forceRender(v=>v+1);}} profile={profile} progressService={progressService} socialService={socialService}/>}</GroupGate>;}
function OnboardingToProductHarness({service}:{service:GroupService}){const[completed,setCompleted]=useState(false);const[nextProfile,setNextProfile]=useState<OnboardingProfile>({...profile,username:'u_pending',onboardingCompletedAt:null});if(!completed)return <OnboardingScreen busy={false} profile={nextProfile} onSubmit={async(input:OnboardingInput)=>{setNextProfile(current=>({...current,username:input.username,displayName:input.displayName,timezone:input.timezone,weeklyWorkoutTarget:input.weeklyTarget,onboardingCompletedAt:'2026-08-19T20:00:00Z'}));setCompleted(true);return true;}}/>;return <GroupGate service={service} userId={USER_ID}>{groups=><div>product ready with {groups.length} groups</div>}</GroupGate>;}

describe('group-to-product integration journey',()=>{
 it('moves from completed onboarding into the product without requiring a group',async()=>{const user=userEvent.setup();const service=createMemoryGroupService();render(<OnboardingToProductHarness service={service}/>);expect(await screen.findByRole('heading',{name:'Build your lifting identity.'})).toBeInTheDocument();await user.type(screen.getByRole('textbox',{name:'Username'}),'stefan');await user.click(screen.getByRole('button',{name:'Complete onboarding'}));expect(await screen.findByText('product ready with 0 groups')).toBeInTheDocument();});

 it('starts on a personal dashboard, creates groups optionally, and preserves multiple memberships',async()=>{const user=userEvent.setup();const groupService=createMemoryGroupService();const dashboardService:DashboardService={load:vi.fn(async()=>snapshot)};render(<JourneyHarness dashboardService={dashboardService} service={groupService}/>);expect(await screen.findByRole('heading',{name:'Your lifting week'})).toBeInTheDocument();expect(screen.getByRole('heading',{name:'Train on your own or join when you want'})).toBeInTheDocument();expect(dashboardService.load).toHaveBeenCalledWith(expect.objectContaining({groupId:null,userId:USER_ID}));await user.click(screen.getAllByRole('button',{name:'Groups'})[0]!);expect(await screen.findByRole('heading',{name:/build the crew/i})).toBeInTheDocument();await user.type(screen.getByRole('textbox',{name:'Group name'}),'Iron Crew');await user.click(screen.getByRole('button',{name:'Create group'}));expect(await screen.findByRole('heading',{name:'Members'})).toBeInTheDocument();await user.type(screen.getByRole('textbox',{name:'Create another group'}),'Saturday Crew');await user.click(screen.getByRole('button',{name:'Create group'}));await waitFor(()=>expect(screen.getByText('2 active')).toBeInTheDocument());expect(screen.getAllByText('Iron Crew').length).toBeGreaterThan(0);expect(screen.getAllByText('Saturday Crew').length).toBeGreaterThan(0);await user.click(screen.getAllByRole('button',{name:'Home'})[0]!);expect(await screen.findByRole('heading',{name:'Your lifting week'})).toBeInTheDocument();expect(dashboardService.load).toHaveBeenCalledWith(expect.objectContaining({groupId:SECOND_GROUP_ID,userId:USER_ID}));});

 it('accepts a targeted invitation when group-free and keeps group participation optional',async()=>{const user=userEvent.setup();const groupService=createMemoryGroupService('invited');const dashboardService:DashboardService={load:vi.fn(async()=>snapshot)};render(<JourneyHarness dashboardService={dashboardService} service={groupService}/>);expect(await screen.findByRole('heading',{name:'Your lifting week'})).toBeInTheDocument();await user.click(screen.getAllByRole('button',{name:'Groups'})[0]!);expect(await screen.findByText('Night Crew')).toBeInTheDocument();await user.click(screen.getByRole('button',{name:'Accept'}));expect(await screen.findByRole('heading',{name:'Members'})).toBeInTheDocument();expect(screen.queryByRole('textbox',{name:'Username or invite ID'})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Leave group'})).toBeInTheDocument();await user.click(screen.getAllByRole('button',{name:'Home'})[0]!);expect(await screen.findByRole('heading',{name:'Your lifting week'})).toBeInTheDocument();expect(dashboardService.load).toHaveBeenCalledWith(expect.objectContaining({groupId:GROUP_ID,userId:USER_ID}));});

 it('keeps targeted invite administration scoped to the selected owned group',async()=>{const user=userEvent.setup();const groupService=createMemoryGroupService();await groupService.createGroup(USER_ID,{name:'Iron Crew'});const dashboardService:DashboardService={load:vi.fn(async()=>snapshot)};render(<JourneyHarness dashboardService={dashboardService} service={groupService}/>);await screen.findByRole('heading',{name:'Your lifting week'});await user.click(screen.getAllByRole('button',{name:'Groups'})[0]!);await user.type(screen.getByRole('textbox',{name:'Username or invite ID'}),'@alex');await user.click(screen.getByRole('button',{name:'Send invite'}));const invitesSection=await screen.findByRole('region',{name:'Invites'});expect(within(invitesSection).getByText('@alex')).toBeInTheDocument();});
});
