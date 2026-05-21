import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(SCRIPT_DIR, '..');
const CHANGELOG_PATH = path.join(WORKSPACE_ROOT, 'CHANGELOG.md');
const OUTPUT_PATH = path.join(
  WORKSPACE_ROOT,
  'apps',
  'web',
  'src',
  'lib',
  'generated',
  'application-update-summary.generated.ts',
);
const DEFAULT_SUMMARY_TITLE = "What's new in SN Connect";
const MAX_SUMMARY_ITEMS = 5;

const SUMMARY_RULES = [
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

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseChangelogEntry(line, subheading) {
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
  };
}

function isTechnicalEntry(entry) {
  return TECHNICAL_ENTRY_LABELS.some((pattern) => pattern.test(entry.label));
}

function createGenericSummaryItem(entry) {
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

function createUserFacingSummary(entries) {
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

function createSummaryTitle(sectionName, sectionDate) {
  if (sectionName === 'Unreleased') {
    return DEFAULT_SUMMARY_TITLE;
  }

  return sectionDate
    ? `${DEFAULT_SUMMARY_TITLE} ${sectionName} (${sectionDate})`
    : `${DEFAULT_SUMMARY_TITLE} ${sectionName}`;
}

function parseChangelogSummary(content) {
  const lines = content.split(/\r?\n/);
  let sectionName = null;
  let sectionDate;
  let currentSubheading = 'Changes';
  const entries = [];

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

  return {
    title: sectionName ? createSummaryTitle(sectionName, sectionDate) : DEFAULT_SUMMARY_TITLE,
    items: createUserFacingSummary(entries),
  };
}

function createModuleContent(summary) {
  return `export interface GeneratedApplicationUpdateSummary {\n  title: string;\n  items: string[];\n}\n\nexport const generatedApplicationUpdateSummary: GeneratedApplicationUpdateSummary = ${JSON.stringify(summary, null, 2)};\n`;
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  let summary;

  if (await pathExists(CHANGELOG_PATH)) {
    const changelog = await readFile(CHANGELOG_PATH, 'utf8');
    summary = parseChangelogSummary(changelog);
  } else if (await pathExists(OUTPUT_PATH)) {
    // Vercel can omit workspace-root docs from the uploaded build context.
    // Preserve the committed generated summary instead of failing prebuild.
    return;
  } else {
    summary = {
      title: DEFAULT_SUMMARY_TITLE,
      items: [],
    };
  }

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, createModuleContent(summary), 'utf8');
}

main().catch((error) => {
  console.error('Failed to generate application update summary.', error);
  process.exitCode = 1;
});