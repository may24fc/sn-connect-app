import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface ApplicationVersionPayload {
  version: string;
  generatedAt: string;
  summaryTitle: string;
  summaryItems: string[];
}

const localDeploymentVersion = `local-${process.env.npm_package_version ?? 'development'}`;
const DEFAULT_SUMMARY_TITLE = "What's new in SN Connect";
const DEFAULT_SUMMARY_ITEMS = [
  'Improved portal performance across dashboards and shared layouts.',
  'Refined deployment update handling so new builds are easier to review before refresh.',
  'Applied stability fixes for report and navigation flows.',
];
const MAX_SUMMARY_ITEMS = 5;
const CHANGELOG_CANDIDATE_PATHS = [
  path.resolve(process.cwd(), 'CHANGELOG.md'),
  path.resolve(process.cwd(), '..', 'CHANGELOG.md'),
  path.resolve(process.cwd(), '..', '..', 'CHANGELOG.md'),
];

interface ApplicationVersionSummary {
  title: string;
  items: string[];
}

interface ParsedChangelogEntry {
  subheading: string;
  label: string;
  detail: string;
  normalized: string;
}

interface SummaryRule {
  key: string;
  priority: number;
  matcher: RegExp;
  text: string;
}

const SUMMARY_RULES: SummaryRule[] = [
  {
    key: 'ticketing',
    priority: 100,
    matcher: /ticketing system/i,
    text: 'A new ticketing workspace makes it easier to submit, assign, and track requests in one place.',
  },
  {
    key: 'ai-experience',
    priority: 96,
    matcher: /ai conversation history|ai chatbot suggestions|ai chat citations/i,
    text: 'The AI assistant is easier to return to, with saved conversations, smarter prompts, and clearer answer context.',
  },
  {
    key: 'insights',
    priority: 94,
    matcher: /company pulse pages|companypulse widget|report analytics|admin activity log|activity\/audit log|team performance view|milestone banner/i,
    text: 'New analytics and activity views give teams clearer visibility into progress, trends, and important updates.',
  },
  {
    key: 'workflow',
    priority: 92,
    matcher: /checklist templates|admin onboarding detail|onboarding task submissions|probation state machine|internship end\/hire actions|offboarding api|applications hire|task proofs|kpi evidence attachments|intern daily log/i,
    text: 'Checklist, onboarding, and follow-through workflows are easier to manage with clearer review steps and submission tools.',
  },
  {
    key: 'guidance',
    priority: 90,
    matcher: /tour system|help center|auth root redirect/i,
    text: 'Getting around the portal is smoother, with better guidance, a cleaner first-run tour, and fewer navigation interruptions.',
  },
  {
    key: 'content-management',
    priority: 82,
    matcher: /announcement starring|announcement archive\/restore|jobs archive\/restore|resources archive\/restore/i,
    text: 'Teams can organize important content more easily with new options to star, archive, and restore key items.',
  },
  {
    key: 'recruitment',
    priority: 78,
    matcher: /recruitment pipeline/i,
    text: 'Recruitment tracking is easier with a dedicated pipeline view for following hiring progress.',
  },
  {
    key: 'design-refresh',
    priority: 74,
    matcher: /design system/i,
    text: 'The portal interface has been refreshed for a cleaner, more polished day-to-day experience.',
  },
];

const TECHNICAL_ENTRY_LABELS = [
  /^rls:/i,
  /health check endpoint/i,
  /inngest integration/i,
  /cron probation check/i,
  /countbadge primitive/i,
  /submission notification types/i,
  /offboarding tables repair/i,
  /admin banking tools/i,
  /emptystate consolidation/i,
  /wise payment gateway/i,
  /kpi scale rating/i,
  /google drive webhook/i,
  /edge function security hardening/i,
  /custom smtp/i,
  /package readmes/i,
];

let changelogSummaryPromise: Promise<ApplicationVersionSummary> | null = null;

function resolveApplicationVersion(): string {
  return (
    process.env.VERCEL_DEPLOYMENT_ID ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.VERCEL_URL ??
    localDeploymentVersion
  );
}

