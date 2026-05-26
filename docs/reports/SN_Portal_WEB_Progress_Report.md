# Control Hub — HR Portal Progress Report

> **Report Date:** March 26, 2026
> **Project:** Control Hub HR Portal — Internal HR & Employee Management System
> **Development Period:** January 31 – March 26, 2026 (~8 weeks)
> **Tagline:** "Where Policy Meets Productivity"
> **Developer:** Ceferino, Senior AI Intern

---

## Executive Summary

Control Hub is the company's internal HR portal — a web-based system where employees, interns, HR staff, and executives can manage day-to-day HR operations in one place. Think of it as the company's digital HR office.

Development started on **January 31, 2026** and has reached approximately **95% completion** as of March 26. The portal includes **90 fully built screens**, covers **23 functional areas** (tasks, reports, performance reviews, announcements, etc.), and serves **four types of users** — each seeing only what's relevant to their role.

**Current Status:** Nearly production-ready. All major features are built and working. Remaining items include connecting email notifications to all workflows, expanding automated testing, and building the mobile app.

---

## Who Uses the Portal (and What They See)

The portal shows different screens and capabilities depending on who is logged in:

### Employees
The largest user group. After logging in, employees can:
- View a **personalized dashboard** with stats, milestones, and company announcements
- Manage their **profile** and **201 file** (personal employment records)
- Track and complete assigned **tasks** (list view or drag-and-drop board)
- Submit and track **reports** with approval workflows
- View their **performance** — goals (OKRs), key metrics (KPIs), and evaluations
- Read and star **company announcements**
- Browse and bookmark **company resources** (policies, guides, documents)
- Search the **employee directory** and export it
- Submit **leave requests** and view a shared **calendar**
- Submit **invoices** with multi-currency support
- Chat with the **AI assistant** to ask HR policy questions
- Receive **notifications** with direct links to relevant items
- View their work **activity log**

### Interns
A streamlined experience focused on onboarding:
- **Intern dashboard** with status and progress
- **Daily log** entries (save as draft, then submit)
- **Task list** with ability to pick up available tasks
- **Profile** management
- **Onboarding setup flow** — a step-by-step guide for first-time setup
- Access to relevant **company resources**

### Admins (HR, Chief of Staff, CEO)
Full management capabilities on top of the employee view:
- **Admin dashboard** with company-wide metrics
- **Employee management** — view, edit, and manage all employee records
- **Intern management** — track intern progress and daily logs
- **Onboarding viewer** — monitor new employee onboarding status
- **Task management** — assign and track tasks across the organization
- **Report management** — review, approve, or return submitted reports
- **Performance cycles** — create review periods, manage evaluations with advanced filters
- **Announcements** — create, target (by role or department), track who has read them, view analytics, and archive old ones
- **Resources** — organize by category, set access levels, archive outdated items
- **Job postings** — create, edit, archive, and restore positions
- **Invoice management** — review submissions, manage exchange rates
- **Probation tracking** — monitor employees on probation
- **Audit logs** — view a full trail of who did what and when

### Super Admins
The highest level of access, for system-wide oversight:
- **Super admin dashboard** with top-level company data
- **Payroll** — international payment processing via Wise
- **AI Knowledge Base** — manage the documents the AI assistant learns from, including version history
- **User management** — create accounts, change roles, deactivate users
- **System-wide audit logs** — complete activity history across all users
- **System health monitoring** — check if all services are running properly
- **Settings** — system-wide configuration

---

## What the Portal Can Do — Feature Overview

### 1. Task Management
Employees receive tasks from admins and can also pick up available ones. Tasks can be viewed as a **list** or as a **drag-and-drop Kanban board** (To Do → In Progress → Done). Each task supports:
- Comments and discussion threads
- File attachments as **proof of completion**
- Tags and categories for organization
- Priority levels and due dates

### 2. Reports
A structured system for submitting and approving reports:
- Reports can have **parent-child relationships** (e.g., a weekly report containing daily sub-reports)
- Employees **submit** → Admins **review and approve** (or return with feedback)
- Built-in **analytics** showing submission trends and completion rates

### 3. Performance Management
A full performance review system:
- **OKRs** (Objectives and Key Results) — set goals and track progress, which updates automatically
- **KPIs** (Key Performance Indicators) — measurable metrics with rating scales
- **Review cycles** — admins create evaluation periods; employees complete self-reviews
- **Team performance views** for managers

