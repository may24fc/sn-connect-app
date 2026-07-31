# Quick-Brief Inquiry and Email Service Enhancement

This document explains the inquiry and email-service changes made for the public website in
`apps/www`. It covers both the main contact form and the floating business inquiry form. It does
not describe the recruitment application email flow.

## Walkthrough

### What was changed

The quick-brief form previously accepted an inquiry, stored it, and sent emails. It now has
additional safeguards around the entire journey:

1. The visitor completes the form.
2. The website checks that the information is properly formatted.
3. Automated-abuse checks decide whether the request should continue.
4. An accepted inquiry is stored in Supabase.
5. The internal team receives the complete brief.
6. The visitor receives a short confirmation email.
7. The database records whether each email was sent or failed.

The visitor does not have to complete a CAPTCHA or verify their email address in this release.

### Why the form needed stronger protection

A public form can be called by people, browser scripts, or software that never opens the website.
Client-side validation alone cannot protect it because an attacker can send requests directly to
the database or API.

The enhanced flow therefore puts the important decisions on the server. The browser still gives
helpful validation messages, but the server independently checks every request before storing it
or sending email.

### Phone-number experience

The phone number remains optional and no country is selected automatically.

The field is split into:

- A country selector showing the phone/globe icon before selection.
- A selected country's flag and locked calling code, such as the Philippine flag and `+63`.
- A separate field where the visitor enters only the national phone number.

The visitor cannot edit or delete the calling code. A possible number is converted to the
international E.164 format before submission, for example `+639171234567`.

If the phone field is untouched, cleared, or has only a selected country, the database receives
`NULL`. A partial or implausible number produces a validation error.

### Spam and repeated-submission protection

The service now limits how often the same network address or email address can submit:

| Identifier | Short limit | Daily limit |
|---|---:|---:|
| Network address | 5 submissions per 10 minutes | 20 submissions per 24 hours |
| Email address | 2 submissions per hour | 5 submissions per 24 hours |

The raw network address and email address are not stored in the rate-limit tables. They are turned
into private, irreversible keyed hashes first.

The forms also include:

- An invisible field that normal visitors never fill in. Bots commonly fill it automatically.
- A timing check that suppresses submissions completed in less than two seconds.
- A 30-minute duplicate check for the same normalized brief.

Bot-like and duplicate requests receive the same success response as a normal request, but they do
not create an inquiry or send email. This avoids telling an automated sender exactly which check
caught it.

### What emails are sent

Two emails are attempted after the inquiry is safely stored:

1. **Internal notification:** contains the inquiry ID, name, email, optional phone, subject, and
   complete brief so the team can act on it.
2. **Visitor confirmation:** uses the fixed subject `We received your quick brief` and includes
   only the inquiry ID and topic. It does not repeat the visitor's phone number or full message.

All visitor-supplied content is escaped before being inserted into email HTML.

### What happens if email delivery fails

The inquiry is stored before either email is sent. If Resend is temporarily unavailable, the
visitor's brief is not lost.

The database records each email independently as `sent` or `failed`, together with the Resend ID
or a shortened error description. Once the inquiry has been stored, the API returns success even
when one or both emails fail. Automatic email retries are not part of this release.

### Why direct public database insertion was removed

Previously, the `public_inquiries_public_insert_policy` allowed a public Supabase client to insert
an inquiry directly. That was originally intended to make the table write-only for public forms,
but it also provided a path around the API's validation and anti-abuse controls.

Public insertion is now removed. Both forms submit only to `/api/inquiries`, and the server performs
the trusted database insertion after all required checks. Authorized staff read/update policies
remain separate and are not removed.

### What is intentionally deferred

This release does not add:

- CAPTCHA or Turnstile
- Redis
- Mandatory email-link verification
- Disposable-email-domain checks
- Background email retries

These can be considered later based on observed abuse and the acceptable effect on visitor
experience.

## Technical implementation

### Scope and main files

The implementation is limited to the public website inquiry flow:

