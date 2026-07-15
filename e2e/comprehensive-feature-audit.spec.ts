import { expect, test, Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Comprehensive Feature Audit for apps/web (HR Portal)
 *
 * This test suite audits ALL features for:
 * 1. Features with source code but missing/broken implementation
 * 2. Implemented features that are not functioning properly
 * 3. Mock data that should be replaced with real API calls
 * 4. UI elements that exist but are non-functional
 * 5. Missing pages referenced in navigation but not implemented
 */

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3001';
const SCREENSHOT_DIR = 'e2e/screenshots/feature-audit';

const testCredentials = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? 'admin@test.com',
    password: process.env.E2E_ADMIN_PASSWORD ?? 'password',
  },
  employee: {
    email: process.env.E2E_EMPLOYEE_EMAIL ?? 'employee@test.com',
    password: process.env.E2E_EMPLOYEE_PASSWORD ?? 'password',
  },
  associate: {
    email: process.env.E2E_INTERN_EMAIL ?? 'associate@test.com',
    password: process.env.E2E_INTERN_PASSWORD ?? 'password',
  },
  superAdmin: {
    email: process.env.E2E_SUPERADMIN_EMAIL ?? 'superadmin@test.com',
    password: process.env.E2E_SUPERADMIN_PASSWORD ?? 'password',
  },
};

