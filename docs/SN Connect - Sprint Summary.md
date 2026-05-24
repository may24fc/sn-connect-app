

**SN Connect - Sprint Implementation Checklist**

**6-Sprint Delivery Plan**

*"Where Policy Meets Productivity"*

**Report Date:** May 16, 2026

**Project:** SN Connect - HR Portal Feature Refinements

**Sprint Period:** May 5 - June 13, 2026 (6 Sprints)

**Developer:** Ceferino, Senior AI Intern

## **Executive Summary**

This document is now the working implementation checklist for the current SN Connect delivery cycle. Instead of a narrative-only sprint plan, each sprint below is organized as a checklist that can be reviewed and marked off sprint by sprint.

Current sprint order:

- **Week 1 (May 5-9):** Marketing Reports & Admin Dashboard closeout and usability verification.
- **Week 2 (May 12-16):** EOD Intern Automation completion review plus follow-up reminder and formatting improvements.
- **Week 3 (May 19-23):** Automated Monthly Self-Evaluation Form rollout plus Multi-Evaluator Feedback Form.
- **Week 4 (May 26-30):** Standardized Approval Workflow implementation.
- **Week 5 (June 2-6):** AI SOP Chatbot refinement, safeguard work, and full SOP/tutorial knowledge base ingestion.
- **Week 6 (June 9-13):** Tech Expense Tracker for managing subscriptions and operational tool spend.

At the end of these six sprints, the portal should have cleaner admin workflows, stronger automation coverage, a recurring leadership feedback loop with both self and peer evaluation, a traceable approval chain, a more reliable AI assistant backed by the full SOP library, and full visibility into tech spend.

## **WEEK 1 · May 5-9, 2026 - Marketing Reports & Admin Dashboard**

**Sprint status:** In final verification

**Sprint goal:** Close out the Marketing sprint. The functional work is already complete; the only remaining item is to verify the clarity and user-friendliness of the admin dashboard.

**Implementation checklist**

- [x] Replace the reporting security shortcut with the proper access-controlled loading path.
- [x] Add input limits and validation for admin review notes.
- [x] Fix the zero-spend calculation so `Infinity` is never shown for `P0` spend rows.
- [x] Enforce visibility rules across grouped parent-child reports.
- [x] Fix chart resizing so the analytics views resize smoothly across screen widths.
- [x] Add the forecast confidence band between conservative and aggressive scenarios.
- [x] Block invalid report category values from being saved.
- [ ] Verify the clarity and user-friendliness of the admin dashboard, including readability of charts, labels, actions, grouped reports, and review notes flow.

**Verification checklist**

- [x] Employee, admin, and super admin users only see the report data they are allowed to access.
- [x] The `P0` spend row shows a dash instead of an error value.
- [x] The forecast chart shows a visible shaded confidence band.
- [x] Charts resize cleanly on phone, tablet, and desktop screen widths.
- [x] Invalid report categories are blocked with a proper error.
- [ ] Admin dashboard clarity and user-friendliness are verified through a focused walkthrough.
- [x] No new errors were introduced during the Marketing sprint changes.

## **WEEK 2 · May 12-16, 2026 - EOD Intern Automation**

**Sprint status:** Core work completed; enhancement follow-up added

**Sprint goal:** Preserve the completed EOD automation work and track the next round of delivery improvements for reminder visibility, message formatting, and leadership-facing weekly project progress summaries for interns.

**Implementation checklist**

- [x] Prevent duplicate intern reminders when the automation runs more than once on the same day.
- [x] Add retry handling and a Telegram alert when reminder delivery fails repeatedly.
- [x] Review weekly daily logs before the supervisor summary email sends.
- [x] Upgrade the supervisor summary into a clean structured email layout with metrics and warning banner logic.
- [x] Fix the timezone handling so date checks use Philippines time.
- [x] Add an automated duplicate-check test for reminder creation.
- [ ] Add reminder delivery through Telegram and Gmail so interns see follow-ups in both channels.
- [ ] Separate each intern EOD summary into its own clean message block instead of grouping multiple intern EODs into one cramped block.
- [ ] Add a weekly intern project summary automation for leadership that highlights intern project progress.
- [ ] Pull weekly project data from the SN Connect Projects and Leaderboard pages as the source of truth for the summary.
- [ ] Show weekly progress percentages per intern and per project.
- [ ] Include project health and project lead health in the weekly summary.
- [ ] Show overall weekly project movement so leadership can see how much progress each intern made week over week.
- [ ] Format the weekly summary in a clean review-friendly layout for leadership consumption.
- [ ] Verify that the enhanced reminders remain idempotent and do not create duplicate notifications across channels.

