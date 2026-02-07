# Vercel Quick Start Guide

This is a condensed guide to get your HR Portal deployed to Vercel in minutes.

## Prerequisites Checklist

- [ ] Vercel account created (https://vercel.com)
- [ ] Supabase project with credentials ready
- [ ] Anthropic API key (for Claude AI)
- [ ] n8n instance configured (optional, can add later)

## Quick Deploy (3 Steps)

### Step 1: Run Setup Script

```bash
./scripts/vercel-setup.sh
```

This automated script will:
- Verify Vercel CLI installation
- Guide you through login
- Link your project to Vercel
- Extract project IDs
- Help configure environment variables
- Deploy a test preview

### Step 2: Add GitHub Secrets

Go to: `https://github.com/YOUR_USERNAME/sn-hr-portal/settings/secrets/actions`

**Required Secrets (encrypted):**
```
VERCEL_TOKEN=xxxxxxxxxxxxxxxxxxxxxx
VERCEL_ORG_ID=team_xxxxxxxxxxxxxxxxxxxxx
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ANTHROPIC_API_KEY=sk-ant-api03-...
JWT_SECRET=your-secure-random-string-min-32-chars
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/hr-portal
N8N_API_KEY=your-n8n-api-key
```

**Required Variables (not secret, but not in code):**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Deploy

**Preview deployment (automatic):**
```bash
vercel
```

**Production deployment:**
```bash
vercel --prod
```

## Manual Setup (If Script Fails)

### Install Vercel CLI
```bash
npm install -g vercel@latest
```

### Login
```bash
vercel login
```

### Link Project
```bash
vercel link
```

Answer prompts:
- Set up and deploy? **Yes**
- Which scope? **Select your account/team**
- Link to existing project? **No**
- Project name? **sn-hr-portal**
- Directory? **./** (root)

### Get Project IDs
```bash
cat .vercel/project.json
```

Save:
- `orgId` → `VERCEL_ORG_ID`
- `projectId` → `VERCEL_PROJECT_ID`

### Get Vercel Token
1. Visit: https://vercel.com/account/tokens
2. Create token: "GitHub Actions Deploy"
3. Copy and save as `VERCEL_TOKEN`

### Add Environment Variables

**Via CLI:**
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add JWT_SECRET
vercel env add N8N_WEBHOOK_URL
vercel env add N8N_API_KEY
```

**Via Dashboard:**
1. Go to: https://vercel.com/dashboard
2. Select: sn-hr-portal
3. Navigate: Settings → Environment Variables
4. Add each variable from `.env.vercel.example`

## Environment Variable Scopes

| Variable | Production | Preview | Development |
|----------|-----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ | ✓ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | ✓ | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | Optional | Optional |
| `ANTHROPIC_API_KEY` | ✓ | Optional | Optional |
| `JWT_SECRET` | ✓ | ✓ | ✓ |
| `N8N_WEBHOOK_URL` | ✓ | Optional | Optional |
| `N8N_API_KEY` | ✓ | Optional | Optional |

## Vercel Commands Cheat Sheet

```bash
# Login/Logout
vercel login
vercel logout

# Link/Unlink project
vercel link
vercel unlink

# Deploy
vercel                    # Preview deployment
vercel --prod             # Production deployment
vercel --yes              # Skip confirmations

# Environment variables
vercel env ls                           # List all env vars
vercel env add VAR_NAME                 # Add new variable
vercel env rm VAR_NAME production       # Remove from production
vercel env pull .env.local              # Download env vars locally

# Project info
vercel whoami             # Show current user
vercel project ls         # List projects
vercel inspect [url]      # Inspect deployment

# Domains
vercel domains ls         # List domains
vercel domains add domain.com
vercel domains rm domain.com

# Logs
vercel logs [url]         # View deployment logs
vercel logs --follow      # Stream logs in real-time

# Rollback
vercel rollback [url]     # Rollback to specific deployment
```

## GitHub Actions Workflow

The workflow (`.github/workflows/vercel-deploy.yml`) automatically:

**On Pull Request:**
- Runs tests (typecheck, lint)
- Builds packages
- Deploys to preview environment
- Comments PR with preview URL

**On Push to Master:**
- Runs tests
- Builds packages
- Deploys to production
- Creates deployment status

## Troubleshooting

### Build Fails

**Check logs:**
```bash
vercel logs [deployment-url]
```

**Test locally:**
```bash
vercel build
```

### Environment Variables Missing

**List variables:**
```bash
vercel env ls
```

**Pull variables locally:**
```bash
vercel env pull .env.local
```

### Deployment Timeout

Edit `vercel.json`:
```json
{
  "functions": {
    "apps/web/app/api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

### Monorepo Build Issues

Ensure `next.config.ts` has:
```typescript
{
  transpilePackages: ['@hr-portal/ui', '@hr-portal/database', '@hr-portal/auth', '@hr-portal/ai'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
}
```

## Verification Checklist

After deployment, verify:

- [ ] App loads at deployment URL
- [ ] No console errors in browser
- [ ] Supabase connection works (check Network tab)
- [ ] Authentication flow works
- [ ] API routes respond correctly
- [ ] Environment variables are accessible
- [ ] No 500/404 errors on critical pages
- [ ] Images and assets load correctly
- [ ] Mobile responsiveness works

## Next Steps

1. **Configure Custom Domain**
   - Vercel Dashboard → Project → Settings → Domains
   - Add domain and configure DNS
   - SSL certificate auto-provisioned

2. **Enable Analytics**
   ```bash
   cd apps/web
   pnpm add @vercel/analytics @vercel/speed-insights
   ```

   Add to `apps/web/src/app/layout.tsx`:
   ```typescript
   import { Analytics } from '@vercel/analytics/react';
   import { SpeedInsights } from '@vercel/speed-insights/next';
   ```

3. **Set Up Monitoring**
   - Enable Vercel Analytics in dashboard
   - Configure error tracking (Sentry, etc.)
   - Set up uptime monitoring

4. **Optimize Performance**
   - Check Core Web Vitals in Vercel dashboard
   - Implement ISR for dynamic content
   - Use Edge Runtime for API routes
   - Optimize images with Next.js Image component

## Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Deployment Guide:** `VERCEL_DEPLOYMENT.md`
- **Workflow Docs:** `.github/workflows/README.md`
- **Supabase Docs:** https://supabase.com/docs

## Quick Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Account Tokens:** https://vercel.com/account/tokens
- **GitHub Secrets:** https://github.com/YOUR_REPO/settings/secrets/actions
- **Supabase Dashboard:** https://app.supabase.com

---

**Need Help?** Check the full documentation in `VERCEL_DEPLOYMENT.md` or contact the team.
