# SN International Group — Public Website (`apps/www`)
# Technical Documentation and Handover File

| Field | Value |
| --- | --- |
| Document type | Technical documentation (issued for developer handover) |
| Application | `@sn-group/www` (public website) |
| Repository | `sn-connect-app` monorepo, folder `apps/www` |
| Language standard | ASD-STE100 (Simplified Technical English) |
| Date of issue | 2026-07-26 |
| Prepared by | Francine Nastassja |

**Note on language:** This document obeys the ASD-STE100 writing rules. Sentences are short. Instructions are in the imperative form. Technical names (file names, commands, variable names) are not changed by the standard.

---

## 1. Scope

This document describes the public website of SN International Group. The document gives the next developer the data that is necessary to operate, change, and deploy the website. Read this document fully before you make a change to the code.

The website is one application in a monorepo. The internal HR portal (`apps/web`) is a different application. This document does not describe the HR portal.

## 2. System Description

### 2.1 Function

The application is the public marketing and recruitment website of SN International Group. The website shows company information, team information, and contact functions. The website also collects business inquiries and job applications through forms.

### 2.2 Technology

| Item | Technology | Version |
| --- | --- | --- |
| Framework | Next.js (App Router) | 15.5.11 |
| UI library | React | 19 |
| Language | TypeScript (strict mode) | 5.7 |
| Styles | Tailwind CSS | 3.4 |
| Animation | Framer Motion, GSAP, Lenis (smooth scroll) | 11 / 3.13 / 1.3 |
| UI components | Radix UI, shadcn/ui, Lucide icons | — |
| Forms | React Hook Form + Zod validation | 7 / 3 |
| Data fetching | TanStack React Query | 5 |
| Database and storage | Supabase | JS client 2 |
| Email service | Resend | 6 |
| Hosting | Vercel | — |
| Package manager | pnpm (workspace) | — |

### 2.3 Monorepo Position

The application has the package name `@sn-group/www`. The application uses two shared workspace packages: `@hr-portal/database` and `@hr-portal/ui`. The Next.js configuration transpiles these packages. Do not remove them from `next.config.ts`.

### 2.4 Domains

| Environment | URL |
| --- | --- |
| Production website | `https://www.sngroup.com.au` |
| Production HR portal | `https://app.sngroup.com.au` |
| Local website | `http://localhost:3000` |
| Local HR portal | `http://localhost:3001` |

## 3. Folder Structure

| Folder | Content |
| --- | --- |
| `src/app` | Page routes and API routes |
| `src/components` | UI components, in one folder for each page domain |
| `src/components/*/rebrand` | Current design implementation of each page |
| `src/lib` | Site configuration, Supabase clients, email functions, Zod schemas |
| `src/data/placeholder.ts` | Placeholder content (see Section 10) |
| `src/hooks` | Custom React hooks |
| `public` | Static assets (logos, posters, fonts) |
| `src/assets` | Assets that the build imports |

**Note:** The `rebrand` subfolders contain the current design. Many older components stay in the parent folders. Examine the page file in `src/app` to see which component set a page uses.

### 3.1 Important Files

| File | Function |
| --- | --- |
| `src/lib/site-config.ts` | URL resolution, booking URLs, and the hidden-section flag |
| `src/lib/supabase/server.ts` | Server-side Supabase clients (anon and admin) |
| `src/lib/email.ts` | All email functions (Resend) |
| `src/lib/schemas/*.schema.ts` | Zod validation for the inquiry form and the application form |
| `src/app/layout.tsx` | Root layout, metadata, SEO, and JSON-LD data |
| `src/app/fonts.ts` | Fonts: Aspekta (local variable font) and Roboto Mono (Google) |
| `next.config.ts` | Transpiled packages, image domains, security headers, `@` alias |
| `src/app/sitemap.ts`, `src/app/robots.ts` | Sitemap and robots configuration |

## 4. Page Routes

### 4.1 Live Routes

| Route | Page |
| --- | --- |
| `/` | Home |
| `/about` | About the company |
| `/services` | Services |
| `/team` | Team |
| `/contact` | Contact and booking |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |

### 4.2 Hidden Routes

A feature flag hides these routes (see Section 7):

| Route | Page |
| --- | --- |
| `/businesses` | Business portfolio |
| `/businesses/[slug]` | One business unit |
| `/businesses/[slug]/projects/[projectSlug]` | One project |
| `/careers` | Job listings |
| `/careers/[id]` | One job posting |
| `/life-at-sn` | Culture pages |
| `/life-at-sn/[slug]` | One culture article |

## 5. API Routes

