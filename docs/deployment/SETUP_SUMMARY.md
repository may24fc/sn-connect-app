# Vercel Setup Summary

This summary is for the internal HR portal deployment in `apps/web`.

Repository deployment split:

- Root [vercel.json](/vercel.json) is for `apps/www`
- [apps/web/vercel.json](/apps/web/vercel.json) is for `apps/web`
- The GitHub workflow prefers `VERCEL_WEB_PROJECT_ID` for the web deployment

## What Has Been Configured

### Files Created/Modified

1. **Configuration Files**
   - `apps/web/vercel.json` - HR portal Vercel deployment configuration
   - `vercel.json` - Public website deployment configuration
   - `.vercelignore` - Files to exclude from deployment
   - `.gitignore` - Updated to exclude Vercel artifacts
   - `.env.vercel.example` - Environment variables template

2. **Documentation**
   - `VERCEL_DEPLOYMENT.md` - Comprehensive deployment guide
   - `VERCEL_QUICK_START.md` - Quick reference guide
   - `VERCEL_SETUP_STEPS.md` - Step-by-step interactive guide
   - `SETUP_SUMMARY.md` - This file

3. **Scripts**
   - `scripts/vercel-setup.sh` - Automated setup script

4. **GitHub Actions**
   - `.github/workflows/vercel-deploy.yml` - Already configured!

### Vercel Configuration

**Build Settings (apps/web deployment):**
- Project root: `apps/web`
- Config file: `apps/web/vercel.json`
- Next.js build driven from the web app project
- Security headers configured
- Daily probation-check cron configured

**Deployment Strategy:**
- Preview: All PRs and dev branches
- Production: Push to master branch
- Auto-deploy via GitHub Actions

## What You Need to Do

### Required Credentials

Gather these before starting:

