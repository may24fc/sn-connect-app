import { expect, test, type Page } from '@playwright/test';

test.setTimeout(120_000);

const people = [
  {
    id: 'alex',
    name: 'Alex Creator',
    email: 'alex@example.test',
    role: 'employee',
    department: 'Operations',
    position: 'Manager',
    avatarUrl: null,
    requiresInvitation: false,
  },
  {
    id: 'jordan',
    name: 'Jordan Lead',
    email: 'jordan@example.test',
    role: 'associate',
    department: 'Operations',
    position: 'Designer',
    avatarUrl: null,
    requiresInvitation: false,
  },
  {
    id: 'casey',
    name: 'Casey Contributor',
    email: 'casey@example.test',
    role: 'employee',
    department: 'Operations',
    position: 'Analyst',
    avatarUrl: null,
    requiresInvitation: false,
  },
  {
    id: 'taylor',
    name: 'Taylor Lead',
    email: 'taylor@example.test',
    role: 'employee',
    department: 'Marketing',
    position: 'Manager',
    avatarUrl: null,
    requiresInvitation: true,
  },
];

type ContributorRole = 'lead' | 'contributor';
type MockInvitation = {
  id: string;
  invitee_id: string;
  invitee_name: string;
  role: ContributorRole;
  make_primary: boolean;
  created_at: string;
};

