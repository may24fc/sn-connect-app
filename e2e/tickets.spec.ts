import { expect, test } from '@playwright/test';

type TicketRecord = {
  id: string;
  title: string;
  description: string;
  team: 'hr' | 'it';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'triaged' | 'assigned' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';
  submitted_by: string;
  assigned_to: string | null;
  assigned_by: string | null;
  triaged_by: string | null;
  triaged_at: string | null;
  resolution_summary: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
  submitted_by_name?: string | null;
  assigned_to_name?: string | null;
  assigned_by_name?: string | null;
};

function getExpectedLandingPath(email: string): string {
  const normalizedEmail = email.toLowerCase();

  if (normalizedEmail.startsWith('superadmin') || normalizedEmail.startsWith('super-admin')) {
    return '/super-admin/dashboard';
  }

  if (normalizedEmail.startsWith('admin')) {
    return '/admin/dashboard';
  }

  if (normalizedEmail.startsWith('intern')) {
    return '/intern/dashboard';
  }

  return '/dashboard';
}

async function loginAs(page: Parameters<typeof test>[0]['page'], email: string, password: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Email Address')).toBeVisible({ timeout: 15000 });
  await page.getByLabel('Email Address').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  try {
    await page.waitForFunction(
      () => /\/(dashboard|admin\/dashboard|super-admin\/dashboard|intern\/dashboard|onboarding)/.test(window.location.pathname),
      { timeout: 15000 }
    );
  } catch (error) {
    const mockAuthUser = await page.evaluate(() => localStorage.getItem('auth_user'));
    if (!mockAuthUser) {
      throw error;
    }

    await page.goto(getExpectedLandingPath(email), { waitUntil: 'domcontentloaded' });
  }
}

function ticketListResponse(tickets: Array<TicketRecord>) {
  return {
    data: tickets,
    pagination: {
      page: 1,
      pageSize: 100,
      total: tickets.length,
      totalPages: 1,
    },
  };
}

test.describe.configure({ mode: 'serial' });

