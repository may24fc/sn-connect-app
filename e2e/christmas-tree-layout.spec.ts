import { expect, test } from '@playwright/test';

const unlockedCategory = {
  isUnlocked: true,
  isEditable: true,
  teaser: null,
  opensAt: '2026-10-01T00:00:00+08:00',
  closesAt: '2026-12-31T23:59:59+08:00',
};

const baseEvent = {
  id: 'christmas-event-2026',
  title: 'SN Christmas Wish Tree 2026',
  timezone: 'Asia/Manila',
  visibleUntil: '2027-01-15T23:59:59+08:00',
  categories: {
    personal: unlockedCategory,
    for_others: unlockedCategory,
    for_sn: unlockedCategory,
  },
};

const decoration = {
  garland_unlocked: false,
  lights_unlocked: false,
  star_unlocked: false,
};

const emptySnapshot = {
  event: baseEvent,
  decoration,
  myOrnament: null,
  ornaments: [],
};

const populatedSnapshot = {
  event: baseEvent,
  decoration,
  myOrnament: {
    id: 'ornament-1',
    user_id: 'emp-1',
    asset_type: 'red',
    position_x: 52,
    position_y: 46,
  },
  ornaments: [
    {
      id: 'ornament-1',
      ownerName: 'Sample Employee',
      assetType: 'red',
      positionX: 52,
      positionY: 46,
      wishes: [],
    },
  ],
};

async function useMockEmployee(page: Parameters<typeof test>[0]['page']) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'emp-1',
        name: 'Sample Employee',
        email: 'employee@test.com',
        role: 'employee',
        isOnboardingComplete: true,
      })
    );
  });
}

test.describe('Christmas Tree layout stability', () => {
  test('keeps the tree canvas stable when placement reveals the long wish panel', async ({
    page,
  }, testInfo) => {
    let hasOrnament = false;
    const consoleErrors: Array<string> = [];
    const failedRequests: Array<string> = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('requestfailed', (request) => failedRequests.push(request.url()));
    await useMockEmployee(page);

    await page.route('https://www.youtube-nocookie.com/embed/**', async (route) => {
      await route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>Music</title>',
      });
    });

    await page.route('**/api/christmas-tree/current', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: hasOrnament ? populatedSnapshot : emptySnapshot }),
      });
    });
    await page.route('**/api/christmas-tree/ornament', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      hasOrnament = true;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: populatedSnapshot }),
      });
    });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/christmas-tree');
    await expect(page.getByTestId('christmas-tree-loading')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Place your Christmas ball' })).toBeVisible();
    const musicToggle = page.getByRole('button', { name: 'Turn Christmas music off' });
    await expect(musicToggle).toBeVisible();
    await expect(musicToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('christmas-music-player')).toHaveCount(1);

    await musicToggle.click();
    await expect(page.getByRole('button', { name: 'Turn Christmas music on' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    await expect(page.getByTestId('christmas-music-player')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('christmas-tree-music-enabled'))).toBe(
      'false'
    );

    await page.getByRole('button', { name: 'Turn Christmas music on' }).click();
    await expect(page.getByTestId('christmas-music-player')).toHaveCount(1);
    await expect(page.getByTestId('christmas-music-player')).toHaveAttribute('src', /mmJ-KiSIsD4/);
    expect(await page.evaluate(() => localStorage.getItem('christmas-tree-music-enabled'))).toBe(
      'true'
    );

    const canvas = page.getByTestId('christmas-tree-canvas');
    const beforeBox = await canvas.boundingBox();
    if (!beforeBox) throw new Error('Christmas Tree canvas was not measurable before placement');
    await page.screenshot({
      path: testInfo.outputPath('desktop-before-placement.png'),
      fullPage: true,
    });

    await page.getByRole('button', { name: 'Place red Christmas ball' }).click();
    const dropZone = page.getByTestId('christmas-tree-drop-zone');
    const dropBox = await dropZone.boundingBox();
    if (!dropBox) throw new Error('Christmas Tree drop zone was not measurable');
    await dropZone.click({ position: { x: dropBox.width * 0.5, y: dropBox.height * 0.45 } });

    await expect(page.getByText('Your Christmas Wishes')).toBeVisible();
    const afterBox = await canvas.boundingBox();
    if (!afterBox) throw new Error('Christmas Tree canvas was not measurable after placement');
    expect(Math.abs(afterBox.height - beforeBox.height)).toBeLessThanOrEqual(2);
    expect(Math.abs(afterBox.width - beforeBox.width)).toBeLessThanOrEqual(2);
    await page.mouse.move(5, 5);
    await page.screenshot({
      path: testInfo.outputPath('desktop-after-placement.png'),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByText('Your Christmas Wishes')).toBeVisible();
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
    await page.screenshot({
      path: testInfo.outputPath('mobile-after-placement.png'),
      fullPage: true,
    });

    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.screenshot({
      path: testInfo.outputPath('mobile-dark-after-placement.png'),
      fullPage: true,
    });

    const featureRequestFailures = failedRequests.filter(
      (url) => url.includes('/api/christmas-tree') || url.includes('youtube-nocookie.com')
    );
    expect(featureRequestFailures).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('restores a saved music opt-out on a new page visit', async ({ page }) => {
    const consoleErrors: Array<string> = [];
    const featureRequestFailures: Array<string> = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('requestfailed', (request) => {
      const url = request.url();
      if (url.includes('/api/christmas-tree') || url.includes('youtube-nocookie.com')) {
        featureRequestFailures.push(url);
      }
    });
    await useMockEmployee(page);
    await page.addInitScript(() => {
      localStorage.setItem('christmas-tree-music-enabled', 'false');
    });
    await page.route('**/api/christmas-tree/current', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: emptySnapshot }),
      });
    });

    await page.goto('/christmas-tree');
    await expect(page.getByRole('heading', { name: 'Place your Christmas ball' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Turn Christmas music on' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    await expect(page.getByTestId('christmas-music-player')).toHaveCount(0);
    expect(featureRequestFailures).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('shows the API error state without rendering the split layout', async ({ page }) => {
    await useMockEmployee(page);
    await page.route('**/api/christmas-tree/current', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unable to load the Christmas Tree.' }),
      });
    });

    await page.goto('/christmas-tree');
    await expect(page.getByText('Unable to load the Christmas Tree.')).toBeVisible();
    await expect(page.getByTestId('christmas-tree-canvas')).toHaveCount(0);
  });
});
