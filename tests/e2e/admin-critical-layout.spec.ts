import { expect, test, type Page } from '@playwright/test';

const viewports = [
  { name: 'phone-320', width: 320, height: 568 },
  { name: 'phone-360', width: 360, height: 640 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'phone-430', width: 430, height: 932 },
  { name: 'landscape-667', width: 667, height: 375 },
  { name: 'landscape-844', width: 844, height: 390 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'tablet-820', width: 820, height: 1180 },
  { name: 'shell-939', width: 939, height: 720 },
  { name: 'shell-940', width: 940, height: 720 },
  { name: 'shell-941', width: 941, height: 720 },
  { name: 'desktop-1024', width: 1024, height: 768 },
  { name: 'desktop-short-1024', width: 1024, height: 600 },
  { name: 'split-1255', width: 1255, height: 720 },
  { name: 'split-1256', width: 1256, height: 720 },
  { name: 'split-1257', width: 1257, height: 720 },
  { name: 'desktop-1280', width: 1280, height: 720 },
  { name: 'desktop-short-1280', width: 1280, height: 600 },
  { name: 'desktop-1366', width: 1366, height: 768 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-short-1440', width: 1440, height: 650 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
] as const;

async function assertReadable(page: Page, selector: string) {
  const result = await page.locator(selector).evaluateAll((nodes) => {
    const isVisuallyHidden = (node: Element, style: CSSStyleDeclaration, rect: DOMRect) => {
      const tiny = rect.width <= 2 && rect.height <= 2;
      const clippedForA11y = style.clipPath !== 'none'
        || (style.clip !== 'auto' && style.clip !== '')
        || style.overflow === 'hidden';
      return tiny && clippedForA11y;
    };

    const visible = (node: Element) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity) !== 0
        && rect.width > 0
        && rect.height > 0
        && !isVisuallyHidden(node, style, rect);
    };

    return nodes.filter(visible).flatMap((node) => {
      const element = node as HTMLElement;
      const text = (element.textContent ?? '').trim();
      if (!text) return [];

      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const clipsX = style.overflowX === 'hidden' || style.overflowX === 'clip';
      const clipsY = style.overflowY === 'hidden' || style.overflowY === 'clip';

      // scrollWidth/scrollHeight are integer-rounded while CSS line boxes can be fractional.
      // Only call content "clipped" when the element actually clips overflow and the
      // excess is larger than the browser's normal rounding noise.
      const clippedX = clipsX && element.scrollWidth > element.clientWidth + 2;
      const clippedY = clipsY && element.scrollHeight > element.clientHeight + 2;
      const outside = rect.left < -1 || rect.right > window.innerWidth + 1;

      return clippedX || clippedY || outside
        ? [{
            text: text.slice(0, 120),
            clippedX,
            clippedY,
            overflowX: style.overflowX,
            overflowY: style.overflowY,
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            clientHeight: element.clientHeight,
            scrollHeight: element.scrollHeight,
            left: rect.left,
            right: rect.right,
          }]
        : [];
    });
  });

  expect(result).toEqual([]);
}

async function assertDirectChildrenDoNotOverlap(page: Page, selector: string) {
  const overlaps = await page.locator(selector).evaluateAll((containers) => {
    const visible = (node: Element) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const visuallyHidden = rect.width <= 2
        && rect.height <= 2
        && (style.clipPath !== 'none' || (style.clip !== 'auto' && style.clip !== ''));
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity) !== 0
        && rect.width > 0
        && rect.height > 0
        && !visuallyHidden;
    };

    return containers.flatMap((container, containerIndex) => {
      const children = [...container.children].filter(visible);
      const collisions: Array<Record<string, unknown>> = [];

      for (let leftIndex = 0; leftIndex < children.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < children.length; rightIndex += 1) {
          const left = children[leftIndex];
          const right = children[rightIndex];
          const a = left.getBoundingClientRect();
          const b = right.getBoundingClientRect();
          const overlapWidth = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const overlapHeight = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);

          if (overlapWidth > 1 && overlapHeight > 1) {
            collisions.push({
              containerIndex,
              left: (left.textContent ?? '').trim().slice(0, 80),
              right: (right.textContent ?? '').trim().slice(0, 80),
              overlapWidth,
              overlapHeight,
            });
          }
        }
      }

      return collisions;
    });
  });

  expect(overlaps).toEqual([]);
}

async function assertNoDocumentHorizontalOverflow(page: Page) {
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
}

for (const viewport of viewports) {
  test(`users critical layout @ ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/user-administration.e2e.html');
    await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible();

    const directoryRow = page.getByRole('button', {
      name: /Alpha User With A Deliberately Long Display Name/,
    });
    await expect(directoryRow).toBeVisible();

    await assertReadable(
      page,
      '[data-admin-page="users"] button, [data-admin-page="users"] strong, [data-admin-page="users"] span',
    );
    await assertDirectChildrenDoNotOverlap(
      page,
      '[data-admin-surface="directory"] li > button',
    );
    await assertNoDocumentHorizontalOverflow(page);

    await directoryRow.click();
    await expect(page.getByText('11111111-1111-4111-8111-111111111111')).toBeVisible();
    await expect(
      page.getByText(/Policy review with a deliberately long explanation/),
    ).toBeVisible();

    await assertReadable(
      page,
      '[data-admin-surface="detail"] h2, [data-admin-surface="detail"] p, [data-admin-surface="detail"] dt, [data-admin-surface="detail"] dd, [data-admin-surface="detail"] button',
    );
    await assertDirectChildrenDoNotOverlap(
      page,
      '[data-admin-surface="detail"] dl > div',
    );
    await assertNoDocumentHorizontalOverflow(page);

    if (viewport.width >= 940) {
      const owner = page.locator('[data-admin-scroll-owner]');
      await expect(owner).toBeVisible();
      const geometry = await owner.evaluate((node) => ({
        clientHeight: (node as HTMLElement).clientHeight,
        overflowY: getComputedStyle(node).overflowY,
      }));
      expect(geometry.overflowY).toMatch(/auto|scroll/);
      expect(geometry.clientHeight).toBeLessThanOrEqual(viewport.height + 2);
    }
  });

  test(`capacity critical layout @ ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/app-composition.e2e.html?surface=admin');
    await expect(
      page.getByRole('heading', { name: 'Capacity overview', level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Measured capacity' }),
    ).toBeVisible();

    await assertReadable(
      page,
      '[data-admin-page="capacity"] h1, [data-admin-page="capacity"] h2, [data-admin-page="capacity"] h3, [data-admin-page="capacity"] p, [data-admin-page="capacity"] span, [data-admin-page="capacity"] strong, [data-admin-page="capacity"] button',
    );
    await assertDirectChildrenDoNotOverlap(page, '[data-capacity-metric]');
    await assertNoDocumentHorizontalOverflow(page);

    const metrics = page.locator('[data-capacity-metric]');
    expect(await metrics.count()).toBe(3);

    if (viewport.width >= 940) {
      const owner = page.locator('[data-admin-scroll-owner]');
      await expect(owner).toBeVisible();
      const geometry = await owner.evaluate((node) => ({
        clientHeight: (node as HTMLElement).clientHeight,
        overflowY: getComputedStyle(node).overflowY,
      }));
      expect(geometry.overflowY).toMatch(/auto|scroll/);
      expect(geometry.clientHeight).toBeLessThanOrEqual(viewport.height + 2);
    }
  });
}