| Method and route | Function | Supabase objects | Key |
| --- | --- | --- | --- |
| `GET /api/health` | Health check | — | — |
| `GET /api/businesses` | Read business units | `business_units` | anon |
| `GET /api/jobs` | Read job postings | `job_postings` | anon |
| `GET /api/team` | Read team members | `employee_directory` | anon |
| `GET /api/public/stats` | Read counts | `users`, `departments` | anon |
| `POST /api/inquiries` | Store a business inquiry, send two emails | `public_inquiries` | service role |
| `GET /api/applications` | Read job applications | `job_applications` | service role |
| `POST /api/applications` | Store a job application, upload the resume, write an audit log, send one email | `job_applications`, `audit_logs`, storage bucket `applications` | service role |

## 6. Data Flow

### 6.1 Public Reads

Read endpoints use the anon-key client from `createSupabaseServerClient()` in `src/lib/supabase/server.ts`. These reads obey the Row Level Security (RLS) policies of the database.

### 6.2 Public Writes

Write endpoints use the admin client from `createSupabaseAdminClient()`. This client uses the service-role key and does not obey RLS. Keep this client on the server only. Do not import it into client components.

### 6.3 Email

The file `src/lib/email.ts` sends all email through Resend. The sender address is `no-reply@sngroup.com.au`.

| Trigger | Email | Receiver |
| --- | --- | --- |
| New inquiry | Notification | `INQUIRY_NOTIFICATION_EMAIL` (fallback: `info@sngroup.com.au`) |
| New inquiry | Confirmation | The person who sent the inquiry |
| New application | Confirmation | The applicant |

If `RESEND_API_KEY` is not set, the code writes an error to the log and does not send email. The form submission continues.

### 6.4 ATS Event (Optional)

After a job application with a resume, `POST /api/applications` can send one event to Inngest. This starts the ATS resume processing. The event is sent only when `INNGEST_EVENT_KEY` is set. The event is non-blocking. A failure of the event does not stop the application flow.

## 7. Feature Flag: Hidden Sections

The constant `HIDE_EXPANSION_SECTIONS` in `src/lib/site-config.ts` controls the hidden routes.

Rule: the sections are hidden unless `NEXT_PUBLIC_WWW_HIDE_EXPANSION_SECTIONS` is set to the exact string `false`.

The flag has these effects: the hidden page routes show a not-found result, the header and the footer do not show links to the hidden routes, and the sitemap does not list the hidden routes.

**Caution:** Do not set the flag to `false` in production before you complete the content work. The hidden pages still use placeholder data (see Section 10).

## 8. Environment Variables

Set the values in `apps/www/.env.local` for local work. Set the values in the Vercel project for preview and production.

### 8.1 Mandatory Variables

| Variable | Function |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public read key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server write key. Keep this key secret. |
| `NEXT_PUBLIC_APP_URL` | HR portal URL (login links). Alternative name: `NEXT_PUBLIC_PORTAL_URL` |
| `NEXT_PUBLIC_WWW_URL` | Public website URL (canonical links) |

### 8.2 Variables for Full Function

| Variable | Function |
| --- | --- |
| `RESEND_API_KEY` | Email service key |
| `INQUIRY_NOTIFICATION_EMAIL` | Receiver of inquiry notifications |
| `NEXT_PUBLIC_GOOGLE_APPOINTMENT_SCHEDULE_URL` | Booking link. Alternative name: `NEXT_PUBLIC_GOOGLE_BOOKING_URL` |
| `NEXT_PUBLIC_GOOGLE_APPOINTMENT_EMBED_URL` | Embedded booking calendar (optional) |
| `NEXT_PUBLIC_WWW_HIDE_EXPANSION_SECTIONS` | Hidden-section flag (see Section 7) |
| `INNGEST_EVENT_KEY` | ATS event key (optional) |
| `INNGEST_BASE_URL` | ATS event URL. Default: `https://inn.gs` |

**Note:** The code has safe fallbacks for the URLs. The production URLs are the defaults in a production build. The localhost URLs are the defaults in a development build.

## 9. Procedures

### 9.1 Set Up the Application Locally

1. Install pnpm and Node.js.
2. Open a terminal at the repository root.
3. Run: `pnpm install`
4. Create the file `apps/www/.env.local`.
5. Copy the variables from Section 8 into the file.
6. Set the correct values for each variable.

### 9.2 Start the Development Server

1. Open a terminal at the repository root.
2. Run: `pnpm dev` (or `pnpm --filter @sn-group/www dev`).
3. Open `http://localhost:3000` in a browser.
4. Make sure that the home page shows correctly.

