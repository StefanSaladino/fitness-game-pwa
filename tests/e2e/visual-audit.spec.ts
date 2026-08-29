import { expect, test, type Page, type TestInfo } from '@playwright/test';

type Viewport = { name: string; width: number; height: number };
type Scenario = {
  name: string;
  url: string;
  group: keyof typeof BREAKPOINTS;
  prepare?: (page: Page) => Promise<void>;
};

const CANONICAL: Viewport[] = [
  { name: 'phone-320x568', width: 320, height: 568 },
  { name: 'phone-360x640', width: 360, height: 640 },
  { name: 'phone-375x667', width: 375, height: 667 },
  { name: 'phone-390x844', width: 390, height: 844 },
  { name: 'phone-412x915', width: 412, height: 915 },
  { name: 'phone-430x932', width: 430, height: 932 },
  { name: 'phone-landscape-667x375', width: 667, height: 375 },
  { name: 'phone-landscape-844x390', width: 844, height: 390 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'tablet-820x1180', width: 820, height: 1180 },
  { name: 'desktop-1024x768', width: 1024, height: 768 },
  { name: 'desktop-short-1024x600', width: 1024, height: 600 },
  { name: 'desktop-1280x720', width: 1280, height: 720 },
  { name: 'desktop-short-1280x600', width: 1280, height: 600 },
  { name: 'desktop-1366x768', width: 1366, height: 768 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'desktop-short-1440x650', width: 1440, height: 650 },
  { name: 'desktop-1920x1080', width: 1920, height: 1080 },
];

const BREAKPOINTS = {
  auth: [380, 700, 1024],
  onboarding: [360, 520, 700, 1024],
  legal: [360, 700],
  shell: [359, 520, 700, 1024, 1320],
  workout: [340, 360, 620, 699, 700, 1024],
  cardio: [360, 420, 560, 980, 1024],
  progress: [360, 560, 700, 900, 980, 1024],
  groups: [340, 360, 420, 700, 920, 1024],
  social: [360, 520, 700, 1024],
  settings: [519, 520, 680, 1024],
  messages: [440, 760, 1024],
  admin: [360, 560, 720, 900, 940, 980, 1024, 1220],
} as const;

function breakpointViewports(group: Scenario['group']): Viewport[] {
  const values = new Map<string, Viewport>();
  for (const breakpoint of BREAKPOINTS[group]) {
    for (const width of [breakpoint - 1, breakpoint, breakpoint + 1]) {
      const height = width < 700 ? 740 : width < 1024 ? 900 : 720;
      const viewport = { name: `bp-${breakpoint}-${width}`, width, height };
      values.set(`${width}x${height}`, viewport);
    }
  }
  return [...values.values()];
}

function viewportsFor(scenario: Scenario): Viewport[] {
  const unique = new Map(CANONICAL.map((viewport) => [`${viewport.width}x${viewport.height}`, viewport]));
  for (const viewport of breakpointViewports(scenario.group)) unique.set(`${viewport.width}x${viewport.height}`, viewport);
  return [...unique.values()];
}

