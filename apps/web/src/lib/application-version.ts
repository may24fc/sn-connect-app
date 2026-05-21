import { generatedApplicationUpdateSummary } from '@/lib/generated/application-update-summary.generated';

export interface ApplicationVersionPayload {
  version: string;
  generatedAt: string;
  summaryTitle: string;
  summaryItems: string[];
}

const localDeploymentVersion = `local-${process.env.npm_package_version ?? 'development'}`;
const DEFAULT_SUMMARY_TITLE = "What's new in SN Connect";
const DEFAULT_SUMMARY_ITEMS = generatedApplicationUpdateSummary.items;

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

export async function getApplicationVersionPayload(): Promise<ApplicationVersionPayload> {
  const configuredTitle = process.env.APP_UPDATE_SUMMARY_TITLE?.trim();
  const configuredItems = parseSummaryItems(process.env.APP_UPDATE_SUMMARY?.trim());

  return {
    version: resolveApplicationVersion(),
    generatedAt: new Date().toISOString(),
    summaryTitle:
      configuredTitle || generatedApplicationUpdateSummary.title || DEFAULT_SUMMARY_TITLE,
    summaryItems:
      configuredItems.length > 0
        ? configuredItems
        : DEFAULT_SUMMARY_ITEMS,
  };
}