import { expect, test } from '@playwright/test';
import { checkMobile, snap } from './helpers';

test('plan an occasion, move gifts along, check people', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Thoughtful gifts');
  await expect(page.locator('.hero .gift-tag').first()).toBeVisible();
  await page.waitForTimeout(1000);
  await snap(page, 'landing');
  await checkMobile(page, 'landing-mobile');

  await page.getByRole('link', { name: 'See upcoming occasions' }).click();
  await snap(page, 'occasions');
  await checkMobile(page);
  await page.getByRole('link', { name: /Winter holidays/ }).click();
  page.once('dialog', (d) => d.accept('41.25'));
  await page.getByRole('button', { name: 'Move Pruning shears to Bought' }).click();
  await expect(page.getByText('“Pruning shears” → Bought.')).toBeVisible();
  await page.getByLabel('Gift', { exact: true }).fill('Climbing guidebook');
  await page.getByLabel('For', { exact: true }).selectOption({ label: 'Mia' });
  await page.getByLabel('Estimated price').fill('28');
  await page.getByLabel('Status', { exact: true }).selectOption('planned');
  await page.getByRole('button', { name: 'Add gift' }).click();
  await expect(page.getByText('Added “Climbing guidebook”.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Climbing guidebook')).toBeVisible();
  await snap(page, 'occasion');
  await checkMobile(page, 'occasion-mobile');

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'People' }).click();
  await page.getByRole('link', { name: /^D\s*Dad|Dad/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Given before' })).toBeVisible();
  await snap(page, 'person');
});
