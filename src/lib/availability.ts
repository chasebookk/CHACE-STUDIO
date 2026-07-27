import { OPENING_HOURS, SLOT_STEP_MIN, type Tier } from '../config/booking';
import { query, expireStaleHolds } from './db';

/** "10:00" → minutes since midnight. Accepts "10:00:00" too. */
export function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** minutes since midnight → "HH:MM" */
export function toHHMM(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, '0');
  const m = String(min % 60).padStart(2, '0');
  return `${h}:${m}`;
}

interface BusyInterval {
  start: number; // minutes
  end: number;
}

/**
 * Intervals that block bookings on a date: confirmed bookings, live holds,
 * blocked_slots. `excludeBookingId` lets the webhook re-check a slot without
 * the booking colliding with itself.
 */
async function busyIntervals(
  date: string,
  excludeBookingId?: number
): Promise<{ busy: BusyInterval[]; wholeDayBlocked: boolean }> {
  await expireStaleHolds();

  const bookings = await query<{ start_time: string; end_time: string }>(
    `SELECT start_time, end_time FROM bookings
     WHERE date = $1
       AND ($2::int IS NULL OR id != $2)
       AND (status IN ('deposit_paid', 'paid_in_full')
            OR (status = 'pending_payment' AND expires_at > now()))`,
    [date, excludeBookingId ?? null]
  );

  const blocks = await query<{ start_time: string | null; end_time: string | null }>(
    `SELECT start_time, end_time FROM blocked_slots WHERE date = $1`,
    [date]
  );

  const busy: BusyInterval[] = bookings.rows.map((r) => ({
    start: toMin(r.start_time),
    end: toMin(r.end_time),
  }));

  let wholeDayBlocked = false;
  for (const b of blocks.rows) {
    if (b.start_time == null || b.end_time == null) wholeDayBlocked = true;
    else busy.push({ start: toMin(b.start_time), end: toMin(b.end_time) });
  }

  return { busy, wholeDayBlocked };
}

function candidateStarts(date: string, durationMin: number): number[] {
  const day = new Date(`${date}T00:00:00`).getDay();
  const hours = OPENING_HOURS[day];
  if (!hours) return [];

  const open = toMin(hours.open);
  const close = toMin(hours.close);
  const starts: number[] = [];
  for (let s = open; s + durationMin <= close; s += SLOT_STEP_MIN) {
    starts.push(s);
  }
  return starts;
}

function isPast(date: string, startMin: number): boolean {
  const slot = new Date(`${date}T${toHHMM(startMin)}:00`);
  return slot.getTime() <= Date.now();
}

/** Free start times ("HH:MM") for a package tier on a date. */
export async function freeSlots(date: string, tier: Tier): Promise<string[]> {
  const { busy, wholeDayBlocked } = await busyIntervals(date);
  if (wholeDayBlocked) return [];

  return candidateStarts(date, tier.durationMin)
    .filter((s) => !isPast(date, s))
    .filter((s) => !busy.some((b) => s < b.end && s + tier.durationMin > b.start))
    .map(toHHMM);
}

/** Re-check that a specific slot is free (used inside checkout + webhook). */
export async function slotIsFree(
  date: string,
  startMin: number,
  durationMin: number,
  excludeBookingId?: number
): Promise<boolean> {
  const day = new Date(`${date}T00:00:00`).getDay();
  const hours = OPENING_HOURS[day];
  if (!hours) return false;
  if (startMin < toMin(hours.open) || startMin + durationMin > toMin(hours.close)) return false;

  const { busy, wholeDayBlocked } = await busyIntervals(date, excludeBookingId);
  if (wholeDayBlocked) return false;
  return !busy.some((b) => startMin < b.end && startMin + durationMin > b.start);
}

/** Booking reference like CHACE-4F7K2Q (unambiguous alphabet). */
export function generateRef(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `CHACE-${s}`;
}
