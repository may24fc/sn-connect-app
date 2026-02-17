# Credentials-First Onboarding Flow Implementation

## 🎯 Problem Statement

**What we're solving:**  
Traditional self-signup workflows allow users to create accounts without HR oversight. For enterprise environments, this creates security and onboarding workflow issues. The credentials-first flow ensures that **only authorized personnel (Admin/HR) can create user accounts**, and new users complete onboarding before being granted full access.

## 🏗️ Architecture Decision

**Why this approach:**  
- **Security Gate:** Admin/Super Admin creates user accounts via Supabase Auth admin API
- **Status-Driven Routing:** AuthContext redirects based on user status (pending_onboarding → awaiting_approval → active)
- **Real-Time Monitoring:** Postgres CDC (Change Data Capture) broadcasts onboarding completions to admin dashboards via `supabase.channel()`
- **Single Source of Truth:** All onboarding data lives in `onboarding_profiles` table

**Analogy:**  
Think of this like a security clearance process:
1. **Admin creates badge** (invite with temp credentials)
2. **Employee fills paperwork** (onboarding form)
3. **HR reviews & approves** (admin approval modal)
4. **Badge gets activated** (status: active, employee record created)

## 📋 Label

**[INDUSTRY STANDARD]** — Production-grade secure onboarding workflow

## Status Flow Diagram

```
┌──────────────────┐
│  Admin Invites   │
│  (creates auth   │
│   user account)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ pending_onboard  │◄── User receives temp password
│  (redirected to  │    Admin shares credentials
│  /onboarding)    │
└────────┬─────────┘
         │
         │ User completes
         │ onboarding form
         ▼
┌──────────────────┐
│awaiting_approval │◄── Real-time broadcast
│  (waiting page   │    Admin sees submission
│  with countdown) │
└────────┬─────────┘
         │
         │ Admin
         │ reviews & approves
         ▼
┌──────────────────┐
│   active         │◄── Employee record created
│  (full access)   │    User can access dashboard
└──────────────────┘
```

## 🔐 Security Review

### RLS Implications

1. **Invite Endpoint** (`POST /api/users/invite`):
   - ✅ **Protected:** Only `admin` and `super_admin` roles can call
   - ✅ **Validation:** Zod schema enforces email, firstName, lastName, role
   - ✅ **Rollback Logic:** If any step fails, deletes partial records

2. **Approval Endpoint** (`POST /api/users/approve-onboarding`):
   - ✅ **Protected:** Only `admin` and `super_admin` roles can call
   - ✅ **Status Check:** Verifies user has `awaiting_approval` status
   - ✅ **Audit Trail:** Logs approval/rejection in `users.updated_by`

3. **Real-Time Subscriptions**:
   - ✅ **RLS Gated:** Subscriptions respect RLS policies on `onboarding_profiles` and `users` tables
   - ✅ **Filtered by Role:** Admin can only see submissions for their tier (`intern` or `employee`)

### Attack Vectors Mitigated

| Attack | Mitigation |
|--------|------------|
| User self-signup | ❌ No public signup — only admin-created accounts |
| Status manipulation | ✅ API validates current status before transitions |
| Role elevation | ✅ Employee record creation only happens after `active` status |
| PII exposure | ✅ Real-time channels exclude sensitive fields (SSN, salary, etc.) |

## 💻 Implementation

### 1. Database Migration (20260217000003_add_onboarding_statuses.sql)

```sql
-- Adds two new status values to user_status enum
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'pending_onboarding';
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'awaiting_approval';

-- Flow: pending_onboarding → awaiting_approval → active
```

### 2. Backend API Routes

#### Invite Endpoint (`POST /api/users/invite`)

```typescript
// Creates:
// 1. Supabase Auth user (with temp password)
// 2. public.users record (status: pending_onboarding)
// 3. onboarding_profiles record (pre-filled with admin data)

// Returns: { email, temporaryPassword }
// Admin must securely share these credentials
```

**Key Design Decisions:**
- **12-character password:** Mix of A-Z, a-z, 0-9 for strength
- **Rollback on failure:** Deletes auth user if DB insert fails
- **Pre-fill data:** Admin-provided position/department saves user time

