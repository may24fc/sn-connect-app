# Local Supabase Workflow

This workspace now keeps two env targets for the portal app:

- `.env.local.localdev`
- `.env.local.prodops`
- `apps/web/.env.local.localdev`
- `apps/web/.env.local.prodops`

Use these commands to switch the active env files:

```bash
pnpm env:use-local
pnpm env:use-prodops
```

Use these commands to control the local Supabase stack from this repo:

```bash
pnpm supabase:start
pnpm supabase:status
pnpm supabase:stop
```

`localdev` is intended for everyday app development against local Supabase.

`prodops` is intended only for controlled operational scripts against the live project.

Recommended local workflow:

```bash
pnpm env:use-local
pnpm supabase:start
pnpm supabase:status
node scripts/setup-sample-accounts.mjs
pnpm dev:web
```

Recommended controlled production-ops workflow:

```bash
pnpm env:use-prodops
pnpm check:production-cleanliness
pnpm check:leadership-accounts
pnpm env:use-local
```

Notes:

- `pnpm supabase:start` wraps `pnpm exec supabase start -x vector` so it works even when `supabase` is not installed globally or not available on `PATH`.
- The local stack is started with `-x vector` on this machine because the optional `vector` container expects Docker to expose the daemon on `tcp://localhost:2375`.
- Keep production bootstrap and verification scripts on the `prodops` env target only.
- Do not run production ops commands while `localdev` is the active target.
- After any prodops script run, switch back with `pnpm env:use-local` before resuming local development.