async function mockProjectApis(
  page: Page,
  user: { id: string; name: string; email: string; role: string },
  canManage = true
) {
  const state = {
    failCandidates: false,
    failInvitations: false,
    rejectNextPromotion: false,
    created: [] as Array<{ leadUserId: string; coLeadUserIds: Array<string> }>,
    invitations: [] as Array<MockInvitation>,
    responses: [] as Array<'accept' | 'decline'>,
    contributors: [
      { user_id: 'alex', role: 'lead' as ContributorRole, name: 'Alex Creator' },
      { user_id: 'jordan', role: 'lead' as ContributorRole, name: 'Jordan Lead' },
      { user_id: 'casey', role: 'contributor' as ContributorRole, name: 'Casey Contributor' },
    ],
  };
  await page.addInitScript((mockUser) => {
    localStorage.setItem('auth_user', JSON.stringify({ ...mockUser, isOnboardingComplete: true }));
    localStorage.setItem('weekly-commit-dismissed:project-1', 'true');
  }, user);

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const contributors = state.contributors.map((contributor) => ({
      ...contributor,
      avatar_url: null,
      joined_at: '2026-10-01T00:00:00.000Z',
    }));
    const project = {
      id: 'project-1',
      name: 'Shared launch',
      description: 'Plan the launch together.',
      lead_user_id: 'alex',
      supervisor_id: null,
      start_date: '2026-10-01',
      target_end_date: '2026-12-15',
      status: 'active',
      health: 'on_track',
      progress_pct: 35,
      points_total: 600,
      earned_points: 120,
      created_by: 'alex',
      created_at: '2026-10-01T00:00:00.000Z',
      updated_at: '2026-10-12T00:00:00.000Z',
      deleted_at: null,
      can_manage: canManage,
      contributors,
      lead_user_ids: contributors.filter((member) => member.role === 'lead').map((member) => member.user_id),
      contributor_people: contributors.map((member) => ({
        user_id: member.user_id,
        name: member.name,
        avatar_url: null,
      })),
      lead_name: 'Alex Creator',
      lead_avatar_url: null,
    };

    if (url.pathname === '/api/projects/lead-candidates') {
      if (state.failCandidates) {
        await route.fulfill({ status: 500, json: { error: 'Candidates unavailable' } });
      } else {
        await route.fulfill({
          json: {
            data: people.map((person) => ({
              ...person,
              requiresInvitation: user.role === 'admin' ? person.id !== user.id : person.requiresInvitation,
            })),
          },
        });
      }
      return;
    }
    if (url.pathname === '/api/projects/project-1/contributors') {
      if (request.method() === 'POST') {
        const input: { userId: string; role: ContributorRole } = request.postDataJSON();
        if (state.rejectNextPromotion && input.role === 'lead') {
          state.rejectNextPromotion = false;
          await route.fulfill({ status: 403, json: { error: 'Not eligible to be a project lead' } });
          return;
        }
        const existing = state.contributors.find((member) => member.user_id === input.userId);
        const person = people.find((candidate) => candidate.id === input.userId);
        if (person?.requiresInvitation && !existing) {
          state.invitations.push({
            id: `invitation-${state.invitations.length + 1}`,
            invitee_id: person.id,
            invitee_name: person.name,
            role: input.role,
            make_primary: false,
            created_at: '2026-11-04T00:00:00.000Z',
          });
          await route.fulfill({ status: 201, json: { ok: true, outcome: 'invited' } });
          return;
        }
        if (existing) existing.role = input.role;
        else if (person) {
          state.contributors.push({ user_id: person.id, role: input.role, name: person.name });
        }
        await route.fulfill({ status: 201, json: { ok: true, outcome: 'assigned' } });
        return;
      }
      const candidates = people
        .filter((person) => !state.contributors.some((member) => member.user_id === person.id))
        .filter((person) => person.name.toLowerCase().includes(
          (url.searchParams.get('search') ?? '').toLowerCase()
        ))
        .map((person) => ({
          user_id: person.id,
          full_name: person.name,
          avatar_url: person.avatarUrl,
          position: person.position,
          department_name: person.department,
          role: person.role,
          requires_invitation: person.requiresInvitation,
        }));
      await route.fulfill({ json: { data: candidates, total: candidates.length } });
      return;
    }
    if (url.pathname === '/api/projects/project-1/invitations') {
      if (request.method() === 'DELETE') {
        state.invitations = state.invitations.filter(
          (invitation) => invitation.id !== url.searchParams.get('invitationId')
        );
        await route.fulfill({ json: { ok: true } });
      } else {
        await route.fulfill({ json: { data: state.invitations } });
      }
      return;
    }
    if (url.pathname === '/api/projects/invitations') {
      if (state.failInvitations) {
        await route.fulfill({ status: 500, json: { error: 'Invitations unavailable' } });
      } else {
        await route.fulfill({
          json: {
            data: state.invitations.map((invitation) => ({
              id: invitation.id,
              project_id: 'project-1',
              project_name: 'Shared launch',
              project_description: 'Plan the launch together.',
              inviter_name: 'Alex Creator',
              role: invitation.role,
              make_primary: invitation.make_primary,
              created_at: invitation.created_at,
            })),
          },
        });
      }
      return;
    }
    if (url.pathname.startsWith('/api/projects/invitations/') && request.method() === 'POST') {
      const { action }: { action: 'accept' | 'decline' } = request.postDataJSON();
      const id = url.pathname.split('/').pop();
      const invitation = state.invitations.find((item) => item.id === id);
      state.responses.push(action);
      state.invitations = state.invitations.filter((item) => item.id !== id);
      await route.fulfill({
        json: {
          ok: true, status: action === 'accept' ? 'accepted' : 'declined',
          projectId: 'project-1', makePrimary: invitation?.make_primary ?? false, primaryChanged: false,
        },
      });
      return;
    }
    if (url.pathname === '/api/projects/project-1') {
      await route.fulfill({ json: { data: project } });
      return;
    }
    if (url.pathname === '/api/projects') {
      if (request.method() === 'POST') {
        state.created.push(request.postDataJSON());
        const input = state.created[state.created.length - 1];
        await route.fulfill({
          status: 201,
          json: {
            data: project,
            pendingPrimary: input?.leadUserId === 'taylor',
            pendingInvitationCount: input?.leadUserId === 'taylor' ? 1 : 0,
          },
        });
      } else {
        await route.fulfill({
          json: { data: [project], pagination: { page: 1, pageSize: 20, total: 1 } },
        });
      }
      return;
    }
    if (url.pathname === '/api/work-tracker') {
      await route.fulfill({
        json: {
          scope: 'team',
          days: 30,
          canViewTeam: true,
          canAssignTasks: true,
          usageAvailable: true,
          people: [],
          projects: [{
            id: 'project-1',
            name: 'Shared launch',
            description: null,
            status: 'active',
            health: 'on_track',
            progressPct: 35,
            dueDate: '2026-12-15',
            nextMilestone: null,
            leadUserId: 'alex',
            leadName: 'Alex Creator',
            leadAvatarUrl: null,
            projectLeads: [
              { userId: 'alex', name: 'Alex Creator', avatarUrl: null },
              { userId: 'jordan', name: 'Jordan Lead', avatarUrl: null },
            ],
            totalTasks: 2,
            completedTasks: 1,
            blockedTasks: 0,
            overdueTasks: 0,
          }],
        },
      });
      return;
    }
    if (url.pathname === '/api/admin/projects/overview') {
      await route.fulfill({
        json: {
          data: {
            interns: [],
            departments: [],
            totals: { projects: 1, on_track: 1, at_risk: 0, overdue: 0, blocked: 0, points: 0 },
          },
        },
      });
      return;
    }
    if (url.pathname === '/api/notifications') {
      await route.fulfill({
        json: {
          data: state.invitations.length ? [{
            id: 'notice-1', type: 'project_assigned', title: 'Project invitation',
            message: 'You have a project invitation.', link: '/projects/invitations',
            is_read: true, created_at: '2026-11-04T00:00:00.000Z', metadata: {},
          }] : [],
          unreadCount: 0,
          pagination: { page: 1, pageSize: 20, total: state.invitations.length ? 1 : 0, totalPages: 1 },
        },
      });
      return;
    }
    await route.fulfill({ json: { data: [] } });
  });
  return state;
}

