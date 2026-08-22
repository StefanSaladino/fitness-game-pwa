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

const profile:OnboardingProfile={id:USER_ID,username:'stefan',displayName:'Stefan',timezone:'America/Toronto',weeklyWorkoutTarget:4,pendingWeeklyWorkoutTarget:null,onboardingCompletedAt:'2026-08-19T20:00:00Z',profileCode:'FG-1111111111'};

const progressService:ExerciseProgressService={
  async listOverview(){return [{exerciseId:'bench',canonicalName:'Barbell Bench Press',measurementType:'WEIGHT_REPS',metricType:'E1RM',bestValue:112,bestWeightKg:100,bestReps:4,achievedAt:'2026-08-19T22:30:00Z',previousPrValue:108,sessionCount:4,observationCount:4,firstPerformedAt:'2026-08-10T22:00:00Z',lastPerformedAt:'2026-08-19T22:30:00Z',averageDaysBetweenSessions:3,latestMetricValue:112,latestWeightKg:100,latestReps:4,latestObservedAt:'2026-08-19T22:30:00Z'}];},
  async loadHistory(){return [{workoutId:'lift-1',scoringDate:'2026-08-19',observedAt:'2026-08-19T22:30:00Z',metricType:'E1RM',metricValue:112,weightKg:100,reps:4,previousPrValue:108,isBaseline:false,isPr:true,isCurrentPr:true,completedWorkingSets:4,sessionVolumeKgReps:1600,heaviestWeightKg:100,maxCompletedReps:4,plainBodyweightSets:0,addedWeightSets:0,assistedSets:0}];},
};


const socialService: GroupSocialService = {
  async loadLeaderboard(_groupId, period) {
    return {
      period,
      periodStart: period === 'WEEK' ? '2026-08-17' : null,
      periodEnd: period === 'WEEK' ? '2026-08-23' : null,
      entries: [
        { rank: 1, userId: USER_ID, username: 'stefan', displayName: 'Stefan', profilePictureUrl: null, xp: period === 'WEEK' ? 115 : 900, liftingDays: period === 'WEEK' ? 2 : 16, prCount: 7, badgeCount: 6, isCurrentUser: true },
        { rank: 2, userId: TEAMMATE_ID, username: 'alex', displayName: 'Alex', profilePictureUrl: null, xp: period === 'WEEK' ? 90 : 850, liftingDays: period === 'WEEK' ? 2 : 15, prCount: 5, badgeCount: 4, isCurrentUser: false },
      ],
    };
  },
  async loadFeed() {
    return {
      items: [{
        activityKey: 'PR:integration-opaque', activityType: 'PR' as const, activityAt: '2026-08-19T22:30:00Z', actorUserId: USER_ID,
        username: 'stefan', displayName: 'Stefan', profilePictureUrl: null,
        metadata: { exerciseName: 'Barbell Bench Press', metricType: 'E1RM' as const, metricValue: 112, previousBest: 108, weightKg: 100, reps: 4, scoringDate: '2026-08-19' },
        reactions: { FIRE: 1, STRONG: 0, CLAP: 0 }, myReaction: null,
      }],
      nextCursor: null,
    };
  },
  async setReaction() {},
};

const snapshot:DashboardSnapshot={weekStart:'2026-08-17',weekEnd:'2026-08-23',weeklyTarget:4,completedLiftingDays:2,completedLiftingDates:['2026-08-17','2026-08-19'],weeklyXp:115,xpBreakdown:{workout:50,exercises:25,progression:30,cardio:10},recentLifts:[{id:'lift-1',title:'Upper body',scoringDate:'2026-08-19',startedAt:'2026-08-19T22:00:00Z',durationMinutes:54,exerciseCount:5,xp:65}],recentPrs:[{exerciseId:'bench',exerciseName:'Barbell Bench Press',metricType:'E1RM',bestValue:112,bestWeightKg:100,bestReps:4,achievedAt:'2026-08-19T22:30:00Z'}],leaderboard:[{rank:1,userId:USER_ID,username:'stefan',displayName:'Stefan',profilePictureUrl:null,xp:115,isCurrentUser:true},{rank:2,userId:TEAMMATE_ID,username:'alex',displayName:'Alex',profilePictureUrl:null,xp:90,isCurrentUser:false}],currentUserProfilePictureUrl:null,consistency:{currentWeekStart:'2026-08-17',currentWeekTarget:4,currentWeekLiftingDays:2,currentCompletedWeekStreak:2,bestCompletedWeekStreak:3,completedWeeks:4,goalsHit:3,recentWeeks:[],badges:[]}};

