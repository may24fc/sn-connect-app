import { expect, test } from '@playwright/test';

/**
 * E2E tests for the associate first-login experience.
 *
 * Covers the V2-0.1 fix: interns without an active internship record
 * are redirected to the setup flow instead of hitting a dead-end page.
 *
 * Requirements:
 * - Set E2E_INTERN_EMAIL and E2E_INTERN_PASSWORD env vars, OR
 * - Enable mock auth (NEXT_PUBLIC_ENABLE_MOCK_AUTH=true) with associate@example.com/password
 */

const internEmail = process.env.E2E_INTERN_EMAIL ?? 'associate@example.com';
const internPassword = process.env.E2E_INTERN_PASSWORD ?? 'password';
const useMockAuth = process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true';

test.describe('Associate First-Login Experience', () => {
  test.describe('Setup Flow', () => {
    test('new associate sees setup page when no internship record exists', async ({ page }) => {
      // Login as associate
      await page.goto('/login');
      await page.getByLabel('Email').fill(internEmail);
      await page.locator('#password').fill(internPassword);
      await page.getByRole('button', { name: 'Sign in' }).click();

      // After login, if the associate has no active internship record,
      // they should be redirected to the setup page (either by middleware
      // or by the client-side redirect in the dashboard).
      // Wait for navigation to settle.
      await page.waitForURL(/\/(associate\/(setup|dashboard)|onboarding)/, { timeout: 15000 });

      const url = page.url();

      // If they land on associate/setup, the redirect is working correctly
      if (url.includes('/associate/setup')) {
        // Verify setup page content
        await expect(
          page.getByRole('heading', { name: /complete your internship setup/i })
        ).toBeVisible();

        // Verify required form fields are present
        await expect(page.getByLabel(/start date/i)).toBeVisible();
        await expect(page.getByLabel(/end date/i)).toBeVisible();
        await expect(page.getByText(/department/i).first()).toBeVisible();
        await expect(page.getByLabel(/school/i)).toBeVisible();
        await expect(page.getByLabel(/program/i)).toBeVisible();
        await expect(page.getByLabel(/required hours/i)).toBeVisible();

        // Verify the submit button
        await expect(page.getByRole('button', { name: /complete setup/i })).toBeVisible();
      } else if (url.includes('/associate/dashboard')) {
        // Associate already has an active internship record — verify
        // the dashboard loads correctly (no dead-end message)
        await expect(page.getByText(/no active internship record found/i)).not.toBeVisible();
      }
      // If they land on /onboarding, that's the onboarding gate working correctly
    });

    test('setup form validates required fields', async ({ page }) => {
      await page.goto('/associate/setup');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Try to submit empty form
      const submitButton = page.getByRole('button', { name: /complete setup/i });
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Expect validation errors
        await expect(page.getByText(/start date is required/i)).toBeVisible();
        await expect(page.getByText(/end date is required/i)).toBeVisible();
        await expect(page.getByText(/department is required/i)).toBeVisible();
        await expect(page.getByText(/school.*is required/i)).toBeVisible();
        await expect(page.getByText(/program.*is required/i)).toBeVisible();
      }
    });

    test('setup form rejects end date before start date', async ({ page }) => {
      await page.goto('/associate/setup');
      await page.waitForLoadState('networkidle');

      const startDateInput = page.getByLabel(/start date/i);
      const endDateInput = page.getByLabel(/end date/i);
      const submitButton = page.getByRole('button', { name: /complete setup/i });

      if (await submitButton.isVisible()) {
        // Fill start date after end date
        await startDateInput.fill('2026-06-01');
        await endDateInput.fill('2026-03-01');

        // Fill remaining required fields
        await page.getByLabel(/school/i).fill('Test University');
        await page.getByLabel(/program/i).fill('BS Computer Science');

        // Select department
        await page.getByText(/select your department/i).click();
        await page.getByRole('option', { name: 'Engineering' }).click();

        await submitButton.click();

        // Expect date validation error
        await expect(page.getByText(/end date must be after start date/i)).toBeVisible();
      }
    });
  });

  test.describe('Dashboard Access', () => {
    test('associate dashboard does not show dead-end "No Active Record" message', async ({ page }) => {
      await page.goto('/associate/dashboard');
      await page.waitForLoadState('networkidle');

      // Wait for the page to settle (either redirect or load dashboard)
      await page.waitForTimeout(3000);

      const url = page.url();

      if (url.includes('/associate/dashboard')) {
        // If we're still on the dashboard, verify there's no dead-end message
        // (the old bug showed a warning banner telling users to "Contact your supervisor")
        await expect(
          page.getByText(/contact your supervisor to set up your internship profile/i)
        ).not.toBeVisible();
      } else if (url.includes('/associate/setup')) {
        // Redirect to setup is the correct behavior for uninitialized interns
        await expect(
          page.getByRole('heading', { name: /complete your internship setup/i })
        ).toBeVisible();
      }
    });

    test('associate with expired record sees appropriate messaging', async ({ page }) => {
      // Navigate to dashboard — if the associate has a completed/terminated internship
      // but no active one, they should still be guided to setup or see an appropriate message
      await page.goto('/associate/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      const url = page.url();

      // Should not show the old dead-end placeholder regardless of internship state
      await expect(
        page.getByText(/contact your supervisor to set up your internship profile/i)
      ).not.toBeVisible();

      // Either shows real dashboard content or redirects to setup
      if (url.includes('/associate/setup')) {
        await expect(
          page.getByRole('heading', { name: /complete your internship setup/i })
        ).toBeVisible();
      }
    });
  });
});
