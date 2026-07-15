/**
 * generate-implementation-checklist.mjs
 *
 * Generates docs/Implementation-Checklist-SN-Connect.docx
 * Run: node scripts/generate-implementation-checklist.mjs
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
  PageBreak,
  ShadingType,
  VerticalAlign,
  convertInchesToTwip,
} from "docx";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "docs");
const OUT_FILE = join(OUT_DIR, "Implementation-Checklist-SN-Connect.docx");

// ─── Color Palette ────────────────────────────────────────────────────────────
const COLOR = {
  INDIGO: "4F46E5",
  INDIGO_LIGHT: "EEF2FF",
  ZINC_900: "18181B",
  ZINC_700: "3F3F46",
  ZINC_500: "71717A",
  ZINC_200: "E4E4E7",
  ZINC_100: "F4F4F5",
  WHITE: "FFFFFF",
  AMBER: "D97706",
  AMBER_LIGHT: "FEF3C7",
  GREEN: "16A34A",
  GREEN_LIGHT: "DCFCE7",
};

// ─── Typography helpers ───────────────────────────────────────────────────────
const pt = (n) => n * 2; // half-points (docx unit)

function coverTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: pt(6), after: pt(4) },
    children: [
      new TextRun({
        text,
        bold: true,
        size: pt(28),
        color: COLOR.INDIGO,
        font: "Calibri",
      }),
    ],
  });
}

function coverSubtitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: pt(2), after: pt(2) },
    children: [
      new TextRun({
        text,
        size: pt(13),
        color: COLOR.ZINC_500,
        font: "Calibri",
        italics: true,
      }),
    ],
  });
}

function coverMeta(label, value) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: pt(1), after: pt(1) },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: pt(11), font: "Calibri", color: COLOR.ZINC_700 }),
      new TextRun({ text: value, size: pt(11), font: "Calibri", color: COLOR.ZINC_500 }),
    ],
  });
}

function divider() {
  return new Paragraph({
    border: { bottom: { color: COLOR.ZINC_200, space: 1, style: BorderStyle.SINGLE, size: 6 } },
    spacing: { before: pt(4), after: pt(4) },
    children: [],
  });
}

function weekHeader(week, title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: pt(8), after: pt(3) },
    shading: { type: ShadingType.SOLID, color: COLOR.INDIGO, fill: COLOR.INDIGO },
    children: [
      new TextRun({
        text: `  ${week}  ·  ${title}`,
        bold: true,
        size: pt(16),
        color: COLOR.WHITE,
        font: "Calibri",
      }),
    ],
  });
}

function phaseGoalBlock(text) {
  return new Paragraph({
    spacing: { before: pt(3), after: pt(4) },
    shading: { type: ShadingType.SOLID, color: COLOR.INDIGO_LIGHT, fill: COLOR.INDIGO_LIGHT },
    children: [
      new TextRun({ text: "Phase Goal:  ", bold: true, size: pt(11), font: "Calibri", color: COLOR.INDIGO }),
      new TextRun({ text, size: pt(11), font: "Calibri", color: COLOR.ZINC_700 }),
    ],
  });
}

function sectionLabel(text) {
  return new Paragraph({
    spacing: { before: pt(5), after: pt(2) },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: pt(10),
        font: "Calibri",
        color: COLOR.INDIGO,
        allCaps: true,
      }),
    ],
  });
}

function doDHeader() {
  return new Paragraph({
    spacing: { before: pt(5), after: pt(2) },
    shading: { type: ShadingType.SOLID, color: COLOR.ZINC_900, fill: COLOR.ZINC_900 },
    children: [
      new TextRun({
        text: "  ✔  DEFINITION OF DONE",
        bold: true,
        size: pt(11),
        font: "Calibri",
        color: COLOR.WHITE,
      }),
    ],
  });
}

function doDItem(text) {
  return new Paragraph({
    spacing: { before: pt(1), after: pt(1) },
    indent: { left: convertInchesToTwip(0.25) },
    children: [
      new TextRun({ text: "☐  ", size: pt(11), font: "Calibri", color: COLOR.INDIGO }),
      new TextRun({ text, size: pt(11), font: "Calibri", color: COLOR.ZINC_700 }),
    ],
  });
}

function spacer(lines = 1) {
  return Array.from({ length: lines }, () =>
    new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: "" })] })
  );
}

// ─── Task Table ───────────────────────────────────────────────────────────────
function taskTable(rows) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      tableCell("#", "8%", true, COLOR.INDIGO, COLOR.WHITE),
      tableCell("Task", "30%", true, COLOR.INDIGO, COLOR.WHITE),
      tableCell("Technical Detail", "62%", true, COLOR.INDIGO, COLOR.WHITE),
    ],
  });

  const dataRows = rows.map(([num, task, detail], i) =>
    new TableRow({
      children: [
        tableCell(num, "8%", false, i % 2 === 0 ? COLOR.WHITE : COLOR.ZINC_100),
        tableCell(task, "30%", true, i % 2 === 0 ? COLOR.WHITE : COLOR.ZINC_100),
        tableCell(detail, "62%", false, i % 2 === 0 ? COLOR.WHITE : COLOR.ZINC_100),
      ],
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideH: { style: BorderStyle.SINGLE, size: 2, color: COLOR.ZINC_200 },
      insideV: { style: BorderStyle.NONE },
    },
    rows: [headerRow, ...dataRows],
  });
}

function tableCell(text, width, bold = false, bgColor = COLOR.WHITE, textColor = COLOR.ZINC_700) {
  return new TableCell({
    width: { size: parseInt(width), type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.SOLID, color: bgColor, fill: bgColor },
    verticalAlign: VerticalAlign.CENTER,
    margins: {
      top: convertInchesToTwip(0.05),
      bottom: convertInchesToTwip(0.05),
      left: convertInchesToTwip(0.08),
      right: convertInchesToTwip(0.08),
    },
    children: [
      new Paragraph({
        spacing: { before: pt(1), after: pt(1) },
        children: [
          new TextRun({
            text,
            bold,
            size: pt(10),
            font: "Calibri",
            color: textColor,
          }),
        ],
      }),
    ],
  });
}

// ─── Sub-section header (for Week 4 phases) ─────────────────────────────────
function subSection(text) {
  return new Paragraph({
    spacing: { before: pt(5), after: pt(2) },
    shading: { type: ShadingType.SOLID, color: COLOR.ZINC_100, fill: COLOR.ZINC_100 },
    children: [
      new TextRun({
        text: `  ${text}`,
        bold: true,
        size: pt(11),
        font: "Calibri",
        color: COLOR.ZINC_900,
      }),
    ],
  });
}

// ─── Document sections ───────────────────────────────────────────────────────

// COVER PAGE
const coverSection = [
  ...spacer(4),
  coverTitle("CONTROL HUB — FEATURE REFINEMENT"),
  coverTitle("IMPLEMENTATION CHECKLIST"),
  ...spacer(1),
  coverSubtitle("4-Week Sprint Plan  ·  Technical Architecture Aligned"),
  ...spacer(2),
  divider(),
  ...spacer(1),
  coverMeta("Product", "Control Hub HR Portal"),
  coverMeta("Stack", "Next.js 15  ·  TypeScript  ·  Supabase  ·  n8n  ·  OpenAI"),
  coverMeta("Sprint Start", "Week of May 5, 2026"),
  coverMeta("Prepared By", "AI Project Management & Technical Architecture Office"),
  coverMeta("Version", "1.0"),
  ...spacer(1),
  divider(),
  ...spacer(2),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: '"Where Policy Meets Productivity"',
        italics: true,
        size: pt(12),
        color: COLOR.ZINC_500,
        font: "Calibri",
      }),
    ],
  }),
  ...spacer(6),
  // Summary badge row
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: pt(4), after: pt(2) },
    children: [
      new TextRun({ text: "4 Sprints     22 Tasks     4 Weeks     Definition of Done per Sprint", size: pt(11), font: "Calibri", color: COLOR.INDIGO, bold: true }),
    ],
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

// WEEK 1 — Marketing Reports & Admin Dashboard
const week1Tasks = [
  ["1.1", "Refactor report API routes to RLS-scoped client", "apps/web/src/app/api/reports/route.ts currently uses an admin client to bypass RLS for cross-table joins. Refactor to use the authenticated user Supabase client; extract any admin-only aggregations into a dedicated /api/admin/reports route guarded by an explicit role check."],
  ["1.2", "Add Zod validation for review_notes field", "review_notes was introduced in migration 20260416000001 but the request schema in apps/web/src/lib/schemas/report.schema.ts lacks a corresponding field. Add review_notes: z.string().max(1000).optional() and wire it through useUpdateReport() hook."],
  ["1.3", "Fix ROAS calculation edge case (zero spend)", "ReportsAnalyticsTab.tsx computes ROAS inline. Guard against division by zero when spend = 0; surface a — placeholder in the UI cell instead of Infinity or NaN. Add the guard in apps/web/src/lib/report-utils.ts as a reusable formatROAS() utility."],
  ["1.4", "Harden RLS for report hierarchy queries", "The root_reports view and get_report_tree() function return all non-deleted reports. Add a caller-context check so get_report_tree() honours the reports_select_own_policy for non-admin roles; verify via Supabase RLS test helper in tests/."],
  ["1.5", "Polish Recharts ComposedChart responsiveness", "Remove any fixed pixel width values in ReportsAnalyticsTab.tsx; ensure all charts are wrapped in <ResponsiveContainer width='100%'>. Memoize the data array with useMemo() to prevent unnecessary re-renders on prop changes."],
  ["1.6", "Add confidence interval bands to forecast chart", "In the forecast scenarios block of ReportsAnalyticsTab.tsx, add a Recharts <ReferenceArea> between the conservative and aggressive scenario lines to visually represent the confidence band."],
  ["1.7", "Validate report_group at API boundary", "report_group is an unvalidated free-text column. Add an allowlist check (account | campaign | ad_set | ad) in the POST and PATCH handlers of apps/web/src/app/api/reports/route.ts and return HTTP 422 for unrecognized values."],
];

const week1DoD = [
  "All /api/reports routes use the authenticated user Supabase client; no admin-client bypass in non-admin routes.",
  "pnpm typecheck passes with no new errors in report.schema.ts or report-utils.ts.",
  "ROAS shows — for zero-spend rows in manual and automated tests.",
  "get_report_tree() returns only rows the calling user is entitled to see (RLS test verified).",
  "Recharts renders without layout shift at 375 px, 768 px, and 1440 px viewport widths.",
  "pnpm lint passes with no new warnings on all modified files.",
];

const week1Section = [
  weekHeader("WEEK 1", "Marketing Reports & Admin Dashboard"),
  phaseGoalBlock(
    "Harden data accuracy, tighten permission-based views, and polish the analytics visualizations so the Admin Dashboard becomes a reliable, role-consistent source of truth for marketing performance."
  ),
  sectionLabel("Detailed Tasks"),
  taskTable(week1Tasks),
  doDHeader(),
  ...week1DoD.map(doDItem),
  new Paragraph({ children: [new PageBreak()] }),
];

// WEEK 2 — EOD Associate Automation
const week2Tasks = [
  ["2.1", "Add idempotency guard to associate-eod-reminder", "supabase/functions/associate-eod-reminder/index.ts has no deduplication check. Before sending a reminder, query audit_logs for an existing intern_eod_reminder_sent entry keyed on (intern_id, date). Skip and log a skip_reason if the record exists."],
  ["2.2", "Harden n8n Schedule Trigger with retry logic", "In the n8n Schedule → HTTP POST workflow, add an Error Handler node that retries the Supabase Edge Function call up to 3 times with a 30-second delay. If all retries fail, post an alert to the designated Telegram PA Ops Hub group."],
  ["2.3", "Enforce minimum log quality checks", "In associate-weekly-summary/index.ts, before dispatching the supervisor email, validate that each internship_daily_logs entry contains hours_worked > 0 and a non-empty accomplishments field. Surface any incomplete entries as a flagged table row in the email body."],
  ["2.4", "Upgrade supervisor email to structured HTML template", "Replace the inline-string HTML in associate-weekly-summary/index.ts with a proper template: header section, metrics table (associate name, period, total hours, days logged, avg hours/day), a conditional amber warning banner when days_logged < 3, and a direct link to /admin/interns/{employee_id}."],
  ["2.5", "Add timezone-aware date calculations", "All date comparisons in both edge functions currently use UTC. Introduce a toPhilippineDate() utility that converts timestamps to Asia/Manila timezone (UTC+8) before performing same-day comparisons to prevent off-by-one errors at day boundaries."],
  ["2.6", "Write integration test for reminder deduplication", "Add a Vitest test in tests/ that seeds two active internships (one with today's log, one without), invokes the associate-eod-reminder logic directly, and asserts that exactly one notification was created and one audit_log row was written."],
];

const week2DoD = [
  "Triggering associate-eod-reminder twice on the same day results in exactly one intern_eod_reminder_sent audit entry per associate.",
  "n8n workflow shows retry node configured (3 retries, 30 s delay) and Telegram alert channel connected.",
  "Supervisor email renders correctly in Gmail and Outlook preview — screenshot attached to PR.",
  "Incomplete log entries (missing hours or accomplishments) appear as a flagged row in the weekly summary email.",
  "All date comparison tests pass for interns operating in Asia/Manila timezone.",
  "pnpm test passes for all new integration test cases.",
];

const week2Section = [
  weekHeader("WEEK 2", "EOD Associate Automation"),
  phaseGoalBlock(
    "Eliminate reliability gaps in the scheduled n8n → Edge Function pipeline, enforce log submission quality, and produce high-signal supervisor emails that require zero manual interpretation."
  ),
  sectionLabel("Detailed Tasks"),
  taskTable(week2Tasks),
  doDHeader(),
  ...week2DoD.map(doDItem),
  new Paragraph({ children: [new PageBreak()] }),
];

// WEEK 3 — AI SOP Chatbot
const week3Tasks = [
  ["3.1", "Tune match_knowledge_embeddings threshold dynamically", "The similarity threshold is hardcoded at 0.25 in apps/web/src/app/api/ai/chat/route.ts. Introduce a complexity router: use threshold=0.30 for simple factual queries (keyword-dense) and threshold=0.20 for procedural or multi-hop queries to improve recall–precision balance."],
  ["3.2", "Implement context window cap with chunk trimming", "Before injecting retrieved chunks into the system prompt, calculate total token count using tiktoken or a lightweight equivalent. If the total exceeds 6,000 tokens, drop the lowest-similarity chunks until the limit is satisfied — never silently overflow the model context window."],
  ["3.3", "Add hybrid search (vector + keyword)", "Extend the match_knowledge_embeddings() SQL function with a second-pass ts_rank full-text search on chunk_text. Merge results by weighted score: 0.7 × cosine_similarity + 0.3 × ts_rank. This improves recall for exact-term SOP queries."],
  ["3.4", "Fix citation deduplication in useAIChat.ts", "The citation parser in apps/web/src/hooks/useAIChat.ts deduplicates by sourceId only, producing duplicate display entries when the same source appears in multiple chunks. Normalize by composite key (sourceId, chunk_index) and surface only the highest-relevance instance per source."],
  ["3.5", "Refine ChatInterface.tsx chat bubble styling", "Apply consistent Tailwind classes: user bubbles right-aligned with bg-indigo-600 text-white rounded-tl-2xl; assistant bubbles left-aligned with bg-zinc-100 dark:bg-zinc-800 rounded-tr-2xl. Add an animated skeleton loader for streaming in-progress states."],
  ["3.6", "Add No context found graceful degradation", "When match_knowledge_embeddings() returns zero results, the assistant must not hallucinate. Add an explicit early-return guard in the chat route that replies: I don't have a documented answer for that yet. Please contact HR directly."],
  ["3.7", "Harden PII detection regex patterns", "Audit the existing PII regex list in apps/web/src/app/api/ai/chat/route.ts. Add patterns for Philippine TIN (\\d{3}-\\d{3}-\\d{3}-\\d{3}), PhilHealth member numbers, and SSS IDs to prevent any accidental disclosure of these identifiers via RAG context injection."],
];

const week3DoD = [
  "RAG returns zero hallucinated answers when the knowledge base has no relevant chunks — verified by sending off-topic queries in PlaygroundPanel.",
  "Context window never exceeds 6,000 tokens per query — verified by unit test asserting token count before prompt injection.",
  "Citation panel shows no duplicate sources for any test query in the ChatInterface.",
  "Chat bubbles render correctly in both light mode and dark mode — screenshots in PR.",
  "PII test cases for TIN, PhilHealth, and SSS number patterns return redacted or refused responses.",
  "pnpm typecheck passes cleanly across packages/ai/ and apps/web/src/app/api/ai/.",
];

const week3Section = [
  weekHeader("WEEK 3", "AI SOP Chatbot"),
  phaseGoalBlock(
    "Improve RAG retrieval accuracy, prevent context window overflow on long SOP documents, and refine the chat UI for clarity, citation trust, and graceful degradation when knowledge base coverage is incomplete."
  ),
  sectionLabel("Detailed Tasks"),
  taskTable(week3Tasks),
  doDHeader(),
  ...week3DoD.map(doDItem),
  new Paragraph({ children: [new PageBreak()] }),
];

// WEEK 4 — Standardized Approval Workflow
const week4DB = [
  ["4.1", "Expand approval status enum (6 states)", "Create a Supabase migration to introduce a request_status enum with values: PENDING_ENDORSEMENT, PENDING_APPROVAL, APPROVED, IMPLEMENTING, COMPLETED, REJECTED. Use ALTER TYPE ... ADD VALUE for PostgreSQL-safe enum extension."],
  ["4.2", "Create request_history audit table", "Migration: id uuid PK, request_id uuid FK, from_status, to_status, changed_by uuid FK auth.users, note text, attachment_url text, changed_at timestamptz. Enable RLS: admin-read-all + system-insert-only. This table is the immutable audit trail."],
  ["4.3", "Implement reference number generator function", "Supabase DB function generate_request_ref() returns SN-{YEAR}-{ZERO-PADDED-SEQ} using a request_sequence serial table scoped per calendar year. Sequence auto-resets annually via a pg_cron job or annual migration."],
  ["4.4", "Add endorser_id, approver_id, implementor_id columns", "Alter the requests table to add three UUID FK columns to auth.users. Update the RLS UPDATE policy so only the user whose ID matches the current gatekeeper column (per state) can advance the status at their gate — preventing horizontal privilege escalation."],
];

const week4Logic = [
  ["4.5", "Build validateTransition() state machine utility", "Create apps/web/src/lib/approval-state-machine.ts. Define a TRANSITIONS map: PENDING_ENDORSEMENT → [PENDING_APPROVAL, REJECTED]; PENDING_APPROVAL → [APPROVED, REJECTED]; APPROVED → [IMPLEMENTING]; IMPLEMENTING → [COMPLETED]. Export validateTransition(current, next): boolean."],
  ["4.6", "Create Next.js Server Action for status transitions", "POST apps/web/src/app/api/requests/[id]/transition/route.ts. Steps: (1) verify caller role matches expected actor for current state, (2) call validateTransition(), (3) INSERT row to request_history, (4) UPDATE requests.status, (5) trigger notification to next actor."],
  ["4.7", "Wire Supabase Edge Function for chain notifications", "Create or extend an Edge Function approval-notify triggered via Supabase Database Webhook on request_history INSERT. Function sends an in-app notification + Resend email to the next actor (e.g., Approver is notified once Endorser signs off)."],
  ["4.8", "Write unit tests for validateTransition()", "Vitest test suite covering: (a) valid transitions return true, (b) skip-step transitions return false (e.g., PENDING_ENDORSEMENT → COMPLETED), (c) Endorser attempting COMPLETED returns false, (d) REJECTED status cannot be transitioned."],
];

const week4UI = [
  ["4.9", "Build multi-step Submission Form", "apps/web/src/components/requests/RequestSubmissionForm.tsx — 3-step form: Step 1 (Subject, Business Unit, Details), Step 2 (select Endorser + Approver from employee dropdown), Step 3 (review and confirm). Implement with react-hook-form and a Zod schema using branded EmployeeId types."],
  ["4.10", "Build My Actions approval dashboard", "Filtered view at /admin/approvals where current_approver_id = currentUser.id AND status = expected_state_for_role. Table columns: Ref #, Subject, Requestor, Submitted Date, Priority, Action button. Role-aware: Endorsers and Approvers see different active queues."],
  ["4.11", "Build Global Tracker read-only view", "Admin/super_admin-only table of all requests. Columns: Ref #, Subject, Requestor, Current Status (colour-coded badge), Endorser, Approver, Implementor, Last Updated. Support filter by status and date range. Suitable as the centralized visibility file."],
  ["4.12", "Add Comment Thread component", "RequestCommentThread.tsx — nested list of comments from a request_comments table. Each row: author avatar, relative timestamp, and sanitized comment text. Admins and involved parties may post comments; soft-delete supported via deleted_at column."],
  ["4.13", "Add Attachment field to completion step", "In the Implementor's Mark as Completed action panel, include a file upload field (Supabase Storage bucket: request-attachments). Store the returned URL in request_history.attachment_url for the IMPLEMENTING → COMPLETED transition row as proof of implementation."],
];

const week4DoD = [
  "Unit tests: all 8 validateTransition() cases pass — pnpm test shows green.",
  "E2E path verified: Requestor submits → Endorser signs off → Approver approves → Implementor completes with attachment → Global Tracker shows COMPLETED.",
  "request_history table contains one row per status transition with correct from_status, to_status, and changed_by values.",
  "Reference numbers follow SN-2026-NNN format — verified in DB after 3 test submissions.",
  "RLS tested: a Requestor calling the transition API directly returns HTTP 403 for the Endorser and Approver steps.",
  "Comment thread renders without XSS — output-encoded, no dangerouslySetInnerHTML in any comment component.",
  "pnpm typecheck + pnpm lint pass cleanly across all new files in apps/web/src/.",
];

const week4Section = [
  weekHeader("WEEK 4", "Standardized Approval Workflow"),
  phaseGoalBlock(
    "Elevate the existing 3-state profile_change_requests flow into a production-grade multi-tier approval state machine with a full audit trail, reference numbers, role-specific dashboards, and an E2E-verified handoff: Requestor → Endorser → Approver → Implementor → Closed."
  ),
  subSection("Phase 4A — Database Schema & Security"),
  taskTable(week4DB),
  subSection("Phase 4B — Logic Layer & State Transitions"),
  taskTable(week4Logic),
  subSection("Phase 4C — UI/UX Integration"),
  taskTable(week4UI),
  doDHeader(),
  ...week4DoD.map(doDItem),
];

// ─── Assemble Document ────────────────────────────────────────────────────────
const doc = new Document({
  creator: "Control Hub Technical Architecture",
  title: "Control Hub Feature Refinement — Implementation Checklist",
  description: "4-week sprint implementation checklist for Control Hub HR Portal feature refinements",
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: pt(11), color: COLOR.ZINC_700 },
        paragraph: { spacing: { line: 276 } },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.1),
            right: convertInchesToTwip(1.1),
          },
        },
      },
      children: [
        ...coverSection,
        ...week1Section,
        ...week2Section,
        ...week3Section,
        ...week4Section,
      ],
    },
  ],
});

// ─── Write Output ─────────────────────────────────────────────────────────────
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

Packer.toBuffer(doc).then((buffer) => {
  writeFileSync(OUT_FILE, buffer);
  console.log(`\n✅  Generated: ${OUT_FILE}\n`);
});
