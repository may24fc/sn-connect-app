# GitHub Actions CI/CD Workflows

This directory contains automated workflows for continuous integration, deployment, security, and maintenance of the HR Portal.

## Workflows Overview

### 1. Vercel Deployment (`vercel-deploy.yml`)

**Trigger:**
- Push to `master` (Production deployment)
- Pull Requests to `master` (Preview deployment)
- Only when relevant files change (apps/web, packages, pnpm-lock.yaml)

**Jobs:**
- **Quality Checks**: Type checking and linting
- **Build Packages**: Builds shared UI packages in monorepo
- **Deploy Preview**: Deploys to Vercel preview environment (PRs)
- **Deploy Production**: Deploys to Vercel production environment (master)
- **PR Comments**: Posts deployment status and preview URLs to PRs
- **GitHub Deployments**: Creates deployment records via GitHub API

**Features:**
- Automatic preview deployments for every PR
- Production deployments on merge to master
- Smart caching for pnpm dependencies
- Path filtering to avoid unnecessary runs
- Detailed PR comments with preview URLs
- Automatic comment updates on subsequent pushes
- GitHub Deployments API integration
- Monorepo-aware build process

**Estimated Duration:** 5-10 minutes

**Required Secrets:**
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

**Setup Guide:**
See [Vercel Deployment Setup](#vercel-deployment-setup) section below for detailed configuration instructions.

---

### 2. CI Pipeline (`ci.yml`)

**Trigger:** Push to `master` or Pull Requests to `master`

**Jobs:**
- **Quality**: Runs Biome linting, formatting checks, and TypeScript type checking
- **Test**: Executes unit tests with coverage reporting
- **Build Packages**: Builds shared packages with caching
- **Build Web**: Builds the Next.js web application
- **E2E**: Runs Playwright end-to-end tests (PR and master only)
- **Security**: Runs dependency audits and vulnerability scans
- **CI Success**: Aggregates all job results and provides summary

**Features:**
- Parallel job execution for faster feedback
- Build artifact caching to speed up subsequent runs
- Coverage reports uploaded to Codecov
- Automatic cancellation of outdated workflow runs
- Comprehensive job summaries

**Estimated Duration:** 10-20 minutes

---

### 3. Playwright Tests (`playwright.yml`)

**Trigger:**
- Push to `main` or `master`
- Pull Requests to `main` or `master`

**Jobs:**
- Installs dependencies with npm
- Installs Playwright browsers
- Runs end-to-end tests
- Uploads test reports as artifacts (30-day retention)

**Estimated Duration:** 5-15 minutes

---

### 4. PR Checks (`pr-checks.yml`)

**Trigger:** Pull Requests to `master`

**Jobs:**
- **Validate PR**: Enforces semantic PR title format
- **Security Check**: Detects sensitive files (`.env`, keys, credentials)
- **File Size Check**: Warns about large files (>5MB)
- **TODO Check**: Tracks new TODO/FIXME items
- **PR Size**: Analyzes and warns about large PRs (>1000 lines)

**PR Title Format:**
```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, test, chore
Scope: Required (e.g., auth, ui, api, db)
Subject: Must start with lowercase letter
```

**Example:**
```
feat(auth): add JWT token refresh mechanism
fix(ui): correct sidebar navigation routing
chore(deps): update dependencies to latest versions
```

---

### 5. Deployment (`deploy.yml`)

**Trigger:**
- Automatic: Push to `master` (deploys to staging)
- Manual: `workflow_dispatch` with environment selection

**Environments:**
- **Staging**: Automatically deployed on master push
- **Production**: Manual deployment via GitHub Actions UI

**Deployment Flow:**
1. Install dependencies and build application
2. Deploy to selected environment (Vercel/other platform)
3. Run smoke tests
4. Create GitHub release (production only)
5. Rollback on failure (production only)

**Required Secrets:**
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `STAGING_API_URL`
- `STAGING_SUPABASE_URL`
- `STAGING_SUPABASE_ANON_KEY`
- `PRODUCTION_API_URL`
- `PRODUCTION_SUPABASE_URL`
- `PRODUCTION_SUPABASE_ANON_KEY`

**To Deploy to Production:**
1. Go to Actions tab
2. Select "Deploy" workflow
3. Click "Run workflow"
4. Select "production" environment
5. Confirm deployment

---

### 6. Maintenance (`maintenance.yml`)

**Trigger:**
- Scheduled: Every Monday at 9 AM UTC
- Manual: `workflow_dispatch`

**Jobs:**
- **Dependency Check**: Reports outdated dependencies and security issues
- **Cleanup Artifacts**: Removes artifacts older than 30 days
- **Cleanup Workflows**: Removes workflow runs older than 60 days
- **Repo Health**: Checks for large files, dead code, TODOs
- **Update Dependencies**: Creates PR with dependency updates (manual only)

**Automated Maintenance:**
- Keeps repository clean and organized
- Monitors dependency health
- Identifies potential issues proactively

---

### 7. Security Scanning (`security.yml`)

**Trigger:**
- Push to `master`
- Pull Requests to `master`
- Scheduled: Daily at 2 AM UTC
- Manual: `workflow_dispatch`

**Security Scans:**
- **CodeQL**: Static analysis for security vulnerabilities
- **Dependency Scan**: npm audit and Snyk scanning
- **Secret Scan**: TruffleHog for exposed secrets
- **License Check**: Validates license compliance
- **SAST**: Semgrep security analysis
- **Container Scan**: Trivy for Docker image vulnerabilities (if applicable)

**Allowed Licenses:**
- MIT
- Apache-2.0
- BSD-2-Clause
- BSD-3-Clause
- ISC
- 0BSD

**Optional Integrations:**
To enable Snyk scanning, set:
```
ENABLE_SNYK: true (repository variable)
SNYK_TOKEN: <your-token> (repository secret)
```

---

## Setup Instructions

### Vercel Deployment Setup

This section provides detailed instructions for configuring the Vercel deployment workflow for the HR Portal monorepo.

#### Prerequisites

1. A Vercel account (https://vercel.com)
2. The HR Portal project linked to Vercel
3. Access to repository settings on GitHub

#### Step 1: Install and Link Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel
# or with pnpm
pnpm add -g vercel

# Navigate to the web app directory
cd apps/web

# Link your project to Vercel
vercel link

# Follow the prompts:
# - Select your Vercel scope (personal or team)
# - Link to existing project or create new
# - Confirm project settings
```

This creates a `.vercel` directory with `project.json` containing your project credentials.

#### Step 2: Get Vercel Credentials

```bash
# View the generated credentials
cat apps/web/.vercel/project.json
```

The output will look like:
```json
{
  "orgId": "team_xxxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxxx"
}
```

**IMPORTANT:** The `.vercel` directory is gitignored and should never be committed.

#### Step 3: Generate Vercel Token

1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Give it a descriptive name (e.g., "GitHub Actions HR Portal")
4. Set scope to "Full Account" or at minimum:
   - Deploy
   - Read Project Settings
5. Set expiration as needed (recommend: No Expiration for production)
6. Click "Create" and copy the token immediately

#### Step 4: Add GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following three secrets:

**VERCEL_TOKEN**
- Value: The token you generated in Step 3
- Example: `AbCdEf1234567890xyz...`

**VERCEL_ORG_ID**
- Value: The `orgId` from `project.json`
- Example: `team_xxxxxxxxxxxxx`

**VERCEL_PROJECT_ID**
- Value: The `projectId` from `project.json`
- Example: `prj_xxxxxxxxxxxxx`

#### Step 5: Configure Vercel Environment Variables

Your Next.js application needs environment variables. Configure these in Vercel dashboard:

1. Go to your Vercel project settings
2. Navigate to **Settings** → **Environment Variables**
3. Add required variables for each environment:

**Preview Environment:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `N8N_WEBHOOK_URL` - Your n8n webhook endpoint (staging)
- Any other application-specific variables

**Production Environment:**
- Same as preview but with production values
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)
- `N8N_WEBHOOK_URL` - Production n8n webhook endpoint

4. Click **Save** for each variable

#### Step 6: Configure Vercel Project Settings

Ensure your Vercel project is configured for the monorepo:

1. Go to **Settings** → **General**
2. Set **Framework Preset**: Next.js
3. Set **Root Directory**: `apps/web`
4. Build Settings:
   - **Build Command**: `cd ../.. && pnpm install && pnpm build:packages && cd apps/web && pnpm build`
   - **Output Directory**: `.next`
   - **Install Command**: `pnpm install`

**Note:** The workflow handles building via Vercel CLI, so these are fallback settings.

#### Step 7: Test the Workflow

1. Create a new branch from master:
   ```bash
   git checkout -b test/vercel-deployment
   ```

2. Make a small change to `apps/web/src/app/page.tsx`

3. Commit and push:
   ```bash
   git add .
   git commit -m "test(deploy): verify Vercel deployment workflow"
   git push origin test/vercel-deployment
   ```

4. Create a Pull Request to master

5. Monitor the workflow in the Actions tab

6. Check for the PR comment with preview URL

7. Visit the preview URL to verify the deployment

#### Troubleshooting Vercel Deployments

**"Project not found" Error**
- Verify `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` match your project
- Ensure the Vercel project exists and is accessible with your token
- Try relinking with `vercel link` and updating secrets

**"Invalid token" Error**
- Regenerate token in Vercel dashboard
- Ensure token has sufficient permissions (Deploy + Read Project)
- Update `VERCEL_TOKEN` secret in GitHub

**Build Fails in Vercel**
- Check that packages build successfully: `pnpm build:packages`
- Verify all environment variables are set in Vercel
- Review build logs in workflow output
- Test build locally: `cd apps/web && pnpm build`

**Preview URL Not Posted**
- Check workflow logs for GitHub API errors
- Verify repository has `pull-requests: write` permission
- Ensure workflow completed successfully

**Monorepo Build Issues**
- Ensure `pnpm-workspace.yaml` is correctly configured
- Verify workspace dependencies in `apps/web/package.json`
- Check that `packages/ui` exports are correct
- Clear Vercel cache in project settings if needed

#### Monitoring Deployments

**View Deployment Status:**
1. GitHub Actions tab shows workflow status
2. Vercel dashboard shows deployment logs
3. PR comments include preview URLs
4. GitHub Deployments tab shows all deployments

**Deployment Logs:**
- GitHub: Actions tab → Select workflow run
- Vercel: Project → Deployments → Select deployment → View Build Logs

**Rollback Procedure:**
1. Go to Vercel dashboard → Deployments
2. Find last successful deployment
3. Click "..." → "Promote to Production"
4. Or re-run previous successful GitHub workflow

---

### 1. Enable GitHub Actions

1. Go to repository Settings → Actions → General
2. Set "Actions permissions" to "Allow all actions and reusable workflows"
3. Enable "Allow GitHub Actions to create and approve pull requests"

### 2. Configure Required Secrets

Add these secrets in Settings → Secrets and variables → Actions:

**Deployment:**
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

**Environment Variables:**
- `STAGING_API_URL`
- `STAGING_SUPABASE_URL`
- `STAGING_SUPABASE_ANON_KEY`
- `PRODUCTION_API_URL`
- `PRODUCTION_SUPABASE_URL`
- `PRODUCTION_SUPABASE_ANON_KEY`

**Optional:**
- `CODECOV_TOKEN` - For code coverage reporting
- `SNYK_TOKEN` - For Snyk security scanning

### 3. Configure Repository Variables

Add these variables in Settings → Secrets and variables → Actions → Variables:

- `DEPLOY_PLATFORM` - Set to `vercel` or your deployment platform
- `ENABLE_SNYK` - Set to `true` to enable Snyk scanning

### 4. Set Up Environments

Create two environments in Settings → Environments:
- `staging` - No protection rules
- `production` - Add protection rules:
  - Required reviewers (recommended)
  - Wait timer (optional)
  - Branch restrictions to `master`

### 5. Enable Security Features

1. Settings → Security → Code security and analysis
2. Enable:
   - Dependency graph
   - Dependabot alerts
   - Dependabot security updates
   - Code scanning (CodeQL)
   - Secret scanning

---

## Best Practices

### For Contributors

1. **Before Creating PR:**
   - Run `pnpm lint` and fix any issues
   - Run `pnpm typecheck` to ensure no TypeScript errors
   - Run `pnpm test` to ensure tests pass
   - Follow semantic commit message format

2. **PR Guidelines:**
   - Keep PRs focused and under 1000 lines if possible
   - Add meaningful descriptions
   - Link related issues
   - Ensure all CI checks pass

3. **Security:**
   - Never commit secrets or API keys
   - Review security scan results
   - Address high/critical vulnerabilities promptly

### For Maintainers

1. **Reviewing PRs:**
   - Check CI status before merging
   - Review security scan results
   - Ensure PR title follows semantic format
   - Verify adequate test coverage

2. **Deployments:**
   - Staging deploys automatically on master merge
   - Production requires manual trigger
   - Monitor deployment health checks
   - Have rollback plan ready

3. **Maintenance:**
   - Review weekly dependency reports
   - Keep dependencies up to date
   - Monitor security alerts
   - Clean up old branches and PRs

---

## Troubleshooting

### CI Failures

**Linting Errors:**
```bash
pnpm lint:fix
```

**Type Errors:**
```bash
pnpm typecheck
# Fix errors in code
```

**Test Failures:**
```bash
pnpm test
# Review and fix failing tests
```

**Build Failures:**
```bash
pnpm build
# Check for missing environment variables or build errors
```

### Deployment Issues

**Failed Deployment:**
1. Check workflow logs for specific errors
2. Verify all required secrets are set
3. Ensure environment variables are correct
4. Check Vercel/platform status

**Rollback:**
1. Go to previous successful deployment
2. Re-run that workflow
3. Or manually trigger deployment with previous commit SHA

### Security Alerts

**High/Critical Vulnerabilities:**
1. Review the alert details
2. Check for available patches
3. Update dependencies: `pnpm update <package>`
4. If no patch available, consider alternatives or mitigations

**False Positives:**
1. Review the CodeQL/Semgrep alert
2. Add suppression comment if confirmed false positive
3. Document reasoning in code comments

---

## Workflow Status Badges

Add these badges to your README.md:

```markdown
[![CI](https://github.com/sicefguroni/sn-hr-portal/actions/workflows/ci.yml/badge.svg)](https://github.com/sicefguroni/sn-hr-portal/actions/workflows/ci.yml)
[![Security](https://github.com/sicefguroni/sn-hr-portal/actions/workflows/security.yml/badge.svg)](https://github.com/sicefguroni/sn-hr-portal/actions/workflows/security.yml)
[![Deploy](https://github.com/sicefguroni/sn-hr-portal/actions/workflows/deploy.yml/badge.svg)](https://github.com/sicefguroni/sn-hr-portal/actions/workflows/deploy.yml)
```

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployment Guide](https://vercel.com/docs/deployments/git)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [OWASP Security Practices](https://owasp.org/www-project-top-ten/)

---

## Support

For questions or issues with CI/CD workflows:
1. Check workflow logs in Actions tab
2. Review this documentation
3. Create an issue with `ci` label
4. Contact DevOps team

Last Updated: 2026-02-06