1. **Supabase** (from https://app.supabase.com)
   - Project URL
   - Anon/Public Key
   - Service Role Key

2. **Anthropic** (from https://console.anthropic.com)
   - API Key (starts with sk-ant-)

3. **n8n** (from your n8n instance)
   - Webhook URL
   - API Key

4. **JWT Secret**
   - Generate: `openssl rand -base64 32`

### Setup Options

**Option 1: Automated Script (Recommended)**
```bash
./scripts/vercel-setup.sh
```

**Option 2: Manual Step-by-Step**
Follow: `VERCEL_SETUP_STEPS.md`

**Option 3: Quick Deploy (Experienced Users)**
Follow: `VERCEL_QUICK_START.md`

## Quick Start

### 1. Login to Vercel
```bash
vercel login
```

### 2. Link Project
```bash
vercel link
```

### 3. Extract IDs
```bash
cat .vercel/project.json
```
Save `orgId` and `projectId`

### 4. Add Environment Variables
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add JWT_SECRET
vercel env add N8N_WEBHOOK_URL
vercel env add N8N_API_KEY
```

### 5. Test Deploy
```bash
vercel
```

### 6. Add GitHub Secrets
Go to: Settings → Secrets → Actions

Add:
- VERCEL_TOKEN
- VERCEL_ORG_ID
- VERCEL_WEB_PROJECT_ID
- All environment variables

### 7. Deploy to Production
```bash
vercel --prod
```

## Environment Variables Summary

### Public (Client-side)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Secret (Server-side)
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `JWT_SECRET`
- `N8N_WEBHOOK_URL`
- `N8N_API_KEY`

### Vercel/GitHub (CI/CD)
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_WEB_PROJECT_ID`

## GitHub Actions Integration

### Secrets to Add
```
VERCEL_TOKEN - From https://vercel.com/account/tokens
VERCEL_ORG_ID - From .vercel/project.json
VERCEL_PROJECT_ID - From .vercel/project.json
SUPABASE_SERVICE_ROLE_KEY - From Supabase dashboard
ANTHROPIC_API_KEY - From Anthropic console
JWT_SECRET - Generated random string
N8N_WEBHOOK_URL - Your n8n webhook
N8N_API_KEY - Your n8n API key
```

### Variables to Add (Not Secret)
```
NEXT_PUBLIC_SUPABASE_URL - From Supabase dashboard
NEXT_PUBLIC_SUPABASE_ANON_KEY - From Supabase dashboard
```

## Workflow Behavior

### On Pull Request
1. Runs tests (typecheck, lint)
2. Builds packages
3. Deploys to preview environment
4. Comments PR with preview URL
5. Creates deployment status

### On Push to Master
1. Runs tests
2. Builds packages
3. Deploys to production
4. Updates production URL
5. Creates deployment status

## File Structure

```
sn-hr-portal/
├── .github/
│   └── workflows/
│       └── vercel-deploy.yml ✅ Ready to use
├── apps/
│   └── web/                   ✅ Configured for deployment
├── packages/                  ✅ Will be transpiled
├── scripts/
│   └── vercel-setup.sh       ✅ Automated setup
├── .vercel/                   ⏳ Created after 'vercel link'
├── vercel.json               ✅ Deployment config
├── .vercelignore             ✅ Exclusion rules
├── .env.vercel.example       ✅ Environment template
├── VERCEL_DEPLOYMENT.md      ✅ Full documentation
├── VERCEL_QUICK_START.md     ✅ Quick reference
├── VERCEL_SETUP_STEPS.md     ✅ Step-by-step guide
└── SETUP_SUMMARY.md          ✅ This file
```

## Security Checklist

- [ ] Vercel Token has appropriate scope
- [ ] Service Role Key only in production
- [ ] JWT Secret is cryptographically secure (32+ chars)
- [ ] Public variables don't contain sensitive data
- [ ] GitHub Secrets are encrypted
- [ ] Supabase RLS policies are enabled
- [ ] Security headers configured in vercel.json

## Performance Optimizations

Already configured:
- ✅ Monorepo package transpiling
- ✅ Output file tracing
- ✅ 30s function timeout
- ✅ Security headers
- ✅ Build caching

Recommended additions:
- [ ] Enable Vercel Analytics
- [ ] Implement ISR for dynamic content
- [ ] Use Edge Runtime for API routes
- [ ] Optimize images with next/image
- [ ] Add custom caching headers

## Monitoring

### Enable Analytics (Optional)
```bash
cd apps/web
pnpm add @vercel/analytics @vercel/speed-insights
```

Add to layout:
```typescript
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
```

### Dashboard URLs
- Vercel Dashboard: https://vercel.com/dashboard
- Analytics: https://vercel.com/[team]/[project]/analytics
- Deployments: https://vercel.com/[team]/[project]/deployments
- Settings: https://vercel.com/[team]/[project]/settings

## Troubleshooting Quick Fixes

### Build Fails
```bash
vercel logs [url]
pnpm build:web
```

### Env Vars Missing
```bash
vercel env ls
vercel env pull .env.local
```

### GitHub Actions Fails
Check:
1. All secrets added
2. Token valid
3. IDs match .vercel/project.json

### Deployment Timeout
Increase maxDuration in vercel.json

## Next Actions

1. **Complete Setup**
   - [ ] Run `vercel login`
   - [ ] Run `vercel link`
   - [ ] Add environment variables
   - [ ] Test preview deployment
   - [ ] Add GitHub secrets
   - [ ] Deploy to production

2. **Verify**
   - [ ] Preview works
   - [ ] Production works
   - [ ] GitHub Actions works
   - [ ] All features functional

3. **Optimize**
   - [ ] Enable analytics
   - [ ] Monitor performance
   - [ ] Set up custom domain
   - [ ] Configure CDN caching

4. **Team**
   - [ ] Document process
   - [ ] Train team members
   - [ ] Set up monitoring
   - [ ] Create runbooks

## Support Resources

- Full Guide: `VERCEL_DEPLOYMENT.md`
- Quick Start: `VERCEL_QUICK_START.md`
- Interactive Steps: `VERCEL_SETUP_STEPS.md`
- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs

## Ready to Deploy?

Choose your path:

1. **Automated**: `./scripts/vercel-setup.sh`
2. **Guided**: Follow `VERCEL_SETUP_STEPS.md`
3. **Quick**: Follow `VERCEL_QUICK_START.md`

**Start with Step 1: Login to Vercel**
```bash
vercel login
```

Good luck! 🚀
