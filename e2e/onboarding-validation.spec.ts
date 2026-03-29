import { expect, test, type Page } from '@playwright/test';

const authEmail = process.env.E2E_AUTH_EMAIL || 'employee@test.com';
const authPassword = process.env.E2E_AUTH_PASSWORD || 'password';

type MockProfile = {
  id: string;
  user_id: string;
  is_completed: boolean;
  current_step: 'personal_info' | 'payment_info' | 'documents' | 'review';
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  position: string | null;
  personal_email: string | null;
  company_email: string | null;
  department_id: string | null;
  start_date: string | null;
  nationality: string | null;
  contact_number: string | null;
  contact_country_code: string | null;
  email_address: string | null;
  education: string | null;
  major: string | null;
  birthday: string | null;
  age: number | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  emergency_contact_country_code: string | null;
  emergency_contact_email: string | null;
  emergency_contact_relationship: string | null;
  linkedin_profile_url: string | null;
  payment_account_name: string | null;
  payment_account_number: string | null;
  payment_country_code: string | null;
  payment_bank_id: string | null;
  payment_bank_name: string | null;
  payment_email: string | null;
  payment_phone_number: string | null;
  payment_phone_country_code: string | null;
  payment_address: string | null;
  payment_city: string | null;
  payment_province: string | null;
  payment_zipcode: string | null;
  created_at: string;
  updated_at: string;
};

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  await page.fill('#email', authEmail);
  await page.fill('#password', authPassword);
  await page.click('button[type="submit"]');

  // Wait until the browser leaves the /login page (Supabase PKCE involves multiple redirects)
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
  await page.waitForLoadState('networkidle');
}

async function selectRadixOption(page: Page, triggerId: string, optionLabel: string): Promise<void> {
  await page.locator(`#${triggerId}`).click();
  await page.getByRole('option', { name: optionLabel, exact: true }).click();
}

async function mockBanks(page: Page): Promise<void> {
  await page.route('**/api/banks?country_code=*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'bank-1',
            bank_name: 'Mock Bank',
            bank_code: 'MB01',
            country_code: 'PH',
          },
        ],
      }),
    });
  });
}