test.describe('Ticket flows', () => {
  test('employee can submit a support ticket', async ({ page }) => {
    let submittedTickets: Array<TicketRecord> = [];
    let createdPayload: Record<string, unknown> | null = null;

    await page.route(/\/api\/ticket-handlers\/me$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { isItHandler: false } }),
      });
    });

    await page.route(/\/api\/tickets\?.*scope=submitter.*$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ticketListResponse(submittedTickets)),
      });
    });

    await page.route(/\/api\/tickets$/, async (route) => {
      const request = route.request();
      createdPayload = request.postDataJSON() as Record<string, unknown>;
      submittedTickets = [
        {
          id: 'ticket-1',
          title: String(createdPayload?.title ?? 'Printer issue'),
          description: String(createdPayload?.description ?? 'Laptop will not connect to wifi.'),
          team: (createdPayload?.team as 'hr' | 'it') ?? 'it',
          priority: (createdPayload?.priority as 'low' | 'medium' | 'high' | 'urgent') ?? 'high',
          status: 'new',
          submitted_by: 'employee-user',
          assigned_to: null,
          assigned_by: null,
          triaged_by: null,
          triaged_at: null,
          resolution_summary: null,
          resolved_at: null,
          created_at: '2026-03-29T12:00:00.000Z',
          updated_at: '2026-03-29T12:00:00.000Z',
          created_by: 'employee-user',
          deleted_at: null,
          submitted_by_name: 'Employee Test',
          assigned_to_name: null,
          assigned_by_name: null,
        },
      ];

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: submittedTickets[0] }),
      });
    });

    await loginAs(page, 'employee@example.com', 'password');

    await page.goto('/tickets');
    await page.getByRole('button', { name: 'Submit Ticket' }).click();
    const createDialog = page.getByRole('dialog');
    await expect(createDialog).toBeVisible();
    await createDialog.getByPlaceholder('Brief summary of the issue').fill('Laptop cannot connect to VPN');
    await createDialog.locator('button[role="combobox"]').first().click();
    await page.getByRole('option', { name: 'IT' }).click();
    await createDialog.locator('button[role="combobox"]').nth(1).click();
    await page.getByRole('option', { name: 'High' }).click();
    await createDialog
      .getByPlaceholder('Describe the issue, impact, and anything already attempted.')
      .fill('The company laptop fails to connect to the VPN after restart.');
    await createDialog.getByRole('button', { name: 'Submit Ticket' }).click();

    await expect.poll(() => createdPayload).not.toBeNull();
    await expect(page.getByText('Laptop cannot connect to VPN')).toBeVisible();
  });

  test('admin can update an assigned HR ticket', async ({ page }) => {
    let assignedTickets: Array<TicketRecord> = [
      {
        id: 'ticket-hr-1',
        title: 'Update payroll profile',
        description: 'Need HR help correcting the bank account ending in 1234.',
        team: 'hr',
        priority: 'medium',
        status: 'assigned',
        submitted_by: 'employee-user',
        assigned_to: 'admin-user',
        assigned_by: 'super-admin-user',
        triaged_by: 'super-admin-user',
        triaged_at: '2026-03-29T10:00:00.000Z',
        resolution_summary: null,
        resolved_at: null,
        created_at: '2026-03-29T09:00:00.000Z',
        updated_at: '2026-03-29T10:00:00.000Z',
        created_by: 'employee-user',
        deleted_at: null,
        submitted_by_name: 'Employee Test',
        assigned_to_name: 'Admin Test',
        assigned_by_name: 'Super Admin Test',
      },
    ];

    await page.route(/\/api\/tickets\?.*$/, async (route) => {
      const url = route.request().url();
      if (!url.includes('scope=assigned') || !url.includes('team=hr')) {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ticketListResponse(assignedTickets)),
      });
    });

    await page.route(/\/api\/tickets\/ticket-hr-1$/, async (route) => {
      const payload = route.request().postDataJSON() as {
        status?: TicketRecord['status'];
        resolutionSummary?: string;
      };

      assignedTickets = [
        {
          ...assignedTickets[0],
          status: payload.status ?? assignedTickets[0].status,
          resolution_summary: payload.resolutionSummary ?? assignedTickets[0].resolution_summary,
          updated_at: '2026-03-29T13:00:00.000Z',
        },
      ];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: assignedTickets[0] }),
      });
    });

    await loginAs(page, 'admin@example.com', 'password');

    await page.goto('/admin/tickets');
    await expect(page.getByText('Update payroll profile')).toBeVisible();
    await page.getByRole('button', { name: 'Update' }).click();
    const updateDialog = page.getByRole('dialog');
    await expect(updateDialog).toBeVisible();
    await updateDialog.locator('button[role="combobox"]').first().click();
    await page.getByRole('option', { name: 'Resolved' }).click();
    await updateDialog
      .getByPlaceholder('Add a brief update or resolution note...')
      .fill('Updated the payroll details and notified the employee.');
    await updateDialog.getByRole('button', { name: 'Save Update' }).click();

    await expect(page.getByText('Updated the payroll details and notified the employee.')).toBeVisible();
  });

  test('super-admin can triage tickets and manage IT handlers', async ({ page }) => {
    let triageTickets: Array<TicketRecord> = [
      {
        id: 'ticket-it-1',
        title: 'VPN access issue',
        description: 'Cannot authenticate to the company VPN after password reset.',
        team: 'it',
        priority: 'high',
        status: 'new',
        submitted_by: 'employee-user',
        assigned_to: null,
        assigned_by: null,
        triaged_by: null,
        triaged_at: null,
        resolution_summary: null,
        resolved_at: null,
        created_at: '2026-03-29T08:00:00.000Z',
        updated_at: '2026-03-29T08:00:00.000Z',
        created_by: 'employee-user',
        deleted_at: null,
        submitted_by_name: 'Employee Test',
        assigned_to_name: null,
        assigned_by_name: null,
      },
    ];

    let handlers = [
      {
        user_id: 'it-user-1',
        team: 'it',
        is_active: true,
        assigned_by: 'super-admin-user',
        created_at: '2026-03-29T08:30:00.000Z',
        updated_at: '2026-03-29T08:30:00.000Z',
        user_name: 'Isaac Handler',
        user_email: 'isaac@test.com',
        assigned_by_name: 'Super Admin Test',
      },
    ];

    await page.route(/\/api\/tickets\?.*scope=triage.*$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ticketListResponse(triageTickets)),
      });
    });

    await page.route(/\/api\/tickets\/assignees$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'admin-user',
              team: 'hr',
              role: 'admin',
              name: 'Admin Test',
              email: 'admin@test.com',
            },
            {
              id: 'it-user-1',
              team: 'it',
              role: 'employee',
              name: 'Isaac Handler',
              email: 'isaac@test.com',
            },
          ],
        }),
      });
    });

    await page.route(/\/api\/tickets\/ticket-it-1$/, async (route) => {
      const payload = route.request().postDataJSON() as {
        assignedTo?: string | null;
        status?: TicketRecord['status'];
        priority?: TicketRecord['priority'];
      };

      triageTickets = [
        {
          ...triageTickets[0],
          assigned_to: payload.assignedTo ?? triageTickets[0].assigned_to,
          assigned_to_name: payload.assignedTo ? 'Isaac Handler' : null,
          status: payload.status ?? triageTickets[0].status,
          priority: payload.priority ?? triageTickets[0].priority,
          updated_at: '2026-03-29T14:00:00.000Z',
        },
      ];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: triageTickets[0] }),
      });
    });

    await page.route(/\/api\/ticket-handlers$/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: handlers }),
        });
        return;
      }

      if (route.request().method() === 'POST') {
        handlers = [
          ...handlers,
          {
            user_id: 'it-user-2',
            team: 'it',
            is_active: true,
            assigned_by: 'super-admin-user',
            created_at: '2026-03-29T15:00:00.000Z',
            updated_at: '2026-03-29T15:00:00.000Z',
            user_name: 'Irene Support',
            user_email: 'irene@test.com',
            assigned_by_name: 'Super Admin Test',
          },
        ];

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: handlers[handlers.length - 1] }),
        });
        return;
      }

      await route.fallback();
    });

    await page.route(/\/api\/ticket-handlers\?userId=.*$/, async (route) => {
      handlers = handlers.filter((handler) => handler.user_id !== 'it-user-2');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.route(/\/api\/employees\?.*$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'employee-row-1',
              user_id: 'it-user-1',
              first_name: 'Isaac',
              last_name: 'Handler',
            },
            {
              id: 'employee-row-2',
              user_id: 'it-user-2',
              first_name: 'Irene',
              last_name: 'Support',
            },
          ],
          pagination: { page: 1, pageSize: 200, total: 2, totalPages: 1 },
        }),
      });
    });

    await loginAs(page, 'super-admin@example.com', 'password');

    await page.goto('/super-admin/tasks?tab=tickets');
    await expect(page.getByText('Ticket Intake')).toBeVisible();
    await page.getByRole('button', { name: 'Triage' }).click();
    const triageDialog = page.getByRole('dialog');
    await triageDialog.locator('button[role="combobox"]').nth(2).click();
    await page.getByRole('option', { name: 'Isaac Handler' }).click();
    await triageDialog.locator('button[role="combobox"]').nth(3).click();
    await page.getByRole('option', { name: 'Assigned' }).click();
    await triageDialog.getByRole('button', { name: 'Save Ticket' }).click();

    await expect(page.getByText('Isaac Handler')).toBeVisible();

    await page.goto('/admin/employee-management');
    await page.getByRole('button', { name: 'Manage IT Handlers' }).click();
    const handlerDialog = page.getByRole('dialog');
    await handlerDialog.locator('button[role="combobox"]').first().click();
    await page.getByRole('option', { name: 'Irene Support' }).click();
    await handlerDialog.getByRole('button', { name: 'Add Handler' }).click();
    await expect(handlerDialog.getByText('Irene Support')).toBeVisible();
    await handlerDialog.getByRole('button', { name: 'Remove' }).last().click();
    await expect(handlerDialog.getByText('Irene Support')).not.toBeVisible();
  });
});