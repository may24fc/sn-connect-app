# @hr-portal/auth

Authentication utilities for the Control Hub HR Portal.

## Status

**Not yet implemented.** This package is a placeholder for shared auth utilities (JWT verification, role checking, token refresh). Currently, authentication is handled directly in the Next.js app:

- **Supabase Auth PKCE flow** — `apps/web/src/lib/supabase/`
- **Auth Context** — `apps/web/src/contexts/AuthContext.tsx`
- **Route middleware** — `apps/web/src/middleware.ts`
- **Mock auth** — `NEXT_PUBLIC_ENABLE_MOCK_AUTH=true`

## Planned Exports

```typescript
// Future: JWT utilities
export { verifyToken, signToken } from './jwt';
export { hasRole, requireRole } from './roles';
export { createSessionClient } from './supabase';
```