test('a department lead selects multiple project leads with keyboard and mouse', async ({ page }, testInfo) => {
  const state = await mockProjectApis(page, people[0]);
  const errors: Array<string> = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/projects/new', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Alex Creator (Primary)')).toBeVisible();
  await expect(page.getByText(/Contributors can participate without lead management access/)).toBeVisible();
  const search = page.getByLabel('Search project leads');
  await search.fill('Jordan');
  const jordan = page.getByRole('checkbox', { name: 'Jordan Lead', exact: true });
  await expect(jordan).toBeVisible();
  await jordan.focus();
  await page.keyboard.press('Space');
  await expect(jordan).toBeChecked();
  await search.fill('Casey');
  await page.getByText('Casey Contributor', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Casey Contributor' })).toBeChecked();
  await page.getByRole('button', { name: 'Remove Alex Creator' }).click();
  await expect(page.getByText('Jordan Lead (Primary)')).toBeVisible();
  await expect(page.getByText(/you remain primary until they accept/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('new-project-desktop.png'), fullPage: true });

  await page.getByLabel('Project name').fill('Shared launch');
  await page.getByLabel('Target end date').fill('2099-12-15');
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect.poll(() => state.created.length).toBe(1);
  expect(state.created[0]).toMatchObject({ leadUserId: 'jordan', coLeadUserIds: ['casey'] });
  expect(errors).toEqual([]);
});

test('admin can recover an unavailable lead search and cannot submit without a lead on mobile', async ({ page }, testInfo) => {
  const state = await mockProjectApis(page, {
    id: 'admin',
    name: 'Admin Example',
    email: 'admin@example.test',
    role: 'admin',
  });
  state.failCandidates = true;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/projects/new', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('alert').filter({ hasText: 'Could not load eligible project leads' }))
    .toBeVisible();
  state.failCandidates = false;
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('checkbox', { name: 'Taylor Lead' })).toBeVisible();
  await page.getByLabel('Search project leads').fill('No one');
  await expect(page.getByText('No project leads found')).toBeVisible();
  await page.getByLabel('Search project leads').clear();
  await page.getByRole('button', { name: 'Clear all' }).click();
  await page.getByLabel('Project name').fill('No lead project');
  await page.getByLabel('Target end date').fill('2099-12-15');
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByText('Select a project lead')).toBeVisible();
  expect(state.created).toHaveLength(0);
  await page.getByRole('checkbox', { name: 'Taylor Lead' }).check();
  await expect(page.getByText('Taylor Lead (Primary)')).toBeVisible();
  await expect(page.getByText('Invitation required').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('new-project-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect.poll(() => state.created.length).toBe(1);
  expect(state.created[0].leadUserId).toBe('taylor');
  await expect(page.getByText('You are primary lead until the invited lead accepts.')).toBeVisible();
});

