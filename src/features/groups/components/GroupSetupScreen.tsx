import { Button } from '../../../components/ui';
import type { CreateGroupInput, PendingGroupInvite } from '../model';
import { CreateGroupForm } from './CreateGroupForm';
import styles from './GroupSetup.module.css';

interface Props{
  creating?:boolean;createError?:string;inviteError?:string;busyAction?:string|null;profileCode?:string;
  pendingInvites:PendingGroupInvite[];
  onCreate(input:CreateGroupInput):Promise<unknown>|unknown;
  onAcceptInvite(id:string):Promise<unknown>|unknown;
  onDeclineInvite(id:string):Promise<unknown>|unknown;
  onBackToDashboard?:()=>void;
}
export function GroupSetupScreen({creating=false,createError='',inviteError='',busyAction=null,profileCode,pendingInvites,onCreate,onAcceptInvite,onDeclineInvite,onBackToDashboard}:Props){
  return <main className={styles.shell}>
    <section className={styles.hero} aria-labelledby="group-setup-title">
      <div className={styles.brandLine}><span className={styles.brandMark} aria-hidden="true">L</span><span>LIFTING-V1</span></div>
      <div className={styles.heroCopy}><p className={styles.eyebrow}>YOUR TRAINING CIRCLE</p><h1 id="group-setup-title">Build the crew you want to get stronger with.</h1><p className={styles.lead}>Groups are optional. Create one, accept an invitation sent directly to you, or keep training on your own.</p></div>
    </section>
    <section className={styles.panel} aria-label="Group setup">
      {onBackToDashboard && <div className={styles.backAction}><Button variant="ghost" onClick={onBackToDashboard}>Back to dashboard</Button></div>}
      {pendingInvites.length>0 && <div className={styles.pendingSection}>
        <p className={styles.kicker}>PENDING INVITATIONS</p>
        <ul className={styles.pendingList}>{pendingInvites.map(invite=><li key={invite.id} className={styles.pendingRow}>
          <div><strong>{invite.groupName}</strong><span>Invited by {invite.invitedByDisplayName} (@{invite.invitedByUsername})</span></div>
          <div className={styles.pendingActions}>
            <button type="button" disabled={busyAction!==null} onClick={()=>void onAcceptInvite(invite.id)}>Accept</button>
            <button type="button" disabled={busyAction!==null} onClick={()=>void onDeclineInvite(invite.id)}>Decline</button>
          </div>
        </li>)}</ul>
      </div>}
      {profileCode && <p className={styles.profileCode}>Your invite ID <strong>{profileCode}</strong></p>}
      {inviteError && <p className={styles.formError} role="alert">{inviteError}</p>}
      <div className={styles.formStage}><CreateGroupForm busy={creating} error={createError} onSubmit={onCreate}/></div>
      <p className={styles.privacyNote}>Invitations are person-specific. Reusable group join codes are not used.</p>
    </section>
  </main>;
}
