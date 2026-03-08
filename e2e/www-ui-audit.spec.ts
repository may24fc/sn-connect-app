import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:3000';

// Helper: full-page screenshot with scrolling
async function fullPageScreenshot(page: Page, name: string) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500); // let animations settle
  await page.screenshot({
    path: `e2e/screenshots/www-audit/${name}.png`,
    fullPage: true,
  });
}

// Helper: viewport-only screenshot
async function viewportScreenshot(page: Page, name: string) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.screenshot({
    path: `e2e/screenshots/www-audit/${name}.png`,
  });
}

test.describe('WWW Corporate Site — UI/UX Audit', () => {
  test.setTimeout(120000);

  // ─── HOME PAGE ───
  test('Home — full page', async ({ page }) => {
    await page.goto(BASE);
    await fullPageScreenshot(page, '01-home-full');
  });

  test('Home — hero above the fold', async ({ page }) => {
    await page.goto(BASE);
    await viewportScreenshot(page, '02-home-hero');
  });

  test('Home — header/nav', async ({ page }) => {
    await page.goto(BASE);
    const header = page.locator('header').first();
    await header.screenshot({ path: 'e2e/screenshots/www-audit/03-home-header.png' });
  });

  test('Home — mega menu (businesses)', async ({ page }) => {
    await page.goto(BASE);
    // Hover over Businesses nav link
    const businessesLink = page.locator('nav a, nav button, nav span').filter({ hasText: 'Businesses' }).first();
    if (await businessesLink.isVisible()) {
      await businessesLink.hover();
      await page.waitForTimeout(500);
      await viewportScreenshot(page, '04-home-megamenu');
    }
  });

  test('Home — mobile nav', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE);
    await viewportScreenshot(page, '05-home-mobile');
    // Open mobile menu
    const menuBtn = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"]').first();
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(500);
      await viewportScreenshot(page, '06-home-mobile-menu');
    }
  });

  test('Home — footer', async ({ page }) => {
    await page.goto(BASE);
    const footer = page.locator('footer').first();
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await footer.screenshot({ path: 'e2e/screenshots/www-audit/07-home-footer.png' });
  });

  // ─── ABOUT PAGE ───
  test('About — full page', async ({ page }) => {
    await page.goto(`${BASE}/about`);
    await fullPageScreenshot(page, '08-about-full');
  });

  test('About — CEO message section', async ({ page }) => {
    await page.goto(`${BASE}/about`);
    // Look for CEO section
    const ceoSection = page.locator('text=CEO').first();
    if (await ceoSection.isVisible()) {
      await ceoSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await viewportScreenshot(page, '09-about-ceo');
    }
  });

  // ─── BUSINESSES PAGE ───
  test('Businesses — full page', async ({ page }) => {
    await page.goto(`${BASE}/businesses`);
    await fullPageScreenshot(page, '10-businesses-full');
  });

  test('Businesses — SFO detail page', async ({ page }) => {
    await page.goto(`${BASE}/businesses/sfo-food-service`);
    await fullPageScreenshot(page, '11-business-sfo-full');
  });

  test('Businesses — detail inquiry form', async ({ page }) => {
    await page.goto(`${BASE}/businesses/sfo-food-service`);
    // Look for inquiry button
    const inquiryBtn = page.locator('button').filter({ hasText: /inquir/i }).first();
    if (await inquiryBtn.isVisible()) {
      await inquiryBtn.click();
      await page.waitForTimeout(500);
      await viewportScreenshot(page, '12-business-inquiry-form');
    }
  });

  // ─── CAREERS PAGE ───
  test('Careers — full page', async ({ page }) => {
    await page.goto(`${BASE}/careers`);
    await fullPageScreenshot(page, '13-careers-full');
  });

  test('Careers — job card detail', async ({ page }) => {
    // Visit the first placeholder job
    await page.goto(`${BASE}/careers`);
    const jobLink = page.locator('a[href*="/careers/"]').first();
    if (await jobLink.isVisible()) {
      await jobLink.click();
      await page.waitForLoadState('networkidle');
      await fullPageScreenshot(page, '14-careers-job-detail');
    }
  });

  // ─── CONTACT PAGE ───
  test('Contact — full page', async ({ page }) => {
    await page.goto(`${BASE}/contact`);
    await fullPageScreenshot(page, '15-contact-full');
  });

  test('Contact — form section', async ({ page }) => {
    await page.goto(`${BASE}/contact`);
    const form = page.locator('form').first();
    if (await form.isVisible()) {
      await form.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await viewportScreenshot(page, '16-contact-form');
    }
  });

  // ─── LIFE AT SN PAGE ───
  test('Life at SN — full page', async ({ page }) => {
    await page.goto(`${BASE}/life-at-sn`);
    await fullPageScreenshot(page, '17-life-full');
  });

  test('Life at SN — culture highlights', async ({ page }) => {
    await page.goto(`${BASE}/life-at-sn`);
    await page.waitForTimeout(1000);
    // Scroll to culture section
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(500);
    await viewportScreenshot(page, '18-life-culture');
  });

  test('Life at SN — photo gallery', async ({ page }) => {
    await page.goto(`${BASE}/life-at-sn`);
    // Find the masonry grid
    const galleryHeading = page.locator('text=Moments').first();
    if (await galleryHeading.isVisible()) {
      await galleryHeading.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await viewportScreenshot(page, '19-life-gallery');
    }
  });

  // ─── TEAM PAGE ───
  test('Team — full page', async ({ page }) => {
    await page.goto(`${BASE}/team`);
    await fullPageScreenshot(page, '20-team-full');
  });

  test('Team — executive portraits', async ({ page }) => {
    await page.goto(`${BASE}/team`);
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);
    await viewportScreenshot(page, '21-team-executives');
  });

  // ─── PORTAL PAGE ───
  test('Portal — full page', async ({ page }) => {
    await page.goto(`${BASE}/portal`);
    await fullPageScreenshot(page, '22-portal-full');
  });

  // ─── CROSS-CUTTING CHECKS ───
  test('Responsive — tablet viewport (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(BASE);
    await fullPageScreenshot(page, '23-home-tablet');
    await page.goto(`${BASE}/about`);
    await fullPageScreenshot(page, '24-about-tablet');
    await page.goto(`${BASE}/careers`);
    await fullPageScreenshot(page, '25-careers-tablet');
  });

  test('Accessibility — heading hierarchy check', async ({ page }) => {
    const pages = ['/', '/about', '/businesses', '/careers', '/contact', '/life-at-sn', '/team'];
    const issues: string[] = [];

    for (const path of pages) {
      await page.goto(`${BASE}${path}`);
      await page.waitForLoadState('domcontentloaded');

      // Check heading hierarchy
      const headings = await page.evaluate(() => {
        const hs = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        return Array.from(hs).map((h) => ({
          tag: h.tagName,
          text: h.textContent?.trim().slice(0, 50) || '',
        }));
      });

      const h1Count = headings.filter((h) => h.tag === 'H1').length;
      if (h1Count === 0) issues.push(`${path}: No H1 found`);
      if (h1Count > 1) issues.push(`${path}: Multiple H1s (${h1Count})`);

      // Check for skipped levels
      let lastLevel = 0;
      for (const h of headings) {
        const level = parseInt(h.tag[1]);
        if (lastLevel > 0 && level > lastLevel + 1) {
          issues.push(`${path}: Heading skip from H${lastLevel} to ${h.tag} ("${h.text}")`);
        }
        lastLevel = level;
      }
    }

    // Log issues — we don't fail the test, just report
    if (issues.length > 0) {
      console.log('\n=== HEADING HIERARCHY ISSUES ===');
      issues.forEach((i) => console.log(`  ⚠  ${i}`));
    }
  });

  test('Links — check for dead internal links', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    const links = await page.evaluate(() => {
      const anchors = document.querySelectorAll('a[href^="/"]');
      return Array.from(new Set(Array.from(anchors).map((a) => a.getAttribute('href')).filter(Boolean)));
    });

    const deadLinks: string[] = [];
    for (const link of links) {
      if (!link) continue;
      const resp = await page.goto(`${BASE}${link}`);
      if (resp && resp.status() >= 400) {
        deadLinks.push(`${link} → ${resp.status()}`);
      }
    }

    if (deadLinks.length > 0) {
      console.log('\n=== DEAD INTERNAL LINKS ===');
      deadLinks.forEach((l) => console.log(`  ✗  ${l}`));
    }
  });

  test('Performance — check for missing images', async ({ page }) => {
    const pages = ['/', '/about', '/businesses', '/careers', '/contact', '/life-at-sn', '/team'];
    const brokenImages: string[] = [];

    for (const path of pages) {
      await page.goto(`${BASE}${path}`);
      await page.waitForLoadState('networkidle');

      const broken = await page.evaluate(() => {
        const imgs = document.querySelectorAll('img');
        return Array.from(imgs)
          .filter((img) => !img.complete || img.naturalWidth === 0)
          .map((img) => img.src || img.getAttribute('data-src') || 'unknown');
      });

      broken.forEach((src) => brokenImages.push(`${path}: ${src}`));
    }

    if (brokenImages.length > 0) {
      console.log('\n=== BROKEN/MISSING IMAGES ===');
      brokenImages.forEach((i) => console.log(`  ✗  ${i}`));
    }
  });

  test('Color contrast — text on backgrounds', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    // Check for low-contrast text patterns
    const contrastIssues = await page.evaluate(() => {
      const issues: string[] = [];
      const elements = document.querySelectorAll('p, span, a, h1, h2, h3, h4, h5, h6, li, label');
      
      for (const el of Array.from(elements).slice(0, 100)) {
        const style = window.getComputedStyle(el);
        const color = style.color;
        const bg = style.backgroundColor;
        const opacity = parseFloat(style.opacity);
        
        if (opacity < 0.5 && el.textContent && el.textContent.trim().length > 0) {
          issues.push(`Low opacity (${opacity}): "${el.textContent.trim().slice(0, 30)}"`);
        }
      }
      return issues;
    });

    if (contrastIssues.length > 0) {
      console.log('\n=== CONTRAST ISSUES ===');
      contrastIssues.forEach((i) => console.log(`  ⚠  ${i}`));
    }
  });

  test('Animation — scroll reveal effects', async ({ page }) => {
    await page.goto(`${BASE}/about`);
    await page.waitForLoadState('networkidle');

    // Scroll through page to trigger animations
    const scrollPositions = [200, 400, 600, 800, 1000, 1200];
    for (let i = 0; i < scrollPositions.length; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollPositions[i]);
      await page.waitForTimeout(600);
    }
    await viewportScreenshot(page, '26-about-after-scroll');
  });

  test('Typography — font consistency audit', async ({ page }) => {
    const pages = ['/', '/about', '/businesses', '/careers'];
    const fontData: Record<string, string[]> = {};

    for (const path of pages) {
      await page.goto(`${BASE}${path}`);
      await page.waitForLoadState('domcontentloaded');

      const fonts = await page.evaluate(() => {
        const elements = document.querySelectorAll('h1, h2, h3, p, a, span, button');
        const families = new Set<string>();
        for (const el of Array.from(elements).slice(0, 50)) {
          const style = window.getComputedStyle(el);
          families.add(style.fontFamily.split(',')[0].trim().replace(/['"]/g, ''));
        }
        return Array.from(families);
      });

      fontData[path] = fonts;
    }

    console.log('\n=== FONT FAMILIES IN USE ===');
    for (const [path, fonts] of Object.entries(fontData)) {
      console.log(`  ${path}: ${fonts.join(', ')}`);
    }
  });

  test('Spacing — visual rhythm audit', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    const spacingData = await page.evaluate(() => {
      const sections = document.querySelectorAll('section, [class*="section"], main > div');
      return Array.from(sections).slice(0, 10).map((s) => {
        const style = window.getComputedStyle(s);
        return {
          tag: s.tagName,
          class: s.className.slice(0, 80),
          paddingTop: style.paddingTop,
          paddingBottom: style.paddingBottom,
          marginTop: style.marginTop,
          marginBottom: style.marginBottom,
        };
      });
    });

    console.log('\n=== SECTION SPACING ===');
    spacingData.forEach((s) => {
      console.log(`  ${s.tag} (${s.class})`);
      console.log(`    padding: ${s.paddingTop} / ${s.paddingBottom}  margin: ${s.marginTop} / ${s.marginBottom}`);
    });
  });
});
