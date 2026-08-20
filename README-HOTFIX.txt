Fitness Game PWA v0.5.2 — Integration Test Stability Hotfix

Changed only:
- tests/integration/group-product-journey.test.tsx

Reason:
The targeted-invitation journey waited for the group setup heading, then synchronously queried for the pending invite. GroupSetupController loads pending invitations asynchronously, so the heading can render before the invite arrives. The assertion now awaits the invite text with findByText before clicking Accept.

No product code changes.
No database changes.
No scoring changes.
