# Vercel Deployment Guide - HR Portal

This guide will walk you through deploying the HR Portal monorepo to Vercel.

## Prerequisites

- Vercel CLI installed (already done)
- Vercel account (sign up at https://vercel.com)
- Supabase project with credentials
- Anthropic API key for Claude AI
- n8n instance with webhook URL and API key

## Required Environment Variables

### Public Variables (Safe to expose to client)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key

### Secret Variables (Server-side only)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (admin access)
- `ANTHROPIC_API_KEY` - Claude AI API key (starts with sk-ant-)
- `JWT_SECRET` - Secure random string (min 32 characters)
- `N8N_WEBHOOK_URL` - Your n8n workflow webhook URL
- `N8N_API_KEY` - Your n8n API authentication key

## Step-by-Step Deployment

### Step 1: Login to Vercel

Run the following command and follow the interactive prompts:

```bash
vercel login
```

This will open your browser to authenticate with Vercel.

### Step 2: Link Project to Vercel

From the repository root, run:

```bash
vercel link
```

During the interactive setup:
1. **Set up and deploy?** → Yes
2. **Which scope?** → Select your team/personal account
3. **Link to existing project?** → No (for first deployment) or Yes (if project exists)
4. **What's your project's name?** → sn-hr-portal (or your preferred name)
5. **In which directory is your code located?** → `./` (root)

This will create a `.vercel` directory with project configuration.

### Step 3: Extract Project IDs

After linking, extract the IDs needed for GitHub Actions:

```bash
cat .vercel/project.json
```

Save these values:
- `orgId` → This is your `VERCEL_ORG_ID`
- `projectId` → This is your `VERCEL_PROJECT_ID`

### Step 4: Get Vercel Token

1. Go to https://vercel.com/account/tokens
2. Create a new token with name "GitHub Actions Deploy"
3. Copy the token immediately (shown only once)
4. Save this as `VERCEL_TOKEN` for GitHub Secrets

### Step 5: Configure Environment Variables in Vercel

You can set environment variables via CLI or Dashboard.

#### Option A: Via Vercel CLI (Recommended)

```bash
# Navigate to web app directory
cd /workspaces/sn-hr-portal

# Set public variables (available to all environments)
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Paste your Supabase URL when prompted
# Select: Production, Preview, Development

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Paste your Supabase anon key when prompted
# Select: Production, Preview, Development

# Set secret variables (production only for now)
vercel env add SUPABASE_SERVICE_ROLE_KEY
# Paste your service role key when prompted
# Select: Production (and optionally Preview if needed)

vercel env add ANTHROPIC_API_KEY
# Paste your Anthropic API key when prompted
# Select: Production

vercel env add JWT_SECRET
# Paste your JWT secret (min 32 chars) when prompted
# Select: Production, Preview, Development

vercel env add N8N_WEBHOOK_URL
# Paste your n8n webhook URL when prompted
# Select: Production

vercel env add N8N_API_KEY
# Paste your n8n API key when prompted
# Select: Production
```

#### Option B: Via Vercel Dashboard

1. Go to your project in Vercel Dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with appropriate environment scopes:
   - **Production**: Live environment
   - **Preview**: Pull request deployments
   - **Development**: Local development with `vercel dev`

### Step 6: Test Preview Deployment

Deploy to preview environment:

```bash
vercel
```

This will:
1. Build your project
2. Deploy to a preview URL
3. Return a deployment URL (e.g., https://sn-hr-portal-abc123.vercel.app)

Test the preview deployment thoroughly:
- Check that the app loads correctly
- Verify Supabase connection
- Test authentication flows
- Check API routes

### Step 7: Deploy to Production

Once preview testing is successful:

```bash
vercel --prod
```

This deploys to your production domain.

## GitHub Actions Integration

### Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `VERCEL_TOKEN` - Token from Step 4
- `VERCEL_ORG_ID` - orgId from Step 3
- `VERCEL_PROJECT_ID` - projectId from Step 3

### Environment Variables in GitHub

Add these as GitHub Secrets (encrypted):
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `JWT_SECRET`
- `N8N_WEBHOOK_URL`
- `N8N_API_KEY`

Add these as GitHub Variables (not secret, but not in code):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Create Deployment Workflow

The workflow file is located at `.github/workflows/vercel-deploy.yml`

It will:
1. Run on pushes to `master` (production) and `dev/*` branches (preview)
2. Run tests before deployment
3. Deploy to Vercel automatically
4. Comment deployment URL on pull requests

## Vercel Configuration Files

### vercel.json

Located at repository root, configures:
- Build command: `pnpm build:web`
- Install command: `pnpm install`
- Output directory: `apps/web/.next`
- Function runtime: Node.js 20.x
- Security headers for API routes
- 30-second max duration for serverless functions

### .vercelignore

Optimizes deployment by excluding:
- Test files and e2e directory
- Documentation and media files
- Mobile app directory
- Build artifacts from packages

## Monitoring and Analytics

### Enable Vercel Analytics

Add to your root layout (`apps/web/src/app/layout.tsx`):

```typescript
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

Install dependencies:
```bash
cd apps/web
pnpm add @vercel/analytics @vercel/speed-insights
```

## Troubleshooting

### Build Fails

1. Check build logs in Vercel dashboard
2. Verify all environment variables are set
3. Test locally with `vercel build`
4. Check Node.js version (should be 20.x)

### Environment Variables Not Working

1. Ensure variables are scoped to correct environments
2. Redeploy after adding new variables
3. Check for typos in variable names
4. Public variables must start with `NEXT_PUBLIC_`

### Monorepo Issues

1. Verify `vercel.json` has correct `buildCommand`
2. Check that workspace dependencies are properly linked
3. Ensure `outputFileTracingRoot` is set in `next.config.ts`

### Function Timeouts

1. Check Vercel dashboard for timeout errors
2. Optimize long-running operations
3. Consider increasing `maxDuration` in `vercel.json`
4. Move heavy processing to background jobs

## Performance Optimization

### Recommended Settings

1. Enable Edge Runtime for API routes where possible
2. Use ISR (Incremental Static Regeneration) for semi-static pages
3. Implement proper caching headers
4. Optimize images with Next.js Image component
5. Monitor Core Web Vitals in Vercel Analytics

### Edge Functions Example

```typescript
// app/api/geo/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  // Your edge function code
}
```

## Domain Configuration

### Custom Domain

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificate is automatically provisioned

### Preview Branches

Configure automatic preview deployments:
1. Settings → Git
2. Enable "Automatically create Deployments for Preview Branches"
3. Configure branch patterns (e.g., `dev/*`, `feature/*`)

## Security Checklist

- [ ] All sensitive keys are in environment variables, not code
- [ ] Supabase RLS policies are enabled
- [ ] CORS is properly configured
- [ ] Security headers are set in vercel.json
- [ ] JWT_SECRET is cryptographically secure (32+ characters)
- [ ] Service role key is only in production environment
- [ ] Rate limiting is implemented for public API routes
- [ ] Authentication is required for sensitive operations

## Cost Optimization

### Tips to Stay Within Free Tier

1. Use Edge Runtime to reduce function invocations
2. Implement proper caching strategies
3. Optimize images and assets
4. Monitor bandwidth usage in dashboard
5. Use ISR instead of SSR where possible

## Support Resources

- Vercel Documentation: https://vercel.com/docs
- Vercel Status: https://www.vercel-status.com
- Community: https://github.com/vercel/vercel/discussions
- Support: support@vercel.com (Pro/Enterprise)

## Next Steps

After successful deployment:

1. Configure custom domain (if applicable)
2. Set up monitoring and alerts
3. Configure preview deployments for all branches
4. Document deployment process for team
5. Set up automatic deployments via GitHub Actions
6. Monitor performance metrics
7. Set up error tracking (Sentry, etc.)
8. Configure backup and rollback procedures
