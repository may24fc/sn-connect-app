# Announcement Components Reference

> Audience: Developers

UI components for the announcement system — creation, filtering, preview, and analytics.

**Location:** `packages/ui/src/components/announcements/`  
**Import:** `import { AnnouncementCard, AnnouncementEditor, ... } from '@hr-portal/ui';`

---

## AnnouncementCard

List item card showing announcement title, excerpt, status badge, pin indicator, priority, category, and publish date.

```typescript
interface AnnouncementCardProps {
  announcement: Announcement;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPublish?: () => void;
  onArchive?: () => void;
  onPin?: () => void;
}
```

---

## AnnouncementDetailDialog

Full-screen dialog showing complete announcement content, attachments, and comments. Uses `Dialog` primitive.

```typescript
interface AnnouncementDetailDialogProps {
  announcement: Announcement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comments?: Comment[];
  onComment?: (text: string) => void;
}
```

---

## AnnouncementFilters

Filter bar with search, status, category, and date range controls.

```typescript
interface AnnouncementFiltersProps {
  value: AnnouncementFiltersValue;
  onChange: (value: AnnouncementFiltersValue) => void;
}

interface AnnouncementFiltersValue {
  search: string;
  status: string;
  category: string;
  dateRange?: { from: string; to: string };
}
```

---

## AnnouncementEditor

Rich text editor for creating/editing announcements. Includes title, body (markdown/rich text), category selector, and priority picker.

```typescript
interface AnnouncementEditorProps {
  initialData?: Partial<Announcement>;
  onSubmit: (data: AnnouncementFormData) => void;
  isLoading?: boolean;
}
```

---

## TargetingSelector

Audience targeting picker for announcements. Select roles and/or departments to target.

```typescript
interface TargetingSelectorProps {
  value: TargetingSelectorValue;
  onChange: (value: TargetingSelectorValue) => void;
  departments?: Department[];
}

interface TargetingSelectorValue {
  targetRoles: string[];
  targetDepartments: string[];
}
```

---

## AnnouncementPreview

Preview panel showing how the announcement will appear to readers before publishing.

```typescript
interface AnnouncementPreviewProps {
  announcement: Partial<Announcement>;
}
```

---

## AttachmentUploader

File upload component for announcement attachments. Shows progress and file list. Max 10MB per file.

```typescript
interface AttachmentUploaderProps {
  announcementId: string;
  attachments?: Attachment[];
  onUpload?: (file: File) => Promise<void>;
  onDelete?: (attachmentId: string) => void;
}
```

---

## AnnouncementAnalytics

Analytics dashboard for a single announcement showing read counts, unique readers, and time series chart.

```typescript
interface AnnouncementAnalyticsProps {
  announcementId: string;
  analytics?: {
    totalReads: number;
    uniqueReaders: number;
    timeSeries: { date: string; count: number }[];
  };
}
```

---

*Last updated: 2026-02-27*
