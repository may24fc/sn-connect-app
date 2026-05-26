# Deployment Documentation

This directory contains deployment documentation for the Control Hub projects, with the HR Portal in `apps/web` as the primary internal app deployment target.

## Deployment Topology

This repository now has two separate Vercel deployments:

- `apps/www` - public website
- `apps/web` - internal HR portal

Important repository config locations:

- Root [vercel.json](/vercel.json) is for the public `apps/www` deployment.
- [apps/web/vercel.json](/apps/web/vercel.json) is for the internal HR portal deployment.
- [.github/workflows/vercel-deploy.yml](/.github/workflows/vercel-deploy.yml) deploys `apps/web` and prefers `VERCEL_WEB_PROJECT_ID`.

## Quick Start

**New to Vercel deployment?** Start here:
1. Read [SETUP_SUMMARY.md](SETUP_SUMMARY.md) for the `apps/web` deployment overview
2. Follow [VERCEL_QUICK_START.md](VERCEL_QUICK_START.md) for rapid `apps/web` deployment
3. Reference [VERCEL_CHEATSHEET.txt](VERCEL_CHEATSHEET.txt) for quick commands

## Documentation Files

### For Setup

- **[SETUP_SUMMARY.md](SETUP_SUMMARY.md)** - Overview of what's configured and what you need to do
- **[VERCEL_SETUP_STEPS.md](VERCEL_SETUP_STEPS.md)** - Step-by-step interactive guide with detailed instructions
- **[VERCEL_QUICK_START.md](VERCEL_QUICK_START.md)** - Condensed guide for experienced users
- **[VERCEL_CHEATSHEET.txt](VERCEL_CHEATSHEET.txt)** - Quick reference commands and steps

### For Deep Dive

- **[VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)** - Comprehensive deployment guide with:
  - Prerequisites and requirements
  - Separate `apps/www` and `apps/web` deployment model
  - Environment variable configuration
  - Performance optimization
  - Security checklist
  - Troubleshooting guide
  - Domain configuration
  - Monitoring setup

## Workflow Documentation

The GitHub Actions workflows are documented in:
- `/.github/workflows/VERCEL_SETUP.md` - Quick setup reference for the workflow
- `/.github/workflows/DEPLOYMENT_CHECKLIST.md` - Checklists for each deployment type
- `/.github/workflows/DEPLOYMENT_FLOW.md` - Visual diagrams of the deployment process
- `/.github/workflows/SETUP_COMPLETE.md` - Complete setup summary and version history
- `/.github/workflows/README.md` - Overview of all GitHub Actions workflows

## Configuration Files

Root-level files you'll need:
- `/vercel.json` - Public-site (`apps/www`) deployment configuration
- `/apps/web/vercel.json` - HR portal (`apps/web`) deployment configuration
- `/.vercelignore` - Files to exclude from deployment
- `/.env.vercel.example` - Environment variables template

## Automated Setup

For automated setup, use:
```bash
./scripts/vercel-setup.sh
```

This script will guide you through the entire setup process interactively.

## Need Help?

1. Check the documentation files above (in order of complexity)
2. Review workflow logs in GitHub Actions
3. Check Vercel deployment logs in the Vercel dashboard
4. Create an issue with the `deployment` label

## Related Documentation

- [CLAUDE.md](/CLAUDE.md) - Development guidelines for the entire project
- [/.github/workflows/README.md](/.github/workflows/README.md) - All GitHub Actions workflows

---

**Last Updated:** 2026-02-07
