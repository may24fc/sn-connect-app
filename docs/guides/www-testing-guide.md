# SN International Website — User Testing Guide

**Date:** March 2026 | **Version:** 1.0 | **Developer:** Ceferino Jumao-as V

Welcome! This guide helps you explore and test the SN International public website. This is the company's marketing and recruitment site — no login is required. Just follow the steps below.

---

## Site Navigation

The header is fixed at the top of every page. On desktop, you'll see these navigation links:

| Link | Page |
|------|------|
| Home | `/` |
| About | `/about` |
| Our Businesses | `/businesses` (with mega menu dropdown) |
| Team | `/team` |
| Careers | `/careers` |
| Life at SN | `/life-at-sn` |
| Contact | `/contact` |
| Log in | Redirects to HR Portal login |

**Mobile:** On smaller screens, the navigation collapses into a hamburger menu (☰) icon. Tap it to open the mobile menu overlay.

---

## Pages to Test

### Home (`/`)
- The hero section should display with proper spacing and branding
- A scrolling marquee banner shows a "What's New" message
- Business unit cards are displayed — click any card to navigate to that business unit's detail page (`/businesses/[slug]`)
- The page should be fully responsive (try resizing your browser)

### About (`/about`)
1. Check the **Mission & Vision** section for proper formatting
2. Read the **CEO Message** card — it should include a greeting and photo
3. Scroll down to the **Company Timeline** — verify dates and milestones render correctly
4. Stats (team count, established year, etc.) should display

### Our Businesses (`/businesses`)
1. Hover over **Our Businesses** in the nav — a mega menu dropdown should appear showing all 4 business units with taglines
2. Click **Our Businesses** to go to the portfolio overview page
3. Toggle between **Grid** and **List** views using the icons
4. Click any business card to open its detail page

#### Business Detail Pages (`/businesses/[slug]`)
Each business unit has its own detail page:
- **SeaFood Outlet** → `/businesses/sfo`
- **Ultimate Health Project** → `/businesses/uhp`
- **24 Fit Club** → `/businesses/24-fit-club`
- **SN Construction** → `/businesses/sn-construction`

On each detail page, verify:
1. Hero image and business name/tagline load correctly
2. Business stats display (employees, locations, etc.)
3. **Services grid** shows 4 service cards
4. **Testimonials** section renders customer quotes
5. **Inquiry form** is present — fill in Name, Email, Phone, Subject, and Message, then submit
6. "Back to businesses" link navigates back to `/businesses`

### Team (`/team`)
1. **Executive Portraits** — verify C-suite member photos, names, and titles display
2. **Management Team** grid — check that team member cards render properly
3. **Team Stats** — numbers should animate (count up) when scrolled into view
4. **Open Positions Teaser** — shows a count of open roles and links to Careers

### Careers (`/careers`)
1. Browse the **"Why Join Us"** carousel — swipe or arrow through the slides
2. **Job Listings** section displays open positions (fetched from the database, or placeholder data if none exist)
3. Click a job listing to open its detail page (`/careers/[id]`)
4. Click **Apply Now** to test the application form (see [Application Form](#application-form) below)

#### Job Detail Page (`/careers/[id]`)
- Verify: job title, location, employment type, description, responsibilities, and qualifications
- An **Apply** button should open or scroll to the application form

#### Application Form
This is a **4-step form**:
1. **Step 1 — Personal Info:** Enter Name, Email, Phone
2. **Step 2 — Position & Resume:** Select a job from the dropdown, upload a resume file (PDF, DOC, or DOCX, max 5 MB)
3. **Step 3 — Cover Letter:** Type or paste a cover letter
4. **Step 4 — Review:** Review your info, then click **Submit**

**What to check:**
- Navigation between steps (Next / Previous buttons)
- Validation errors appear if required fields are empty
- File upload only accepts PDF/DOC/DOCX and rejects files over 5 MB
- On success, a green checkmark and confirmation message appear
- The form resets back to step 1 after submission

### Life at SN (`/life-at-sn`)
1. Browse the **Culture Values** section (mission, vision, values cards)
2. Scroll through the **Photo Masonry Grid** — photos should load in a staggered layout
3. Read **Employee Spotlights** — profile images, quotes, and stories
4. Click any photo to open its detail page (`/life-at-sn/[slug]`)

#### Photo Detail Page (`/life-at-sn/[slug]`)
- Verify: category tag, caption, and description display
- **Previous / Next** navigation buttons should work between photos
- "View All" link should go back to `/life-at-sn`
- "Apply" call-to-action should link to `/careers`

### Contact (`/contact`)
1. Review the **Business Unit Contact Cards** — each shows contact info for a specific unit
2. The **Google Map** embed should display the office location
3. Fill out the **Contact Form**:
   - Enter Name, Email, Phone (optional), select a Business Unit, type a Subject and Message
   - Click **Submit**
   - A green success message should appear ("We'll get back to you within 24–48 hours")
4. Try submitting with empty required fields — validation errors should appear

### Portal (`/portal`)
1. This page promotes the HR Portal with **6 feature cards** (pay slips, reports, tasks, reviews, directory, 201 files)
2. Verify all cards display with icons and descriptions
3. The **Login / Sign Up** call-to-action buttons should redirect to the HR Portal
4. Check if a **FAQ section** is present and expandable

### Privacy Policy (`/privacy`)
- Legal text should render without formatting issues
- Verify the page is scrollable and readable

### Terms of Service (`/terms`)
- Legal text should render without formatting issues
- Verify the page is scrollable and readable

---

## Forms Summary

The site has 3 forms that submit data to the backend:

| Form | Page | Endpoint | Key Fields |
|------|------|----------|------------|
| Contact Form | `/contact` | `POST /api/inquiries` | Name, Email, Phone, Business Unit, Subject, Message |
| Application Form | `/careers` | `POST /api/applications` | Name, Email, Phone, Job, Resume (file), Cover Letter |
| Inquiry Form | `/businesses/[slug]` | `POST /api/inquiries` | Name, Email, Phone, Subject, Message |

---

## What to Look For While Testing

| What | What to Check |
|------|--------------|
| **Navigation** | Do all header/footer links go to the correct pages? |
| **Mega Menu** | Does hovering "Our Businesses" show the dropdown? (Desktop only) |
| **Mobile Menu** | Does the hamburger icon open the mobile nav? Do links work? |
| **Scroll Behavior** | Does the header add a shadow when scrolled? Does "Back to Top" appear in the footer? |
| **Images** | Do all photos and business images load correctly? |
| **Animations** | Do scroll-reveal animations play smoothly? Does the marquee loop? Do team stats count up? |
| **Forms** | Do forms validate, submit, and show success/error messages? |
| **File Upload** | Does the resume upload accept only PDF/DOC/DOCX under 5 MB? |
| **Responsive Design** | Does the layout adapt properly on mobile, tablet, and desktop? |
| **Footer** | Are business unit links, quick links, and contact info correct? Does the newsletter email input work? |
| **External Links** | Do social media icons (Facebook, LinkedIn, Instagram) open the correct profiles? |
| **Login Redirect** | Does "Log in" in the header redirect to the HR Portal login page? |

---

## Known Limitations

| Feature | Status |
|---------|--------|
| Newsletter subscription | UI captures email but no backend delivery system |
| Google Map embed | May require an API key to display correctly |
| Job listings | Falls back to placeholder data if no jobs exist in the database |
| Team member photos | Uses placeholder images if no avatar URLs in the database |
| Social media links | May point to placeholder URLs |
| SN Construction business unit | Content is placeholder only |

---

Thank you for helping test the SN International website! Your feedback makes the product better.
