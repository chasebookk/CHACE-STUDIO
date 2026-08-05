import { sendEmail, ownerNotifyAddress } from './email';
import {
  getContract,
  money,
  longDate,
  balancePence,
  discountPence,
  type Contract,
} from '../config/contracts';

/**
 * The four emails a signed-and-paid contract sends: a booking confirmation
 * and a copy of the signed agreement, each to the studio and to the client.
 *
 * They are separate messages on purpose. The confirmation is the thing you
 * act on; the contract copy is the thing you file. Neither ever throws.
 */

export interface ContractRow {
  id: number;
  slug: string;
  ref: string;
  signer_name: string;
  partner_name: string;
  email: string;
  phone: string;
  venue_day1: string;
  venue_day2: string;
  notes: string | null;
  acknowledgements: Record<string, boolean>;
  signature_name: string;
  signed_date: string;
  ip: string | null;
  total_pence: number;
  deposit_pence: number;
  balance_pence: number;
  status: string;
  stripe_payment_intent: string | null;
  booking_ids: number[] | null;
  created_at: string;
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function nl2br(s: string): string {
  return esc(s).replace(/\n/g, '<br>');
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

function wrap(inner: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f5f3ef;padding:24px">
    <div style="max-width:620px;margin:0 auto;background:#fff;border-radius:14px;padding:28px">
      <div style="font-weight:800;letter-spacing:-0.5px;font-size:18px;color:#111;margin-bottom:4px">CHACE STUDIOS</div>
      <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#888;margin-bottom:22px">Wedding Photography</div>
      ${inner}
      <div style="margin-top:26px;padding-top:16px;border-top:1px solid #eee;color:#888;font-size:12px;line-height:19px">
        CHACE STUDIOS, 5 Pocklingtons Walk, Leicester LE1 6BT<br>
        <a href="mailto:bookings@chace.studio" style="color:#888">bookings@chace.studio</a>
      </div>
    </div>
  </div>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:9px 0;border-bottom:1px solid #f0f0f0;color:#888;font-size:13px;width:40%;vertical-align:top">${label}</td>
    <td style="padding:9px 0;border-bottom:1px solid #f0f0f0;color:#111;font-size:14px;vertical-align:top">${value}</td>
  </tr>`;
}

function scheduleTable(c: Contract, r: ContractRow): string {
  const [d1, d2] = c.days;
  return `<table style="width:100%;border-collapse:collapse">
    ${row('Day one', `${longDate(d1!.date)}<br><span style="color:#666">${esc(d1!.heading)}</span>`)}
    ${row('Day one venue', nl2br(r.venue_day1))}
    ${row('Day two', `${longDate(d2!.date)}<br><span style="color:#666">${esc(d2!.heading)}</span>`)}
    ${row('Day two venues', nl2br(r.venue_day2))}
  </table>`;
}

// ---- 1 & 3: booking confirmation -------------------------------------------

function confirmationBody(c: Contract, r: ContractRow, forOwner: boolean): string {
  const heading = forOwner
    ? `Contract signed and deposit paid, ${esc(r.signer_name)}`
    : `You're booked in, ${esc(r.signer_name.split(' ')[0])}.`;

  const intro = forOwner
    ? `Both dates are now held and blocked in the calendar. Reference <strong style="color:#111">${esc(r.ref)}</strong>.`
    : `Both of your wedding dates are secured. Reference <strong style="color:#111">${esc(r.ref)}</strong>, quote it in any message to us.`;

  const contactBlock = forOwner
    ? `<table style="width:100%;border-collapse:collapse;margin-top:18px">
         ${row('Client', `${esc(r.signer_name)} &amp; ${esc(r.partner_name)}`)}
         ${row('Email', `<a href="mailto:${esc(r.email)}" style="color:#111">${esc(r.email)}</a>`)}
         ${row('Mobile', `<a href="tel:${esc(r.phone)}" style="color:#111">${esc(r.phone)}</a>`)}
       </table>`
    : '';

  const notesBlock = r.notes
    ? `<div style="margin-top:20px;padding:16px;background:#faf7f2;border-radius:10px">
         <div style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">
           ${forOwner ? 'Notes from the client' : 'What you told us'}
         </div>
         <div style="color:#111;font-size:14px;line-height:21px;white-space:pre-wrap">${esc(r.notes)}</div>
       </div>`
    : '';

  return wrap(`
    <h1 style="margin:0 0 6px;font-size:20px;color:#111">${heading}</h1>
    <p style="margin:0 0 20px;color:#666;font-size:14px;line-height:21px">${intro}</p>
    ${scheduleTable(c, r)}
    ${contactBlock}
    <table style="width:100%;border-collapse:collapse;margin-top:18px">
      ${row('Paid today', `<strong>${money(r.deposit_pence)}</strong>`)}
      ${row('Balance to come', `${money(r.balance_pence)}, due on or immediately after ${longDate(c.days[1]!.date)}`)}
      ${row('Agreed total', money(r.total_pence))}
    </table>
    ${notesBlock}
    <div style="margin-top:20px;padding:16px;background:#fff6e8;border-radius:10px;color:#5a3b00;font-size:13px;line-height:20px">
      This rate is confidential and specific to this booking.
    </div>`);
}

// ---- 2 & 4: the signed contract copy ----------------------------------------

function contractCopyBody(c: Contract, r: ContractRow, forOwner: boolean): string {
  const acks = c.acknowledgements
    .map(
      (a) =>
        `<li style="margin-bottom:8px">${stripTags(a.label)}
           <span style="color:#0a7a3d;font-weight:700">${r.acknowledgements?.[a.id] ? '✓ agreed' : '— NOT AGREED'}</span>
         </li>`
    )
    .join('');

  const terms = c.terms
    .map((t, i) => `<li style="margin-bottom:10px"><strong>${esc(t.heading)}.</strong> ${esc(t.body)}</li>`)
    .join('');

  return wrap(`
    <h1 style="margin:0 0 6px;font-size:20px;color:#111">Signed agreement, ${esc(c.title)}</h1>
    <p style="margin:0 0 20px;color:#666;font-size:14px;line-height:21px">
      ${forOwner ? 'Your copy of the executed contract.' : 'This is your copy of the agreement you signed. Keep it for your records.'}
      Reference <strong style="color:#111">${esc(r.ref)}</strong>.
    </p>

    <table style="width:100%;border-collapse:collapse">
      ${row('Signed by', esc(r.signature_name))}
      ${row('Date signed', longDate(r.signed_date))}
      ${row('Parties', `${esc(r.signer_name)} and ${esc(r.partner_name)}, with CHACE STUDIOS`)}
      ${row('Email', esc(r.email))}
      ${row('Mobile', esc(r.phone))}
    </table>

    <h2 style="margin:24px 0 10px;font-size:15px;color:#111">Schedule of services</h2>
    ${scheduleTable(c, r)}
    ${c.days
      .map(
        (d) => `<div style="margin-top:12px">
          <div style="font-size:13px;font-weight:700;color:#111;margin-bottom:4px">${longDate(d.date)}, ${esc(d.heading)}</div>
          <ul style="margin:0;padding-left:18px;color:#444;font-size:13px;line-height:20px">
            ${d.items.map((i) => `<li>${esc(i)}</li>`).join('')}
          </ul>
        </div>`
      )
      .join('')}

    <h2 style="margin:24px 0 10px;font-size:15px;color:#111">Investment</h2>
    <table style="width:100%;border-collapse:collapse">
      ${c.priceRows.map((p) => row(esc(p.label), money(p.pence))).join('')}
      ${row('<strong>Standard total</strong>', `<strong>${money(c.standardTotalPence)}</strong>`)}
      ${row('<strong>Agreed rate</strong>', `<strong>${money(c.agreedTotalPence)}</strong>`)}
      ${row('Discount applied', money(discountPence(c)))}
      ${row('Paid today', money(r.deposit_pence))}
      ${row('Balance', money(r.balance_pence))}
    </table>

    <h2 style="margin:24px 0 10px;font-size:15px;color:#111">Included</h2>
    <ul style="margin:0;padding-left:18px;color:#444;font-size:13px;line-height:20px">
      ${c.included.map((i) => `<li>${esc(i)}</li>`).join('')}
    </ul>
    <h2 style="margin:18px 0 10px;font-size:15px;color:#111">Not included</h2>
    <ul style="margin:0;padding-left:18px;color:#444;font-size:13px;line-height:20px">
      ${c.excluded.map((i) => `<li>${esc(i)}</li>`).join('')}
    </ul>

    <h2 style="margin:24px 0 10px;font-size:15px;color:#111">Acknowledgements</h2>
    <ul style="margin:0;padding-left:18px;color:#444;font-size:13px;line-height:20px">${acks}</ul>

    <h2 style="margin:24px 0 10px;font-size:15px;color:#111">Terms and conditions</h2>
    <ol style="margin:0;padding-left:18px;color:#444;font-size:13px;line-height:20px">${terms}</ol>

    <div style="margin-top:22px;padding:16px;background:#faf7f2;border-radius:10px;color:#444;font-size:12.5px;line-height:19px">
      Signed electronically by typing the name above on ${longDate(r.signed_date)}.
      ${r.ip ? `Submitted from ${esc(r.ip)}.` : ''}
      This agreement and the rate within it are confidential.
    </div>`);
}

/** All four messages. Resolves even if some fail; failures are logged. */
export async function sendContractEmails(r: ContractRow): Promise<{ sent: number; total: number }> {
  const c = getContract(r.slug);
  if (!c) {
    console.error(`[contract] unknown contract slug ${r.slug}, cannot email`);
    return { sent: 0, total: 4 };
  }

  const owner = ownerNotifyAddress();
  const jobs: [string, string, string][] = [
    [owner, `Booking confirmed: ${c.title}, ${r.ref}`, confirmationBody(c, r, true)],
    [owner, `Signed contract: ${c.title}, ${r.ref}`, contractCopyBody(c, r, true)],
    [r.email, `Your CHACE STUDIOS booking is confirmed, ${r.ref}`, confirmationBody(c, r, false)],
    [r.email, `Your copy of the signed agreement, ${r.ref}`, contractCopyBody(c, r, false)],
  ];

  const results = await Promise.all(
    jobs.map(([to, subject, html]) =>
      sendEmail(to, subject, html).catch((err) => {
        console.error(`[contract] email "${subject}" threw:`, err);
        return false;
      })
    )
  );

  const sent = results.filter(Boolean).length;
  if (sent < results.length) {
    console.error(`[contract] ${r.ref}: only ${sent} of ${results.length} emails sent`);
  }
  return { sent, total: results.length };
}
