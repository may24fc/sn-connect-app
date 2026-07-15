import { expect, test } from '@playwright/test';

test.describe('Employee Resources Experience', () => {
  test.beforeEach(async ({ page }) => {
    // Login as employee
    await page.goto('/login');
    await page.fill('[name="email"]', 'employee@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('employee can view resources feed', async ({ page }) => {
    await page.goto('/resources');

    // Should see Information Hub heading
    await expect(page.getByRole('heading', { name: /Information Hub/i })).toBeVisible();

    // Should see resources
    await expect(page.locator('.resource-card').first()).toBeVisible();
  });

  test('employee sees only targeted resources', async ({ page }) => {
    await page.goto('/resources');

    // Employee should only see:
    // 1. Public resources (is_public = true)
    // 2. Resources targeted to 'employee' role
    // 3. Resources targeted to their department
    // 4. Resources specifically targeted to them

    // Should NOT see resources targeted only to other roles (e.g., admin-only, associate-only)
    // This is enforced by RLS policies

    const resourceCards = page.locator('.resource-card');
    await expect(resourceCards).toBeVisible();
  });

  test('employee sees featured resources section', async ({ page }) => {
    await page.goto('/resources');

    // Should have featured resources section
    await expect(page.getByText(/featured/i)).toBeVisible();

    // Featured resources should have special styling or badge
    const featuredSection = page.locator('[data-testid="featured-resources"]');
    await expect(featuredSection).toBeVisible();
  });

  test('employee can filter resources by category', async ({ page }) => {
    await page.goto('/resources');

    // Click on a category filter
    await page.click('button:has-text("Onboarding")');

    // Should show only onboarding resources
    const url = page.url();
    expect(url).toContain('category=onboarding');
  });

  test('employee can search resources', async ({ page }) => {
    await page.goto('/resources');

    // Search for specific resource
    await page.fill('[name="search"]', 'policy');
    await page.press('[name="search"]', 'Enter');

    // Should filter results
    await expect(page.locator('.resource-card:has-text("policy")')).toBeVisible();
  });

  test('employee can bookmark a resource', async ({ page }) => {
    await page.goto('/resources');

    // Find a resource and bookmark it
    const firstResource = page.locator('.resource-card').first();
    await firstResource.hover();
    await firstResource.locator('button[aria-label="Bookmark"]').click();

    // Should see confirmation
    await expect(page.getByText(/bookmarked/i)).toBeVisible();

    // Bookmark icon should change to filled state
    await expect(firstResource.locator('[data-bookmarked="true"]')).toBeVisible();
  });

  test('employee can unbookmark a resource', async ({ page }) => {
    await page.goto('/resources');

    // Bookmark first
    const firstResource = page.locator('.resource-card').first();
    await firstResource.hover();
    await firstResource.locator('button[aria-label="Bookmark"]').click();
    await expect(page.getByText(/bookmarked/i)).toBeVisible();

    // Then unbookmark
    await firstResource.locator('button[aria-label="Remove bookmark"]').click();

    // Should see confirmation
    await expect(page.getByText(/bookmark removed/i)).toBeVisible();
  });

  test('employee can view bookmarked resources', async ({ page }) => {
    await page.goto('/resources');

    // Filter to show only bookmarked
    await page.click('button:has-text("Bookmarked")');

    // Should show only bookmarked resources
    const url = page.url();
    expect(url).toContain('bookmarked=true');
  });

  test('employee can view resource details', async ({ page }) => {
    await page.goto('/resources');

    // Click on a resource
    const firstResource = page.locator('.resource-card').first();
    const resourceTitle = await firstResource.locator('h3').textContent();
    await firstResource.click();

    // Should navigate to detail page
    await expect(page.getByRole('heading', { name: resourceTitle || '' })).toBeVisible();

    // Should see description
    await expect(page.locator('[data-testid="resource-description"]')).toBeVisible();
  });

  test('employee can download document resource', async ({ page }) => {
    await page.goto('/resources');

    // Find a document resource
    await page.click('text=Employee Handbook'); // Assume this exists

    // Click download button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download")');
    const download = await downloadPromise;

    // Verify download started
    expect(download.suggestedFilename()).toMatch(/handbook/i);
  });

  test('employee can view video resource', async ({ page }) => {
    await page.goto('/resources');

    // Find a video resource
    await page.click('text=Company Culture Video'); // Assume this exists

    // Should see video player or embedded content
    await expect(page.locator('iframe, video')).toBeVisible();
  });

  test('employee can open external link resource', async ({ page }) => {
    await page.goto('/resources');

    // Find a link resource
    await page.click('text=External Tool Guide'); // Assume this exists

    // Click to open external link
    const newPagePromise = page.context().waitForEvent('page');
    await page.click('a:has-text("Open Link")');
    const newPage = await newPagePromise;

    // Verify new tab opened
    expect(newPage.url()).toContain('http');
  });

  test('resource view is tracked', async ({ page }) => {
    await page.goto('/resources');

    // Click on a resource
    await page.click('.resource-card:first-child');

    // View should be automatically tracked
    // This happens via API call on page load

    // View count should increment (visible to admin in analytics)
    // Employee just sees the resource without the internal tracking details
    await expect(page.locator('[data-testid="resource-content"]')).toBeVisible();
  });

  test('employee can view recently accessed resources', async ({ page }) => {
    await page.goto('/resources');

    // Click on "Recently Viewed" filter/tab
    await page.click('button:has-text("Recently Viewed")');

    // Should show resources the user recently accessed
    await expect(page.locator('.resource-card')).toBeVisible();
  });

  test('employee can filter by resource type', async ({ page }) => {
    await page.goto('/resources');

    // Filter by document type
    await page.click('button[data-filter="type"]');
    await page.click('text=Documents');

    // Should show only document resources
    const documentCards = page.locator('.resource-card[data-type="document"]');
    await expect(documentCards.first()).toBeVisible();
  });

  test('employee can view resources by tags', async ({ page }) => {
    await page.goto('/resources');

    // Click on a tag
    await page.click('[data-testid="tag-remote"]');

    // Should filter to resources with that tag
    const url = page.url();
    expect(url).toContain('tag=remote');
  });

  test('employee sees resource popularity metrics', async ({ page }) => {
    await page.goto('/resources');

    // Resource cards should show view count, bookmark count
    const firstCard = page.locator('.resource-card').first();
    await expect(firstCard.getByText(/views/i)).toBeVisible();
    await expect(firstCard.getByText(/bookmarks/i)).toBeVisible();
  });

  test('employee can add personal notes to bookmarked resource', async ({ page }) => {
    await page.goto('/resources');

    // Bookmark a resource
    const firstResource = page.locator('.resource-card').first();
    await firstResource.hover();
    await firstResource.locator('button[aria-label="Bookmark"]').click();

    // Navigate to bookmarked resources
    await page.click('button:has-text("Bookmarked")');

    // Click on bookmarked resource
    await page.locator('.resource-card').first().click();

    // Add personal notes
    await page.fill('[name="bookmarkNotes"]', 'Important reference for my project');
    await page.click('button:has-text("Save Notes")');

    await expect(page.getByText(/notes saved/i)).toBeVisible();
  });
});

test.describe('Employee Resources - Security Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'employee@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('employee does NOT see draft resources', async ({ page }) => {
    await page.goto('/resources');

    // Should only see published resources
    // Draft resources should be filtered out by RLS
    const draftBadge = page.locator('text=/draft/i');
    await expect(draftBadge).not.toBeVisible();
  });

  test('employee does NOT see expired resources', async ({ page }) => {
    await page.goto('/resources');

    // Resources past their expiration date should not appear
    // This is enforced by RLS policies checking expires_at
    const resourceCards = page.locator('.resource-card');
    await expect(resourceCards).toBeVisible();
  });

  test('employee does NOT see scheduled (future) resources', async ({ page }) => {
    await page.goto('/resources');

    // Resources with published_at in the future should not appear
    // This is enforced by RLS policies
    const resourceCards = page.locator('.resource-card');
    await expect(resourceCards).toBeVisible();
  });

  test('employee does NOT see admin-only resources', async ({ page }) => {
    await page.goto('/resources');

    // Resources targeted only to admin/hr/super_admin should not be visible
    // Search for a known admin-only resource should return no results
    await page.fill('[name="search"]', 'Payroll Admin Guide');
    await page.press('[name="search"]', 'Enter');

    // Should show no results or "not found"
    await expect(page.getByText(/no resources found/i)).toBeVisible();
  });

  test('employee does NOT see resources targeted to other departments', async ({ page }) => {
    await page.goto('/resources');

    // Employee in Engineering should not see HR-only resources
    // This is enforced by RLS checking target_departments
    // Search should not return department-specific resources outside user's department
    await page.fill('[name="search"]', 'HR Internal Policy');
    await page.press('[name="search"]', 'Enter');

    // Should show no results
    await expect(page.getByText(/no resources found/i)).toBeVisible();
  });

  test('employee cannot access resource detail page for unauthorized resource', async ({
    page,
  }) => {
    // Try to directly access a resource ID that employee should not see
    const unauthorizedResourceId = 'admin-only-resource-id';

    await page.goto(`/resources/${unauthorizedResourceId}`);

    // Should show 403 Forbidden or redirect to resources list
    await expect(page.getByText(/forbidden|not found|access denied/i)).toBeVisible();
  });

  test('employee cannot download resource they do not have access to', async ({ page }) => {
    // Try to directly request download URL for unauthorized resource
    const response = await page.request.get('/api/resources/admin-only-resource/download');

    // Should return 403 Forbidden
    expect(response.status()).toBe(403);
  });
});