### 4. Announcements
Company-wide communications:
- Can be **targeted** to specific roles or departments (e.g., "All interns" or "Marketing team only")
- Tracks **who has read** each announcement
- **Analytics dashboard** showing reach and engagement
- **Email reminders** can be sent to those who haven't read important announcements
- Users can **star/bookmark** announcements for quick reference
- Admins can **archive and restore** old announcements

### 5. Resources & Knowledge Library
A centralized library of company policies, guides, templates, and documents:
- Organized into **categories** (browseable, like a folder structure)
- **Access levels** — some resources are restricted to certain roles
- Users can **bookmark** and organize into personal **collections**
- Tracks **view counts** per resource

### 6. Employee Directory
A searchable list of all employees:
- Search by **name, department, or role**
- **Export to CSV** for spreadsheet use

### 7. Notifications
A notification bell in the header that alerts users to:
- New task assignments
- Report status changes (approved, returned)
- New announcements
- Performance review deadlines
- And 7 other event types
Each notification links directly to the relevant item.

### 8. Invoices & Multi-Currency
For managing contractor and freelancer payments:
- Supports **multiple currencies** with automatic exchange rate conversion (rates updated daily)
- **Hourly billing** mode for time-based work
- Line item breakdowns

### 9. Onboarding
A guided process for new employees and interns:
- **Step-by-step wizard** walking through profile completion, document uploads, and checklist items
- **Progress tracking** visible to both the employee and their admin
- **Document submission** and approval workflow

### 10. AI Assistant
An intelligent chatbot that answers HR policy questions:
- Learns from company documents uploaded to the knowledge base
- Provides **cited answers** — pointing to the exact source document
- **Remembers conversation history** so users can ask follow-up questions
- Knowledge base supports **version history** so admins can see how documents changed over time

### 11. Leave Requests
Employees can request time off, view their leave balances, and track approval status.

### 12. Calendar
A shared calendar showing company events, with Google Calendar integration for syncing.

### 13. Milestones
Automatic recognition of employee milestones:
- Work anniversaries and birthdays are auto-detected
- **Banner announcements** are generated automatically
- Runs daily to check for upcoming milestones

### 14. Payroll (Super Admin)
International payroll processing:
- **Wise payment gateway** integration for cross-border transfers
- Multi-currency support with live exchange rates

### 15. Audit Trail
A detailed record of every significant action in the system:
- Who did what, when, and from where
- Covers sensitive operations (data changes, approvals, role modifications)
- Searchable and filterable by admins and super admins

---

## Weekly Progress

### Week 1 — January 31 – February 3

**What happened:** The project was created from scratch and the basic structure was established.

- Set up the overall project structure for managing multiple connected applications
- Built the initial layout — sidebar navigation and top header bar
- Connected the system to the database (Supabase)
- Created the first drafts of all major screens for employees, admins, and super admins (dashboards, profiles, tasks, reports, announcements, directory, etc.)

---

### Week 2 — February 6–11

**What happened:** The visual design system was established and the login system was built.

- Created the **"Titanium & Indigo"** design system (the original look and feel — later replaced with Navy & Gold)
- Built the **login and authentication system** — secure sign-in with session management
- Set up the reports dashboard and AI knowledge base screens
- Established form validation rules so users see helpful error messages when filling out forms
- Started writing automated tests

---

### Week 3 — February 15–18

**What happened:** The security and permissions system was built, ensuring each user only sees what they should.

- Implemented **role-based access control** — the system now checks every user's role before showing any page or data
- Set up **automated quality checks** that run every time code is submitted (catches errors before they reach users)
- Built the **offboarding** workflow for when employees leave the company
- Added **real-time updates** — when something changes (e.g., a new task is assigned), it appears instantly without refreshing
- Built the **announcements system** with ability to target specific groups
- Set up admin pages for performance reviews, reports management, and onboarding oversight
- Built the **probation tracking** system for HR to monitor new hires

---

### Week 4 — February 24

**What happened:** Code cleanup and stabilization before a major push.

- Consolidated all accumulated improvements
- Prepared the codebase for the upcoming feature sprint

---

### Week 5 — February 27–28

**What happened:** The biggest sprint of the project — virtually every feature area was built out completely in two days.

- **Dashboard** redesigned with a modern card-based layout showing role-specific stats
- **Notifications system** — bell icon, notification center, 11 types of alerts, click to navigate directly to the relevant item
- **Resources library** — categories, search, access levels
- **Reports** — full submission and approval workflow, parent-child report grouping
- **Performance** — OKRs, KPIs, review cycles, evaluations
- **Tasks** — Kanban board view, comments, tags, task detail pages
- **AI Knowledge Base** — document management, version history, chat interface
- **Announcements** — publishing, analytics, read tracking
- **Employee Directory** — search and filtering
- **Invoices** — multi-currency with exchange rate support
- **Onboarding** — guided setup flow
- **Milestones** — employee milestone tracking
- **Profile management** — for all four user types
- **Tour system** — guided walkthrough for first-time users
- **Dark mode** — full support across all pages