**Verification checklist**

- [x] Triggering the reminder twice on the same day results in only one notification.
- [x] Retry handling and Telegram alert flow are tested.
- [x] The supervisor email shows the metrics table and warning banner when fewer than three days were logged.
- [x] Incomplete daily logs are flagged clearly in the supervisor email.
- [x] The Philippines timezone fix is confirmed.
- [ ] Telegram reminder delivery is verified end to end.
- [ ] Gmail reminder delivery is verified end to end.
- [ ] Each intern appears in a distinct readable block in the reminder or summary output.
- [ ] The weekly intern project summary reflects the same percentages shown on the Projects and Leaderboard pages.
- [ ] Project health and project lead health appear clearly in the weekly summary.
- [ ] Leadership can quickly identify overall weekly progress per intern from the summary without opening the app.

## **WEEK 3 · May 19-23, 2026 - Monthly Self-Evaluation Form Automation**

**Sprint status:** Core form built; automation and reminders pending

**Sprint goal:** Launch an automated recurring monthly self-evaluation form for staff, interns, and leadership, with email and Telegram reminders, one submission per person, and a leadership-friendly review structure.

**Implementation checklist**

- [ ] Schedule the form to send automatically on the first Monday of every month.
- [ ] Send the form by email to all staff, interns, and leadership recipients.
- [ ] Send reminder emails to anyone who has not yet submitted the form.
- [ ] Send Telegram reminders to anyone who has not yet submitted the form.
- [x] Enforce one submission per person per month and block duplicate responses.
- [x] Keep the form clean, professional, and finishable within roughly 10-15 minutes.
- [x] Add a department or role dropdown for reporting and filtering.
- [x] Use the current department and function options: Meta & Google Ads Specialists, Graphic Designers, Video Editors, Social Media Creators, Executive Assistants, Personal Assistants, Sales/Marketing Team, HR, HR Interns, Admin Assistants, AI Interns, Accounting Interns, and Other.
- [x] Organize responses for leadership review by accomplishments, impact, blockers, suggestions, leadership feedback, and productivity reflections.
- [x] Prepare the first version or mockup for review.

**Form content checklist**

- [x] Add an introduction explaining the purpose: impact visibility, accomplishments, blockers, improvement opportunities, and leadership feedback.
- [x] Include `Full Name`.
- [x] Include `Department / Role` as a dropdown.
- [x] Include `What were the top 3 things you worked on this month?`.
- [x] Include `Which task, contribution, campaign, project, or initiative created the biggest impact this month?`.
- [x] Include `Why do you think this work mattered?`.
- [x] Include `Did you complete, improve, launch, automate, organize, or solve anything significant this month?`.
- [x] Include `What challenge, issue, or blocker did you help resolve?`.
- [x] Include `What is one thing you improved this month compared to last month?`.
- [x] Include `What slowed you down or made your work more difficult this month?`.
- [x] Include `Is there any workflow, communication issue, inefficiency, or recurring problem leadership may not be fully seeing?`.
- [x] Include `What support, tool, resource, or improvement would help you perform better?`.
- [x] Include `On a scale of 1-10, how productive do you believe you were this month?`.
- [x] Include `What made you give yourself that score?`.
- [x] Include `Did you proactively take ownership of anything outside your direct responsibilities?`.
- [x] Include `What is one area you believe you still need to improve professionally?`.
- [x] Include `What skill, system, or knowledge would you like to improve or learn next?`.
- [x] Include `What is one thing leadership or management did well this month?`.
- [x] Include `What is one thing leadership or management can improve?`.
- [x] Include `Do you feel your work and contributions are visible and understood?` with `Yes / Sometimes / No`.
- [x] Include `Do you feel comfortable raising concerns, blockers, or ideas?` with `Yes / Sometimes / No`.
- [x] Include `Is there anything leadership may not realize is negatively affecting productivity, morale, communication, or operations?`.
- [x] Include `If you could improve one thing immediately within the company, workflow, systems, or operations, what would it be?`.
- [x] Include `Any additional comments, concerns, suggestions, or reflections?`.
- [x] Include the final reflection question: `What is one thing you want to accomplish or improve next month?`.

