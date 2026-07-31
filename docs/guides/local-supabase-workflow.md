# Local Supabase Workflow

This workspace now keeps two env targets for the portal app:

- `.env.local.localdev`
- `.env.local.stagingdev`
- `.env.local.prodops`
- `apps/web/.env.local.localdev`
- `apps/web/.env.local.stagingdev`
- `apps/web/.env.local.prodops`

Use these commands to switch the active env files:

```bash
pnpm env:use-local
pnpm env:use-staging
pnpm env:use-prodops
```

Use these commands to control the local Supabase stack from this repo:

```bash
pnpm supabase:start
pnpm supabase:status
pnpm supabase:stop
```

Use these commands to control the local Inngest dev runner when testing background jobs:

```bash
pnpm inngest:dev
pnpm inngest:status
pnpm inngest:stop
```

`localdev` is intended for everyday app development against local Supabase.

`stagingdev` is intended for everyday app development against a remote non-production Supabase project or branch that contains shared mock / staging data.

`prodops` is intended only for controlled operational scripts against the live project.

Recommended local workflow:

```bash
pnpm env:use-local
pnpm supabase:start
pnpm supabase:status
node scripts/accounts/setup-sample-accounts.mjs
pnpm dev:web
```

Only start `pnpm inngest:dev` when you are actively testing background jobs such as ATS resume parsing/evaluation or Drive document ingestion. The Inngest dev runner continuously syncs with `PUT /api/inngest`, so leaving it running when unused creates avoidable request logs and trace noise.

Recommended controlled production-ops workflow:

```bash
pnpm env:use-prodops
pnpm check:production-cleanliness
pnpm check:leadership-accounts
pnpm env:use-local
```

Recommended staging workflow:

```bash
pnpm env:use-staging
pnpm dev:web
```

Before the first `pnpm env:use-staging`, fill these files with your remote staging project values from the Supabase dashboard:

- `.env.local.stagingdev`
- `apps/web/.env.local.stagingdev`

Required values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional for staging-only operational scripts:

- `DATABASE_URL`
- `DIRECT_URL`

For remote Supabase auth to work from your local app, add these redirect / site URLs in the remote Supabase project:

- `http://localhost:3001`
- `http://127.0.0.1:3001`

Notes:

- `pnpm supabase:start` wraps `pnpm exec supabase start -x vector` so it works even when `supabase` is not installed globally or not available on `PATH`.
- This machine cannot reliably bind the default `54321`-`54324` local Supabase ports because Windows reserves that range. The local config uses `55321`-`55324` instead.
- The local stack is started with `-x vector` on this machine because the optional `vector` container expects Docker to expose the daemon on `tcp://localhost:2375`.
- `pnpm env:use-staging` will fail fast until the `__FILL_STAGING_*__` placeholders are replaced in both staging profile files.
- Keep production bootstrap and verification scripts on the `prodops` env target only.
- Do not run production ops commands while `localdev` or `stagingdev` is the active target.
- After any prodops script run, switch back with `pnpm env:use-local` or `pnpm env:use-staging` before resuming development.