import { getPackage, getStudio } from '../config/booking';
import type { BookingRow } from './db';
import { buildIcs } from './ics';
import { sendEmail, OWNER_EMAIL, ownerNotifyAddress, type Attachment } from './email';

const money = (p: number) => `£${(p / 100).toFixed(2)}`;

const hhmm = (t: string) => String(t).slice(0, 5);

function longDate(date: string): string {
  return new Date(`${String(date).slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function durationMinutes(b: BookingRow): number {
  const [sh, sm] = hhmm(b.start_time).split(':').map(Number);
  const [eh, em] = hhmm(b.end_time).split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

/** Where the shoot happens, as a single human-readable line. */
export function locationLine(b: BookingRow): string {
  if (b.location_type === 'on_location') {
    return `On location — ${b.address || 'address to be confirmed'}`;
  }
  const studio = getStudio(b.studio_id);
  return studio ? `${studio.name}, ${studio.address}` : '5 Pocklingtons Walk, Leicester LE1 6BT, UK';
}

function packageTitle(b: BookingRow): string {
  return getPackage(b.package_slug)?.title ?? b.package_slug;
}

function icsFor(b: BookingRow): Attachment {
  const title = `CHACE — ${packageTitle(b)} — ${b.name}`;
  return {
    filename: `chace-${b.ref}.ics`,
    content: buildIcs({
      uid: `${b.ref}@chace.studio`,
      title,
      description: `Booking reference ${b.ref}. ${packageTitle(b)} — ${b.tier_label}. Questions: ${OWNER_EMAIL}`,
      location: locationLine(b),
      date: String(b.date).slice(0, 10),
      startTime: hhmm(b.start_time),
      endTime: hhmm(b.end_time),
    }),
  };
}

const wrap = (inner: string) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f5f5f5;padding:28px 12px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#ffa600 0%,#ff1909 55%,#840202 100%);padding:26px 28px">
      <div style="font-size:22px;font-weight:800;letter-spacing:2px;color:#ffffff">CHACE STUDIOS</div>
    </div>
    <div style="padding:28px">${inner}</div>
    <div style="padding:18px 28px;border-top:1px solid #eee;color:#888;font-size:12px">
      CHACE STUDIOS · 5 Pocklingtons Walk, Leicester LE1 6BT ·
      <a href="mailto:${OWNER_EMAIL}" style="color:#888">${OWNER_EMAIL}</a>
    </div>
  </div>
</div>`;

const row = (label: string, value: string) => `
<tr>
  <td style="padding:7px 0;color:#666;font-size:14px;vertical-align:top;width:150px">${label}</td>
  <td style="padding:7px 0;color:#111;font-size:14px;font-weight:600">${value}</td>
</tr>`;

/** Full shoot details to the studio owner. */
async function notifyOwner(b: BookingRow): Promise<boolean> {
  const subject = `New booking — ${packageTitle(b)} — ${String(b.date).slice(0, 10)} ${hhmm(b.start_time)}`;

  const body = wrap(`
    <h1 style="margin:0 0 6px;font-size:20px;color:#111">New booking confirmed</h1>
    <p style="margin:0 0 20px;color:#666;font-size:14px">Reference <strong style="color:#111">${b.ref}</strong></p>
    <table style="width:100%;border-collapse:collapse">
      ${row('Client', b.name)}
      ${row('Email', `<a href="mailto:${b.email}" style="color:#111">${b.email}</a>`)}
      ${row('Phone', b.phone || '—')}
      ${row('Package', packageTitle(b))}
      ${row('Option', b.tier_label)}
      ${row('Date', longDate(b.date))}
      ${row('Time', `${hhmm(b.start_time)}–${hhmm(b.end_time)} (${durationMinutes(b)} min)`)}
      ${row('Where', locationLine(b))}
      ${row('Paid', money(b.paid_pence))}
      ${row('Balance due', b.balance_pence > 0 ? `${money(b.balance_pence)} — collect on/after the session` : 'None — paid in full')}
      ${row('Promo code', b.promo_code || '—')}
    </table>
    <div style="margin-top:20px;padding:16px;background:#faf7f2;border-radius:10px">
      <div style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Client notes</div>
      <div style="color:#111;font-size:14px;white-space:pre-wrap">${b.notes ? escapeHtml(b.notes) : '—'}</div>
    </div>`);

  return sendEmail(ownerNotifyAddress(), subject, body, [icsFor(b)]);
}

/** Branded confirmation to the client. */
async function notifyClient(b: BookingRow): Promise<boolean> {
  const subject = `Your CHACE STUDIOS booking is confirmed — ${b.ref}`;

  const balanceBlock =
    b.balance_pence > 0
      ? `<div style="margin-top:18px;padding:16px;background:#fff6e8;border-radius:10px;color:#5a3b00;font-size:14px">
           <strong>Balance to come:</strong> ${money(b.balance_pence)} is due on or after your session.
           We'll send you a secure payment link — nothing to do right now.
         </div>`
      : '';

  const body = wrap(`
    <h1 style="margin:0 0 6px;font-size:20px;color:#111">You're booked in, ${escapeHtml(b.name.split(' ')[0])}.</h1>
    <p style="margin:0 0 20px;color:#666;font-size:14px">
      Reference <strong style="color:#111">${b.ref}</strong> — quote this in any message to us.
    </p>
    <table style="width:100%;border-collapse:collapse">
      ${row('What', `${packageTitle(b)} — ${b.tier_label}`)}
      ${row('When', `${longDate(b.date)}<br>${hhmm(b.start_time)}–${hhmm(b.end_time)}`)}
      ${row('Where', locationLine(b))}
      ${row('Paid today', money(b.paid_pence))}
    </table>
    ${balanceBlock}
    <div style="margin-top:20px">
      <div style="color:#111;font-size:15px;font-weight:700;margin-bottom:8px">How to prepare</div>
      <ul style="margin:0;padding-left:18px;color:#444;font-size:14px;line-height:22px">
        <li>Arrive 5 minutes early so we start on time — sessions run to the slot.</li>
        <li>Bring outfits pressed and on hangers; add a spare option if you're unsure.</li>
        <li>Send any references or mood-board links ahead of the day.</li>
        <li>Need to move your slot? Email us as early as you can.</li>
      </ul>
    </div>
    <p style="margin:22px 0 0;color:#666;font-size:13px">
      The attached calendar file adds the shoot to your phone in one tap.
    </p>`);

  return sendEmail(b.email, subject, body, [icsFor(b)]);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Fire both booking emails. Always resolves — failures are logged so a
 * payment is never lost to an email problem.
 */
export async function sendBookingNotifications(b: BookingRow): Promise<void> {
  const [owner, client] = await Promise.all([
    notifyOwner(b).catch((err) => {
      console.error('[notify] owner email threw:', err);
      return false;
    }),
    notifyClient(b).catch((err) => {
      console.error('[notify] client email threw:', err);
      return false;
    }),
  ]);
  console.log(`[notify] ${b.ref}: owner=${owner ? 'sent' : 'skipped/failed'} client=${client ? 'sent' : 'skipped/failed'}`);
}
