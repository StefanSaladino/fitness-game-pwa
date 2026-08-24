import { LegalPage, LegalSection } from './LegalPage';

export function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="PRIVACY"
      title="Privacy Policy"
      intro="This policy explains the information Top Set uses to run accounts, record training, calculate progress, support optional group competition, and keep the service reliable."
    >
      <LegalSection title="1. Information we collect">
        <ul>
          <li>Account information such as your email address, display name, authentication identifiers, and account dates.</li>
          <li>Training-profile information such as timezone, preferred weight unit, weekly targets, profile code, and profile picture.</li>
          <li>Workout information such as exercises, sets, repetitions, weights, workout timing, cardio entries, personal records, and derived progress or scoring data.</li>
          <li>Optional group information such as memberships, invitations, competition activity, reactions, and reports.</li>
          <li>Technical and security information needed for authentication, offline recovery, synchronization, moderation, and service reliability.</li>
          <li>Notification preferences and push-subscription information if you choose to enable notifications.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How we use information">
        <p>We use this information to authenticate you, save and recover workouts, calculate personal progress and scores, provide the group features you choose to use, deliver requested notifications, prevent abuse, investigate reports, and maintain the service.</p>
        <p>Top Set does not sell your personal information or use your workout history for third-party advertising.</p>
      </LegalSection>

      <LegalSection title="3. What other users can see">
        <p>Your email address is not intended to be part of ordinary group competition views. Depending on the features you use, other group members may see profile information intended for the group, training-related competition results, rankings, reactions, or similar shared activity.</p>
        <p>Joining groups is optional. Personal training remains available without group membership.</p>
      </LegalSection>

      <LegalSection title="4. Service providers">
        <p>Top Set uses service providers to operate the app. Supabase is used for authentication and backend data storage. Hosting, delivery, and notification providers may also process limited technical information when those services are used.</p>
        <p>Providers may process information outside your province or country, where different laws may apply.</p>
      </LegalSection>

      <LegalSection title="5. Information stored on your device">
        <p>Top Set may use browser or app storage, including IndexedDB and similar local storage, to keep the PWA working, recover in-progress workouts, queue offline changes, remember essential state, and synchronize safely when connectivity returns.</p>
        <p>These mechanisms are used for product functionality rather than behavioural advertising.</p>
      </LegalSection>

      <LegalSection title="6. Administrative and moderation access">
        <p>Authorized platform administrators may access limited account or activity information when needed for security, moderation, account support, or platform administration. Sensitive administrative actions are intended to be bounded and auditable.</p>
      </LegalSection>

      <LegalSection title="7. Retention and deletion">
        <p>We keep information for as long as needed to provide your account and the features you use. You can update supported profile information and request account deletion through Settings.</p>
        <p>After deletion, limited information may remain for a reasonable period in backups, security records, or records that must be retained for legal or fraud-prevention purposes.</p>
      </LegalSection>

      <LegalSection title="8. Your choices">
        <ul>
          <li>You can keep training personal and choose not to join a group.</li>
          <li>You can change supported profile and training preferences in Settings.</li>
          <li>You can disable optional notifications.</li>
          <li>You can request password recovery without Top Set publicly confirming whether an email is registered.</li>
          <li>You can request account deletion through the service.</li>
        </ul>
      </LegalSection>

      <LegalSection title="9. Security">
        <p>We use reasonable technical and access controls designed to protect account and training information. No internet-connected system can guarantee absolute security, so credentials should remain private and suspected account compromise should be addressed promptly.</p>
      </LegalSection>

      <LegalSection title="10. Changes to this policy">
        <p>This policy may be updated as Top Set adds or changes features, providers, or data practices. Material changes should be presented through the service or another reasonable notice method.</p>
      </LegalSection>
    </LegalPage>
  );
}
