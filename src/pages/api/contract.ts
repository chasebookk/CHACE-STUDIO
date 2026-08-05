import type { APIRoute } from 'astro';
import { query } from '../../lib/db';
import { getStripe } from '../../lib/stripe';
import { siteUrl } from '../../lib/env';
import { generateRef } from '../../lib/availability';
import { clientIp } from '../../lib/rate-limit';
import { getContract, money, CONTRACT_PACKAGE_SLUG } from '../../config/contracts';
import { HOLD_MINUTES } from '../../config/booking';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

const str = (v: FormDataEntryValue | null, max = 300) => String(v ?? '').trim().slice(0, max);
const ticked = (v: FormDataEntryValue | null) => v === 'on' || v === 'true' || v === '1';

/**
 * Sign a private contract, then pay it in full.
 *
 * The signed agreement is written to the database *before* Stripe is called.
 * If the payment provider is down, or the client closes the tab at the
 * checkout screen, the signature and every acknowledgement still exist. The
 * webhook is what turns a signed contract into blocked calendar dates.
 */
export const POST: APIRoute = async ({ request }) => {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const fail = (message: string, status = 400) =>
    wantsJson
      ? json({ error: message }, status)
      : new Response(
          `<!doctype html><meta charset="utf-8"><title>Problem with the form</title>
           <body style="font-family:system-ui;max-width:34rem;margin:12vh auto;padding:0 1.5rem;line-height:1.6">
           <h1 style="font-size:1.3rem">We could not continue</h1><p>${message}</p>
           <p><a href="/contract/divine-bolu">Go back to the agreement</a></p>`,
          { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('The form could not be read. Please try again.');
  }

  const contract = getContract(str(form.get('slug'), 60));
  if (!contract) return fail('Unknown agreement.', 404);

  const signer_name = str(form.get('signer_name'), 120);
  const partner_name = str(form.get('partner_name'), 120);
  const email = str(form.get('email'), 160);
  const phone = str(form.get('phone'), 40);
  const venue_day1 = str(form.get('venue_day1'), 500);
  const venue_day2 = str(form.get('venue_day2'), 500);
  const notes = str(form.get('notes'), 3000);
  const signature_name = str(form.get('signature_name'), 120);

  // Divine is the sole contracting party. Bolu is named for context only, so
  // the partner field is optional and never carries a signature.
  const required: [string, string][] = [
    ['your full name', signer_name],
    ['your email address', email],
    ['your mobile number', phone],
    ['the day one venue', venue_day1],
    ['the day two venue and church', venue_day2],
    ['your typed signature', signature_name],
  ];
  const missing = required.filter(([, v]) => !v).map(([label]) => label);
  if (missing.length) return fail(`Please fill in ${missing.join(', ')}.`);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('That email address does not look right.');

  // Every acknowledgement is required. Enforced here, not just in the browser,
  // because this is the part that makes the agreement binding.
  const acknowledgements: Record<string, boolean> = {};
  for (const a of contract.acknowledgements) acknowledgements[a.id] = ticked(form.get(a.id));
  if (contract.acknowledgements.some((a) => !acknowledgements[a.id])) {
    return fail('Every acknowledgement box must be ticked before you can continue to payment.');
  }

  const ref = generateRef();
  const amount = contract.agreedTotalPence; // one payment, in full

  let contractId: number;
  try {
    // Re-signing after abandoning checkout supersedes the earlier unpaid row
    // rather than leaving two live agreements. Paid rows are never touched.
    const superseded = await query<{ ref: string }>(
      `UPDATE contracts SET status = 'superseded'
        WHERE slug = $1 AND lower(email) = lower($2) AND status = 'signed'
        RETURNING ref`,
      [contract.slug, email]
    );
    // Release the dates the abandoned attempt was still holding, so a
    // re-signature does not sit behind its own 30 minute hold.
    for (const old of superseded.rows) {
      await query(
        `UPDATE bookings SET status = 'expired'
          WHERE ref LIKE $1 AND status = 'pending_payment'`,
        [`${old.ref}-D%`]
      );
    }

    const { rows } = await query<{ id: number }>(
      `INSERT INTO contracts
         (slug, ref, signer_name, partner_name, email, phone, venue_day1, venue_day2,
          notes, acknowledgements, signature_name, signed_date, ip,
          total_pence, deposit_pence, balance_pence, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CURRENT_DATE,$12,$13,$14,$15,'signed')
       RETURNING id`,
      [
        contract.slug,
        ref,
        signer_name,
        partner_name,
        email,
        phone,
        venue_day1,
        venue_day2,
        notes || null,
        JSON.stringify(acknowledgements),
        signature_name,
        clientIp(request),
        contract.agreedTotalPence,
        amount,
        0,
      ]
    );
    contractId = rows[0]!.id;

    // Hold both dates for the length of the checkout. These are ordinary
    // pending_payment bookings, so the existing lazy expiry frees them again
    // if the payment is not completed, and the calendar treats them as busy
    // in the meantime. The webhook is what makes the hold permanent.
    for (const [i, day] of contract.days.entries()) {
      // A signed wedding contract takes precedence, so a clash never blocks
      // the signature. But it must not pass silently either: flag it on the
      // booking so it is visible in admin, and log it.
      const clash = await query<{ ref: string }>(
        `SELECT ref FROM bookings
          WHERE date = $1 AND ref NOT LIKE $2
            AND (status IN ('deposit_paid', 'paid_in_full')
                 OR (status = 'pending_payment' AND expires_at > now()))`,
        [day.date, `${ref}-D%`]
      );
      if (clash.rowCount) {
        console.error(
          `[contract] ${ref}: ${day.date} already has booking(s) ${clash.rows.map((r) => r.ref).join(', ')}`
        );
      }

      await query(
        `INSERT INTO bookings
           (ref, package_slug, tier_label, total_pence, paid_pence, balance_pence,
            name, email, phone, location_type, address, notes,
            date, start_time, end_time, status, expires_at)
         VALUES ($1,$2,$3,$4,0,0,$5,$6,$7,'on_location',$8,$9,$10,$11,$12,
                 'pending_payment', now() + ($13 || ' minutes')::interval)
         ON CONFLICT (ref) DO NOTHING`,
        [
          `${ref}-D${i + 1}`,
          CONTRACT_PACKAGE_SLUG,
          `${contract.title}, day ${i + 1} of ${contract.days.length}, ${day.heading}`,
          i === 0 ? contract.agreedTotalPence : 0,
          `${signer_name}${partner_name ? ` & ${partner_name}` : ''}`,
          email,
          phone,
          i === 0 ? venue_day1 : venue_day2,
          [
            `Contract ${ref}.`,
            clash.rowCount
              ? `[CONFLICT: ${day.date} also held by ${clash.rows.map((r) => r.ref).join(', ')}, resolve manually]`
              : '',
            notes ? `Client notes: ${notes}` : '',
          ]
            .filter(Boolean)
            .join(' '),
          day.date,
          day.blockFrom,
          day.blockTo,
          String(HOLD_MINUTES),
        ]
      );
    }
  } catch (err) {
    console.error('[contract] could not save signed contract:', err);
    return fail('Something went wrong saving your agreement. Please try again, or email bookings@chace.studio.', 500);
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
            unit_amount: amount,
            product_data: {
              name: `${contract.title}, wedding coverage, both days`,
              description: `Paid in full, covers 17 and 18 August 2026. Ref ${ref}`,
            },
          },
        },
      ],
      customer_email: email,
      // The webhook keys off kind = 'contract'.
      metadata: { contract_id: String(contractId), ref, kind: 'contract' },
      // Stripe requires at least 30 minutes; the extra buffer keeps the
      // session alive marginally longer than our own hold.
      expires_at: Math.floor(Date.now() / 1000) + HOLD_MINUTES * 60 + 120,
      success_url: `${site}/contract/${contract.slug}/confirmed?ref=${encodeURIComponent(ref)}`,
      cancel_url: `${site}/contract/${contract.slug}?signed=1`,
    });

    await query(`UPDATE contracts SET stripe_session_id = $1 WHERE id = $2`, [session.id, contractId]);
    if (wantsJson) return json({ ok: true, url: session.url, ref });
    return new Response(null, { status: 303, headers: { Location: session.url! } });
  } catch (err) {
    console.error('[contract] stripe session error:', err);
    // Release the dates immediately rather than leaving them held for 30
    // minutes over a payment page that never opened.
    await query(
      `UPDATE bookings SET status = 'expired'
        WHERE ref LIKE $1 AND status = 'pending_payment'`,
      [`${ref}-D%`]
    ).catch(() => {});
    // The signature is already saved, so say so rather than implying it is lost.
    return fail(
      'Your agreement was saved, but the payment page could not be opened. Please email bookings@chace.studio and we will send you a payment link.',
      502
    );
  }
};
