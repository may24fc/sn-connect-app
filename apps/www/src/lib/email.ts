import { Resend } from 'resend';

const FROM_EMAIL = 'SN International Group <careers@sngroup.com.au>';

export async function sendApplicationConfirmation({
  to,
  applicantName,
  positionTitle,
}: {
  to: string;
  applicantName: string;
  positionTitle: string;
}) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY is not set — skipping confirmation email');
      return;
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Application Received — ${positionTitle}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#f4f4f5;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="background:#0F172A;padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">SN International Group</h1>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="margin:0 0 16px;color:#18181b;font-size:18px;font-weight:600;">Application Received</h2>
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
      </p>
      <div style="border-top:1px solid #e4e4e7;padding-top:20px;margin-top:20px;">
        <p style="margin:0;color:#71717a;font-size:12px;line-height:1.5;">
          This is an automated message. Please do not reply to this email.<br />
          &copy; ${new Date().getFullYear()} SN International Group. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`,
    });
  } catch (error) {
    console.error('Failed to send application confirmation email:', error);
    // Don't throw — email failure should not block the application submission
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
