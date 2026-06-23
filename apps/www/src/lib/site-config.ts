const PRODUCTION_APP_URL = 'https://app.sngroup.com.au';
const PRODUCTION_PUBLIC_SITE_URL = 'https://www.sngroup.com.au';
const LOCAL_APP_URL = 'http://localhost:3001';
const LOCAL_PUBLIC_SITE_URL = 'http://localhost:3000';
const HIDDEN_ROUTE_PREFIXES = ['/businesses', '/careers', '/life-at-sn'] as const;

function normaliseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function getDefaultUrl(productionUrl: string, localUrl: string): string {
  return process.env.NODE_ENV === 'production' ? productionUrl : localUrl;
}

function getFirstConfiguredUrl(
  candidates: Array<string | undefined>,
  fallback: string
): string {
  const configuredUrl = candidates.find(
    (candidate) => typeof candidate === 'string' && candidate.trim().length > 0
  );

  return normaliseUrl(configuredUrl ?? fallback);
}

function getOptionalConfiguredUrl(candidates: Array<string | undefined>): string | null {
  const configuredUrl = candidates.find(
    (candidate) => typeof candidate === 'string' && candidate.trim().length > 0
  );

  return configuredUrl ? normaliseUrl(extractUrlFromIframeSnippet(configuredUrl)) : null;
}

function extractUrlFromIframeSnippet(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue.toLowerCase().startsWith('<iframe')) {
    return trimmedValue;
  }

  const srcMatch = trimmedValue.match(/src=(?:"([^"]+)"|'([^']+)')/i);
  return srcMatch?.[1] ?? srcMatch?.[2] ?? trimmedValue;
}

export function getAppUrl(): string {
  return getFirstConfiguredUrl(
    [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXT_PUBLIC_PORTAL_URL],
    getDefaultUrl(PRODUCTION_APP_URL, LOCAL_APP_URL)
  );
}

export function getAppLoginUrl(): string {
  return `${getAppUrl()}/login`;
}

export function getPublicSiteUrl(): string {
  return getFirstConfiguredUrl(
    [process.env.NEXT_PUBLIC_WWW_URL],
    getDefaultUrl(PRODUCTION_PUBLIC_SITE_URL, LOCAL_PUBLIC_SITE_URL)
  );
}

const GOOGLE_APPOINTMENT_SCHEDULE_URL =
  'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3-g5R-G8Rboj0miglsqLCCy0plgqNvFEpCcswQraL9wxpLl-sT2cQeUuhlCaFiVtpDi1UWx9kG';

export function getGoogleAppointmentScheduleUrl(): string {
  return getOptionalConfiguredUrl([
    process.env.NEXT_PUBLIC_GOOGLE_APPOINTMENT_SCHEDULE_URL,
    process.env.NEXT_PUBLIC_GOOGLE_BOOKING_URL,
  ]) ?? GOOGLE_APPOINTMENT_SCHEDULE_URL;
}

export function getGoogleAppointmentEmbedUrl(): string | null {
  return getOptionalConfiguredUrl([
    process.env.NEXT_PUBLIC_GOOGLE_APPOINTMENT_EMBED_URL,
  ]);
}

export const HIDE_EXPANSION_SECTIONS =
  process.env.NEXT_PUBLIC_WWW_HIDE_EXPANSION_SECTIONS !== 'false';

export function isTemporarilyHiddenPublicPath(path: string): boolean {
  return HIDDEN_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix));
}