async function mockOnboardingProfile(page: Page): Promise<void> {
  let profile: MockProfile = {
    id: 'profile-1',
    user_id: 'user-1',
    is_completed: false,
    current_step: 'personal_info',
    first_name: null,
    middle_name: null,
    last_name: null,
    position: null,
    personal_email: null,
    company_email: null,
    department_id: null,
    start_date: null,
    nationality: null,
    contact_number: null,
    contact_country_code: 'PH',
    email_address: null,
    education: null,
    major: null,
    birthday: null,
    age: null,
    address: null,
    emergency_contact_name: null,
    emergency_contact_number: null,
    emergency_contact_country_code: 'PH',
    emergency_contact_email: null,
    emergency_contact_relationship: null,
    linkedin_profile_url: null,
    payment_account_name: null,
    payment_account_number: null,
    payment_country_code: 'PH',
    payment_bank_id: null,
    payment_bank_name: null,
    payment_email: null,
    payment_phone_number: null,
    payment_phone_country_code: 'PH',
    payment_address: null,
    payment_city: null,
    payment_province: null,
    payment_zipcode: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await page.route('**/api/onboarding/profile', async (route) => {
    const request = route.request();

    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: profile }),
      });
      return;
    }

    if (request.method() === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      profile = {
        ...profile,
        first_name: (body.firstName as string) || profile.first_name,
        middle_name: (body.middleName as string) || profile.middle_name,
        last_name: (body.lastName as string) || profile.last_name,
        position: (body.position as string) || profile.position,
        personal_email: (body.personalEmail as string) || profile.personal_email,
        company_email: (body.companyEmail as string) || profile.company_email,
        nationality: (body.nationality as string) || profile.nationality,
        contact_number: (body.contactNumber as string) || profile.contact_number,
        contact_country_code:
          (body.contactCountryCode as string) || profile.contact_country_code,
        education: (body.education as string) || profile.education,
        birthday: (body.birthday as string) || profile.birthday,
        address: (body.address as string) || profile.address,
        emergency_contact_name:
          (body.emergencyContactName as string) || profile.emergency_contact_name,
        emergency_contact_number:
          (body.emergencyContactNumber as string) || profile.emergency_contact_number,
        emergency_contact_country_code:
          (body.emergencyContactCountryCode as string) ||
          profile.emergency_contact_country_code,
        emergency_contact_email:
          (body.emergencyContactEmail as string) || profile.emergency_contact_email,
        emergency_contact_relationship:
          (body.emergencyContactRelationship as string) ||
          profile.emergency_contact_relationship,
        updated_at: new Date().toISOString(),
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: profile }),
      });
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/onboarding/profile/step', async (route) => {
    const body = route.request().postDataJSON() as {
      step?: string;
      data?: Record<string, unknown>;
    };

    profile = {
      ...profile,
      current_step: (body.step as 'personal_info' | 'payment_info' | 'documents' | 'review') || profile.current_step,
      first_name: (body.data?.firstName as string) || profile.first_name,
      middle_name: (body.data?.middleName as string) || profile.middle_name,
      last_name: (body.data?.lastName as string) || profile.last_name,
      position: (body.data?.position as string) || profile.position,
      personal_email: (body.data?.personalEmail as string) || profile.personal_email,
      company_email: (body.data?.companyEmail as string) || profile.company_email,
      nationality: (body.data?.nationality as string) || profile.nationality,
      contact_number: (body.data?.contactNumber as string) || profile.contact_number,
      contact_country_code:
        (body.data?.contactCountryCode as string) || profile.contact_country_code,
      education: (body.data?.education as string) || profile.education,
      birthday: (body.data?.birthday as string) || profile.birthday,
      address: (body.data?.address as string) || profile.address,
      emergency_contact_name:
        (body.data?.emergencyContactName as string) || profile.emergency_contact_name,
      emergency_contact_number:
        (body.data?.emergencyContactNumber as string) || profile.emergency_contact_number,
      emergency_contact_country_code:
        (body.data?.emergencyContactCountryCode as string) ||
        profile.emergency_contact_country_code,
      emergency_contact_email:
        (body.data?.emergencyContactEmail as string) || profile.emergency_contact_email,
      emergency_contact_relationship:
        (body.data?.emergencyContactRelationship as string) ||
        profile.emergency_contact_relationship,
      payment_bank_id: (body.data?.paymentBankId as string) || profile.payment_bank_id,
      payment_bank_name: (body.data?.paymentBankName as string) || profile.payment_bank_name,
      payment_account_name:
        (body.data?.paymentAccountName as string) || profile.payment_account_name,
      payment_account_number:
        (body.data?.paymentAccountNumber as string) || profile.payment_account_number,
      payment_email: (body.data?.paymentEmail as string) || profile.payment_email,
      payment_phone_number:
        (body.data?.paymentPhoneNumber as string) || profile.payment_phone_number,
      payment_phone_country_code:
        (body.data?.paymentPhoneCountryCode as string) ||
        profile.payment_phone_country_code,
      payment_address: (body.data?.paymentAddress as string) || profile.payment_address,
      payment_city: (body.data?.paymentCity as string) || profile.payment_city,
      payment_province: (body.data?.paymentProvince as string) || profile.payment_province,
      payment_zipcode: (body.data?.paymentZipcode as string) || profile.payment_zipcode,
      updated_at: new Date().toISOString(),
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: profile }),
    });
  });

  await page.route('**/api/onboarding/documents', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });
}

async function goToSetup(page: Page): Promise<void> {
  await page.goto('/onboarding/setup');
  await expect(page.locator('#firstName')).toBeVisible();
}

