import { Resend } from 'resend';

const BASE_FROM_EMAIL = 'no-reply@sngroup.com.au';

const SENDER_NAME_BY_CONTEXT = {
  recruitment: 'Recruitment Team',
} as const;

function getFromEmail(context: keyof typeof SENDER_NAME_BY_CONTEXT): string {
  // Keep one mailbox for deliverability and vary display name by email context.
  return `${SENDER_NAME_BY_CONTEXT[context]} <${BASE_FROM_EMAIL}>`;
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(
      '[Email] RESEND_API_KEY is not set. Ensure it is configured in Vercel Environment Variables (for production) or in apps/www/.env.local (for local dev).',
    );
    return null;
  }
  return new Resend(apiKey);
}

export async function sendApplicationConfirmation({
  to,
  applicantName,
  positionTitle,
}: {
  to: string;
  applicantName: string;
  positionTitle: string;
}) {
  const resend = getResendClient();
  if (!resend) return;

  try {
    const { data, error } = await resend.emails.send({
      from: getFromEmail('recruitment'),
      to,
      subject: `Application Received — ${positionTitle}`,
      html: buildEmailHtml({
        heading: 'Application Received',
        body: `
      <p style="margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.6;">
        Dear ${escapeHtml(applicantName)},
      </p>
      <p style="margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.6;">
        Thank you for applying for the <strong>${escapeHtml(positionTitle)}</strong> position at SN International Group. We have successfully received your application.
      </p>
      <p style="margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.6;">
        Our hiring team will carefully review your qualifications and experience. If your profile matches our requirements, we will reach out to schedule the next steps.
      </p>
      <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6;">
        In the meantime, feel free to explore more about us at our website.
      </p>`,
      }),
    });

    if (error) {
      console.error('[Email] Resend API error for application confirmation:', error);
    } else {
      console.log('[Email] Application confirmation sent successfully, id:', data?.id);
    }
  } catch (error) {
    console.error('[Email] Failed to send application confirmation email:', error);
  }
}

const STATUS_EMAIL_CONTENT: Record<string, { subject: string; heading: string; bodyFn: (name: string, position: string) => string } | undefined> = {
  reviewed: {
    subject: 'Application Under Review',
    heading: 'Application Under Review',
    bodyFn: (name, position) => `
      <p style="margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.6;">Dear ${escapeHtml(name)},</p>
      <p style="margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.6;">
        We wanted to let you know that your application for <strong>${escapeHtml(position)}</strong> is now being reviewed by our hiring team.
      </p>
      <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6;">
        We appreciate your patience and will keep you updated on the progress.
      </p>`,
  },
  shortlisted: {
    subject: 'You\'ve Been Shortlisted!',
    heading: 'You\'ve Been Shortlisted',
    bodyFn: (name, position) => `
      <p style="margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.6;">Dear ${escapeHtml(name)},</p>
      <p style="margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.6;">
        Great news! Your application for <strong>${escapeHtml(position)}</strong> has been shortlisted. Our team was impressed with your qualifications.
      </p>
      <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6;">
        We will be in touch shortly to discuss the next steps in our hiring process.
      </p>`,
  },
  interview: {
    subject: 'Interview Invitation',
    heading: 'Interview Invitation',
    bodyFn: (name, position) => `
      <p style="margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.6;">Dear ${escapeHtml(name)},</p>
      <p style="margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.6;">
        We are pleased to inform you that you have been selected for an interview for the <strong>${escapeHtml(position)}</strong> position at SN International Group.
      </p>
      <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6;">
        A member of our team will reach out to you shortly to schedule the interview. Please keep an eye on your inbox for further details.
      </p>`,
  },
  rejected: {
    subject: 'Application Update',
    heading: 'Application Update',
    bodyFn: (name, position) => `
      <p style="margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.6;">Dear ${escapeHtml(name)},</p>
      <p style="margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.6;">
        Thank you for your interest in the <strong>${escapeHtml(position)}</strong> position at SN International Group and for taking the time to apply.
      </p>
      <p style="margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.6;">
        After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match the requirements of this role.
      </p>
      <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6;">
        We encourage you to apply for future openings that match your skills and experience. We wish you all the best in your career journey.
      </p>`,
  },
  approved: {
    subject: 'Congratulations — Offer Pending',
    heading: 'Congratulations!',
    bodyFn: (name, position) => `
      <p style="margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.6;">Dear ${escapeHtml(name)},</p>
      <p style="margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.6;">
        We are delighted to inform you that your application for the <strong>${escapeHtml(position)}</strong> position has been approved!
      </p>
      <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6;">
        Our team will be reaching out to you shortly with the next steps regarding your offer. Congratulations!
      </p>`,
  },
  hired: {
    subject: 'Welcome to SN International Group!',
    heading: 'Welcome Aboard!',
    bodyFn: (name, position) => `
      <p style="margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.6;">Dear ${escapeHtml(name)},</p>
      <p style="margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.6;">
        Congratulations and welcome to SN International Group! We are thrilled to officially welcome you as our new <strong>${escapeHtml(position)}</strong>.
      </p>
      <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6;">
        Our onboarding team will be in touch with everything you need to get started. We look forward to working with you!
      </p>`,
  },
};

export async function sendApplicationStatusUpdate({
  to,
  applicantName,
  positionTitle,
  status,
}: {
  to: string;
  applicantName: string;
  positionTitle: string;
  status: string;
}) {
  const content = STATUS_EMAIL_CONTENT[status];
  if (!content) return; // No email for 'pending' or unknown statuses

  const resend = getResendClient();
  if (!resend) return;

  try {
    const { data, error } = await resend.emails.send({
      from: getFromEmail('recruitment'),
      to,
      subject: `${content.subject} — ${positionTitle}`,
      html: buildEmailHtml({
        heading: content.heading,
        body: content.bodyFn(applicantName, positionTitle),
      }),
    });

    if (error) {
      console.error(`[Email] Resend API error for status update (${status}):`, error);
    } else {
      console.log(`[Email] Status update (${status}) sent successfully, id:`, data?.id);
    }
  } catch (error) {
    console.error(`[Email] Failed to send status update email (${status}):`, error);
  }
}

function buildEmailHtml({ heading, body }: { heading: string; body: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#f4f4f5;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="background:#0F172A;padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">SN International Group</h1>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="margin:0 0 16px;color:#18181b;font-size:18px;font-weight:600;">${escapeHtml(heading)}</h2>
      ${body}
      <div style="border-top:1px solid #e4e4e7;padding-top:20px;margin-top:20px;">
        <p style="margin:0;color:#71717a;font-size:12px;line-height:1.5;">
          This is an automated message. Please do not reply to this email.<br />
          &copy; ${new Date().getFullYear()} SN International Group. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