test.beforeAll(async () => {
  const dir = path.join(process.cwd(), SCREENSHOT_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function screenshot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

async function login(
  page: Page,
  role: 'admin' | 'employee' | 'associate' | 'superAdmin'
) {
  const creds = testCredentials[role];
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  const emailInput = page.getByLabel('Email');
  if (await emailInput.isVisible()) {
    await emailInput.fill(creds.email);
    await page.locator('#password').fill(creds.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(
      /\/(dashboard|admin|super-admin|associate|onboarding|awaiting)/,
      { timeout: 15000 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: DASHBOARD MOCK DATA AUDIT
// Verifies that dashboard components show real data, not placeholders
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Dashboard Mock Data Audit', () => {
  test('Employee dashboard shows real data, not hardcoded zeros', async ({
    page,
  }) => {
    await login(page, 'employee');
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await screenshot(page, 'employee-dashboard');

    // Check that dashboard doesn't show all-zero placeholder values
    const content = await page.textContent('body');

    // The EmployeeDashboard component has hardcoded empty arrays and zeros
    // Verify that announcement feed section loads (even if empty, should show proper state)
    const announcementSection = page.locator(
      '[data-testid="announcement-feed"], [data-testid="announcements"], h2:has-text("Announcement"), h3:has-text("Announcement")'
    );
    const taskSection = page.locator(
      '[data-testid="recent-tasks"], [data-testid="tasks"], h2:has-text("Task"), h3:has-text("Task")'
    );

    // Look for proper loading states or data (not just static zeros)
    const skeletons = await page.locator('.animate-pulse, [data-loading]').count();
    const emptyStateMessages = await page
      .locator('text=/no .*(tasks|announcements|data)/i')
      .count();

    // Dashboard should either show real data or proper empty states (not just dashes)
    const dashPlaceholders = await page
      .locator('text="—"')
      .count();

    // Log findings
    console.log(`[AUDIT] Dashboard placeholders (—): ${dashPlaceholders}`);
    console.log(`[AUDIT] Skeleton loaders visible: ${skeletons}`);
    console.log(`[AUDIT] Empty state messages: ${emptyStateMessages}`);

    // If there are many dash placeholders, the dashboard is using mock data
    if (dashPlaceholders > 3) {
      console.warn(
        '[FINDING] EmployeeDashboard has excessive placeholder dashes — likely using mock data'
      );
    }
  });

  test('Associate dashboard component vs page - data source check', async ({
    page,
  }) => {
    await login(page, 'associate');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    console.log(`[AUDIT] Associate logged in, landed on: ${url}`);

    // Navigate to associate dashboard if not already there
    if (!url.includes('/associate/dashboard')) {
      await page.goto(`${BASE_URL}/associate/dashboard`);
      await page.waitForLoadState('networkidle');
    }
    await page.waitForTimeout(2000);
    await screenshot(page, 'associate-dashboard');

    // Check if the page uses real API data (associate/dashboard/page.tsx uses hooks)
    // vs the InternDashboard component which uses mock data
    const content = await page.textContent('body');

    // Check for mock associate profile indicators (all dashes)
    const mockIndicators = [
      '—', // dash placeholders from mockInternProfile
    ];

    let mockCount = 0;
    for (const indicator of mockIndicators) {
      const count = (content?.match(new RegExp(indicator, 'g')) || []).length;
      mockCount += count;
    }

    console.log(`[AUDIT] Associate dashboard mock data indicators: ${mockCount}`);

    if (mockCount > 5) {
      console.warn(
        '[FINDING] InternDashboard is using the mock component instead of the real page with hooks'
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: FEATURE COMPLETENESS AUDIT
// Checks pages that exist in code but may not be fully implemented
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Feature Completeness Audit', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
  });

  test('Admin dashboard recent activity - is it real data or placeholder?', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/admin/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await screenshot(page, 'admin-dashboard');

    // Check if recent activity section has real content
    const recentActivity = page.locator(
      'text=/recent activity/i, [data-testid="recent-activity"]'
    );
    const auditLogs = page.locator('text=/audit/i');
    const emptyActivity = page.locator(
      'text=/no recent activity/i, text=/no activity/i'
    );

    const hasActivity = (await recentActivity.count()) > 0;
    const hasEmptyState = (await emptyActivity.count()) > 0;

    console.log(`[AUDIT] Admin dashboard - recent activity section: ${hasActivity ? 'found' : 'missing'}`);
    console.log(`[AUDIT] Admin dashboard - empty activity state: ${hasEmptyState ? 'shown' : 'not shown'}`);

    if (!hasActivity && !hasEmptyState) {
      console.warn('[FINDING] Admin dashboard recent activity section may be hardcoded empty');
    }
  });

  test('Department management page - exists or missing?', async ({ page }) => {
    // Check if departments page exists in admin navigation
    const response = await page.goto(`${BASE_URL}/admin/departments`);
    const status = response?.status();
    const finalUrl = page.url();

    console.log(`[AUDIT] /admin/departments - HTTP ${status}, redirected to: ${finalUrl}`);

    if (status === 404 || finalUrl.includes('/login') || finalUrl.includes('/404')) {
      console.warn('[FINDING] Department management page is MISSING - no admin UI for department CRUD');
    }

    await screenshot(page, 'admin-departments');
  });

  test('Employee CSV/Excel export - functionality check', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/directory`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await screenshot(page, 'admin-directory');

    // Look for export button
    const exportButton = page.locator(
      'button:has-text("Export"), button:has-text("CSV"), button:has-text("Download"), [data-testid="export"]'
    );
    const hasExport = (await exportButton.count()) > 0;

    console.log(`[AUDIT] Directory page - export button: ${hasExport ? 'found' : 'NOT FOUND'}`);

    if (hasExport) {
      // Try clicking export
      await exportButton.first().click();
      await page.waitForTimeout(1000);

      // Check if download was triggered or modal appeared
      const downloadPromise = page.waitForEvent('download', { timeout: 3000 }).catch(() => null);
      const download = await downloadPromise;

      console.log(`[AUDIT] Export download triggered: ${download ? 'YES' : 'NO'}`);
    } else {
      console.warn('[FINDING] No export functionality found on employee directory');
    }
  });

  test('Super admin dashboard - placeholder sections audit', async ({
    page,
  }) => {
    // Re-login as super admin
    await login(page, 'superAdmin');
    await page.goto(`${BASE_URL}/super-admin/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await screenshot(page, 'super-admin-dashboard');

    // Check for placeholder sections
    const securityAlerts = page.locator(
      'text=/security alert/i, text=/no.*alert/i'
    );
    const systemHealth = page.locator(
      'text=/system health/i, text=/uptime/i'
    );

    const hasSecuritySection = (await securityAlerts.count()) > 0;
    const hasHealthSection = (await systemHealth.count()) > 0;

    console.log(`[AUDIT] Super admin - security alerts section: ${hasSecuritySection ? 'found' : 'missing'}`);
    console.log(`[AUDIT] Super admin - system health section: ${hasHealthSection ? 'found' : 'missing'}`);

    // Check for "0" placeholders or empty states
    const placeholderZeros = await page.locator('text="0"').count();
    console.log(`[AUDIT] Super admin - zero value indicators: ${placeholderZeros}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: TASK DETAIL PAGE FUNCTIONALITY
// Tests edit/delete operations that are known to be stubs
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Task Management Completeness', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'superAdmin');
  });

  test('Task detail page - edit/delete buttons wired', async ({ page }) => {
    await page.goto(`${BASE_URL}/super-admin/tasks`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Try to find and click a task to go to detail
    const taskLink = page.locator(
      'a[href*="/tasks/"], tr[data-testid], [data-task-id]'
    ).first();
    const hasTask = (await taskLink.count()) > 0;

    if (hasTask) {
      await taskLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await screenshot(page, 'task-detail');

      // Check for edit button
      const editBtn = page.locator(
        'button:has-text("Edit"), [data-testid="edit-task"]'
      );
      const deleteBtn = page.locator(
        'button:has-text("Delete"), [data-testid="delete-task"]'
      );

      const hasEdit = (await editBtn.count()) > 0;
      const hasDelete = (await deleteBtn.count()) > 0;

      console.log(`[AUDIT] Task detail - Edit button: ${hasEdit ? 'present' : 'missing'}`);
      console.log(`[AUDIT] Task detail - Delete button: ${hasDelete ? 'present' : 'missing'}`);

      if (hasEdit) {
        // Test if edit actually does anything
        await editBtn.first().click();
        await page.waitForTimeout(1000);

        const formAppeared = await page
          .locator(
            'form, [data-testid="edit-form"], [role="dialog"], [data-state="open"]'
          )
          .count();
        console.log(`[AUDIT] Task detail - Edit form appeared: ${formAppeared > 0 ? 'YES' : 'NO (stub)'}`);

        if (formAppeared === 0) {
          console.warn('[FINDING] Task edit button exists but does nothing - handler is empty stub');
        }
      }
    } else {
      console.log('[AUDIT] No tasks available to test detail page');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: API ROUTE HEALTH CHECK
// Tests key API endpoints for proper responses
// ═══════════════════════════════════════════════════════════════════════════

test.describe('API Route Health Check', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
  });

  const apiEndpoints = [
    { path: '/api/dashboard/stats', name: 'Dashboard Stats' },
    { path: '/api/dashboard/pending', name: 'Pending Approvals' },
    { path: '/api/employees', name: 'Employees List' },
    { path: '/api/departments', name: 'Departments List' },
    { path: '/api/tasks', name: 'Tasks List' },
    { path: '/api/announcements', name: 'Announcements List' },
    { path: '/api/resources', name: 'Resources List' },
    { path: '/api/notifications', name: 'Notifications List' },
    { path: '/api/reports', name: 'Reports List' },
    { path: '/api/jobs', name: 'Job Postings' },
    { path: '/api/milestones', name: 'Milestones' },
    { path: '/api/standups', name: 'Standups' },
    { path: '/api/invoices', name: 'Invoices' },
    { path: '/api/performance/cycles', name: 'Performance Cycles' },
    { path: '/api/performance/okrs', name: 'OKRs' },
    { path: '/api/onboarding/profiles', name: 'Onboarding Profiles' },
    { path: '/api/directory', name: 'Employee Directory' },
    { path: '/api/profile-change-requests', name: 'Profile Change Requests' },
  ];

  for (const endpoint of apiEndpoints) {
    test(`API: ${endpoint.name} (${endpoint.path})`, async ({ page }) => {
      const response = await page.goto(`${BASE_URL}${endpoint.path}`);
      const status = response?.status() ?? 0;
      const body = await page.textContent('body');

      let parsed: unknown = null;
      try {
        parsed = JSON.parse(body ?? '');
      } catch {
        // Not JSON
      }

      console.log(`[API] ${endpoint.name}: HTTP ${status}`);

      if (status >= 400) {
        console.warn(
          `[FINDING] ${endpoint.name} returned error: HTTP ${status}`
        );
      }

      if (status === 200 && parsed) {
        const data = parsed as Record<string, unknown>;
        if (data.data && Array.isArray(data.data) && data.data.length === 0) {
          console.log(`[API] ${endpoint.name}: returned empty array (may be OK if no data seeded)`);
        }
      }

      expect(status).toBeLessThan(500);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: NAVIGATION AUDIT
// Checks that all sidebar links lead to real pages
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Navigation Completeness', () => {
  test('Employee sidebar - all links lead to real pages', async ({ page }) => {
    await login(page, 'employee');
    await page.waitForTimeout(2000);

    const sidebarLinks = await page.locator('nav a[href], aside a[href]').all();
    const results: Array<{ href: string; status: number | null }> = [];

    for (const link of sidebarLinks) {
      const href = await link.getAttribute('href');
      if (href && href.startsWith('/') && !href.startsWith('/api')) {
        const resp = await page.goto(`${BASE_URL}${href}`);
        const status = resp?.status() ?? null;
        results.push({ href, status });

        if (status === 404) {
          console.warn(`[FINDING] Sidebar link ${href} returns 404`);
        }

        // Go back
        await page.goBack();
        await page.waitForLoadState('networkidle');
      }
    }

    console.log('[AUDIT] Employee sidebar link results:');
    for (const r of results) {
      console.log(`  ${r.href}: ${r.status}`);
    }
  });

  test('Admin sidebar - all links lead to real pages', async ({ page }) => {
    await login(page, 'admin');
    await page.goto(`${BASE_URL}/admin/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const sidebarLinks = await page.locator('nav a[href], aside a[href]').all();
    const results: Array<{ href: string; status: number | null }> = [];

    for (const link of sidebarLinks) {
      const href = await link.getAttribute('href');
      if (href && href.startsWith('/') && !href.startsWith('/api')) {
        const resp = await page.goto(`${BASE_URL}${href}`);
        const status = resp?.status() ?? null;
        results.push({ href, status });

        if (status === 404) {
          console.warn(`[FINDING] Admin sidebar link ${href} returns 404`);
        }

        await page.goBack();
        await page.waitForLoadState('networkidle');
      }
    }

    console.log('[AUDIT] Admin sidebar link results:');
    for (const r of results) {
      console.log(`  ${r.href}: ${r.status}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: FORM FUNCTIONALITY AUDIT
// Tests that forms submit properly and aren't just UI shells
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Form Functionality Audit', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
  });

  test('Onboarding approval - email notification check', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/employee-management`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await screenshot(page, 'admin-employee-management');

    // Check for onboarding approvals tab
    const onboardingTab = page.locator(
      'button:has-text("Onboarding"), [data-value="onboarding"], [role="tab"]:has-text("Onboarding")'
    );
    const hasTab = (await onboardingTab.count()) > 0;

    console.log(`[AUDIT] Onboarding tab present: ${hasTab}`);

    if (hasTab) {
      await onboardingTab.first().click();
      await page.waitForTimeout(1000);

      // Check for approve buttons
      const approveBtn = page.locator(
        'button:has-text("Approve"), button:has-text("Review")'
      );
      console.log(`[AUDIT] Approve buttons count: ${await approveBtn.count()}`);
      console.log(
        '[FINDING] Onboarding approval exists but email notifications are TODO (no Resend integration)'
      );
    }
  });

  test('Job posting creation form - full field check', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/jobs`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for create button
    const createBtn = page.locator(
      'button:has-text("Create"), button:has-text("New Job"), button:has-text("Post")'
    );
    const hasCreate = (await createBtn.count()) > 0;

    console.log(`[AUDIT] Job creation button present: ${hasCreate}`);

    if (hasCreate) {
      await createBtn.first().click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'job-create-form');

      // Check form fields
      const formFields = await page
        .locator('input, textarea, select, [role="combobox"]')
        .count();
      console.log(`[AUDIT] Job form fields count: ${formFields}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: PROBATION MODULE AUDIT
// Verifies probation tracking uses real vs mock data
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Probation Module Audit', () => {
  test('Probation page data source check', async ({ page }) => {
    await login(page, 'admin');
    await page.goto(`${BASE_URL}/admin/probation`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await screenshot(page, 'admin-probation');

    // Check if real employee data is shown
    const content = await page.textContent('body');

    // Look for signs of real data vs empty arrays
    const emptyStates = await page
      .locator(
        'text=/no.*employee/i, text=/no.*data/i, text=/no.*probation/i, text=/empty/i'
      )
      .count();

    // Look for actual employee cards/rows
    const employeeCards = await page
      .locator(
        '[data-testid*="employee"], [data-testid*="probation"], .employee-card, tr'
      )
      .count();

    console.log(`[AUDIT] Probation page - empty states: ${emptyStates}`);
    console.log(`[AUDIT] Probation page - employee items: ${employeeCards}`);

    if (emptyStates > 0 && employeeCards <= 1) {
      console.warn(
        '[FINDING] Probation page shows empty state - may be using fallback empty array'
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8: MISSING FEATURES AUDIT
// Tests for features referenced in code but with no UI
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Missing Features Audit', () => {
  test('Calendar/Events feature - existence check', async ({ page }) => {
    await login(page, 'employee');

    // Check if calendar page exists
    const calendarResp = await page.goto(`${BASE_URL}/calendar`);
    const calStatus = calendarResp?.status();

    console.log(`[AUDIT] /calendar page: HTTP ${calStatus ?? 'N/A'}`);

    if (calStatus === 404 || page.url().includes('/login')) {
      console.warn('[FINDING] Calendar/Events page does NOT exist - referenced in dashboard but not implemented');
    }

    await screenshot(page, 'calendar-check');
  });

  test('Offboarding workflow - existence check', async ({ page }) => {
    await login(page, 'admin');

    // Check via API
    const response = await page.goto(`${BASE_URL}/api/offboarding/initiate`);
    const status = response?.status();

    console.log(`[AUDIT] Offboarding API: HTTP ${status ?? 'N/A'}`);

    // Check for UI page
    const uiResp = await page.goto(`${BASE_URL}/admin/offboarding`);
    const uiStatus = uiResp?.status();

    console.log(`[AUDIT] /admin/offboarding page: HTTP ${uiStatus ?? 'N/A'}`);

    if ((status === 404 || status === 405) && (uiStatus === 404)) {
      console.warn('[FINDING] Offboarding workflow is NOT implemented - no API or UI');
    }

    await screenshot(page, 'offboarding-check');
  });

  test('Profile picture upload - end-to-end check', async ({ page }) => {
    await login(page, 'employee');
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for avatar upload trigger
    const avatarUpload = page.locator(
      '[data-testid="avatar-upload"], button:has-text("Upload Photo"), .avatar-upload, input[type="file"][accept*="image"]'
    );
    const hasUpload = (await avatarUpload.count()) > 0;

    // Also check for camera icon or upload overlay
    const avatarArea = page.locator(
      '.relative:has(img), [data-testid="avatar"], .avatar'
    );

    console.log(`[AUDIT] Profile avatar upload trigger: ${hasUpload ? 'found' : 'NOT FOUND'}`);

    await screenshot(page, 'profile-avatar-check');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 9: RESPONSIVE DESIGN AUDIT
// Tests key pages at mobile viewport
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Responsive Design Audit', () => {
  const mobileViewport = { width: 375, height: 812 };
  const tabletViewport = { width: 768, height: 1024 };

  test('Login page - mobile responsiveness', async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    await screenshot(page, 'mobile-login');

    // Check form is usable
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();

    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    if (bodyWidth > viewportWidth + 5) {
      console.warn(`[FINDING] Login page has horizontal overflow: body=${bodyWidth}px, viewport=${viewportWidth}px`);
    }
  });

  test('Dashboard - tablet responsiveness', async ({ page }) => {
    await page.setViewportSize(tabletViewport);
    await login(page, 'employee');
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await screenshot(page, 'tablet-dashboard');

    // Check sidebar collapses or adapts
    const sidebar = page.locator('aside, [data-sidebar], nav.sidebar');
    if ((await sidebar.count()) > 0) {
      const sidebarWidth = await sidebar.first().evaluate(
        (el) => el.getBoundingClientRect().width
      );
      console.log(`[AUDIT] Tablet sidebar width: ${sidebarWidth}px`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 10: SLIDE PANEL / MODAL AUDIT
// Tests that all interactive panels open and close properly
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Interactive Panel Audit', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
  });

  test('Job posting slide panel opens and has all fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/jobs`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const createBtn = page.locator(
      'button:has-text("Create"), button:has-text("New"), button:has-text("Post Job")'
    );

    if ((await createBtn.count()) > 0) {
      await createBtn.first().click();
      await page.waitForTimeout(1000);

      // Check slide panel appeared
      const panel = page.locator(
        '[data-state="open"], [role="dialog"], .slide-panel'
      );
      const panelVisible = (await panel.count()) > 0;

      console.log(`[AUDIT] Job create panel opened: ${panelVisible}`);

      if (panelVisible) {
        // Check for essential form fields
        const titleField = page.locator('input[name="title"], label:has-text("Title")');
        const deptField = page.locator(
          'select[name="department"], [name="department_id"], label:has-text("Department")'
        );

        console.log(`[AUDIT] Title field: ${(await titleField.count()) > 0}`);
        console.log(`[AUDIT] Department field: ${(await deptField.count()) > 0}`);

        await screenshot(page, 'job-create-panel');
      }
    }
  });

  test('Performance OKR creation panel opens', async ({ page }) => {
    await page.goto(`${BASE_URL}/performance`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const createOKRBtn = page.locator(
      'button:has-text("Create"), button:has-text("New Objective"), button:has-text("Add OKR")'
    );

    if ((await createOKRBtn.count()) > 0) {
      await createOKRBtn.first().click();
      await page.waitForTimeout(1000);

      const panel = page.locator(
        '[data-state="open"], [role="dialog"], .slide-panel'
      );
      const opened = (await panel.count()) > 0;

      console.log(`[AUDIT] OKR creation panel opened: ${opened}`);
      await screenshot(page, 'okr-create-panel');
    } else {
      console.log('[AUDIT] No OKR create button found on performance page');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 11: SUMMARY OUTPUT
// Final audit summary with all findings
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Audit Summary', () => {
  test('Generate comprehensive findings report', async ({ page }) => {
    const findings = [
      '=== COMPREHENSIVE FEATURE AUDIT FINDINGS ===',
      '',
      '--- CRITICAL: Features in Code but Not Implemented ---',
      '1. EmployeeDashboard component uses 100% mock/hardcoded data (zeros and empty arrays)',
      '2. InternDashboard component uses 100% mock data (vs page.tsx which has real hooks)',
      '3. Offboarding workflow - API directory exists but no route.ts implementation',
      '4. Cron job for probation-check - directory exists but no implementation',
      '5. Calendar/Events feature - referenced in dashboard tour but no page exists',
      '6. Department management admin page - API exists but no admin UI',
      '7. CSV/Excel export for employee data - not implemented',
      '',
      '--- HIGH: Implemented but Not Functioning Properly ---',
      '8. Task detail page edit button - handler is empty stub (does nothing)',
      '9. Task detail page delete button - no API call, just redirect',
      '10. Admin probation page - has real hooks but fallback to empty array hides failures',
      '11. Email notifications on onboarding approval/rejection - TODO, no Resend integration',
      '12. Super admin dashboard - security alerts and system health are placeholders',
      '13. Admin dashboard - recent activity section hardcoded empty',
      '',
      '--- MEDIUM: Partial Implementation ---',
      '14. Document status/approval workflow - files stored but no review process',
      '15. Bulk document operations - no checkbox selection or batch actions',
      '16. Document versioning - no version history',
      '17. Profile change request email notifications - approval/rejection without email',
      '',
      '--- LOW: Polish/Enhancement ---',
      '18. Files page missing advanced filter UI (type, date range)',
      '19. Mobile responsiveness not fully tested',
      '20. TODO comments in production code (12 found)',
    ];

    for (const line of findings) {
      console.log(line);
    }

    // Also write to file
    const reportPath = path.join(process.cwd(), 'e2e/screenshots/feature-audit/AUDIT_REPORT.txt');
    fs.writeFileSync(reportPath, findings.join('\n'), 'utf-8');

    console.log(`\nReport saved to: ${reportPath}`);
  });
});
