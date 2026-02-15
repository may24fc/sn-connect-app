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

### 1.A Install Testing Dependencies & Run Unit Tests
**Status:** ✅ Tests Written, ✅ Dependencies Installed, ✅ Tests Run  
**Estimated Effort:** 5 minutes  
**Assigned to:** Developer

**What's Completed:**
- ✅ Created comprehensive unit tests for employee and announcements hooks
- ✅ Test files present under `tests/hooks/` (renamed to `.tsx` where needed)
- ✅ Added required testing dependencies to `package.json`
- ✅ `vitest` configuration updated for React/jsdom
- ✅ Tests executed locally (developer run)

**Action Items (completed):**
```bash
# Install dependencies (if not already installed)
pnpm install

# Run all tests
pnpm test
```

**Files Modified:**
- [package.json](package.json) - Added devDependencies for testing
- [vitest.config.ts](vitest.config.ts) - Updated environment to jsdom, added React plugin
- [tests/setup.ts](tests/setup.ts) - Created test setup file

---

### 1.B Testing Storage Bucket RLS Policies
**Status:** ⏳ Follows Configuration  
**Estimated Effort:** 30 minutes  
**Assigned to:** QA Engineer / DevOps

**What This Is:**
RLS (Row-Level Security) policies are database rules that control who can access what files in Supabase Storage. Testing policies means verifying that these security rules work correctly by simulating different users trying to access files. This ensures that:
- Employees can only access their own documents
- Managers can access their team's documents
- Admins have full access
- Unauthorized users are blocked (403 errors)

**Why It Matters:**
Without proper testing, security vulnerabilities could exist where employees see other employees' sensitive documents, or unauthorized users download confidential files.

**Test Scenarios:**

#### Scenario 1: Employee Uploads Their Own Document ✓ (Should Succeed)
**What to test:** Can an employee upload a file to their own employee folder?
```bash
# As Employee A (user_id: emp-a-uuid)
curl -X POST https://your-project.supabase.co/storage/v1/object/employee-documents/emp-a-uuid/contract/document.pdf \
  -H "Authorization: Bearer emp-a-token" \
  -H "Content-Type: application/pdf" \
  --data-binary "@document.pdf"
```
**Expected Result:** ✅ 200 OK - File uploaded successfully  
**Actual Result:** _______________

---

#### Scenario 2: Employee Downloads Their Own Document ✓ (Should Succeed)
**What to test:** Can an employee download a file they uploaded?
```bash
# As Employee A (user_id: emp-a-uuid)
curl -X GET https://your-project.supabase.co/storage/v1/object/employee-documents/emp-a-uuid/contract/document.pdf \
  -H "Authorization: Bearer emp-a-token"
```
**Expected Result:** ✅ 200 OK - File contents returned  
**Actual Result:** _______________

---

#### Scenario 3: Employee Tries to Access Another Employee's Document ✗ (Should Fail)
**What to test:** Can Employee A access a document uploaded by Employee B?
```bash
# As Employee A (user_id: emp-a-uuid)
# Trying to access Employee B's file (emp-b-uuid)
curl -X GET https://your-project.supabase.co/storage/v1/object/employee-documents/emp-b-uuid/contract/document.pdf \
  -H "Authorization: Bearer emp-a-token"
```
**Expected Result:** ❌ 403 Forbidden - Access denied  
**Actual Result:** _______________

---

#### Scenario 4: Manager Accesses Direct Report's Document ✓ (Should Succeed)
**What to test:** Can a manager download documents of their team members?
```bash
# As Manager (user_id: mgr-uuid, manages emp-a-uuid)
curl -X GET https://your-project.supabase.co/storage/v1/object/employee-documents/emp-a-uuid/contract/document.pdf \
  -H "Authorization: Bearer mgr-token"
```
**Expected Result:** ✅ 200 OK - File contents returned  
**Actual Result:** _______________

---

#### Scenario 5: Manager Tries to Access Non-Report's Document ✗ (Should Fail)
**What to test:** Can a manager access documents of employees they don't manage?
```bash
# As Manager (user_id: mgr-uuid, manages emp-a-uuid)
# Trying to access Employee C's file (emp-c-uuid, not direct report)
curl -X GET https://your-project.supabase.co/storage/v1/object/employee-documents/emp-c-uuid/contract/document.pdf \
  -H "Authorization: Bearer mgr-token"
```
**Expected Result:** ❌ 403 Forbidden - Access denied  
**Actual Result:** _______________

