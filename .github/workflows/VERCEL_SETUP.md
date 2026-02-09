# Vercel Deployment Setup - Quick Reference

This guide provides step-by-step instructions for setting up automated Vercel deployments for the HR Portal.

## Quick Setup Checklist

- [ ] Install Vercel CLI
- [ ] Link project with `vercel link`
- [ ] Generate Vercel token
- [ ] Add GitHub secrets (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)
- [ ] Configure Vercel environment variables
- [ ] Test with a PR

---

## Detailed Setup Steps

### 1. Install Vercel CLI

```bash
# Using npm
npm install -g vercel

# Using pnpm (recommended for this project)
pnpm add -g vercel

# Verify installation
vercel --version
```

### 2. Link Your Project

```bash
# Navigate to the web app
cd apps/web

# Link to Vercel
vercel link
```

**You'll be prompted to:**
1. Select your Vercel account/team
2. Link to existing project or create new one
3. Confirm the directory settings

**Result:** Creates `apps/web/.vercel/project.json` with:
```json
{
  "orgId": "team_xxxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxxx"
}
```

**IMPORTANT:** Never commit the `.vercel` directory (already in `.gitignore`)

### 3. Generate Vercel Token

1. Visit: https://vercel.com/account/tokens
2. Click **"Create Token"**
3. Set name: `GitHub Actions HR Portal`
4. Set scope: **Full Account** (or minimum: Deploy + Read Project)
5. Set expiration: **No Expiration** (for production) or as per security policy
6. Click **"Create"** and **copy the token immediately**

**Token format:** `AbCdEf1234567890xyz...` (keep this secure!)

### 4. Add GitHub Secrets

Go to: `https://github.com/[your-org]/sn-hr-portal/settings/secrets/actions`

Click **"New repository secret"** for each:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `VERCEL_TOKEN` | Token from Step 3 | `AbCdEf1234567890...` |
| `VERCEL_ORG_ID` | orgId from project.json | `team_xxxxxxxxxxxxx` |
| `VERCEL_PROJECT_ID` | projectId from project.json | `prj_xxxxxxxxxxxxx` |

**How to add a secret:**
1. Click "New repository secret"
2. Enter the name exactly as shown
3. Paste the value
4. Click "Add secret"

### 5. Configure Vercel Environment Variables

Go to your Vercel project: `https://vercel.com/[your-org]/[project-name]/settings/environment-variables`

#### Required Variables

Add these for **Preview** and **Production** environments:

**Supabase (Required):**
```
NEXT_PUBLIC_SUPABASE_URL = https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbG...
```

**n8n Integration (Required):**
```
N8N_WEBHOOK_URL = https://n8n.yourdomain.com/webhook/hr-portal
```

**Production Only (Sensitive):**
```
SUPABASE_SERVICE_ROLE_KEY = eyJhbG... (DO NOT use in Preview!)
```

**Optional (if using):**
```
NEXT_PUBLIC_API_URL = https://api.yourdomain.com
SENTRY_DSN = https://...
ANALYTICS_ID = UA-...
```

#### How to Add Variables

1. Click **"Add New"**
2. Enter **Key** (exact name)
3. Enter **Value**
4. Select environments:
   - ✅ Production (for production values)
   - ✅ Preview (for staging/preview values)
   - ✅ Development (optional, for `vercel dev`)
5. Click **"Save"**

**Best Practice:** Use different values for Production vs Preview (different databases, API endpoints, etc.)

### 6. Configure Vercel Project Settings (Optional)

These are backup settings; the workflow controls the build process:

**Settings → General:**
- Framework Preset: `Next.js`
- Root Directory: `apps/web`
- Node.js Version: `20.x`

**Settings → Build & Development:**
```bash
# Build Command (fallback)
cd ../.. && pnpm install && pnpm build:packages && cd apps/web && pnpm build

# Output Directory
.next

# Install Command
pnpm install
```

---

## Testing the Setup

### Test Preview Deployment (PR)

1. Create a test branch:
```bash
git checkout -b test/vercel-preview
```

