# SN International Group — Corporate Website UI/UX Enhancement Checklist

> **Audited:** 2026-03-07 via Playwright automated visual + structural tests  
> **App:** `apps/www` (Next.js 15, port 3000)  
> **Goal:** Transform from a generic corporate template into a distinctive, premium brand experience

---

## Audit Summary

| Category | Tests Run | Issues Found |
|----------|-----------|-------------|
| Visual screenshots (desktop) | 22 pages/sections | All captured |
| Responsive (mobile + tablet) | 3 viewports | Layout intact, lacks polish |
| Heading hierarchy (a11y) | 7 pages | 2 issues (`/about` missing H1, `/team` H2→H4 skip) |
| Dead internal links | Full crawl | 2 dead (`/privacy`, `/terms`) |
| Broken/missing images | 7 pages | `life-at-sn` gallery images don't exist |
| Font consistency | 4 pages | Clean — Inter only |
| Section spacing | Homepage | Inconsistent py values (12px → 144px) |

---

## Implementation Checklist

### Legend
- 🔴 **Critical** — Breaks trust/professionalism immediately
- 🟡 **High** — Clearly looks generic or unfinished
- 🟢 **Medium** — Polish and differentiation
- 🔵 **Low** — Nice-to-have refinements

---

### 1. HOMEPAGE (`/`)

#### 1.1 Hero Section 🔴
- [ ] **Add hero visual element** — Currently pure text with no imagery. Premium sites use one of:
  - Full-bleed video background (brand film loop)
  - Animated 3D illustration or isometric art
  - Dynamic particle/mesh gradient hero (e.g., Stripe-style)
  - High-quality parallax photography
- [ ] **Add animated headline typing/reveal** — The tagline "Building Futures, Empowering Lives" loads statically. Add a typewriter, word-rotate, or split-text reveal animation for immediate visual impact
- [ ] **Add social proof strip** — Below hero, add a horizontal strip of trust signals: partnership logos, certifications, "500+ employees", "4 business units", "15+ years" stat counters with number count-up animation
- [ ] **Improve CTA hierarchy** — All 3 buttons (Businesses / Careers / Contact) have equal visual weight. Make one primary (filled), others secondary (outline/ghost)

#### 1.2 What's New Marquee 🟢
- [ ] **Add category badges** — Each news item should have a colored tag (e.g., "SFO", "UHP", "Corporate") for visual variety
- [ ] **Add timestamps** — Show relative dates ("2 days ago") to prove the site is actively updated
- [ ] **Add linked destinations** — Marquee items are not clickable. Link each to a detail page or announcement

#### 1.3 Business Cards Carousel 🟡
- [ ] **Add actual imagery per business unit** — Cards currently show only Lucide icon + text. Each card needs a high-quality photo or custom illustration representing the unit
- [ ] **Add a subtle background gradient per unit** — Use each unit's brand color as a faint gradient wash behind the card
- [ ] **Add progress bar for auto-rotation** — Show a thin progress indicator so users know cards auto-advance
- [ ] **Improve touch/swipe interaction** — Add swipe gesture support for mobile (currently button-only)

---

### 2. ABOUT PAGE (`/about`)

#### 2.1 Hero 🟡
- [ ] **Fix missing H1 tag** — Playwright detected no `<h1>` on this page (accessibility violation)
- [ ] **Add a brief company timeline or "established since" badge** — Differentiate from generic "about us" pages

#### 2.2 Mission & Vision Cards 🟢
- [ ] **Add subtle iconography or illustrations** — Currently two plain text cards with indigo accent bars. Add custom icons or small illustrations to make them visually distinct
- [ ] **Add a "guiding principles" or values grid below** — The values currently live on `/life-at-sn` but belong here too as a secondary section

#### 2.3 CEO Message 🔴
- [ ] **Replace placeholder portrait** — Currently a gray circle with "CEO" text. Must have an actual photo or at minimum a professionally styled avatar/illustration
- [ ] **Replace placeholder name** — "CEO Name" breaks all credibility instantly. Must be real or at least realistic
- [ ] **Add video message option** — Modern CEO messages include an embedded video alongside the letter. Add a "Watch Message" button that opens a video modal
- [ ] **Add signature image** — Use a handwritten-style signature PNG instead of just text name

