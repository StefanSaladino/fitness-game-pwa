import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('phone recovery keeps offline set drafts editable while server actions stay gated', async ({ page }) => {
  await page.goto('/reliability.e2e.html?state=offline');

  await expect(page.getByText('Offline workout copy')).toBeVisible();
  await expect(page.getByText('1 workout change queued')).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Set 1 weight in kg' })).toHaveValue('107.5');
  await expect(page.getByRole('spinbutton', { name: 'Set 1 weight in kg' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '+ Working set' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Finish workout' })).toBeDisabled();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('phone conflict locks edits until the user explicitly chooses the server version', async ({ page }) => {
  await page.goto('/reliability.e2e.html?state=conflict');

  await expect(page.getByText('Workout changed elsewhere')).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Set 1 weight in kg' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Use server version' })).toBeVisible();

  await page.getByRole('button', { name: 'Use server version' }).click();

  await expect(page.getByText('Workout changed elsewhere')).not.toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Set 1 weight in kg' })).toBeEnabled();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('320px workout rows and recovery actions remain contained', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/reliability.e2e.html?state=offline');

  await expect(page.getByRole('heading', { name: 'Workout in progress' })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Set 1 weight in kg' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark set 1 complete' })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});


test('390px synced workout keeps first set controls inside the usable viewport', async ({ page }) => {
  await page.goto('/reliability.e2e.html');

  await expect(page.getByRole('heading', { name: 'Workout in progress' })).toBeVisible();

  const analytics = page.getByRole('checkbox', { name: /Track in analytics/ });
  const weight = page.getByRole('spinbutton', { name: 'Set 1 weight in kg' });
  const finish = page.getByRole('button', { name: 'Finish workout' });
  const sessionMeta = page.getByLabel('Workout session state');

  await expect(analytics).toBeVisible();
  await expect(weight).toBeVisible();
  await expect(finish).toBeVisible();

  const [analyticsBox, weightBox, finishBox, sessionMetaBox] = await Promise.all([
    analytics.boundingBox(),
    weight.boundingBox(),
    finish.boundingBox(),
    sessionMeta.boundingBox(),
  ]);

  expect(analyticsBox).not.toBeNull();
  expect(weightBox).not.toBeNull();
  expect(finishBox).not.toBeNull();
  expect(sessionMetaBox).not.toBeNull();

  const usableBottom = finishBox!.y - 4;

  // These controls must already be usable without an initial scroll.
  expect(analyticsBox!.y).toBeGreaterThanOrEqual(0);
  expect(analyticsBox!.y + analyticsBox!.height).toBeLessThan(usableBottom);
  expect(weightBox!.y).toBeGreaterThanOrEqual(0);
  expect(weightBox!.y + weightBox!.height).toBeLessThan(usableBottom);

  // 18.8A deliberately compresses the two-column session metadata strip.
  expect(sessionMetaBox!.height).toBeLessThanOrEqual(46);

  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});