---

#### Scenario 6: Admin Can Access Any Document ✓ (Should Succeed)
**What to test:** Can an admin access any employee's document?
```bash
# As Admin (user_id: admin-uuid, role: admin)
curl -X GET https://your-project.supabase.co/storage/v1/object/employee-documents/emp-a-uuid/contract/document.pdf \
  -H "Authorization: Bearer admin-token"
```
**Expected Result:** ✅ 200 OK - File contents returned  
**Actual Result:** _______________

---

#### Scenario 7: Unauthenticated User Tries to Access ✗ (Should Fail)
**What to test:** Can someone without authentication access files?
```bash
# No Authorization header
curl -X GET https://your-project.supabase.co/storage/v1/object/employee-documents/emp-a-uuid/contract/document.pdf
```
**Expected Result:** ❌ 401 Unauthorized  
**Actual Result:** _______________

---

#### Scenario 8: HR Staff Can Upload on Behalf of Employee ✓ (Should Succeed)
**What to test:** Can HR staff upload documents for any employee?
```bash
# As HR (user_id: hr-uuid, role: hr)
curl -X POST https://your-project.supabase.co/storage/v1/object/employee-documents/emp-a-uuid/contract/document.pdf \
  -H "Authorization: Bearer hr-token" \
  -H "Content-Type: application/pdf" \
  --data-binary "@document.pdf"
```
**Expected Result:** ✅ 200 OK - File uploaded successfully  
**Actual Result:** _______________

---

**Verification Checklist:**
- [ ] Scenario 1: Employee self-upload works
- [ ] Scenario 2: Employee self-download works
- [ ] Scenario 3: Employee can't access others' files
- [ ] Scenario 4: Manager can access reports' files
- [ ] Scenario 5: Manager can't access non-reports' files
- [ ] Scenario 6: Admin can access any file
- [ ] Scenario 7: Unauthenticated access is blocked
- [ ] Scenario 8: HR staff can upload for employees

**How to Debug if Tests Fail:**
1. Check that storage bucket is named exactly `employee-documents`
2. Verify all RLS policies are enabled (toggle on/off)
3. Ensure user tokens have correct `auth.uid()` and `role` claims
4. Check Supabase logs for specific policy rejection reasons
5. Verify employee records exist and `user_id` matches auth users

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
- [x] Onboarding database migrations (checklists, tasks, profiles, documents)
- [x] Onboarding Supabase Storage bucket with RLS policies
- [x] Onboarding API routes (10+ endpoints for employee self-service and admin viewer)
- [x] Onboarding TanStack Query hooks (profile management, document uploads, wizard state)
- [x] Multi-step onboarding wizard UI (4 steps: personal info, payment info, documents, review)
- [x] Admin onboarding viewer (list/detail pages with filters and document preview)
- [x] Middleware onboarding redirect enforcement
- [x] AuthContext integration with isOnboardingComplete flag
- [x] Onboarding Zod validation schemas
- [x] Unit tests for onboarding hooks and schemas (11 tests passing)

---

## 🆕 Recently Completed - Onboarding Features (Phase 3.3)

### Onboarding System Overview
Implemented a comprehensive onboarding system with three major features:
1. **Operational Onboarding Checklists** - Task tracking for HR and admin
2. **Post-Signin Onboarding Wizard** - Mandatory multi-step form for new employees/interns
3. **Admin Onboarding Data Viewer** - Read-only interface for HR to review submissions

### What Was Completed

#### Database & Storage
- [x] `onboarding_checklists` and `onboarding_tasks` tables with RLS policies
- [x] `onboarding_profiles` and `onboarding_documents` tables with RLS policies
- [x] `onboarding-documents` Supabase Storage bucket (10MB limit, private, path-based RLS)
- [x] Enums: `onboarding_status`, `onboarding_step`, `onboarding_document_type`
- [x] Indexes on user_id, is_completed, current_step for performance
- [x] Database types in `packages/database/src/database.types.ts`