**Verification checklist**

- [ ] The form sends automatically on the first Monday of the month.
- [ ] Email delivery works for all intended recipients.
- [ ] Reminder emails only target non-respondents.
- [ ] Telegram reminders only target non-respondents.
- [x] Duplicate submissions are blocked to one response per person per month.
- [x] The form can be completed within the target 10-15 minute window.
- [x] Leadership can review responses cleanly by month, person, and department or role.
- [x] The first version or mockup is ready for review.

---

### **Multi-Evaluator Feedback Form** *(separate form — evaluators assess a colleague or direct report)*

**Implementation checklist**

- [ ] Build the multi-evaluator feedback form as a distinct form separate from the self-evaluation form.
- [ ] Allow leadership or HR to trigger evaluation rounds manually or on the same monthly schedule.
- [ ] Let the evaluator select the person they are evaluating from a searchable dropdown of active staff.
- [ ] Enforce one submission per evaluator per evaluatee per evaluation period.
- [ ] Keep the evaluator identity visible to HR and leadership but optionally anonymized to the evaluatee.
- [ ] Organize multi-evaluator responses by evaluatee for consolidated leadership review.
- [ ] Send email and Telegram notifications to assigned evaluators when a round opens.
- [ ] Send reminders to evaluators who have not yet submitted before the deadline.
- [ ] Store responses alongside the self-evaluation data so leadership can compare both views side by side.
- [ ] Prepare the first version or mockup of the multi-evaluator form for review.

**Multi-evaluator form content checklist**

- [ ] Include `Evaluator Name`.
- [ ] Include `Person Being Evaluated` as a searchable dropdown.
- [ ] Include `Evaluation Period` (auto-populated from the active round).
- [ ] Include `How would you rate this person's overall work quality this period?` on a scale of 1-10.
- [ ] Include `What are the top 3 strengths you observed in this person's work?`.
- [ ] Include `What is one area where this person could meaningfully improve?`.
- [ ] Include `Did this person consistently meet their responsibilities and deadlines?` with `Yes / Mostly / No`.
- [ ] Include `How effectively does this person communicate and collaborate with the team?` on a scale of 1-5.
- [ ] Include `Did this person take initiative or go beyond their defined responsibilities?` with `Yes / Sometimes / No`.
- [ ] Include `What is one specific contribution or action this person made that stood out?`.
- [ ] Include `Is there anything leadership should be aware of about this person's performance or situation?`.
- [ ] Include `Any additional comments or observations?`.

**Verification checklist**

- [ ] A submitted multi-evaluator response cannot be resubmitted for the same evaluatee in the same period.
- [ ] Evaluator notifications are sent when a round opens.
- [ ] Reminder notifications only go to evaluators who have not yet submitted.
- [ ] Leadership can view self-evaluation and multi-evaluator responses side by side per employee.
- [ ] The evaluatee cannot see evaluator identities if anonymization is enabled.
- [ ] The first version or mockup is ready for review.

## **WEEK 4 · May 26-30, 2026 - Standardized Approval Workflow**

**Sprint status:** Planned

**Sprint goal:** Build a 6-stage approval chain with immutable history, reference numbers, role-gated transitions, notifications, and traceable completion proof.

**Implementation checklist**

