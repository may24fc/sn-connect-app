// Resource schemas
export {
  resourceSchema,
  resourceUpdateSchema,
  
  resourceStatusSchema,
  resourceIdSchema,
  userIdSchema,
  MAX_VIDEO_FILE_SIZE,
  MAX_DOCUMENT_FILE_SIZE,
  type ResourceCreateInput,
  type ResourceUpdateInput,
  
  type ResourceStatusValue,
} from './resourceSchema';

export {
  resourceFilterSchema,
  resourceSortFieldSchema,
  sortDirectionSchema,
  pageSizeSchema,
  type ResourceFilterInput,
  type ResourceSortField,
} from './resourceFilterSchema';

export {
  resourceUploadSchema,
  thumbnailUploadSchema,
  ALLOWED_MIME_TYPES,
  ALL_ALLOWED_MIME_TYPES,
  type ResourceUploadInput,
  type ThumbnailUploadInput,
} from './resourceUploadSchema';

export {
  resourceTargetingSchema,
  targetRoleSchema,
  type ResourceTargetingInput,
  type TargetRole,
} from './resourceTargetingSchema';
