import { expect, test } from '@playwright/test';

test.describe('Admin Resources Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('admin can view resources list', async ({ page }) => {
    await page.goto('/admin/resources');
    await expect(page.getByRole('heading', { name: /Resources/i })).toBeVisible();

    // Should see resource management UI
    await expect(page.getByText(/Create Resource/i)).toBeVisible();
  });

  test('admin can create draft resource with file upload', async ({ page }) => {
    await page.goto('/admin/resources');

    // Click create button
    await page.click('button:has-text("Create Resource")');

    // Fill in basic information
    await page.fill('[name="title"]', 'Employee Handbook 2026');
    await page.fill('[name="description"]', 'Updated company policies and procedures for 2026');

    // Select category
    await page.selectOption('[name="category"]', 'policies');

    // Select resource type
    await page.selectOption('[name="resourceType"]', 'document');

    // Upload file (mock file upload)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'handbook-2026.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Mock PDF content'),
    });

    // Save as draft
    await page.click('button:has-text("Save Draft")');

    // Should see success message
    await expect(page.getByText(/saved as draft/i)).toBeVisible();

    // Should see draft in list
    await page.goto('/admin/resources');
    await expect(page.getByText('Employee Handbook 2026')).toBeVisible();
    await expect(page.getByText(/draft/i)).toBeVisible();
  });

  test('admin can create resource with external URL', async ({ page }) => {
    await page.goto('/admin/resources');
    await page.click('button:has-text("Create Resource")');

    await page.fill('[name="title"]', 'Company Culture Video');
    await page.fill('[name="description"]', 'Welcome message from our CEO');
    await page.selectOption('[name="category"]', 'culture');
    await page.selectOption('[name="resourceType"]', 'video');

    // Enter external URL
    await page.fill('[name="externalUrl"]', 'https://youtube.com/watch?v=abc123');

    await page.click('button:has-text("Save Draft")');

    await expect(page.getByText(/saved as draft/i)).toBeVisible();
  });

  test('admin can publish a draft resource', async ({ page }) => {
    await page.goto('/admin/resources');

    // Assume a draft resource exists
    await page.click('button:has-text("Create Resource")');
    await page.fill('[name="title"]', 'Test Resource for Publishing');
    await page.fill('[name="description"]', 'Test description');
    await page.selectOption('[name="category"]', 'training');
    await page.fill('[name="externalUrl"]', 'https://example.com/resource');
    await page.click('button:has-text("Save Draft")');

    // Go back to list
    await page.goto('/admin/resources');

    // Find the draft and click to edit
    await page.click('text=Test Resource for Publishing');

    // Publish the resource
    await page.click('button:has-text("Publish")');

    // Confirm publish
    await page.click('button:has-text("Confirm")');

    await expect(page.getByText(/published successfully/i)).toBeVisible();

    // Verify status changed
    await page.goto('/admin/resources');
    const resourceCard = page.locator('text=Test Resource for Publishing').locator('..');
    await expect(resourceCard.getByText(/published/i)).toBeVisible();
  });

  test('admin can edit existing resource', async ({ page }) => {
    await page.goto('/admin/resources');

    // Create a resource first
    await page.click('button:has-text("Create Resource")');
    await page.fill('[name="title"]', 'Resource to Edit');
    await page.fill('[name="description"]', 'Original description');
    await page.selectOption('[name="category"]', 'tools');
    await page.fill('[name="externalUrl"]', 'https://example.com/original');
    await page.click('button:has-text("Save Draft")');

    // Navigate to edit
    await page.goto('/admin/resources');
    await page.click('text=Resource to Edit');

    // Edit the resource
    await page.fill('[name="title"]', 'Updated Resource Title');
    await page.fill('[name="description"]', 'Updated description with more details');

    await page.click('button:has-text("Save Changes")');

    await expect(page.getByText(/updated successfully/i)).toBeVisible();

    // Verify changes
    await page.goto('/admin/resources');
    await expect(page.getByText('Updated Resource Title')).toBeVisible();
  });

  test('admin can delete resource', async ({ page }) => {
    await page.goto('/admin/resources');

    // Create a resource to delete
    await page.click('button:has-text("Create Resource")');
    await page.fill('[name="title"]', 'Resource to Delete');
    await page.fill('[name="description"]', 'This will be deleted');
    await page.selectOption('[name="category"]', 'training');
    await page.fill('[name="externalUrl"]', 'https://example.com/delete');
    await page.click('button:has-text("Save Draft")');

    // Go to resource detail
    await page.goto('/admin/resources');
    await page.click('text=Resource to Delete');

    // Delete the resource
    await page.click('button:has-text("Delete")');

    // Confirm deletion
    await page.click('button:has-text("Confirm Delete")');

    await expect(page.getByText(/deleted successfully/i)).toBeVisible();

    // Verify it's gone from list
    await page.goto('/admin/resources');
    await expect(page.getByText('Resource to Delete')).not.toBeVisible();
  });

  test('admin can target resource to specific roles', async ({ page }) => {
    await page.goto('/admin/resources');
    await page.click('button:has-text("Create Resource")');

    await page.fill('[name="title"]', 'Intern Onboarding Guide');
    await page.fill('[name="description"]', 'Guide for new interns only');
    await page.selectOption('[name="category"]', 'onboarding');
    await page.fill('[name="externalUrl"]', 'https://example.com/intern-guide');

    // Set targeting to interns only
    await page.click('text=Targeting');
    await page.uncheck('[name="isPublic"]');
    await page.check('[name="targetRole-intern"]');

    await page.click('button:has-text("Save Draft")');

    await expect(page.getByText(/saved as draft/i)).toBeVisible();

    // Verify targeting is set
    await page.goto('/admin/resources');
    await page.click('text=Intern Onboarding Guide');
    await expect(page.getByText(/target.*intern/i)).toBeVisible();
  });

  test('admin can target resource to specific departments', async ({ page }) => {
    await page.goto('/admin/resources');
    await page.click('button:has-text("Create Resource")');

    await page.fill('[name="title"]', 'Engineering Tools Guide');
    await page.fill('[name="description"]', 'Developer tools and setup');
    await page.selectOption('[name="category"]', 'tools');
    await page.fill('[name="externalUrl"]', 'https://example.com/eng-tools');

    // Set department targeting
    await page.click('text=Targeting');
    await page.uncheck('[name="isPublic"]');
    await page.check('[name="targetDepartment-engineering"]');

    await page.click('button:has-text("Save Draft")');

    await expect(page.getByText(/saved as draft/i)).toBeVisible();
  });

  test('admin can add tags to resource', async ({ page }) => {
    await page.goto('/admin/resources');
    await page.click('button:has-text("Create Resource")');

    await page.fill('[name="title"]', 'Remote Work Best Practices');
    await page.fill('[name="description"]', 'Tips for remote workers');
    await page.selectOption('[name="category"]', 'training');
    await page.fill('[name="externalUrl"]', 'https://example.com/remote-tips');

    // Add tags
    await page.fill('[name="tags"]', 'remote, productivity, tips');

    await page.click('button:has-text("Save Draft")');

    await expect(page.getByText(/saved as draft/i)).toBeVisible();

    // Verify tags are displayed
    await page.goto('/admin/resources');
    await page.click('text=Remote Work Best Practices');
    await expect(page.getByText('remote')).toBeVisible();
    await expect(page.getByText('productivity')).toBeVisible();
    await expect(page.getByText('tips')).toBeVisible();
  });

  test('admin can feature/unfeature resource', async ({ page }) => {
    await page.goto('/admin/resources');

    // Create a resource
    await page.click('button:has-text("Create Resource")');
    await page.fill('[name="title"]', 'Featured Resource');
    await page.fill('[name="description"]', 'This will be featured');
    await page.selectOption('[name="category"]', 'policies');
    await page.fill('[name="externalUrl"]', 'https://example.com/featured');
    await page.click('button:has-text("Publish")');

    // Feature the resource
    await page.goto('/admin/resources');
    await page.click('text=Featured Resource');
    await page.click('button:has-text("Feature")');

    await expect(page.getByText(/featured/i)).toBeVisible();

    // Unfeature
    await page.click('button:has-text("Unfeature")');

    await expect(page.getByText(/removed from featured/i)).toBeVisible();
  });

  test('admin can pin resource to category', async ({ page }) => {
    await page.goto('/admin/resources');

    // Create a resource
    await page.click('button:has-text("Create Resource")');
    await page.fill('[name="title"]', 'Pinned Policy');
    await page.fill('[name="description"]', 'Important policy');
    await page.selectOption('[name="category"]', 'policies');
    await page.fill('[name="externalUrl"]', 'https://example.com/policy');

    // Pin the resource
    await page.check('[name="isPinned"]');

    await page.click('button:has-text("Publish")');

    await expect(page.getByText(/published successfully/i)).toBeVisible();
  });

  test('admin can set publish date (schedule)', async ({ page }) => {
    await page.goto('/admin/resources');
    await page.click('button:has-text("Create Resource")');

    await page.fill('[name="title"]', 'Scheduled Resource');
    await page.fill('[name="description"]', 'Will be published in future');
    await page.selectOption('[name="category"]', 'training');
    await page.fill('[name="externalUrl"]', 'https://example.com/scheduled');

    // Set publish date to future
    await page.fill('[name="publishedAt"]', '2026-03-01T10:00');

    await page.click('button:has-text("Schedule")');

    await expect(page.getByText(/scheduled for/i)).toBeVisible();
  });

  test('admin can set expiration date', async ({ page }) => {
    await page.goto('/admin/resources');
    await page.click('button:has-text("Create Resource")');

    await page.fill('[name="title"]', 'Expiring Resource');
    await page.fill('[name="description"]', 'Will expire after certain date');
    await page.selectOption('[name="category"]', 'events');
    await page.fill('[name="externalUrl"]', 'https://example.com/event');

    // Set expiration date
    await page.fill('[name="expiresAt"]', '2026-12-31T23:59');

    await page.click('button:has-text("Publish")');

    await expect(page.getByText(/published successfully/i)).toBeVisible();
  });

  test('admin cannot set expiration before publish date', async ({ page }) => {
    await page.goto('/admin/resources');
    await page.click('button:has-text("Create Resource")');

    await page.fill('[name="title"]', 'Invalid Dates Resource');
    await page.fill('[name="description"]', 'Invalid date configuration');
    await page.selectOption('[name="category"]', 'training');
    await page.fill('[name="externalUrl"]', 'https://example.com/invalid');

    // Set publish date after expiration (invalid)
    await page.fill('[name="publishedAt"]', '2026-12-01T10:00');
    await page.fill('[name="expiresAt"]', '2026-11-01T10:00');

    await page.click('button:has-text("Publish")');

    // Should show validation error
    await expect(page.getByText(/expiration must be later than publish date/i)).toBeVisible();
  });

  test('admin can filter resources by status', async ({ page }) => {
    await page.goto('/admin/resources');

    // Filter by draft
    await page.selectOption('[name="statusFilter"]', 'draft');

    // Should only show draft resources
    await expect(page.getByText(/draft/i).first()).toBeVisible();
  });

  test('admin can filter resources by category', async ({ page }) => {
    await page.goto('/admin/resources');

    // Filter by category
    await page.selectOption('[name="categoryFilter"]', 'policies');

    // Should only show policy resources
    // Verify filter is applied
    const url = page.url();
    expect(url).toContain('category=policies');
  });

  test('admin can search resources', async ({ page }) => {
    await page.goto('/admin/resources');

    // Search for specific resource
    await page.fill('[name="search"]', 'handbook');
    await page.press('[name="search"]', 'Enter');

    // Should filter results
    const url = page.url();
    expect(url).toContain('search=handbook');
  });

  test('admin can bulk upload resources (placeholder)', async ({ page }) => {
    await page.goto('/admin/resources');

    // Bulk upload feature
    await page.click('button:has-text("Bulk Upload")');

    // Should show bulk upload interface
    await expect(page.getByText(/upload multiple/i)).toBeVisible();
  });
});

test.describe('Resource Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('admin can view resource analytics', async ({ page }) => {
    await page.goto('/admin/resources');

    // Click on a resource
    await page.click('.resource-card:first-child');

    // Navigate to analytics tab
    await page.click('button:has-text("Analytics")');

    // Should see analytics data
    await expect(page.getByText(/view count/i)).toBeVisible();
    await expect(page.getByText(/download count/i)).toBeVisible();
    await expect(page.getByText(/bookmark count/i)).toBeVisible();
  });
});