- [ ] Expand the approval lifecycle from 3 states to 6 states: Pending Endorsement -> Pending Approval -> Approved -> Implementing -> Completed -> Rejected.
- [ ] Prevent skipped stages and backward jumps once a state transition is invalid.
- [ ] Create a permanent history log for every status change with actor, timestamp, note, and attachment metadata.
- [ ] Auto-generate unique request reference numbers in the format `SN-2026-NNN`.
- [ ] Track the assigned endorser, approver, and implementor for each request.
- [ ] Enforce security rules so only the correct assignee can move a request at each stage.
- [ ] Block requestors from approving their own request.
- [ ] Block endorsers from marking a request as completed.
- [ ] Build the transition rules engine for allowed and disallowed status moves.
- [ ] Build the transition action that validates permission, validates the move, records history, updates status, and notifies the next actor.
- [ ] Send in-app notifications and email notifications to the next actor in the chain.
- [ ] Add automated tests for blocked invalid transitions and rejected-request finality.
- [ ] Build the 3-step submission form.
- [ ] Build the `My Actions` queue for endorsers, approvers, and implementors.
- [ ] Build the admin `Global Tracker` table.
- [ ] Build the request comment thread.
- [ ] Allow optional proof-of-completion attachment upload when the implementor marks the request as completed.

**Verification checklist**

- [ ] Full E2E chain is verified from requestor submission through completed implementation with attachment.
- [ ] The history log contains one entry per status change with the correct actor and timestamp.
- [ ] Reference numbers generate correctly for at least three test submissions.
- [ ] A requestor calling the approval action directly is blocked.
- [ ] Automated approval rule tests pass.
- [ ] The comment thread works and displays properly.
- [ ] No new errors are introduced during the approval workflow rollout.

## **WEEK 5 · June 2-6, 2026 - AI SOP Chatbot & Knowledge Base Ingestion**

**Sprint status:** Partially implemented; keyword search, source deduplication, PII filters, and SOP ingestion pending

**Sprint goal:** Improve answer accuracy, add stronger retrieval guardrails, clean up the chat experience, prevent sensitive information leakage, and ingest the full SOP and tutorial library so the AI has complete knowledge coverage.

**Implementation checklist**

- [x] Add stricter document retrieval for narrow direct questions and broader retrieval for general questions.
- [x] Add a processing cap so long documents do not cause silent failure mid-response.
- [ ] Add keyword search as a fallback to semantic retrieval.
- [ ] Fix duplicate source entries in the Sources panel.
- [x] Update the chat UI so user messages appear on the right in indigo and AI responses appear on the left in gray.
- [x] Add a gentle loading or thinking animation while the AI prepares a response.
- [x] Add the honest fallback response: `I don't have a documented answer for that yet. Please contact HR directly.`
- [ ] Add privacy filters for TIN, PhilHealth, and SSS numbers so they are never surfaced in answers.

**SOP & Tutorial Ingestion checklist**

- [ ] Audit and collect all existing SOPs, tutorials, guides, and process documentation from all sources (Google Drive, Notion, email, local files).
- [ ] Define a consistent ingestion format and category taxonomy (e.g., HR SOPs, Tool Guides, Process Tutorials, Onboarding Docs).
- [ ] Upload and embed all collected SOPs and tutorials into the SNConnect AI knowledge base.
- [ ] Tag each source with category, department relevance, and last-updated date for filtered retrieval.
- [ ] Verify that chunking and embedding quality is consistent across all ingested documents.
- [ ] Test representative questions per SOP category to confirm accurate retrieval.
- [ ] Add a knowledge base coverage report so admins can see which topics are indexed and which have gaps.
- [ ] Set up a recurring ingestion workflow or intake process so new SOPs and tutorials are added to the knowledge base as they are created.

**Verification checklist**

- [x] Unknown topics return the honest fallback response.
- [ ] The Sources panel shows no duplicate documents for tested questions.
- [x] Chat bubbles display correctly in both light mode and dark mode.
- [ ] The AI refuses to reveal TIN, PhilHealth, and SSS number formats.
- [x] The AI stays within the processing cap for tested queries.
- [ ] All collected SOPs and tutorials are confirmed indexed in the knowledge base.
- [ ] Representative test questions per SOP category return accurate and sourced answers.
- [ ] The knowledge base coverage report is accessible to admins.
- [ ] The ingestion intake process is documented and ready for ongoing use.

## **WEEK 6 · June 9-13, 2026 - Tech Expense Tracker**

