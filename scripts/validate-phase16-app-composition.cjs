const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const fail = (message) => { throw new Error(`Phase 16.10A composition validation failed: ${message}`); };
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const requireText = (source, expected, context) => {
  if (!source.includes(expected)) fail(`${context} is missing ${JSON.stringify(expected)}`);
};

const tokens = read('src/styles/tokens.css');
for (const token of ['--app-page-gutter', '--app-content-max', '--app-category-gap', '--app-surface-padding', '--app-row-min-height']) {
  requireText(tokens, token, 'shared tokens');
}

const base = read('src/styles/base.css');
requireText(base, 'overflow-x: clip', 'base horizontal-overflow contract');
requireText(base, 'scrollbar-width: none', 'mobile scrollbar contract');
requireText(base, '::-webkit-scrollbar', 'WebKit mobile scrollbar contract');
if (/body\s*\{[^}]*overflow\s*:\s*hidden/s.test(base)) fail('body must not disable normal page scrolling');

const shell = read('src/components/layout/AppShell.tsx');
requireText(shell, 'data-app-scroll-owner', 'authenticated shell');
requireText(shell, 'onSignOut={onSignOut}', 'mobile shell sign-out action');

const appNavigation = read('src/lib/appNavigation.ts');
for (const productPath of ["workouts: '/lift'", "cardio: '/cardio'", "groups: '/groups'", "progress: '/progress'", "compete: '/compete'"]) {
  requireText(appNavigation, productPath, 'canonical product routes');
}

const shellHeader = read('src/components/layout/ShellHeader.tsx');
for (const marker of ['data-app-message-slot="mobile"', 'Open Profile and Settings', 'aria-label="Sign out"']) {
  requireText(shellHeader, marker, 'mobile header action group');
}
const messageCenter = read('src/features/messaging/UserMessageCenter.tsx');
for (const marker of ['createPortal', 'data-system-notice-trigger', 'data-system-sheet', 'deleteMessage', 'Delete message?']) {
  requireText(messageCenter, marker, 'message-center notice composition');
}

const destinationBanner = read('src/components/layout/DestinationBanner.tsx');
for (const marker of ['data-app-media-banner', 'data-app-surface="primary"', 'alt=""']) {
  requireText(destinationBanner, marker, 'destination media banner');
}

const selectField = read('src/components/ui/SelectField.tsx');
for (const marker of ['role="combobox"', 'role="listbox"', 'role="option"', 'matchMedia(\'(max-width: 699px)\')', '<select']) {
  requireText(selectField, marker, 'SelectField');
}
const selectCss = read('src/components/ui/SelectField.module.css');
requireText(selectCss, 'position: fixed', 'mobile SelectField sheet');
requireText(selectCss, 'env(safe-area-inset-bottom)', 'mobile SelectField safe area');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

for (const file of walk(path.join(root, 'src')).filter((entry) => entry.endsWith('.tsx'))) {
  const relativePath = path.relative(root, file).split(path.sep).join('/');
  if (relativePath === 'src/components/ui/SelectField.tsx') continue;
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('<select')) fail(`raw select remains outside SelectField: ${relativePath}`);
  if (/<AppShell(?:\s|>)/.test(source) && /<main(?:\s|>)/.test(source)) {
    fail(`feature nests a second main landmark inside AppShell: ${relativePath}`);
  }
}

const dashboard = read('src/features/dashboard/components/DashboardScreen.tsx');
requireText(dashboard, 'data-app-surface="category"', 'Home category surfaces');
requireText(dashboard, 'top-set-plate-banner.jpg', 'Home destination media');
requireText(dashboard, 'DestinationBanner', 'Home destination banner');

const settings = read('src/features/settings/SettingsScreen.tsx');
for (const marker of ['data-settings-view', 'SettingsGroup', "panel === 'profile'", "panel === 'privacy'", 'showAdministration', 'data-app-message-slot="settings"', 'aria-label="Sign out"']) {
  requireText(settings, marker, 'Settings drill-in composition');
}
const settingsCss = read('src/features/settings/SettingsScreen.module.css').toLowerCase();
for (const retiredColor of ['#071019', '#0c1722', '#2e67d6', 'rgba(61, 134, 255']) {
  if (settingsCss.includes(retiredColor)) fail(`Settings contains retired navy/blue value ${retiredColor}`);
}