function createMemoryGroupService(mode:'create'|'invited'='create'):GroupService{
 let groups:GroupSummary[]=[]; let members:GroupMember[]=[]; let outgoing:ManagedGroupInvite[]=[];
 let pending:PendingGroupInvite[]=mode==='invited'?[{id:'invite-in',groupId:GROUP_ID,groupName:'Night Crew',invitedByUserId:TEAMMATE_ID,invitedByUsername:'alex',invitedByDisplayName:'Alex',createdAt:'2026-08-19T20:00:00Z'}]:[];
 const makeGroup=(role:GroupSummary['role']):GroupSummary=>({id:GROUP_ID,name:role==='OWNER'?'Iron Crew':'Night Crew',memberCount:2,role,joinedAt:'2026-08-19T20:00:00Z',createdAt:'2026-08-19T20:00:00Z'});
 const ownerMember:GroupMember={userId:mode==='create'?USER_ID:TEAMMATE_ID,username:mode==='create'?'stefan':'alex',displayName:mode==='create'?'Stefan':'Alex',profilePicturePath:null,profilePictureUrl:null,role:'OWNER',joinedAt:'2026-08-19T20:00:00Z'};
 const otherMember:GroupMember={userId:mode==='create'?TEAMMATE_ID:USER_ID,username:mode==='create'?'alex':'stefan',displayName:mode==='create'?'Alex':'Stefan',profilePicturePath:null,profilePictureUrl:null,role:'MEMBER',joinedAt:'2026-08-19T20:05:00Z'};
 return {
  async listGroups(){return groups.map(g=>({...g}));},
  async createGroup(_userId,input){const g={...makeGroup('OWNER'),name:input.name};groups=[g];members=[ownerMember,otherMember];return {...g};},
  async getMembers(){return members.map(m=>({...m}));},
  async createInvite(_userId,groupId,recipient){expect(recipient).toBe('@alex');const invite:GroupInvite={id:'invite-out',groupId,invitedUserId:TEAMMATE_ID,invitedUsername:'alex',invitedDisplayName:'Alex',createdAt:'2026-08-19T20:10:00Z'};outgoing=[invite];return {...invite};},
  async joinByInvite(){throw new Error('Reusable invite codes are no longer supported.');},
  async listInvites(){return outgoing.map(i=>({...i}));},
  async listPendingInvites(){return pending.map(i=>({...i}));},
  async acceptInvite(id){expect(id).toBe('invite-in');pending=[];groups=[makeGroup('MEMBER')];members=[ownerMember,otherMember];return GROUP_ID;},
  async declineInvite(id){pending=pending.filter(i=>i.id!==id);},
  async renameGroup(_id,name){groups=groups.map(g=>({...g,name}));},
  async revokeInvite(id){outgoing=outgoing.filter(i=>i.id!==id);},
  async setMemberRole(_groupId,targetUserId,role){members=members.map(m=>m.userId===targetUserId?{...m,role}:m);},
  async removeMember(_groupId,targetUserId){members=members.filter(m=>m.userId!==targetUserId);groups=groups.map(g=>({...g,memberCount:members.length}));},
  async transferOwnership(_groupId,targetUserId){members=members.map(m=>m.userId===USER_ID?{...m,role:'MEMBER'}:m.userId===targetUserId?{...m,role:'OWNER'}:m);groups=groups.map(g=>({...g,role:'MEMBER'}));},
  async leaveGroup(){groups=[];members=[];},
 };
}

function JourneyHarness({service,dashboardService}:{service:GroupService;dashboardService:DashboardService}){const[,forceRender]=useState(0);return <GroupGate service={service} userId={USER_ID}>{(groups,refreshGroups)=><ProductController dashboardService={dashboardService} groupService={service} groups={groups} onGroupsChanged={async()=>{await refreshGroups();forceRender(v=>v+1);}} profile={profile} progressService={progressService} socialService={socialService}/>}</GroupGate>;}
function OnboardingToGroupHarness({service}:{service:GroupService}){const[completed,setCompleted]=useState(false);const[nextProfile,setNextProfile]=useState<OnboardingProfile>({...profile,username:'u_pending',onboardingCompletedAt:null});if(!completed)return <OnboardingScreen busy={false} profile={nextProfile} onSubmit={async(input:OnboardingInput)=>{setNextProfile(current=>({...current,username:input.username,displayName:input.displayName,timezone:input.timezone,weeklyWorkoutTarget:input.weeklyTarget,onboardingCompletedAt:'2026-08-19T20:00:00Z'}));setCompleted(true);return true;}}/>;return <GroupGate service={service} userId={USER_ID}>{()=><div>group membership ready</div>}</GroupGate>;}