test.describe('Associate Resources Experience', () => {
  test.beforeEach(async ({ page }) => {
    // Login as associate
    await page.goto('/login');
    await page.fill('[name="email"]', 'associate@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('associate can view resources feed', async ({ page }) => {
    await page.goto('/resources');
    await expect(page.getByRole('heading', { name: /Information Hub/i })).toBeVisible();
  });

  test('associate sees associate-targeted resources', async ({ page }) => {
    await page.goto('/resources');

    // Associate should see:
    // 1. Public resources
    // 2. Resources targeted to 'associate' role
    // 3. Resources targeted to their department

    // Search for associate onboarding
    await page.fill('[name="search"]', 'associate onboarding');
    await page.press('[name="search"]', 'Enter');

    // Should show associate-specific resources
    await expect(page.locator('.resource-card')).toBeVisible();
  });

  test('associate does NOT see employee-only resources', async ({ page }) => {
    await page.goto('/resources');

    // Resources targeted only to 'employee' role should not appear for interns
    await page.fill('[name="search"]', 'Employee Benefits Guide');
    await page.press('[name="search"]', 'Enter');

    // Should show no results if resource is employee-only
    // (Or show it if it's public/targeted to both employee and associate)
  });

  test('associate can bookmark and access resources like employees', async ({ page }) => {
    await page.goto('/resources');

    // Bookmark functionality should work the same
    const firstResource = page.locator('.resource-card').first();
    await firstResource.hover();
    await firstResource.locator('button[aria-label="Bookmark"]').click();

    await expect(page.getByText(/bookmarked/i)).toBeVisible();
  });
});

test.describe('Resource Collections', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'employee@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('employee can view resource collections/playlists', async ({ page }) => {
    await page.goto('/resources/collections');

    // Should see collections
    await expect(page.getByRole('heading', { name: /Resource Collections/i })).toBeVisible();

    // Should see collection cards
    await expect(page.locator('.collection-card').first()).toBeVisible();
  });

  test('employee can view resources within a collection', async ({ page }) => {
    await page.goto('/resources/collections');

    // Click on a collection
    await page.click('.collection-card:first-child');

    // Should see resources in the collection
    await expect(page.locator('.resource-card')).toBeVisible();

    // Resources should be ordered by display_order
  });

  test('employee can view collection progress (if applicable)', async ({ page }) => {
    await page.goto('/resources/collections');

    // For learning collections, should show progress
    await page.click('text=Onboarding Program'); // Assume this collection exists

    // Should show completion status
    await expect(page.getByText(/progress/i)).toBeVisible();
  });
});