#### API Routes (10+ Endpoints)
- [x] `/api/onboarding/route.ts` - List/create checklists (admin)
- [x] `/api/onboarding/[id]/tasks/route.ts` - Task management
- [x] `/api/onboarding/profile/route.ts` - Self-service profile CRUD
- [x] `/api/onboarding/profile/step/route.ts` - Update wizard step data
- [x] `/api/onboarding/profile/complete/route.ts` - Finalize onboarding
- [x] `/api/onboarding/documents/route.ts` - Upload/list documents
- [x] `/api/onboarding/documents/[id]/route.ts` - Delete document
- [x] `/api/onboarding/documents/[id]/preview/route.ts` - Signed URL preview
- [x] `/api/onboarding/profiles/route.ts` - Admin list with filters
- [x] `/api/onboarding/profiles/[id]/route.ts` - Admin detail view
- [x] `/api/onboarding/profiles/[id]/documents/route.ts` - Admin document list
- [x] `/api/onboarding/_lib.ts` - Shared auth/role helpers

#### TanStack Query Hooks
- [x] `useOnboardingProfile.ts` - Fetch self profile or admin detail
- [x] `useOnboardingProfiles.ts` - Admin list with filters
- [x] `useOnboardingDocuments.ts` - List documents for profile
- [x] `useCreateOnboardingProfile.ts` - Create mutation
- [x] `useUpdateOnboardingProfile.ts` - Update step mutation
- [x] `useUploadOnboardingDocument.ts` - FormData upload mutation
- [x] `useOnboardingWizard.ts` - sessionStorage-backed wizard state manager

#### UI Components - Wizard
- [x] `OnboardingWizard.tsx` - Main orchestrator with 4-step flow
- [x] `ProgressStepper.tsx` - Badge-based step indicator
- [x] `StepPersonalInfo.tsx` - Personal information form
- [x] `StepPaymentInfo.tsx` - Payment details form
- [x] `StepDocuments.tsx` - Document upload interface with 4 required types
- [x] `StepReview.tsx` - Summary display before submission
- [x] `NavigationControls.tsx` - Back/Next buttons with loading states
- [x] `DocumentUploadCard.tsx` - Individual upload card component

#### UI Pages
- [x] `/app/(employee)/onboarding/setup/page.tsx` - Wizard page
- [x] `/app/(employee)/onboarding/setup/layout.tsx` - Full-screen centered layout
- [x] `/app/(employee)/onboarding/complete/page.tsx` - Success page
- [x] `/app/(admin)/admin/onboarding/page.tsx` - Admin list with filters
- [x] `/app/(admin)/admin/onboarding/[id]/page.tsx` - Admin detail with tabs
- [x] `/app/(super-admin)/super-admin/onboarding/page.tsx` - Redirect to admin
- [x] `/app/(super-admin)/super-admin/onboarding/[id]/page.tsx` - Redirect to admin detail

#### Auth & Middleware Integration
- [x] `AuthContext.tsx` - Added isOnboardingComplete flag
- [x] `middleware.ts` - Onboarding redirect for incomplete profiles
- [x] Query keys extended for onboarding in `query-keys.ts`

#### Validation & Testing
- [x] `onboarding.schema.ts` - Zod schemas for wizard steps
- [x] `onboarding-view.schema.ts` - Zod schemas for admin viewer
- [x] `tests/schemas/onboarding.test.ts` - 4 passing tests
- [x] `tests/hooks/useOnboardingProfile.test.tsx` - 2 passing tests
- [x] `tests/hooks/useOnboardingProfiles.test.tsx` - 2 passing tests
- [x] `tests/hooks/useOnboardingWizard.test.tsx` - 3 passing tests

### What's Still Pending

#### Critical Path
- [ ] **n8n Workflow for New Employee Automation**
  - File: `n8n/workflows/onboarding-new-employee.json`
  - Trigger: Webhook when employee created
  - Actions: Create checklist, create default tasks, notify HR, schedule welcome email, create calendar events
  - Estimated Effort: 2-3 hours
  - Blocking: Automated onboarding process initiation

#### Testing
- [ ] **E2E Tests for Onboarding Wizard Flow**
  - File: `e2e/onboarding.spec.ts` (structure exists, needs full test suite)
  - Tests: redirect on first login, complete full wizard, save draft and resume, validation errors, document upload, completion redirect
  - Estimated Effort: 3-4 hours
  - Priority: High

