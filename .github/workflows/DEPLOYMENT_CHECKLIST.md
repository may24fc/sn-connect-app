# Vercel Deployment Checklist

Quick reference checklist for setting up and using the Vercel deployment workflow.

## Initial Setup Checklist

### Prerequisites
- [ ] Vercel account created (https://vercel.com)
- [ ] Project exists in Vercel (or will be created during setup)
- [ ] GitHub repository access (admin/write permissions)
- [ ] Node.js 20+ installed locally
- [ ] pnpm 9+ installed locally

---

## One-Time Setup

### 1. Vercel CLI Setup
```bash
# Install Vercel CLI
[ ] pnpm add -g vercel

# Verify installation
[ ] vercel --version
```

### 2. Link Project to Vercel
```bash
# Navigate to web app
[ ] cd apps/web

# Link to Vercel
[ ] vercel link

# Verify .vercel/project.json was created
[ ] cat .vercel/project.json
```

**Expected output:**
```json
{
  "orgId": "team_xxxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxxx"
}
```

### 3. Generate Vercel Token
- [ ] Go to https://vercel.com/account/tokens
- [ ] Click "Create Token"
- [ ] Name: `GitHub Actions HR Portal`
- [ ] Scope: Full Account (or Deploy + Read Project minimum)
- [ ] Expiration: No Expiration (or per policy)
- [ ] Copy token immediately and save securely

### 4. Add GitHub Secrets
Go to: `https://github.com/[org]/sn-hr-portal/settings/secrets/actions`

- [ ] Add `VERCEL_TOKEN` (token from step 3)
- [ ] Add `VERCEL_ORG_ID` (orgId from project.json)
- [ ] Add `VERCEL_PROJECT_ID` (projectId from project.json)

**Verify all three secrets are added:**
- [ ] VERCEL_TOKEN exists
- [ ] VERCEL_ORG_ID exists
- [ ] VERCEL_PROJECT_ID exists

### 5. Configure Vercel Environment Variables
Go to: Vercel Dashboard → Project → Settings → Environment Variables

**Preview Environment:**
- [ ] Add `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Add `N8N_WEBHOOK_URL` (staging)
- [ ] Add other required app variables

**Production Environment:**
- [ ] Add `NEXT_PUBLIC_SUPABASE_URL` (production value)
- [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` (production value)
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` (production only!)
- [ ] Add `N8N_WEBHOOK_URL` (production)
- [ ] Add other required app variables

### 6. Verify GitHub Actions Permissions
Go to: Repository Settings → Actions → General

- [ ] Set "Workflow permissions" to "Read and write permissions"
- [ ] Enable "Allow GitHub Actions to create and approve pull requests"

### 7. Test Deployment
```bash
# Create test branch
[ ] git checkout -b test/vercel-deployment

# Make small change
[ ] echo "// Vercel test" >> apps/web/src/app/page.tsx

# Commit and push
[ ] git add .
[ ] git commit -m "test(deploy): verify Vercel deployment workflow"
[ ] git push origin test/vercel-deployment

# Create PR
[ ] Create Pull Request on GitHub

# Verify workflow runs
[ ] Go to Actions tab
[ ] Check "Vercel Deployment" workflow is running
[ ] Wait for completion

# Check PR comment
[ ] Verify PR has deployment comment
[ ] Check preview URL works
[ ] Test application functionality

# Clean up
[ ] Close PR (or merge if testing complete)
[ ] Delete test branch
```

---

## Pre-Deployment Checklist

Before creating a PR or merging to master, verify:

### Code Quality
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (if applicable)
- [ ] `pnpm build:web` succeeds locally

### Environment Variables
- [ ] All required env vars are set in Vercel
- [ ] Values are correct for the target environment
- [ ] No secrets in code or committed files
- [ ] `.env` files are in `.gitignore`

### Dependencies
- [ ] `pnpm-lock.yaml` is committed
- [ ] No `npm` or `yarn` lockfiles present
- [ ] Dependencies are up to date (or intentionally pinned)

### Code Review
- [ ] PR description is clear
- [ ] Commits follow semantic format
- [ ] No sensitive data in code
- [ ] Tests added/updated if needed

---

## Pull Request Deployment Checklist

### After Creating PR

- [ ] Workflow starts automatically
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Package builds succeed
- [ ] Vercel deployment succeeds
- [ ] PR comment appears with preview URL

### Testing Preview Deployment

- [ ] Visit preview URL
- [ ] Test new features/changes
- [ ] Check browser console for errors
- [ ] Verify API connections work
- [ ] Test authentication (if applicable)
- [ ] Check responsive design (mobile/tablet)
- [ ] Test across browsers if needed

### Common Issues

If deployment fails:
- [ ] Check workflow logs in Actions tab
- [ ] Review error messages
- [ ] Verify all secrets are set
- [ ] Check Vercel environment variables
- [ ] Run build locally to reproduce
- [ ] Fix issues and push new commit

---

## Production Deployment Checklist

### Before Merging to Master

- [ ] All PR checks pass
- [ ] Preview deployment tested thoroughly
- [ ] Code reviewed and approved
- [ ] No merge conflicts
- [ ] Change log updated (if applicable)
- [ ] Documentation updated (if needed)

### After Merging to Master

- [ ] Workflow triggers automatically
- [ ] Monitor workflow progress in Actions tab
- [ ] Verify production deployment succeeds
- [ ] Check production URL in workflow logs

### Post-Deployment Verification

- [ ] Visit production URL
- [ ] Smoke test critical functionality:
  - [ ] Homepage loads
  - [ ] Authentication works
  - [ ] Main features functional
  - [ ] No console errors
- [ ] Monitor error tracking (Sentry, etc.)
- [ ] Check analytics/monitoring dashboards
- [ ] Verify database connections

### If Issues Occur

**Option 1: Quick Fix**
- [ ] Create hotfix branch from master
- [ ] Fix issue
- [ ] Create PR and fast-track review
- [ ] Merge and redeploy

**Option 2: Rollback**
- [ ] Go to Vercel Dashboard → Deployments
- [ ] Find last working deployment
- [ ] Click "..." → "Promote to Production"
- [ ] Verify rollback successful
- [ ] Fix issue in separate branch

**Option 3: Revert Commit**
```bash
[ ] git revert [commit-hash]
[ ] git push origin master
[ ] Workflow redeploys automatically
```

---

## Monthly Maintenance Checklist

### First Monday of Each Month

- [ ] Review deployment history
- [ ] Check average build times (alert if >10min)
- [ ] Review failed deployments
- [ ] Check Vercel usage/billing
- [ ] Verify all environment variables current
- [ ] Check for expired tokens/credentials

### Security Review (Quarterly)

- [ ] Rotate Vercel token
- [ ] Review GitHub secret access
- [ ] Audit environment variables
- [ ] Check for exposed secrets in history
- [ ] Review deployment logs for anomalies
- [ ] Update dependencies with security patches

---

## Emergency Procedures

### Production is Down

1. **Immediate Actions**
   - [ ] Check Vercel status page
   - [ ] Review latest deployment logs
   - [ ] Check error monitoring (Sentry)
   - [ ] Verify database connectivity

2. **Rollback** (if recent deployment caused it)
   - [ ] Promote previous deployment in Vercel
   - [ ] Or revert latest commit in master
   - [ ] Communicate status to team

3. **Fix and Redeploy**
   - [ ] Identify root cause
   - [ ] Create hotfix branch
   - [ ] Test thoroughly
   - [ ] Fast-track PR review
   - [ ] Deploy to production

### Workflow is Broken

1. **Diagnose**
   - [ ] Check workflow file syntax
   - [ ] Verify GitHub Actions status
   - [ ] Check secret values
   - [ ] Review recent changes

2. **Temporary Solution**
   - [ ] Deploy manually with Vercel CLI:
     ```bash
     cd apps/web
     vercel --prod
     ```

3. **Fix Workflow**
   - [ ] Create branch to fix workflow
   - [ ] Test workflow changes
   - [ ] Merge fix

### Secrets Compromised

1. **Immediate Actions**
   - [ ] Regenerate Vercel token
   - [ ] Update GitHub secret
   - [ ] Revoke old token in Vercel
   - [ ] Review recent deployments

2. **Audit**
   - [ ] Check deployment history for unauthorized access
   - [ ] Review commit history
   - [ ] Check Vercel access logs

3. **Prevent**
   - [ ] Enable 2FA on GitHub
   - [ ] Enable 2FA on Vercel
   - [ ] Review team access permissions
   - [ ] Document incident

---

## Troubleshooting Quick Reference

| Issue | Quick Check | Solution |
|-------|-------------|----------|
| Workflow doesn't trigger | Check file paths in PR | Ensure changes affect monitored paths |
| Type errors | Run `pnpm typecheck` | Fix TypeScript errors |
| Build fails | Run `pnpm build:web` | Check error logs, fix build issues |
| Deployment fails | Check Vercel dashboard | Review logs, verify env vars |
| Preview URL not posted | Check workflow logs | Verify PR permissions enabled |
| 404 on deployed site | Check build output | Verify routes exist, check logs |
| Env vars not working | Check Vercel dashboard | Ensure vars set for correct environment |
| Slow builds | Check cache usage | Clear Vercel cache if needed |

---

## Useful Commands Reference

```bash
# Local Development
vercel dev                    # Run local dev with Vercel env
vercel env pull               # Download env vars to .env.local
pnpm build:web                # Build web app locally

# Deployment
vercel                        # Deploy to preview
vercel --prod                 # Deploy to production
vercel --force                # Force new deployment (skip cache)

# Project Management
vercel ls                     # List deployments
vercel inspect [url]          # Get deployment details
vercel logs [url]             # View deployment logs
vercel domains                # Manage custom domains
vercel env ls                 # List environment variables

# Cleanup
vercel rm [deployment-id]     # Remove deployment
vercel --cwd apps/web         # Run from different directory
```

---

## Contact & Resources

**Need Help?**
- Check workflow logs first
- Review [VERCEL_SETUP.md](VERCEL_SETUP.md)
- Consult [README.md](README.md)
- Create issue with `deployment` label

**Documentation:**
- [Vercel Docs](https://vercel.com/docs)
- [GitHub Actions Docs](https://docs.github.com/actions)
- [pnpm Workspace Docs](https://pnpm.io/workspaces)

**Internal:**
- [CLAUDE.md](../../CLAUDE.md) - Development guidelines
- [DEPLOYMENT_FLOW.md](DEPLOYMENT_FLOW.md) - Visual diagrams

---

**Last Updated:** 2026-02-07
**Workflow Version:** 1.0.0
**Maintained By:** DevOps Team
