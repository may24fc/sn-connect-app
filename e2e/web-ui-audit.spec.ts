import { expect, test, Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Comprehensive UI/UX Audit for apps/web (HR Portal)
 *
 * This audit captures screenshots, tests responsiveness, accessibility,
 * and specifically evaluates slide-panel components for sizing issues.
 */

const BASE_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = 'e2e/screenshots/web-audit';

// Test credentials - use the same env vars as existing auth tests
const authEmail = process.env.E2E_AUTH_EMAIL ?? 'admin@test.com';
const authPassword = process.env.E2E_AUTH_PASSWORD ?? 'password';

// Ensure screenshot directory exists
test.beforeAll(async () => {
  const dir = path.join(process.cwd(), SCREENSHOT_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper to capture screenshot
async function captureScreenshot(page: Page, name: string) {
  const screenshotPath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

// Helper to login
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Fill credentials
  const emailInput = page.getByLabel('Email');
  if (await emailInput.isVisible()) {
    await emailInput.fill(authEmail);
    await page.locator('#password').fill(authPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/(dashboard|admin|super-admin|intern|onboarding)/, { timeout: 15000 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: PUBLIC PAGES (NO AUTH REQUIRED)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Public Pages Audit', () => {
  test('Login page - UI consistency', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Screenshot
    await captureScreenshot(page, '01-login-page');

    // Check key elements
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

    // Check for proper form structure
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Check responsive behavior
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile
    await captureScreenshot(page, '01-login-page-mobile');

    await page.setViewportSize({ width: 768, height: 1024 }); // Tablet
    await captureScreenshot(page, '01-login-page-tablet');
  });

  test('Forgot password page - UI consistency', async ({ page }) => {
    await page.goto(`${BASE_URL}/forgot-password`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '03-forgot-password-page');

    // Check key elements
    await expect(page.getByLabel('Email')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: AUTHENTICATED PAGES - EMPLOYEE ROUTES
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Employee Dashboard Audit', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Dashboard - layout and responsiveness', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Let animations settle

    await captureScreenshot(page, '10-employee-dashboard');

    // Check sidebar visibility
    const sidebar = page.locator('[data-testid="sidebar"], aside, nav').first();
    if (await sidebar.isVisible()) {
      // Verify sidebar navigation items
      const navItems = await sidebar.locator('a').count();
      expect(navItems).toBeGreaterThan(0);
    }

    // Mobile responsiveness
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await captureScreenshot(page, '10-employee-dashboard-mobile');

    // Check if mobile menu/hamburger appears
    const mobileMenuBtn = page.locator('[aria-label*="menu"], button:has(svg)').first();
    if (await mobileMenuBtn.isVisible()) {
      await mobileMenuBtn.click();
      await page.waitForTimeout(300);
      await captureScreenshot(page, '10-employee-dashboard-mobile-menu-open');
    }
  });

  test('Profile page - form layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '11-profile-page');

    // Check for profile form elements
    await page.setViewportSize({ width: 375, height: 667 });
    await captureScreenshot(page, '11-profile-page-mobile');
  });

  test('Files page - 201 file management', async ({ page }) => {
    await page.goto(`${BASE_URL}/files`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '12-files-page');
  });

  test('Tasks page - task list and interactions', async ({ page }) => {
    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '13-tasks-page');

    // Check for task creation button
    const createBtn = page.getByRole('button', { name: /create|add|new/i });
    if (await createBtn.isVisible()) {
      // Click to test slide panel
      await createBtn.click();
      await page.waitForTimeout(500);
      await captureScreenshot(page, '13-tasks-page-slide-panel');

      // Measure slide panel width
      const slidePanel = page.locator('[role="dialog"], [data-state="open"]').first();
      if (await slidePanel.isVisible()) {
        const box = await slidePanel.boundingBox();
        if (box) {
          console.log(`Tasks SlidePanel width: ${box.width}px`);
        }
      }
    }
  });

  test('Reports page - report submission', async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '14-reports-page');
  });

  test('Announcements page - announcement list', async ({ page }) => {
    await page.goto(`${BASE_URL}/announcements`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '15-announcements-page');
  });

  test('Notifications page - notification list', async ({ page }) => {
    await page.goto(`${BASE_URL}/notifications`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '16-notifications-page');
  });

  test('Information Hub page - resources', async ({ page }) => {
    await page.goto(`${BASE_URL}/information-hub`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '17-information-hub-page');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: PERFORMANCE MODULE - SLIDE PANELS FOCUS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Performance Module - SlidePanel Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Performance page - OKR creation slide panel sizing', async ({ page }) => {
    await page.goto(`${BASE_URL}/performance`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await captureScreenshot(page, '20-performance-page');

    // Look for "Create OKR" or similar button
    const createBtn = page.getByRole('button', { name: /create|add|new/i }).first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(500);

      // Capture slide panel
      const slidePanel = page.locator('[role="dialog"]').first();
      if (await slidePanel.isVisible()) {
        await captureScreenshot(page, '20-performance-create-okr-slide-panel');

        const box = await slidePanel.boundingBox();
        if (box) {
          console.log(`Performance SlidePanel width: ${box.width}px`);
          console.log(`Performance SlidePanel height: ${box.height}px`);

          // Check if panel is too narrow for complex forms
          // Current sizes: sm=384, md=448, lg=512, xl=576
          // Recommend: 2xl=672 or 3xl=768 for complex forms
          if (box.width < 600) {
            console.log('⚠️ SlidePanel may be too narrow for complex OKR forms');
          }
        }

        // Check form fields within the panel
        const formFields = await slidePanel.locator('input, textarea, select').count();
        console.log(`Form fields in panel: ${formFields}`);
      }
    }
  });

  test('OKRs detail page - key result slide panel', async ({ page }) => {
    await page.goto(`${BASE_URL}/performance/okrs`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '21-okrs-list-page');

    // Try to click on an OKR to see detail
    const okrLink = page.locator('a[href*="/performance/okrs/"]').first();
    if (await okrLink.isVisible()) {
      await okrLink.click();
      await page.waitForLoadState('networkidle');
      await captureScreenshot(page, '21-okr-detail-page');

      // Look for "Add Key Result" button
      const addKeyResultBtn = page.getByRole('button', { name: /add.*key.*result|create.*key.*result/i });
      if (await addKeyResultBtn.isVisible()) {
        await addKeyResultBtn.click();
        await page.waitForTimeout(500);
        await captureScreenshot(page, '21-okr-add-key-result-slide-panel');
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: ADMIN PAGES
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Admin Pages Audit', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Admin Dashboard - overview layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/dashboard`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '30-admin-dashboard');

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await captureScreenshot(page, '30-admin-dashboard-mobile');
  });

  test('Admin Directory - employee list', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/directory`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '31-admin-directory');
  });

  test('Admin Employee Management', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/employee-management`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '32-admin-employee-management');
  });

  test('Admin Interns - intern management', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/interns`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '33-admin-interns');
  });

  test('Admin Jobs - job listings and slide panel', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/jobs`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '34-admin-jobs');

    // Test job creation slide panel
    const createBtn = page.getByRole('button', { name: /create|add|new|post/i }).first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(500);
      await captureScreenshot(page, '34-admin-jobs-create-slide-panel');

      const slidePanel = page.locator('[role="dialog"]').first();
      if (await slidePanel.isVisible()) {
        const box = await slidePanel.boundingBox();
        if (box) {
          console.log(`Jobs SlidePanel width: ${box.width}px`);
        }
      }
    }
  });

  test('Admin Job Applications - slide panel analysis', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/jobs/applications`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '35-admin-job-applications');

    // Click on an application to view slide panel
    const applicationRow = page.locator('tr, [role="row"]').nth(1);
    if (await applicationRow.isVisible()) {
      await applicationRow.click();
      await page.waitForTimeout(500);

      const slidePanel = page.locator('[role="dialog"]').first();
      if (await slidePanel.isVisible()) {
        await captureScreenshot(page, '35-admin-job-application-detail-slide-panel');

        const box = await slidePanel.boundingBox();
        if (box) {
          console.log(`Applications SlidePanel width: ${box.width}px`);
        }
      }
    }
  });

  test('Admin Announcements', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/announcements`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '36-admin-announcements');
  });

  test('Admin Reports', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/reports`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '37-admin-reports');
  });

  test('Admin Performance', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/performance`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '38-admin-performance');
  });

  test('Admin Resources', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/resources`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '39-admin-resources');
  });

  test('Admin AI Knowledge', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/ai-knowledge`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '40-admin-ai-knowledge');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: SUPER ADMIN PAGES
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Super Admin Pages Audit', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Super Admin Dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/super-admin/dashboard`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '50-super-admin-dashboard');
  });

  test('Super Admin Payroll Approvals', async ({ page }) => {
    await page.goto(`${BASE_URL}/super-admin/payroll-approvals`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '51-super-admin-payroll-approvals');
  });

  test('Super Admin AI Knowledge', async ({ page }) => {
    await page.goto(`${BASE_URL}/super-admin/ai-knowledge`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '52-super-admin-ai-knowledge');
  });

  test('Super Admin Tasks', async ({ page }) => {
    await page.goto(`${BASE_URL}/super-admin/tasks`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '53-super-admin-tasks');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: INTERN PAGES
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Intern Pages Audit', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Intern Dashboard - daily log slide panel', async ({ page }) => {
    await page.goto(`${BASE_URL}/intern/dashboard`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '60-intern-dashboard');

    // Test daily log creation slide panel
    const createBtn = page.getByRole('button', { name: /add.*log|create.*log|new.*entry/i });
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(500);
      await captureScreenshot(page, '60-intern-daily-log-slide-panel');

      const slidePanel = page.locator('[role="dialog"]').first();
      if (await slidePanel.isVisible()) {
        const box = await slidePanel.boundingBox();
        if (box) {
          console.log(`Intern Daily Log SlidePanel width: ${box.width}px`);
        }
      }
    }
  });

  test('Intern Reports', async ({ page }) => {
    await page.goto(`${BASE_URL}/intern/reports`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '61-intern-reports');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: ONBOARDING FLOW
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Onboarding Flow Audit', () => {
  test('Onboarding page - step wizard', async ({ page }) => {
    // This may redirect based on user state
    await page.goto(`${BASE_URL}/onboarding`);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, '70-onboarding-flow');

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await captureScreenshot(page, '70-onboarding-flow-mobile');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8: UI CONSISTENCY CHECKS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('UI Consistency Audit', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Button consistency across pages', async ({ page }) => {
    const buttonClasses: Set<string> = new Set();

    // Sample pages
    const pages = ['/dashboard', '/tasks', '/admin/dashboard'];

    for (const pagePath of pages) {
      await page.goto(`${BASE_URL}${pagePath}`);
      await page.waitForLoadState('networkidle');

      const buttons = await page.locator('button').all();
      for (const btn of buttons.slice(0, 5)) {
        const className = await btn.getAttribute('class');
        if (className) {
          buttonClasses.add(className.split(' ').sort().join(' '));
        }
      }
    }

    console.log('Unique button class patterns:', buttonClasses.size);
  });

  test('Color consistency - primary color usage', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Check for indigo-600 (primary) usage in buttons
    const primaryButtons = await page.locator('.bg-indigo-600, .text-indigo-600').count();
    console.log(`Primary color elements found: ${primaryButtons}`);
  });

  test('Typography consistency', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Check heading hierarchy
    const h1Count = await page.locator('h1').count();
    const h2Count = await page.locator('h2').count();
    const h3Count = await page.locator('h3').count();

    console.log(`Headings: h1=${h1Count}, h2=${h2Count}, h3=${h3Count}`);
  });

  test('Form field consistency', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForLoadState('networkidle');

    // Check for consistent input styling
    const inputs = await page.locator('input[type="text"], input[type="email"]').all();
    const inputClasses: Set<string> = new Set();

    for (const input of inputs.slice(0, 10)) {
      const className = await input.getAttribute('class');
      if (className) {
        inputClasses.add(className);
      }
    }

    console.log(`Unique input styles: ${inputClasses.size}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 9: ACCESSIBILITY BASICS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Accessibility Basics', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Focus indicators visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Tab through the page
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    await captureScreenshot(page, '90-focus-indicators');
  });

  test('Buttons have accessible names', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const buttons = await page.locator('button').all();
    let buttonsWithoutLabel = 0;

    for (const btn of buttons) {
      const ariaLabel = await btn.getAttribute('aria-label');
      const text = await btn.textContent();
      const title = await btn.getAttribute('title');

      if (!ariaLabel && !text?.trim() && !title) {
        buttonsWithoutLabel++;
      }
    }

    console.log(`Buttons without accessible name: ${buttonsWithoutLabel}`);
  });

  test('Images have alt text', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const images = await page.locator('img').all();
    let imagesWithoutAlt = 0;

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      if (!alt) {
        imagesWithoutAlt++;
      }
    }

    console.log(`Images without alt text: ${imagesWithoutAlt}`);
  });

  test('Color contrast - check for low contrast text', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Check for zinc-400/zinc-500 text which might have contrast issues
    const lowContrastElements = await page.locator('.text-zinc-400, .text-zinc-300').count();
    console.log(`Potentially low contrast text elements: ${lowContrastElements}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 10: SLIDE PANEL COMPREHENSIVE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('SlidePanel Sizing Deep Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Measure all slide panel instances', async ({ page }) => {
    const panelMeasurements: { page: string; width: number; height: number }[] = [];

    // Pages with known slide panels
    const pagesWithPanels = [
      { url: '/performance', trigger: /create|add|new/i },
      { url: '/performance/okrs', trigger: /create|add|new/i },
      { url: '/admin/jobs', trigger: /create|add|new|post/i },
      { url: '/intern/dashboard', trigger: /add.*log|create|new/i },
    ];

    for (const { url, trigger } of pagesWithPanels) {
      await page.goto(`${BASE_URL}${url}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const btn = page.getByRole('button', { name: trigger }).first();
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(500);

        const dialog = page.locator('[role="dialog"]').first();
        if (await dialog.isVisible()) {
          const box = await dialog.boundingBox();
          if (box) {
            panelMeasurements.push({
              page: url,
              width: Math.round(box.width),
              height: Math.round(box.height),
            });
          }

          // Close the panel
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      }
    }

    console.log('\n═══ SlidePanel Measurements ═══');
    for (const m of panelMeasurements) {
      const recommendation =
        m.width < 600 ? '⚠️ Consider wider size' : '✓ Adequate width';
      console.log(`${m.page}: ${m.width}px × ${m.height}px — ${recommendation}`);
    }

    // Current available sizes
    console.log('\n═══ Current Size Options ═══');
    console.log('sm: 384px (max-w-sm)');
    console.log('md: 448px (max-w-md)');
    console.log('lg: 512px (max-w-lg)');
    console.log('xl: 576px (max-w-xl)');
    console.log('\n═══ Recommended Additions ═══');
    console.log('2xl: 672px (max-w-2xl) — for complex forms');
    console.log('3xl: 768px (max-w-3xl) — for detailed views');
    console.log('full: 100% - 2rem — for data-heavy panels');
  });
});