2. Make a small change:
```bash
echo "// Vercel test" >> apps/web/src/app/page.tsx
```

3. Commit and push:
```bash
git add .
git commit -m "test(deploy): verify Vercel preview deployment"
git push origin test/vercel-preview
```

4. Create Pull Request on GitHub

5. Monitor workflow:
   - Go to **Actions** tab
   - Click on **"Vercel Deployment"** workflow
   - Watch the deployment progress

6. Check PR comments:
   - The workflow will post a comment with the preview URL
   - Click the URL to verify deployment

7. Expected PR comment:
```markdown
## ✅ Preview Deployment Successful

**Preview URL:** https://hr-portal-xxx-yourorg.vercel.app

### Deployment Details
- **Environment:** Preview
- **Branch:** `test/vercel-preview`
- **Commit:** abc1234
- **Workflow:** [View Logs](...)

### What's Next?
- Test the preview deployment
- Verify all functionality works as expected
- Check for any console errors or warnings
```

### Test Production Deployment

1. Merge PR to master:
```bash
git checkout master
git pull origin master
```

2. Workflow triggers automatically on push to master

3. Monitor in Actions tab

4. Verify production URL (shown in workflow logs)

---

## Common Issues and Solutions

### Issue: "Project not found"

**Error message:**
```
Error: Project not found
```

**Solutions:**
1. Verify secrets are correct:
   - `VERCEL_ORG_ID` matches `orgId` in project.json
   - `VERCEL_PROJECT_ID` matches `projectId` in project.json
2. Ensure Vercel project exists and is accessible
3. Re-run `vercel link` and update secrets
4. Check token has access to the project/team

### Issue: "Invalid token"

**Error message:**
```
Error: Invalid token
```

**Solutions:**
1. Generate new token at https://vercel.com/account/tokens
2. Ensure token scope includes "Deploy" and "Read Project"
3. Update `VERCEL_TOKEN` secret in GitHub
4. Verify token hasn't expired

### Issue: "Build failed"

**Error message:**
```
Error: Build failed with exit code 1
```

**Solutions:**
1. Check environment variables in Vercel:
   - All required variables are set
   - Variable names are exact (case-sensitive)
   - Values are correct (no trailing spaces)

2. Test build locally:
```bash
# From project root
pnpm install
pnpm build:packages
cd apps/web
pnpm build
```

3. Check workflow logs for specific error
4. Verify TypeScript compiles: `pnpm typecheck`
5. Clear Vercel build cache in project settings

### Issue: "Module not found" (Monorepo)

**Error message:**
```
Error: Cannot find module '@hr-portal/ui'
```

**Solutions:**
1. Ensure `packages/ui` builds successfully:
```bash
cd packages/ui
pnpm build
```

2. Check workspace configuration in root `package.json`:
```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

3. Verify dependencies in `apps/web/package.json`:
```json
{
  "dependencies": {
    "@hr-portal/ui": "workspace:*"
  }
}
```

4. Check `pnpm-workspace.yaml` exists in root

5. Clear node_modules and reinstall:
```bash
pnpm clean
pnpm install
```

### Issue: PR Comment Not Posted

**Symptoms:**
- Deployment succeeds
- No comment appears on PR

**Solutions:**
1. Check workflow permissions:
   - Go to Settings → Actions → General
   - Set "Workflow permissions" to "Read and write permissions"
   - Enable "Allow GitHub Actions to create and approve pull requests"

2. Check workflow logs for GitHub API errors

3. Verify `GITHUB_TOKEN` has correct permissions in workflow file

### Issue: Environment Variables Not Working

**Symptoms:**
- Build succeeds
- App doesn't work correctly
- Console shows undefined values

**Solutions:**
1. Verify variables are set in Vercel dashboard
2. Check variable names match code (case-sensitive)
3. Public variables must start with `NEXT_PUBLIC_`
4. Server variables should NOT have `NEXT_PUBLIC_` prefix
5. Re-deploy after changing variables (they're not hot-reloaded)

---

## Workflow Behavior

### For Pull Requests

1. **Trigger:** PR opened/updated targeting `master`
2. **Environment:** Preview
3. **URL Pattern:** `https://[project]-[hash]-[org].vercel.app`
4. **Features:**
   - Unique URL per PR
   - Auto-updates on new commits
   - PR comment with URL
   - Persists until PR closed

