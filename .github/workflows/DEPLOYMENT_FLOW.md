# Vercel Deployment Flow Diagram

## Overview

This document visualizes the deployment workflow for the HR Portal using GitHub Actions and Vercel.

---

## Pull Request Flow (Preview Deployment)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Developer Workflow                                │
└─────────────────────────────────────────────────────────────────────────┘

   Developer                    GitHub                        Vercel
       │                          │                             │
       │  1. Create Feature       │                             │
       │     Branch               │                             │
       │ ────────────────>        │                             │
       │                          │                             │
       │  2. Make Changes &       │                             │
       │     Push to Branch       │                             │
       │ ────────────────>        │                             │
       │                          │                             │
       │  3. Create Pull          │                             │
       │     Request              │                             │
       │ ────────────────>        │                             │
       │                          │                             │
       │                          │  4. Trigger Workflow        │
       │                          │     (vercel-deploy.yml)     │
       │                          │ ──────────────────────────┐ │
       │                          │                           │ │
       │                          │  5. Checkout Code         │ │
       │                          │  6. Setup Node & pnpm     │ │
       │                          │  7. Install Dependencies  │ │
       │                          │  8. Type Check            │ │
       │                          │  9. Lint Code             │ │
       │                          │  10. Build Packages       │ │
       │                          │ <─────────────────────────┘ │
       │                          │                             │
       │                          │  11. Pull Vercel Config     │
       │                          │      (Preview Environment)  │
       │                          │ ─────────────────────────>  │
       │                          │ <─────────────────────────  │
       │                          │                             │
       │                          │  12. Build Project          │
       │                          │ ─────────────────────────>  │
       │                          │ <─────────────────────────  │
       │                          │                             │
       │                          │  13. Deploy (Preview)       │
       │                          │ ─────────────────────────>  │
       │                          │                             │
       │                          │                             │  Build &
       │                          │                             │  Deploy
       │                          │                             │ ───────┐
       │                          │                             │        │
       │                          │  14. Return Preview URL     │ <──────┘
       │                          │ <─────────────────────────  │
       │                          │                             │
       │                          │  15. Post Comment to PR     │
       │                          │ ──────────────────────────┐ │
       │                          │   with Preview URL        │ │
       │                          │ <─────────────────────────┘ │
       │                          │                             │
       │  16. Receive             │                             │
       │      Notification        │                             │
       │ <───────────────         │                             │
       │                          │                             │
       │  17. Test Preview        │                             │
       │      Environment         │                             │
       │ ──────────────────────────────────────────────────────>│
       │                          │                             │
       │  18. Request Review      │                             │
       │ ────────────────>        │                             │
       │                          │                             │
       │  19. Approve & Merge     │                             │
       │ ────────────────>        │                             │
       │                          │                             │