#### 2.4 New Section: Company Timeline 🟡
- [ ] **Add interactive timeline** — Horizontal scrollable or vertical alternating timeline showing company milestones (founding, expansion, awards). This is a differentiator — most generic sites skip this
- [ ] **Add number counter animation** — "Founded 20XX", "X offices", "X employees" with count-up on scroll

---

### 3. BUSINESSES PAGE (`/businesses`)

#### 3.1 Portfolio Section 🟡
- [ ] **Add featured statistics per unit** — Each business card should show 1-2 key metrics (e.g., "500+ clients served", "12 locations")
- [ ] **Add hover interaction beyond scale** — The current ScrollReveal is one-and-done. Add a persistent hover state: background color shift, icon animation, or reveal extra info
- [ ] **Add a filterable view toggle** — Allow grid vs. list view for the business units

#### 3.2 Business Detail Pages (`/businesses/[slug]`) 🟢
- [ ] **Add a hero banner image per business unit** — Currently icon + text only. Each unit needs a full-width banner photo
- [ ] **Add client logos or partner badges** — Trust signals specific to each business unit
- [ ] **Improve testimonial cards** — Add photos for testimonial authors, star ratings, or company logos
- [ ] **Add a "Key Projects" or "Case Studies" section** — Showcase real work, making this more than a generic service listing
- [ ] **Add CTA section before footer** — "Ready to work with us?" with a prominent inquiry button

---

### 4. CAREERS PAGE (`/careers`)

#### 4.1 Why Join Us Carousel 🟢
- [ ] **Replace generic reasons with employee video testimonials** — Show real or realistic employee quotes with photos/videos instead of icon cards
- [ ] **Add stats to each "why" card** — E.g., "Professional Development" → "200+ training hours per employee per year"

#### 4.2 Job Listings 🟡
- [ ] **Add job card thumbnails or department icons** — All cards look identical with the same white card layout. Add visual differentiation per department
- [ ] **Improve the "No Jobs Found" empty state** — Add an illustration and a "Subscribe to Job Alerts" CTA
- [ ] **Add salary range or "Competitive" badge** — Modern job boards show compensation transparency
- [ ] **Add "Posted X days ago" timestamps** — Shows the listings are fresh
- [ ] **Improve applicant count display** — The real-time count is great but should include a progress bar or "hot" badge for popular positions
- [ ] **Add job sharing buttons** — Social share (LinkedIn, Twitter, copy link) on each listing

#### 4.3 Application Form 🔴
- [ ] **Fix job position input** — Currently asks users to "Enter the job ID from the listings above" (terrible UX). Must be a dropdown/select populated from job data
- [ ] **Add multi-step form wizard** — Break the long form into steps: Personal Info → Resume → Cover Letter → Review
- [ ] **Add resume parsing preview** — After upload, show a preview of the parsed resume name/size
- [ ] **Add form progress indicator** — Show completion percentage

---

### 5. CONTACT PAGE (`/contact`)

#### 5.1 Contact Form 🟢
- [ ] **Add form field icons** — Prefix inputs with relevant Lucide icons (User, Mail, Phone, etc.)
- [ ] **Add success state animation** — After submit, show a checkmark animation + "We'll respond within 24 hours" message
- [ ] **Add estimated response time** — Trust signal under the form

#### 5.2 Contact Cards 🟢
- [ ] **Add click-to-call and click-to-email** — Phone numbers and emails should be `<a href="tel:">` and `<a href="mailto:">`
- [ ] **Add map pins per business unit** — If units have different locations, show individual map markers

#### 5.3 Google Maps 🟢
- [ ] **Replace with interactive styled map** — The current iframe is a generic embed. Use a styled map (Mapbox or Google Maps with custom styling matching the Indigo design system)
- [ ] **Add office photo alongside map** — Show what the office looks like

---

### 6. LIFE AT SN PAGE (`/life-at-sn`)

#### 6.1 Culture Highlights 🟡
- [ ] **Replace Unicode symbols with proper SVG icons** — Currently uses ✦, ◆, ▲, ●, ★, ◈ as placeholders. Use custom-designed or Lucide icons
- [ ] **Add hover animations** — Cards are static. Add icon rotation, color transitions, or description reveal on hover
- [ ] **Add a decorative background pattern** — Differentiate this section from the plain white sections above/below