### For Production (Master Branch)

1. **Trigger:** Push to `master` branch
2. **Environment:** Production
3. **URL Pattern:** `https://[custom-domain].com` or `https://[project]-[org].vercel.app`
4. **Features:**
   - Production environment variables
   - Custom domain (if configured)
   - Logged in workflow output
   - GitHub Deployment record

### Path Filtering

Workflow only runs when these change:
- `apps/web/**` - Web app code
- `packages/**` - Shared packages
- `pnpm-lock.yaml` - Dependencies
- `.github/workflows/vercel-deploy.yml` - Workflow itself

**Skipped on changes to:**
- Documentation files
- Other apps (mobile)
- Root config files (unless they affect build)

---

## Advanced Configuration

### Custom Domains

1. Add domain in Vercel project settings
2. Configure DNS records as shown
3. Domain automatically used for production deployments

### Environment-Specific Configurations

**Preview vs Production:**

Use Vercel environment variables to differentiate:

```typescript
// apps/web/src/config/environment.ts
export const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  isProd: process.env.VERCEL_ENV === 'production',
  isPreview: process.env.VERCEL_ENV === 'preview',
};
```

### Deployment Notifications

Add Slack/Discord notifications by adding a step to the workflow:

```yaml
- name: Notify deployment
  if: success()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Deployment successful!'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Deployment Protection

**For Production:**

1. Go to Settings → Environments → production
2. Add protection rules:
   - ✅ Required reviewers (select team members)
   - ✅ Wait timer (optional, e.g., 5 minutes)
   - ✅ Deployment branches: Only `master`

This requires approval before production deployment.

---

## Maintenance

### Rotate Vercel Token

**When to rotate:**
- Annually (security best practice)
- If token is exposed
- When team member leaves

**How to rotate:**
1. Generate new token in Vercel
2. Update `VERCEL_TOKEN` secret in GitHub
3. Delete old token in Vercel
4. Test with a new deployment

### Monitor Deployments

**Regular checks:**
- Review deployment logs weekly
- Monitor build times (alert if >10 minutes)
- Check preview URL accessibility
- Verify environment variables are current

**Useful commands:**
```bash
# List recent deployments
vercel ls

# Check deployment status
vercel inspect [deployment-url]

# View logs
vercel logs [deployment-url]
```

---

## Security Best Practices

1. **Never commit secrets:**
   - `.vercel/` is gitignored
   - Use environment variables for all secrets
   - Rotate tokens annually

2. **Least privilege:**
   - Use team-specific tokens (not personal)
   - Limit token scope to required permissions
   - Separate staging and production tokens if possible

3. **Environment separation:**
   - Different databases for preview/production
   - Different API keys for preview/production
   - Test secrets in preview before production

4. **Audit logs:**
   - Review GitHub Actions logs regularly
   - Monitor Vercel deployment logs
   - Track who triggered production deployments

---

## Need Help?

1. **Check workflow logs:** Actions tab → Select workflow run
2. **Check Vercel logs:** Vercel dashboard → Deployments → Select deployment
3. **Review this guide:** Common issues section above
4. **Ask the team:** Create issue with `deployment` label

---

## Quick Reference Commands

```bash
# Setup
vercel login
vercel link

# Local development with Vercel env
vercel env pull

# Manual deployment (for testing)
vercel --prod  # Production
vercel         # Preview

# View deployments
vercel ls

# View logs
vercel logs [url]

# Remove deployment
vercel rm [deployment-id]
```

---

**Last Updated:** 2026-02-07

**Related Documentation:**
- [Main Workflows README](.github/workflows/README.md)
- [CLAUDE.md Development Guidelines](../../CLAUDE.md)
- [Vercel Documentation](https://vercel.com/docs)