- [ ] **E2E Tests for Admin Onboarding Viewer**
  - File: `e2e/admin-onboarding-viewer.spec.ts`
  - Tests: admin can view list, filters work, detail page renders all tabs, document preview loads, employee/intern get 403 forbidden
  - Estimated Effort: 2-3 hours
  - Priority: High

#### Feature Enhancements
- [ ] **Connect Existing Onboarding Page to Real Data**
  - File: `apps/web/src/app/(employee)/onboarding/page.tsx`
  - Current Status: Page exists but may still use mock data
  - Action: Verify and connect to real onboarding checklist data
  - Estimated Effort: 1-2 hours
  - Priority: Medium

- [ ] **Document Approval Workflow for Uploaded Files**
  - Similar to Section 6 in main PENDING_TASKS
  - HR should be able to approve/reject uploaded onboarding documents
  - Employee should be notified to reupload if rejected
  - Estimated Effort: 4-6 hours
  - Priority: Medium

- [ ] **Payment Account Number Masking Enhancement**
  - Currently masked in list view (last 4 digits)
  - Consider adding "reveal" button for authorized users
  - Add audit logging for when payment info is viewed
  - Estimated Effort: 2-3 hours
  - Priority: Low

#### Documentation
- [ ] **API Documentation for Onboarding Endpoints**
  - Document request/response schemas
  - Add authentication requirements
  - Include example requests/responses
  - Estimated Effort: 2-3 hours
  - Priority: Medium

- [ ] **User Guide for Onboarding Wizard**
  - Step-by-step guide for new employees
  - FAQ section for common issues
  - Troubleshooting guide
  - Estimated Effort: 1-2 hours
  - Priority: Low

---

## 📊 Progress Summary

| Area | Status | % Complete |
|------|--------|-----------|
| Phase 1.5 (Employee API) | ✅ Complete | 100% |
| Phase 1.6 (Documents API) | ✅ Complete* | 90% |
| Phase 1.7 (Departments API) | ✅ Complete | 100% |
| Phase 3.3 (Onboarding Automation) | ✅ Complete** | 85% |
| Phase 3.3.1 (Onboarding Wizard) | ✅ Complete | 95% |
| Phase 3.3.2 (Onboarding Data Viewer) | ✅ Complete | 95% |
| Testing (Employee/Documents/Departments) | 🔴 Not Started | 0% |
| Testing (Onboarding) | 🟡 Partial | 40% |
| Storage Configuration | 🟡 Pending | 0% |
| Documentation | 🟢 Partial | 60% |
| Mobile & Performance | 🔵 Future | - |

*Awaiting Supabase Storage bucket configuration for employee-documents  
**Missing n8n workflow automation (15% pending)

---

## 🚀 Recommended Next Steps (Priority Order)

1. **IMMEDIATE** - Configure Supabase Storage bucket (blocking deployment for employee-documents)
2. **THIS WEEK** - Create n8n workflow for onboarding automation (blocking automated onboarding)
3. **THIS WEEK** - Fix profile emergency contact tab
4. **THIS WEEK** - Create environment variable documentation
5. **NEXT SPRINT** - Write E2E tests for onboarding wizard and admin viewer
6. **NEXT SPRINT** - Write unit tests for all employee/document/department hooks (80%+ coverage)
7. **NEXT SPRINT** - Write E2E tests for employee and document API routes
8. **SPRINT 3** - Implement document approval workflow (both employee docs and onboarding docs)
9. **SPRINT 3** - Create admin department management page
10. **ONGOING** - Performance optimization and mobile testing

---

## 📝 Notes

- All APIs follow RESTful conventions with proper HTTP methods
- RLS policies are enforced at the database level for security
- TanStack Query handles caching and cache invalidation
- Error handling is comprehensive with user-friendly messages
- Type safety is maintained throughout with TypeScript branded types
- **NEW:** Onboarding system uses sessionStorage for wizard draft persistence
- **NEW:** Payment account numbers are masked in admin list views (last 4 digits only)
- **NEW:** Document uploads support 4 required types: valid_id, profile_photo, cv, birth_certificate
- **NEW:** Middleware enforces onboarding completion before portal access for employee/intern roles

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
- Onboarding wizard components in `apps/web/src/app/(employee)/onboarding/setup/components/`
- Onboarding schemas in `apps/web/src/lib/schemas/onboarding*.schema.ts`
- Onboarding migrations in `supabase/migrations/20260210000006_*.sql` and `20260211000001_*.sql`
