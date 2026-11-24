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

// Only a direct user permission is accepted. If Google does not expose the ACL, fail closed.
export async function hasCurrentDirectAccess(fileId: string, email: string): Promise<boolean> {
  const drive = driveClient();
  const permissions = await drive.permissions.list({ fileId, supportsAllDrives: true,
    fields: 'nextPageToken,permissions(type,emailAddress,role,deleted)', pageSize: 100 }, { timeout: 10_000 });
  if (permissions.data.nextPageToken) return false;
  return (permissions.data.permissions ?? []).some((permission) =>
    permission.type === 'user' && !permission.deleted
    && permission.role !== 'none' && normalizePrincipal(permission.emailAddress ?? '') === normalizePrincipal(email));
}