#### Approval Endpoint (`POST /api/users/approve-onboarding`)

```typescript
// If approved:
// - Sets user.status = 'active'
// - Creates employees table record
// - Generates employee_number: EMP-YYYYMMDD-{random}

// If rejected:
// - Keeps status = 'awaiting_approval'
// - Stores rejection notes
// - User sees message on next login
```

### 3. Frontend Components

#### InviteUserModal.tsx

**Features:**
- Form for email, firstName, lastName, role, position, departmentId
- Success state shows credentials with copy buttons
- ⚠️ Warning that password is shown only once

**Why separate modal:**  
Avoids cluttering the main page. Keeps UX focused on current task.

#### ApproveOnboardingModal.tsx

**Features:**
- 4 tabs: Personal, Contact, Government IDs, Bank Details
- Full onboarding data review before approval
- Approve/Reject buttons with notes field
- Sensitive fields masked (e.g., bank account shows last 4 digits)

**Why tabbed layout:**  
Onboarding data is extensive. Tabs reduce cognitive load and allow focused review.

### 4. Real-Time Subscriptions (useRealtimeOnboardingApprovals.ts)

```typescript
// Subscribes to two Postgres CDC channels:
// 1. onboarding_profiles (is_completed=true)
// 2. users (status=awaiting_approval)

// On change: Re-fetches pending approvals, invalidates queries
```

**Analogy:** Like a restaurant kitchen display that auto-updates when new orders arrive.

**Why two channels:**  
- **onboarding_profiles:** Catches completion event
- **users:** Catches status changes (approval/rejection)

### 5. AuthContext Status-Based Routing

```typescript
// In login():
if (nextUser.status === 'pending_onboarding') {
  router.push('/onboarding/setup');
} else if (nextUser.status === 'awaiting_approval') {
  router.push('/onboarding/awaiting-approval');
}
```

**Why in AuthContext:**  
Central location ensures all login paths (including refreshes) respect status routing.

### 6. Integration in Admin Pages

Both `Interns` and `Employee Probation` pages now have:
- **Onboarding Tab** with real-time monitoring
- **Pending Approvals Card** (highlighted when >0 submissions)
- **Invite Employee/Intern Button** (opens modal)
- **Real-time connection indicator** (pulsing green dot)

## ⚠️ Pitfalls (Common Mistakes to Avoid)

1. **Full Page Re-Renders:**
   - ❌ DON'T: Re-fetch entire employee list on real-time event
   - ✅ DO: Use TanStack Query invalidation for surgical updates

2. **Temp Password Exposure:**
   - ❌ DON'T: Log temp password to console/server logs
   - ✅ DO: Show once in UI, clear on modal close

3. **Missing RLS on Subscriptions:**
   - ❌ DON'T: Assume real-time channels are automatically filtered
   - ✅ DO: Verify RLS policies apply to subscribed tables

4. **Status Transition Validation:**
   - ❌ DON'T: Allow direct jump from `pending_onboarding` to `active`
   - ✅ DO: Enforce intermediate `awaiting_approval` state

5. **Race Conditions:**
   - ❌ DON'T: Assume real-time event arrives before query refetch completes
   - ✅ DO: Use `queryClient.invalidateQueries` to re-fetch after subscription event

## ✅ Verification Steps

### 1. Test Invite Flow

```bash
# As admin@test.com:
1. Navigate to /admin/interns or /admin/probation
2. Click "Invite Intern/Employee"
3. Fill form, submit
4. Verify credentials shown with copy buttons
5. Check Supabase Dashboard:
   - auth.users has new user
   - public.users has status='pending_onboarding'
   - onboarding_profiles exists for user_id
```

### 2. Test Onboarding Completion

```bash
# As newly created user:
1. Login with temp credentials
2. Verify redirect to /onboarding/setup
3. Complete all onboarding steps
4. Submit final step
5. Verify redirect to /onboarding/awaiting-approval
6. Check status in users table: 'awaiting_approval'
```

### 3. Test Real-Time Monitoring