┌─────────────────────────────────────────────────────────────────────────┐
│  PR Comment Format:                                                     │
│  ✅ Preview Deployment Successful                                       │
│                                                                          │
│  Preview URL: https://hr-portal-abc123-team.vercel.app                  │
│                                                                          │
│  Environment: Preview                                                    │
│  Branch: feature/new-dashboard                                           │
│  Commit: a1b2c3d                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Production Deployment Flow (Master Branch)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Production Deployment                               │
└─────────────────────────────────────────────────────────────────────────┘

    Developer                  GitHub                        Vercel
       │                          │                             │
       │  1. Merge PR to          │                             │
       │     Master               │                             │
       │ ────────────────>        │                             │
       │                          │                             │
       │                          │  2. Trigger Workflow        │
       │                          │     (Push to Master)        │
       │                          │ ──────────────────────────┐ │
       │                          │                           │ │
       │                          │  3. Checkout Code         │ │
       │                          │  4. Setup Environment     │ │
       │                          │  5. Install Dependencies  │ │
       │                          │  6. Quality Checks        │ │
       │                          │     - Type Check          │ │
       │                          │     - Lint                │ │
       │                          │  7. Build Packages        │ │
       │                          │ <─────────────────────────┘ │
       │                          │                             │
       │                          │  8. Pull Vercel Config      │
       │                          │     (Production Env)        │
       │                          │ ─────────────────────────>  │
       │                          │ <─────────────────────────  │
       │                          │                             │
       │                          │  9. Build Project (Prod)    │
       │                          │ ─────────────────────────>  │
       │                          │ <─────────────────────────  │
       │                          │                             │
       │                          │  10. Deploy Production      │
       │                          │ ─────────────────────────>  │
       │                          │                             │
       │                          │                             │  Build &
       │                          │                             │  Deploy
       │                          │                             │ ───────┐
       │                          │                             │        │
       │                          │  11. Return Production URL  │ <──────┘
       │                          │ <─────────────────────────  │
       │                          │                             │
       │                          │  12. Create Deployment      │
       │                          │      Record (GitHub API)    │
       │                          │ ──────────────────────────┐ │
       │                          │ <─────────────────────────┘ │
       │                          │                             │
       │  13. Deployment          │                             │
       │      Complete            │                             │
       │ <───────────────         │                             │
       │                          │                             │
       │  14. Monitor Production  │                             │
       │ ──────────────────────────────────────────────────────>│
       │                          │                             │

┌─────────────────────────────────────────────────────────────────────────┐
│  Deployment Log Output:                                                 │
│  ✅ Production Deployment Successful                                    │
│  URL: https://hr-portal.yourdomain.com                                  │
│  Commit: feat(dashboard): add weekly reports                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Build Process

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Monorepo Build Sequence                             │
└─────────────────────────────────────────────────────────────────────────┘

   Repository Root
         │
         │  1. Install all dependencies
         │     pnpm install --frozen-lockfile
         │
         ├──────────────────────────────────────┐
         │                                      │
         ▼                                      ▼
   packages/ui/                          packages/database/
         │                                      │
         │  2. Build UI Package                 │  Build Database Package
         │     pnpm build                       │  pnpm build
         │                                      │
         │  Output:                             │  Output:
         │  - dist/                             │  - dist/
         │  - components                        │  - migrations
         │  - types                             │  - types
         │                                      │
         └──────────────────┬───────────────────┘
                            │
                            │  3. Dependencies built
                            │
                            ▼
                       apps/web/
                            │
                            │  4. Pull Vercel Environment
                            │     vercel pull --environment=production
                            │
                            │  5. Build Next.js App
                            │     vercel build --prod
                            │
                            │  Uses:
                            │  - @hr-portal/ui (from packages/ui/dist)
                            │  - @hr-portal/database (from packages/database/dist)
                            │
                            │  Output:
                            │  - .next/
                            │  - Static assets
                            │  - Server bundles
                            │
                            │  6. Deploy to Vercel
                            │     vercel deploy --prebuilt --prod
                            │
                            ▼
                       Vercel Production
                            │
                            │  URL: https://hr-portal.yourdomain.com
                            │
                            └─> Live Application
