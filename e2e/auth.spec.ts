import { test, expect } from '@playwright/test';

// Use a timestamped email for signup so it always succeeds
const timestamp = Date.now();
const testEmail = `test_${timestamp}@lifts.app`;
const testPassword = 'password123';

test.describe('Authentication Flow', () => {
  test('should allow a new user to sign up', async ({ page }) => {
    await page.goto('/signup');

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);

    await page.click('button[type="submit"]');

    // After signup, should redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
  });

  test('should allow an existing user to log in', async ({ page }) => {
    // Uses the global test user — create in Supabase if not present:
    // Email: global_test@lifts.app  Password: password123
    await page.goto('/login');

    await page.fill('input[name="email"]', 'global_test@lifts.app');
    await page.fill('input[name="password"]', 'password123');

    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
  });

  test('should allow a user to sign out', async ({ page }) => {
    // Log in first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'global_test@lifts.app');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });

    // Navigate directly to the Account tab — the tab button calls router.push
    // so going to the URL directly is more reliable in tests
    await page.goto('/profile?tab=account');

    // Wait for the Log Out button to be visible (it's inside the Account tab content)
    const logoutBtn = page.locator('button:has-text("Log Out")');
    await expect(logoutBtn).toBeVisible({ timeout: 10000 });
    await logoutBtn.click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
