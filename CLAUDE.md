# CLAUDE.md - HR Portal Development Guidelines

## Project Context
This is an HR Portal with an AI Agent serving as a centralized reference point for HR and employees. The system uses a three-tier architecture:
- **Interface**: Next.js 14+ with Capacitor for web/mobile
- **Orchestrator**: n8n workflow automation
- **Data Layer**: Supabase with Row Level Security (RLS)

## Architecture Principles
1. **Zero-Trust Security**: Never trust client-side data. Always validate on server.
2. **RLS as Final Gatekeeper**: Database-level security is the last line of defense.
3. **JWT-Based Auth**: All requests must carry valid JWT tokens.
4. **Separation of Concerns**: UI → API → n8n → Supabase → AI

## Code Standards

### TypeScript
- Use strict mode with no `any` types
- Define explicit return types for all functions
- Use branded types for IDs (e.g., `type EmployeeId = string & { __brand: 'EmployeeId' }`)

### React/Next.js
- Server Components by default, Client Components only when necessary
- Use React Server Actions for mutations
- Implement optimistic updates for better UX
- Follow the Container/Presenter pattern

### Database
- All tables must have RLS policies
- Use snake_case for database columns
- Always include `created_at`, `updated_at`, `created_by` columns
- Soft delete with `deleted_at` column where appropriate

### Security
- Never log sensitive data (SSN, salaries, health info)
- Sanitize all user inputs
- Rate limit API endpoints
- Implement audit logging for sensitive operations

## File Naming Conventions
- Components: PascalCase (e.g., `EmployeeCard.tsx`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Types: PascalCase with `.types.ts` suffix
- Tests: Same name with `.test.ts` or `.spec.ts` suffix

## Testing Requirements
- Unit tests for all utility functions
- Integration tests for API routes
- E2E tests for critical user flows
- Minimum 80% coverage for business logic

## Commit Message Format
```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```
Types: feat, fix, docs, style, refactor, test, chore

## PR Requirements
- All tests passing
- No TypeScript errors
- Documentation updated
- Security review for auth/data changes