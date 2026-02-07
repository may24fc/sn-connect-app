# Vercel Setup - Interactive Steps

Follow these steps in order to complete your Vercel deployment setup.

## Current Status

- ✅ Vercel CLI installed (version 50.13.2)
- ✅ Configuration files created
- ✅ GitHub Actions workflow ready
- ⏳ Need to login and link project
- ⏳ Need to configure environment variables
- ⏳ Need to add GitHub secrets

---

## STEP 1: Login to Vercel

Run this command and follow the prompts:

```bash
vercel login
```

**What happens:**
1. Browser opens to authenticate
2. Choose authentication method (GitHub, GitLab, Bitbucket, Email)
3. Authorize Vercel CLI
4. Return to terminal

**Verification:**
```bash
vercel whoami
```

Should show your username.

---

## STEP 2: Link Project to Vercel

Run this command from the repository root:

```bash
vercel link
```

**Interactive Prompts - Answer Like This:**

```
? Set up and deploy "~/sn-hr-portal"?
→ Yes

? Which scope do you want to deploy to?
→ [Select your personal account or team]

? Link to existing project?
→ No (unless you already created the project)

? What's your project's name?
→ sn-hr-portal (or your preferred name)

? In which directory is your code located?
→ ./ (just press Enter)
```

**What this creates:**
- `.vercel/` directory with project configuration
- `.vercel/project.json` with your project IDs

---

## STEP 3: Extract Project IDs

After linking, run:

```bash
cat .vercel/project.json
```