---

### Week 6 — March 7–9

**What happened:** User experience improvements across the board.

- Connected **dashboards to real data** — stats now come from the actual database instead of sample numbers
- Added **success/error messages** ("toast" notifications) throughout the entire portal — every action now gives clear feedback (e.g., "Task created successfully" or "Error: Please fill in all required fields")
- Improved sorting, filtering, and data display on tables throughout the portal
- Refined the onboarding viewer for admins
- Fixed various navigation and layout issues across all role sections

---

### Week 7 — March 15

**What happened:** The largest single-day feature push — new modules and significant enhancements.

- Built the **Calendar** with Google Calendar sync
- Built the **Leave Request** system
- Added **hourly billing** mode to invoices
- Added **self-assign** for tasks (employees can pick up available work)
- Completed the **document management** system
- Added **error recovery pages** so the portal handles unexpected issues gracefully instead of showing a blank screen
- Built **Job Postings management** for admins to create and manage career openings
- Added **onboarding progress stepper** — a visual progress bar showing completion status
- Fixed all broken navigation links
- Added **CSV export** for the employee directory
- Added **announcement email reminders** — HR can remind people who haven't read important announcements
- Upgraded the **AI assistant** — migrated to a more capable model, added document source citations, and conversation memory
- Added the ability to import company documents directly from **Google Drive** into the AI knowledge base

---

### Week 8 — March 17–19

**What happened:** Complete visual rebrand and security hardening.

- **Visual rebrand** — changed the entire portal's look from "Titanium & Indigo" (gray/purple) to **"Navy & Gold"** (deep navy blue and warm gold). Changed fonts to Source Sans 3 and Lexend for a more polished appearance. Applied across every single page.
- Built the **CompanyPulse widget** — a dashboard component showing real-time company health metrics
- Built the **Milestones system** — automatic birthday and anniversary announcements, running on a daily schedule
- Added **activity logs** and **audit trail** screens
- **Secured all data endpoints** — every request is now verified for proper authentication and permissions
- Added **help links** and **tooltip explanations** throughout the portal to guide users
- Set up the **email delivery system** for transactional emails
- Added intern **draft/submit workflow** — interns can save daily log entries as drafts before formally submitting

---

### Week 9 — March 21–23

**What happened:** Advanced features and polish.

- **Performance ratings** — added rating scales for KPIs and measurement scales for OKRs
- **Task proof system** — employees can attach files as evidence of task completion
- **Announcement starring** — users can bookmark important announcements for quick access
- Expanded the **audit trail** to track more types of actions
- Improved the **employee dashboard** layout and design
- Fixed pagination across several list views
- Refined the CompanyPulse widget visual theme

---

### Week 10 — March 26

**What happened:** Payment integration, data lifecycle management, and visual polish.

- Integrated **Wise payment gateway** for international payroll transfers
- Added **archive and restore** capability for announcements, job postings, and resources — items can be archived (hidden but not deleted) and restored later if needed
- **Standardized the color palette** across all pages for a consistent look and feel
- **Overhauled the admin performance page** with advanced multi-select filters for viewing employee evaluations
- Polished admin, employee, and login pages

---

## Visual Identity — Navy & Gold

The portal follows a consistent **Navy & Gold** design theme (applied March 17):

| Element | Description |
|---------|-------------|
| **Primary Color** | Deep Navy Blue — used for the sidebar, headers, and key UI elements |
| **Accent Color** | Warm Gold — used for buttons, action items, and highlights |
| **Body Font** | Source Sans 3 — clean, legible font for all body text |
| **Heading Font** | Lexend — bold, modern font for titles and section headers |
| **Dark Mode** | Fully supported — users can switch between light and dark themes |
| **Layout** | Fixed sidebar on the left, header at the top, scrollable content area |

---

## Automated Background Processes

The portal includes **8 automated tasks** that run without human intervention:

| Process | How Often | What It Does |
|---------|-----------|--------------|
| New Employee Onboarding | When triggered | Automatically creates an onboarding profile when a new employee is added |
| Probation Check | Daily | Checks probation periods and notifies managers of upcoming expirations |
| Exchange Rate Update | Daily | Refreshes currency conversion rates for multi-currency invoices |
| AI Document Processing | When triggered | Processes newly uploaded documents so the AI assistant can answer questions about them |
| Late Report Check | Weekly | Identifies overdue reports and sends notifications to the responsible employees |
| Milestone Announcements | Daily | Detects upcoming birthdays and work anniversaries and creates announcements |
| Offboarding Process | When triggered | Initiates the exit workflow when an employee leaves the company |
| Recording Transcription | When triggered | Converts audio recordings to text (partially implemented) |

