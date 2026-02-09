# Vercel Deployment Workflow - Setup Complete

## Summary

A comprehensive Vercel deployment workflow has been created for the HR Portal monorepo. This workflow automates preview deployments for pull requests and production deployments when merging to master.

---

## Files Created

### 1. Workflow File
**Location:** `/workspaces/sn-hr-portal/.github/workflows/vercel-deploy.yml`
**Size:** 9.4 KB

**Features:**
- Automatic preview deployments for PRs to master
- Automatic production deployments on push to master
- Type checking and linting before deployment
- Monorepo-aware build process (builds packages first)
- pnpm dependency caching for faster builds
- Path filtering to only run when relevant files change
- PR comments with preview URLs
- Automatic comment updates on subsequent pushes
- GitHub Deployments API integration
- Comprehensive error handling and failure notifications

**Triggers:**
- Pull requests to `master` (Preview)
- Pushes to `master` (Production)
- Only when these paths change:
  - `apps/web/**`
  - `packages/**`
  - `pnpm-lock.yaml`
  - `.github/workflows/vercel-deploy.yml`

### 2. Documentation Files

#### VERCEL_SETUP.md
**Location:** `/workspaces/sn-hr-portal/.github/workflows/VERCEL_SETUP.md`
**Size:** 12 KB

Comprehensive setup guide including:
- Step-by-step installation instructions
- Vercel CLI setup
- GitHub secrets configuration
- Environment variable setup
- Troubleshooting common issues
- Security best practices

#### DEPLOYMENT_FLOW.md
**Location:** `/workspaces/sn-hr-portal/.github/workflows/DEPLOYMENT_FLOW.md`
**Size:** 33 KB

Visual documentation with ASCII diagrams showing:
- Pull request deployment flow
- Production deployment flow
- Monorepo build process
- Decision tree logic
- Failure and rollback procedures
- Environment variable handling
- Caching strategy
- Security boundaries

#### DEPLOYMENT_CHECKLIST.md
**Location:** `/workspaces/sn-hr-portal/.github/workflows/DEPLOYMENT_CHECKLIST.md`
**Size:** 9.9 KB

Interactive checklists for:
- Initial setup (one-time)
- Pre-deployment verification
- Pull request deployment
- Production deployment
- Monthly maintenance
- Emergency procedures
- Troubleshooting quick reference

#### README.md (Updated)
**Location:** `/workspaces/sn-hr-portal/.github/workflows/README.md`
**Size:** 16 KB (updated)

Updated main workflows documentation to include:
- Vercel deployment workflow overview
- Detailed setup section
- Integration with existing workflows

---

## Next Steps

### Immediate Actions Required

1. **Set Up Vercel CLI** (5 minutes)
   ```bash
   pnpm add -g vercel
   cd apps/web
   vercel link
   ```

2. **Generate Vercel Token** (2 minutes)
   - Visit: https://vercel.com/account/tokens
   - Create token with Deploy + Read Project permissions
   - Save token securely

3. **Add GitHub Secrets** (3 minutes)
   - Go to repository Settings → Secrets and variables → Actions
   - Add three secrets:
     - `VERCEL_TOKEN`
     - `VERCEL_ORG_ID`
     - `VERCEL_PROJECT_ID`

4. **Configure Vercel Environment Variables** (10 minutes)
   - Go to Vercel project settings
   - Add required environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `N8N_WEBHOOK_URL`
     - `SUPABASE_SERVICE_ROLE_KEY` (production only)
     - Any other app-specific variables

5. **Test the Workflow** (15 minutes)
   - Create test branch
   - Make small change
   - Create PR
   - Verify workflow runs
   - Check preview deployment
   - Test preview URL

**Total Setup Time:** ~35 minutes

### Detailed Instructions

Refer to these guides in order:

1. **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)**
   - Follow the "Initial Setup Checklist" section
   - Complete all checkboxes

2. **[VERCEL_SETUP.md](VERCEL_SETUP.md)**
   - Detailed explanations for each step
   - Troubleshooting for common issues

