import { env } from './env';

export const OWNER_EMAIL = 'bookings@chace.studio';

/**
 * Sender address. Resend rejects any From on an unverified domain, so until
 * chace.studio is verified set EMAIL_FROM to Resend's test sender
 * ("CHACE STUDIOS <onboarding@resend.dev>"). Replies always go to the real
 * inbox regardless, via reply_to. Remove EMAIL_FROM once DNS is verified.
 */
function fromAddress(): string {
  return env('EMAIL_FROM') ?? `CHACE STUDIOS <${OWNER_EMAIL}>`;
}

/**
 * Where owner notifications land. Resend's test sender only delivers to the
 * account owner's own address, so set OWNER_NOTIFY_EMAIL to that address
 * until chace.studio is verified. Remove it to notify the real inbox.
 */
export function ownerNotifyAddress(): string {
  return env('OWNER_NOTIFY_EMAIL') ?? OWNER_EMAIL;
}

export interface Attachment {
  filename: string;
  /** Raw UTF-8 content; encoded to base64 for the API. */
  content: string;
}

/**
 * Send via Resend. Returns true only if the message was accepted.
 * Never throws — a booking must never fail because email did.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments: Attachment[] = []
): Promise<boolean> {
  const key = env('RESEND_API_KEY');
  if (!key) {
    console.warn(
      `[email] RESEND_API_KEY not set — skipping "${subject}" to ${to}. ` +
        `Set RESEND_API_KEY to enable booking notifications.`
    );
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromAddress(),
        to: [to],
        reply_to: OWNER_EMAIL,
        subject,
        html,
        ...(attachments.length
          ? {
              attachments: attachments.map((a) => ({
                filename: a.filename,
                content: Buffer.from(a.content, 'utf8').toString('base64'),
              })),
            }
          : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(
        `[email] Resend rejected "${subject}" to ${to}: ${res.status} ${body.slice(0, 400)}`
      );
      return false;
    }
    console.log(`[email] sent "${subject}" to ${to}`);
    return true;
  } catch (err) {
    console.error(`[email] send failed for "${subject}" to ${to} (non-blocking):`, err);
    return false;
  }
}