test('a co-lead can promote and demote contributors without changing the primary lead', async ({ page }, testInfo) => {
  const state = await mockProjectApis(page, people[1]);
  state.rejectNextPromotion = true;
  const pageErrors: Array<string> = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/projects/project-1', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Manage contributors' }).click();
  const dialog = page.getByRole('dialog', { name: 'Manage Contributors' });
  await expect(dialog.getByText('Primary project lead')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Remove Alex Creator' })).toHaveCount(0);
  await expect(dialog.getByText(/Contributors can participate without receiving/)).toBeVisible();

  const promote = dialog.getByRole('button', { name: 'Make project lead Casey Contributor' });
  await promote.click();
  await expect(page.getByText('Not eligible to be a project lead')).toBeVisible();
  await expect(promote).toBeVisible();
  await promote.click();
  const demote = dialog.getByRole('button', { name: 'Remove lead access from Casey Contributor' });
  await expect(demote).toBeVisible();
  await demote.click();
  await expect(promote).toBeVisible();

  await dialog.getByRole('combobox', { name: 'Role' }).click();
  await page.getByRole('option', { name: 'Project lead', exact: true }).click();
  await dialog.getByLabel('Search people').fill('Taylor');
  await dialog.getByRole('button', { name: 'Invite', exact: true }).click();
  await expect(dialog.getByText('Awaiting response')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Remove lead access from Taylor Lead' })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('manage-leads-desktop.png') });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(
    () => dialog.evaluate((element) => element.getBoundingClientRect().left),
    { timeout: 5000 }
  ).toBeGreaterThanOrEqual(14);
  const bounds = await dialog.evaluate((element) => ({
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(bounds.left).toBeGreaterThanOrEqual(14);
  expect(bounds.right).toBeLessThanOrEqual(376);
  expect(bounds.scrollWidth).toBe(bounds.clientWidth);
  expect(await dialog.getByText('Jordan Lead', { exact: true }).evaluate(
    (element) => element.scrollWidth <= element.clientWidth
  )).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('manage-leads-mobile.png') });
  await dialog.getByRole('button', { name: 'Cancel invitation' }).click();
  await expect(dialog.getByText('No pending invitations.')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('an ordinary contributor has no management control', async ({ page }) => {
  await mockProjectApis(page, people[2], false);
  await page.goto('/projects/project-1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Shared launch').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Manage contributors' })).toHaveCount(0);
});

test('roadmap and admin project table show and filter co-leads', async ({ page }, testInfo) => {
  await mockProjectApis(page, {
    id: 'admin',
    name: 'Admin Example',
    email: 'admin@example.test',
    role: 'admin',
  });
  const errors: Array<string> = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/work-tracker?view=roadmap&scope=team', { waitUntil: 'domcontentloaded' });
  const row = page.getByRole('row').filter({ hasText: 'Shared launch' });
  await expect(row.getByText('Alex Creator')).toBeVisible();
  await expect(row.getByText('Jordan Lead')).toBeVisible();
  await page.getByRole('combobox', { name: 'Filter projects by lead' }).click();
  await page.getByRole('option', { name: 'Jordan Lead' }).click();
  await expect(row).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('roadmap-leads-desktop.png') });

  await page.goto('/admin/war-room', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'All Projects', exact: true }).last().click();
  const adminRow = page.getByRole('row').filter({ hasText: 'Shared launch' });
  await expect(adminRow.getByText('Alex Creator')).toBeVisible();
  await expect(adminRow.getByText('Jordan Lead')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('admin-project-leads-desktop.png') });
  expect(errors).toEqual([]);
});

test('an invitee reviews a notification and accepts without replacing a newer primary', async ({ page }, testInfo) => {
  const state = await mockProjectApis(page, people[3], false);
  state.invitations.push({
    id: 'invitation-1', invitee_id: 'taylor', invitee_name: 'Taylor Lead', role: 'lead',
    make_primary: true, created_at: '2026-11-04T00:00:00.000Z',
  });
  const errors: Array<string> = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Project invitation/ }).press('Enter');
  await expect(page).toHaveURL(/\/projects\/invitations/);
  await expect(page.getByText('Proposed primary lead')).toBeVisible();
  await expect(page.getByText('Plan the launch together.')).toBeVisible();
  await expect(page.getByText(/otherwise you join as a co-lead/i)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('invitation-review-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('invitation-review-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Accept invitation' }).click();
  await expect(page.getByText(/joined as a co-lead/i)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open project' })).toBeVisible();
  await expect(page.getByRole('status').getByText('You joined Shared launch.')).toBeVisible();
  await expect(page.getByText('No pending invitations')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('accepted-project-mobile.png'), fullPage: true });
  expect(state.responses).toEqual(['accept']);
  expect(errors).toEqual([]);
});

test('an invitee can decline contributor access and recover a failed invitation list', async ({ page }, testInfo) => {
  const state = await mockProjectApis(page, people[3], false);
  state.invitations.push({
    id: 'invitation-2', invitee_id: 'taylor', invitee_name: 'Taylor Lead', role: 'contributor',
    make_primary: false, created_at: '2026-11-04T00:00:00.000Z',
  });
  state.failInvitations = true;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/projects/invitations', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('alert').getByText('Could not load invitations')).toBeVisible();
  state.failInvitations = false;
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText(/Contributors can participate without receiving/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('contributor-invitation-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Decline' }).click();
  await expect(page.getByText('You were not added to the project.')).toBeVisible();
  await expect(page.getByText('No pending invitations')).toBeVisible();
  expect(state.responses).toEqual(['decline']);
});
