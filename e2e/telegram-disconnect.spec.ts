import { expect, test } from '@playwright/test';

async function loginAsEmployee(page: Parameters<typeof test>[0]['page']) {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill('employee@example.com');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

async function mockTelegramPreferences(page: Parameters<typeof test>[0]['page']) {
  let disconnected = false;

  await page.route('**/api/users/*/notification-preferences', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: disconnected
          ? {
              telegram: false,
              gmail: true,
              telegramUsername: null,
              telegramLinkedAt: null,
              telegramLinkPendingUntil: null,
              telegramLinkState: 'unlinked',
            }
          : {
              telegram: true,
              gmail: true,
              telegramUsername: 'ceferino',
              telegramLinkedAt: '2026-11-01T10:00:00.000Z',
              telegramLinkPendingUntil: null,
              telegramLinkState: 'linked',
            },
      }),
    })
  );

  await page.route('**/api/users/*/notification-preferences/telegram-link', async (route) => {
    if (route.request().method() !== 'DELETE') {
      await route.fallback();
      return;
    }

    disconnected = true;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          telegram: false,
          gmail: true,
          telegramUsername: null,
          telegramLinkedAt: null,
          telegramLinkPendingUntil: null,
          telegramLinkState: 'unlinked',
        },
      }),
    });
  });

  return { isDisconnected: () => disconnected };
}

test('employee confirms Telegram disconnect and can connect another identity', async ({
  page,
}, testInfo) => {
  const consoleErrors: Array<string> = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('401 (Unauthorized)')) {
      consoleErrors.push(message.text());
    }
  });
  const state = await mockTelegramPreferences(page);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await loginAsEmployee(page);
  await page.goto('/settings', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Linked as @ceferino').first()).toBeVisible();
  await page.getByRole('button', { name: 'Disconnect Telegram' }).click();
  await expect(page.getByRole('heading', { name: 'Disconnect Telegram?' })).toBeVisible();
  await page.getByRole('button', { name: 'Disconnect Telegram', exact: true }).last().click();

  await expect.poll(state.isDisconnected).toBe(true);
  await expect(page.getByText('Not linked').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Connect Telegram' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Disconnect Telegram' })).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath('telegram-disconnected-desktop.png'),
    fullPage: true,
  });
  expect(consoleErrors).toEqual([]);
});

test('Telegram disconnect confirmation remains usable on mobile', async ({ page }, testInfo) => {
  await mockTelegramPreferences(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsEmployee(page);
  await page.goto('/settings', { waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: 'Disconnect Telegram' }).click();
  await expect(page.getByRole('heading', { name: 'Disconnect Telegram?' })).toBeVisible();
  await expect(
    page.getByText(
      'this Telegram identity will become available to connect to a different account',
      {
        exact: false,
      }
    )
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('telegram-disconnect-confirmation-mobile.png'),
    fullPage: true,
  });
});
