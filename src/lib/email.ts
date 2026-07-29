import { env } from './env';

export const OWNER_EMAIL = 'bookings@chace.studio';

/**
 * Sender address. chace.studio is verified in Resend, so mail sends from the
 * branded address by default. EMAIL_FROM remains an escape hatch if the
 * domain ever needs to be bypassed (for example Resend's test sender while
 * re-verifying DNS). Replies always go to the real inbox via reply_to.
 */
function fromAddress(): string {
  return env('EMAIL_FROM') ?? `CHACE STUDIOS <${OWNER_EMAIL}>`;
}

/**
 * Who receives owner notifications. OWNER_NOTIFY_EMAIL may hold a single
 * address or a comma-separated list, so the studio inbox and a personal
 * address can both be copied. Defaults to the studio inbox alone.
 *
 * This applies only to owner notifications. Client confirmations are always
 * addressed to the client and nobody else.
 */
export function ownerNotifyAddress(): string {
  return env('OWNER_NOTIFY_EMAIL')?.trim() || OWNER_EMAIL;
}

/** "a@b.com, c@d.com" -> ["a@b.com", "c@d.com"] */
function recipients(to: string): string[] {
  return to
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean);
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
  /** A single address, or several separated by commas. */
  to: string,
  subject: string,
  html: string,
  attachments: Attachment[] = []
): Promise<boolean> {
  const toList = recipients(to);
  if (toList.length === 0) {
    console.error(`[email] no recipient for "${subject}", skipping`);
    return false;
  }

  const key = env('RESEND_API_KEY');
  if (!key) {
    console.warn(
      `[email] RESEND_API_KEY not set, skipping "${subject}" to ${toList.join(", ")}. ` +
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
        to: toList,
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
        `[email] Resend rejected "${subject}" to ${toList.join(", ")}: ${res.status} ${body.slice(0, 400)}`
      );
      return false;
    }
    console.log(`[email] sent "${subject}" to ${toList.join(", ")}`);
    return true;
  } catch (err) {
    console.error(`[email] send failed for "${subject}" to ${toList.join(", ")} (non-blocking):`, err);
    return false;
  }
}
