# Authentication & Authorization

> Audience: Developers

Complete auth flow documentation covering login, session management, middleware, and role-based access control.

---

## Authentication Provider

**Supabase Auth** with PKCE (Proof Key for Code Exchange) flow. Sessions are managed via httpOnly cookies using `@supabase/ssr`.

### Login Flow

```
1. User enters email + password on /login
2. Client calls supabase.auth.signInWithPassword()
3. Supabase returns session tokens
4. @supabase/ssr stores tokens in httpOnly cookies
5. Middleware refreshes session on subsequent requests
6. AuthContext loads user profile from public.users
```

### Mock Auth (Development)

Set `NEXT_PUBLIC_ENABLE_MOCK_AUTH=true` to bypass Supabase Auth. Test accounts:

| Email | Role |
|-------|------|
| `employee@test.com` | employee |
| `intern@test.com` | intern |
| `admin@test.com` | admin |
| `superadmin@test.com` | super_admin |

---

## Middleware (`apps/web/src/middleware.ts`)

Runs on every request (except static assets). Responsibilities:

### 1. Session Refresh

Creates a Supabase middleware client, calls `auth.getSession()` to refresh tokens and update cookies.

### 2. Route Protection

| Path Type | Behavior |
|-----------|----------|
| Public (`/login`, `/forgot-password`) | Allow without session |
| Public API (`/api/auth/*`) | Allow without session |
| Protected (`/dashboard`, `/admin`, `/intern`, etc.) | Require valid session → redirect to `/login?redirect=` |

### 3. Onboarding Gate

For `employee` and `intern` roles accessing `/dashboard` or `/intern/dashboard`:

1. Check `onboarding_profiles.is_completed` for the user
2. If not complete → redirect to `/onboarding/setup`

### 4. Intern Setup Gate

For `intern` role with completed onboarding accessing `/intern/dashboard`:

1. Look up employee record
2. Check for active internship record
3. If none exists → redirect to `/intern/setup`

### 5. Security Headers

Non-public paths get `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

---

## Role System

### Database Roles (4 roles in `public.users.role`)

| Role | Description | Access Level |
|------|-------------|-------------|
| `employee` | Regular employee | Own data, team resources |
| `intern` | Intern | Own data, limited features |
| `admin` | HR administrator | All employee data, management features |
| `super_admin` | Executive / COS | Full system access, payroll, AI config |

### Role Checking in API Routes

```typescript
// Standard pattern in API route handlers
const { data: userData } = await supabase
  .from('users')
  .select('role')
  .eq('auth_id', user.id)
  .single();

const isAdmin = ['admin', 'super_admin'].includes(userData.role);
```

### Admin Client (Bypass RLS)

For operations that need cross-table access or admin-level queries:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**WARNING:** Admin client bypasses all RLS. Only use server-side, never expose to client.

---

## RLS Helper Functions

Database functions for authorization queries:

| Function | Description |
|----------|-------------|
| `user_has_role(user_id, role)` | Check if user has specific role |
| `user_has_any_role(user_id, roles[])` | Check against multiple roles |
| `get_user_role(user_id)` | Get user's current role |
| `is_manager_of(manager_id, employee_id)` | Verify manager relationship |
| `get_direct_reports(manager_id)` | List manager's direct reports |

---

## Session Lifecycle

```
Login → Session created (access + refresh tokens in cookies)
  ↓
Every request → Middleware refreshes session
  ↓
Token expired → Supabase auto-refreshes via refresh token
  ↓
Refresh token expired → User redirected to /login
  ↓
Signout → POST /api/auth/signout → Cookies cleared
```

---

*Last updated: 2026-02-27*
