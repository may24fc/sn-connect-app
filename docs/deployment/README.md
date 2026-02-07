# Deployment Documentation

This directory contains comprehensive documentation for deploying the HR Portal to Vercel.

## Quick Start

**New to Vercel deployment?** Start here:
1. Read [SETUP_SUMMARY.md](SETUP_SUMMARY.md) for an overview
2. Follow [VERCEL_QUICK_START.md](VERCEL_QUICK_START.md) for rapid deployment
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
- `/vercel.json` - Vercel build and deployment configuration
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
