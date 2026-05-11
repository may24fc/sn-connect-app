

| PROJECT BLUEPRINT PA Workflow & Productivity System Telegram  \+  Notion  ·  4 Phases  ·  22 Tasks  ·  6 Weeks |
| :---: |

# **Overview**

Transition from fragmented one-on-one communication to a centralized System of Record that ensures continuity, eliminates manual follow-ups, and gives Steven full visibility without chasing anyone.

| 4 Phases | 22 Tasks | 6 Weeks | 3 PA Team Members |
| :---: | :---: | :---: | :---: |

# **Current Pain Points**

**1\. Lack of Visibility**

Steven has no high-level view of task progress. Status checks require manual inquiry — a time tax on both parties.

**2\. Process Friction**

Handovers and follow-ups rely on manual reminders. New PAs absorb knowledge slowly, causing delays every turnover cycle.

**3\. Communication Silos**

One-on-one chats trap information. When a PA leaves, institutional knowledge disappears with them.

# **Voice-to-Action Pipeline**

Every task Steven creates flows through five automated stages — from voice note on his phone to a tracked card in Notion.

| \# | Stage | Tool | Description |
| :---: | :---- | :---- | :---- |
| **1** | **INPUT** | Telegram Voice | Steven records a voice note on mobile. No typing. No friction. |
| **2** | **PROCESSING** | AI / n8n | Transcribed via Whisper API, parsed, and action items extracted via GPT-4o. |
| **3** | **STORAGE** | Notion Database | Task logged with title, description, owner, due date, and priority. |
| **4** | **EXECUTION** | Telegram GC | Assigned PA notified in group chat. Accountability is public. |
| **5** | **MONITORING** | Notion Dashboard | Steven views live status, EOD summaries, blockers — no chasing needed. |

| PHASE 1  Foundation  (Week 1\) *Replace siloed DMs with a structured group environment and a shared source of truth.* |
| :---- |

| ~~TASK 1.1  Create PA Operations Telegram Group Chat Platform: Telegram Set up a single group chat for Steven, all PAs, and Zara. This replaces all one-on-one task communication. Name it clearly (e.g. 'PA Ops Hub') and pin a description of its purpose.~~ |
| :---- |

| ~~TASK 1.2  Define & Pin GC Communication Rules Platform: Telegram Document and pin the group norms: no direct task assignments via DM, all updates posted in GC, EOD summary required from each PA by 5pm daily. Creates a shared operating agreement everyone has agreed to.~~ |
| :---- |

| ~~TASK 1.3  Build Notion PA Master Database Platform: Notion Create a Notion database with fields: Task Name, Assigned To, Business Unit (UHP / SFO / Construction/ FitClub/ Personal/ Others), Status (Not Started / In Progress / Blocked / Done), Priority, Due Date, Notes. This is the permanent system of record.~~ |
| :---- |

| ~~TASK 1.4  Create Notion CEO Dashboard View Platform: Notion Build a filtered dashboard view for Steven showing: all open tasks grouped by assignee, overdue tasks highlighted, blocked tasks flagged. Eliminates manual status checks — Steven sees everything in under 5 minutes.~~ |
| :---- |

| ~~TASK 1.5  Define EOD Summary Template Platform: Telegram \+ Notion Create a standard text template each PA posts in the GC every evening: Completed / In Progress / Blocked / Tomorrow's Plan. Standardises updates so they're scannable in under 10 seconds.~~ |
| :---- |

| ~~TASK 1.6  Onboard Zara into the New System Platform: Notion \+ Telegram Brief Zara on GC protocols, Notion access, and her role within the system. Ensure she has full visibility of existing open tasks and can take over any PA function from day one. Document her scope clearly.~~ |
| :---- |

| PHASE 2  Automation  (Weeks 2–3) *Automate the translation of Steven's voice messages into tracked Notion tasks.* |
| :---- |