test('390px advanced Superset keeps staged set entry dense and contained', async ({ page }) => {
  await page.goto('/reliability.e2e.html?state=advanced-superset');

  const group = page.getByLabel('Superset A group');
  const stageWeight = page.getByRole('spinbutton', {
    name: 'Set 1 stage 1 weight in kg',
  });
  const stageReps = page.getByRole('spinbutton', {
    name: 'Set 1 stage 1 reps',
  });
  const removeStage = page.getByRole('button', {
    name: 'Remove set 1 stage 1',
  });
  const addStage = page.getByRole('button', { name: '+ Stage' });
  const copySet = page.getByRole('button', { name: 'Copy set 1' });
  const deleteSet = page.getByRole('button', { name: 'Delete set 1' });

  await expect(group).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: 'Incline Dumbbell Bench Press With Controlled Tempo Superset A1',
    }),
  ).toBeVisible();
  await expect(stageWeight).toBeVisible();
  await expect(stageReps).toBeVisible();
  await expect(removeStage).toBeVisible();
  await expect(addStage).toBeVisible();
  await expect(copySet).toBeVisible();
  await expect(deleteSet).toBeVisible();

  const [
    groupBox,
    weightBox,
    repsBox,
    removeBox,
    addBox,
    copyBox,
    deleteBox,
  ] = await Promise.all([
    group.boundingBox(),
    stageWeight.boundingBox(),
    stageReps.boundingBox(),
    removeStage.boundingBox(),
    addStage.boundingBox(),
    copySet.boundingBox(),
    deleteSet.boundingBox(),
  ]);

  expect(groupBox).not.toBeNull();
  expect(weightBox).not.toBeNull();
  expect(repsBox).not.toBeNull();
  expect(removeBox).not.toBeNull();
  expect(addBox).not.toBeNull();
  expect(copyBox).not.toBeNull();
  expect(deleteBox).not.toBeNull();

  // Weight and reps stay on the same compact stage row.
  expect(Math.abs(weightBox!.y - repsBox!.y)).toBeLessThanOrEqual(2);

  // Remove remains a real mobile touch target without consuming a full row.
  expect(removeBox!.width).toBeGreaterThanOrEqual(44);
  expect(removeBox!.height).toBeGreaterThanOrEqual(44);
  expect(removeBox!.width).toBeLessThanOrEqual(46);
  expect(removeBox!.height).toBeLessThanOrEqual(46);

  // The three advanced-set actions stay on one row.
  expect(Math.abs(addBox!.y - copyBox!.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(copyBox!.y - deleteBox!.y)).toBeLessThanOrEqual(2);

  // The first stage should no longer sprawl across three mobile rows.
  const stageRow = stageWeight.locator('xpath=ancestor::li[1]');
  const stageRowBox = await stageRow.boundingBox();
  expect(stageRowBox).not.toBeNull();
  expect(stageRowBox!.height).toBeLessThanOrEqual(130);

  // Superset chrome remains contained at phone width.
  expect(groupBox!.x).toBeGreaterThanOrEqual(0);
  expect(groupBox!.x + groupBox!.width).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});


test('320px short picker viewport contains long names and keeps document fixed', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 560 });
  await page.goto('/reliability.e2e.html');

  await page.getByRole('button', { name: 'Add exercise' }).click();

  const dialog = page.getByRole('dialog');
  const close = page.getByRole('button', { name: 'Close exercise picker' });
  const recent = page.getByRole('button', { name: 'Show 1' });

  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName('Add exercise');
  await expect(close).toBeVisible();
  await expect(recent).toBeVisible();
  await expect(recent).toHaveAttribute('aria-expanded', 'false');

  // The picker owns scrolling; the underlying workout/document must stay fixed.
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(
    await page.evaluate(() => document.documentElement.style.overflow),
  ).toBe('hidden');

  await page.getByRole('button', { name: 'Search all exercises' }).click();

  await expect(dialog).toHaveAccessibleName('All exercises');

  const search = page.getByLabel('Search all exercises');
  await expect(search).toBeVisible();
  await expect(search).toBeFocused();

  await search.fill('controlled');

  const longAdd = page.getByRole('button', {
    name: 'Add Single Arm Incline Cable Chest Press With Controlled Eccentric Tempo',
  });

  await expect(longAdd).toBeVisible();

  const longRow = longAdd.locator('xpath=ancestor::li[1]');

  const [dialogBox, closeBox, searchBox, rowBox, addBox] =
    await Promise.all([
      dialog.boundingBox(),
      close.boundingBox(),
      search.boundingBox(),
      longRow.boundingBox(),
      longAdd.boundingBox(),
    ]);

  expect(dialogBox).not.toBeNull();
  expect(closeBox).not.toBeNull();
  expect(searchBox).not.toBeNull();
  expect(rowBox).not.toBeNull();
  expect(addBox).not.toBeNull();

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  // Full-screen picker remains contained in the short viewport.
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport!.width);
  expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.height).toBeLessThanOrEqual(viewport!.height);

  // Sticky close/search chrome stays usable in a keyboard-like short viewport.
  expect(closeBox!.y).toBeGreaterThanOrEqual(0);
  expect(closeBox!.y + closeBox!.height).toBeLessThanOrEqual(viewport!.height);
  expect(searchBox!.y).toBeGreaterThanOrEqual(0);
  expect(searchBox!.y + searchBox!.height).toBeLessThanOrEqual(viewport!.height);

  // Long result text must not push the Add action outside the phone width.
  expect(rowBox!.x).toBeGreaterThanOrEqual(0);
  expect(rowBox!.x + rowBox!.width).toBeLessThanOrEqual(viewport!.width);
  expect(addBox!.width).toBeGreaterThanOrEqual(44);
  expect(addBox!.height).toBeGreaterThanOrEqual(44);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
