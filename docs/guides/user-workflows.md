# SN HR Portal User Workflows Guide

This comprehensive guide covers all user workflows available in the SN HR Portal. The portal supports multiple user roles, each with specific features and capabilities.

## Table of Contents

1. [Overview](#overview)
2. [User Roles](#user-roles)
3. [Authentication](#authentication)
4. [Employee Workflows](#employee-workflows)
5. [Manager Workflows](#manager-workflows)
6. [Intern Workflows](#intern-workflows)
7. [HR Admin Workflows](#hr-admin-workflows)
8. [COS (Cost of Service) Workflows](#cos-workflows)
9. [AI Assistant](#ai-assistant)
10. [Common UI Components](#common-ui-components)

---

## Overview

The SN HR Portal is a centralized HR management system that provides self-service capabilities for employees, managers, interns, HR administrators, and COS approvers. The application features a responsive design that works across desktop and mobile devices.

### Key Features

- Role-based navigation and access control
- Document management (201 files)
- Onboarding and offboarding checklists
- Performance management (OKRs and KPIs)
- Payroll invoice submission and approval
- Intern hour tracking and daily reporting
- AI-powered HR assistant
- Real-time notifications

---

## User Roles

The portal supports five distinct user roles, each with specific navigation and capabilities:

| Role | Primary Functions | Navigation Items |
|------|-------------------|------------------|
| **Employee** | Self-service HR tasks, document management, performance tracking | Home, My 201 Files, Onboarding, Performance, Payroll, Information Hub, Profile |
| **Manager** | Team performance monitoring, reviews, plus all employee functions | All employee items + Team Performance |
| **Intern** | Hour tracking, daily reports | Dashboard, My Reports, Profile |
| **HR Admin** | Probation tracking, performance management, intern oversight | Probation Tracker, Performance, Intern Management |
| **COS** | Invoice approvals | Invoice Approvals |

---

## Authentication

### Login Page (`/login`)

The login page provides secure access to the portal with the following features:

**Login Form Fields:**
- Email address
- Password (with show/hide toggle)
- "Remember me for 30 days" option

**Workflow:**
1. Enter your company email address
2. Enter your password
3. Optionally check "Remember me for 30 days"
4. Click "Sign in"

**Role-Based Redirection:**
- COS users (email contains "cos") are redirected to `/cos/invoices`
- Admin/HR users (email contains "admin" or "hr") are redirected to `/probation`
- Regular employees are redirected to `/dashboard`

**Additional Options:**
- "Forgot password?" link navigates to password recovery
- "Contact IT Support" link for assistance

---

## Employee Workflows

Employees have access to comprehensive self-service features through the employee layout.

### Dashboard (`/dashboard`)

The dashboard serves as the central hub displaying personalized information.

**Dashboard Components:**

1. **Welcome Header**
   - Personalized greeting with user's name
   - Quick access button to "View My Files"

2. **Progress Cards Row**
   - **Onboarding Progress**: Visual progress bar showing completion percentage with link to full checklist
   - **Probation Status**: Current stage (1-4), status badge (On Track/At Risk), days remaining
   - **Upcoming Events**: List of scheduled events with dates

3. **Quick Actions**
   - Upload Documents (shows pending count)
   - Complete Checklist (shows remaining tasks)
   - Submit Invoice (shows due date)

4. **Latest Announcements**
   - Recent company announcements with category badges
   - "View All" link to Information Hub
   - "Read" button for each announcement

### My 201 Files (`/files`)

Document management interface for employment records.

**Features:**

1. **Document Completion Overview**
   - Visual progress bar showing approval percentage
   - Legend showing document status counts (Approved, Pending, Missing, Rejected)

2. **Search and Filter**
   - Search documents by name
   - Filter button for advanced filtering

3. **Document Grid**
   - Each document displays:
     - Document name and category
     - Status badge (Approved, Pending Review, Not Uploaded, Rejected)
     - Upload date (if applicable)
     - Action menu (View, Download, Upload/Replace)

4. **Upload Dialog**
   - Drag-and-drop file upload
   - Supported formats: PDF, JPG, PNG (max 10MB)
   - Cancel/Upload buttons

**Document Categories:**
- Identity (Government ID, Birth Certificate)
- Clearances (NBI Clearance)
- Government (SSS E1, PhilHealth MDR, Pag-IBIG MID, TIN)
- Education (Diploma/TOR)

### Onboarding (`/onboarding`)

Track and complete onboarding tasks across multiple categories.

**Features:**

1. **Overall Progress Card**
   - Visual progress bar with percentage
   - Task completion count
   - "Onboarding Complete!" badge when finished

2. **Tab Navigation**
   - Onboarding tab (default)
   - Offboarding tab (for separation process)

3. **Expandable Category Sections**
   Each category shows:
   - Category icon and title
   - Completion count (X of Y completed)
   - Progress bar
   - Expand/collapse toggle

**Onboarding Categories:**
- **Document Submission**: ID uploads, clearances, government documents
- **HR Requirements**: Employee forms, contract signing, orientation
- **IT Setup**: Email, software installation, security training
- **Training & Development**: Culture training, mentor meetings

**Offboarding Categories:**
- **Clearance Process**: Equipment return, financial obligations
- **IT Clearance**: File backup, credential handover

**Task Item Display:**
- Checkbox icon (completed/pending)
- Task title and description
- Due date (if applicable, shown with warning icon)
- "Complete" button for pending tasks

### Payroll (`/payroll`)

Submit and track invoice submissions.

**Features:**

1. **Stats Cards Row**
   - Total Invoices count
   - Approved count
   - Pending count
   - Total Approved Amount (PHP currency)

2. **Submit Invoice Button**
   Opens submission dialog with:
   - Pay period dropdown
   - Invoice amount input
   - Document upload area
   - Optional notes field

3. **Submission History Table**
   - Invoice number
   - Period
   - Amount
   - Status badge
   - Submission date
   - View/Download actions

4. **Invoice Detail Dialog**
   - Full invoice details
   - Reviewer notes (for rejected invoices)
   - Download button

### Information Hub (`/announcements`)

Stay updated with company news and track personal growth.

**Features:**

1. **Tab Navigation**
   - Announcements tab
   - My Growth tab

2. **Announcements Tab**
   - Category filter buttons (All, HR Updates, Benefits, Events, Performance, Training)
   - Announcement cards showing:
     - Category badge
     - "New" badge (if recent)
     - Title and content preview
     - Posted date
     - Click to view details

3. **My Growth Tab**
   - **Stats Cards**: Completed courses, In Progress items, Learning Hours
   - **Learning & Development List**:
     - Course/goal cards with progress bars
     - Completion status badges
     - Due dates
     - View details button

### Profile (`/profile`)

Manage personal information and account security.

**Features:**

1. **Profile Header Card**
   - Avatar with edit button
   - Name and position
   - Department badge
   - Employee ID badge
   - "Edit Profile" toggle button

2. **Tab Navigation**
   - Personal Info
   - Emergency Contact
   - Security

3. **Personal Info Tab**
   - First/Last Name
   - Email (read-only, contact IT to change)
   - Phone Number
   - Date of Birth
   - Gender dropdown
   - Address

4. **Emergency Contact Tab**
   - Contact Name
   - Relationship
   - Phone Number
   - Email
   - Address

5. **Security Tab**
   - Change Password form
   - Two-Factor Authentication setup
   - Active Sessions management

**Edit Mode:**
- Toggle "Edit Profile" to enable/disable field editing
- Save Changes/Cancel buttons appear in edit mode

### Performance (`/performance`)

Track objectives, KPIs, and performance reviews.

**Features:**

1. **Current Cycle Banner**
   - Cycle name and date range
   - Active Cycle badge
   - Days until self-assessment warning

2. **Progress Summary**
   - OKR Progress gauge
   - KPI Score gauge
   - Review Status badge

3. **Upcoming Deadlines Card**
   - Self-Assessment deadline
   - Manager Review deadline
   - Days remaining badges

4. **Quick Action Cards**
   - **OKRs Card**: Objective count, key results count, progress bar, link to `/performance/okrs`
   - **KPIs Card**: KPI count, average score, progress bar, link to `/performance/kpis`
   - **Self-Assessment Card**: Review status, "Start Review" button, link to `/performance/review`

5. **Recent OKR Updates**
   - Latest objectives with progress bars
   - "View All" link

---

## Manager Workflows

Managers have access to all employee features plus team management capabilities.

### Team Performance (`/manager/team-performance`)

Monitor and manage team performance metrics.

**Features:**

1. **Header with Action Button**
   - "Pending Reviews (X)" button links to review queue

2. **Stats Cards Row**
   - Team Size
   - Pending Reviews count
   - Average OKR Progress percentage
   - Average KPI Score percentage

3. **Team Progress Overview**
   - Large OKR Progress gauge
   - Large KPI Score gauge

4. **Search and Filter**
   - Search by name or position
   - Filter dropdown (All Status, Pending Self-Assessment, Pending My Review, Completed)

5. **Team Members Table**
   - Member avatar, name, position
   - OKR Progress bar with percentage and warning icon if below 60%
   - KPI Score bar with percentage
   - Review Status badge
   - Actions: "Review" button (if pending manager review) or "View" button

6. **Action Required Alert**
   - Warning card when reviews are pending
   - "Complete Reviews" button

### Pending Reviews (`/manager/reviews`)

Queue of team members awaiting manager review.

**Workflow:**
1. View list of pending reviews
2. Select team member to review
3. Rate OKRs and KPIs
4. Provide overall rating and feedback
5. Submit review

---

## Intern Workflows

Interns have a specialized interface focused on hour tracking and daily reporting.

### Intern Dashboard (`/intern/dashboard`)

Central hub for intern activities.

**Features:**

1. **Profile Card**
   - Avatar with graduation cap icon
   - Name, program, school
   - Department and supervisor
   - Status badges (Active, Days Remaining)

2. **Personal Stats Cards**
   - Completed Hours
   - Required Hours
   - Reports Submitted
   - Days Remaining

3. **Hours Progress Card**
   - Visual progress gauge
   - Start/End date display
   - Hours logged vs required

4. **Today's Status Card**
   - Shows if EOD report submitted (green) or pending (yellow)
   - "Submit Now" button if no report submitted
   - Internship period timeline progress bar

5. **EOD Report Form** (when submitting)
   - Tasks Completed (required text area)
   - Hours Logged (required number input)
   - Key Learnings (optional)
   - Challenges Faced (optional)
   - Submit/Cancel buttons

6. **Recent Reports List**
   - Date and status badge
   - Hours logged
   - Preview of tasks completed
   - "View All" link to full reports

### My Reports (`/intern/reports`)

View and manage all daily report submissions.

**Features:**
- Complete report history
- Filter by date range
- View supervisor feedback
- Report status tracking

---

## HR Admin Workflows

HR administrators have access to organization-wide management features.

### Probation Tracker (`/probation`)

Monitor and manage employee probation periods.

**Features:**

1. **Stats Cards Row**
   - Total Employees count
   - On Track count (green)
   - At Risk count (red)
   - Completed count

2. **Search and Filter**
   - Search by name or email
   - Status filter (All, On Track, At Risk, Extended, Completed)
   - Department filter

3. **Employee Table**
   - Employee avatar, name, position
   - Department
   - Stage indicator (visual 4-stage progress)
   - Status badge
   - Documents progress bar (X/Y)
   - View button
   - Days remaining
   - Actions menu (View Appraisal, Add Note, Advance Stage)

4. **Performance Appraisal Modal**
   When clicking "View" or "View Appraisal":
   - Employee info card with status
   - **OKRs Tab**: Objective cards with key results, progress bars, star rating input
   - **KPIs Tab**: KPI cards with target/actual/score, star rating input
   - **Overall Rating Tab**:
     - 5-star rating selector
     - Rating category dropdown (Exceptional, Exceeds Expectations, Meets Expectations, Needs Improvement, Unsatisfactory)
     - Feedback text area
   - Cancel/Submit Appraisal buttons

### Performance Admin (`/admin-performance`)

Manage organization-wide performance settings.

**Sub-pages:**
- **Cycles** (`/admin-performance/cycles`): Create and manage performance review cycles

### Intern Management (`/interns`)

Oversee all interns across the organization.

**Features:**

1. **Header Actions**
   - "Export Report" button
   - "Add Intern" button

2. **Summary Cards**
   - Total Interns
   - Active Interns
   - Completed Interns
   - Average Progress
   - Total Hours Logged
   - Pending Reports

3. **Filters Card**
   - Search by name, email, or program
   - Status filter (Active, Completed, Terminated, On Hold)
   - School filter
   - Supervisor filter
   - Active filter indicator with "Clear All Filters" button

4. **View Toggle**
   - Grid view (card layout)
   - List view (row layout)

5. **Intern Display**
   - Intern cards/rows showing:
     - Name, school, program
     - Department, supervisor
     - Hours progress bar
     - Status badge
     - Last report date
     - Pending reports count
     - View action

6. **Pending Reports Alert**
   - Warning card when reports need review
   - Guidance message for timely feedback

### Intern Detail (`/interns/[id]`)

View detailed information for a specific intern.

**Features:**
- Complete intern profile
- Full report history
- Hour tracking details
- Supervisor feedback
- Status management

---

## COS Workflows

COS (Cost of Service) users handle invoice approvals for contractors.

### Invoice Approvals (`/cos/invoices`)

Review and approve/reject contractor invoices.

**Features:**

1. **Stats Cards Row**
   - Pending Review count (yellow)
   - Approved count (green)
   - Rejected count (red)
   - Total Pending Amount (PHP currency)

2. **Pending Invoices Carousel**
   - Quick review interface
   - Navigation arrows for multiple pending invoices
   - Current position indicator (X/Y)
   - Invoice details (employee info, invoice number, period, amount, submission date)
   - Quick action buttons (View Document, Approve, Reject)

3. **Tab Navigation**
   - Pending (count) tab
   - Processed (count) tab

4. **Pending Tab Table**
   - Employee avatar, name, department
   - Invoice number
   - Period
   - Amount
   - Submission date
   - Action buttons (View, Approve, Reject)

5. **Processed Tab Table**
   - Same columns as pending
   - Status badge (Approved/Rejected)
   - Reviewed date and reviewer
   - View/Download actions

6. **Review Confirmation Dialog**
   - Invoice summary
   - Notes field (required for rejection, optional for approval)
   - Cancel/Approve or Cancel/Reject buttons

7. **Invoice Detail Dialog**
   - Full employee and invoice details
   - Status badge
   - Reviewer notes (if any)
   - Document preview placeholder
   - Download PDF button
   - Approve/Reject buttons (for pending invoices)

---

## AI Assistant

The AI-powered HR Assistant is available across all user roles, providing instant help with HR-related queries.

### Accessing the Assistant

Click the floating chat button (message icon) in the bottom-left corner of any page.

### Features

1. **Chat Panel**
   - Expandable/collapsible window
   - Minimize/maximize button
   - Close button

2. **Conversation Interface**
   - Message bubbles with timestamps
   - User messages (right-aligned, primary color)
   - Assistant messages (left-aligned, muted background)
   - Loading indicator while processing

3. **Input Area**
   - Text input field
   - Send button
   - Enter key to submit
   - Disclaimer about AI accuracy

### Supported Topics

The AI Assistant can help with:
- Leave requests and balances
- Document submissions (201 files)
- Payroll and invoice questions
- Onboarding tasks
- Benefits information
- Company policies and procedures

### Example Interactions

**Leave/Vacation queries:**
```
User: "How do I request leave?"
Assistant: Provides steps for submitting time-off requests
```

**Document queries:**
```
User: "How do I upload my NBI clearance?"
Assistant: Guides to My 201 Files section with upload instructions
```

**Payroll queries:**
```
User: "When is my invoice due?"
Assistant: Explains invoice submission process
```

---

## Common UI Components

### Header

Present on all authenticated pages, the header includes:
- Mobile menu toggle (hamburger icon, mobile only)
- Notifications bell with unread count badge
- User dropdown menu:
  - User name and email display
  - Role badge
  - Profile link
  - Settings link (if available)
  - Logout option

### Sidebar

Role-based navigation with:
- Logo/branding area
- Navigation items with icons
- Active state highlighting
- Collapse/expand toggle
- Version number in footer

**Collapse Behavior:**
- Collapsed mode shows icons only with tooltips
- Toggle button on sidebar edge

### Responsive Design

The application adapts to different screen sizes:

**Desktop (1024px+):**
- Full sidebar visible
- Multi-column layouts
- Expanded card grids

**Tablet (768px-1023px):**
- Sidebar visible
- Adjusted grid layouts
- Some elements stacked

**Mobile (<768px):**
- Sidebar hidden (overlay on menu toggle)
- Single column layouts
- Stacked cards
- Touch-optimized buttons

### Status Badges

Consistent badge styling across the application:

| Status | Color | Usage |
|--------|-------|-------|
| Approved/Success/On Track | Green | Completed items, successful states |
| Pending/Warning | Yellow/Amber | Awaiting action, attention needed |
| Error/Rejected/At Risk | Red | Failed states, critical issues |
| Secondary/Neutral | Gray | Informational, inactive states |

### Progress Indicators

- **Progress Bars**: Horizontal bars showing completion percentage
- **Progress Gauges**: Circular indicators for scores/progress
- **Stage Indicators**: Multi-step visual progress (e.g., probation stages)

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Enter | Submit forms, send chat messages |
| Escape | Close dialogs/modals |

---

## Browser Support

The SN HR Portal supports modern browsers:
- Google Chrome (recommended)
- Mozilla Firefox
- Microsoft Edge
- Safari

---

## Getting Help

If you encounter issues or have questions:

1. **AI Assistant**: Click the chat button for instant help
2. **IT Support**: Contact via email link on login page
3. **HR Team**: For confidential or complex matters
4. **Information Hub**: Check announcements for updates

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024 | Initial release with core features |

---

*This documentation was created for the SN HR Portal. For technical documentation, please refer to the developer guides in the `docs/` directory.*