const scenarios: Scenario[] = [
  { name: 'auth-sign-in', url: '/app-composition.e2e.html?surface=auth', group: 'auth' },
  { name: 'auth-sign-up', url: '/release-visual-audit.e2e.html?surface=auth-signup', group: 'auth' },
  { name: 'auth-forgot-password', url: '/release-visual-audit.e2e.html?surface=auth-forgot', group: 'auth' },
  { name: 'auth-verify-email', url: '/release-visual-audit.e2e.html?surface=auth-verify', group: 'auth' },
  { name: 'onboarding-step-1', url: '/app-composition.e2e.html?surface=onboarding', group: 'onboarding' },
  { name: 'onboarding-step-2', url: '/app-composition.e2e.html?surface=onboarding', group: 'onboarding', prepare: async (page) => { await page.getByRole('textbox', { name: 'Username' }).fill('alex_lifts'); await page.getByRole('button', { name: 'Continue' }).click(); } },
  { name: 'onboarding-step-3', url: '/app-composition.e2e.html?surface=onboarding', group: 'onboarding', prepare: async (page) => { await page.getByRole('textbox', { name: 'Username' }).fill('alex_lifts'); await page.getByRole('button', { name: 'Continue' }).click(); await page.getByRole('button', { name: 'Continue' }).click(); } },
  { name: 'legal-terms', url: '/app-composition.e2e.html?surface=legal', group: 'legal' },
  { name: 'legal-privacy', url: '/release-visual-audit.e2e.html?surface=privacy', group: 'legal' },
  { name: 'home-group', url: '/release-visual-audit.e2e.html?surface=dashboard', group: 'shell' },
  { name: 'home-solo', url: '/release-visual-audit.e2e.html?surface=dashboard-solo', group: 'shell' },
  { name: 'app-header-actions', url: '/app-composition.e2e.html?surface=header', group: 'shell' },
  { name: 'inbox-open', url: '/app-composition.e2e.html?surface=messages', group: 'messages', prepare: async (page) => { await page.getByRole('button', { name: 'Messages' }).click(); } },
  { name: 'inbox-delete-confirmation', url: '/app-composition.e2e.html?surface=messages', group: 'messages', prepare: async (page) => { await page.getByRole('button', { name: 'Messages' }).click(); await page.getByRole('button', { name: 'Delete' }).click(); } },
  { name: 'lift-start', url: '/release-visual-audit.e2e.html?surface=lift-start', group: 'workout' },
  { name: 'lift-active', url: '/reliability.e2e.html', group: 'workout' },
  { name: 'lift-offline-recovery', url: '/reliability.e2e.html?state=offline', group: 'workout' },
  { name: 'lift-sync-conflict', url: '/reliability.e2e.html?state=conflict', group: 'workout' },
  { name: 'lift-exercise-picker', url: '/reliability.e2e.html', group: 'workout', prepare: async (page) => { await page.getByRole('button', { name: 'Add exercise' }).click(); } },
  { name: 'lift-finish-confirmation', url: '/reliability.e2e.html', group: 'workout', prepare: async (page) => { await page.getByRole('button', { name: 'Finish workout' }).click(); } },
  { name: 'lift-cancel-confirmation', url: '/reliability.e2e.html', group: 'workout', prepare: async (page) => { await page.getByRole('button', { name: 'Cancel workout' }).click(); } },
  { name: 'cardio', url: '/cardio.e2e.html', group: 'cardio' },
  { name: 'progress', url: '/progress.e2e.html', group: 'progress' },
  { name: 'groups-empty', url: '/release-visual-audit.e2e.html?surface=groups-empty', group: 'groups' },
  { name: 'groups-members', url: '/groups.e2e.html', group: 'groups' },
  { name: 'groups-chat', url: '/groups.e2e.html', group: 'groups', prepare: async (page) => { await page.getByRole('tab', { name: 'Chat' }).click(); } },
  { name: 'groups-invites', url: '/groups.e2e.html', group: 'groups', prepare: async (page) => { await page.getByRole('tab', { name: /Invites/ }).click(); } },
  { name: 'groups-settings', url: '/groups.e2e.html', group: 'groups', prepare: async (page) => { await page.getByRole('tab', { name: 'Settings' }).click(); } },
  { name: 'compete-standings', url: '/competition.e2e.html', group: 'social' },
  { name: 'compete-global-all-time', url: '/competition.e2e.html', group: 'social', prepare: async (page) => { await page.getByRole('button', { name: 'Global all-time' }).click(); } },
  { name: 'compete-activity', url: '/competition.e2e.html', group: 'social', prepare: async (page) => { await page.getByRole('tab', { name: 'Activity' }).click(); } },
  { name: 'settings-index', url: '/release-visual-audit.e2e.html?surface=settings', group: 'settings' },
  ...[
    { label: 'Profile', panel: 'profile' },
    { label: 'Security', panel: 'security' },
    { label: 'Training', panel: 'training' },
    { label: 'Notifications', panel: 'notifications' },
    { label: 'Groups', panel: 'groups' },
    { label: 'App status', panel: 'app' },
    { label: 'Privacy & data', panel: 'privacy' },
    { label: 'Administration', panel: 'admin' },
  ].map(({ label, panel }): Scenario => ({
    name: `settings-${label.toLowerCase().replaceAll(' ', '-').replaceAll('&', 'and')}`,
    url: '/release-visual-audit.e2e.html?surface=settings', group: 'settings',
    prepare: async (page) => {
      const row = page.getByRole('button', { name: label });
      await expect(row).toBeVisible({ timeout: 5_000 });
      await row.click();
      await expect(page.locator(`[data-settings-view="${panel}"]`)).toBeVisible({ timeout: 5_000 });
    },
  })),
  { name: 'admin-overview', url: '/app-composition.e2e.html?surface=admin', group: 'admin' },
  { name: 'admin-users-list', url: '/user-administration.e2e.html', group: 'admin' },
  { name: 'admin-user-detail', url: '/user-administration.e2e.html', group: 'admin', prepare: async (page) => { await page.getByRole('button', { name: /Alpha User/ }).click(); } },
  { name: 'admin-moderation', url: '/release-visual-audit.e2e.html?surface=admin-moderation', group: 'admin' },
  { name: 'admin-messages', url: '/release-visual-audit.e2e.html?surface=admin-messages', group: 'admin' },
];

