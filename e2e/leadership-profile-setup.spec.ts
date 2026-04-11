import { expect, test, type Page } from '@playwright/test';

type LeadershipRole = 'admin' | 'super_admin';

interface LeadershipScenario {
  role: LeadershipRole;
  email?: string;
  password?: string;
  profilePath: string;
  dashboardPattern: RegExp;
  requiresPaymentInfo: boolean;
  data: {
    firstName: string;
    lastName: string;
    position: string;
    nationality: string;
    education: string;
    major: string;
    personalEmail: string;
    contactNumberRaw: string;
    contactNumberStored: string;
    emergencyContactName: string;
    emergencyContactRelationship: string;
    emergencyContactNumberRaw: string;
    address: {
      street: string;
      city: string;
      province: string;
      country: string;
      zipcode: string;
    };
    payment?: {
      bankName: string;
      accountName: string;
      accountNumber: string;
      email: string;
      phoneNumberRaw: string;
    };
  };
}

const scenarios: LeadershipScenario[] = [
  {
    role: 'admin',
    email: process.env.E2E_PENDING_ADMIN_EMAIL,
    password: process.env.E2E_PENDING_ADMIN_PASSWORD,
    profilePath: '/admin/profile',
    dashboardPattern: /\/admin\/dashboard/,
    requiresPaymentInfo: true,
    data: {
      firstName: 'Carmela',
      lastName: 'Santiago',
      position: 'People Operations Lead',
      nationality: 'Filipino',
      education: "Bachelor's Degree",
      major: 'Human Resource Management',
      personalEmail: 'carmela.santiago.qa@example.com',
      contactNumberRaw: '9171234567',
      contactNumberStored: '+639171234567',
      emergencyContactName: 'Rafael Santiago',
      emergencyContactRelationship: 'Sibling',
      emergencyContactNumberRaw: '9171234599',
      address: {
        street: '42 Mabini Avenue',
        city: 'Makati',
        province: 'Metro Manila',
        country: 'Philippines',
        zipcode: '1226',
      },
      payment: {
        bankName: 'Mock Bank',
        accountName: 'Carmela Santiago',
        accountNumber: '1234567890',
        email: 'carmela.payments.qa@example.com',
        phoneNumberRaw: '9175555555',
      },
    },
  },
  {
    role: 'super_admin',
    email: process.env.E2E_PENDING_SUPERADMIN_EMAIL,
    password: process.env.E2E_PENDING_SUPERADMIN_PASSWORD,
    profilePath: '/super-admin/profile',
    dashboardPattern: /\/super-admin\/dashboard/,
    requiresPaymentInfo: false,
    data: {
      firstName: 'Lucia',
      lastName: 'Navarro',
      position: 'Executive Operations Director',
      nationality: 'Australian',
      education: "Master's Degree",
      major: 'Business Administration',
      personalEmail: 'lucia.navarro.qa@example.com',
      contactNumberRaw: '9178888811',
      contactNumberStored: '+639178888811',
      emergencyContactName: 'Elena Navarro',
      emergencyContactRelationship: 'Parent',
      emergencyContactNumberRaw: '9178888822',
      address: {
        street: '18 Harbour View',
        city: 'Taguig',
        province: 'Metro Manila',
        country: 'Philippines',
        zipcode: '1634',
      },
    },
  },
];

const leadershipSetupPath = '/admin/onboarding-setup';

test.describe('Leadership onboarding profile reflection', () => {
  for (const scenario of scenarios) {
    test(`${scenario.role} onboarding details reflect on profile`, async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.name !== 'chromium',
        'This regression mutates dedicated onboarding accounts and only runs on desktop Chromium.'
      );

      test.skip(
        !scenario.email || !scenario.password,
        `Set ${scenario.role === 'admin' ? 'E2E_PENDING_ADMIN_EMAIL/E2E_PENDING_ADMIN_PASSWORD' : 'E2E_PENDING_SUPERADMIN_EMAIL/E2E_PENDING_SUPERADMIN_PASSWORD'} to run this regression test.`
      );

      await mockBankList(page);

      let genericCompleteCalled = false;
      page.on('request', (request) => {
        if (
          request.method() === 'POST' &&
          request.url().includes('/api/onboarding/profile/complete')
        ) {
          genericCompleteCalled = true;
        }
      });

      await login(page, scenario.email!, scenario.password!);

      await page.goto(leadershipSetupPath);
      await expect(
        page.getByRole('heading', { name: 'Complete Your Profile' })
      ).toBeVisible();

      await fillPersonalInfo(page, scenario.data);

      await continueWizard(page);

      if (scenario.requiresPaymentInfo) {
        await fillPaymentInfo(page, scenario.data.payment!);
        await continueWizard(page);
      } else {
        await expect(page.getByText('Payment Info', { exact: true })).toHaveCount(0);
      }

      await expect(
        page.getByText('Document uploads are optional. You can skip this step or upload documents now.')
      ).toBeVisible();
      await continueWizard(page);

      const adminCompleteResponse = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().includes('/api/onboarding/profile/admin-complete') &&
          response.ok()
      );

      await page.getByRole('button', { name: 'Complete Setup' }).click();
      await adminCompleteResponse;

      expect(genericCompleteCalled).toBe(false);
      await page.waitForURL(scenario.dashboardPattern, { timeout: 30000 });

      await page.goto(scenario.profilePath);
      await expect(
        page.getByRole('heading', { name: 'Personal Information' })
      ).toBeVisible();

      await expect(page.getByText(scenario.data.position, { exact: true })).toBeVisible();
      await expect(page.getByText(scenario.data.personalEmail, { exact: true })).toBeVisible();
      await expect(page.getByText(scenario.data.contactNumberStored, { exact: true })).toBeVisible();
      await expect(page.getByText(scenario.data.nationality, { exact: true })).toBeVisible();
      await expect(
        page.getByText(`${scenario.data.education} — ${scenario.data.major}`, { exact: true })
      ).toBeVisible();
      await expect(
        page.getByText(buildStoredAddress(scenario.data.address), { exact: true })
      ).toBeVisible();
      await expect(
        page.getByText(scenario.data.emergencyContactName, { exact: true })
      ).toBeVisible();
      await expect(
        page.getByText(scenario.data.emergencyContactRelationship, { exact: true })
      ).toBeVisible();
    });
  }
});

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  await page.getByLabel('Email Address').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
  await page.waitForLoadState('domcontentloaded');
}