function parseSummaryItems(rawSummary?: string): string[] {
  if (!rawSummary) {
    return [];
  }

  return rawSummary
    .split(/\r?\n|\|/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function createSummaryTitle(sectionName: string, sectionDate?: string): string {
  if (sectionName === 'Unreleased') {
    return DEFAULT_SUMMARY_TITLE;
  }

  return sectionDate
    ? `${DEFAULT_SUMMARY_TITLE} ${sectionName} (${sectionDate})`
    : `${DEFAULT_SUMMARY_TITLE} ${sectionName}`;
}

function parseChangelogEntry(line: string, subheading: string): ParsedChangelogEntry | null {
  const bullet = line.slice(2).trim();

  if (!bullet) {
    return null;
  }

  const emphasizedMatch = bullet.match(/^\*\*(.+?)\*\*\s+—\s+(.+)$/);
  const strippedBullet = stripMarkdown(bullet);
  const [fallbackLabel, fallbackDetail] = strippedBullet.split(/\s+—\s+/, 2);
  const label = stripMarkdown(emphasizedMatch?.[1] ?? fallbackLabel ?? subheading);
  const detail = stripMarkdown(emphasizedMatch?.[2] ?? fallbackDetail ?? strippedBullet);

  if (!label || !detail) {
    return null;
  }

  return {
    subheading,
    label,
    detail,
    normalized: `${subheading} ${label} ${detail}`.toLowerCase(),
  };
}

function isTechnicalEntry(entry: ParsedChangelogEntry): boolean {
  return TECHNICAL_ENTRY_LABELS.some((pattern) => pattern.test(entry.label));
}

function createGenericSummaryItem(entry: ParsedChangelogEntry): string | null {
  if (isTechnicalEntry(entry)) {
    return null;
  }

  const label = entry.label.trim();

  if (!label || label.length > 80) {
    return null;
  }

  if (entry.subheading === 'Removed') {
    return `${label} has been retired to keep the portal more focused and easier to navigate.`;
  }

  if (entry.subheading === 'Changed') {
    return `${label} has been improved to make day-to-day work smoother.`;
  }

  return `${label} is now available in SN Connect.`;
}

function createUserFacingSummary(entries: ParsedChangelogEntry[]): string[] {
  const items = SUMMARY_RULES
    .filter((rule) => entries.some((entry) => rule.matcher.test(entry.label)))
    .sort((left, right) => right.priority - left.priority)
    .map((rule) => rule.text);

  const seen = new Set(items.map((item) => item.toLowerCase()));

  for (const entry of entries) {
    if (items.length >= MAX_SUMMARY_ITEMS) {
      break;
    }

    const genericItem = createGenericSummaryItem(entry);

    if (!genericItem) {
      continue;
    }

    const dedupeKey = genericItem.toLowerCase();

    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    items.push(genericItem);
  }

  return items.slice(0, MAX_SUMMARY_ITEMS);
}

function parseChangelogSummary(content: string): ApplicationVersionSummary {
  const lines = content.split(/\r?\n/);
  let sectionName: string | null = null;
  let sectionDate: string | undefined;
  let currentSubheading = 'Changes';
  const entries: ParsedChangelogEntry[] = [];

  for (const line of lines) {
    if (!sectionName) {
      const sectionMatch = line.match(/^## \[(.+?)\](?:\s+—\s+(.+))?$/);

      if (sectionMatch) {
        const [, matchedSectionName, matchedSectionDate] = sectionMatch;

        if (matchedSectionName) {
          sectionName = matchedSectionName.trim();
          sectionDate = matchedSectionDate?.trim();
        }
      }

      continue;
    }

    if (line.startsWith('## ')) {
      break;
    }

    if (line.startsWith('### ')) {
      currentSubheading = line.slice(4).trim();
      continue;
    }

    if (!line.startsWith('- ')) {
      continue;
    }

    const entry = parseChangelogEntry(line, currentSubheading);

    if (!entry) {
      continue;
    }

    entries.push(entry);

    if (entries.length >= 16) {
      break;
    }
  }

  const items = createUserFacingSummary(entries);

  if (!sectionName || items.length === 0) {
    return {
      title: DEFAULT_SUMMARY_TITLE,
      items: DEFAULT_SUMMARY_ITEMS,
    };
  }

  return {
    title: createSummaryTitle(sectionName, sectionDate),
    items,
  };
}

async function resolveChangelogSummary(): Promise<ApplicationVersionSummary> {
  if (!changelogSummaryPromise) {
    changelogSummaryPromise = (async () => {
      for (const changelogPath of CHANGELOG_CANDIDATE_PATHS) {
        try {
          const changelog = await readFile(changelogPath, 'utf8');
          return parseChangelogSummary(changelog);
        } catch {
          continue;
        }
      }

      return {
        title: DEFAULT_SUMMARY_TITLE,
        items: DEFAULT_SUMMARY_ITEMS,
      };
    })();
  }

  return changelogSummaryPromise;
}

export async function getApplicationVersionPayload(): Promise<ApplicationVersionPayload> {
  const configuredTitle = process.env.APP_UPDATE_SUMMARY_TITLE?.trim();
  const configuredItems = parseSummaryItems(process.env.APP_UPDATE_SUMMARY?.trim());
  const changelogSummary = configuredItems.length > 0 ? null : await resolveChangelogSummary();

  return {
    version: resolveApplicationVersion(),
    generatedAt: new Date().toISOString(),
    summaryTitle:
      configuredTitle || changelogSummary?.title || DEFAULT_SUMMARY_TITLE,
    summaryItems:
      configuredItems.length > 0
        ? configuredItems
        : changelogSummary?.items || DEFAULT_SUMMARY_ITEMS,
  };
}