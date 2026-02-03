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
| Employee | employee@test.com | password |
| Intern | intern@test.com | password |
| Admin | admin@test.com | password |
| Super Admin | superadmin@test.com | password |

### 4. Test Each Role

#### Employee Role
- Dashboard: `/dashboard`
- View personal profile, files, leave requests
- Access performance reviews
- View company announcements

**Navigation Items:**
- Dashboard
- My Profile
- My 201 Files
- Leave Requests
- Documents
- Performance Reviews
- Announcements

#### Intern Role
- Dashboard: `/intern/dashboard`
- Submit daily reports (EOD reports)
- Track internship hours
- Access learning resources
- Connect with mentor

**Navigation Items:**
- Dashboard
- My Tasks
- Learning Resources
- Timesheet
- Mentor Connect
- Documents
- Profile

#### Admin Role
- Dashboard: `/admin/dashboard`
- Manage employees and teams
- Approve leave requests
- Access HR reports
- Manage performance reviews
- Handle recruitment

**Navigation Items:**
- Dashboard
- Employee Management
- Team Management
- Leave Approvals
- Reports
- Performance Management
- Recruitment

#### Super Admin Role
- Dashboard: `/super-admin/dashboard`
- Full system access
- User and role management
- View audit logs
- Configure system settings
- Access all admin features

**Navigation Items:**
- Dashboard
- User Management
- System Settings
- Audit Logs
- Role Management
- (Plus all Admin features)

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

```typescript
import { useRequireAuth } from '@/contexts/AuthContext';

export default function ProtectedPage() {
  // Only allow employees
  const user = useRequireAuth(['employee']);

  // Or allow multiple roles
  const user = useRequireAuth(['admin', 'super_admin']);

  return <div>Protected content</div>;
}
```

### 3. Check User Role

```typescript
import { useAuth } from '@/contexts/AuthContext';

export default function ConditionalPage() {
  const { user } = useAuth();

  if (user?.role === 'admin') {
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
import { Sidebar, Header, AIChatbot } from '@hr-portal/ui';

export default function MyRoleLayout({ children }) {
  const user = useRequireAuth(['my_role']);
  const { logout } = useAuth();

  return (
    <div className="flex h-screen">
      <Sidebar
        variant={user.role}
        currentPath={pathname}
        onNavigate={handleNavigate}
      />
      <div className="flex-1">
        <Header
          user={user}
          onLogout={logout}
        />
        <main>{children}</main>
      </div>
      <AIChatbot />
    </div>
  );
}
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
- Manager leave approvals → `/admin/leave-approvals`

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
- [RBAC Implementation Guide](../../RBAC-IMPLEMENTATION.md)
- [Project Guidelines](../../CLAUDE.md)