async function geometryAudit(page: Page, viewport: Viewport) {
  return page.evaluate(({ width, height }) => {
    const root = document.documentElement;
    const horizontalOverflow = Math.max(0, root.scrollWidth - window.innerWidth);
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
    };
    const hasHorizontalScrollOwner = (element: Element) => {
      let current = element.parentElement;
      while (current) {
        const style = getComputedStyle(current);
        if (['auto', 'scroll'].includes(style.overflowX) && current.scrollWidth > current.clientWidth + 1) return true;
        current = current.parentElement;
      }
      return false;
    };
    const interactive = [...document.querySelectorAll('button,a,input,textarea,select,[role="button"],[role="tab"],[role="dialog"],[role="listbox"]')]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          text: (element.textContent ?? '').trim().slice(0, 100),
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          horizontallyScrollable: hasHorizontalScrollOwner(element),
        };
      });
    const outsideViewport = interactive.filter((item) => !item.horizontallyScrollable && (item.left < -1 || item.right > window.innerWidth + 1));
    const smallTouchTargets = width <= 430 ? interactive.filter((item) => item.width < 40 || item.height < 40).slice(0, 30) : [];
    const clippedText = [...document.querySelectorAll('button,a,label,p,span,strong,h1,h2,h3,dt,dd')]
      .filter(visible)
      .flatMap((element) => {
        const node = element as HTMLElement;
        const style = getComputedStyle(node);
        if (!node.textContent?.trim()) return [];
        const clippedX = node.scrollWidth > node.clientWidth + 1;
        const clippedY = node.scrollHeight > node.clientHeight + 1;
        if (!clippedX && !clippedY) return [];
        return [{ tag: node.tagName.toLowerCase(), text: node.textContent.trim().slice(0, 120), clippedX, clippedY, overflowX: style.overflowX, overflowY: style.overflowY, whiteSpace: style.whiteSpace }];
      }).slice(0, 50);

    const adminOwner = document.querySelector<HTMLElement>('[data-admin-scroll-owner]');
    const ownerStyle = adminOwner ? getComputedStyle(adminOwner) : null;
    const adminDesktop = Boolean(adminOwner && width >= 940);
    const adminScrollContract = adminOwner ? {
      clientHeight: adminOwner.clientHeight,
      scrollHeight: adminOwner.scrollHeight,
      overflowY: ownerStyle?.overflowY ?? '',
      constrainedToViewport: adminOwner.clientHeight <= height + 2,
      canOverflowInternally: adminOwner.scrollHeight <= adminOwner.clientHeight + 1 || ['auto', 'scroll'].includes(ownerStyle?.overflowY ?? ''),
    } : null;

    const documentScrollable = root.scrollHeight > window.innerHeight + 1;
    return { horizontalOverflow, outsideViewport, smallTouchTargets, clippedText, documentScrollable, documentHeight: root.scrollHeight, adminDesktop, adminScrollContract };
  }, { width: viewport.width, height: viewport.height });
}