| TASK 2.1  Set Up Telegram Bot for Task Input Platform: Telegram Create a dedicated Telegram bot (e.g. @SNTaskBot). Steven sends it a voice note or text message from anywhere. Bot is added to the PA GC and can post formatted task notifications on Steven's behalf. |
| :---- |

| TASK 2.2  Build n8n Voice Transcription Workflow Platform: n8n \+ AI (Whisper \+ GPT-4o or any model that may fit) n8n workflow: Telegram trigger (voice file) → Whisper API transcription → GPT-4o (tentative model) extraction (task title, description, assignee, priority, due date) → JSON output. Handles multiple action items in a single voice note. |
| :---- |

| TASK 2.3  Connect n8n to Notion (Auto-Create Tasks) Platform: Notion \+ n8n n8n Notion node: automatically creates a new row in the PA Master Database for each extracted task. Maps: title, assignee, business unit, priority, due date. Task appears in Notion within 30 seconds of Steven's voice note. |
| :---- |

| TASK 2.4  Auto-Post Task Notification in PA GC Platform: Telegram \+ n8n After Notion entry is created, n8n posts a formatted message into the PA Ops Hub GC: 'New Task for \[Name\]: \[Title\] | Due: \[Date\] | Priority: \[High/Med/Low\] | Notion: \[link\]'. Everyone sees it simultaneously — no silos. |
| :---- |

| TASK 2.5  Add Human Approval Gate Platform: Telegram Before Notion entry is created, the bot posts the extracted task back to Steven with \[Confirm\] and \[Edit\] buttons. Prevents misinterpretations. Steven approves in one tap; edits trigger a brief text correction flow. Especially important for property-related instructions where precision counts. |
| :---- |

| TASK 2.6  Test End-to-End Pipeline with Real Tasks Platform: All systems Run 10 real voice note tests across different scenarios (multi-task, unclear assignee, missing date). Verify accuracy of transcription, extraction, and Notion creation. Document edge cases and adjust GPT prompts accordingly. |
| :---- |

| PHASE 3  Intelligence  (Weeks 4–5) *Eliminate manual follow-ups with automated reminders and a bulletproof handover system.* |
| :---- |

| TASK 3.1  Build Daily EOD Auto-Reminder Platform: Telegram \+ n8n n8n scheduled trigger at 4:30pm (replace with agreed time) daily posts in PA GC: 'EOD Summary due in 30 mins — post your update below using the template.' Consistent and automatic — no PA forgets, no Steven has to remind. |
| :---- |

| TASK 3.2  Build Overdue Task Escalation Alert Platform: Notion \+ Telegram \+ n8n n8n queries Notion nightly for tasks with Due Date past and Status not Done. Posts in GC: 'Overdue: \[Task\] assigned to \[Name\] — was due \[Date\]. Please update status or flag blocker.' Steven sees it without asking. |
| :---- |

| TASK 3.3  Create PA Knowledge Base in Notion Platform: Notion Build a structured Knowledge Base: SOPs per business unit, recurring task guides, vendor/supplier contacts, credentials doc, common questions answered. All institutional knowledge written down and searchable — the anti-silo. This directly solves the turnover problem. |
| :---- |

| TASK 3.4  Design Formal Handover Protocol Platform: Notion Create a Notion 'Handover Checklist' triggered whenever a PA changes roles. Includes: export of all open tasks, KBs reviewed, 3-day shadow period with outgoing PA (if possible), sign-off from Steven before full handover. New PA has all the context from day one. |
| :---- |

| TASK 3.5  Build Weekly Digest for Steven Platform: Telegram \+ Notion \+ AI Every Monday 8am (replace with agreed time), n8n queries Notion for the past 7 days: tasks completed, tasks overdue, tasks created. GPT-4o generates a concise 5-line summary. Posted to Steven's personal Telegram (not GC). His weekly visibility without opening Notion. |
| :---- |

