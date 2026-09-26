/**
 * Shared (client + server) contract for staged uploads.
 *
 * Vercel functions reject request bodies over 4.5 MB, so files are uploaded
 * from the browser straight to the `upload-staging` bucket and the FormData
 * sent to the API carries a reference in their place. See
 * `stageFormDataFiles` (client) and `resolveStagedFormData` (server).
 */

export const UPLOAD_STAGING_BUCKET = 'upload-staging';

/** Matches the bucket's `file_size_limit`. Destination routes enforce their own, lower limits. */
export const UPLOAD_STAGING_MAX_FILE_SIZE = 50 * 1024 * 1024;

export const UPLOAD_STAGING_MAX_FILES = 50;

/**
 * A staged file replaces `formData.append(field, file)` with
 * `formData.append(STAGED_FIELD_PREFIX + field, JSON.stringify(ref))`, keeping
 * its position so routes that pair files with other fields by index still work.
 */
export const STAGED_FIELD_PREFIX = '__staged__:';

export interface StagedFileReference {
  path: string;
  name: string;
  type: string;
}