```bash
# As admin (open two browser tabs):
Tab 1: Admin dashboard on "Onboarding" tab
Tab 2: New user completes onboarding

Expected: Tab 1 shows new pending approval WITHOUT page refresh
- Green pulsing dot shows "Real-time monitoring active"
- Pending Approvals table auto-updates
```

### 4. Test Approval

```bash
# As admin@test.com:
1. Click "Review & Approve" on pending submission
2. Review tabs (Personal, Contact, Gov IDs, Bank)
3. Add approval notes
4. Click "Approve"
5. Verify:
   - user.status = 'active'
   - employees table has new record
   - employee_number generated (EMP-YYYYMMDD-XXX)
   - User can now login and see role-based dashboard
```

### 5. Test Rejection

```bash
# As admin:
1. Click "Review & Approve"
2. Add rejection notes: "SSS number invalid"
3. Click "Reject"
4. As rejected user:
   - Login still shows /onboarding/awaiting-approval
   - Status remains 'awaiting_approval'
   - Admin can re-review and approve later
```

## 📂 Files Created/Modified

### Created Files (9):

1. **supabase/migrations/20260217000003_add_onboarding_statuses.sql**  
   - Adds `pending_onboarding` and `awaiting_approval` to user_status enum

2. **apps/web/src/app/api/users/invite/route.ts**  
   - POST endpoint for admin to create invited users

3. **apps/web/src/app/api/users/approve-onboarding/route.ts**  
   - POST endpoint for admin to approve/reject onboarding

4. **apps/web/src/app/onboarding/awaiting-approval/page.tsx**  
   - Waiting screen for users whose onboarding is submitted

5. **apps/web/src/hooks/useUserManagement.ts**  
   - React Query hooks: `useInviteUser`, `useApproveOnboarding`

6. **apps/web/src/hooks/useRealtimeOnboardingApprovals.ts**  
   - Supabase real-time subscription hook for pending approvals

7. **apps/web/src/components/admin/InviteUserModal.tsx**  
   - Modal for admin to invite employee/intern

8. **apps/web/src/components/admin/ApproveOnboardingModal.tsx**  
   - Modal for admin to review and approve onboarding submissions

9. **docs/credentials-first-onboarding-flow.md** (this file)  
   - Complete implementation documentation

### Modified Files (4):

1. **apps/web/src/contexts/AuthContext.tsx**  
   - Added `status` field to User interface
   - Fetch status from database on session build
   - Status-based routing in `login()` function

2. **apps/web/src/app/api/onboarding/profile/complete/route.ts**  
   - Added status update to `awaiting_approval` on completion

3. **apps/web/src/app/(admin)/admin/interns/page.tsx**  
   - Integrated real-time monitoring
   - Added Invite Intern button
   - Redesigned Onboarding tab with pending approvals

4. **apps/web/src/app/(admin)/admin/probation/page.tsx**  
   - Integrated real-time monitoring
   - Added Invite Employee button
   - Redesigned Onboarding tab with pending approvals

## 🔄 Status Transition Matrix

| Current Status | User Action | New Status | Notes |
|----------------|-------------|------------|-------|
| `pending_onboarding` | Completes onboarding form | `awaiting_approval` | Auto-redirected to waiting page |
| `awaiting_approval` | Admin approves | `active` | Employee record created |
| `awaiting_approval` | Admin rejects | `awaiting_approval` | Notes stored, user can resubmit |
| `active` | N/A | `active` | Normal operations |

## 🚀 Next Steps (Recommended)

1. **Email Notifications:**  
   - Send temp password via email instead of showing in modal
   - Notify user when onboarding is approved/rejected
   - Implementation: n8n workflow triggered by status changes

2. **Password Change Requirement:**  
   - Force user to change temp password on first login
   - Use Supabase Auth update password flow

3. **Rejection Workflow:**  
   - Allow user to see rejection notes
   - Provide "Resubmit" button to edit onboarding
   - Track resubmission count

4. **Bulk Invite:**  
   - CSV upload for multiple invites
   - Preview table before committing
   - Batch employee number generation

5. **Approval Delegation:**  
   - Allow department managers to approve their team's onboarding
   - Implement `is_manager_of()` check in approval endpoint

## 💡 Analogies for Key Concepts