3. **[DEPLOYMENT_FLOW.md](DEPLOYMENT_FLOW.md)**
   - Understand how the workflow operates
   - Reference for team training

---

## Workflow Capabilities

### Automated Quality Checks
- ✅ TypeScript type checking
- ✅ Code linting (Biome)
- ✅ Package builds verification
- ✅ Monorepo dependency resolution

### Deployment Features
- ✅ Preview environments for every PR
- ✅ Production deployments on merge
- ✅ Automatic environment configuration
- ✅ Smart caching for faster builds
- ✅ Path-based triggering (only runs when needed)

### Developer Experience
- ✅ PR comments with preview URLs
- ✅ Auto-updating comments on new commits
- ✅ Detailed failure notifications
- ✅ GitHub Deployments integration
- ✅ Workflow logs for debugging

### Security
- ✅ Secrets management via GitHub Secrets
- ✅ Environment separation (preview/production)
- ✅ Token-based authentication
- ✅ Encrypted environment variables
- ✅ Minimal permissions (least privilege)

---

## Architecture Alignment

This workflow aligns with the HR Portal architecture defined in CLAUDE.md:

### Three-Tier Architecture
- **Interface (Next.js + Vercel):** ✅ Automated deployment
- **Orchestrator (n8n):** ✅ Webhook URLs via environment variables
- **Data Layer (Supabase):** ✅ Database URLs via environment variables

### Security Principles
- **Zero-Trust Security:** ✅ Server-side validation via environment variables
- **JWT-Based Auth:** ✅ Supabase keys configured per environment
- **Separation of Concerns:** ✅ Build → Deploy → Runtime separation

### Code Standards
- **TypeScript Strict Mode:** ✅ Type checking before deployment
- **Testing Requirements:** ✅ Can integrate test step before deploy
- **Commit Message Format:** ✅ Semantic commits enforced by PR checks

---

## Integration with Existing Workflows

### Complements Existing Workflows

The new Vercel deployment workflow integrates seamlessly with:

1. **CI Pipeline (ci.yml)**
   - Runs in parallel with deployment
   - Both enforce quality standards
   - Can reuse build artifacts

2. **PR Checks (pr-checks.yml)**
   - Validates PR format
   - Deployment respects PR validation
   - Both post comments to PRs

3. **Playwright Tests (playwright.yml)**
   - E2E tests validate changes
   - Deployment provides preview environment for testing
   - Can add deployment URL to test config

4. **Security Scanning (security.yml)**
   - Scans code before deployment
   - Prevents vulnerable code from reaching production
   - Works in tandem with deployment

### Deployment Flow

```
PR Created
    │
    ├─→ PR Checks (validate format)
    ├─→ CI Pipeline (test & lint)
    ├─→ Security Scan (vulnerabilities)
    └─→ Vercel Deploy (preview environment)
         │
         └─→ Preview URL posted to PR
              │
              ├─→ Manual testing
              └─→ Playwright tests (optional)
                   │
                   └─→ Approve & Merge
                        │
                        └─→ Production Deploy
```

---

## Environment Variables Reference

### Required for All Environments

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key | `eyJhbGc...` |
| `N8N_WEBHOOK_URL` | n8n webhook endpoint | `https://n8n.domain.com/webhook/hr` |

### Production Only

| Variable | Description | Security |
|----------|-------------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin key | 🔴 Never use in preview! |

### Optional (if using)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | External API endpoint |
| `SENTRY_DSN` | Error tracking |
| `ANALYTICS_ID` | Analytics tracking |

---

## Monitoring & Maintenance

### Regular Checks

**Weekly:**
- Review deployment logs for errors
- Check build times (alert if >10 minutes)
- Verify preview URLs are accessible

**Monthly:**
- Review Vercel usage/billing
- Verify environment variables are current
- Check for workflow updates

**Quarterly:**
- Rotate Vercel token
- Security audit of environment variables
- Review team access permissions

### Metrics to Monitor

