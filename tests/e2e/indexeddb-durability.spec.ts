import { expect, test } from '@playwright/test';

test.describe('IndexedDB workout durability', () => {
  test('migrates current-epoch fallback data into IndexedDB and survives reload', async ({ page }) => {
    await page.goto('/indexeddb.e2e.html');
    await expect(page.getByText('Recovery: empty')).toBeVisible();
    await expect(page.getByText('Queue: empty')).toBeVisible();

    await page.getByRole('button', { name: 'Seed current fallback state' }).click();
    await expect(page.getByText('Recovery: indexeddb-workout-1')).toBeVisible();
    await expect(page.getByText('Queue: ADD_SET')).toBeVisible();
    await expect(page.getByText('Current fallback keys: cleared')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Recovery: indexeddb-workout-1')).toBeVisible();
    await expect(page.getByText('Queue: ADD_SET')).toBeVisible();

    await page.getByRole('button', { name: 'Clear durable state' }).click();
    await expect(page.getByText('Recovery: empty')).toBeVisible();
    await expect(page.getByText('Queue: empty')).toBeVisible();
  });

  test('retires pre-release v1 localStorage state instead of replaying it', async ({ page }) => {
    await page.goto('/indexeddb.e2e.html');
    await page.getByRole('button', { name: 'Seed stale v1 state' }).click();

    await expect(page.getByText('Recovery: empty')).toBeVisible();
    await expect(page.getByText('Queue: empty')).toBeVisible();
    await expect(page.getByText('Stale v1 keys: cleared')).toBeVisible();
  });

  test('uses a new IndexedDB database name so v1 durable data cannot be recovered', async ({ page }) => {
    await page.goto('/indexeddb.e2e.html');
    await page.evaluate(async () => {
      const request = indexedDB.open('fitness-game-workout', 1);
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('durable-state')) request.result.createObjectStore('durable-state');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('durable-state', 'readwrite');
        transaction.objectStore('durable-state').put('{"stale":true}', 'active-workout:v1:indexeddb-e2e-user');
        transaction.objectStore('durable-state').put('[{"stale":true}]', 'workout-mutations:v1:indexeddb-e2e-user');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      db.close();
    });

    await page.reload();
    await expect(page.getByText('Recovery: empty')).toBeVisible();
    await expect(page.getByText('Queue: empty')).toBeVisible();
  });
});
