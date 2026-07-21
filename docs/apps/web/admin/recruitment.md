# Recruitment (Admin)

> Audience: Admins, Super Admins, and users with delegated ATS access

Recruitment covers the full applicant tracking pipeline: job requisitions, open postings, and candidate management. Super admins can also grant non-admin employees delegated ATS access.

---

## Navigation

**Admin / Super Admin:** `/admin/recruitment`  
**Delegated employees:** `/ats/recruitment`

Related admin route: `/admin/crm` for recruitment-linked pipeline views and CRM context.

---

## Recruitment Dashboard

The recruitment overview page shows:

- **Pipeline stats** — total applications broken down by status (Pending, Reviewed, Shortlisted, Interview, Approved, Hired, Rejected)
- **Active job postings** — cards with title, business unit, location, employment type, and headcount
- **Recent applications** — latest submissions across all postings

---

## ATS Access Control

The ATS is accessible to:
- Admins and super admins (always)
- Any user granted **Delegated ATS Access** by an admin

### Granting Delegated Access

1. Navigate to **Recruitment** → **ATS Access**.
2. Search for the employee.
3. Click **Grant ATS Access**.

The employee will see an **ATS** section in their navigation and can access `/ats/*` routes.

### Revoking Delegated Access

Click **Revoke** next to the user in the ATS Access management table. The user loses access immediately on their next page load.

---

## Application Pipeline

Applications flow through these statuses:

| Status | Description |
|--------|-------------|
| **Pending** | Newly submitted, awaiting review |
| **Reviewed** | Opened and noted by a recruiter |
| **Shortlisted** | Selected for further consideration |
| **Interview** | Interview scheduled or completed |
| **Approved** | Ready to hire |
| **Hired** | Offer accepted — headcount decremented |
| **Rejected** | Removed from active pipeline |

### Viewing Applications

Navigate to `/admin/jobs/applications` or `/ats/jobs/applications` to see the full pipeline table.

Filters available:
- Job posting
- Status
- Search (name, email)

### Application Detail

Each application detail shows:
- Applicant contact info (name, email, phone, LinkedIn)
- Resume text (extracted via AI-assisted parsing)
- AI evaluation score and summary (if evaluated)
- Notes field for recruiter comments
- Status update dropdown

### AI Resume Evaluation

For applications with parsed resume text, click **Evaluate** to run an AI-assisted scoring pass. The evaluation returns:
- A 0–100 match score
- A written summary
- Identified strengths and gaps relative to the job requirements

### Hiring an Applicant

1. Move application to **Approved**.
2. Click **Hire** — this atomically:
   - Sets status to `hired`
   - Decrements `remaining_headcount` on the linked job requisition
   - Creates an audit log entry

---

## Bulk Resume Import

To import multiple applications from resume files:
1. Go to the Applications page.
2. Click **Bulk Import**.
3. Upload PDF resumes — they are parsed with `unpdf` and applicant contact details are extracted automatically.
4. Review the parsed data and confirm the import.

---

## Related Docs

- [jobs-management.md](jobs-management.md) — Creating and archiving job postings
- [api/ats.md](../api/ats.md) — ATS API reference
- [api/applications.md](../api/applications.md) — Applications API reference