- **Build Time:** Should be <5 minutes (alert if >10)
- **Success Rate:** Should be >95%
- **Preview URL Accessibility:** 100%
- **Failed Deployments:** Investigate any failures

---

## Rollback Procedures

### Option 1: Vercel Dashboard
1. Go to Vercel Dashboard → Deployments
2. Find last successful deployment
3. Click "..." → "Promote to Production"

### Option 2: Git Revert
```bash
git revert [bad-commit-hash]
git push origin master
# Workflow automatically redeploys
```

### Option 3: Re-run Workflow
1. Go to Actions tab
2. Find previous successful workflow run
3. Click "Re-run jobs"

---

## Training Resources

### For Developers

1. **Quick Start:**
   - Read [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
   - Focus on "Pull Request Deployment Checklist"

2. **Understanding the Flow:**
   - Review [DEPLOYMENT_FLOW.md](DEPLOYMENT_FLOW.md)
   - See visual diagrams

3. **Troubleshooting:**
   - Bookmark [VERCEL_SETUP.md](VERCEL_SETUP.md)
   - Reference "Common Issues and Solutions"

### For DevOps/Maintainers

1. **Complete Setup:**
   - Follow [VERCEL_SETUP.md](VERCEL_SETUP.md) step-by-step
   - Complete all checklist items

2. **Workflow Customization:**
   - Review `vercel-deploy.yml` comments
   - Understand each step's purpose

3. **Security & Compliance:**
   - Review security section in [DEPLOYMENT_FLOW.md](DEPLOYMENT_FLOW.md)
   - Implement recommended practices

---

## Success Criteria

The deployment workflow is successfully set up when:

- ✅ GitHub secrets are configured
- ✅ Vercel environment variables are set
- ✅ Test PR triggers workflow successfully
- ✅ Preview URL is posted to PR
- ✅ Preview deployment is accessible
- ✅ Production deployment works on merge
- ✅ Team members understand the workflow

---

## Support & Feedback

### Getting Help

1. **Check Documentation:**
   - [VERCEL_SETUP.md](VERCEL_SETUP.md) - Setup & troubleshooting
   - [DEPLOYMENT_FLOW.md](DEPLOYMENT_FLOW.md) - Visual diagrams
   - [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Quick reference
   - [README.md](README.md) - All workflows overview

2. **Review Logs:**
   - GitHub Actions logs (Actions tab)
   - Vercel deployment logs (Vercel dashboard)

3. **Create Issue:**
   - Use `deployment` label
   - Include workflow run link
   - Attach relevant error messages

### Providing Feedback

If you have suggestions for improving this workflow:
- Create an issue with `enhancement` label
- Propose changes via PR
- Discuss in team meetings

---

## Version History

### Version 1.0.0 (2026-02-07)

**Initial Release**

Features:
- Automated preview deployments for PRs
- Automated production deployments for master
- Type checking and linting
- Monorepo support
- pnpm caching
- Path filtering
- PR comments with preview URLs
- GitHub Deployments API integration
- Comprehensive error handling
- Detailed documentation

---

## Related Documentation

- **[vercel-deploy.yml](vercel-deploy.yml)** - The workflow file
- **[VERCEL_SETUP.md](VERCEL_SETUP.md)** - Setup instructions
- **[DEPLOYMENT_FLOW.md](DEPLOYMENT_FLOW.md)** - Visual diagrams
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Checklists
- **[README.md](README.md)** - All workflows overview
- **[../../CLAUDE.md](../../CLAUDE.md)** - Development guidelines

---

## License & Attribution

This workflow was created following GitHub Actions and Vercel best practices.

**Technologies Used:**
- GitHub Actions (Workflow automation)
- Vercel CLI (Deployment)
- pnpm (Package management)
- Next.js 14+ (Application framework)

**Inspired By:**
- Vercel official deployment examples
- GitHub Actions community workflows
- Monorepo deployment best practices

---

**Status:** ✅ Ready for Setup
**Created:** 2026-02-07
**Last Updated:** 2026-02-07
**Maintained By:** DevOps Team
**Questions?** Create an issue with `deployment` label
