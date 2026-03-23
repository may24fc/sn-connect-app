import { test, expect } from '@playwright/test';

test.describe('About page - Our Journey timeline scroll animation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/about');
    await page.waitForLoadState('networkidle');
  });

  test('timeline section renders with all milestones', async ({ page }) => {
    // Verify the section heading
    await expect(page.getByRole('heading', { name: 'Our Journey' })).toBeVisible();

    // Verify milestone years are rendered
    for (const year of ['2010', '2013', '2016', '2019', '2022', '2025']) {
      const yearElement = page.locator(`h3:has-text("${year}")`).first();
      await expect(yearElement).toBeAttached();
    }

    // Verify milestone titles
    for (const title of [
      'Company Founded',
      'SFO Launched',
      'UHP Established',
      '24 Fit Club Opens',
      'Construction Arm Expands',
      '500+ Employees Strong',
    ]) {
      await expect(page.locator(`h4:has-text("${title}")`).first()).toBeAttached();
    }
  });

  test('no icon elements should be present in timeline', async ({ page }) => {
    // Scroll to the timeline section
    const journeyHeading = page.getByRole('heading', { name: 'Our Journey' });
    await journeyHeading.scrollIntoViewIfNeeded();

    // No lucide-react SVG icons should be present in the timeline content area
    const timelineSection = page.locator('section').filter({ has: journeyHeading });
    const svgIcons = timelineSection.locator('.lucide');
    await expect(svgIcons).toHaveCount(0);
  });

  test('scroll progress line animates on scroll', async ({ page }) => {
    // Find the animated progress line (motion.div inside the vertical track)
    // The progress line is styled with bg-gradient-to-t from-amber-500
    const progressLine = page.locator('[style*="height"]').filter({
      has: page.locator('[class*="bg-gradient-to-t"]'),
    });

    // First, scroll to the timeline to trigger the animation
    const journeyHeading = page.getByRole('heading', { name: 'Our Journey' });
    await journeyHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // The vertical track container (the parent with the gradient background line)
    // should have a computed height > 0 (it wraps the timeline items)
    const trackContainer = page.locator('.absolute.overflow-hidden.w-\\[2px\\]').first();
    const trackHeight = await trackContainer.evaluate(
      (el) => parseFloat(el.style.height) || el.getBoundingClientRect().height,
    );
    expect(trackHeight).toBeGreaterThan(0);

    // Get the initial height of the animated progress div
    const animatedDiv = trackContainer.locator('div').first();
    const initialHeight = await animatedDiv.evaluate(
      (el) => parseFloat(getComputedStyle(el).height) || 0,
    );

    // Scroll further down to advance the animation
    await page.evaluate(() => window.scrollBy(0, 1500));
    await page.waitForTimeout(500);

    const midHeight = await animatedDiv.evaluate(
      (el) => parseFloat(getComputedStyle(el).height) || 0,
    );

    // Scroll to the end of the timeline
    await page.evaluate(() => window.scrollBy(0, 3000));
    await page.waitForTimeout(500);

    const finalHeight = await animatedDiv.evaluate(
      (el) => parseFloat(getComputedStyle(el).height) || 0,
    );

    // The animated progress line should grow as we scroll
    console.log(`Progress line heights -> initial: ${initialHeight}, mid: ${midHeight}, final: ${finalHeight}`);
    console.log(`Track container height: ${trackHeight}`);

    // At minimum, the track should have meaningful height
    expect(trackHeight).toBeGreaterThan(100);

    // The progress should increase as we scroll further
    expect(finalHeight).toBeGreaterThan(initialHeight);
  });

  test('screenshot: timeline before and after scroll', async ({ page }) => {
    // Scroll to the timeline
    const journeyHeading = page.getByRole('heading', { name: 'Our Journey' });
    await journeyHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'e2e/screenshots/timeline-before-scroll.png',
      fullPage: false,
    });

    // Scroll down significantly
    await page.evaluate(() => window.scrollBy(0, 2000));
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'e2e/screenshots/timeline-after-scroll.png',
      fullPage: false,
    });
  });
});
