const PRODUCTION_APP_URL = 'https://app.sngroup.com.au';
const PRODUCTION_PUBLIC_SITE_URL = 'https://www.sngroup.com.au';
const LOCAL_APP_URL = 'http://localhost:3001';
const LOCAL_PUBLIC_SITE_URL = 'http://localhost:3000';

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