# Employee Management

This guide covers inviting new employees, approving onboarding, and managing employee records.

## Employee Directory (`/admin/directory`)

The directory provides a searchable list of all employees in the organization.

### Search and Filter

- **Search** by name, email, or employee ID
- **Filter** by department, role, or status

### Employee Records

Each employee entry shows:

- Name and position
- Department
- Role badge
- Status (active, on leave, terminated)
- Action menu

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
- Employment type (regular, probationary, intern, project-based)
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
| `intern` | Limited features (no invoices, no weekly reports) |
| `admin` | HR administration features |
| `super_admin` | Full system access |

Role changes require admin or super admin privileges and are audit-logged.

---

Next: [Intern Management](intern-management.md) · Previous: [Getting Started](getting-started.md)
