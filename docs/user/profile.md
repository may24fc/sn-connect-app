# Profile

The Profile page (`/profile`) displays your personal information and lets you update your details.

## Profile Header

Your profile header shows:

- **Avatar** — Click the camera icon to upload a new profile photo (JPEG, PNG, WebP, GIF — max 5 MB)
- **Name** — Your full name
- **Position** — Your job title
- **Department** badge
- **Employee Number** badge

### Changing Your Avatar

1. Click the **camera icon** on your avatar
2. Select an image file from your device
3. Preview the image in the confirmation modal
4. Click **Confirm** to upload

The avatar is stored in the `avatars` Supabase Storage bucket.

## Personal Information

Your profile is organized into editable sections displayed in a bento grid:

### Basic Info

| Field | Editable | Description |
|-------|----------|-------------|
| Nationality | Yes | Your nationality |
| Birthday | Yes | Date of birth (date picker) |
| Age | No | Auto-calculated from birthday |

### Contact

| Field | Editable | Description |
|-------|----------|-------------|
| Contact Number | Yes | Phone number |
| Email Address | Yes | Personal email |
| Company Email | Yes | Work email |
| LinkedIn Profile | Yes | LinkedIn URL |

### Education

| Field | Editable | Description |
|-------|----------|-------------|
| Education | Yes | Degree or qualification |
| Major / Specialization | Yes | Field of study |

### Address

| Field | Editable | Description |
|-------|----------|-------------|
| Address | Yes | Full address |

### Emergency Contact

| Field | Editable | Description |
|-------|----------|-------------|
| Contact Name | Yes | Emergency contact's name |
| Contact Number | Yes | Emergency contact's phone |
| Relationship | Yes | Relationship to you (Parent, Spouse, etc.) |

## Editing Your Information

1. Hover over a section to reveal the **Edit** button
2. Click **Edit** — fields become editable inline
3. Make your changes
4. Click **Save** to submit

Changes are submitted via `PATCH /api/profile/info` and update your onboarding profile. Some changes may require admin approval through the profile change request workflow.

## Role Metadata

Below your personal information, the **Role Metadata** section displays additional role-specific data tied to your user account. This is managed through the Role Metadata form and varies by role type.

---

*Last updated: 2026-03-08*

Next: [Notifications](notifications.md) · Previous: [Information Hub](information-hub.md)
