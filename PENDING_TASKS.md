# SN HR Portal - Pending Tasks & Next Steps

**Last Updated:** February 11, 2026  
**Current Phase:** Phase 1 - Backend Foundation (In Progress)

---

## 📋 Overview

This document tracks all pending tasks and recommendations for completing the HR Portal implementation based on completed work in sections 1.5 (Employee API), 1.6 (Documents API), and 1.7 (Departments API).

---

## 🔴 Critical Path - Must Complete Before Production

### 1. Supabase Storage Bucket Configuration
**Status:** ⏳ BLOCKED (Requires Manual Setup)  
**Estimated Effort:** 15 minutes  
**Assigned to:** DevOps/Database Admin

**What's Missing:**
- Storage bucket `employee-documents` not yet created
- RLS policies for file access not configured
- File upload endpoints will fail without this

**Action Items:**
- [ ] Create Supabase Storage bucket named `employee-documents`
- [ ] Set max file size to 10MB
- [ ] Configure 3 RLS policies (user read/write own, admin full access)
- [ ] Test with sample file upload
- [ ] Verify signed URL generation works

**Reference:** See "Supabase Storage Bucket Configuration Steps" above

---

### 2. Profile Page Emergency Contact Tab
**Status:** ⏳ IN PROGRESS  
**Estimated Effort:** 1-2 hours  
**Assigned to:** Frontend Developer

**What's Done:**
- Personal information tab integrated with real data
- Phone and contact information fields bound to database

**What's Missing:**
- Emergency contact tab still uses mock data structure
- Fields don't match Employee database schema
- Missing form state management

**Action Items:**
- [ ] Update emergency contact form to use employee data:
  - `emergency_contact_name` (mapped)
  - `emergency_contact_number` (mapped)
  - Remove fields not in database schema: `relationship`, `email`, `address`
- [ ] Add form validation using existing Zod schema
- [ ] Test form submission and data persistence
- [ ] Add success/error toast notifications

**File:** `apps/web/src/app/(employee)/profile/page.tsx` (lines ~310-380)

---

### 3. Environment Variable Documentation
**Status:** ⏳ TO DO  
**Estimated Effort:** 30 minutes  

**What's Missing:**
- `.env.local` example not documented
- Required vs optional variables unclear
- Developers don't know what to set up locally

