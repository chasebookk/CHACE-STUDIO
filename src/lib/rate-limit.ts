import { query } from './db';

const WINDOW_MINUTES = 10;
const MAX_ATTEMPTS = 5;

/**
 * Client IP, taken from the proxy headers Vercel sets. Only the first entry
 * of x-forwarded-for is trustworthy; the rest can be spoofed by the caller.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Per-IP throttle for checkout. Each attempt holds a calendar slot for 30
 * minutes, so an unthrottled script could block out the diary. Counted in the
 * database rather than memory because serverless instances do not share state.
 *
 * Fails open: if the check itself errors we let the booking through rather
 * than blocking a paying customer over a rate-limit table.
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  try {
    const { rows } = await query<{ attempts: string; oldest: string | null }>(
      `SELECT count(*)::int AS attempts, min(created_at) AS oldest
         FROM checkout_attempts
        WHERE ip = $1 AND created_at > now() - ($2 || ' minutes')::interval`,
      [ip, String(WINDOW_MINUTES)]
    );

    const attempts = Number(rows[0]?.attempts ?? 0);
    if (attempts >= MAX_ATTEMPTS) {
      const oldest = rows[0]?.oldest ? new Date(rows[0].oldest).getTime() : Date.now();
      const resetAt = oldest + WINDOW_MINUTES * 60_000;
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
      };
    }

    await query(`INSERT INTO checkout_attempts (ip) VALUES ($1)`, [ip]);
    // Opportunistic prune so the table cannot grow without bound.
    if (Math.random() < 0.05) {
      await query(`DELETE FROM checkout_attempts WHERE created_at < now() - interval '1 day'`);
    }
    return { allowed: true, retryAfterSeconds: 0 };
  } catch (err) {
    console.error('[rate-limit] check failed, allowing request:', err);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
