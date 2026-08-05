import type { APIRoute } from 'astro';
import { query } from '../../lib/db';
import { getStripe } from '../../lib/stripe';
import { siteUrl } from '../../lib/env';
import { generateRef } from '../../lib/availability';
import { clientIp } from '../../lib/rate-limit';
import { getInvoice, money } from '../../config/invoices';

export const prerender = false;

/**
 * Pay a settled invoice for work already delivered.
 *
 * This route deliberately contains no availability check, no slot hold and no
 * booking write. The session it bills for has already been shot, so touching
 * the calendar would invent a commitment that does not exist. The only side
 * effects are an invoice row and a Stripe Checkout session.
 */

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const fail = (message: string, status = 400) =>
    wantsJson
      ? json({ error: message }, status)
      : new Response(
          `<!doctype html><meta charset="utf-8"><title>Payment problem</title>
           <body style="font-family:system-ui;max-width:34rem;margin:12vh auto;padding:0 1.5rem;line-height:1.6">
           <h1 style="font-size:1.3rem">We could not open the payment page</h1><p>${message}</p>`,
          { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );

  let slug = '';
  try {
    const form = await request.formData();
    slug = String(form.get('slug') ?? '').trim().slice(0, 80);
  } catch {
    return fail('The request could not be read. Please try again.');
  }

  const invoice = getInvoice(slug);
  if (!invoice) return fail('Unknown invoice.', 404);

  // Already settled: never charge twice for the same session.
  const existing = await query<{ ref: string; status: string }>(
    `SELECT ref, status FROM invoices WHERE slug = $1 AND status = 'paid' LIMIT 1`,
    [slug]
  );
  if (existing.rows[0]) {
    return fail('This invoice has already been paid in full. Nothing further is due.', 409);
  }

  const ref = generateRef();
  let invoiceId: number;
  try {
    const { rows } = await query<{ id: number }>(
      `INSERT INTO invoices
         (slug, ref, client_name, description, session_date, amount_pence, status, ip)
       VALUES ($1,$2,$3,$4,$5,$6,'unpaid',$7)
       RETURNING id`,
      [
        invoice.slug,
        ref,
        invoice.clientName,
        invoice.sessionLabel,
        invoice.sessionDate,
        invoice.amountPence,
        clientIp(request),
      ]
    );
    invoiceId = rows[0]!.id;
  } catch (err) {
    console.error('[invoice] could not create invoice row:', err);
    return fail('Something went wrong. Please try again, or email bookings@chace.studio.', 500);
  }

  try {
    const stripe = getStripe();
    const site = siteUrl();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'gbp',
      // In-person services, so Stripe's merchant-of-record mode does not apply.
      ...({ managed_payments: { enabled: false } } as any),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'gbp',
            unit_amount: invoice.amountPence,
            product_data: {
              name: `${invoice.title}, ${invoice.clientName}`,
              description: `${invoice.stripeLabel}. Paid in full. Ref ${ref}`,
            },
          },
        },
      ],
      // Stripe collects and verifies the email, which is where the receipt goes.
      metadata: { invoice_id: String(invoiceId), ref, kind: 'invoice' },
      success_url: `${site}/pay/${invoice.slug}/paid?ref=${encodeURIComponent(ref)}`,
      cancel_url: `${site}/pay/${invoice.slug}`,
    });

    await query(`UPDATE invoices SET stripe_session_id = $1 WHERE id = $2`, [session.id, invoiceId]);
    if (wantsJson) return json({ ok: true, url: session.url, ref, amount: money(invoice.amountPence) });
    return new Response(null, { status: 303, headers: { Location: session.url! } });
  } catch (err) {
    console.error('[invoice] stripe session error:', err);
    await query(`UPDATE invoices SET status = 'failed' WHERE id = $1`, [invoiceId]).catch(() => {});
    return fail('The payment page could not be opened. Please try again, or email bookings@chace.studio.', 502);
  }
};
