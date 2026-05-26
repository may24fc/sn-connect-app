# Data Flow Architecture

> Audience: Developers

How data flows through the Control Hub application — from user interaction to database and back.

---

## Client-Side Data Flow

### TanStack Query Pattern

All client-side data fetching uses TanStack Query with a query key factory:

```typescript
// Query key factory (apps/web/src/lib/query-keys.ts)
export const queryKeys = {
  employees: {
    all: ['employees'] as const,
    list: (filters) => [...queryKeys.employees.all, 'list', filters] as const,
    detail: (id) => [...queryKeys.employees.all, 'detail', id] as const,
  },
  // ... per domain
};
```

### Data Fetching Hook Pattern

```typescript
// Custom hook wrapping useQuery
export function useEmployees(filters: EmployeeFilters) {
  return useQuery({
    queryKey: queryKeys.employees.list(filters),
    queryFn: () => fetchEmployees(filters),
    staleTime: 5 * 60 * 1000,  // 5 minutes
  });
}

// Mutation with cache invalidation
export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });
}
```

### Cache Invalidation Strategy

| Event | Invalidated Keys |
|-------|-----------------|
| Create employee | `employees.all` |
| Update employee | `employees.all`, `employees.detail(id)` |
| Delete employee | `employees.all` |
| Submit report | `reports.all` |
| Approve invoice | `invoices.all`, `invoices.detail(id)` |

---

## Server-Side Data Flow

### API Route → Supabase → Response

```
1. Request arrives at API route handler
2. Create Supabase client from cookies (user context)
3. Validate request body/params with Zod
4. Execute Supabase query (RLS auto-applied)
5. Transform response (camelCase ↔ snake_case)
6. Return NextResponse.json()
```

### Admin Operations (Service Role)

Some operations require bypassing RLS:

```
1. Validate user is admin/super_admin
2. Create admin Supabase client (service role key)
3. Execute query with full access
4. Audit log the operation
5. Return response
```

---

## Realtime Data Flow

TanStack Query hooks with realtime subscriptions listen for database changes:

```typescript
// Pattern for realtime-enabled hooks
useEffect(() => {
  const channel = supabase
    .channel('announcements')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, []);
```

---

## File Upload Flow

```
Client (FormData with file)
  → API Route: validate size + MIME type
  → Supabase Storage: upload to bucket
    ├─ standup-recordings (500MB max)
    ├─ ai-knowledge (10MB max)
    └─ documents / onboarding-documents (10MB max)
  → Create/update database record with file path
  → Return signed URL or file path
```

### Storage Buckets

| Bucket | Max Size | MIME Types | Use Case |
|--------|----------|-----------|----------|
| `documents` | 10 MB | PDF, DOC, images | 201 files |
| `onboarding-documents` | 10 MB | PDF, DOC, images | Onboarding docs |
| `standup-recordings` | 500 MB | Audio, video | Standup recordings |
| `ai-knowledge` | 10 MB | PDF, DOC, TXT, MD | Knowledge base |
| `resources` | 100 MB | Various | Resource library |

---

## Audit Logging

Sensitive operations are logged to `audit_logs`:

```typescript
await supabaseAdmin.from('audit_logs').insert({
  user_id: user.id,
  action: 'ai_chat',
  table_name: 'knowledge_sources',
  record_id: null,
  details: { messageLength, hasContext, contextChunks },
});
```

### Audited Operations

- AI chat interactions
- Knowledge source CRUD
- User invitations
- Onboarding approvals
- Internship creation/extension
- Probation actions

---

*Last updated: 2026-02-27*
