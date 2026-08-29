import { expect, test } from '@playwright/test';

test('competition stays privacy-safe and usable across responsive product shells', async ({ page }) => {
  await page.goto('/competition.e2e.html');

  await expect(page.getByRole('heading', { name: 'Crew standings' })).toBeVisible();
  await expect(page.getByText(/Individual sets, workout notes, and full exercise details stay private/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Highlights, not surveillance' })).toBeHidden();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await expect(page.getByRole('button', { name: 'All time' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Global all-time' }).click();
  await expect(page.getByRole('heading', { name: 'Global all-time' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Top 10 across Top Set' })).toBeVisible();
  await expect(page.getByLabel('Your global rank')).toContainText('#27');
  await expect(page.getByRole('tab', { name: 'Activity' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Fire/i })).toHaveCount(0);
  await page.getByRole('button', { name: 'Crew weekly' }).click();

  await page.getByRole('tab', { name: 'Activity' }).click();
  await expect(page.getByRole('heading', { name: 'Highlights, not surveillance' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bench Press' })).toBeVisible();

  const fire = page.getByRole('button', { name: /Fire 2/i });
  await fire.click();
  await expect(page.getByRole('button', { name: /Fire 3/i })).toHaveAttribute('aria-pressed', 'true');
});

test('Groups separates chat, membership, invitations, and administration into focused views', async ({ page }) => {
  await page.goto('/groups.e2e.html');

  await expect(page.locator('[data-groups-surface="identity"]')).toBeVisible();
  await expect(page.locator('[data-groups-surface="context"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your crew' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Invite someone' })).toBeHidden();

  await page.getByRole('tab', { name: 'Chat' }).click();
  await expect(page.getByRole('heading', { name: 'Talk with Iron Crew' })).toBeVisible();
  await expect(page.getByText('Morning lift tomorrow?')).toBeVisible();
  await page.getByRole('textbox', { name: 'Message your group' }).fill('Count me in.');
  await page.getByRole('button', { name: 'Post message' }).click();
  await expect(page.getByText('Count me in.')).toBeVisible();
  await page.getByRole('button', { name: 'heart reaction, 0' }).first().click();
  await expect(page.getByRole('button', { name: 'heart reaction, 1' }).first()).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('tab', { name: /Invites/ }).click();
  await expect(page.getByRole('heading', { name: 'For you' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Invite someone' })).toBeVisible();

  await page.getByRole('tab', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Create another group' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your role' })).toBeVisible();
});

test('Groups and Compete stay contained at a 320px app viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });

  await page.goto('/groups.e2e.html');
  let overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.getByRole('tab', { name: 'Chat' }).click();
  await expect(page.locator('[data-groups-surface="chat"]')).toBeVisible();
  overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.getByRole('combobox', { name: 'Group' }).click();
  await expect(page.getByRole('option', { name: /Weekend Crew/ })).toBeVisible();
  await page.getByRole('option', { name: /Weekend Crew/ }).click();
  await expect(page.getByRole('heading', { name: 'Weekend Crew', exact: true })).toBeVisible();
  overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.goto('/competition.e2e.html');
  await expect(page.locator('[data-social-surface="standings"]')).toBeVisible();
  overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: 'Global all-time' }).click();
  await expect(page.locator('[data-global-all-time-surface="leaderboard"]')).toBeVisible();
  overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: 'Crew weekly' }).click();
  await page.getByRole('tab', { name: 'Activity' }).click();
  await expect(page.locator('[data-social-surface="activity"]')).toBeVisible();
  overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
