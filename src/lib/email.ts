import { env } from './env';

/**
 * Optional Resend email. No-op when RESEND_API_KEY is unset, and never
 * throws — the booking flow must not block on email failure.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const key = env('RESEND_API_KEY');
  if (!key) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'CHACE STUDIOS <bookings@chace.studio>',
        to: [to],
        subject,
        html,
      }),
    });
  } catch (err) {
    console.error('Email send failed (non-blocking):', err);
  }
}