**Sprint status:** Planned

**Sprint goal:** Build a centralized tech expense tracker inside SN Connect so admin and leadership have full visibility into all technology subscriptions, software licenses, and tool spend — with categorization, renewal alerts, and a cost dashboard.

**Implementation checklist**

- [ ] Build the Tech Expense Tracker module accessible to admin and super admin roles.
- [ ] Create the database schema for tech expenses: name, vendor, category, billing cycle, cost, currency, renewal date, owner, status, and notes.
- [ ] Support the following expense categories: Subscriptions, Software Licenses, SaaS Tools, Cloud Infrastructure, API Services, Hardware/Equipment, One-Time Purchases, and Other.
- [ ] Allow admin users to add, edit, and archive expense entries.
- [ ] Support multi-currency entry with display normalized to a base currency (PHP).
- [ ] Show a cost summary dashboard with total monthly spend, total annual spend, and per-category breakdown.
- [ ] Add a renewal calendar view or timeline that highlights upcoming renewals within the next 30 and 60 days.
- [ ] Send an in-app notification and email alert to the assigned owner and admin when a subscription is within 14 days of renewal.
- [ ] Allow attaching receipts or invoice files to each expense entry.
- [ ] Add an expense status field: Active, Cancelled, Under Review, and Pending Renewal.
- [ ] Add a search and filter interface by category, status, renewal date, and owner.
- [ ] Log all add, edit, and archive actions to `audit_logs` for full traceability.
- [ ] Seed the tracker with the current known tech expenses as the initial dataset.

**Verification checklist**

- [ ] Admin and super admin can add, edit, and archive expense entries; employee and intern roles cannot access the tracker.
- [ ] The cost summary dashboard shows correct totals and per-category breakdowns.
- [ ] Renewal alerts fire correctly for expenses within 14 days of their renewal date.
- [ ] Multi-currency entries display correctly normalized to PHP.
- [ ] Audit log entries are created for every add, edit, and archive action.
- [ ] File attachments (receipts, invoices) can be uploaded and retrieved per expense entry.
- [ ] The renewal calendar correctly highlights entries due within 30 and 60 days.
- [ ] No new errors are introduced during the tech expense tracker rollout.

## **Sprint Summary**

| Sprint | Focus | Goal | Key Deliverable | Status |
| :---- | :---- | :---- | :---- | :---- |
| Week 1 - May 5-9 | Marketing Reports & Admin Dashboard | Final closeout and usability verification | Completed feature work plus final admin dashboard clarity review | In verification |
| Week 2 - May 12-16 | EOD Intern Automation | Preserve completed automation and add delivery improvements | Dual-channel reminders, cleaner per-intern message blocks, and weekly intern project summaries for leadership | Completed with follow-up |
| Week 3 - May 19-23 | Monthly Self-Evaluation + Multi-Evaluator Feedback | Launch recurring monthly self and peer feedback collection | Two separate automated forms, reminders, duplicate guard, side-by-side review | Planned |
| Week 4 - May 26-30 | Standardized Approval Workflow | Multi-step chain with full audit trail | 6-stage state machine, history log, ref numbers, dashboards | Planned |
| Week 5 - June 2-6 | AI SOP Chatbot & Knowledge Base Ingestion | Smarter answers, safer responses, full SOP coverage | Hybrid retrieval, fallback response, privacy filters, chat polish, all SOPs ingested | Planned |
| Week 6 - June 9-13 | Tech Expense Tracker | Full visibility into technology spend and renewals | Expense CRUD, category dashboard, renewal alerts, audit logging | Planned |

| Delivery Summary | Details |
| :---- | :---- |
| **Total Sprints** | 6 - one focused sprint per delivery area |
| **Sprint Period** | May 5 - June 13, 2026 |
| **Developer** | Ceferino, Senior AI Intern |
| **Type of Work** | Refinement plus two new recurring feedback forms, full knowledge base ingestion, and a new operational spend tracker |
| **Tracking Method** | Checklist-driven implementation and verification per sprint |
| **Definition of Done** | Each sprint is only complete when all required implementation and verification checkboxes are satisfied |

*End of Sprint Implementation Checklist.*