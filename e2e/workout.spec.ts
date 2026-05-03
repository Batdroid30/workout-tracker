import { test, expect } from '@playwright/test';

test.describe('Active Workout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.fill('input[name="email"]', 'global_test@lifts.app');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
  });

  test('should complete a full empty workout session', async ({ page }) => {
    // 1. Start Workout — navigate to /workout; shows "Start Empty Session" when no active workout
    await page.goto('/workout');

    // Click to start a blank session
    await page.click('button:has-text("Start Empty Session")');

    // Active workout UI: title input appears
    await expect(page.locator('input[placeholder="Session title"]')).toBeVisible({ timeout: 5000 });

    // 2. Add Exercise
    await page.click('button:has-text("Add Exercise")');

    // Wait for modal search input
    await expect(page.getByPlaceholder('Search exercises…')).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder('Search exercises…').fill('Squat');

    // Wait for exercise list to load from API, then click Squat (Barbell)
    const exerciseBtn = page.locator('button').filter({ hasText: 'Squat (Barbell)' }).first();
    await expect(exerciseBtn).toBeVisible({ timeout: 10000 });
    await exerciseBtn.click();

    // Confirm selection — "Add 1 Exercise →"
    await page.click('button:has-text("Add 1 Exercise")');

    // Verify exercise was added — h3 shows exercise name
    await expect(page.locator('h3:has-text("Squat (Barbell)")')).toBeVisible({ timeout: 5000 });

    // 3. Fill in the set — there's already one active set row with weight + reps inputs
    // We target inputs by placeholder="0" inside the active set row area
    const weightInput = page.locator('input[placeholder="0"]').first();
    const repsInput   = page.locator('input[placeholder="0"]').nth(1);

    // Fill weight and tab to trigger onBlur so the store updates
    await weightInput.click();
    await weightInput.fill('100');
    await weightInput.press('Tab');

    // Fill reps and tab to trigger onBlur
    await repsInput.click();
    await repsInput.fill('8');
    await repsInput.press('Tab');

    // Click the Done/Check button — it's a button with a Check icon (no aria-label)
    // The Check button is the last button in the first set row, has w-10 h-10 class
    const checkBtn = page.locator('button.w-10.h-10').first();
    await checkBtn.click();

    // After 180ms animation, the set row is replaced by CompletedSetRow
    // The completed row shows "100kg × 8" inside a <span>
    await expect(page.locator('span').filter({ hasText: '100kg × 8' }).first()).toBeVisible({ timeout: 3000 });

    // 4. Finish Workout — click the Finish button in the sticky header
    await page.click('button:has-text("Finish")');

    // Confirmation dialog appears: "Finish Workout"
    const dialogConfirm = page.locator('button:has-text("Finish Workout")');
    await expect(dialogConfirm).toBeVisible({ timeout: 5000 });
    await dialogConfirm.click();

    // 5. Post Workout Summary screen
    await expect(page.locator('text=Workout Complete')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Done")');

    // Back on dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
  });
});
