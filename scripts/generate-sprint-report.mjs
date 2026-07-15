/**
 * generate-sprint-report.mjs
 *
 * Generates docs/reports/SN_Connect_Sprint_Report.docx
 * Non-technical, boss-friendly version of the 4-week sprint plan.
 * Structured to match the SN_Portal_WEB_Progress_Report format.
 *
 * Run: node scripts/generate-sprint-report.mjs
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  HeadingLevel,
  ShadingType,
  VerticalAlign,
  convertInchesToTwip,
  PageBreak,
} from "docx";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT     = join(__dirname, "..");
const OUT_DIR  = join(ROOT, "docs", "reports");
const OUT_FILE = join(OUT_DIR, "SN_Connect_Sprint_Report.docx");

// ─── Palette (Navy & Gold to match brand) ─────────────────────────────────────
const NAVY   = "1E3A5F";
const GOLD   = "B8952A";
const ZINC50 = "FAFAFA";
const ZINC100= "F4F4F5";
const ZINC200= "E4E4E7";
const ZINC700= "3F3F46";
const ZINC500= "71717A";
const WHITE  = "FFFFFF";

const pt = (n) => n * 2;  // docx uses half-points

// ─── Small helpers ─────────────────────────────────────────────────────────────

/** H1 — document title, centred */
function docTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: pt(4), after: pt(2) },
    children: [
      new TextRun({ text, bold: true, size: pt(22), color: NAVY, font: "Calibri" }),
    ],
  });
}

/** Header metadata line (> **Label:** Value) */
function metaLine(label, value) {
  return new Paragraph({
    spacing: { before: pt(1), after: pt(1) },
    indent: { left: convertInchesToTwip(0.25) },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: pt(11), color: NAVY, font: "Calibri" }),
      new TextRun({ text: value,        size: pt(11), color: ZINC700, font: "Calibri" }),
    ],
  });
}

/** Horizontal rule */
function hr() {
  return new Paragraph({
    border: { bottom: { color: ZINC200, space: 1, style: BorderStyle.SINGLE, size: 6 } },
    spacing: { before: pt(5), after: pt(5) },
    children: [],
  });
}

/** H2 section header */
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: pt(8), after: pt(3) },
    children: [
      new TextRun({ text, bold: true, size: pt(16), color: NAVY, font: "Calibri" }),
    ],
  });
}

/** H3 sub-section header */
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: pt(5), after: pt(2) },
    children: [
      new TextRun({ text, bold: true, size: pt(13), color: GOLD, font: "Calibri" }),
    ],
  });
}

/** Week banner — dark navy strip */
function weekBanner(week, dateRange, title) {
  return new Paragraph({
    spacing: { before: pt(8), after: pt(4) },
    shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
    children: [
      new TextRun({ text: `  ${week}  ·  ${dateRange}`, bold: true,  size: pt(11), color: GOLD,  font: "Calibri" }),
      new TextRun({ text: `  —  ${title}`,              bold: false, size: pt(11), color: WHITE, font: "Calibri" }),
    ],
  });
}

/** Sub-label inside a week (e.g. "What we're working on this week:") */
function subLabel(text) {
  return new Paragraph({
    spacing: { before: pt(4), after: pt(2) },
    children: [
      new TextRun({ text, bold: true, size: pt(11), color: NAVY, font: "Calibri" }),
    ],
  });
}

/** Phase label for Week 4 sub-phases */
function phaseLabel(text) {
  return new Paragraph({
    spacing: { before: pt(4), after: pt(2) },
    shading: { type: ShadingType.SOLID, color: ZINC100, fill: ZINC100 },
    children: [
      new TextRun({ text: `  ${text}`, bold: true, size: pt(11), color: ZINC700, font: "Calibri" }),
    ],
  });
}

/** Normal body paragraph */
function body(text) {
  return new Paragraph({
    spacing: { before: pt(1), after: pt(2) },
    children: [
      new TextRun({ text, size: pt(11), color: ZINC700, font: "Calibri" }),
    ],
  });
}

/** Bullet point */
function bullet(text, bold = false) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: pt(1), after: pt(1) },
    children: boldParts(text, bold),
  });
}

/** Sub-bullet (indented one level deeper) */
function subBullet(text) {
  return new Paragraph({
    bullet: { level: 1 },
    spacing: { before: pt(1), after: pt(1) },
    children: [new TextRun({ text, size: pt(11), color: ZINC700, font: "Calibri" })],
  });
}

