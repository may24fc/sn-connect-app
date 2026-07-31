# Quick Start: Role-Based Access Control

## Testing the RBAC System

### 1. Start the Development Server

```bash
pnpm dev
```

### 2. Access the Login Page

Navigate to: `http://localhost:3000/login`

### 3. Test Credentials

Click any of the quick login buttons or manually enter:

| Role | Email | Password |
|------|-------|----------|
| Employee | employee@example.com | SamplePass!234 |
| Associate | associate@example.com | SamplePass!234 |
| Admin | admin@example.com | SamplePass!234 |
| Super Admin | super-admin@example.com | SamplePass!234 |

### 4. Test Each Role

#### Employee Role
- Dashboard: `/dashboard`
- View personal profile, files
- Access performance reviews
- View company announcements and resources

**Navigation Items:**
- Dashboard
- Profile
- Tasks
- Performance Reviews
- Reports
- Invoice
- Documents
- Information Hub

#### Associate Role
- Dashboard: `/associate/dashboard`
- Submit daily reports (EOD reports)
- Track internship hours
- Access documents and performance reviews

**Navigation Items:**
- Profile
- Dashboard
- Tasks
- Performance Reviews
- Documents
- Information Hub

#### Admin Role
- Dashboard: `/admin/dashboard`
- Manage employees and teams
- Access HR reports and analytics
- Manage performance reviews and cycles

**Navigation Items:**
- Dashboard
- Directory
- Employee Management
- Interns
- Performance
- Reports
- Jobs
- Announcements
- AI Knowledge
- Resources

#### Super Admin Role
- Dashboard: `/super-admin/dashboard`
- Full system access including all admin features
- Task management and payroll approvals
- System health monitoring

**Navigation Items:**
- Dashboard
- Directory
- Employee Management
- Task Management
- Interns
- Performance
- Reports
- Jobs
- Announcements
- AI Knowledge
- Resources
- Payroll Approvals

## Adding Auth to a New Page

### 1. Get User Information

```typescript
import { useAuth } from '@/contexts/AuthContext';

export default function MyPage() {
  const { user } = useAuth();

  return <div>Hello {user?.name}</div>;
}
```

### 2. Protect a Route

Use `useRequireAuth` in a layout file to restrict access:

```typescript
import { useRequireAuth } from '@/contexts/AuthContext';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // Only allow employees and interns
  const user = useRequireAuth(['employee', 'associate']);

  // Or allow admin roles
  const user = useRequireAuth(['admin', 'super_admin']);

  if (!user) return null; // Shows loading or redirects

  return <>{children}</>;
}
```

### 3. Check User Role

```typescript
import { useAuth } from '@/contexts/AuthContext';
import type { UserRoleType } from '@/contexts/AuthContext';

export default function ConditionalPage() {
  const { user } = useAuth();

  if (user?.role === 'admin' || user?.role === 'super_admin') {
    return <AdminView />;
  }

  return <EmployeeView />;
}
```

### 4. Handle Logout

```typescript
import { useAuth } from '@/contexts/AuthContext';

export default function MyComponent() {
  const { logout } = useAuth();

  return (
    <button onClick={logout}>
      Logout
    </button>
  );
}
```

## Creating a New Role-Specific Layout

1. Create layout file in appropriate directory:
   - Employees/Interns: `apps/web/src/app/(employee)/`
   - Admins/Super Admins: `apps/web/src/app/(admin)/`

2. Add role guard and auth context:

```typescript
'use client';

import { useRequireAuth, useAuth } from '@/contexts/AuthContext';
import type { UserRoleType } from '@/contexts/AuthContext';
import { Sidebar, Header } from '@hr-portal/ui';

export default function MyRoleLayout({ children }: { children: React.ReactNode }) {
  const user = useRequireAuth(['employee', 'associate']);
  const { logout } = useAuth();

  if (!user) return null;

  const sidebarVariant: UserRoleType = user.role === 'associate' ? 'associate' : 'employee';

  return (
    <div className="flex h-screen bg-muted/30">
      <Sidebar
        variant={sidebarVariant}
        currentPath={pathname}
        onNavigate={handleNavigate}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={user}
          onLogout={logout}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Sidebar variant types:**
```typescript
type UserRole = 'employee' | 'associate' | 'admin' | 'super_admin';
```

## Common Patterns

### Check if User is Authenticated

```typescript
const { isAuthenticated } = useAuth();

if (!isAuthenticated) {
  return <LoginPrompt />;
}
```

### Show Loading State

```typescript
const { isLoading, user } = useAuth();

if (isLoading) {
  return <Spinner />;
}
```

### Conditional Rendering by Role

```typescript
const { user } = useAuth();

return (
  <>
    {user?.role === 'admin' && <AdminTools />}
    {user?.role === 'super_admin' && <SuperAdminTools />}
  </>
);
```

## Sidebar Configuration

To add/modify navigation items for a role, edit:

`packages/ui/src/layout/Sidebar.tsx`

Example:

```typescript
const employeeNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Profile', href: '/profile', icon: User },
  // Add more items...
];
```

## TypeScript Types

```typescript
// Import types
import type { UserRole, User } from '@/contexts/AuthContext';

// Use in component
const MyComponent = (props: { role: UserRole }) => {
  // ...
};
```

## Troubleshooting

### Redirect Loop
- Check that route guards match the layout's protected routes
- Ensure login page is not protected

### User Not Persisting
- Check browser's localStorage
- Clear localStorage: `localStorage.clear()`
- Check for errors in browser console

### Wrong Dashboard After Login
- Verify user role in AuthContext
- Check redirect logic in login handler
- Ensure role matches expected values

### 404 on Route
- Verify file structure matches route path
- Check that page.tsx exists in route folder
- Ensure layout.tsx exists in parent folders

## Migration Notes

### Removing Manager Role

The manager role has been deprecated. Manager-specific features now live under admin:

- `/manager/team-performance` → `/admin/teams`
- `/manager/reviews` → `/admin/performance`

Update any hardcoded references to manager routes.

## Best Practices

1. **Always use TypeScript strict mode**
   - Define explicit types
   - No `any` types

2. **Server Components by default**
   - Only use 'use client' when necessary
   - Prefer server-side data fetching

3. **Protect all routes**
   - Use `useRequireAuth` in layouts
   - Check permissions at layout level

4. **Handle loading states**
   - Show spinners during auth checks
   - Graceful fallbacks for errors

5. **Type your role checks**
   - Use `UserRole` type
   - Avoid string literals

## Next Steps

1. Replace mock auth with Supabase Auth
2. Implement JWT token validation
3. Add server-side session management
4. Implement RLS policies in Supabase
5. Add refresh token logic
6. Implement audit logging
7. Add 2FA support

## Resources

- [AuthContext Implementation](../../apps/web/src/contexts/AuthContext.tsx)
- [Sidebar Configuration](../../packages/ui/src/layout/Sidebar.tsx)
- [Auth Architecture](../apps/web/architecture/auth.md)
- [Project Guidelines](../../CLAUDE.md)