async function verifyReachableBottom(page: Page) {
  return page.evaluate(() => {
    const adminOwner = document.querySelector<HTMLElement>('[data-admin-scroll-owner]');
    if (adminOwner && window.innerWidth >= 940) {
      if (adminOwner.scrollHeight <= adminOwner.clientHeight + 1) return { owner: 'admin', needed: false, reached: adminOwner.clientHeight <= window.innerHeight + 2 };
      const max = adminOwner.scrollHeight - adminOwner.clientHeight;
      adminOwner.scrollTop = max;
      return { owner: 'admin', needed: true, reached: Math.abs(adminOwner.scrollTop - max) <= 2 };
    }
    const max = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;
    if (max <= 1) return { owner: 'document', needed: false, reached: true };
    window.scrollTo(0, max);
    return { owner: 'document', needed: true, reached: Math.abs(window.scrollY - max) <= 3 };
  });
}

for (const scenario of scenarios) {
  for (const viewport of viewportsFor(scenario)) {
    test(`${scenario.name} @ ${viewport.name}`, async ({ page }, testInfo: TestInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(scenario.url);
      await page.locator('body').waitFor({ state: 'visible' });
      if (scenario.url.startsWith('/release-visual-audit.e2e.html')) {
        const expectedSurface = new URL(scenario.url, 'http://visual-audit.local').searchParams.get('surface') ?? 'dashboard';
        await expect(page.locator('body')).toHaveAttribute('data-release-visual-audit-surface', expectedSurface, { timeout: 5_000 });
      }
      if (scenario.prepare) await scenario.prepare(page);
      await page.evaluate(async () => { if ('fonts' in document) await document.fonts.ready; });

      const diagnostics = await geometryAudit(page, viewport);
      await testInfo.attach('geometry.json', { body: Buffer.from(JSON.stringify(diagnostics, null, 2)), contentType: 'application/json' });

      const bottom = await verifyReachableBottom(page);
      await page.evaluate(() => { window.scrollTo(0, 0); const admin = document.querySelector<HTMLElement>('[data-admin-scroll-owner]'); if (admin) admin.scrollTop = 0; });

      const screenshotPath = testInfo.outputPath(`${scenario.name}-${viewport.width}x${viewport.height}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true, animations: 'disabled' });
      await testInfo.attach('visual-audit-top.png', { path: screenshotPath, contentType: 'image/png' });

      if (bottom.needed) {
        await page.evaluate((owner) => {
          if (owner === 'admin') {
            const admin = document.querySelector<HTMLElement>('[data-admin-scroll-owner]');
            if (admin) admin.scrollTop = admin.scrollHeight - admin.clientHeight;
          } else {
            window.scrollTo(0, Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight);
          }
        }, bottom.owner);
        const bottomPath = testInfo.outputPath(`${scenario.name}-${viewport.width}x${viewport.height}-bottom.png`);
        await page.screenshot({ path: bottomPath, fullPage: false, animations: 'disabled' });
        await testInfo.attach('visual-audit-bottom.png', { path: bottomPath, contentType: 'image/png' });
      }

      expect(diagnostics.horizontalOverflow, 'document must not overflow horizontally').toBeLessThanOrEqual(1);
      expect(diagnostics.outsideViewport, 'visible interactive controls must remain horizontally reachable').toEqual([]);
      if (diagnostics.adminDesktop && diagnostics.adminScrollContract) {
        expect(diagnostics.adminScrollContract.constrainedToViewport, 'desktop admin scroll owner must be constrained to the viewport').toBe(true);
        expect(diagnostics.adminScrollContract.canOverflowInternally, 'desktop admin scroll owner must provide vertical scrolling when content exceeds its height').toBe(true);
      }
      expect(bottom.reached, `${bottom.owner} content bottom must be reachable`).toBe(true);
    });
  }
}