const notifications = read('src/features/settings/NotificationSettingsSection.tsx');
requireText(notifications, 'add Top Set to the Home Screen', 'notification install copy');
if (notifications.includes('add Workout Game')) fail('notification copy contains the retired product name');

const liftStart = read('src/features/workout/components/WorkoutPresetStartScreen.tsx');
for (const marker of ['data-lift-start', 'data-app-surface="category"', 'Start empty lift', 'DestinationBanner', 'top-set-dumbbell-grip.jpg']) {
  requireText(liftStart, marker, 'Lift start composition');
}

const workoutSession = read('src/features/workout/components/WorkoutSessionScreen.tsx');
for (const marker of ['data-finish-workout', 'data-lifecycle-action', "setLifecycleConfirm('finish')", "setLifecycleConfirm('cancel')", 'data-app-surface="primary"', 'data-app-surface="category"']) {
  requireText(workoutSession, marker, 'active workout composition');
}
if (workoutSession.includes('top-set-dumbbell-grip') || workoutSession.includes('workoutHero')) fail('active workout still depends on the retired decorative banner');

const workoutCss = read('src/features/workout/components/WorkoutSessionScreen.module.css');
for (const marker of ['position: sticky', 'var(--mobile-nav-height)', 'env(safe-area-inset-bottom)', '@media (max-width: 360px)']) {
  requireText(workoutCss, marker, 'active workout mobile task rail');
}

const setCss = read('src/features/workout/components/WorkoutSetList.module.css');
for (const marker of ['@media (max-width: 699px)', 'border-bottom: 6px solid var(--color-bg)', '@media (max-width: 340px)']) {
  requireText(setCss, marker, 'mobile set-row containment');
}
if (/overflow-x\s*:\s*(auto|scroll)/.test(setCss)) fail('set logger depends on horizontal scrolling');

const picker = read('src/features/workout/components/ExercisePicker.tsx');
for (const marker of ['aria-modal="true"', 'tabIndex={-1}', "event.key === 'Escape'", "event.key !== 'Tab'", 'document.documentElement.style.overflow']) {
  requireText(picker, marker, 'exercise picker route/dialog behavior');
}
const pickerCss = read('src/features/workout/components/ExercisePicker.module.css');
for (const marker of ['height: 100dvh', 'scrollbar-width: none', 'env(safe-area-inset-bottom)', '.browseSurface']) {
  requireText(pickerCss, marker, 'exercise picker mobile containment');
}

const progress = read('src/features/progress/components/ExerciseProgressScreen.tsx');
for (const marker of [
  'data-progress-surface="identity"',
  'data-progress-surface="lift-picker"',
  'data-progress-surface="exercise-summary"',
  'data-progress-surface="trends"',
  'data-progress-surface="milestones"',
  'data-progress-surface="history"',
  'Exercise trends',
  'Session history',
]) {
  requireText(progress, marker, 'Progress composition');
}
requireText(progress, 'top-set-progress-log.jpg', 'Progress destination media');
requireText(progress, 'DestinationBanner', 'Progress destination banner');
const progressCalendar = read('src/features/progress/components/LiftingCalendarSummary.tsx');
requireText(progressCalendar, 'data-progress-surface="calendar-summary"', 'Progress calendar summary');
const progressCss = read('src/features/progress/components/ExerciseProgressScreen.module.css');
for (const marker of ['var(--app-category-gap)', 'scrollbar-width: none', '@media (max-width: 360px)']) {
  requireText(progressCss, marker, 'Progress mobile containment');
}
const progressChartCss = read('src/features/progress/components/ExerciseTrendChart.module.css');
requireText(progressChartCss, 'overflow: hidden', 'Progress chart containment');

const cardio = read('src/features/cardio/components/CardioScreen.tsx');
for (const marker of [
  'data-cardio-surface="identity"',
  'data-cardio-surface="quick-log"',
  'data-cardio-surface="summary"',
  'data-cardio-surface="history"',
  'Cardio never counts as a lifting day',
  'DestinationBanner',
  'top-set-battle-rope-banner.jpg',
]) {
  requireText(cardio, marker, 'Cardio accessory composition');
}
const cardioCss = read('src/features/cardio/components/CardioScreen.module.css');
for (const marker of ['var(--app-category-gap)', 'scrollbar-width: none', '@media (max-width: 360px)', '@media (max-width: 420px)']) {
  requireText(cardioCss, marker, 'Cardio mobile containment');
}
if (/\.page\s*\{[^}]*padding\s*:/s.test(progressCss) || /\.page\s*\{[^}]*padding\s*:/s.test(cardioCss)) {
  fail('Progress or Cardio reintroduced a feature-owned page gutter');
}

