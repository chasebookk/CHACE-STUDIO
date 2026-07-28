import { phoneKey } from '../config/booking';
import { query } from './db';

/**
 * Has this person paid for a podcast session before?
 *
 * Matches on email (case insensitive) or phone (digits only, UK country code
 * and trunk zero stripped). Phone matching is done in JS rather than SQL so
 * the same normalisation rule applies to stored and incoming numbers.
 */
export async function isReturningPodcastClient(
  email: string | null | undefined,
  phone: string | null | undefined
): Promise<boolean> {
  const wantEmail = (email ?? '').trim().toLowerCase();
  const wantPhone = phoneKey(phone);
  if (!wantEmail && !wantPhone) return false;

  const { rows } = await query<{ email: string; phone: string | null }>(
    `SELECT email, phone FROM bookings
      WHERE package_slug = 'podcast'
        AND status IN ('deposit_paid', 'paid_in_full')`
  );

  return rows.some((r) => {
    if (wantEmail && r.email && r.email.trim().toLowerCase() === wantEmail) return true;
    const rowPhone = phoneKey(r.phone);
    return !!wantPhone && rowPhone !== '' && rowPhone === wantPhone;
  });
}
