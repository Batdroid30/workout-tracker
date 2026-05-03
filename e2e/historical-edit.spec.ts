import { test, expect, Page } from '@playwright/test';

// Regression coverage for the server actions that mutate historical workout
// data (updateHistoricalSetAction, deleteHistoricalExerciseAction).
//
// These actions now perform an explicit ownership lookup before mutating —
// these tests verify the owner-path still works end-to-end. A cross-user
// negative test (User B tries to edit User A's set) requires a second seeded
// account and is intentionally not covered here; if/when a second fixture
// user exists, add it as a separate test that asserts the action throws.

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'global_test@lifts.app');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
}

async function seedSingleSetWorkout(page: Page, weight: string, reps: string) {
  await page.goto('/workout');
  await page.click('button:has-text("Start Empty Session")');
  await expect(page.locator('input[placeholder="Session title"]')).toBeVisible({ timeout: 5000 });

  await page.click('button:has-text("Add Exercise")');
  await expect(page.getByPlaceholder('Search exercises…')).toBeVisible({ timeout: 5000 });
  await page.getByPlaceholder('Search exercises…').fill('Squat');
  const exerciseBtn = page.locator('button').filter({ hasText: 'Squat (Barbell)' }).first();
  await expect(exerciseBtn).toBeVisible({ timeout: 10000 });
  await exerciseBtn.click();
  await page.click('button:has-text("Add 1 Exercise")');
  await expect(page.locator('h3:has-text("Squat (Barbell)")')).toBeVisible({ timeout: 5000 });

  const weightInput = page.locator('input[placeholder="0"]').first();
  const repsInput   = page.locator('input[placeholder="0"]').nth(1);
  await weightInput.click();
  await weightInput.fill(weight);
  await weightInput.press('Tab');
  await repsInput.click();
  await repsInput.fill(reps);
  await repsInput.press('Tab');

  await page.locator('button.w-10.h-10').first().click();
  await expect(
    page.locator('span').filter({ hasText: `${weight}kg × ${reps}` }).first()
  ).toBeVisible({ timeout: 3000 });

  await page.click('button:has-text("Finish")');
  const dialogConfirm = page.locator('button:has-text("Finish Workout")');
  await expect(dialogConfirm).toBeVisible({ timeout: 5000 });
  await dialogConfirm.click();

  await expect(page.locator('text=Workout Complete')).toBeVisible({ timeout: 10000 });
  await page.click('button:has-text("Done")');
  await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
}

async function openMostRecentWorkout(page: Page) {
  await page.goto('/dashboard');
  const workoutLink = page.locator('a[href*="/workout/"]').first();
  await expect(workoutLink).toBeVisible({ timeout: 10000 });
  await workoutLink.click();
  await expect(page).toHaveURL(/\/workout\/[a-f0-9-]+/, { timeout: 10000 });
}

test.describe('Historical workout mutations (ownership-checked actions)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('owner can edit a set on their past workout', async ({ page }) => {
    await seedSingleSetWorkout(page, '80', '5');
    await openMostRecentWorkout(page);

    // Click the displayed set — EditSetModal opens via wrapper div onClick
    await page.locator('span').filter({ hasText: '80kg × 5' }).first().click();
    await expect(page.locator('h3:has-text("Edit Set")')).toBeVisible({ timeout: 5000 });

    // Update weight to 85 and save
    const weightInput = page.locator('input[type="number"]').first();
    await weightInput.click();
    await weightInput.fill('85');
    await page.click('button:has-text("Save")');

    // Modal closes; row reflects new value after router.refresh
    await expect(page.locator('h3:has-text("Edit Set")')).not.toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('span').filter({ hasText: '85kg × 5' }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('owner can delete an exercise from their past workout', async ({ page }) => {
    await seedSingleSetWorkout(page, '70', '6');
    await openMostRecentWorkout(page);

    await expect(page.locator('h3:has-text("Squat (Barbell)")')).toBeVisible();

    // Trash icon button next to the exercise — first icon-only button with red hover
    // We rely on the button being inside the same card as the exercise heading.
    const deleteBtn = page.locator('button[class*="hover:text-red-400"]').first();
    await deleteBtn.click();

    // Confirmation dialog — confirmText is "Delete"
    const confirmBtn = page.locator('button:has-text("Delete")').last();
    await confirmBtn.click();

    // Exercise heading should disappear after refresh
    await expect(page.locator('h3:has-text("Squat (Barbell)")')).not.toBeVisible({ timeout: 10000 });
  });
});