async function mockBankList(page: Page): Promise<void> {
  await page.route('**/api/banks?country_code=*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'mock-bank-ph',
            bank_name: 'Mock Bank',
            bank_code: 'MB01',
            country_code: 'PH',
          },
        ],
      }),
    });
  });
}

async function fillPersonalInfo(
  page: Page,
  data: LeadershipScenario['data']
): Promise<void> {
  await page.locator('#firstName').fill(data.firstName);
  await page.locator('#lastName').fill(data.lastName);
  await page.locator('#position').fill(data.position);
  await selectDate(page, '#birthday');
  await selectRadixOption(page, 'nationality', data.nationality);
  await selectRadixOption(page, 'education', data.education);
  await page.locator('#major').fill(data.major);

  await page.locator('#personalEmail').fill(data.personalEmail);
  await fillPhoneInput(page, '#contactNumber', data.contactNumberRaw);
  await page.locator('#streetAddress').fill(data.address.street);
  await page.locator('#city').fill(data.address.city);
  await page.locator('#province').fill(data.address.province);
  await page.locator('#country').fill(data.address.country);
  await page.locator('#zipcode').fill(data.address.zipcode);

  await page.locator('#emergencyContactName').fill(data.emergencyContactName);
  await selectRadixOption(
    page,
    'emergencyContactRelationship',
    data.emergencyContactRelationship
  );
  await fillPhoneInput(page, '#emergencyContactNumber', data.emergencyContactNumberRaw);
}

async function fillPaymentInfo(
  page: Page,
  payment: NonNullable<LeadershipScenario['data']['payment']>
): Promise<void> {
  await page.locator('#paymentBankId').click();
  await page.getByRole('option', { name: payment.bankName, exact: true }).click();

  await page.locator('#paymentAccountName').fill(payment.accountName);
  await page.locator('#paymentAccountNumber').fill(payment.accountNumber);
  await page.locator('#paymentEmail').fill(payment.email);
  await fillPhoneInput(page, '#paymentPhoneNumber', payment.phoneNumberRaw);
}

async function continueWizard(page: Page): Promise<void> {
  const saveStepResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().includes('/api/onboarding/profile/step') &&
      response.ok()
  );

  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await saveStepResponse;
}

async function selectRadixOption(
  page: Page,
  triggerId: string,
  optionLabel: string
): Promise<void> {
  await page.locator(`#${triggerId}`).click();
  await page.getByRole('option', { name: optionLabel, exact: true }).click();
}

async function selectDate(page: Page, triggerSelector: string): Promise<void> {
  await page.locator(triggerSelector).click();

  const popover = page
    .locator('div')
    .filter({ hasText: 'Use the month and year menus to jump quickly.' })
    .last();

  await popover.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: '1991', exact: true }).click();
  await popover.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'March', exact: true }).click();
  await popover.locator('[aria-label^="Choose "]:not([disabled])').nth(10).click();
}

async function fillPhoneInput(
  page: Page,
  selector: string,
  value: string
): Promise<void> {
  const input = page.locator(selector);
  await input.fill(value);
  await input.blur();
}

function buildStoredAddress(address: LeadershipScenario['data']['address']): string {
  return [
    `Street: ${address.street}`,
    `City: ${address.city}`,
    `Province: ${address.province}`,
    `Country: ${address.country}`,
    `Zipcode: ${address.zipcode}`,
  ].join(' | ');
}