**Save these values** (you'll need them for GitHub):

```json
{
  "orgId": "team_xxxxxxxxxxxxxxxxxxxxx",    ← This is VERCEL_ORG_ID
  "projectId": "prj_xxxxxxxxxxxxxxxxxxxxx"   ← This is VERCEL_PROJECT_ID
}
```

**Copy them to a safe place!**

---

## STEP 4: Generate Vercel Token

1. **Visit:** https://vercel.com/account/tokens

2. **Click:** "Create Token"

3. **Configure:**
   - Name: `GitHub Actions Deploy`
   - Scope: Full Account (or select specific projects)
   - Expiration: No Expiration (or your preference)

4. **Copy the token immediately** (it's shown only once!)
   - Save as: `VERCEL_TOKEN`

---

## STEP 5: Add Environment Variables to Vercel

You have 2 options. **Option A is recommended** for first-time setup.

### Option A: Using Vercel CLI (Interactive)

Run each command and paste the value when prompted:

```bash
# Public variables (select: Production, Preview, Development)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# Secret variables (select: Production only for now)
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add JWT_SECRET
vercel env add N8N_WEBHOOK_URL
vercel env add N8N_API_KEY
```

**For each command:**
1. Paste the value when prompted
2. Select environments (use Space to select, Enter to confirm):
   - Public variables: Production, Preview, Development
   - Secret variables: Production (add to Preview later if needed)

### Option B: Using Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Click on your project: `sn-hr-portal`
3. Navigate to: **Settings** → **Environment Variables**
4. Click: **Add New**
5. For each variable:
   - Enter name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - Enter value
   - Select environments
   - Click **Save**

**Required Variables:**

| Variable | Value | Environments |
|----------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | https://your-project.supabase.co | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | eyJhbGciOiJIUzI1... | All |
| `SUPABASE_SERVICE_ROLE_KEY` | eyJhbGciOiJIUzI1... | Production |
| `ANTHROPIC_API_KEY` | sk-ant-api03-... | Production |
| `JWT_SECRET` | (32+ char random string) | All |
| `N8N_WEBHOOK_URL` | https://your-n8n.com/webhook/hr | Production |
| `N8N_API_KEY` | your-n8n-key | Production |

**Generate JWT_SECRET:**
```bash
openssl rand -base64 32
```

---

## STEP 6: Test Preview Deployment

Deploy a preview version to test everything:

```bash
vercel
```

**What happens:**
1. Builds your project
2. Uploads to Vercel
3. Returns a preview URL

**Example output:**
```
🔍 Inspect: https://vercel.com/your-team/sn-hr-portal/xxxxx
✅ Preview: https://sn-hr-portal-abc123.vercel.app
```

**Test the preview:**
- Visit the URL
- Check if app loads
- Test Supabase connection
- Try authentication
- Check browser console for errors

**If it works:** Proceed to Step 7
**If it fails:** Check logs with `vercel logs [url]`

---

## STEP 7: Add GitHub Secrets

Go to your GitHub repository:

**URL Format:**
```
https://github.com/YOUR_USERNAME/sn-hr-portal/settings/secrets/actions
```

### Add Secrets (Encrypted)

Click "New repository secret" for each:

| Name | Value | From |
|------|-------|------|
| `VERCEL_TOKEN` | (token from Step 4) | Step 4 |
| `VERCEL_ORG_ID` | team_xxxxx | Step 3 |
| `VERCEL_PROJECT_ID` | prj_xxxxx | Step 3 |
| `SUPABASE_SERVICE_ROLE_KEY` | eyJhbGci... | Your Supabase dashboard |
| `ANTHROPIC_API_KEY` | sk-ant-... | Your Anthropic dashboard |
| `JWT_SECRET` | (random string) | Generated in Step 5 |
| `N8N_WEBHOOK_URL` | https://... | Your n8n instance |
| `N8N_API_KEY` | (n8n key) | Your n8n instance |

### Add Variables (Not Secret)

Go to: **Settings** → **Secrets and variables** → **Actions** → **Variables** tab

Click "New repository variable" for each:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | https://your-project.supabase.co |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | eyJhbGci... |

---

## STEP 8: Deploy to Production

Once preview testing is successful:

```bash
vercel --prod
```

**What happens:**
1. Builds with production environment
2. Deploys to production domain
3. Returns production URL

**Your app is now live!** 🎉

---

## STEP 9: Test GitHub Actions

### Test Preview Deployment (Pull Request)

1. Create a new branch:
   ```bash
   git checkout -b test/vercel-deploy
   ```

2. Make a small change (e.g., add a comment to a file)

3. Commit and push:
   ```bash
   git add .
   git commit -m "test: Verify Vercel deployment workflow"
   git push origin test/vercel-deploy
   ```

4. Create a Pull Request on GitHub

5. Check:
   - GitHub Actions workflow runs
   - Preview deployment succeeds
   - Bot comments with preview URL

### Test Production Deployment (Push to Master)

1. Merge the PR to master

2. Check:
   - GitHub Actions workflow runs
   - Production deployment succeeds
   - Changes appear on production URL

---

## STEP 10: Configure Custom Domain (Optional)

If you have a custom domain:

1. Go to Vercel Dashboard → Project → Settings → Domains

2. Click "Add"

3. Enter your domain (e.g., `hr-portal.yourdomain.com`)

4. Follow DNS configuration instructions:
   - For apex domain (yourdomain.com): A record to Vercel IP
   - For subdomain (hr-portal.yourdomain.com): CNAME to vercel.app

5. Wait for DNS propagation (can take up to 48 hours)

6. SSL certificate is automatically provisioned

---

## Verification Checklist

After completing all steps, verify:

### Deployment
- [ ] Preview deployment works (`vercel`)
- [ ] Production deployment works (`vercel --prod`)
- [ ] No build errors in Vercel logs
- [ ] All pages load correctly

### Environment Variables
- [ ] Supabase connection works (check Network tab)
- [ ] Authentication flow works
- [ ] API routes respond correctly
- [ ] No "undefined" environment variable errors

### GitHub Integration
- [ ] All secrets added to GitHub
- [ ] All variables added to GitHub
- [ ] PR creates preview deployment
- [ ] Push to master creates production deployment
- [ ] Bot comments on PRs with preview URL

### Functionality
- [ ] App loads without errors
- [ ] Login/logout works
- [ ] Database queries work
- [ ] No console errors
- [ ] Images and assets load
- [ ] Mobile view works

---

## Troubleshooting

### Build Fails

**Check build logs:**
```bash
vercel logs [deployment-url]
```

**Test locally:**
```bash
pnpm build:web
```

**Common issues:**
- Missing environment variables
- TypeScript errors
- Dependency issues
- Workspace configuration

### Environment Variables Not Working

**List all variables:**
```bash
vercel env ls
```

**Pull variables locally:**
```bash
vercel env pull .env.local
```

**Re-add a variable:**
```bash
vercel env rm VARIABLE_NAME production
vercel env add VARIABLE_NAME
```

### GitHub Actions Fails

**Check:**
1. All secrets are added correctly
2. VERCEL_TOKEN is valid
3. VERCEL_ORG_ID and VERCEL_PROJECT_ID match `.vercel/project.json`
4. Environment variables are set in both Vercel AND GitHub

**View logs:**
- Go to GitHub repository
- Click "Actions" tab
- Click on failed workflow
- Expand steps to see errors

### Deployment Times Out

**Increase timeout in `vercel.json`:**
```json
{
  "functions": {
    "apps/web/app/api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

**Or use Edge Runtime:**
```typescript
export const runtime = 'edge';
```

---

## Quick Commands Reference

```bash
# Login/Status
vercel login
vercel whoami
vercel logout

# Deploy
vercel              # Preview
vercel --prod       # Production
vercel --yes        # Skip confirmations

# Environment
vercel env ls       # List all
vercel env add      # Add new
vercel env pull     # Download locally

# Logs
vercel logs [url]           # View logs
vercel logs --follow        # Stream logs

# Project
vercel project ls           # List projects
vercel inspect [url]        # Inspect deployment
vercel rollback [url]       # Rollback
```

---

## Next Steps

After successful deployment:

1. **Monitor Performance**
   - Enable Vercel Analytics
   - Monitor Core Web Vitals
   - Set up error tracking

2. **Optimize**
   - Implement ISR for dynamic content
   - Use Edge Runtime where possible
   - Optimize images
   - Add caching headers

3. **Security**
   - Review RLS policies
   - Audit environment variables
   - Enable security headers
   - Set up rate limiting

4. **Team**
   - Document deployment process
   - Add team members to Vercel
   - Set up notification channels
   - Create runbooks

---

## Support

**Documentation:**
- Full guide: `VERCEL_DEPLOYMENT.md`
- Quick start: `VERCEL_QUICK_START.md`
- Environment template: `.env.vercel.example`

**Resources:**
- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Workflow Docs: `.github/workflows/README.md`

**Help:**
- Vercel Support: support@vercel.com
- Community: https://github.com/vercel/vercel/discussions

---

**Ready to start? Begin with Step 1!** 🚀