---

## Security & Access Control

| Feature | What It Means |
|---------|---------------|
| **Role-based access** | Each user role (employee, intern, admin, super admin) can only see and do what they're authorized for |
| **Secure login** | Industry-standard authentication with encrypted sessions stored in secure cookies |
| **Page protection** | Users are automatically redirected to the login page if they try to access pages they shouldn't see |
| **Data-level security** | Even at the database level, each user can only query their own authorized data (70+ security rules) |
| **Verified requests** | Every action (create, update, delete) verifies the user's identity and permissions before proceeding |
| **Audit trail** | Sensitive operations (role changes, data modifications, approvals) are logged with who, what, and when |

---

## Known Items to Improve

Based on a quality review conducted March 7, 2026:

### Must Fix (Critical)
- Some **side panels** (used for editing records) are too narrow for forms with many fields — makes them hard to use
- Forms need better **width options** depending on complexity

### Should Fix (High Priority)
- **Mobile/tablet experience** — the portal is designed for desktop screens; the sidebar and data tables don't adapt well to smaller screens
- **Accessibility** — some interactive elements need better support for screen readers and keyboard-only navigation

### Partially Addressed (Medium Priority)
- ✅ Success/error messages standardized across all user roles
- ✅ Navy & Gold rebrand applied consistently everywhere
- ✅ Color palette unified across all pages (completed March 26)
- Remaining: Minor visual inconsistencies (icon sizes, spacing) between some pages

---

## What's Still Left to Do

| Item | Importance | Details |
|------|------------|---------|
| **Email notifications for all events** | High | The email system is set up, but not all events trigger emails yet (e.g., task assignments, report approvals) |
| **Automated testing** | High | The testing framework is in place; needs more tests written to catch bugs before they reach users |
| **Complete form validation** | Medium | Some forms have thorough validation; others need the same level of input checking |
| **Mobile app** | Low | A mobile app wrapper exists but isn't functional; the web portal works on mobile browsers in the meantime |
| **Standup transcription** | Low | The infrastructure exists but the audio-to-text pipeline isn't fully connected |

---

## Summary

| Item | Status |
|------|--------|
| **Total Screens** | 90 — all built and functional |
| **Feature Areas** | 23 — tasks, reports, performance, announcements, resources, notifications, invoices, onboarding, AI chat, calendar, leave, directory, milestones, payroll, jobs, documents, probation, internships, activity logs, audit trail, dashboard, profile, settings |
| **User Roles** | 4 — Employee, Intern, Admin, Super Admin |
| **Automated Background Tasks** | 8 — running on daily/weekly schedules or triggered by events |
| **Database Tables** | 30+ — with 70+ security rules ensuring proper data access |
| **Visual Identity** | Navy & Gold — consistent across all pages with dark mode support |
| **Security** | Role-based access control, encrypted sessions, audit logging, data-level protection |
| **International Support** | Multi-currency invoices with daily exchange rate updates, Wise payment gateway |
| **AI Assistant** | Working — answers HR questions from uploaded company documents with source citations |
| **Development Duration** | ~8 weeks (January 31 – March 26, 2026) |
| **Overall Completion** | ~95% |

---

## Development Activity Over Time

| Week | Date Range | Summary |
|------|-----------|---------|
| 1 | Jan 31 – Feb 3 | Project setup, initial screen layouts |
| 2 | Feb 6 – Feb 11 | Design system, login system, form validation |
| 3 | Feb 15 – Feb 18 | Role-based security, automated quality checks, real-time updates |
| 4 | Feb 24 | Cleanup and stabilization |
| 5 | Feb 27 – Feb 28 | **Major sprint** — all 23 feature areas fully built |
| 6 | Mar 7 – Mar 9 | Connected real data, added user feedback messages everywhere |
| 7 | Mar 15 | Calendar, leave requests, AI upgrade, Google Drive import, CSV export |
| 8 | Mar 17 – Mar 19 | Navy & Gold rebrand, security hardening, email setup |
| 9 | Mar 21 – Mar 23 | Performance ratings, task proofs, announcement bookmarks |
| 10 | Mar 26 | Wise payments, archive/restore, visual polish |

---

*Report covers development activity from January 31 through March 26, 2026.*
