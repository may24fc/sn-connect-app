import { google } from 'googleapis';
import { normalizePrincipal } from './okf';

function driveClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) throw new Error('Google service account is not configured');
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return google.drive({ version: 'v3', auth });
}

export async function readExactDoc(fileId: string) {
  const drive = driveClient();
  const metadata = await drive.files.get({ fileId,
    fields: 'id,name,mimeType,modifiedTime,trashed,owners(emailAddress)', supportsAllDrives: true }, { timeout: 10_000 });
  if (metadata.data.id !== fileId || metadata.data.trashed
    || metadata.data.mimeType !== 'application/vnd.google-apps.document'
    || !metadata.data.modifiedTime) throw new Error('The configured source is unavailable');
  const exported = await drive.files.export({ fileId, mimeType: 'text/plain' }, { timeout: 10_000 });
  if (typeof exported.data !== 'string') throw new Error('Unable to export the source');
  return { title: metadata.data.name ?? 'Meeting note', text: exported.data,
    modifiedAt: metadata.data.modifiedTime,
    ownerEmail: metadata.data.owners?.[0]?.emailAddress ?? null };
}

// Chat-time freshness check: metadata only, no export. Throws if the Doc is missing, trashed or not a Doc.
export async function readDocVersion(fileId: string): Promise<string> {
  const { data } = await driveClient().files.get({ fileId,
    fields: 'id,mimeType,modifiedTime,trashed', supportsAllDrives: true }, { timeout: 10_000 });
  if (data.id !== fileId || data.trashed || data.mimeType !== 'application/vnd.google-apps.document'
    || !data.modifiedTime) throw new Error('The configured source is unavailable');
  return data.modifiedTime;
}

// Emails with a direct user permission. Throws if Google does not expose the complete ACL
// (e.g. the service account is only a Viewer, or the list is paginated); callers fail closed.
export async function listDirectUserEmails(fileId: string): Promise<Set<string>> {
  const permissions = await driveClient().permissions.list({ fileId, supportsAllDrives: true,
    fields: 'nextPageToken,permissions(type,emailAddress,role,deleted)', pageSize: 100 }, { timeout: 10_000 });
  if (permissions.data.nextPageToken) throw new Error('Incomplete ACL');
  return new Set((permissions.data.permissions ?? [])
    .filter((permission) => permission.type === 'user' && !permission.deleted && permission.role !== 'none')
    .map((permission) => normalizePrincipal(permission.emailAddress ?? '')).filter(Boolean));
}

// Only a direct user permission is accepted. Link, domain and group sharing do not count.
export async function hasCurrentDirectAccess(fileId: string, email: string): Promise<boolean> {
  return (await listDirectUserEmails(fileId)).has(normalizePrincipal(email));
}
