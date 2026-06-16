type MuxResourceType = 'video' | 'document' | 'image' | 'link' | 'presentation' | 'interactive';

const MUX_API_BASE = 'https://api.mux.com/video/v1';

function getMuxCredentials(): { tokenId: string; tokenSecret: string } | null {
  const tokenId = process.env.MUX_TOKEN_ID?.trim() ?? '';
  const tokenSecret = process.env.MUX_TOKEN_SECRET?.trim() ?? '';

  if (!tokenId || !tokenSecret) {
    return null;
  }

  return { tokenId, tokenSecret };
}

function buildMuxAuthHeader(credentials: { tokenId: string; tokenSecret: string }): string {
  const value = Buffer.from(`${credentials.tokenId}:${credentials.tokenSecret}`).toString('base64');
  return `Basic ${value}`;
}

export function isMuxConfigured(): boolean {
  return getMuxCredentials() !== null;
}

export function mapMimeTypeToResourceType(mimeType?: string | null): MuxResourceType {
  if (!mimeType) return 'document';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  if (
    mimeType === 'application/vnd.ms-powerpoint' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return 'presentation';
  }
  return 'document';
}

export function isVideoMimeType(mimeType?: string | null): boolean {
  return (mimeType ?? '').startsWith('video/');
}

export function isMuxUploadPath(filePath?: string | null): boolean {
  return (filePath ?? '').startsWith('mux-upload:');
}

export function extractMuxUploadId(filePath?: string | null): string | null {
  if (!isMuxUploadPath(filePath)) return null;
  return (filePath ?? '').slice('mux-upload:'.length) || null;
}

export function buildMuxPlaybackUrls(playbackId: string): {
  streamUrl: string;
  thumbnailUrl: string;
} {
  return {
    streamUrl: `https://stream.mux.com/${playbackId}.m3u8`,
    thumbnailUrl: `https://image.mux.com/${playbackId}/thumbnail.jpg`,
  };
}

export async function createMuxDirectUpload(params: {
  contentType: string;
  fileName: string;
}): Promise<{ uploadId: string; uploadUrl: string }> {
  const credentials = getMuxCredentials();
  if (!credentials) {
    throw new Error('Mux is not configured');
  }

  const corsOrigin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.APP_URL?.trim() || undefined;

  const response = await fetch(`${MUX_API_BASE}/uploads`, {
    method: 'POST',
    headers: {
      Authorization: buildMuxAuthHeader(credentials),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cors_origin: corsOrigin,
      new_asset_settings: {
        playback_policy: ['public'],
        mp4_support: 'standard',
        passthrough: JSON.stringify({
          source: 'resources_upload',
          fileName: params.fileName,
          contentType: params.contentType,
        }),
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { data?: { id?: string; url?: string } }
    | null;

  const uploadId = payload?.data?.id;
  const uploadUrl = payload?.data?.url;

  if (!response.ok || !uploadId || !uploadUrl) {
    throw new Error('Failed to create Mux direct upload URL');
  }

  return { uploadId, uploadUrl };
}

export async function uploadFileToMux(uploadUrl: string, file: File): Promise<void> {
  const buffer = Buffer.from(await file.arrayBuffer());

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: buffer,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to upload file data to Mux');
  }
}