**Action Items:**
- [ ] Create `.env.example` with all required variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_url_here
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
  NEXT_PUBLIC_ENABLE_MOCK_AUTH=false
  NEXT_PUBLIC_ROLE_MAPPING_MODE=option-a
  ```
- [ ] Update `docs/ENVIRONMENT.md` with setup instructions
- [ ] Document all environment variables in setup guide
- [ ] Add note about local Supabase development

---

## 🟡 High Priority - Near-Term (Week 1-2)

### 4. Unit Tests for Hooks
**Status:** ⏳ TO DO  
**Estimated Effort:** 4-6 hours  
**Assigned to:** QA/Test Engineer

**What's Done:**
- All hooks implemented with proper TanStack Query integration

**What's Missing:**
- No unit tests for employee hooks
- No tests for document upload/download flows
- No tests for department hooks

**Action Items:**
- [ ] Create `tests/hooks/useEmployees.test.ts`:
  - Test `useEmployees` with filters and pagination
  - Test `useEmployee` with valid/invalid IDs
  - Test `useCreateEmployee` with validation
  - Test `useUpdateEmployee` with partial updates
  - Test `useDeleteEmployee` soft delete behavior
- [ ] Create `tests/hooks/useDocuments.test.ts`:
  - Test `useDocuments` filtering by employee/type
  - Test `useUploadDocument` with file validation
  - Test `useDownloadDocument` URL generation
  - Test error handling (file too large, invalid type)
- [ ] Create `tests/hooks/useDepartments.test.ts`:
  - Test list with pagination
  - Test creation with duplicate name handling
- [ ] Achieve minimum 80% code coverage for hooks

**Files to Create:**
- `tests/hooks/useEmployees.test.ts`
- `tests/hooks/useDocuments.test.ts`
- `tests/hooks/useDepartments.test.ts`

---

### 5. E2E Tests for API Routes
**Status:** ⏳ TO DO  
**Estimated Effort:** 6-8 hours  
**Assigned to:** QA/Test Engineer

**What's Done:**
- Auth E2E tests exist in `e2e/auth.spec.ts`

**What's Missing:**
- No E2E tests for employee CRUD operations
- No E2E tests for document upload/download
- No E2E tests for department management

**Action Items:**
- [ ] Create `e2e/employees.spec.ts`:
  - Test employee list with filters
  - Test employee profile view/edit
  - Test create employee (admin only)
  - Test soft delete (super_admin only)
- [ ] Create `e2e/documents.spec.ts`:
  - Test document upload flow
  - Test document download
  - Test access control (can't access others' docs)
  - Test file size validation
- [ ] Create `e2e/departments.spec.ts`:
  - Test department list
  - Test create department (admin only)
  - Test duplicate name error handling
- [ ] Run tests in CI/CD pipeline

---

### 6. Document Status/Approval Workflow
**Status:** ⏳ TO DO  
**Estimated Effort:** 8-10 hours  

**What's Missing:**
- Documents are just stored with no review process
- HR/Admins can't approve/reject documents
- No document status tracking (draft, pending, approved, rejected)
- No way to request document reupload

**Recommended Addition:**
- Add `status` field to documents table
- Create `/api/documents/[id]/approve` and `/api/documents/[id]/reject` endpoints
- Add admin dashboard for document review
- Add notifications when document status changes

**Database Changes Needed:**
```sql
ALTER TABLE public.documents 
ADD COLUMN status text DEFAULT 'pending'; -- pending, approved, rejected
ADD COLUMN review_notes text;
ADD COLUMN reviewed_by uuid REFERENCES public.users(id);
ADD COLUMN reviewed_at timestamptz;
```

---

### 7. File Type Validation Enhancement
**Status:** 🟡 PARTIALLY DONE  
**Estimated Effort:** 2 hours  

**What's Done:**
- Basic MIME type validation in upload route
- File size limit (10MB) enforced

**What's Missing:**
- No virus scanning integration
- No malware detection
- No PDF content validation
- Limited file type support

**Recommended Additions:**
- [ ] Integrate ClamAV or similar for virus scanning
- [ ] Verify PDF file compatibility
- [ ] Add support for more document types (PPT, etc.)
- [ ] Add file integrity checksums
- [ ] Log all upload attempts for audit trail

---

## 🟢 Medium Priority - Sprint 2-3

### 8. Profile Picture Upload
**Status:** ⏳ TO DO  
**Estimated Effort:** 3-4 hours  

**What's Done:**
- Avatar UI component with camera icon placeholder

**What's Missing:**
- No backend for profile picture storage
- Upload endpoint not created
- No image processing (resize, crop, optimize)

**Action Items:**
- [ ] Create dedicated `profile-pictures` storage bucket
- [ ] Create `/api/profile-picture/upload` endpoint
- [ ] Implement image resizing (thumbnail + full)
- [ ] Add image optimization (webp conversion)
- [ ] Update employee profile page to use real picture

---

### 9. Document Filters & Search
**Status:** ⏳ PARTIAL (API Only)  
**Estimated Effort:** 2-3 hours  

**What's Done:**
- API supports search, document type, and confidential filters
- Query keys support all filters

**What's Missing:**
- Files page doesn't expose all filter options
- No advanced search interface
- No saved filter preferences

**Action Items:**
- [ ] Add filter UI to files page (document type, date range)
- [ ] Add saved filter preferences
- [ ] Implement full-text search on file names
- [ ] Add sorting options (date, name, size)

---

### 10. Bulk Document Operations
**Status:** ⏳ TO DO  
**Estimated Effort:** 4-5 hours  

**What's Missing:**
- Can't bulk update documents (mark multiple as confidential)
- No bulk delete capability
- No bulk export to ZIP
- No batch operations

**Recommended Addition:**
- [ ] Add checkbox selection to document list
- [ ] Create bulk action toolbar
- [ ] Implement batch update/delete endpoints
- [ ] Add bulk export to ZIP feature
- [ ] Add undo capability for bulk operations

---

### 11. Department Management Page
**Status:** ⏳ TO DO  
**Estimated Effort:** 4-6 hours  

**What's Missing:**
- Departments API exists but no admin UI
- Can't create/edit/delete departments via dashboard
- No department employee count display

**Action Items:**
- [ ] Create `/admin/departments` page
- [ ] Add table with department list
- [ ] Add create/edit/delete dialogs
- [ ] Show employee count per department
- [ ] Add department head assignment
- [ ] Add bulk actions (export, archive)

---

### 12. Employee Export to CSV/Excel
**Status:** ⏳ TO DO  
**Estimated Effort:** 3-4 hours  

**What's Missing:**
- No way to bulk export employee data
- No CSV/Excel export functionality
- No scheduled exports

**Action Items:**
- [ ] Create CSV export utility in `apps/web/src/lib/csv.ts`
- [ ] Add export button to employees admin page
- [ ] Support filtering export (by department, status, etc.)
- [ ] Add scheduled export (daily/weekly reports)

---

## 🔵 Lower Priority - Sprint 4+

### 13. Document Versioning
**Status:** ⏳ TO DO  
**Estimated Effort:** 6-8 hours  

**What's Missing:**
- Documents can be overwritten without backup
- No version history
- Can't restore previous versions

**Recommended Addition:**
- Add `version_number` and `parent_document_id` to documents table
- Keep all versions (don't delete on replace)
- Show version history UI
- Allow rollback to previous version

---

### 14. Document Sharing & Download Links
**Status:** ⏳ TO DO  
**Estimated Effort:** 3-4 hours  

**What's Missing:**
- Can only access your own documents
- No way to share with specific users
- No expiring share links

**Recommended Addition:**
- Create separate table for document shares
- Add share endpoint with permission levels
- Support time-limited share links
- Add share audit logging

---

### 15. Mobile Optimization
**Status:** ⏳ TO DO  
**Estimated Effort:** 4-5 hours  

**What's Missing:**
- Files page not optimized for small screens
- Profile page layout breaks on mobile
- File upload UI doesn't work well on mobile

**Action Items:**
- [ ] Test responsive design on mobile devices
- [ ] Optimize touch targets (buttons, inputs)
- [ ] Implement mobile-friendly file picker
- [ ] Test file upload on slow connections
- [ ] Add offline queue for uploads

---

### 16. Performance Optimization
**Status:** 🔵 FUTURE  
**Estimated Effort:** 4-6 hours  

**Optimization Opportunities:**
- [ ] Implement image lazy loading for documents
- [ ] Add pagination to document list
- [ ] Implement virtual scrolling for large lists
- [ ] Cache employee/department lists locally
- [ ] Optimize bundle size (remove unused code)
- [ ] Implement service workers for offline access

---

## ✅ Completed in This Sprint

- [x] Employee API routes (GET list, GET detail, POST, PATCH, DELETE)
- [x] Employee hooks with TanStack Query integration
- [x] Profile page integration with real employee data
- [x] Documents API routes (GET list, POST metadata, upload, download)
- [x] Document upload with file validation
- [x] Document download with signed URLs
- [x] Document hooks with file operations
- [x] Files page integration with real documents
- [x] Departments API routes
- [x] Department hooks
- [x] Query keys factory updates
- [x] TypeScript type safety and error fixes

---

## 📊 Progress Summary

| Area | Status | % Complete |
|------|--------|-----------|
| Phase 1.5 (Employee API) | ✅ Complete | 100% |
| Phase 1.6 (Documents API) | ✅ Complete* | 90% |
| Phase 1.7 (Departments API) | ✅ Complete | 100% |
| Testing | 🔴 Not Started | 0% |
| Storage Configuration | 🟡 Pending | 0% |
| Documentation | 🟢 Partial | 60% |
| Mobile & Performance | 🔵 Future | - |

*Awaiting Supabase Storage bucket configuration

---

## 🚀 Recommended Next Steps (Priority Order)

1. **IMMEDIATE** - Configure Supabase Storage bucket (blocking deployment)
2. **THIS WEEK** - Fix profile emergency contact tab
3. **THIS WEEK** - Create environment variable documentation
4. **NEXT SPRINT** - Write unit tests for all hooks (80%+ coverage)
5. **NEXT SPRINT** - Write E2E tests for API routes
6. **SPRINT 3** - Implement document approval workflow
7. **SPRINT 3** - Create admin department management page
8. **ONGOING** - Performance optimization and mobile testing

---

## 📝 Notes

- All APIs follow RESTful conventions with proper HTTP methods
- RLS policies are enforced at the database level for security
- TanStack Query handles caching and cache invalidation
- Error handling is comprehensive with user-friendly messages
- Type safety is maintained throughout with TypeScript branded types

---

## 🔗 Related Documentation

- See `docs/sn-management-setup.md` for overall implementation checklist
- See `docs/adr/ADR-001-role-mapping.md` for role system design
- See `docs/ENVIRONMENT.md` for environment setup guide
- See README files in each package for specific setup instructions

---

## 📞 Questions?

For questions about specific implementations, refer to:
- API routes in `apps/web/src/app/api/`
- Hooks in `apps/web/src/hooks/`
- Database types in `packages/database/src/database.types.ts`
- Query keys in `apps/web/src/lib/query-keys.ts`