```

---

## Workflow Decision Tree

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Workflow Trigger Logic                              │
└─────────────────────────────────────────────────────────────────────────┘

                        Git Event Occurs
                               │
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
          Push Event?                   Pull Request?
                │                             │
                │                             │
           ┌────┴────┐                   ┌────┴────┐
           │         │                   │         │
           ▼         ▼                   ▼         ▼
      To Master?  To Other?         To Master?  To Other?
           │         │                   │         │
           │         │                   │         │
           ▼         ▼                   ▼         ▼
          YES       NO                  YES       NO
           │         │                   │         │
           │      SKIP                   │      SKIP
           │                             │
           │                             │
           │  Changed Files?             │  Changed Files?
           │  - apps/web/**              │  - apps/web/**
           │  - packages/**              │  - packages/**
           │  - pnpm-lock.yaml           │  - pnpm-lock.yaml
           │         │                   │         │
           │         │                   │         │
           ▼         ▼                   ▼         ▼
          YES       NO                  YES       NO
           │         │                   │         │
           │      SKIP                   │      SKIP
           │                             │
           │                             │
           ▼                             ▼
    RUN WORKFLOW                  RUN WORKFLOW
           │                             │
           │                             │
           ├─ Type Check                 ├─ Type Check
           ├─ Lint                       ├─ Lint
           ├─ Build Packages             ├─ Build Packages
           ├─ Pull Vercel (PROD)         ├─ Pull Vercel (PREVIEW)
           ├─ Build (--prod)             ├─ Build (preview)
           ├─ Deploy (--prod)            ├─ Deploy (preview)
           ├─ Log to console             ├─ Post PR Comment
           └─ Create Deployment          └─ Create Deployment
                  Record                        Record
                    │                             │
                    │                             │
                    ▼                             ▼
            PRODUCTION LIVE                 PREVIEW READY
       https://hr-portal.com        https://hr-portal-abc.vercel.app
```

---

## Failure & Rollback Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Deployment Failure Handling                         │
└─────────────────────────────────────────────────────────────────────────┘

         Deployment Process
                │
                │
                ▼
         ┌──────────────┐
         │  Type Check  │
         └──────┬───────┘
                │
                ├─ FAIL ──> Post Failure Comment to PR
                │           Exit workflow
                │
                ▼ PASS
         ┌──────────────┐
         │     Lint     │
         └──────┬───────┘
                │
                ├─ FAIL ──> Post Failure Comment to PR
                │           Exit workflow
                │
                ▼ PASS
         ┌──────────────┐
         │Build Packages│
         └──────┬───────┘
                │
                ├─ FAIL ──> Post Failure Comment to PR
                │           Exit workflow
                │
                ▼ PASS
         ┌──────────────┐
         │ Build & Deploy│
         └──────┬───────┘
                │
                ├─ FAIL ──> If Production:
                │           │
                │           ├─ Alert team
                │           ├─ Rollback options:
                │           │  1. Re-run previous workflow
                │           │  2. Revert commit in master
                │           │  3. Promote previous deployment
                │           │     in Vercel dashboard
                │           │
                │           If Preview:
                │           └─> Post failure comment to PR
                │
                ▼ PASS
         ┌──────────────┐
         │   Success!   │
         └──────────────┘
                │
                ▼
         Notify Developer
```

---

## Environment Variable Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Environment Variable Handling                         │
└─────────────────────────────────────────────────────────────────────────┘

    Vercel Dashboard                GitHub Secrets               Build Time
           │                               │                          │
           │  Environment Variables        │  GitHub Secrets          │
           │  ────────────────────         │  ────────────────        │
           │  • NEXT_PUBLIC_*              │  • VERCEL_TOKEN          │
           │  • DATABASE_URL               │  • VERCEL_ORG_ID         │
           │  • API_KEYS                   │  • VERCEL_PROJECT_ID     │
           │  • N8N_WEBHOOK_URL            │                          │
           │                               │                          │
           │  Per Environment:             │  Repository-wide         │
           │  ├─ Production               │  Used for auth           │
           │  ├─ Preview                  │  and deployment          │
           │  └─ Development              │                          │
           │                               │                          │
           ▼                               ▼                          │
    ┌──────────────┐              ┌──────────────┐                  │
    │vercel pull   │              │GitHub Actions│                  │
    │--environment │              │  Workflow    │                  │
    └──────┬───────┘              └──────┬───────┘                  │
           │                             │                          │
           │  Downloads .env             │  Uses secrets to         │
           │  to build environment       │  authenticate with       │
           │                             │  Vercel API              │
           │                             │                          │
           └──────────────┬──────────────┘                          │
                          │                                         │
                          ▼                                         │
                   ┌──────────────┐                                 │
                   │ Build Process│                                 │
                   │              │                                 │
                   │ Combines:    │                                 │
                   │ • Vercel env │                                 │
                   │ • Process env│                                 │
                   │              │                                 │
                   └──────┬───────┘                                 │
                          │                                         │
                          └─────────────────────────────────────────┤
                                                                    │
                                                                    ▼
                                                             Deployed App
                                                                    │
                                           ┌────────────────────────┼────────────────────────┐
                                           │                        │                        │
                                           ▼                        ▼                        ▼
                                    Client-Side              Server-Side                Edge Runtime
                                           │                        │                        │
                                    NEXT_PUBLIC_*              All Variables           NEXT_PUBLIC_*
                                    variables only             available               + Edge-compatible
```