const groupAdministration = read('src/features/groups/components/GroupAdministrationScreen.tsx');
for (const marker of [
  'data-groups-composition',
  'data-groups-surface="context"',
  'data-groups-surface="members"',
  "view === 'chat'",
  "view === 'invites'",
  "view === 'settings'",
  'label="Group"',
  'role="tabpanel"',
  'DestinationBanner',
  'GroupChatPanel',
]) {
  requireText(groupAdministration, marker, 'Groups composition');
}
if (groupAdministration.includes('groupRail') || groupAdministration.includes('<details')) {
  fail('Groups reintroduced the retired horizontal group rail or document-style settings disclosure');
}
const optionalGroups = read('src/features/groups/components/OptionalGroupSetupScreen.tsx');
for (const marker of ['data-groups-setup', 'data-groups-surface="empty-identity"', 'data-groups-surface="create-group"']) {
  requireText(optionalGroups, marker, 'optional Groups composition');
}
requireText(optionalGroups, 'DestinationBanner', 'optional Groups destination banner');
const groupsCss = read('src/features/groups/components/GroupAdministrationScreen.module.css');
for (const marker of ['var(--app-category-gap)', '@media (max-width: 340px)', 'env(safe-area-inset-bottom)', 'scrollbar-width: none']) {
  requireText(groupsCss, marker, 'Groups mobile containment');
}
if (/\.page\s*\{[^}]*padding\s*:/s.test(groupsCss) || /overflow-x\s*:\s*(auto|scroll)/.test(groupsCss)) {
  fail('Groups reintroduced feature-owned page padding or a horizontal rail');
}
const groupChat = read('src/features/groups/chat/GroupChatPanel.tsx');
for (const marker of ['data-groups-surface="chat"', 'Message your group', 'GROUP_CHAT_REACTIONS', 'Confirm group message deletion']) {
  requireText(groupChat, marker, 'member-only group chat composition');
}
const groupChatCss = read('src/features/groups/chat/GroupChatPanel.module.css');
for (const marker of ['min-width: 0', 'flex-wrap: wrap', '@media (max-width: 359px)']) {
  requireText(groupChatCss, marker, 'group chat 320px containment');
}
if (/overflow-x\s*:\s*(auto|scroll)/.test(groupChatCss)) fail('Group chat introduced horizontal scrolling');

const social = read('src/features/social/components/GroupSocialScreen.tsx');
for (const marker of [
  'data-social-composition',
  'data-social-surface="context"',
  'data-social-surface="standings"',
  'data-social-surface="activity"',
  "view === 'standings'",
  "view === 'activity'",
  'label="Competition group"',
  'DestinationBanner',
  'top-set-kettlebell-chalk.jpg',
]) {
  requireText(social, marker, 'Competition/Social composition');
}
if (social.includes('groupRail') || social.includes('contentGrid')) {
  fail('Competition/Social reintroduced the retired group rail or simultaneous two-column feed composition');
}
const socialCss = read('src/features/social/components/GroupSocialScreen.module.css');
for (const marker of ['var(--app-category-gap)', '@media (max-width: 360px)', 'overflow: hidden']) {
  requireText(socialCss, marker, 'Competition/Social mobile containment');
}
if (/\.page\s*\{[^}]*padding\s*:/s.test(socialCss) || /overflow-x\s*:\s*(auto|scroll)/.test(socialCss)) {
  fail('Competition/Social reintroduced feature-owned page padding or a horizontal rail');
}

const authLayout = read('src/features/auth/components/AuthLayout.tsx');
for (const marker of ['data-auth-composition', 'data-app-surface="primary"', 'TopSetMark']) {
  requireText(authLayout, marker, 'Auth composition');
}
const authCss = read('src/features/auth/components/AuthLayout.module.css');
for (const marker of ['env(safe-area-inset-top)', 'scroll-padding-bottom', 'min-height: clamp(142px', '@media (max-width: 380px)']) {
  requireText(authCss, marker, 'Auth mobile containment');
}

