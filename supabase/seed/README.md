# Seed and data-import files

Nothing in this folder runs automatically. `supabase/config.toml` sets
`sql_paths = ['./seed.sql']`, so `supabase db reset` loads only `../seed.sql`.
Apply anything here manually, and only against the environment it targets.

## Sample data

| File | Purpose |
| --- | --- |
| `01_sample_data.sql` | Demo HR records for local development |
| `02_corporate_website.sql` | Corporate site sample content |

## Environment-specific data imports

These three were previously in `supabase/migrations/`, which meant any
`supabase db push` could write real business data into whichever database it
was pointed at. They are data, not schema, so they now live here.

| File | Target | Notes |
| --- | --- | --- |
| `20260817133900_import_marketing_ads_data.sql` | any | Historical ad-spend records; aborts when `auth.users` is empty |
| `20260902113000_import_ea_pending_tasks_dev_v3.sql` | **Dev only** | Aborts unless assignee `23e32872-…` exists |
| `20260902113100_import_ea_pending_tasks_prod_v3.sql` | **Prod only** | Assignee `80c63414-…` |

Filenames keep their original migration timestamps for traceability. Those
versions were removed from `supabase_migrations.schema_migrations` on Dev and
Prod on 2026-09-16; leaving them would make `supabase db push` abort with
"Remote migration versions not found in local migrations directory."

The schema and reference data they carried (the `marketing_entries.invoice_file_name`
column and the meta/google/email platform rows) were moved to
`supabase/migrations/20260916000001_preserve_marketing_schema_and_platforms.sql`
so fresh environments still build correctly.

## Applying one

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed/<file>.sql
```

Check which database `$DATABASE_URL` points at first. Each import is guarded and
will abort rather than write to the wrong environment, but the guards are a last
line of defence, not a substitute for checking.
