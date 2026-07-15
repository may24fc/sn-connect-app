# Employee Management

This guide covers inviting new employees, approving onboarding, and managing employee records.

## Employee Directory (`/admin/directory`)

The directory provides a searchable list of all employees in the organization, powered by the `employee_directory` database view.

### Search and Filter

- **Search** by name, email, or position
- **Filter** by department, role, status, or employment type
- **Sort** by name, department, start date, status, role, or position
- **Pagination** with configurable page size (up to 100)

### Metadata Summary

Aggregate counts are shown at the top: total employees, active, interns, on leave, and on probation.

### Employee Records

Each employee entry shows:

- Name and position
- Department
- Role badge
- Status (active, on leave, terminated)
- Employment type
- Action menu

### CSV Export

Click **"Export"** to download the directory as a CSV file. The export supports the same filters as the listing — export by role, department, or status. The file includes: Full Name, Role, Department, Position, Status, Employment Type, Start Date, Email, Contact Number.

### Employee Detail View (`/admin/directory/[userId]`)

Click on an employee to view their full profile:

- All directory fields
- Profile avatar
- Profile change request history (pending, approved, rejected)

Use this view to review and manage employee profile change requests.

## Inviting New Employees

To add a new employee to the system:

1. Navigate to Employee Management
2. Click **"Invite"**
3. Enter the employee's email address, name, and role
4. Click **Send Invitation**

The system creates a user account and sends an invitation. When the employee signs up and logs in, they'll be directed to the onboarding wizard.

### API Details

The invite uses the `POST /api/users/invite` endpoint which:

- Creates a Supabase auth user
- Inserts a record in the `users` table
- Assigns the specified role
- Triggers the onboarding flow on first login

## Approving Onboarding

After an employee completes the onboarding wizard:

1. Their submission appears in your pending approvals
2. Review the submitted information (personal data, bank details, documents)
3. Click **Approve** to activate the employee
4. Or request corrections if anything is missing

### Document Review

During onboarding approval, verify:

- Government-issued ID is valid and readable
- Birth certificate matches the provided details
- CV/resume is complete
- Profile photo meets company standards

## Assigning Employee Records

Use `POST /api/users/assign-employee` to link a user account to a full employee record (201 file). This creates the `employees` table entry with:

- Employee ID
- Department assignment
- Position
- Employment type (regular, probationary, associate, project-based)
- Work arrangement (full-time, part-time)
- Start date

## Managing Employee Status

Employee statuses:

| Status | Meaning |
|--------|---------|
| **Active** | Currently employed |
| **On Leave** | Temporarily away |
| **Terminated** | No longer with the company (soft-deleted) |

Status changes are logged in the `audit_logs` table for compliance.

## Role Assignment

Available roles:

| Role | Access Level |
|------|-------------|
| `employee` | Standard employee features |
| `associate` | Limited features (no invoices, no weekly reports) |
| `admin` | HR administration features |
| `super_admin` | Full system access |

Role changes require admin or super admin privileges and are audit-logged.

## Profile Change Requests

Employees can submit requests to change their profile information (name, contact number, address, etc.). These appear in the admin panel for review.

### Reviewing a Request

1. Navigate to **Employee Detail** (`/admin/directory/[userId]`)
2. View pending change requests with old → new field values
3. **Approve** to apply changes automatically to the `employees` table
4. **Reject** with a reason

When approved, the system updates the employee record and marks the request as complete. If the database update fails, the approval is rolled back.

### API Details

- `GET /api/profile-change-requests` — List all requests (RLS-scoped)
- `POST /api/profile-change-requests` — Submit a new request
- `PATCH /api/profile-change-requests` — Approve or reject (admin only)

---

## Inactive Account Management

Admins can deactivate and reactivate employee accounts directly from the Directory.

### Deactivating an Employee

1. Open the employee's detail view (`/admin/directory/[userId]`).
2. Click **Deactivate Account** in the action menu.
3. Confirm the dialog — this sets `status = inactive` and blocks the user from logging in.

Deactivated accounts remain in the directory and all historical records are preserved. They do not count toward active headcount.

### Reactivating an Employee

1. In the Directory, use the **Status** filter to show inactive employees.
2. Open the employee's detail view.
3. Click **Reactivate Account** — sets `status = active` and restores login access.

### Hire Date Updates

When an employee's hire date is corrected:

1. Open the employee's detail view.
2. Click **Edit** on the hire date field.
3. Enter the corrected date and save.

Updating the hire date triggers a **milestone recalculation** — any anniversary or tenure milestones are recomputed based on the new date.

---

*Last updated: 2026-04-10*

Next: [Associate Management](associate-management.md) · Previous: [Getting Started](getting-started.md)
