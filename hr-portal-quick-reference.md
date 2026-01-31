# HR Portal - Claude Code Quick Reference

## 🚀 Project Kickoff Commands

```bash
# Initialize the project
claude "Initialize a Next.js 14 monorepo with pnpm workspaces for an HR Portal. Include apps/web, packages/ui, packages/database, packages/auth. Use TypeScript strict mode and Biome."

# Create CLAUDE.md (paste the full content from main guide)
claude "Create the CLAUDE.md file with our HR Portal guidelines"
```

---

## 📁 Phase 1: Foundation

### Database Setup
```bash
claude "Create Supabase migrations for users, employees, departments, and documents tables with comprehensive RLS policies. Include audit triggers and proper indexes."
```

### Authentication
```bash
claude "Implement Supabase Auth with JWT in packages/auth. Include middleware for protected routes, role-based access, and useAuth/usePermissions hooks."
```

### AI Integration
```bash
claude "Create Claude API integration in packages/ai with streaming support, rate limiting, and a configurable system prompt for HR policy queries."
```

---

## 📁 Phase 2: Notifications & Workflows

### Notification System
```bash
claude "Build a multi-channel notification system with database tables, email/push/in-app delivery, and user preferences. Include n8n webhook handlers."
```

### Birthday/Anniversary Automation
```bash
claude "Create n8n workflow JSON that runs daily at 8 AM PHT to check birthdays and work anniversaries, then sends notifications to all employees."
```

### Payroll Invoice System
```bash
claude "Implement invoice submission system with upload, COS-only visibility (RLS), status tracking, and deadline reminders via n8n."
```

### Onboarding
```bash
claude "Create automated onboarding with checklist templates, task tracking, and n8n workflows for new hire notifications and reminders."
```

---

## 📁 Phase 3: Dashboards

### Probation Dashboard
```bash
claude "Build HR-only probation tracking dashboard showing 30/60/90 day stages with status indicators (On Track/Needs Attention/At Risk) and manager review tracking."
```

### Performance System
```bash
claude "Implement semi-annual performance appraisal with OKRs, KPIs, self/manager assessments, and n8n automation for deadlines and reminders."
```

---

## 🛠️ Custom Slash Commands

Save these in `.claude/commands/`:

| Command | Usage |
|---------|-------|
| `/hr-migrate` | `/hr-migrate "add status column to employees"` |
| `/hr-workflow` | `/hr-workflow "payroll-reminder" "cron"` |
| `/hr-component` | `/hr-component "EmployeeCard" "ui"` |
| `/hr-test` | `/hr-test "src/utils/formatDate.ts"` |
| `/hr-doc` | `/hr-doc "authentication" "guide"` |

---

## 🧪 Testing Commands

```bash
# Run all tests
claude "Run the full test suite and report any failures"

# RLS policy testing
claude "Test RLS policies for the invoices table ensuring employees only see their own and COS sees all"

# E2E test
claude "Create Playwright E2E test for the employee login → view profile → update profile flow"
```

---

## 🔒 Security Checks

```bash
# Security audit
claude "Review all RLS policies and ensure no data leakage between roles"

# Auth review
claude "Audit authentication flow for session hijacking vulnerabilities"

# Input validation
claude "Check all form inputs for proper sanitization against XSS and injection"
```

---

## 📊 Common Patterns

### Adding a New Feature
```bash
# 1. Database
claude "Create migration for [feature] table with RLS"

# 2. API
claude "Create API routes for [feature] CRUD operations"

# 3. UI
claude "Create React components for [feature] list and detail views"

# 4. Tests
claude "Generate comprehensive tests for [feature]"

# 5. Docs
claude "Document [feature] API endpoints and usage"
```

### Adding a New Notification Type
```bash
claude "Add PROBATION_REVIEW_DUE notification type with:
1. Database enum update
2. Email template
3. n8n trigger workflow
4. UI badge and dropdown integration"
```

### Creating an n8n Workflow
```bash
claude "Create n8n workflow for [trigger] that:
1. Authenticates with Supabase service role
2. Queries [data]
3. Processes results
4. Sends notifications via [channel]
5. Logs completion
Export as importable JSON."
```

---

## 🔄 Git Workflow

```bash
# Start new feature
git checkout -b feature/[feature-name]

# Commit with conventional commits
git commit -m "feat(scope): description"
git commit -m "fix(scope): description"
git commit -m "docs(scope): description"

# Create PR
claude "Create PR description for my changes in [feature]"
```

---

## ⚡ Performance Prompts

```bash
# Query optimization
claude "Optimize this Supabase query: [query]. Add proper indexes if needed."

# Component optimization  
claude "Add React.memo, useMemo, and useCallback optimizations to [component]"

# Bundle analysis
claude "Analyze the Next.js bundle and suggest code splitting improvements"
```

---

## 🆘 Troubleshooting

```bash
# Debug RLS
claude "Debug why employee ID [x] can't see their own records. Check RLS policies and JWT claims."

# Debug n8n
claude "The [workflow] isn't triggering. Check cron expression and webhook configuration."

# Debug auth
claude "Users are getting logged out unexpectedly. Review session and token refresh logic."
```

---

## 📝 Quick Architecture Reference

```
┌─────────────────────────────────────────────────────┐
│                    INTERFACE                         │
│              Next.js + Capacitor                     │
│                  (JWT Auth)                          │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                  ORCHESTRATOR                        │
│                    n8n                               │
│     (Verify JWT → Query Data → AI Process)          │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                              ▼
┌───────────────────┐    ┌─────────────────────────────┐
│   Claude API      │    │        SUPABASE              │
│   (HR Queries)    │    │   (RLS = Final Gatekeeper)  │
└───────────────────┘    └─────────────────────────────┘
```

---

## ✅ Daily Checklist

- [ ] Run tests: `pnpm test`
- [ ] Check types: `pnpm typecheck`
- [ ] Lint: `pnpm lint`
- [ ] Review RLS if data changes
- [ ] Update docs if API changes
- [ ] Commit with conventional commits
