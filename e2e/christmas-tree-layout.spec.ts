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
  strands: [],
  permissions: { canManage: false },
  myOrnament: null,
  ornaments: [],
};

const populatedSnapshot = {
  event: baseEvent,
  decoration,
  strands: [],
  permissions: { canManage: false },
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
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/notifications') {
      await route.fulfill({
        json: {
          data: [],
          unreadCount: 0,
          pagination: { page: 1, pageSize: 5, total: 0, totalPages: 0 },
        },
      });
      return;
    }
    await route.fulfill({ json: { data: [] } });
  });
}

async function useMockManager(
  page: Parameters<typeof test>[0]['page'],
  role: 'admin' | 'super_admin'
) {
  await page.addInitScript((managerRole) => {
    localStorage.setItem('christmas-tree-music-enabled', 'false');
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: `${managerRole}-1`,
        name: managerRole === 'admin' ? 'Admin User' : 'Super Admin',
        email: `${managerRole}@test.com`,
        role: managerRole,
        isOnboardingComplete: true,
      })
    );
  }, role);
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/notifications') {
      await route.fulfill({
        json: {
          data: [],
          unreadCount: 0,
          pagination: { page: 1, pageSize: 5, total: 0, totalPages: 0 },
        },
      });
      return;
    }
    await route.fulfill({ json: { data: [] } });
  });
}

