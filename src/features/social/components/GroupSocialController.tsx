import { AppShell, type AppSection } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { GroupSummary } from '../../groups';
import type { OnboardingProfile } from '../../onboarding';
import { useGroupSocial } from '../hooks/useGroupSocial';
import type { GroupSocialService } from '../socialService';
import type { UserReportService } from '../../moderation';
import { GroupSocialScreen } from './GroupSocialScreen';
import styles from './GroupSocialScreen.module.css';
interface Props{profile:OnboardingProfile;groups:GroupSummary[];selectedGroupId:string;onSelectGroup:(groupId:string)=>void;onNavigate:(section:AppSection)=>void;onSignOut:()=>void;service?:GroupSocialService;reportService?:UserReportService;}
export function GroupSocialController(props:Props){const group=props.groups.find(item=>item.id===props.selectedGroupId)??props.groups[0];if(!group)return null;const social=useGroupSocial(group.id,props.service);if(social.status==='loading'||!social.weekly||!social.allTime){if(social.status==='error')return<AppShell activeItem="compete" onNavigate={props.onNavigate} onSignOut={props.onSignOut} userLabel={props.profile.displayName} userMeta={`@${props.profile.username}`}><section className={styles.state}><p>{social.error}</p><Button onClick={()=>void social.retry()}>Try again</Button></section></AppShell>;return<AppShell activeItem="compete" onNavigate={props.onNavigate} onSignOut={props.onSignOut} userLabel={props.profile.displayName} userMeta={`@${props.profile.username}`}><div className={styles.state} role="status">Loading crew competition…</div></AppShell>;}return<GroupSocialScreen allTime={social.allTime} busyReactionKey={social.busyReactionKey} error={social.error} feed={social.feed.items} group={group} groups={props.groups} hasMore={social.feed.nextCursor!==null} loadingMore={social.loadingMore} onLoadMore={()=>void social.loadMore()} onNavigate={props.onNavigate} onReact={(activityKey,reaction)=>{void social.react(activityKey,reaction);}} onSelectGroup={props.onSelectGroup} onSignOut={props.onSignOut} profile={props.profile} reportService={props.reportService} weekly={social.weekly}/>;}
