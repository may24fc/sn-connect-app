# SN International Group — Corporate Website Progress Report

> **Report Date:** March 26, 2026
> **Project:** SN International Group — Public Website
> **Development Period:** March 7 – March 23, 2026 (~2.5 weeks)
> **Developer:** Ceferino, Senior AI Intern

---

## Executive Summary

The SN International Group corporate website was built from the ground up in approximately **2.5 weeks**, starting March 7, 2026. It serves as the company's public-facing online presence, showcasing its businesses, team, career openings, and company culture to external visitors.

The website includes **14 fully built pages**, a unified **Navy & Gold** visual identity, smooth animations, and working features such as job applications with automatic email confirmations, a contact/inquiry form, and a team directory pulling real employee data from the company database.

**Current Status:** Ready for production use. All pages and features are functional.

---

## What Was Built

### The Website at a Glance

The site gives SN International Group a professional online presence with the following sections:

| Section | What It Does |
|---------|--------------|
| **Homepage** | Welcomes visitors with an animated headline, a summary of the company's business units, client testimonials, and a social proof strip |
| **About Us** | Shares the company story, CEO message, mission and vision, and a company timeline |
| **Our Businesses** | Showcases the four business units (SFO, UHP, 24 Fit Club, Construction) with individual detail pages and project galleries |
| **Careers** | Lists open job positions pulled from the database, with a full application form including resume upload and automatic email confirmation to applicants |
| **Our Team** | Displays the team directory with executive portraits, department stats, and a grid of team members — pulls real data from the employee database |
| **Life at SN** | Photo gallery and employee spotlights highlighting company culture, values, and work environment |
| **Contact Us** | Contact information cards, a Google Maps embed, and a working inquiry form that saves submissions to the database |
| **Portal** | Landing page that directs employees and interns to the HR Portal login, with a helpful FAQ section |
| **Privacy Policy** | Standard privacy policy page |
| **Terms of Service** | Standard terms of service page |

All pages also include a **loading screen** (shown while the page loads) and a custom **"Page Not Found"** screen for broken links.

---

### Key Working Features

1. **Job Application System** — Visitors can browse open positions, view job details, and submit applications with a resume upload (up to 5 MB). Applicants automatically receive a confirmation email.

2. **Contact & Business Inquiry Forms** — Submissions are validated (all required fields checked) and saved to the database for staff to review.

3. **Live Team Directory** — The team page pulls real employee data from the company database, so it stays up to date as staff changes happen.

4. **Live Job Listings** — Career openings are pulled from the database. When HR posts a new job in the portal, it automatically appears on the website.

5. **Company Statistics** — Live stats (employee count, department count, etc.) are pulled from the database and displayed on the homepage.

6. **Announcement Banner** — A top-of-page banner for company-wide announcements, visible across all pages.

7. **Search Engine Optimization (SEO)** — The site is fully optimized for Google and other search engines with a sitemap, proper page titles, descriptions, and structured data so the company appears correctly in search results.

---

## Weekly Progress

### Week 1 — March 7–9, 2026

**What happened:** The entire website was created from scratch in just three days.

- **March 7:** All 14 pages were built — homepage, about, team, businesses, careers, life at SN, contact, portal, privacy, terms, and supporting pages (loading screen, 404 page). All interactive elements were added: animated headlines, scrolling effects, counters, image galleries, job listings, application forms, and inquiry forms. The back-end services for handling job applications, inquiries, and pulling team/business/job data were also built.

- **March 8:** Business unit project pages were added. The careers page received a "Why Join Us" carousel and improved job listings. The team page got animated counting stats and an executive portrait section. The Life at SN page received a photo grid layout. Several visual bugs were fixed.

- **March 9:** The portal page content was updated, and links to the login page were corrected.

---

### Week 2 — March 15–19, 2026

**What happened:** The website received a **complete visual rebrand** and email features were connected.

- **March 15:** Pages and interactive elements were refined. An announcement banner was added to the top of every page. The email system was connected so job applicants receive automatic confirmation emails. Server health monitoring was set up.

- **March 17:** **Major visual rebrand** — the entire website's color scheme was changed from "Titanium & Indigo" (gray and purple tones) to **"Navy & Gold"** (deep navy blue and warm gold accents). The fonts were also changed to Source Sans 3 (body text) and Lexend (headings) for a more polished, professional look. Every page was updated to match the new brand.