| File | Responsibility |
|---|---|
| `apps/www/src/components/contact/ContactForm.tsx` | Main contact form |
| `apps/www/src/components/businesses/InquiryForm.tsx` | Floating business inquiry form |
| `apps/www/src/components/ui/InquiryPhoneInput.tsx` | Country selector and national phone input |
| `apps/www/src/lib/schemas/inquiry.schema.ts` | Shared validation and normalization |
| `apps/www/src/app/api/inquiries/route.ts` | Trusted inquiry intake orchestration |
| `apps/www/src/lib/inquiries/abuse-controls.ts` | HMAC identifiers, rate limits, and deduplication |
| `apps/www/src/lib/email.ts` | Resend notification and confirmation functions |
| `supabase/migrations/20260731000001_secure_public_inquiries.sql` | Database security and storage |

### Request contract

`POST /api/inquiries` accepts JSON:

```ts
type InquiryRequest = {
  name: string;
  email: string;
  phone?: string;
  business_unit_id?: string | null;
  subject: string;
  message: string;
  company_website?: string;
  form_started_at?: number;
};
```

`company_website` and `form_started_at` are form-abuse metadata, not business fields.

The normalized stored shape is:

```ts
type NormalizedInquiry = {
  name: string;
  email: string;
  phone: string | null;
  business_unit_id: string | null;
  subject: string;
  message: string;
};
```

### Shared validation and normalization

Both React Hook Form clients and the API use `inquirySchema`.

The schema:

- Trims all business fields.
- Collapses redundant whitespace in name and subject.
- Lowercases email before rate limiting and storage.
- Rejects whitespace-only required fields.
- Preserves meaningful whitespace in the message after trimming its outer whitespace.
- Limits name to 2–200 characters.
- Limits email to 320 characters and requires email syntax.
- Limits subject to 3–300 characters.
- Limits message to 10–5,000 characters.
- Allows an empty phone or requires a possible international E.164 number.
- Validates the optional business-unit ID as a UUID.

The phone UI uses `libphonenumber-js` to format the national portion and generate a partial E.164
value as the visitor types. The shared schema makes the final possible-number decision. This keeps
an incomplete number from being mistaken for an untouched optional field.

### API processing order

The route processes a request in this order:

1. Require an `application/json` content type.
2. Determine the trusted client IP and consume the IP limits.
3. Parse JSON.
4. Validate and normalize fields through the shared schema.
5. Consume limits for the normalized email.
6. Suppress honeypot, missing-timestamp, and under-two-second submissions.
7. Build and atomically claim the 30-minute duplicate fingerprint.
8. Insert the normalized inquiry with delivery states set to `pending`.
9. Send internal and visitor emails concurrently.
10. Persist the settled delivery results.
11. Return the stored-inquiry success response.

The centralized guard fails closed. If the rate-limit or deduplication RPC is unavailable, the
route returns `503` and does not insert or send email.

### Rate-limit design

`INQUIRY_ABUSE_SECRET` is a stable, random, server-only secret. It is used with HMAC-SHA-256 to
derive identifiers:

```text
HMAC(secret, "ip:" + clientIp)
HMAC(secret, "email:" + normalizedEmail)
```

Only the 64-character hashes reach `inquiry_rate_limit_buckets`.

The `consume_inquiry_rate_limit` PostgreSQL function implements the token-bucket operation inside
one transaction. It locks the matching bucket row while refilling and consuming a token, preventing
parallel requests from independently passing the same limit.

Buckets expire after 48 hours. Expired rows are removed opportunistically during later calls.

In Vercel, the route trusts the first value from `x-vercel-forwarded-for`. Development can use
`x-forwarded-for`, `x-real-ip`, or the `127.0.0.1` fallback. A non-Vercel production runtime fails
closed until a trusted IP source is explicitly implemented.

### Duplicate suppression

The duplicate fingerprint is an HMAC of:

```text
normalized email + subject + message + business-unit ID
```

`claim_inquiry_deduplication_key` atomically claims the fingerprint for 30 minutes. An existing
unexpired claim returns a generic `201` without inserting or emailing.

If database insertion fails after a successful claim, the route calls
`release_inquiry_deduplication_key`. This allows a legitimate visitor to retry instead of being
silently suppressed for 30 minutes.

