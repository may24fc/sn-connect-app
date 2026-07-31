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

### Using the 4 sample accounts (`@example.com`)

`node scripts/accounts/setup-sample-accounts.mjs` creates/updates 4 standard test accounts — `employee@example.com`, `associate@example.com`, `admin@example.com`, `super-admin@example.com` (password `password`) — in whichever Supabase project is targeted by the **currently active** `.env.local` file, not staging specifically:

- Run it while `localdev` is active (`pnpm env:use-local`) to create the accounts in your local Supabase stack. This is the default/recommended path for day-to-day development and is already covered by the "Recommended local workflow" above.
- Run it while `stagingdev` is active (`pnpm env:use-staging`) only when you need these accounts to exist in the shared remote staging project instead — e.g. to test against shared mock/staging data, hand off a login to a teammate, or verify behavior against a deployed preview that points at staging.

In both cases, switch to the target env first with `pnpm env:use-local` / `pnpm env:use-staging`, then run the script:

```bash
pnpm env:use-local      # or: pnpm env:use-staging
node scripts/accounts/setup-sample-accounts.mjs
```

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

## Pushing Migrations to Remote Projects

New migration files under `supabase/migrations/` are applied locally automatically, but must be pushed explicitly to the remote staging and production projects. The Supabase CLI links to a project via `--project-ref` rather than reading it from the active `.env.local.*` file, so linking and pushing are separate, explicit steps per target.

**Staging** (project ref `zihdtxpvugdphieujhzk`):

```bash
pnpm exec supabase link --project-ref zihdtxpvugdphieujhzk --dns-resolver https
pnpm exec supabase db push --linked --include-all --dry-run
pnpm exec supabase db push --linked --include-all
pnpm exec supabase migration list --dns-resolver https
```

**Production** (project ref `tccdupkjmwwxcvpqnpeb`):

```bash
pnpm exec supabase link --project-ref tccdupkjmwwxcvpqnpeb --dns-resolver https
pnpm exec supabase db push --linked --include-all --dry-run
pnpm exec supabase db push --linked --include-all
pnpm exec supabase migration list --dns-resolver https
```

Notes on this workflow:

- Always run the `--dry-run` push first and review the SQL/migration list it prints before running the push for real.
- `--dns-resolver https` avoids DNS resolution failures for the Supabase pooler host on networks/VPNs that block standard DNS lookups.
- `migration list` after pushing confirms the remote project's applied migrations now match local history (no `Not applied` entries remaining).
- Re-run `supabase link --project-ref ...` before pushing to a different target — the CLI only tracks one linked project at a time, so pushing to production immediately after staging (or vice versa) requires re-linking first.
- Treat pushes to the production ref (`tccdupkjmwwxcvpqnpeb`) as high-risk: prefer running them during a maintenance window and confirm the dry-run output carefully, since migrations can be destructive and are not easily reversible.

Notes:

- `pnpm supabase:start` wraps `pnpm exec supabase start -x vector` so it works even when `supabase` is not installed globally or not available on `PATH`.
- This machine cannot reliably bind the default `54321`-`54324` local Supabase ports because Windows reserves that range. The local config uses `55321`-`55324` instead.
- The local stack is started with `-x vector` on this machine because the optional `vector` container expects Docker to expose the daemon on `tcp://localhost:2375`.
- `pnpm env:use-staging` will fail fast until the `__FILL_STAGING_*__` placeholders are replaced in both staging profile files.
- Keep production bootstrap and verification scripts on the `prodops` env target only.
- Do not run production ops commands while `localdev` or `stagingdev` is the active target.
- After any prodops script run, switch back with `pnpm env:use-local` or `pnpm env:use-staging` before resuming development.