#### 6.2 Photo Gallery (Masonry Grid) 🔴
- [ ] **Add actual photos** — All image paths (`/images/culture/...`) reference files that don't exist. Shows fallback Lucide `ImageIcon` instead
- [ ] **Add lightbox viewer** — Clicking a photo should open a full-screen lightbox with navigation
- [ ] **Add photo captions and categories** — "Team Building", "Office Life", "Events" with filter tabs
- [ ] **Add lazy loading with blur placeholder** — Use Next.js `Image` with blurDataURL for premium loading experience

#### 6.3 Employee Spotlight 🟡
- [ ] **Add real employee photos** — Currently just name + text, no avatar/photo
- [ ] **Make it a rotating carousel** — Only 2 testimonials are inline-hardcoded. Pull from a collection and rotate
- [ ] **Add role/department badges** — Show where each featured employee works
- [ ] **Move data to placeholder.ts** — Currently inline in the page file, inconsistent with the rest of the app

---

### 7. TEAM PAGE (`/team`)

#### 7.1 Executive Portraits 🔴
- [ ] **Replace all placeholder names** — "CEO Name", "COO Name", "CFO Name", "CHRO Name" destroy credibility instantly
- [ ] **Add real headshot photos** — Currently gradient panels with initials. At minimum use AI-generated professional headshots
- [ ] **Add LinkedIn links** — Currently point to `#`. Must be real or removed entirely
- [ ] **Add hover bio expansion** — Show a brief bio on hover or click, not just name + title

#### 7.2 Team Grid 🟡
- [ ] **Replace placeholder names** — "Director 1", "Manager 1", etc. are obviously fake
- [ ] **Add department filter/tabs** — Allow filtering by department with smooth transition
- [ ] **Add a "Join Our Team" CTA card** — The last card in the grid should be a CTA linking to Careers
- [ ] **Improve the initials avatars** — Use generated Dicebear/Boring avatars or realistic photos

#### 7.3 Team Stats 🟢
- [ ] **Add count-up animation** — Numbers (500+, 4, 15+, 20+) should animate counting up on scroll into view
- [ ] **Add subtle background illustration** — Grid pattern, topographic lines, or dot matrix behind the stats

#### 7.4 Heading Hierarchy Fix 🟡
- [ ] **Fix H2→H4 skip** — Playwright detected heading level skip from H2 directly to H4 on team member cards. Add intermediate H3 or restructure

---

### 8. PORTAL PAGE (`/portal`)

#### 8.1 Portal Landing 🟡
- [ ] **Add feature preview cards** — Show what employees get inside the portal: "View Pay Slips", "Submit Reports", "Track Tasks" with icons
- [ ] **Add a hero illustration or animation** — Currently just logo + two buttons. Very bare
- [ ] **Add testimonial from an employee** — "Control Hub made my daily work so much easier" — social proof for the portal itself
- [ ] **Add quick-help FAQ accordion** — "Forgot password?", "First time logging in?", "Who can I contact?"

---

### 9. GLOBAL / LAYOUT

#### 9.1 Header 🟢
- [ ] **Add logo image** — Currently an indigo square with "SN" text. Use an actual SVG logo
- [ ] **Add smooth mega menu animation** — MegaMenu appears/disappears without transition. Add Framer Motion fade+slide
- [ ] **Add active link indicator beyond font weight** — Use an indigo underline or dot indicator for the active route
- [ ] **Fix MegaMenu `onClose` prop** — Prop is accepted but never called, leaving the menu stuck in certain edge cases

#### 9.2 Footer 🟡
- [ ] **Fix dead links** — `/privacy` and `/terms` return 404. Either create the pages or remove the links
- [ ] **Add social icons** — Replace text links ("Facebook", "LinkedIn") with proper SVG icon buttons
- [ ] **Add newsletter signup** — An email input in the footer for newsletter subscription
- [ ] **Add "Back to Top" button** — Floating button on long pages
- [ ] **Add a subtle gradient or brand pattern** — Footer is plain zinc-900 background. Add a topographic/mesh pattern

#### 9.3 Accessibility 🟡
- [ ] **Fix heading hierarchy on `/about`** — Missing H1
- [ ] **Fix heading hierarchy on `/team`** — H2→H4 skip
- [ ] **Add skip-to-content link** — Hidden link before header for keyboard navigation
- [ ] **Add focus-visible outlines** — Ensure all interactive elements show a visible focus ring for keyboard users
- [ ] **Add aria-labels to icon-only buttons** — Mobile menu button has aria-label but verify all icon buttons do