/** "Definition of Done" checklist item */
function check(text) {
  return new Paragraph({
    spacing: { before: pt(1), after: pt(1) },
    indent: { left: convertInchesToTwip(0.25) },
    children: [
      new TextRun({ text: "☐  ", size: pt(11), color: GOLD, bold: true, font: "Calibri" }),
      new TextRun({ text, size: pt(11), color: ZINC700, font: "Calibri" }),
    ],
  });
}

/** "DoD" banner */
function doDLabel() {
  return new Paragraph({
    spacing: { before: pt(5), after: pt(2) },
    shading: { type: ShadingType.SOLID, color: ZINC700, fill: ZINC700 },
    children: [
      new TextRun({ text: "  ✔  HOW WE'LL KNOW IT'S DONE", bold: true, size: pt(11), color: WHITE, font: "Calibri" }),
    ],
  });
}

/** Blank spacer */
function spacer() {
  return new Paragraph({ children: [new TextRun({ text: "" })] });
}

// Parses **bold** markers in text and returns an array of TextRun objects
function boldParts(text, forceAllBold = false) {
  if (forceAllBold) {
    return [new TextRun({ text, bold: true, size: pt(11), color: ZINC700, font: "Calibri" })];
  }
  const runs = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      runs.push(new TextRun({ text: text.slice(last, match.index), size: pt(11), color: ZINC700, font: "Calibri" }));
    }
    runs.push(new TextRun({ text: match[1], bold: true, size: pt(11), color: ZINC700, font: "Calibri" }));
    last = regex.lastIndex;
  }
  if (last < text.length) {
    runs.push(new TextRun({ text: text.slice(last), size: pt(11), color: ZINC700, font: "Calibri" }));
  }
  return runs.length ? runs : [new TextRun({ text, size: pt(11), color: ZINC700, font: "Calibri" })];
}

// ─── Table builder ─────────────────────────────────────────────────────────────

function twoColTable(rows) {
  // rows: [{ label, value }]
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:     { style: BorderStyle.SINGLE, size: 4, color: ZINC200 },
      bottom:  { style: BorderStyle.SINGLE, size: 4, color: ZINC200 },
      left:    { style: BorderStyle.NONE },
      right:   { style: BorderStyle.NONE },
      insideH: { style: BorderStyle.SINGLE, size: 2, color: ZINC200 },
      insideV: { style: BorderStyle.NONE },
    },
    rows: rows.map(({ label, value }, i) =>
      new TableRow({
        children: [
          tcell(label, "30%", true,  i % 2 === 0 ? WHITE : ZINC100),
          tcell(value, "70%", false, i % 2 === 0 ? WHITE : ZINC100),
        ],
      })
    ),
  });
}

function summaryTable(rows) {
  // rows: string[] for a 5-col table: [Week, Feature, Goal, Key Deliverable, Status]
  const headerRow = new TableRow({
    tableHeader: true,
    children: ["Week","Feature","Goal","Key Deliverable","Status"].map((h) =>
      tcell(h, "20%", true, NAVY, WHITE)
    ),
  });
  const dataRows = rows.map((cols, i) =>
    new TableRow({
      children: cols.map((c) => tcell(c, "20%", false, i % 2 === 0 ? WHITE : ZINC100)),
    })
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:     { style: BorderStyle.SINGLE, size: 4, color: ZINC200 },
      bottom:  { style: BorderStyle.SINGLE, size: 4, color: ZINC200 },
      left:    { style: BorderStyle.NONE },
      right:   { style: BorderStyle.NONE },
      insideH: { style: BorderStyle.SINGLE, size: 2, color: ZINC200 },
      insideV: { style: BorderStyle.SINGLE, size: 2, color: ZINC200 },
    },
    rows: [headerRow, ...dataRows],
  });
}

function tcell(text, width, bold = false, bg = WHITE, textColor = ZINC700) {
  return new TableCell({
    width: { size: parseInt(width), type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.SOLID, color: bg, fill: bg },
    verticalAlign: VerticalAlign.CENTER,
    margins: {
      top:    convertInchesToTwip(0.06),
      bottom: convertInchesToTwip(0.06),
      left:   convertInchesToTwip(0.1),
      right:  convertInchesToTwip(0.1),
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text, bold, size: pt(10), font: "Calibri", color: textColor }),
        ],
      }),
    ],
  });
}