### 9.3 Check the Code

1. Run: `pnpm --filter @sn-group/www typecheck`
2. Make sure that the check reports zero errors.
3. Run: `pnpm build:www` from the repository root.
4. Make sure that the build completes with no errors.

### 9.4 Connect to Supabase

The application uses the shared Supabase configuration in `supabase/config.toml` at the repository root. You can point the application to the remote project or to the local stack. Use one target at a time.

For the local stack:

1. Run: `pnpm supabase:start` from the repository root.
2. Run: `pnpm supabase:status`.
3. Read the local API URL and the local keys from the output.
4. Put these values in `apps/www/.env.local`.

**Note:** The local stack uses ports `55321` to `55324`, not the Supabase defaults. Do not use the default port values from general tutorials.

**Caution:** The command `pnpm db:migrate` pushes migrations to the Supabase project that the CLI is linked to. This project can be production. Confirm the linked project before you run a migration. For a local-only migration, run: `pnpm exec supabase db push --local --workdir .`

### 9.5 Deploy to Production

The website deploys from the repository root. The root `vercel.json` sets the build command to `pnpm build:www`.

1. Make sure that the linked Vercel project is the public website, not the HR portal.
2. Make sure that all variables from Section 8 are set in Vercel for the production scope.
3. Run: `vercel` to make a preview deployment.
4. Do the checks in Section 9.6 on the preview URL.
5. Run: `vercel --prod` to make the production deployment.
6. Do the checks in Section 9.6 on `https://www.sngroup.com.au`.

### 9.6 Verify a Deployment

1. Open each live route from Section 4.1. Make sure that each page shows correctly.
2. Make sure that the hidden routes show a not-found page.
3. Send a test inquiry on `/contact`. Make sure that the two emails arrive.
4. Make sure that no image on the public pages is broken.
5. Make sure that the login link opens the correct HR portal URL.
6. Make sure that the canonical URLs use the production domain.
7. Open `/api/health`. Make sure that the response is healthy.

### 9.7 Change Page Content

1. Find the page file in `src/app`.
2. Find the components that the page imports. The current design is in the `rebrand` subfolders.
3. Make the change.
4. Do the checks in Section 9.3.
5. Examine the page at `http://localhost:3000` on desktop width and on mobile width.

### 9.8 Change Team, Jobs, or Business Data

This data does not come from the code. The data comes from the Supabase tables `employee_directory`, `job_postings`, and `business_units`. Change the data in Supabase. The website reads the new data through the API routes.

## 10. Known Risks

**Placeholder content.** Parts of the website use `src/data/placeholder.ts`. The hidden sections depend on this placeholder data. Replace the placeholder data with real data before you show a hidden section. See `../docs/apps/www/real-data-checklist.csv`.

**Hidden-section flag.** If you set the flag to `false` without the content work, the website shows unfinished pages. See Section 7.

**Service-role key.** The admin Supabase client does not obey RLS. A leak of `SUPABASE_SERVICE_ROLE_KEY` gives full database access. Keep the key in server environments only.

**Shared schema.** The applications `apps/www` and `apps/web` use one Supabase schema. A migration for one application can have an effect on the other application. See the caution in Section 9.4.

**Vercel configuration split.** The root `vercel.json` belongs to this website. The file `apps/web/vercel.json` belongs to the HR portal. Do not mix these configurations.

**Missing database objects.** If a table, view, or the storage bucket `applications` is missing in the target environment, the related API route fails. See Section 5 for the list of objects.

## 11. Handover Items

Make sure that you receive access to these items:

| Item | Purpose |
| --- | --- |
| GitHub repository | Code and deployments |
| Vercel project (public website) | Hosting and environment variables |
| Supabase project | Database, storage, keys |
| Resend account | Email service and API key |
| Google Calendar booking schedule | Contact page booking |
| DNS for `sngroup.com.au` | Domain management |
| Values of all variables in Section 8 | Local, preview, and production |

## 12. Reference Documents

| Document | Location |
| --- | --- |
| Full legacy handoff notes | `apps/www/README.md` |
| Hidden sections log | `docs/apps/www/hidden-sections-2026-03-30.md` |
| Real data checklist | `docs/apps/www/real-data-checklist.csv` |
| Testing guide | `docs/apps/www/testing-guide.md` |
| UI enhancement checklist | `docs/apps/www/ui-enhancement-checklist.md` |
| Vercel deployment guide | `docs/deployment/VERCEL_DEPLOYMENT.md` |
| Local Supabase workflow | `docs/local-supabase-workflow.md` |

---

*End of document.*
