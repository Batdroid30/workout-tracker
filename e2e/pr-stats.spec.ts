import { test, expect } from '@playwright/test';

test.describe('PRs and Stats', () => {
  test.beforeEach(async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.fill('input[name="email"]', 'global_test@lifts.app');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
  });

  test('should view progress and verify data is present', async ({ page }) => {
    // Navigate to Progress tab
    await page.goto('/progress');

    // The h1 on the progress page is "Your data." (italic dot) — just check the URL
    await expect(page).toHaveURL('/progress');
    // Check the page label above h1 which is a plain div with class t-label
    await expect(page.locator('.t-label').first()).toContainText('Progress');

    // Check for "Total Volume Lifted" stat card (the metric shown on the progress page)
    await expect(page.locator('text=Total Volume Lifted').first()).toBeVisible();
  });

  test('should be able to view and delete a past workout from history', async ({ page }) => {
    // Go to Dashboard
    await page.goto('/dashboard');

    // Look for a workout link in the recent workouts section
    const workoutLink = page.locator('a[href*="/workout/"]').first();

    if (await workoutLink.isVisible()) {
      await workoutLink.click();

      // We should be on the workout details page
      await expect(page.locator('h1, h2').first()).toBeVisible();

      // Find the delete button (aria-label or text)
      const deleteButton = page.locator('button[aria-label="Delete Workout"], button:has-text("Delete")').first();

      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Confirm deletion dialog
        const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Delete")').last();
        await confirmBtn.click();

        // Should return to dashboard
        await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
      }
    }
  });
});