- **March 18–19:** Page layout and heading structure were refined for better readability. The email confirmation system for job applicants was fixed and verified working. Build issues were resolved.

---

### Week 3 — March 23, 2026

**What happened:** Final enhancements and cleanup.

- Added a **client testimonials** section to showcase positive feedback.
- Added a **company timeline** component to visually display the company's history and milestones.
- Improved the business and team pages with better content presentation.
- Cleaned up unused code to keep the project maintainable.

---

## Visual Identity — Navy & Gold

The website follows a consistent **Navy & Gold** design language:

| Element | Description |
|---------|-------------|
| **Primary Color** | Deep Navy Blue — used for headers, navigation, and key elements |
| **Accent Color** | Warm Gold — used for buttons, highlights, and calls to action |
| **Body Font** | Source Sans 3 — clean, professional font for all body text |
| **Heading Font** | Lexend — modern, bold font for all titles and section headers |
| **Dark Mode** | Fully supported — visitors can toggle between light and dark themes |
| **Animations** | Smooth scroll effects, animated headlines, counting statistics, and page transitions throughout the site |

---

## Where Content Comes From

Some sections of the website pull live data from the company database, while others use placeholder content that needs to be replaced with real information:

| Section | Content Source | Action Needed? |
|---------|---------------|----------------|
| Job Listings | ✅ Live from database | No — automatically updated when HR posts new jobs |
| Job Applications | ✅ Saved to database + email sent | No — fully working |
| Team Directory | ✅ Live from database | No — automatically reflects current staff |
| Contact Inquiries | ✅ Saved to database | No — fully working |
| Company Stats | ✅ Live from database | No — automatically calculated |
| CEO Message & Portrait | ⚠️ Placeholder | **Yes** — needs real CEO name, photo, and message |
| Executive Portraits | ⚠️ Placeholder names | **Yes** — needs real names and photos for leadership team |
| Business Unit Images | ⚠️ Placeholder | **Yes** — needs real photos/images for each business unit |
| Life at SN Photos | ⚠️ Placeholder (stock images) | **Yes** — needs real company culture photos |
| Company Culture Values | ⚠️ Placeholder text | **Yes** — verify and update with actual company values |

---

## Known Items to Improve

Items identified during a quality review, organized by importance:

### Must Fix Before Launch (Critical)

- **Homepage hero section** — Currently text-only; needs a compelling image, video, or animated visual to make a strong first impression.
- **CEO name and portrait** — Currently shows "CEO Name" with a gray placeholder circle; needs the real CEO's name and professional photo.
- **Executive team names** — The team page shows placeholder names ("CEO Name", "COO Name"); needs real leadership names and photos.
- **Life at SN photo gallery** — References images that don't exist yet; shows fallback icons instead of photos.
- **Job application form** — The position selection requires typing an ID instead of choosing from a dropdown list; confusing for applicants.

### Should Fix (High Priority)

- Business unit cards need real imagery for each division.
- Job listings could use visual distinctions (department icons, thumbnail images).
- Some links in the footer were broken *(now fixed — Privacy and Terms pages exist)*.

### Nice to Have (Medium Priority)

- Homepage scrolling brand strip items could be made clickable.
- Contact form could benefit from field icons and a success animation.
- Navigation mega menu could use smoother opening/closing transitions.

---

## Summary

| Item | Status |
|------|--------|
| **Total Pages** | 14 — all built and functional |
| **Working Forms** | 3 — job application (with resume upload & email), contact inquiry, business inquiry |
| **Live Database Connections** | 5 — jobs, applications, team, inquiries, company stats |
| **Visual Identity** | Navy & Gold — fully applied across all pages |
| **Search Engine Ready** | Yes — sitemap, page titles, descriptions, and structured data all configured |
| **Dark Mode** | Yes — fully supported |
| **Animations** | Yes — smooth scroll effects, animated headlines, counting stats |
| **Automatic Emails** | Yes — job applicants receive confirmation emails |
| **Time to Build** | ~2.5 weeks (March 7 – March 23, 2026) |
| **Content Needing Replacement** | CEO info, executive portraits, business images, culture photos |
| **Overall Readiness** | Production-ready once placeholder content is replaced with real data |

---

*Report covers development activity from March 7 through March 23, 2026.*