| TASK 3.6  PA Onboarding Checklist Template Platform: Notion \+ Telegram A reusable Notion template for any new PA. Auto-populates their profile, links to all SOPs, grants the right Notion permissions, adds them to the Telegram GC with an intro message. Reduces onboarding time from days to hours. |
| :---- |

| PHASE 4  Optimisation  (Week 6+) *Measure, refine, and expand — turn the system into a compounding productivity asset.* |
| :---- |

| TASK 4.1  Add Performance Metrics to Notion Platform: Notion Extend the Notion DB with: Completion Rate (%), Average Days to Complete, Tasks Completed This Week per PA. Build a rollup formula dashboard Steven can review at a glance. Creates accountability without micromanaging. |
| :---- |

| TASK 4.2  Run Monthly System Retrospective Platform: Telegram \+ Notion Monthly 30-min GC Telegram voice meeting: review what worked, what slowed things down, what's missing. Output: updated SOPs and at least one improvement to the automation stack per month. Keeps the system alive and improving. |
| :---- |

| TASK 4.3  Expand Voice Pipeline to Text Parsing Platform: Telegram \+ AI Extend the bot to also parse Steven's text messages (not just voice). Detect task-like language ('can you...', 'please get...', 'follow up on...') and prompt: 'I detected a task — create it in Notion?' One-tap confirmation. |
| :---- |

| TASK 4.4  Create Business-Unit Sub-Views in Notion Platform: Notion Build filtered Notion views per business: UHP tasks, SFO tasks, Property tasks. Each PA sees only their relevant scope by default. Steven can toggle between views. Reduces cognitive load as task volume grows. |
| :---- |

| TASK 4.5  Document the Full System as an SOP Platform: Notion Write the definitive 'PA System Guide' in Notion: architecture overview, how to create tasks (voice & text), how EODs work, escalation flow, handover protocol, metric review process. This becomes the induction guide for every future PA hire. |
| :---- |

# **Team Roles & Responsibilities**

| Steven CEO / Commander | Ariana Senior PA — Operations | Zara (AI Agent) PA — Growth & Continuity |
| ----- | ----- | ----- |
| Sends voice notes via Telegram bot to create tasks Reviews CEO Dashboard in Notion daily (\<5 mins) Reads weekly digest every Monday morning Approves blockers via Telegram — one tap Participates in monthly retrospective | Pick up assigned tasks from Notion & Telegram GC Post EOD summaries in GC by 5pm daily Update task status in Notion in real-time Flag blockers publicly in GC (no DMs) Maintain and expand the Knowledge Base | Onboarded via the standard Notion checklist template Shadow Ariana / Angel for 3-day overlap period Full access to Knowledge Base from day one Designed to step into any PA function immediately Provides long-term system continuity & redundancy |

# **Notion Database Schema**

## **Task Database**

| Field | Type / Options |
| :---- | :---- |
| **Task Name** | Title |
| **Assigned To** | Person |
| **Business Unit** | Select (UHP / SFO / Property) |
| **Status** | Status (Not Started / In Progress / Blocked / Done) |
| **Priority** | Select (High / Medium / Low) |
| **Due Date** | Date |
| **Notes / Context** | Text |
| **Voice Note Link** | URL |
| **Created By** | Created By (auto) |
| **Date Created** | Created Time (auto) |

# **6-Week Rollout Timeline**

| Week 1 | Foundation | PA Ops Hub GC live · Notion Master DB built · CEO Dashboard view · EOD template published · Zara onboarded |
| :---- | :---- | :---- |
| **Weeks 2–3** | **Automation** | Telegram bot live · Whisper transcription · GPT-4o task extraction · Notion auto-create · GC notifications · Approval gate tested |
| **Weeks 4–5** | **Intelligence** | EOD auto-reminder · Overdue escalation alerts · Knowledge Base built · Handover protocol live · Weekly digest for Steven |
| **Week 6+** | **Optimisation** | Performance metrics · Text parsing expanded · Business unit sub-views · Full system SOP documented · Monthly retro process |