| Concept | Real-World Analogy |
|---------|-------------------|
| `pending_onboarding` | "Badge issued but paperwork not submitted" |
| `awaiting_approval` | "Application submitted, waiting for interview callback" |
| Real-time subscription | "Airport departure board that auto-updates" |
| RLS on subscriptions | "Hotel room key that only opens your floor" |
| Rollback on invite failure | "Credit card pre-authorization that gets voided if purchase fails" |

## 🎓 Junior Dev Tips

1. **Why separate `pending_onboarding` from `awaiting_approval`?**  
   - Users need different UX for each state
   - `pending_onboarding` → Form to fill
   - `awaiting_approval` → Waiting screen (no action needed)

2. **Why not just use `user.role` for routing?**  
   - Role defines permissions, status defines lifecycle
   - An `employee` role can have `pending_onboarding` status
   - Separates concerns: authorization vs. onboarding state

3. **Why TanStack Query instead of direct state updates?**  
   - Automatic deduplication (multiple subscriptions don't spam backend)
   - Built-in loading/error states
   - Cache invalidation is less error-prone than manual state updates

4. **Why subscribe to TWO channels?**  
   - `onboarding_profiles` → Catches form completion
   - `users` → Catches admin approval/rejection
   - Ensures UI updates on all relevant events

## 📊 Real-Time Event Flow

```
[User completes onboarding]
         │
         ▼
┌──────────────────────┐
│ POST /api/onboarding │
│  /profile/complete   │
└──────────┬───────────┘
           │
           │ UPDATE users SET status='awaiting_approval'
           ▼
┌──────────────────────┐
│  Postgres Trigger    │◄── RLS applies here
│  (Notify CDC)        │
└──────────┬───────────┘
           │
           │ Broadcast to subscribed channels
           ▼
┌──────────────────────┐
│ Admin Dashboard      │
│ (useRealtimeOnboard  │
│  ingApprovals)       │
└──────────┬───────────┘
           │
           │ queryClient.invalidateQueries()
           ▼
┌──────────────────────┐
│  Re-fetch pending    │
│  approvals           │
│  (RLS filtered)      │
└──────────────────────┘
```

## 🔧 Debugging Tips

### Real-Time Not Working?

1. Check subscription status:
   ```typescript
   console.log('Subscribed:', isSubscribed); // Should be true
   ```

2. Verify RLS policies allow subscription:
   ```sql
   SELECT * FROM onboarding_profiles WHERE is_completed = true;
   -- Should return rows visible to current user
   ```

3. Check browser console for WebSocket errors:
   ```
   SupabaseClient: realtime websocket disconnected
   ```

### Invite Failing?

1. Check API response:
   ```typescript
   // In browser Network tab:
   // POST /api/users/invite
   // Look for error message in response
   ```

2. Verify admin role:
   ```sql
   SELECT role FROM users WHERE id = auth.uid();
   -- Should return 'admin' or matching DB role for super_admin
   ```

### Status Not Updating?

1. Check AuthContext fetch:
   ```typescript
   // In buildUserFromSession:
   console.log('Fetched status:', statusData); // Should have status field
   ```

2. Verify database update:
   ```sql
   SELECT status FROM users WHERE id = '<user_id>';
   -- Should show 'awaiting_approval' after completion
   ```

---

## Summary

The **Credentials-First Onboarding Flow** is now fully implemented with:
- ✅ Admin-only user creation
- ✅ Status-driven authentication routing
- ✅ Real-time monitoring of onboarding submissions
- ✅ Secure approval workflow with data review
- ✅ Complete UI integration in Interns and Employee Probation pages

**Test Accounts:**
- Admin: `admin@test.com` (password: `password`)
- Super Admin: `superadmin@test.com` (password: `password`)

**Demo Flow:**
1. Login as admin
2. Navigate to Interns page
3. Click "Invite Intern"
4. Create test user
5. Logout, login as new user with temp password
6. Complete onboarding
7. Logout, login as admin
8. See real-time notification in Onboarding tab
9. Click "Review & Approve"
10. Approve submission
11. Logout, login as new user → Now has full access

**Production Readiness:** [INDUSTRY STANDARD] — Requires email notifications and password change enforcement before deployment.