// ─── Document content ──────────────────────────────────────────────────────────

const coverBlock = [
  spacer(),
  docTitle("Control Hub — Feature Refinement"),
  docTitle("4-Week Sprint Plan"),
  spacer(),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '"Where Policy Meets Productivity"', italics: true, size: pt(11), color: ZINC500, font: "Calibri" })] }),
  spacer(),
  hr(),
  metaLine("Report Date", "May 5, 2026"),
  metaLine("Project", "Control Hub — HR Portal Feature Refinements"),
  metaLine("Sprint Period", "May 5 – May 30, 2026 (4 Weeks)"),
  metaLine("Developer", "Ceferino, Senior AI Associate"),
  hr(),
  spacer(),
];

// Executive Summary
const execSummary = [
  h2("Executive Summary"),
  body(
    "This 4-week sprint covers targeted improvements to four features that are already built and working inside Control Hub. " +
    "Rather than starting anything new, the focus is on refinement — making existing features more reliable, more accurate, and easier to use."
  ),
  body("Here is what each week covers:"),
  bullet("**Week 1 (May 5–9):** Making the Marketing Reports dashboard more accurate, secure, and visually polished."),
  bullet("**Week 2 (May 12–16):** Making the automated associate end-of-day reminder and weekly supervisor email more reliable."),
  bullet("**Week 3 (May 19–23):** Improving the AI chatbot's accuracy, adding safety guardrails, and cleaning up the chat interface."),
  bullet("**Week 4 (May 26–30):** Building a proper multi-step approval workflow for requests that need sign-off from multiple people before anything is actioned."),
  body(
    "At the end of all four weeks, the portal will have more trustworthy data, fewer automation failures, a smarter AI assistant, " +
    "and a clean, traceable approval system that replaces manual follow-ups."
  ),
  spacer(),
];

// ─── WEEK 1 ────────────────────────────────────────────────────────────────────
const week1 = [
  weekBanner("WEEK 1", "May 5–9, 2026", "Marketing Reports & Admin Dashboard"),

  subLabel("What we're working on this week:"),
  body(
    "The Reports section of the admin dashboard already works, but there are a few things that need tightening. " +
    "This week is about making sure the data shown is accurate, the right people only see what they're supposed to see, " +
    "and the charts look polished and professional on any screen size."
  ),

  subLabel("What will be done:"),
  bullet("**Fixing a security shortcut.** The reports page currently uses a workaround that bypasses the portal's security layer when loading data across different tables. We're replacing it with the proper approach so every request is fully checked against the user's access level."),
  bullet("**Adding input limits for review notes.** When an admin writes review notes on a submitted report, the system currently has no character limit or format check. We're adding one to prevent incomplete or oversized submissions."),
  bullet("**Fixing a calculation error.** When a marketing campaign has ₱0 in spend, the analytics dashboard currently shows an error number (like \"Infinity\") instead of simply showing a dash. We're fixing that."),
  bullet("**Enforcing report visibility on grouped reports.** Reports can be organized in parent-child groups (e.g., a monthly report containing weekly sub-reports). Currently the visibility rules apply per report but not to the group structure. We're making sure the same rules apply when viewing a full group."),
  bullet("**Fixing chart resizing.** The analytics charts currently shift or jump slightly when the browser window is resized. We're making them resize smoothly at any screen width."),
  bullet("**Adding a forecast confidence band.** On the forecast chart, we're adding a shaded zone between the best-case and worst-case scenarios so it's visually clear what the expected range looks like — not just a single line."),
  bullet("**Preventing invalid report categories.** The field that stores a report's category (account, campaign, ad set, etc.) currently accepts anything typed into it. We're adding a check so only valid values can be saved."),

  doDLabel(),
  check("Each user role (employee, admin, super admin) sees only the report data they are allowed to — verified by testing with all four account types."),
  check("The ₱0 spend row shows a dash instead of an error number on the analytics page."),
  check("The forecast chart shows a visible shaded band between the conservative and aggressive scenarios."),
  check("Charts resize cleanly without jumping on phone, tablet, and desktop screens."),
  check("Invalid report category values are blocked and return an error message."),
  check("No new errors are introduced — confirmed by running the automated code checks."),
  spacer(),
];