describe('group-to-product integration journey',()=>{
 it('moves from completed onboarding directly into persisted group setup',async()=>{const user=userEvent.setup();const service=createMemoryGroupService();render(<OnboardingToGroupHarness service={service}/>);expect(await screen.findByRole('heading',{name:'Build your lifting identity.'})).toBeInTheDocument();await user.type(screen.getByRole('textbox',{name:'Username'}),'stefan');await user.click(screen.getByRole('button',{name:'Complete onboarding'}));expect(await screen.findByRole('heading',{name:/build the crew/i})).toBeInTheDocument();});
 it('creates a group, enters the real dashboard, then administers the crew',async()=>{const user=userEvent.setup();const groupService=createMemoryGroupService();const dashboardService:DashboardService={load:vi.fn(async()=>snapshot)};render(<JourneyHarness dashboardService={dashboardService} service={groupService}/>);expect(await screen.findByRole('heading',{name:/build the crew/i})).toBeInTheDocument();await user.type(screen.getByRole('textbox',{name:'Group name'}),'Iron Crew');await user.click(screen.getByRole('button',{name:'Create group'}));expect(await screen.findByRole('heading',{name:'Your lifting week'})).toBeInTheDocument();expect(screen.getByRole('heading',{name:'115 XP this week'})).toBeInTheDocument();expect(screen.getByRole('heading',{name:'Completed weeks & badges'})).toBeInTheDocument();expect(screen.getByText('Barbell Bench Press')).toBeInTheDocument();expect(dashboardService.load).toHaveBeenCalledWith(expect.objectContaining({groupId:GROUP_ID,userId:USER_ID}));await user.click(screen.getAllByRole('button',{name:'Compete'})[0]!);expect(await screen.findByRole('heading',{name:'Crew standings'})).toBeInTheDocument();expect(screen.getByRole('heading',{name:'Highlights, not surveillance'})).toBeInTheDocument();await user.click(screen.getAllByRole('button',{name:'Progress'})[0]!);expect(await screen.findByRole('heading',{name:'Know your trend. Beat your last.'})).toBeInTheDocument();expect(screen.getByRole('heading',{name:'Barbell Bench Press'})).toBeInTheDocument();await user.click(screen.getAllByRole('button',{name:'Groups'})[0]!);expect(await screen.findByRole('heading',{name:'Members'})).toBeInTheDocument();await user.type(screen.getByRole('textbox',{name:'Username or invite ID'}),'@alex');await user.click(screen.getByRole('button',{name:'Send invite'}));const invitesSection = await screen.findByRole('region', { name: 'Invites' });
expect(within(invitesSection).getByText('@alex')).toBeInTheDocument();await user.click(screen.getByRole('button',{name:'Make admin'}));await waitFor(()=>expect(screen.getByText('ADMIN')).toBeInTheDocument());});
 it('accepts a targeted invitation and reaches the member dashboard without admin controls',async()=>{const user=userEvent.setup();const groupService=createMemoryGroupService('invited');const dashboardService:DashboardService={load:vi.fn(async()=>snapshot)};render(<JourneyHarness dashboardService={dashboardService} service={groupService}/>);expect(await screen.findByRole('heading',{name:/build the crew/i})).toBeInTheDocument();expect(await screen.findByText('Night Crew')).toBeInTheDocument();await user.click(screen.getByRole('button',{name:'Accept'}));expect(await screen.findByRole('heading',{name:'Your lifting week'})).toBeInTheDocument();expect(screen.getByRole('heading',{name:'Completed weeks & badges'})).toBeInTheDocument();expect(screen.getAllByText('Night Crew').length).toBeGreaterThan(0);await user.click(screen.getAllByRole('button',{name:'Compete'})[0]!);expect(await screen.findByRole('heading',{name:'Crew standings'})).toBeInTheDocument();expect(screen.getByRole('heading',{name:'Highlights, not surveillance'})).toBeInTheDocument();await user.click(screen.getAllByRole('button',{name:'Groups'})[0]!);expect(await screen.findByRole('heading',{name:'Members'})).toBeInTheDocument();expect(screen.queryByRole('textbox',{name:'Username or invite ID'})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Leave group'})).toBeInTheDocument();});
});