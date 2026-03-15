# SN HR Portal User Workflows Guide

This comprehensive guide covers all user workflows available in the SN HR Portal. The portal supports multiple user roles, each with specific features and capabilities.

## Table of Contents

1. [Overview](#overview)
2. [User Roles](#user-roles)
3. [Authentication](#authentication)
4. [Employee Workflows](#employee-workflows)
5. [Manager Workflows](#manager-workflows)
6. [Intern Workflows](#intern-workflows)
7. [Admin (HR) Workflows](#admin-hr-workflows)
8. [Super Admin Workflows](#super-admin-workflows)
9. [AI Assistant](#ai-assistant)
10. [Common UI Components](#common-ui-components)

---

## Overview

The SN HR Portal is a centralized HR management system that provides self-service capabilities for employees, managers, interns, HR administrators, and super administrators. The application features a responsive design that works across desktop and mobile devices.

### Key Features

- Role-based navigation and access control
- Document management (201 files)
- Onboarding and offboarding checklists
- Performance management (OKRs and KPIs)
- Payroll invoice submission and approval
- Task assignment and tracking
- Weekly report submissions and analytics
- AI Knowledge Base management
- System health monitoring (Super Admin)
- AI-powered HR assistant
- Real-time notifications

---

## User Roles

The portal supports four distinct user roles, each with specific navigation and capabilities:

| Role | Primary Functions | Navigation Items |
|------|-------------------|------------------|
| **Employee** | Self-service HR tasks, document management, performance tracking, reports | Dashboard, Profile, Tasks, Performance Reviews, Reports, Invoice, Documents, Information Hub |
| **Intern** | Task tracking, document management, performance | Dashboard, Profile, Tasks, Performance Reviews, Documents, Information Hub |
| **Admin (HR)** | HR administration, performance management, intern oversight, reporting analytics | Dashboard, Directory, Employee Management, Interns, Performance, Reports, Jobs, Announcements, AI Knowledge, Resources |
| **Super Admin** | Full system control, task management, payroll approvals, system monitoring | Dashboard, Directory, Employee Management, Task Management, Interns, Performance, Reports, Jobs, Announcements, AI Knowledge, Resources, Payroll Approvals |

### Manager Access

Employees with manager responsibilities have access to additional features:
- Team Performance (`/manager/team-performance`)
- Pending Reviews (`/manager/reviews`)

> **Note:** These pages are accessible only to employees flagged as managers in the database.

---

## Authentication

### Login Page (`/login`)

The login page provides secure access to the portal.

**Login Form Fields:**
- Email address
- Password (with show/hide toggle)
- "Remember me for 30 days" option

**Workflow:**
1. Enter your company email address
2. Enter your password
3. Optionally check "Remember me for 30 days"
4. Click "Sign in"

**Role-Based Redirection After Login:**
| Role | Redirect Path |
|------|---------------|
| Employee | `/dashboard` |
| Intern | `/intern/dashboard` |
| Admin | `/admin/dashboard` |
| Super Admin | `/super-admin/dashboard` |

**Additional Options:**
- "Forgot password?" link navigates to password recovery (`/forgot-password`)
- "Contact IT Support" link for assistance

---

## Employee Workflows

Employees have access to comprehensive self-service features through the employee layout.

### Dashboard (`/dashboard`)

The dashboard serves as the central hub displaying personalized information.

**Dashboard Components:**

1. **Welcome Header**
   - Personalized greeting with user's name (time-based: Good morning/afternoon/evening)
   - Quick access button to "View My Files"

2. **Stats Row**
   - **Onboarding Progress**: Percentage complete with trend indicator
   - **Probation Stage**: Current stage with days remaining
   - **Tasks Due**: Count of pending tasks
   - **Notifications**: Unread notification count

3. **Quick Actions Card**
   Grid of action buttons:
   - Upload Files (links to `/files`)
   - Submit Report (links to `/reports/new`)
   - View Calendar (links to `/calendar`)

4. **Onboarding Progress Card**
   - Visual progress bar with percentage
   - Task completion status (e.g., "3 tasks remaining")
   - On Track/At Risk status badge
   - Link to view full checklist

5. **Upcoming Events Card**
   - List of scheduled events with dates and times
   - Performance Review, Team Building, Training Workshop
   - "View All" link to calendar

6. **Latest Announcements Card**
   - Recent company announcements with category badges
   - Timestamp for each announcement
   - "View All" link to Information Hub

### My Tasks (`/tasks`)

View and manage all tasks assigned to you.

**Features:**

1. **Tab Navigation**
   - All Tasks (total count)
   - Pending (pending count)
   - In Progress (in progress count)
   - Completed (completed count)
   - Blocked (blocked count)

2. **Task Filters**
   - Search by title or description
   - Filter by priority (Low, Medium, High, Urgent)
   - Filter by date range

3. **Task Cards**
   Each task displays:
   - Title and description
   - Priority badge (color-coded)
   - Status indicator
   - Due date
   - Category tag
   - Created by information
   - Quick status update buttons

**Task Statuses:**
- `pending` - Not yet started
- `in_progress` - Currently being worked on
- `completed` - Finished
- `blocked` - Waiting on dependencies

**Task Detail View (`/tasks/[id]`):**
- Full task description
- Assignee list
- Status history
- Comments and updates

### My Profile (`/profile`)

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
   Each document displays:
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

### Payroll (`/invoice`)

Submit and track invoice submissions.

> **Note:** The route is `/invoice` (not `/payroll`).

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

### Reports (`/reports`)

Track and submit your weekly activity reports.

**Features:**

1. **Header with Actions**
   - "New Report" button to create new submission

2. **KPI Cards**
   - Total Reports count
   - This Month submissions
   - Pending Drafts
   - Completion Rate percentage

3. **Insights Summary**
   - Performance summary text
   - Key findings with highlights:
     - Submission Streak
     - Engagement metrics
     - Trends analysis
   - Recommendations for improvement

4. **Filters**
   - Search reports by name
   - Status filter (All, Draft, Submitted, Reviewed)

5. **Report List**
   Each report shows:
   - Report type name
   - Week period
   - Status badge
   - Submission date
   - View/Edit/Submit actions

**New Report Creation (`/reports/new`):**
- Report type selection
- Week period picker
- Summary text area
- Accomplishments list
- Challenges faced
- Next week plans
- Metrics input (expenditure, results)
- File attachments
- Save as draft or Submit

**Report Detail View (`/reports/[id]`):**
- Full report content
- Attached files
- Review status and feedback

### Performance Reviews (`/performance`)

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

**Sub-pages:**
- OKRs (`/performance/okrs`) - Manage your objectives and key results
- KPIs (`/performance/kpis`) - Track key performance indicators
- Review (`/performance/review`) - Complete self-assessment

### Announcements / Information Hub (`/information-hub`)

Stay updated with company news and browse resources.

> **Note:** The route `/announcements` redirects to `/information-hub`.

**Features:**

1. **Tab Navigation**
   - Announcements tab
   - Resources tab

2. **Announcements Tab**
   - Category filter buttons (All, HR Updates, Benefits, Events, Performance, Training)
   - Announcement cards showing:
     - Category badge
     - "New" badge (if recent)
     - Title and content preview
     - Posted date
     - Click to view details

3. **Resources Tab**
   - Featured resources section
   - Resource grid with search and category browser
   - Bookmark resources with star/bookmark icon
   - Resource collections
   - Sub-route: `/information-hub/resources/` for detailed resource views

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
   | Column | Content |
   |--------|---------|
   | Team Member | Avatar, name, position |
   | OKR Progress | Progress bar with percentage, warning icon if below 60% |
   | KPI Score | Progress bar with percentage |
   | Review Status | Status badge |
   | Actions | "Review" button (if pending) or "View" button |

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

Interns have a specialized interface focused on task completion and development.

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

### Intern Navigation

Interns have access to:
- Profile (`/profile`)
- Dashboard (`/intern/dashboard`)
- My Tasks (`/tasks`)
- Performance Reviews (`/performance`)
- My 201 Files (`/files`)
- Information Hub (`/information-hub`)

**Intern-specific routes:**
- Daily Reports (`/intern/reports`)
- Intern Profile (`/intern/profile`)

Note: Interns do not have access to Invoice or Reports features.

---

## Admin (HR) Workflows

HR administrators have access to organization-wide management features.

### Admin Dashboard (`/admin/dashboard`)

HR overview and quick actions hub.

**Features:**

1. **Welcome Header**
   - Personalized greeting
   - "Manage Employees" quick action button

2. **Stats Row**
   - Total Employees (with monthly change)
   - Active Interns
   - Pending Leaves
   - Reviews Due

3. **Pending Approvals Card**
   - List of items requiring approval:
     - Performance Reviews
   - Priority indicators (urgent, high, medium)
   - Quick "Review" action buttons
   - "View All Approvals" link

4. **Department Overview Card**
   - Department headcount bars
   - Open positions badges
   - "Manage" link

5. **Recent Activity Card**
   - Timeline of recent HR actions:
     - New employee onboarded
     - Performance review completed
   - Timestamp for each activity

6. **Quick Actions Card**
   Grid of shortcuts:
   - Employee Management
   - Performance (Reviews & OKRs)
   - Recruitment (Open positions)
   - Reports (Analytics & insights)

### Directory (`/admin/directory`)

Organization-wide employee directory.

**Features:**
- Browse all employees across departments
- Search and filter by name, department, role, or status
- View employee profiles

### Employee Management (`/admin/employee-management`)

Manage employee records and administration.

**Features:**
- View and manage employee records
- Update employee details
- Handle employee lifecycle events

### Reports Tracking (`/admin/reports`)

Monitor staff report submissions and completion rates.

**Features:**

1. **Header Actions**
   - "Analytics" button (links to `/admin/reports/analytics`)
   - "Compare" button (links to `/admin/reports/compare`)

2. **Week Period Selector**
   - Dropdown to select week period
   - Shows last 12 weeks

3. **KPI Cards**
   - Total Staff count
   - Submitted count (with trend)
   - Pending count (color-coded by severity)
   - Completion Rate percentage

4. **Insights Summary**
   - Team reporting analysis
   - Key findings:
     - Best Performers
     - Needs Attention
     - Overall Trend
   - Recommendations

5. **Submission Rate Card**
   - Visual progress indicator
   - Submitted vs pending breakdown

6. **Submission Status List**
   - Staff submissions with status
   - "Send Reminder" action for pending
   - "View" action for submitted
   - Export button

### Reports Analytics (`/admin/reports/analytics`)

Visualize expenditure vs results with comprehensive charts.

**Features:**

1. **Filters**
   - Period selector (Last Week, Last 4 Weeks, Last Quarter, Custom)
   - Department filter

2. **KPI Cards**
   - Total Spend (PHP)
   - Total Results (PHP)
   - Average ROI percentage
   - Total Reports count

3. **Insights Summary**
   - Analytics insights text
   - Key findings with highlights
   - Recommendations

4. **Charts**
   - Expenditure vs Results over time
   - Spend by Category (pie/donut chart)
   - ROI by Department (bar chart)
   - Weekly Trends (line chart)

5. **Export Button**
   - Download analytics report

### Performance Dashboard (`/admin/performance`)

Organization-wide performance metrics and reviews.

**Features:**

1. **Header Actions**
   - "Manage Cycles" button (links to `/admin/performance/cycles`)
   - "Export Report" button

2. **Current Cycle Banner**
   - Cycle name and date range
   - Active Cycle badge

3. **Performance Summary Cards**
   - Total Employees
   - OKRs Completed/In Progress
   - KPIs On Target/Below Target
   - Reviews by status

4. **Cycle Progress Cards**
   - Self-Assessment completion
   - Manager Review completion
   - HR Review completion

5. **Charts**
   - Completion Trend over months
   - Department Performance comparison
   - Rating Distribution

6. **Employee Reviews Table**
   | Column | Content |
   |--------|---------|
   | Employee | Avatar, name, email |
   | Department | Department name |
   | Manager | Manager name |
   | OKR Progress | Progress bar with percentage |
   | KPI Score | Progress bar with percentage |
   | Review Status | Status badge |

   **Filters:**
   - Search by name or email
   - Filter by department
   - Filter by status

### Performance Cycles (`/admin/performance/cycles`)

Create and manage performance review cycles.

**Features:**
- Create new cycles
- Set cycle dates
- Activate/deactivate cycles
- View cycle history

### Probation Tracker (`/admin/probation`)

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
   | Column | Content |
   |--------|---------|
   | Employee | Avatar, name, position |
   | Department | Department name |
   | Stage | Visual 4-stage progress indicator |
   | Status | Status badge |
   | Documents | Progress bar (X/Y) |
   | Days Remaining | Days left badge |
   | Actions | View, Add Note, Advance Stage |

4. **Performance Appraisal Modal**
   When clicking "View Appraisal":
   - Employee info card with status
   - **OKRs Tab**: Objective cards with key results, progress bars, star rating input
   - **KPIs Tab**: KPI cards with target/actual/score, star rating input
   - **Overall Rating Tab**:
     - 5-star rating selector
     - Rating category dropdown (Exceptional, Exceeds Expectations, Meets Expectations, Needs Improvement, Unsatisfactory)
     - Feedback text area
   - Cancel/Submit Appraisal buttons

### Intern Management (`/admin/interns`)

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
   Each intern card/row shows:
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

### Intern Detail (`/admin/interns/[id]`)

View detailed information for a specific intern.

**Features:**
- Complete intern profile
- Full report history
- Hour tracking details
- Supervisor feedback
- Status management

### AI Knowledge Management (`/admin/ai-knowledge`)

Manage the AI assistant's knowledge base.

**Features:**
- Add new knowledge entries
- Edit existing entries
- Categorize knowledge by topic
- Enable/disable entries
- Preview AI responses

### Jobs (`/admin/jobs`)

Manage job postings and recruitment pipeline.

**Features:**
- View and manage open positions
- Track recruitment pipeline
- Post new job listings

---

## Super Admin Workflows

Super administrators have full system access plus additional control features. Super Admin routes live under the `(admin)` route group with a passthrough layout at `/super-admin/` that enforces `super_admin` role access.

### Super Admin Dashboard (`/super-admin/dashboard`)

Complete system overview and control center.

**Features:**

1. **Welcome Header**
   - Personalized greeting
   - "System Settings" quick action button

2. **Stats Row**
   - Total Users (with active count)
   - System Uptime percentage
   - Security Alerts count
   - Audit Logs count

3. **Security Alerts Card**
   - List of security events:
     - Login attempts
     - Permission changes
     - Data access events
   - Severity badges (high, medium, low)
   - Timestamp for each alert
   - "View All Alerts" link

4. **System Health Card**
   - Component status monitoring:
     - Database (uptime percentage)
     - API Services
     - Authentication
     - File Storage
   - Status badges (healthy, degraded)
   - Progress bars for uptime

5. **User Role Distribution Card**
   - Breakdown by role:
     - Employees
     - Admins
     - Interns
     - Super Admins
   - User counts and percentages
   - Progress bars

6. **Recent Audit Logs Card**
   - Timeline of system actions:
     - User account creation
     - System settings updates
     - Performance review approvals
   - Actor and details for each log
   - "View All" link

7. **Quick Actions Grid**
   - User Management
   - Role Management
   - Audit Logs
   - System Settings

### Task Management (`/super-admin/tasks`)

Create and assign tasks to team members.

**Features:**

1. **Header Actions**
   - Bulk delete button (when items selected)
   - "Create Task" button

2. **Task Summary Cards**
   - Total tasks
   - Pending count
   - In Progress count
   - Completed count
   - Overdue count

3. **Task Filters**
   - Search by title or description
   - Status filter
   - Priority filter
   - Assignee filter
   - Date range filter

4. **Task List Table**
   | Column | Content |
   |--------|---------|
   | Select | Checkbox for bulk actions |
   | Title | Task title with description preview |
   | Priority | Priority badge |
   | Status | Status badge with dropdown |
   | Assignees | Avatar group |
   | Due Date | Date with overdue warning |
   | Actions | View, Edit, Delete |

5. **Create Task Dialog**
   - Title input
   - Description text area
   - Priority selector
   - Category input
   - Due date picker
   - Assignee multi-select
   - Create/Cancel buttons

### Task Detail (`/super-admin/tasks/[id]`)

View and manage individual task details.

**Features:**
- Full task information
- Status update
- Assignee management
- Activity history
- Comments section

### Payroll Approvals (`/super-admin/payroll-approvals`)

Review and approve contractor invoice submissions.

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
   - Invoice details:
     - Employee avatar, name, department
     - Invoice number
     - Period
     - Amount
     - Submission date
   - Quick action buttons (View Document, Approve, Reject)

3. **Tab Navigation**
   - Pending (count) tab
   - Processed (count) tab

4. **Pending Tab Table**
   | Column | Content |
   |--------|---------|
   | Employee | Avatar, name, department |
   | Invoice # | Invoice number |
   | Period | Pay period |
   | Amount | PHP amount |
   | Submitted | Submission date |
   | Actions | View, Approve, Reject buttons |

5. **Processed Tab Table**
   | Column | Content |
   |--------|---------|
   | Employee | Avatar, name, department |
   | Invoice # | Invoice number |
   | Period | Pay period |
   | Amount | PHP amount |
   | Status | Approved/Rejected badge |
   | Reviewed | Date and reviewer name |
   | Actions | View, Download buttons |

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

### Super Admin Additional Access

Super Admins also have access to:
- All Admin features (Directory, Employee Management, Interns, Reports, Performance, Jobs, AI Knowledge)
- Their own versions of: Announcements (`/super-admin/announcements`), Resources (`/super-admin/resources`), AI Knowledge (`/super-admin/ai-knowledge`)

**Shared Admin routes accessed by Super Admins:**
- `/admin/directory`
- `/admin/employee-management`
- `/admin/interns`
- `/admin/performance` (including `/cycles/`, `/employee/`, `/evaluations/`, `/individual/`)
- `/admin/reports` (including `/analytics/`, `/compare/`)
- `/admin/jobs`
- `/admin/probation`

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
- Document submissions (201 files)
- Payroll and invoice questions
- Onboarding tasks
- Benefits information
- Company policies and procedures
- Performance review guidance
- Task management help

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

**Task queries:**
```
User: "How do I update my task status?"
Assistant: Explains task management workflow
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
- Logo/branding area (SN Connect)
- Navigation items with icons
- Active state highlighting (vertical indicator bar)
- Collapse/expand toggle
- Footer tagline: "Where Policy Meets Productivity"

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
| Approved/Success/On Track/Healthy | Green | Completed items, successful states |
| Pending/Warning/Degraded | Yellow/Amber | Awaiting action, attention needed |
| Error/Rejected/At Risk | Red | Failed states, critical issues |
| Secondary/Neutral | Gray | Informational, inactive states |
| In Progress | Blue | Active work items |

### Progress Indicators

- **Progress Bars**: Horizontal bars showing completion percentage
- **Progress Gauges**: Circular indicators for scores/progress
- **Stage Indicators**: Multi-step visual progress (e.g., probation stages)

### Cards and Layout Components

- **Stat Cards**: Display key metrics with trend indicators
- **Bento Cards**: Flexible content containers with headers
- **KPI Cards**: Metric displays with change indicators
- **Insights Summary**: Analysis cards with findings and recommendations

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
| 3.0.0 | Mar 2026 | Updated navigation items, added Directory/Employee Management/Jobs routes, corrected Information Hub routing, updated Known Limitations, reflect ADR changes |
| 2.0.0 | Feb 2026 | Added task management, weekly reports, AI knowledge management, super admin features, enhanced dashboards |
| 1.0.0 | 2024 | Initial release with core features |

---

*This documentation was created for the SN HR Portal. For technical documentation, please refer to the developer guides in the `docs/` directory.*
