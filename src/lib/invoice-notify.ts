import { sendEmail, ownerNotifyAddress } from './email';
import { getInvoice, money, longDate } from '../config/invoices';

/**
 * Two receipts for a settled invoice: one to the studio, one to whoever paid.
 * Never throws, so an email problem can never fail the webhook and cause
 * Stripe to replay a payment that has already been recorded.
 */

export interface InvoiceRow {
  id: number;
  slug: string;
  ref: string;
  client_name: string;
  description: string;
  session_date: string | null;
  amount_pence: number;
  status: string;
  payer_email: string | null;
  payer_name: string | null;
  stripe_payment_intent: string | null;
  paid_at: string | null;
  created_at: string;
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wrap(inner: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f5f3ef;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:28px">
      <div style="font-weight:800;letter-spacing:-0.5px;font-size:18px;color:#111;margin-bottom:4px">CHACE STUDIOS</div>
      <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#888;margin-bottom:22px">Receipt</div>
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

function detail(r: InvoiceRow): string {
  return `<table style="width:100%;border-collapse:collapse">
    ${row('Client', esc(r.client_name))}
    ${row('Session', esc(r.description))}
    ${r.session_date ? row('Shot on', longDate(r.session_date)) : ''}
    ${row('Amount', `<strong>${money(r.amount_pence)}</strong>`)}
    ${row('Status', '<strong style="color:#0a7a3d">Paid in full</strong>')}
    ${row('Reference', esc(r.ref))}
  </table>`;
}

export async function sendInvoiceReceipts(r: InvoiceRow): Promise<{ sent: number; total: number }> {
  const invoice = getInvoice(r.slug);
  const title = invoice?.title ?? 'Session';

  const ownerBody = wrap(`
    <h1 style="margin:0 0 6px;font-size:20px;color:#111">Payment received, ${esc(r.client_name)}</h1>
    <p style="margin:0 0 20px;color:#666;font-size:14px;line-height:21px">
      ${esc(title)} settled in full. This was an invoice for work already delivered, so
      nothing has been added to the calendar.
    </p>
    ${detail(r)}
    <table style="width:100%;border-collapse:collapse;margin-top:18px">
      ${row('Paid by', esc(r.payer_name || 'Not given'))}
      ${row('Payer email', r.payer_email ? `<a href="mailto:${esc(r.payer_email)}" style="color:#111">${esc(r.payer_email)}</a>` : 'Not given')}
      ${row('Stripe payment', esc(r.stripe_payment_intent || 'Not recorded'))}
    </table>`);

  const clientBody = wrap(`
    <h1 style="margin:0 0 6px;font-size:20px;color:#111">Thank you, your payment is received.</h1>
    <p style="margin:0 0 20px;color:#666;font-size:14px;line-height:21px">
      This is your receipt for the ${esc(title.toLowerCase())}. It is
      <strong style="color:#111">paid in full</strong> with nothing further to pay.
    </p>
    ${detail(r)}
    <div style="margin-top:20px;padding:16px;background:#fff6e8;border-radius:10px;color:#5a3b00;font-size:13.5px;line-height:20px">
      Keep this email as your receipt. Any questions, just reply or write to
      <a href="mailto:bookings@chace.studio" style="color:#5a3b00">bookings@chace.studio</a>.
    </div>`);

  const jobs: [string, string, string][] = [
    [ownerNotifyAddress(), `Payment received: ${title}, ${r.client_name}, ${money(r.amount_pence)}`, ownerBody],
  ];
  // The receipt goes to whoever actually paid, which Stripe verifies.
  if (r.payer_email) {
    jobs.push([r.payer_email, `Your CHACE STUDIOS receipt, ${r.ref}`, clientBody]);
  } else {
    console.error(`[invoice] ${r.ref} has no payer email, client receipt not sent`);
  }

  const results = await Promise.all(
    jobs.map(([to, subject, html]) =>
      sendEmail(to, subject, html).catch((err) => {
        console.error(`[invoice] email "${subject}" threw:`, err);
        return false;
      })
    )
  );

  const sent = results.filter(Boolean).length;
  if (sent < results.length) console.error(`[invoice] ${r.ref}: only ${sent} of ${results.length} receipts sent`);
  return { sent, total: results.length };
}
