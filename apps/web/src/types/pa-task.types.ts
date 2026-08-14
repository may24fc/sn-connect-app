export type PaTaskAccessLevel = 'member' | 'manager' | 'admin';

export type PaTaskLookupColor =
  | 'zinc'
  | 'sky'
  | 'amber'
  | 'rose'
  | 'emerald'
  | 'orange'
  | 'violet';

export interface PaTaskLookupItem {
  id: string;
  label: string;
  color: PaTaskLookupColor;
  sort_order: number;
  is_default: boolean;
  deleted_at: string | null;
}

export interface PaTaskStatus extends PaTaskLookupItem {
  is_terminal: boolean;
}

export type PaTaskPriority = PaTaskLookupItem;
export type PaTaskCategory = PaTaskLookupItem;

export interface PaTaskRecord {
  id: string;
  title: string;
  description: string | null;
  status_id: string;
  priority_id: string;
  category_id: string | null;
  assigned_to: string | null;
  due_date: string | null;
  date_given: string;
  blocker_reason: string | null;
  waiting_on: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PaTaskAttachment {
  id: string;
  pa_task_id: string;
  attachment_type: 'file' | 'link';
  title: string;
  url: string | null;
  storage_path: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  signed_url?: string | null;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
}

export interface PaTaskAccessGrantRecord {
  user_id: string;
  access_level: PaTaskAccessLevel;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PaTaskAssignableUser {
  userId: string;
  fullName: string | null;
  email: string | null;
  role: 'employee' | 'associate' | 'admin' | 'super_admin' | null;
  accessLevel: PaTaskAccessLevel;
}

export interface PaTaskFilters {
  search?: string;
  statusId?: string;
  priorityId?: string;
  categoryId?: string;
  assigneeId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  dateGivenFrom?: string;
  dateGivenTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'updated_at' | 'due_date' | 'date_given' | 'created_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}