---

## Caching Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Caching Layers                                   │
└─────────────────────────────────────────────────────────────────────────┘

    Workflow Run Starts
            │
            ▼
    ┌──────────────────┐
    │  pnpm Store      │  ← Cached by GitHub Actions
    │  Cache           │    Key: pnpm-store-{lock-file-hash}
    └────────┬─────────┘    Hit: ~30s saved
             │               Miss: Full download
             ├─ HIT ──> Skip download
             │
             ├─ MISS ─> Download all packages
             │           Update cache for next run
             │
             ▼
    ┌──────────────────┐
    │  Node Modules    │  ← Installed from cache or fresh
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │  Build Packages  │  ← packages/ui, packages/database
    │  (dist/)         │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │  Vercel Build    │  ← Vercel has own cache
    │  Cache           │    • Next.js build cache
    └────────┬─────────┘    • Static assets
             │               • Dependencies
             │
             ▼
    ┌──────────────────┐
    │  Deployment      │
    └──────────────────┘

Cache Invalidation:
  • pnpm cache: When pnpm-lock.yaml changes
  • Vercel cache: Manual clear in project settings
  • Next.js cache: Automatic on code changes
```

---

## Security Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Security Boundaries                               │
└─────────────────────────────────────────────────────────────────────────┘

    Developer Machine              GitHub                  Vercel
         │                           │                       │
         │  1. Push Code             │                       │
         │ ─────────────────>        │                       │
         │    (No secrets!)          │                       │
         │                           │                       │
         │                           │  2. Workflow Runs     │
         │                           │     with Secrets:     │
         │                           │     • VERCEL_TOKEN    │
         │                           │     • VERCEL_ORG_ID   │
         │                           │     • VERCEL_PROJECT_ID
         │                           │                       │
         │                           │  Secrets masked       │
         │                           │  in logs              │
         │                           │                       │
         │                           │  3. Authenticate      │
         │                           │ ──────────────────────>
         │                           │    (VERCEL_TOKEN)     │
         │                           │                       │
         │                           │  4. Pull Env Vars     │
         │                           │ <──────────────────────
         │                           │    (Encrypted in      │
         │                           │     transit)          │
         │                           │                       │
         │                           │  5. Build & Deploy    │
         │                           │ ──────────────────────>
         │                           │                       │
         │                           │                       │  6. App Runs
         │                           │                       │     with Env
         │                           │                       │     Variables
         │                           │                       │
         │  7. Access App            │                       │
         │ ───────────────────────────────────────────────────>
         │    (HTTPS only)           │                       │
         │                           │                       │

    Secrets Never Touch:
      ✗ Git repository
      ✗ Developer machine (except via vercel pull)
      ✗ Workflow logs (masked automatically)
      ✗ PR comments

    Secrets Stored:
      ✓ GitHub Secrets (encrypted at rest)
      ✓ Vercel Dashboard (encrypted at rest)
      ✓ Vercel Deployment (encrypted environment)
```

---

This diagram provides a visual reference for understanding the deployment workflow, including the flow of data, decision points, error handling, and security considerations.

For implementation details, see:
- [vercel-deploy.yml](vercel-deploy.yml) - The actual workflow file
- [VERCEL_SETUP.md](VERCEL_SETUP.md) - Setup instructions
- [README.md](README.md) - Complete workflows documentation
