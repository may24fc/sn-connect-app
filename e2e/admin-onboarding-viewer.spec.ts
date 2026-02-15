import { expect, test } from '@playwright/test';

test.describe('Admin Onboarding Data Viewer', () => {
  test('admin can view onboarding list', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('/admin/onboarding');
    await expect(page.getByRole('heading', { name: /Onboarding Data/i })).toBeVisible();
  });

  test('filters are visible and usable', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('/admin/onboarding');
    await page.fill('input[placeholder="Search by name or email"]', 'john');
    await expect(page.locator('input[placeholder="Search by name or email"]')).toHaveValue('john');
  });

  test('detail page renders tabs', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('/admin/onboarding/profile-id');
    await expect(page.getByRole('tab', { name: /Personal Info/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Payment Info/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Documents/i })).toBeVisible();
  });

  test('document preview loads via signed URL', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.route('**/api/onboarding/profiles/profile-id', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'profile-id',
            full_name: 'Jane Doe',
            status: 'in_progress',
            email_address: 'jane@example.com',
            first_name: 'Jane',
            middle_name: null,
            last_name: 'Doe',
            position: 'Engineer',
            nationality: 'PH',
            contact_number: '123',
            education: 'BS',
            birthday: null,
            age: null,
            address: 'Address',
            emergency_contact_name: null,
            emergency_contact_number: null,
            payment_account_name: 'Jane Doe',
            payment_account_masked: '****1234',
            payment_email: null,
            payment_phone_number: null,
            payment_city: null,
            payment_province: null,
            payment_zipcode: null,
            payment_address: null,
          },
        }),
      });
    });

    await page.route('**/api/onboarding/profiles/profile-id/documents', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'doc-1',
              file_name: 'id.pdf',
              document_type: 'valid_id',
            },
          ],
        }),
      });
    });

    await page.route('**/api/onboarding/documents/doc-1/preview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { signedUrl: 'https://example.com/preview.pdf' },
        }),
      });
    });

    await page.goto('/admin/onboarding/profile-id');
    await page.getByRole('tab', { name: /Documents/i }).click();
    await page.getByRole('button', { name: /Preview/i }).click();
    await expect(page.getByRole('button', { name: /Preview/i })).toBeVisible();
  });

  test('employee/intern roles get 403 forbidden from admin onboarding API', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'employee@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    const employeeResponse = await page.request.get('/api/onboarding/profiles');
    expect(employeeResponse.status()).toBe(403);

    await page.goto('/login');
    await page.fill('[name="email"]', 'intern@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    const internResponse = await page.request.get('/api/onboarding/profiles');
    expect(internResponse.status()).toBe(403);
  });
});
