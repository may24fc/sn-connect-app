# apps/www — Documentation Hub

> **SN International Group** — Corporate public website  
> Next.js 15 (App Router) · TypeScript · Supabase (read-only public data)

This is the documentation index for the `apps/www` workspace — the public-facing corporate website for SN International Group.

---

## Overview

`apps/www` is a separate Next.js app from the HR portal (`apps/web`). It serves the public corporate website at the company's public domain and consumes read-only data from Supabase (business units, jobs, announcements, team info).

---

## Documents

### Planning & Migration

| Document | Description |
|----------|-------------|
| [hidden-sections-2026-03-30.md](hidden-sections-2026-03-30.md) | Feature-flagged hidden routes and restore checklist |
| [inquiry-email-service-enhancement.md](inquiry-email-service-enhancement.md) | Plain-language and technical guide to the secured quick-brief inquiry and email flow |
| [priority-handoff.csv](priority-handoff.csv) | Content handoff priority matrix (what stakeholders need to provide) |
| [real-data-checklist.csv](real-data-checklist.csv) | Full checklist of pages still using mock/placeholder data |

### UI & Quality

| Document | Description |
|----------|-------------|
| [ui-enhancement-checklist.md](ui-enhancement-checklist.md) | UI/UX audit results and improvement checklist |
| [testing-guide.md](testing-guide.md) | Playwright testing guide for the public site |

---

## Route Map

| Route | Status | Data Source |
|-------|--------|-------------|
| `/` | Live (partial) | Supabase + placeholder |
| `/about` | Live | Placeholder |
| `/team` | Live | Placeholder |
| `/contact` | Live | Placeholder |
| `/privacy` | Live | Static |
| `/terms` | Live | Static |
| `/portal` | Live | Static |
| `/businesses` | Hidden (feature flag) | Supabase `business_units` |
| `/businesses/[slug]` | Hidden | Supabase |
| `/careers` | Hidden | Supabase `job_postings` |
| `/careers/[id]` | Hidden | Supabase |
| `/life-at-sn` | Hidden | Placeholder |
| `/life-at-sn/[slug]` | Hidden | Placeholder |

### Restoring Hidden Routes

Hidden routes are controlled by the `NEXT_PUBLIC_WWW_HIDE_EXPANSION_SECTIONS` feature flag.

```bash
# Restore all hidden routes
NEXT_PUBLIC_WWW_HIDE_EXPANSION_SECTIONS=false
```

See [hidden-sections-2026-03-30.md](hidden-sections-2026-03-30.md) for the full restore checklist.

---

## Data Sources

| Data Type | Source | Status |
|-----------|--------|--------|
| Employee count | `employees` table (live) | ✅ Live |
| Department count | `departments` table (live) | ✅ Live |
| Open positions count | `job_postings` table (live) | ✅ Live |
| Company profile | `website_content` table | ⚠️ Seeded, not consumed |
| Business units | `business_units` table | ⚠️ Table exists, frontend uses placeholder |
| Job postings | `job_postings` table | ⚠️ Live with placeholder fallback |
| Team/leadership | Hardcoded | ❌ Fully placeholder |
| Life at SN gallery | Hardcoded | ❌ Fully placeholder |
| Culture values | Hardcoded | ❌ Fully placeholder |

---

## Key File Locations

| File | Purpose |
|------|---------|
| `apps/www/src/app/layout.tsx` | Root layout with metadata |
| `apps/www/src/data/placeholder.ts` | Placeholder data (to be replaced) |
| `apps/www/src/components/layout/` | Header, Footer, AnnouncementBanner |
| `apps/www/src/components/home/` | Hero, BusinessCards, Testimonials, SocialProofStrip |
| `apps/www/src/app/api/businesses/` | Business unit API |
| `apps/www/src/app/api/jobs/` | Jobs listing API |
| `apps/www/src/app/sitemap.ts` | Dynamic sitemap |

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_WWW_HIDE_EXPANSION_SECTIONS` | Hide businesses/careers/life-at-sn routes | `true` (hidden) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Required |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Required |
| `GOOGLE_MAPS_API_KEY` | Google Maps embed for contact page | Optional |