// ─── WEEK 2 ────────────────────────────────────────────────────────────────────
const week2 = [
  weekBanner("WEEK 2", "May 12–16, 2026", "EOD Associate Automation"),

  subLabel("What we're working on this week:"),
  body(
    "The portal already sends automatic reminders to interns at the end of the day to submit their daily logs, " +
    "and emails their supervisor a summary every Friday. This week is about making that automation bulletproof — " +
    "no duplicate messages, smarter emails, and a timing fix so the system always knows what day it is for interns based in the Philippines."
  ),

  subLabel("What will be done:"),
  bullet("**Preventing duplicate reminders.** If the automated reminder runs more than once on the same day (due to a timing glitch), it currently sends the same message to the associate twice. We're adding a check so each associate only gets one reminder per day, no matter what."),
  bullet("**Adding a retry safety net.** If the automated reminder fails to send, the system will now automatically try again — up to three times. If it still fails after that, the team gets an alert in the PA Ops Hub Telegram group so no one is left uninformed."),
  bullet("**Adding a quality check before the supervisor email sends.** Before the weekly summary email goes out every Friday, the system will now review all submitted daily logs for that week. If any log was submitted with missing hours or blank accomplishment notes, those entries will be flagged inside the email so the supervisor knows immediately."),
  bullet("**Upgrading the supervisor email layout.** The current supervisor email is plain text. We're replacing it with a clean, structured format: a header, a metrics table showing the associate's name, total hours, number of days logged, and average hours per day. If an associate logged fewer than three days that week, a clear amber warning banner will appear at the top of the email."),
  bullet("**Fixing a timezone issue.** The system currently compares dates in international UTC time, which can make it think it's still \"yesterday\" for interns in the Philippines when the local day has already changed. We're adding a Philippine time zone conversion to fix this."),
  bullet("**Writing a duplicate-check test.** We'll write an automated check that simulates sending the reminder twice on the same day and confirms that only one notification is created."),

  doDLabel(),
  check("Triggering the reminder twice on the same day results in only one notification reaching the associate — confirmed by automated test."),
  check("The retry mechanism is set up and the Telegram alert is connected — tested by simulating a failure."),
  check("The supervisor email shows a clean table with all metrics and a warning banner when fewer than 3 days were logged."),
  check("Incomplete daily logs (missing hours or notes) are flagged clearly inside the weekly email."),
  check("The timezone fix is confirmed — dates are correct for interns operating in the Philippines."),
  spacer(),
];

// ─── WEEK 3 ────────────────────────────────────────────────────────────────────
const week3 = [
  weekBanner("WEEK 3", "May 19–23, 2026", "AI SOP Chatbot"),

  subLabel("What we're working on this week:"),
  body(
    "The AI assistant answers HR policy questions by searching through uploaded company documents. It's working, " +
    "but we've found areas where it can be more accurate, more honest when it doesn't know something, " +
    "and better-looking. This week is about making the chatbot smarter, safer, and more polished."
  ),

  subLabel("What will be done:"),
  bullet("**Smarter document searching.** For simple, direct questions, the AI will now use a stricter match to avoid pulling in loosely related content. For broader questions, it will cast a wider net. This improves the quality and relevance of answers depending on what's being asked."),
  bullet("**Adding a processing safety cap.** Without a limit, very long uploaded documents could cause the AI to fail silently mid-response. We're adding a maximum amount of text it will process per query, and it will automatically trim less-relevant sections to stay within that limit."),
  bullet("**Adding keyword search as a backup.** The AI currently uses smart semantic matching to find relevant document sections. We're adding a keyword-based search on top of this so it can find answers even when the phrasing of the question doesn't closely match the wording in the document."),
  bullet("**Fixing a duplicate sources bug.** The \"Sources\" panel shown below an AI response can currently display the same document twice. We're fixing it so each source appears only once — showing the most relevant reference."),
  bullet("**Updating the chat bubble design.** User messages will appear on the right side of the chat in indigo, and AI responses on the left in gray. A gentle animation will show while the AI is preparing its answer, instead of the screen simply going blank."),
  bullet("**Adding an honest fallback response.** When the AI can't find anything relevant in the knowledge base, it currently may guess or give a vague answer. We're adding a clear response: \"I don't have a documented answer for that yet. Please contact HR directly.\" — so users know to go elsewhere rather than trusting an uncertain answer."),
  bullet("**Adding privacy filters.** We're adding detection for sensitive Philippine ID numbers (TIN, PhilHealth, SSS) in uploaded documents so the AI will never accidentally surface these in a response, even if they appear in a document it has access to."),

  doDLabel(),
  check("When asked about a topic not covered in the knowledge base, the AI responds with the honest fallback message — verified by testing in the chat playground."),
  check("The Sources panel shows no duplicate documents for any test question."),
  check("Chat bubbles look correct in both light mode and dark mode — screenshots included in the work summary."),
  check("The AI correctly refuses to reveal TIN, PhilHealth, and SSS number formats — verified by test queries."),
  check("The AI does not exceed its processing limit on any query — confirmed by automated check."),
  spacer(),
];

