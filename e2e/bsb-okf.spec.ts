import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('auth_user', JSON.stringify({
    id: 'admin-1', name: 'Admin', email: 'admin@test.com', role: 'admin',
    accountKind: 'workforce', isOnboardingComplete: true,
  })));
  await page.route('**/api/bsb/sources**', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { data: [] } });
    return route.fulfill({ status: 502, json: { error: 'Google Doc cannot be imported. Share it with the BSB service account as Editor and try again.' } });
  });
});

test('approval register and BSB chatbot mode render on desktop and mobile', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/admin/ai-knowledge');
    await expect(page.getByRole('region', { name: 'BSB Approval Register' })).toBeVisible();
    await expect(page.getByText('No source imported.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import Doc' })).toBeDisabled();
    const docLink = 'https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789-xy/edit';
    await page.getByLabel('Google Doc link or file ID').fill(docLink);
    const importRequest = page.waitForRequest((request) => request.url().endsWith('/api/bsb/sources') && request.method() === 'POST');
    await page.getByRole('button', { name: 'Import Doc' }).click();
    expect((await importRequest).postDataJSON()).toEqual({ source: docLink });
    await expect(page.getByRole('status').filter({ hasText: 'Share it with the BSB service account' })).toBeVisible();
    await expect(page.getByLabel('Google Doc link or file ID')).toHaveValue(docLink);
    await page.getByRole('region', { name: 'BSB Approval Register' }).screenshot({ path: testInfo.outputPath(`bsb-register-${width}.png`) });
    await page.getByRole('button', { name: 'Open AI Assistant' }).click();
    await page.getByRole('button', { name: 'Toggle Business Second Brain' }).click();
    await expect(page.getByText('Business Second Brain')).toBeVisible();
    await expect(page.getByPlaceholder('Ask about approved notes...')).toBeVisible();
    await expect.poll(() => page.getByText('Conversations', { exact: true })
      .evaluate((element) => element.parentElement?.parentElement?.getBoundingClientRect().width)).toBeLessThan(2);
    await page.screenshot({ path: testInfo.outputPath(`bsb-${width}.png`) });
  }
  expect(pageErrors).toEqual([]);
});

test('non-admin chatbot does not offer Business Second Brain mode', async ({ page }, testInfo) => {
  test.setTimeout(120_000); // next dev compiles /dashboard on first visit
  await page.addInitScript(() => localStorage.setItem('auth_user', JSON.stringify({
    id: 'emp-1', name: 'Employee', email: 'employee@test.com', role: 'employee',
    accountKind: 'workforce', isOnboardingComplete: true,
  })));
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Open AI Assistant' }).click();
    await expect(page.getByText('Control Hub AI')).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Toggle Business Second Brain' })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`bsb-employee-${width}.png`) });
  }
  expect(pageErrors).toEqual([]);
});

test('draft review sends Never retention and the named reader for server confirmation', async ({ page }, testInfo) => {
  test.setTimeout(120_000); // Cold local dev builds can delay unrelated page resources.
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/api/bsb/sources**', async (route) => {
    if (route.request().method() === 'GET' && new URL(route.request().url()).searchParams.has('id'))
      return route.fulfill({ json: { data: { id: '11111111-1111-4111-8111-111111111111',
        facts: [{ id: 'F1', exactQuote: 'A source passage for review.' }] } } });
    if (route.request().method() === 'GET') return route.fulfill({ json: { data: [{
      id: '11111111-1111-4111-8111-111111111111', title: 'Configured meeting note', drive_file_id: 'configured-source',
      decision: 'draft', classification: null, source_owner_email: 'owner@example.com', retention_rule: 'pending',
      retention_until: null, organizer_approval_ref: null, business_approval_ref: null, notice_ref: null,
      independent_review_ref: null, acl_checked_at: null, acl_evidence_ref: null, reviewer_id: null,
      expires_at: null, revoked_at: null, allowed_principals: [],
    }] } });
    return route.fulfill({ status: 400, json: { error: 'Complete the source details' } });
  });
  await page.goto('/admin/ai-knowledge', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('region', { name: 'BSB Approval Register' })).toBeVisible({ timeout: 60_000 });
  await expect.poll(async () => {
    const managerBox = await page.getByTestId('ai-knowledge-manager').boundingBox();
    const registerBox = await page.getByRole('region', { name: 'BSB Approval Register' }).boundingBox();
    return Boolean(managerBox && registerBox && registerBox.y >= managerBox.y + managerBox.height);
  }, { timeout: 30_000 }).toBe(true);
  await expect(page.getByRole('button', { name: 'Re-import Configured meeting note' })).toBeVisible();
  await page.getByRole('button', { name: 'Review' }).click();
  await expect(page.getByText('Read 1 imported passages')).toBeVisible();
  await page.getByRole('combobox', { name: 'Retention rule' }).click();
  await page.getByRole('option', { name: 'Never' }).click();
  await expect(page.getByLabel('Retention until (ISO date/time, if applicable)')).toHaveCount(0);
  await page.getByLabel('Classification').fill('Recording');
  await page.getByLabel('Approved reader emails (one per line)').fill('cefjumaoas29@gmail.com');
  await page.screenshot({ path: testInfo.outputPath('bsb-review-form-1440.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(page.getByRole('button', { name: 'Approve with OpenAI' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('bsb-review-form-390.png'), fullPage: true });
  const requestPromise = page.waitForRequest((request) => request.url().endsWith('/api/bsb/sources') && request.method() === 'PATCH');
  await page.getByRole('button', { name: 'Approve with OpenAI' }).click();
  const payload = (await requestPromise).postDataJSON();
  expect(payload).toMatchObject({ action: 'approve', processor: 'openai', retentionRule: 'never',
    classification: 'Recording', allowedPrincipals: ['cefjumaoas29@gmail.com'] });
  await expect(page.getByRole('status').filter({ hasText: 'Complete the source details' })).toBeVisible();
  await expect(page.getByText('draft', { exact: true })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('a denied draft review does not show passages or approval controls', async ({ page }, testInfo) => {
  await page.route('**/api/bsb/sources**', async (route) => {
    if (new URL(route.request().url()).searchParams.has('id'))
      return route.fulfill({ status: 404, json: { error: 'Source unavailable' } });
    return route.fulfill({ json: { data: [{ id: '11111111-1111-4111-8111-111111111111',
      title: 'Restricted note', drive_file_id: 'configured-source', decision: 'draft',
      retention_rule: 'pending', source_owner_email: 'owner@example.com' }] } });
  });
  await page.goto('/admin/ai-knowledge');
  await page.getByRole('button', { name: 'Review' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Source unavailable' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve with OpenAI' })).toHaveCount(0);
  await expect(page.getByText('Read 1 imported passages')).toHaveCount(0);
  await page.getByRole('region', { name: 'BSB Approval Register' })
    .screenshot({ path: testInfo.outputPath('bsb-review-denied.png') });
});