const onboarding = read('src/features/onboarding/components/OnboardingForm.tsx');
for (const marker of [
  'data-onboarding-composition',
  "{ label: 'Identity'",
  "{ label: 'Preferences'",
  "{ label: 'Goal'",
  'Step {step + 1} of {steps.length}',
  'data-app-surface="primary"',
  "step === 2 ? 'Complete setup' : 'Continue'",
]) {
  requireText(onboarding, marker, 'Onboarding focused-step composition');
}
const onboardingCss = read('src/features/onboarding/components/OnboardingForm.module.css');
for (const marker of ['position: sticky', 'env(safe-area-inset-bottom)', '@media (max-width: 360px)']) {
  requireText(onboardingCss, marker, 'Onboarding mobile action rail');
}

const legal = read('src/features/legal/LegalPage.tsx');
for (const marker of ['data-legal-composition', 'data-app-surface="primary"']) {
  requireText(legal, marker, 'Legal composition');
}

const adminShell = read('src/features/admin/components/PlatformAdminShell.tsx');
for (const marker of ['data-admin-composition', 'data-admin-scroll-owner', 'TopSetMark', 'TOP SET']) {
  requireText(adminShell, marker, 'platform administration shell');
}
if (adminShell.includes('Workout Game')) fail('platform administration retains the retired product name');

const adminSources = [
  'src/features/admin/capacity/components/CapacityDashboard.tsx',
  'src/features/admin/accounts/components/UserAdministrationScreen.tsx',
  'src/features/admin/moderation/components/ModerationWorkspaceScreen.tsx',
  'src/features/admin/messaging/components/PlatformMessagingController.tsx',
].map(read).join('\n');
for (const marker of ['data-admin-page="capacity"', 'data-admin-page="users"', 'data-admin-page="moderation"', 'data-admin-page="messages"', 'data-admin-surface=']) {
  requireText(adminSources, marker, 'platform administration page composition');
}
const capacitySource = read('src/features/admin/capacity/components/CapacityDashboard.tsx');
for (const marker of ['Supabase connected', 'Measured capacity', 'Organization-level quotas']) {
  requireText(capacitySource, marker, 'Supabase-backed measurable capacity overview');
}
const capacityService = read('src/features/admin/capacity/capacityDashboardService.ts');
if (capacityService.includes('client.functions.invoke')) {
  fail('Capacity page reintroduced provider Edge Function calls for unavailable billing telemetry');
}
if (capacityService.includes('VITE_NETLIFY_CAPACITY_ENABLED')) {
  fail('Capacity page reintroduced deferred Netlify telemetry before the Netlify capacity phase');
}
const adminCss = [
  'src/features/admin/components/PlatformAdminShell.module.css',
  'src/features/admin/capacity/components/CapacityDashboard.module.css',
  'src/features/admin/accounts/components/UserAdministration.module.css',
  'src/features/admin/moderation/components/ModerationWorkspace.module.css',
  'src/features/admin/messaging/components/PlatformMessaging.module.css',
].map(read).join('\n').toLowerCase();
for (const retiredColor of ['#071019', '#0c1722', '#08131d', '#52d878', 'rgba(61, 134, 255']) {
  if (adminCss.includes(retiredColor)) fail(`platform administration contains retired navy/green value ${retiredColor}`);
}
const adminShellCss = read('src/features/admin/components/PlatformAdminShell.module.css');
requireText(adminShellCss, 'overflow-x: clip', 'platform administration horizontal containment');

const stateSurface = read('src/components/feedback/AppStateSurface.tsx');
for (const marker of ['data-app-state', "tone = 'neutral'", "role?: 'alert' | 'status'"]) {
  requireText(stateSurface, marker, 'shared application state surface');
}
const loadingScreen = read('src/components/feedback/TopSetLoadingScreen.tsx');
for (const marker of ['data-system-state="loading"', 'data-app-state']) {
  requireText(loadingScreen, marker, 'shared route loading state');
}
const pwaStatus = read('src/pwa/PwaStatus.tsx');
for (const marker of ['data-system-notice', 'Install Top Set', 'Add Top Set to Home Screen']) {
  requireText(pwaStatus, marker, 'PWA notice composition');
}
if (pwaStatus.includes('Workout Game')) fail('PWA notice copy contains the retired product name');
if (messageCenter.includes('styles.banner')) fail('message center reintroduced the competing unread bottom banner');

console.log('Phase 16.10A composition validation passed: shell, scroll, select, Home, Settings, Lift, Progress, Cardio, Groups, Competition, Social, Auth, Onboarding, Legal, Admin, and shared system-state contracts are present.');