// ─── WEEK 4 ────────────────────────────────────────────────────────────────────
const week4 = [
  weekBanner("WEEK 4", "May 26–30, 2026", "Standardized Approval Workflow"),

  subLabel("What we're working on this week:"),
  body(
    "Right now, requests that need approval inside the portal have only three stages: Pending, Approved, or Rejected. " +
    "For requests that go through multiple people — like a budget request that needs an endorser to sign off, " +
    "then an approver to authorize, then someone to actually implement it — three stages are not enough."
  ),
  body(
    "This week we're building a proper 6-stage approval chain with auto-generated reference numbers, " +
    "a permanent history trail of every status change, and dedicated dashboards for each person involved."
  ),
  body("The full flow this system will support:"),
  bullet("**Requestor** (e.g. LJ or Kazz) submits a request"),
  bullet("**Endorser** reviews and signs off"),
  bullet("**Approver** (e.g. May) gives final authorization"),
  bullet("**Implementor** (e.g. Ariana) carries out the action"),
  bullet("**System** closes the request and records proof of completion"),

  spacer(),
  phaseLabel("Part 1 of 4 — Database & Security Setup"),
  bullet("**Expanding the approval stages from 3 to 6.** The new stages are: Pending Endorsement → Pending Approval → Approved → Implementing → Completed → Rejected. Each stage is locked — you can't skip a step or jump backwards."),
  bullet("**Creating a permanent history log.** Every single status change will create a record: who moved it, when, what they wrote as a note, and any file they attached. This log cannot be edited or deleted — it is the permanent paper trail."),
  bullet("**Auto-generating reference numbers.** Every new request will automatically receive a unique reference number in the format SN-2026-001, SN-2026-002, etc. — making it easy to reference in emails or conversations."),
  bullet("**Assigning a specific owner for each stage.** The system will track exactly who the endorser, approver, and implementor are for each request — so at every stage, the system knows exactly whose turn it is to act."),
  bullet("**Updating security rules.** Only the correct person can advance a request at each stage. A requestor cannot approve their own request. An endorser cannot mark a request as completed. This prevents anyone from bypassing the chain."),

  spacer(),
  phaseLabel("Part 2 of 4 — The Rules Engine"),
  bullet("**Building the approval logic.** A central set of rules will govern which status moves are valid. For example: once a request is rejected, it cannot be moved again. You cannot jump from Pending Endorsement straight to Completed."),
  bullet("**Building the transition action.** When someone moves a request to the next stage, the system will: (1) verify they have the right to do so, (2) check the move is allowed by the rules, (3) record it in the history log, (4) update the status, and (5) notify the next person in the chain."),
  bullet("**Setting up automatic notifications.** Each person in the chain will receive an in-app notification and an email when it's their turn to act — no manual follow-up needed."),
  bullet("**Writing automated rule tests.** We'll write tests for scenarios like: \"confirm that an endorser trying to mark something as completed is blocked\" and \"confirm that a rejected request cannot be moved again.\""),

  spacer(),
  phaseLabel("Part 3 of 4 — User-Facing Screens"),
  bullet("**The Submission Form.** A clean 3-step guided form. Step 1: fill in the subject, business unit, and details. Step 2: select the endorser and approver from a dropdown. Step 3: review everything and confirm."),
  bullet("**My Actions view.** Each person in the chain (endorser, approver, implementor) gets a personal queue showing only the requests currently waiting for their specific action. No noise from requests at other stages."),
  bullet("**Global Tracker.** A read-only table visible to admins showing every request and its current status. Columns include: Reference Number, Subject, Requestor, Current Stage, Endorser, Approver, Implementor, and Last Updated. This replaces the manual centralized tracking file."),
  bullet("**Comment thread on each request.** A discussion panel inside each request's detail page where all involved parties can leave notes. This keeps all communication tied to the request itself — not scattered across DMs or separate chats."),
  bullet("**Proof of completion attachment.** When the implementor marks a request as completed, they can optionally attach a file — for example, a screenshot of a token purchase confirmation. This is stored permanently alongside the history log entry."),

  spacer(),
  phaseLabel("Part 4 of 4 — End-to-End Testing"),
  bullet("Running the full approval chain from start to finish: LJ submits → Endorser signs off → May approves → Ariana completes with an attachment → Global Tracker shows Completed."),
  bullet("Verifying the history log shows every step with the correct person and timestamp."),
  bullet("Confirming reference numbers generate correctly."),
  bullet("Confirming a requestor is blocked from approving their own request."),

  doDLabel(),
  check("Full E2E chain verified: Requestor → Endorser → Approver → Implementor → Completed, with attachment."),
  check("History log contains one entry per status change, with correct actor and timestamp."),
  check("Reference numbers generate in the format SN-2026-NNN — verified with 3 test submissions."),
  check("A requestor calling the approval action directly is blocked — verified by test."),
  check("All automated approval rule tests pass."),
  check("Comment thread works and displays properly."),
  check("No new errors introduced — confirmed by running the automated code checks."),
  spacer(),
];

