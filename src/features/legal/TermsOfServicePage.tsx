import { LegalPage, LegalSection } from './LegalPage';

export function TermsOfServicePage() {
  return (
    <LegalPage
      eyebrow="LEGAL"
      title="Terms of Service"
      intro="These terms govern your use of Top Set, a workout-tracking and friendly competition service. By creating an account or using the service, you agree to these terms."
    >
      <LegalSection title="1. Your account">
        <p>You are responsible for the accuracy of the information you provide, for keeping your sign-in credentials secure, and for activity performed through your account.</p>
        <p>Do not use another person’s account without permission or attempt to bypass account, group, moderation, or platform-access controls.</p>
      </LegalSection>

      <LegalSection title="2. Training and health">
        <p>Top Set records training information and presents progress, scoring, rankings, and related fitness information. It does not provide medical diagnosis, treatment, or individualized medical advice.</p>
        <p>Exercise carries inherent risk. You are responsible for choosing training that is appropriate for you and for seeking qualified medical or coaching advice when needed.</p>
      </LegalSection>

      <LegalSection title="3. Workouts, points, and competition">
        <p>Workout entries, scores, ranks, streaks, personal records, and similar features are intended to make training more engaging. They are not money, property, or a guarantee of fitness performance.</p>
        <p>Scoring and qualification rules may change as Top Set improves. We will not intentionally rewrite completed training history simply to alter competition outcomes.</p>
      </LegalSection>

      <LegalSection title="4. Groups and conduct">
        <p>Group features are optional. When you join or create a group, information intended for competition or social features may be visible to other members of that group.</p>
        <ul>
          <li>Do not harass, threaten, impersonate, or deliberately deceive other users.</li>
          <li>Do not manipulate workout data, abuse invitations, or interfere with fair competition.</li>
          <li>Do not upload unlawful, infringing, or malicious content.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Your content">
        <p>You retain ownership of information and media you submit, including profile images and workout information. You give Top Set permission to store, process, and display that content only as needed to operate the service and the features you choose to use.</p>
      </LegalSection>

      <LegalSection title="6. Moderation and account action">
        <p>Top Set may investigate reports, restrict features, suspend accounts, or remove accounts when reasonably necessary to protect users, the service, or fair competition. Administrative access is intended to remain limited to operational or moderation needs.</p>
      </LegalSection>

      <LegalSection title="7. Availability and offline use">
        <p>Some training features may work offline and synchronize later. Network failures, device storage limits, third-party outages, or conflicting edits can delay synchronization. Keep important training information reasonably accurate and review recovered data after unusual interruptions.</p>
      </LegalSection>

      <LegalSection title="8. Account deletion">
        <p>You may request account deletion through the account settings made available in Top Set. Some limited records may be retained when reasonably necessary for security, legal obligations, fraud prevention, or dispute resolution.</p>
      </LegalSection>

      <LegalSection title="9. Disclaimers and liability">
        <p>Top Set is provided on an “as available” basis. To the maximum extent permitted by law, the service operator is not responsible for injuries, training decisions, lost progress, indirect losses, or interruptions caused by circumstances outside reasonable control.</p>
        <p>Nothing in these terms excludes rights or remedies that cannot legally be excluded.</p>
      </LegalSection>

      <LegalSection title="10. Changes to these terms">
        <p>These terms may be updated as the service changes. Material changes should be presented through the service or another reasonable notice method before they take effect.</p>
      </LegalSection>

      <LegalSection title="11. Governing law">
        <p>Unless applicable law requires otherwise, these terms are governed by the laws of Ontario and the applicable federal laws of Canada.</p>
      </LegalSection>
    </LegalPage>
  );
}
