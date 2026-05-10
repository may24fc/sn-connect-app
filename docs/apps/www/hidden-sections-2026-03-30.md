# apps/www Hidden Sections Log

Date: 2026-03-30

Purpose: temporarily hide public-site sections that still rely on incomplete or mock data so `apps/www` can be deployed sooner with a smaller real-data scope.

Feature flag: `NEXT_PUBLIC_WWW_HIDE_EXPANSION_SECTIONS`

- Current default behavior: hidden unless the variable is explicitly set to `false`
- Restore behavior: set `NEXT_PUBLIC_WWW_HIDE_EXPANSION_SECTIONS=false`

## Hidden Routes

- `/businesses`
- `/businesses/[slug]`
- `/businesses/[slug]/projects/[projectSlug]`
- `/careers`
- `/careers/[id]`
- `/life-at-sn`
- `/life-at-sn/[slug]`

## Hidden Public Surfaces

- Homepage business cards section removed from [apps/www/src/app/page.tsx](apps/www/src/app/page.tsx)
- Homepage testimonials section removed from [apps/www/src/app/page.tsx](apps/www/src/app/page.tsx)
- Hero CTA changed away from hidden routes in [apps/www/src/components/home/HeroSection.tsx](apps/www/src/components/home/HeroSection.tsx)
- Announcement banner now filters out links to hidden routes in [apps/www/src/components/layout/AnnouncementBanner.tsx](apps/www/src/components/layout/AnnouncementBanner.tsx)
- Marquee banner and announcement banner are hidden behind the shared feature flag in [apps/www/src/components/home/HeroSection.tsx](apps/www/src/components/home/HeroSection.tsx) and [apps/www/src/components/layout/AnnouncementBanner.tsx](apps/www/src/components/layout/AnnouncementBanner.tsx)
- Main navigation links for Businesses, Careers, and Life at SN removed from [apps/www/src/data/placeholder.ts](apps/www/src/data/placeholder.ts)
- Footer business-units link column removed from [apps/www/src/components/layout/Footer.tsx](apps/www/src/components/layout/Footer.tsx)
- Contact page business unit contact cards section removed from [apps/www/src/app/contact/page.tsx](apps/www/src/app/contact/page.tsx)
- Team page open positions section removed from [apps/www/src/app/team/page.tsx](apps/www/src/app/team/page.tsx)
- Team grid CTA changed from Careers to Contact in [apps/www/src/components/team/TeamGrid.tsx](apps/www/src/components/team/TeamGrid.tsx)
- Sitemap entries for hidden routes removed from [apps/www/src/app/sitemap.ts](apps/www/src/app/sitemap.ts)

## Direct-Access Blocking Strategy

- Hidden routes currently call `notFound()` when the feature flag is enabled, so direct visits return the 404 page.
- This keeps the code in place for later restoration without deleting the route files.

## Restore Checklist

- Set `NEXT_PUBLIC_WWW_HIDE_EXPANSION_SECTIONS=false`
- If you want to keep the flag but permanently remove the temporary hide behavior later, remove the flag checks from the files listed in this document

## Reason For Hide

- Businesses pages still depend on incomplete real-data migration.
- Careers pages still have placeholder fallback behavior and are not ready for public exposure.
- Life at SN pages are still driven by mock culture and gallery content.