test.describe('Christmas Tree layout stability', () => {
  test('keeps the tree canvas stable when placement reveals the long wish panel', async ({
    page,
  }, testInfo) => {
    let hasOrnament = false;
    const savedWishPayloads: Array<{
      category: 'personal' | 'for_others' | 'for_sn';
      itemNumber: number;
      content: string;
      linkUrl: string;
    }> = [];
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
    await page.route('https://www.youtube.com/iframe_api', async (route) => {
      await route.fulfill({
        contentType: 'application/javascript',
        body: `
          window.YT = {
            Player: function (_element, options) {
              this.destroy = function () {};
              this.playVideo = function () { window.__christmasMusicPlayed = true; };
              this.setVolume = function (volume) { window.__christmasMusicVolume = volume; };
              setTimeout(() => options.events.onReady({ target: this }), 0);
            }
          };
          window.onYouTubeIframeAPIReady?.();
        `,
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
    await page.route('**/api/christmas-tree/wishes', async (route) => {
      if (route.request().method() !== 'PUT') return route.fallback();
      const payload = route.request().postDataJSON() as (typeof savedWishPayloads)[number];
      savedWishPayloads.push(payload);
      const wishes = savedWishPayloads.map((wish) => ({
        ornament_id: 'ornament-1',
        category: wish.category,
        item_number: wish.itemNumber,
        content: wish.content,
        link_url: wish.linkUrl || null,
        submitted_at: '2026-10-16T01:00:00Z',
      }));
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            ...populatedSnapshot,
            ornaments: populatedSnapshot.ornaments.map((ornament) => ({ ...ornament, wishes })),
          },
        }),
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
    await expect
      .poll(() => page.evaluate(() => Reflect.get(window, '__christmasMusicVolume')))
      .toBe(25);
    await expect
      .poll(() => page.evaluate(() => Reflect.get(window, '__christmasMusicPlayed')))
      .toBe(true);

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
    await expect(page.getByRole('tab', { name: 'Personal' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(page.getByText(/Locked until|Submission window closed/)).toHaveCount(0);
    await expect(page.getByPlaceholder('Optional link (https://...)')).toHaveCount(3);
    await expect(page.getByLabel('Optional link for personal wish 1')).toBeVisible();
    for (const itemNumber of [1, 2, 3]) {
      const editor = page.getByTestId(`wish-editor-personal-${itemNumber}`);
      await editor
        .getByPlaceholder(`Personal wish ${itemNumber}`)
        .fill(`Personal wish number ${itemNumber}`);
      await editor.getByRole('button', { name: /Save wish|Save changes/ }).click();
      await expect.poll(() => savedWishPayloads.length).toBe(itemNumber);
    }
    expect(savedWishPayloads.map(({ itemNumber }) => itemNumber)).toEqual([1, 2, 3]);

    await page.getByRole('tab', { name: 'Others' }).click();
    const othersPanel = page.getByRole('tabpanel', { name: 'Others' });
    await expect(othersPanel.getByRole('heading', { name: 'Wish for Others' })).toBeVisible();
    await expect(othersPanel.getByPlaceholder('Optional link')).toHaveCount(0);
    await othersPanel.getByPlaceholder('Write your wish').fill('A wish for someone else');
    await othersPanel.getByRole('button', { name: 'Save wish' }).click();
    await expect.poll(() => savedWishPayloads.length).toBe(4);

    await page.getByRole('tab', { name: 'SN', exact: true }).click();
    const snPanel = page.getByRole('tabpanel', { name: 'SN' });
    await expect(snPanel.getByRole('heading', { name: 'Wish for SN' })).toBeVisible();
    await expect(snPanel.getByPlaceholder('Optional link')).toHaveCount(0);
    await snPanel.getByPlaceholder('Write your wish').fill('A wish for SN');
    await snPanel.getByRole('button', { name: 'Save wish' }).click();
    await expect.poll(() => savedWishPayloads.length).toBe(5);
    expect(savedWishPayloads.map(({ category }) => category)).toEqual([
      'personal',
      'personal',
      'personal',
      'for_others',
      'for_sn',
    ]);
    await page.getByRole('tab', { name: 'Personal' }).click();
    await expect(page.getByText('Failed to save Christmas wish')).toHaveCount(0);
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

  for (const role of ['admin', 'super_admin'] as const) {
    test(`${role} can add decorations and remove another user's ball`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(180_000);
      const consoleErrors: Array<string> = [];
      const failedRequests: Array<string> = [];
      let ornaments = [
        {
          id: '11111111-1111-4111-8111-111111111111',
          ownerName: 'Sample Employee',
          assetType: 'blue',
          positionX: 52,
          positionY: 46,
          wishes: [],
        },
      ];
      let currentDecoration = { ...decoration };
      let manualDecorations = { garland: false, lights: false, star: false };
      const strands: Array<{
        id: string;
        kind: 'garland' | 'lights';
        geometry: { startX: number; startY: number; endX: number; endY: number };
      }> = [];
      const snapshot = () => ({
        event: baseEvent,
        decoration: currentDecoration,
        manualDecorations,
        strands: [...strands],
        permissions: { canManage: true },
        myOrnament: null,
        ornaments,
      });

      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('requestfailed', (request) => failedRequests.push(request.url()));
      await useMockManager(page, role);
      await page.route('**/api/christmas-tree/current', async (route) => {
        await route.fulfill({ json: { data: snapshot() } });
      });
      await page.route('**/api/christmas-tree/decorations', async (route) => {
        const payload = route.request().postDataJSON() as {
          decoration?: 'garland' | 'lights' | 'star';
          strandId?: string;
          geometry?: (typeof strands)[number]['geometry'];
        };
        if (route.request().method() === 'DELETE') {
          if (payload.strandId) {
            const index = strands.findIndex((strand) => strand.id === payload.strandId);
            if (index === -1) throw new Error('Strand not found');
            const [removed] = strands.splice(index, 1);
            if (removed && !strands.some((strand) => strand.kind === removed.kind)) {
              manualDecorations = { ...manualDecorations, [removed.kind]: false };
              currentDecoration = { ...currentDecoration, [`${removed.kind}_unlocked`]: false };
            }
          } else if (payload.decoration === 'star') {
            manualDecorations = { ...manualDecorations, star: false };
            currentDecoration = { ...currentDecoration, star_unlocked: false };
          }
          await route.fulfill({ json: { data: snapshot() } });
          return;
        }
        if (payload.geometry && payload.decoration !== 'star') {
          const existing = strands.find((strand) => strand.id === payload.strandId);
          if (existing) existing.geometry = payload.geometry;
          else
            strands.push({
              id: `11111111-1111-4111-8111-${String(strands.length + 2).padStart(12, '0')}`,
              kind: payload.decoration,
              geometry: payload.geometry,
            });
        }
        if (!payload.decoration) throw new Error('Decoration kind missing');
        manualDecorations = { ...manualDecorations, [payload.decoration]: true };
        currentDecoration = {
          ...currentDecoration,
          [`${payload.decoration}_unlocked`]: true,
        };
        await route.fulfill({ json: { data: snapshot() } });
      });
      await page.route('**/api/christmas-tree/ornament', async (route) => {
        if (route.request().method() !== 'DELETE') return route.fallback();
        expect(route.request().postDataJSON()).toEqual({
          ornamentId: '11111111-1111-4111-8111-111111111111',
        });
        ornaments = [];
        await route.fulfill({ json: { data: snapshot() } });
      });

      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto('/christmas-tree');
      await expect(page.getByRole('heading', { name: 'Tree decorations' })).toBeVisible();

      for (const control of [
        { kind: 'garland' as const, button: 'Add Garland', y: 0.5 },
        { kind: 'lights' as const, button: 'Add Lights', y: 0.64 },
      ]) {
        await page.getByRole('button', { name: control.button }).click();
        const dropZone = page.getByTestId('christmas-tree-drop-zone');
        const box = await dropZone.boundingBox();
        if (!box) throw new Error('Tree drop zone is not measurable');
        await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * control.y);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * control.y, {
          steps: 8,
        });
        await page.mouse.up();
        await expect(page.getByTestId(`christmas-tree-${control.kind}`)).toBeVisible();
        await expect(
          page.getByRole('button', {
            name: `Add another ${control.kind === 'garland' ? 'Garland' : 'Lights'}`,
          })
        ).toBeVisible();
      }
      for (const control of [
        { kind: 'garland' as const, label: 'Garland', y: 0.6 },
        { kind: 'lights' as const, label: 'Lights', y: 0.74 },
      ]) {
        await page.getByRole('button', { name: `Add another ${control.label}` }).click();
        const box = await page.getByTestId('christmas-tree-drop-zone').boundingBox();
        if (!box) throw new Error('Tree drop zone is not measurable');
        await page.mouse.move(box.x + box.width * 0.36, box.y + box.height * control.y);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.64, box.y + box.height * control.y, {
          steps: 8,
        });
        await page.mouse.up();
        await expect(page.getByTestId(`christmas-tree-${control.kind}`)).toHaveCount(2);
      }
      expect(strands.filter((strand) => strand.kind === 'garland')).toHaveLength(2);
      expect(strands.filter((strand) => strand.kind === 'lights')).toHaveLength(2);
      const lightsBefore = strands.find((strand) => strand.kind === 'lights')?.geometry;
      const startHandle = page.getByRole('button', { name: 'Move lights start end' }).first();
      const startBox = await startHandle.boundingBox();
      if (!(startBox && lightsBefore)) throw new Error('Lights start handle was not measurable');
      const bulbBefore = await page
        .getByTestId('christmas-tree-lights')
        .first()
        .locator('span')
        .first()
        .evaluate((node) => node.getBoundingClientRect().width);
      await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        startBox.x + startBox.width / 2 - 45,
        startBox.y + startBox.height / 2,
        { steps: 8 }
      );
      await page.mouse.up();
      await expect
        .poll(() => strands.find((strand) => strand.kind === 'lights')?.geometry.startX)
        .toBeLessThan(lightsBefore.startX);
      const bulbAfter = await page
        .getByTestId('christmas-tree-lights')
        .first()
        .locator('span')
        .first()
        .evaluate((node) => node.getBoundingClientRect().width);
      expect(bulbAfter).toBe(bulbBefore);
      const garlandBefore = strands.find((strand) => strand.kind === 'garland')?.geometry.startX;
      const wireCenter = await page
        .getByTestId('christmas-tree-garland')
        .first()
        .locator('svg path.cursor-grab')
        .evaluate((node) => {
          const path = node as SVGPathElement;
          const point = path.getPointAtLength(path.getTotalLength() / 2);
          const matrix = path.getScreenCTM();
          if (!matrix) throw new Error('Garland path is not measurable');
          const screen = point.matrixTransform(matrix);
          return { x: screen.x, y: screen.y };
        });
      await page.mouse.move(wireCenter.x, wireCenter.y);
      await page.mouse.down();
      await page.mouse.move(wireCenter.x + 20, wireCenter.y + 5, { steps: 8 });
      await page.mouse.up();
      await expect
        .poll(() => strands.find((strand) => strand.kind === 'garland')?.geometry.startX)
        .toBeGreaterThan(garlandBefore ?? 0);
      await page.reload();
      await expect(page.getByTestId('christmas-tree-garland')).toHaveCount(2);
      await expect(page.getByTestId('christmas-tree-lights')).toHaveCount(2);

      await page.getByRole('button', { name: 'Add Tree star' }).click();
      await expect(page.getByRole('button', { name: 'Tree star added' })).toBeDisabled();
      await expect(page.getByTestId('christmas-tree-star')).toBeVisible();
      const starGlow = page.getByTestId('christmas-tree-star-glow');
      await expect(starGlow).toHaveCSS('animation-name', /christmas-star-breathe/);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(starGlow).toHaveCSS('animation-name', 'none');
      await page.emulateMedia({ reducedMotion: 'no-preference' });

      for (const label of ['Garland', 'Lights'] as const) {
        page.once('dialog', (dialog) => dialog.accept());
        await page.getByRole('button', { name: `Remove ${label} 1` }).click();
        await expect(page.getByTestId(`christmas-tree-${label.toLowerCase()}`)).toHaveCount(1);
      }
      await page.reload();
      await expect(page.getByTestId('christmas-tree-garland')).toHaveCount(1);
      await expect(page.getByTestId('christmas-tree-lights')).toHaveCount(1);

      await page.getByRole('button', { name: "Open Sample Employee's Christmas ball" }).click();
      await expect(page.getByText('Admin action:')).toBeVisible();
      page.once('dialog', (dialog) => dialog.accept());
      await page.getByRole('button', { name: 'Remove Christmas ball' }).click();
      await expect(
        page.getByRole('button', { name: "Open Sample Employee's Christmas ball" })
      ).toHaveCount(0);

      await page.screenshot({
        path: testInfo.outputPath(`${role}-desktop-admin-controls.png`),
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.getByRole('heading', { name: 'Tree decorations' })).toBeVisible();
      for (const label of ['Garland', 'Lights'] as const) {
        page.once('dialog', (dialog) => dialog.accept());
        await page.getByRole('button', { name: `Remove ${label} 1` }).click();
        await expect(page.getByTestId(`christmas-tree-${label.toLowerCase()}`)).toHaveCount(0);
      }
      page.once('dialog', (dialog) => dialog.accept());
      await page.getByRole('button', { name: 'Remove tree star' }).click();
      await expect(page.getByTestId('christmas-tree-star')).toHaveCount(0);
      await page.reload();
      await expect(page.getByTestId('christmas-tree-garland')).toHaveCount(0);
      await expect(page.getByTestId('christmas-tree-lights')).toHaveCount(0);
      await expect(page.getByTestId('christmas-tree-star')).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        )
      ).toBe(false);
      await page.screenshot({
        path: testInfo.outputPath(`${role}-mobile-admin-controls.png`),
        fullPage: true,
      });

      expect(failedRequests.filter((url) => url.includes('/api/christmas-tree'))).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  }

  test('strand stays at its dropped position while save is pending', async ({ page }) => {
    test.setTimeout(120_000);
    const strand = {
      id: '11111111-1111-4111-8111-111111111112',
      kind: 'garland' as const,
      geometry: { startX: 30, startY: 50, endX: 70, endY: 50 },
    };
    const snapshot = () => ({
      event: baseEvent,
      decoration: { ...decoration, garland_unlocked: true },
      strands: [{ ...strand, geometry: { ...strand.geometry } }],
      permissions: { canManage: true },
      myOrnament: null,
      ornaments: [],
    });
    let failNextSave = false;
    await useMockManager(page, 'admin');
    await page.route('**/api/christmas-tree/current', async (route) => {
      await route.fulfill({ json: { data: snapshot() } });
    });
    await page.route('**/api/christmas-tree/decorations', async (route) => {
      const payload = route.request().postDataJSON() as { geometry: typeof strand.geometry };
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (failNextSave) {
        failNextSave = false;
        await route.fulfill({ status: 500, json: { error: 'Save denied for test' } });
        return;
      }
      strand.geometry = payload.geometry;
      await route.fulfill({ json: { data: snapshot() } });
    });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/christmas-tree');
    const handle = page.getByRole('button', { name: 'Move garland start end' });
    await expect(handle).toBeVisible();
    const samples: Array<number> = [];
    for (let sample = 0; sample < 33; sample += 1) {
      const box = await handle.boundingBox();
      if (!box) throw new Error('Strand handle is not measurable');
      const fromX = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.mouse.move(fromX, y);
      await page.mouse.down();
      await page.mouse.move(fromX + (sample % 2 === 0 ? 12 : -12), y, { steps: 3 });
      const droppedBox = await handle.boundingBox();
      if (!droppedBox) throw new Error('Dragged strand handle is not measurable');
      const droppedX = droppedBox.x + droppedBox.width / 2;
      await page.evaluate((targetX) => {
        const scopedWindow = window as Window & { strandVisualReady?: Promise<number> };
        scopedWindow.strandVisualReady = new Promise<number>((resolve) => {
          document.addEventListener(
            'pointerup',
            () => {
              const startedAt = performance.now();
              let matchingFrames = 0;
              const checkFrame = () => {
                const element = document.querySelector('[aria-label="Move garland start end"]');
                const rect = element?.getBoundingClientRect();
                const centerX = rect ? rect.left + rect.width / 2 : Number.NaN;
                matchingFrames = Math.abs(centerX - targetX) < 3 ? matchingFrames + 1 : 0;
                if (matchingFrames >= 2) resolve(performance.now() - startedAt);
                else requestAnimationFrame(checkFrame);
              };
              requestAnimationFrame(checkFrame);
            },
            { capture: true, once: true }
          );
        });
      }, droppedX);
      const response = page.waitForResponse(
        (result) =>
          result.url().includes('/api/christmas-tree/decorations') &&
          result.request().method() === 'PATCH'
      );
      await page.mouse.up();
      const visualMs = await page.evaluate(
        () => (window as Window & { strandVisualReady: Promise<number> }).strandVisualReady
      );
      await response;
      if (sample >= 3) samples.push(visualMs);
    }
    const sorted = [...samples].sort((a, b) => a - b);
    const p50 = sorted[Math.ceil(sorted.length * 0.5) - 1];
    const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
    console.info(
      `Strand release-to-stable visual: n=${samples.length}, p50=${p50?.toFixed(1)}ms, p95=${p95?.toFixed(1)}ms`
    );
    if (!process.env.STRAND_VISUAL_BASELINE) expect(p95).toBeLessThan(100);

    const beforeFailure = await handle.boundingBox();
    if (!beforeFailure) throw new Error('Strand handle is not measurable before rollback test');
    const oldX = beforeFailure.x + beforeFailure.width / 2;
    const y = beforeFailure.y + beforeFailure.height / 2;
    failNextSave = true;
    await page.mouse.move(oldX, y);
    await page.mouse.down();
    await page.mouse.move(oldX + 12, y, { steps: 3 });
    const failedResponse = page.waitForResponse(
      (result) =>
        result.url().includes('/api/christmas-tree/decorations') &&
        result.request().method() === 'PATCH'
    );
    await page.mouse.up();
    if (!process.env.STRAND_VISUAL_BASELINE) {
      await expect
        .poll(async () => {
          const rect = await handle.boundingBox();
          return rect ? rect.x + rect.width / 2 : Number.NaN;
        })
        .toBeGreaterThan(oldX + 5);
    }
    expect((await failedResponse).status()).toBe(500);
    await expect
      .poll(async () => {
        const rect = await handle.boundingBox();
        return rect ? Math.abs(rect.x + rect.width / 2 - oldX) : Number.POSITIVE_INFINITY;
      })
      .toBeLessThan(3);
    await expect(page.getByText('Save denied for test')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(handle).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
    ).toBe(false);
  });
});