// ─── Sprint Summary ─────────────────────────────────────────────────────────────
const sprintSummary = [
  hr(),
  h2("Sprint Summary"),
  spacer(),
  summaryTable([
    ["Week 1\nMay 5–9", "Marketing Reports & Admin Dashboard", "Data accuracy & security tightening", "Fixed charts, security layer, category validation, forecast band", "Planned"],
    ["Week 2\nMay 12–16", "EOD Associate Automation", "Reliable automation & better emails", "Dedup guard, retry logic, upgraded HTML supervisor email", "Planned"],
    ["Week 3\nMay 19–23", "AI SOP Chatbot", "Smarter answers & safer responses", "Hybrid search, fallback response, PII filters, chat UI polish", "Planned"],
    ["Week 4\nMay 26–30", "Standardized Approval Workflow", "Multi-step chain with full audit trail", "6-stage state machine, history log, ref numbers, dashboards", "Planned"],
  ]),
  spacer(),
  spacer(),
  twoColTable([
    { label: "Total Sprints",       value: "4 — one per week, each focused on one feature" },
    { label: "Total Tasks",         value: "22 improvement items across all four features" },
    { label: "Sprint Period",       value: "May 5 – May 30, 2026" },
    { label: "Developer",           value: "Ceferino, Senior AI Associate" },
    { label: "Type of Work",        value: "Refinement — improving existing features, not building new ones" },
    { label: "Testing Approach",    value: "Automated checks run after every change; manual verification per sprint" },
    { label: "Definition of Done",  value: "Each week has a checklist of specific pass/fail criteria before it is considered complete" },
  ]),
  spacer(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: pt(6) },
    children: [
      new TextRun({ text: "— End of Sprint Plan —", italics: true, size: pt(10), color: ZINC500, font: "Calibri" }),
    ],
  }),
];

// ─── Assemble Document ──────────────────────────────────────────────────────────
const doc = new Document({
  creator: "Ceferino, Senior AI Associate — Control Hub",
  title: "Control Hub Feature Refinement — 4-Week Sprint Plan",
  description: "Non-technical sprint plan for the four Control Hub feature refinements (May 2026)",
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: pt(11), color: ZINC700 },
        paragraph: { spacing: { line: 276 } },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top:    convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left:   convertInchesToTwip(1.15),
            right:  convertInchesToTwip(1.15),
          },
        },
      },
      children: [
        ...coverBlock,
        ...execSummary,
        ...week1,
        ...week2,
        ...week3,
        ...week4,
        ...sprintSummary,
      ],
    },
  ],
});

// ─── Write Output ───────────────────────────────────────────────────────────────
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

Packer.toBuffer(doc).then((buffer) => {
  writeFileSync(OUT_FILE, buffer);
  console.log(`\n✅  Generated: ${OUT_FILE}\n`);
});
