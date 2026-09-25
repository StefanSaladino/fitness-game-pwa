/**
 * Maintainer note: this spec exercises the Program fixture across configured
 * browser projects. Top Set SelectField is a custom combobox: click the trigger
 * and role=option rather than using Playwright selectOption().
 */

import { expect, test } from '@playwright/test';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test('program creation, activation, guided volume override, and restore stay coherent', async ({ page }) => {
  await page.goto('/training-program.e2e.html');

  await expect(page.getByRole('heading', { name: 'Build your training block' })).toBeVisible();
  await expect(
    page.getByLabel('Program configuration').getByText('Commercial gym')
  ).toBeVisible();

  await page.getByRole('button', { name: 'Generate preview' }).click();
  await expect(page.getByRole('heading', { name: 'Generated preview' })).toBeVisible();
  await expect(
    page.getByLabel('Generated preview').getByText('4 weeks')
  ).toBeVisible();
  await expect(page.getByText('Bench Press').first()).toBeVisible();

  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Program saved as a draft.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activate program' })).toBeVisible();

  await page.getByRole('button', { name: 'Activate program' }).click();
  await expect(page.getByText('Program is active.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start planned workout' }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Increase Full Body total working sets' }).first().click();
  await expect(page.getByRole('alertdialog', { name: 'Volume warning' })).toBeVisible();
  await expect(page.getByText('Higher than the current recommendation')).toBeVisible();
  await page.getByRole('button', { name: 'Continue with 4 sets' }).click();

  await expect(page.getByText('Full Body now has 4 planned working sets.')).toBeVisible();
  await expect(page.getByText(/Custom · current recommendation 3/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restore recommended' }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Restore recommended' }).first().click();
  await expect(page.getByText('Full Body restored to 3 recommended working sets.')).toBeVisible();
  await expect(page.getByText('Top Set recommendation').first()).toBeVisible();
});

test('program surface remains contained and exposes the program actions on a 320px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/training-program.e2e.html');

  await expect(page.locator('[data-training-program-page]')).toBeVisible();
  await page.getByRole('button', { name: 'Generate preview' }).click();
  await expect(page.getByRole('heading', { name: 'Generated preview' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByRole('button', { name: 'Activate program' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Swap' }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
test('injuries and limitations are first-class program inputs', async ({ page }) => {
  await page.goto('/training-program.e2e.html');

  await expect(
    page.getByRole('heading', { name: 'What Top Set will use' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Injuries & limitations' }),
  ).toBeVisible();

  const limitations = page.locator(
    'section[aria-labelledby="program-limitations-heading"]',
  );

  await limitations
    .getByRole('searchbox', { name: 'Find an exercise you need to avoid' })
    .fill('Bench Press');

  await limitations
    .getByRole('button', { name: 'Avoid for injury / limitation' })
    .click();

  await expect(
    limitations.getByText('Avoid because of injury / physical limitation'),
  ).toBeVisible();

  await expect(page.getByText('1 exercise avoided')).toBeVisible();
});

test('guided limitation review suggests exercises and saves confirmed exclusions', async ({ page }) => {
  await page.goto('/training-program.e2e.html');

  await page
    .getByRole('combobox', { name: 'Injury / limitation area' })
    .click();
  await page
    .getByRole('option', { name: 'Shoulder', exact: true })
    .click();

  await expect(
    page.getByText('Suggested exercises to review'),
  ).toBeVisible();
  await expect(page.getByText('Bench Press').first()).toBeVisible();

  await page.getByRole('checkbox', { name: /Bench Press/i }).check();
  await page.getByRole('button', { name: 'Apply 1 selected exclusions' }).click();

  await expect(page.getByText('1 exercise avoided')).toBeVisible();
  await expect(
    page.getByText('Avoid because of injury / physical limitation'),
  ).toBeVisible();
});

test('saved draft weeks are collapsible and preserve a compact program view', async ({ page }) => {
  await page.goto('/training-program.e2e.html');
  await page.getByRole('button', { name: 'Generate preview' }).click();
  await page.getByRole('button', { name: 'Save draft' }).click();

  const weekOne = page.locator('details').filter({ hasText: 'Week 1' }).first();
  const weekTwo = page.locator('details').filter({ hasText: 'Week 2' }).first();
  await expect(weekOne).toHaveAttribute('open', '');
  await expect(weekTwo).not.toHaveAttribute('open', '');

  await weekTwo.locator('summary').click();
  await expect(weekTwo).toHaveAttribute('open', '');
  await weekTwo.locator('summary').click();
  await expect(weekTwo).not.toHaveAttribute('open', '');
});

test('program configuration blocks past start dates and labels split days with separators', async ({ page }) => {
  await page.goto('/training-program.e2e.html');

  const startDate = page.getByLabel('Start date');
  const minimum = await startDate.getAttribute('min');
  expect(minimum).toBeTruthy();

  await startDate.fill('2000-01-01');
  await expect(page.getByText('Start date cannot be in the past.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate preview' })).toBeDisabled();

  await startDate.fill(minimum!);
  await page
    .getByRole('combobox', { name: 'Sessions per week' })
    .click();
  await page
    .getByRole('option', { name: '3', exact: true })
    .click();

  const split = page.getByRole('combobox', { name: 'Split' });
  await split.click();

  await expect(
    page.getByRole('option', { name: 'Push / Pull / Legs', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('option', { name: 'Upper / Lower / Full Body', exact: true }),
  ).toBeVisible();
});


test('saved programs dropdown uses the app select and remains usable', async ({ page }) => {
  await page.goto('/training-program.e2e.html');

  await page
    .getByRole('button', { name: 'Generate preview' })
    .click();
  await page
    .getByRole('button', { name: 'Save draft' })
    .click();

  const savedPrograms = page.getByRole('combobox', {
    name: 'Saved programs',
  });

  await expect(savedPrograms).toBeVisible();
  await savedPrograms.click();

  await expect(
    page.getByRole('option', { name: 'New program', exact: true }),
  ).toBeVisible();

  await expect(
    page.getByRole('option', {
      name: /Draft · 4 weeks ·/,
    }),
  ).toBeVisible();
});