async function fillValidPersonalInfo(page: Page): Promise<void> {
  await page.fill('#firstName', 'Jane');
  await page.fill('#lastName', 'Doe');
  await page.fill('#position', 'QA Engineer');
  await page.fill('#birthday', '1995-05-15');
  await selectRadixOption(page, 'nationality', 'Filipino');
  await selectRadixOption(page, 'education', "Bachelor's Degree");
  await page.fill('#personalEmail', 'jane.personal@example.com');
  await page.fill('#companyEmail', 'jane.doe@company.com');
  await page.fill('#contactNumber', '9171234567');
  await page.fill('#address', '123 Main Street');
  await page.fill('#emergencyContactName', 'John Doe');
  await selectRadixOption(page, 'emergencyContactRelationship', 'Sibling');
  await page.fill('#emergencyContactNumber', '9177654321');
  await page.fill('#emergencyContactEmail', 'john.doe@example.com');
}

async function goToPaymentStep(page: Page): Promise<void> {
  await fillValidPersonalInfo(page);
  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await expect(page.locator('#paymentAccountName')).toBeVisible();
}

async function fillValidPaymentInfo(page: Page): Promise<void> {
  await page.locator('#paymentBankId').click();
  await page.getByRole('option', { name: /Mock Bank/i }).click();
  await page.fill('#paymentAccountName', 'Jane Doe');
  await page.fill('#paymentAccountNumber', '1234567890');
  await page.fill('#paymentEmail', 'payments@example.com');
  await page.fill('#paymentPhoneNumber', '9171234567');
  await page.fill('#paymentAddress', '123 Main Street');
  await page.fill('#paymentCity', 'Makati');
  await page.fill('#paymentProvince', 'Metro Manila');
}

test.describe('Onboarding Wizard Validation', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await mockBanks(page);
    await mockOnboardingProfile(page);
    await login(page);
  });

  test('blocks personal step when required text fields are missing', async ({ page }) => {
    await goToSetup(page);

    await page.getByRole('button', { name: 'Save & Continue' }).click();

    await expect(page.getByText('First name is required.')).toBeVisible();
    await expect(page.locator('#firstName')).toBeVisible();
  });

  test('validates personal step email and phone text fields', async ({ page }) => {
    await goToSetup(page);
    await fillValidPersonalInfo(page);
    await page.fill('#personalEmail', 'invalid-email');
    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await expect(page.getByText('Please enter a valid personal email address.')).toBeVisible();

    await page.fill('#personalEmail', 'jane.personal@example.com');
    await page.fill('#emergencyContactEmail', 'invalid-email');
    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await expect(page.getByText('Please enter a valid emergency contact email address.')).toBeVisible();

    await page.fill('#emergencyContactEmail', 'john.doe@example.com');
    await page.fill('#contactNumber', '123');
    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await expect(page.getByText('Please enter a valid contact number.')).toBeVisible();

    await page.fill('#contactNumber', '9171234567');
    await page.fill('#emergencyContactNumber', '456');
    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await expect(page.getByText('Please enter a valid emergency contact number.')).toBeVisible();
  });

  test('blocks payment step when required text fields are missing', async ({ page }) => {
    await goToSetup(page);
    await goToPaymentStep(page);

    await page.getByRole('button', { name: 'Save & Continue' }).click();

    await expect(page.getByText('Account name is required.')).toBeVisible();
    await expect(page.locator('#paymentAccountName')).toBeVisible();
  });

  test('validates payment email and phone text fields', async ({ page }) => {
    await goToSetup(page);
    await goToPaymentStep(page);
    await fillValidPaymentInfo(page);

    await page.fill('#paymentEmail', 'invalid-email');
    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await expect(page.getByText('Please enter a valid payment email address.')).toBeVisible();

    await page.fill('#paymentEmail', 'payments@example.com');
    await page.fill('#paymentPhoneNumber', '123');
    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await expect(page.getByText('Please enter a valid payment phone number.')).toBeVisible();
  });

  test('accepts valid personal and payment text fields and advances through both form steps', async ({ page }) => {
    await goToSetup(page);
    await fillValidPersonalInfo(page);
    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await expect(page.locator('#paymentAccountName')).toBeVisible();

    await fillValidPaymentInfo(page);
    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await expect(page.getByText(/Documents/i)).toBeVisible();
  });
});