### Database security

The migration:

- Drops `public_inquiries_public_insert_policy`.
- Revokes table insertion from `anon` and `authenticated`.
- Leaves server-side insertion to the service-role client.
- Adds database checks for trimmed/length-limited values and conservative E.164 phone storage.
- Adds internal and confirmation delivery status, Resend ID, and truncated-error columns.
- Creates private rate-limit and deduplication tables.
- Enables and forces RLS on the private abuse-control tables.
- Revokes public access to those tables and RPCs.
- Grants the required table and function access only to `service_role`.

The quality constraints use `NOT VALID` where legacy records may not comply. In PostgreSQL this
skips the historical full-table validation but still enforces the constraint for new or updated
rows.

### Resend delivery behavior

`sendInquiryNotification` and `sendInquiryConfirmation` return:

```ts
type EmailSendResult =
  | { sent: true; id: string | null }
  | { sent: false; error: string };
```

Resend idempotency keys are derived from the stored inquiry ID:

```text
inquiry-internal/{inquiryId}
inquiry-confirmation/{inquiryId}
```

This reduces accidental duplicate sends when the same send operation is repeated.

The internal email contains the escaped full brief. The visitor confirmation has a fixed subject
and deliberately reduced content. Resend errors are shortened to 500 characters before storage.

Application logs do not deliberately include the submitted email, phone, message, IP address,
tokens, or secrets. Inquiry IDs, delivery outcomes, provider IDs, and shortened operational error
text are logged.

### API responses

| Status | Meaning |
|---:|---|
| `201` | Inquiry stored, or generic silent acceptance for bot-like/duplicate traffic |
| `400` | Invalid JSON or genuine field-validation failure |
| `415` | Unsupported content type |
| `429` | IP or email rate limit reached; includes `Retry-After` |
| `503` | Required centralized abuse-control RPC unavailable |
| `500` | Inquiry persistence failure |

Email failure after successful persistence does not change the response from `201`.

### Environment variables

The server requires:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only trusted database access |
| `INQUIRY_ABUSE_SECRET` | HMAC secret for private rate-limit and duplicate identifiers |
| `RESEND_API_KEY` | Resend API authentication |
| `INQUIRY_NOTIFICATION_EMAIL` | Optional internal recipient; falls back to the configured group inbox |

`INQUIRY_ABUSE_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, and `RESEND_API_KEY` must never use a
`NEXT_PUBLIC_` prefix or be committed to Git. Use different stable secrets for local, staging, and
production.

### Tests

The committed tests cover:

- Shared normalization and phone validation.
- HMAC behavior and IP/email rate-limit calls.
- Successful storage and delivery-result updates.
- Unsupported or invalid requests.
- Fail-closed behavior when centralized guards are unavailable.
- Honeypot, timing, and duplicate suppression without insert/email side effects.
- Duplicate-claim release after persistence failure.
- Confirmation content minimization and HTML escaping.
- Resend idempotency keys.
- Stored inquiry success when an email delivery fails.

Run the public-site checks from the repository root:

```powershell
pnpm --filter @sn-group/www test
pnpm --filter @sn-group/www typecheck
```

Do not run `next build` while `next dev` is using the same `.next` directory. Stop the development
server first or clean/restart it afterward.

### Migration and rollout

The database migration must be applied before deploying the new API code because the API fails
closed when the RPCs do not exist.

Preferred linked-project workflow:

```powershell
pnpm exec supabase db push --dry-run
pnpm exec supabase db push
```

If the full migration was run manually in Supabase SQL Editor, confirm that it succeeded and then
repair the migration history for that same linked project:

```powershell
pnpm exec supabase migration repair 20260731000001 --status applied --linked
pnpm exec supabase migration list --linked
```

Do not run `db push` blindly after manual SQL execution. Without migration-history repair, the CLI
may attempt to apply the same migration again.

The migration file, application implementation, tests, package changes, and this documentation
should be committed together or in an explicitly ordered review series. For production, apply the
database migration first and deploy `apps/www` second.

