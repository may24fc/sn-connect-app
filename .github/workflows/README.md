# GitHub Actions CI/CD Workflows

This directory contains automated workflows for continuous integration, deployment, security, and maintenance of the HR Portal.

## Workflows Overview

### 1. CI Pipeline (`ci.yml`)

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

### 2. PR Checks (`pr-checks.yml`)

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

### 3. Deployment (`deploy.yml`)

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

### 4. Maintenance (`maintenance.yml`)

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

### 5. Security Scanning (`security.yml`)

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
