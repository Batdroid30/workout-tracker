import { test, expect } from '@playwright/test';

test.describe('Routines Management', () => {
  test.beforeEach(async ({ page }) => {
    // Log in before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'global_test@lifts.app');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
    await page.goto('/routines');
  });

  test('should create, edit, and delete a routine', async ({ page }) => {
    // 1. Create Routine — navigate directly to create page
    await page.goto('/routines/create');

    // The h1 in the sticky nav is "Build Routine"
    await expect(page.locator('h1:has-text("Build Routine")')).toBeVisible({ timeout: 5000 });

    // Clear the default title and fill with our test title
    const titleInput = page.getByPlaceholder('e.g. Push Day, Upper Body');
    await titleInput.clear();
    await titleInput.fill('E2E Test Routine');

    // Open Add Exercise Modal
    await page.click('button:has-text("Add Exercise")');
    await expect(page.getByPlaceholder('Search exercises…')).toBeVisible({ timeout: 5000 });

    // Search and select an exercise — wait for the list to load
    await page.getByPlaceholder('Search exercises…').fill('Bench Press');
    const exerciseBtn = page.locator('button').filter({ hasText: 'Bench Press (Barbell)' }).first();
    await expect(exerciseBtn).toBeVisible({ timeout: 10000 });
    await exerciseBtn.click();

    // Confirm — button text includes the count, e.g. "Add 1 Exercise →"
    await page.click('button:has-text("Add 1 Exercise")');

    // Ensure exercise was added to builder (h4 in the card)
    await expect(page.locator('h4').filter({ hasText: /Bench Press/i }).first()).toBeVisible({ timeout: 5000 });

    // Save Routine — Save button in the sticky nav header
    await page.click('button:has-text("Save")');
    await expect(page).toHaveURL('/routines', { timeout: 10000 });

    // Verify the routine card appears — use first() to handle any duplicates from prior runs
    const routineCard = page.locator('h3:has-text("E2E Test Routine")').first();
    await expect(routineCard).toBeVisible({ timeout: 5000 });

    // 2. Edit Routine — open the ⋮ overflow menu on the routine card
    // The RoutineCard has no <a> tag — it uses a MoreVertical menu button
    const cardContainer = page.locator('div.glass').filter({ hasText: 'E2E Test Routine' }).first();
    const menuBtn = cardContainer.locator('button[aria-label="Routine options"]');
    await menuBtn.click();

    // Click "Edit" from the dropdown
    await page.locator('button:has-text("Edit")').first().click();

    // Should now be on the edit page
    await expect(page.locator('h1:has-text("Edit Routine")')).toBeVisible({ timeout: 8000 });

    // Change the title
    const editTitleInput = page.getByPlaceholder('e.g. Push Day, Upper Body');
    await editTitleInput.clear();
    await editTitleInput.fill('E2E Test Routine Edited');
    await page.click('button:has-text("Save")');

    await expect(page).toHaveURL('/routines', { timeout: 10000 });
    await expect(page.locator('h3:has-text("E2E Test Routine Edited")').first()).toBeVisible({ timeout: 5000 });

    // 3. Delete Routine — open overflow menu on the edited card
    const editedCard = page.locator('div.glass').filter({ hasText: 'E2E Test Routine Edited' }).first();
    const editedMenuBtn = editedCard.locator('button[aria-label="Routine options"]');
    await editedMenuBtn.click();

    // Click "Delete" in the dropdown
    await page.locator('button:has-text("Delete")').first().click();

    // Confirm the dialog — the dialog uses confirmText: 'Delete'
    await page.locator('button:has-text("Delete")').last().click();

    await expect(page).toHaveURL('/routines', { timeout: 10000 });
    await expect(page.locator('h3:has-text("E2E Test Routine Edited")')).not.toBeVisible();
  });
});