#### 9.4 Performance & SEO 🟢
- [ ] **Add custom 404 page** — No `not-found.tsx` exists for the www app
- [ ] **Add loading.tsx skeleton files** — No route-level loading states for any page
- [ ] **Fix double font loading** — Inter loaded via `next/font/google` AND `@import` in globals.css (remove CSS @import)
- [ ] **Add Open Graph images** — No OG images for social sharing
- [ ] **Add structured data (JSON-LD)** — Organization schema, job posting schema for SEO

#### 9.5 Micro-interactions & Polish 🟢
- [ ] **Add page transition animations** — Routes change instantly. Add a smooth fade or slide between pages
- [ ] **Add scroll progress indicator** — Thin indigo bar at the top showing scroll depth on long pages
- [ ] **Add cursor effects on hero sections** — Magnetic buttons, gradient spotlight following cursor
- [ ] **Add entrance animations for all cards** — Currently only some sections use ScrollReveal. Apply consistently

---

### 10. DATA & CONTENT INFRASTRUCTURE

#### 10.1 Replace Hardcoded Data 🟡
- [ ] **Connect pages to API routes** — TanStack Query infrastructure and API routes exist but pages render from `PLACEHOLDER_JOBS` / `BUSINESS_UNITS` constants. Wire up the live data layer
- [ ] **Move inline data to placeholder.ts** — Employee Spotlight data in `life-at-sn/page.tsx` is inline, inconsistent with other pages

#### 10.2 Content Completeness 🔴
- [ ] **Replace ALL placeholder names** — "CEO Name", "Director 1", etc. across every page
- [ ] **Add real/realistic photos** — Executive portraits, culture photos, team headshots
- [ ] **Add real testimonials** — Current testimonials are obviously fabricated
- [ ] **Add real contact information** — Placeholder emails and phone numbers need replacement

---

## Uniqueness Differentiators (What Makes This Stand Out)

These are enhancements that would elevate the site beyond a typical corporate template:

| # | Enhancement | Impact |
|---|------------|--------|
| 1 | **Animated hero with particle/gradient mesh** | First impression — immediately signals premium quality |
| 2 | **Interactive company timeline** | Most corporate sites have static "about" pages; a scrollable visual timeline is memorable |
| 3 | **Real-time job applicant counts** | Already partially implemented — unique social-proof feature, finalize it |
| 4 | **CEO video message with play button** | Humanizes the brand, very few corporate sites do this well |
| 5 | **Business unit micro-sites** (color-themed detail pages) | Each `/businesses/[slug]` page gets its own brand color — more immersive than generic sub-pages |
| 6 | **Bento-grid photo gallery with lightbox** | Unique masonry layout for culture photos beats generic carousels |
| 7 | **Floating inquiry form (FAB pattern)** | Already implemented — uncommon and convenient. Polish the animation |
| 8 | **Scroll progress bar + section anchors** | Professional navigation aid for long pages |
| 9 | **Cursor spotlight effect on hero** | Eye-catching micro-interaction that signals attention to detail |
| 10 | **Number count-up animations** | Adds dynamism to otherwise static stat displays |
| 11 | **Page transition animations** | Seamless flow between routes eliminates the "page reload" feeling |
| 12 | **Department-filtered team grid with avatars** | Interactive team browsing beats static grid dumps |

---

## Priority Roadmap

### Phase 1 — Fix Critical Issues (Trust & Credibility)
1. Replace all placeholder names and content
2. Add real/realistic photos (executives, culture, hero)
3. Fix application form job ID input → dropdown
4. Fix dead links (`/privacy`, `/terms`)
5. Fix heading hierarchy (a11y)

### Phase 2 — Visual Differentiation
6. Hero section: animated gradient/video + typing headline
7. Social proof strip with animated counters
8. Executive portraits with real headshots
9. Culture photo gallery with actual images + lightbox
10. Footer: social icons, newsletter, back-to-top

### Phase 3 — Interactive Polish
11. Page transitions + scroll progress bar
12. Company timeline on About page
13. Smooth mega menu animation
14. Card entrance animations (consistent ScrollReveal)
15. Count-up number animations on stats

### Phase 4 — Content & Data
16. Wire API routes to page components (replace placeholder data)
17. Custom 404 page + loading skeletons
18. Open Graph images + structured data
19. Newsletter signup functionality
20. Privacy Policy + Terms of Service pages

---

*Screenshots saved to: `e2e/screenshots/www-audit/`*  
*Audit spec: `e2e/www-ui-audit.spec.ts`*
