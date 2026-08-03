import type { APIRoute } from 'astro';
import { query } from '../../lib/db';
import { clientIp } from '../../lib/rate-limit';
import {
  REQUIRED_CONSENTS,
  OPTIONAL_CONSENTS,
  TRAVEL_OPTIONS,
  sendConsentEmails,
  plain,
  type ConsentRow,
} from '../../lib/training';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

/** Public form, so cap submissions per IP. Counted against the consent table
 *  itself, which already stores the IP, rather than adding a second store. */
const WINDOW_MINUTES = 15;
const MAX_PER_WINDOW = 6;

const str = (v: FormDataEntryValue | null, max = 300) => String(v ?? '').trim().slice(0, max);
const checked = (v: FormDataEntryValue | null) => v === 'on' || v === 'true' || v === '1' || v === 'yes';

export const POST: APIRoute = async ({ request }) => {
  // A browser posting a plain <form> wants a page back; fetch() wants JSON.
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const fail = (message: string, status = 400) =>
    wantsJson
      ? json({ error: message }, status)
      : new Response(`<!doctype html><meta charset="utf-8"><title>Problem with the form</title>
          <body style="font-family:system-ui;max-width:34rem;margin:12vh auto;padding:0 1.5rem;line-height:1.6">
          <h1 style="font-size:1.3rem">We could not save that</h1>
          <p>${plain(message)}</p>
          <p><a href="/training/consent">Go back to the form</a></p>`,
          { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('The form could not be read. Please try again.');
  }

  const ip = clientIp(request);

  const student_name = str(form.get('student_name'), 120);
  const student_dob = str(form.get('student_dob'), 10);
  const parent_name = str(form.get('parent_name'), 120);
  const parent_relationship = str(form.get('parent_relationship'), 60);
  const parent_phone = str(form.get('parent_phone'), 40);
  const parent_email = str(form.get('parent_email'), 160);
  const parent_address = str(form.get('parent_address'), 400);
  const emergency_name = str(form.get('emergency_name'), 120);
  const emergency_relationship = str(form.get('emergency_relationship'), 60);
  const emergency_phone = str(form.get('emergency_phone'), 40);
  const signature_name = str(form.get('signature_name'), 120);
  const travel_arrangement = str(form.get('travel_arrangement'), 20);
  const travel_other = str(form.get('travel_other'), 200);

  const required: [string, string][] = [
    ['the student’s full name', student_name],
    ['the student’s date of birth', student_dob],
    ['your full name', parent_name],
    ['your relationship to the student', parent_relationship],
    ['your mobile number', parent_phone],
    ['your email address', parent_email],
    ['your home address', parent_address],
    ['the emergency contact’s name', emergency_name],
    ['the emergency contact’s relationship', emergency_relationship],
    ['the emergency contact’s mobile number', emergency_phone],
    ['your typed signature', signature_name],
  ];
  const missing = required.filter(([, value]) => !value).map(([label]) => label);
  if (missing.length) return fail(`Please fill in ${missing.join(', ')}.`);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(student_dob)) return fail('Please give the date of birth as a real date.');
  const dob = new Date(`${student_dob}T12:00:00Z`);
  if (Number.isNaN(dob.getTime()) || dob > new Date()) return fail('That date of birth is not a real past date.');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parent_email)) return fail('That email address does not look right.');

  if (!TRAVEL_OPTIONS.some((o) => o.value === travel_arrangement)) {
    return fail('Please say how your child will get to and from the studio.');
  }
  if (travel_arrangement === 'other' && !travel_other) {
    return fail('Please describe the travel arrangement you have in mind.');
  }

  // Every required declaration must be ticked. This is the whole point of the
  // form, so it is enforced on the server and not left to the browser.
  const ungiven = REQUIRED_CONSENTS.filter((d) => !checked(form.get(d.id)));
  if (ungiven.length) {
    return fail('Every declaration in the "Your consent" section must be ticked before the form can be submitted.');
  }

  const optional = Object.fromEntries(
    OPTIONAL_CONSENTS.map((d) => [d.id, checked(form.get(d.id))])
  ) as Record<string, boolean>;

  try {
    const recent = await query<{ n: number }>(
      `SELECT count(*)::int AS n FROM training_consents
        WHERE ip = $1 AND created_at > now() - ($2 || ' minutes')::interval`,
      [ip, String(WINDOW_MINUTES)]
    );
    if (Number(recent.rows[0]?.n ?? 0) >= MAX_PER_WINDOW) {
      return fail('That is a lot of submissions in a short time. Please wait a few minutes and try again.', 429);
    }
  } catch (err) {
    // Fail open: never block a genuine consent over the throttle check.
    console.error('[training] rate-limit check failed, allowing:', err);
  }

  let saved: ConsentRow;
  try {
    const { rows } = await query<ConsentRow>(
      `INSERT INTO training_consents (
         student_name, student_dob, student_school, medical_notes,
         parent_name, parent_relationship, parent_phone, parent_email, parent_address,
         emergency_name, emergency_relationship, emergency_phone,
         travel_arrangement, travel_other,
         consent_guardian, consent_participation, consent_unpaid,
         consent_equipment, consent_details_accurate, consent_withdraw,
         consent_travel, consent_filming, consent_sharing,
         signature_name, signed_date, ip
       ) VALUES (
         $1,$2,$3,$4, $5,$6,$7,$8,$9, $10,$11,$12, $13,$14,
         true,true,true,true,true,true,
         $15,$16,$17, $18, CURRENT_DATE, $19
       ) RETURNING *`,
      [
        student_name,
        student_dob,
        str(form.get('student_school'), 160) || null,
        str(form.get('medical_notes'), 2000) || null,
        parent_name,
        parent_relationship,
        parent_phone,
        parent_email,
        parent_address,
        emergency_name,
        emergency_relationship,
        emergency_phone,
        travel_arrangement,
        travel_arrangement === 'other' ? travel_other : null,
        optional.consent_travel,
        optional.consent_filming,
        optional.consent_sharing,
        signature_name,
        ip,
      ]
    );
    saved = rows[0]!;
  } catch (err) {
    console.error('[training] could not save consent:', err);
    return fail('Something went wrong saving the form. Please try again, or email bookings@chace.studio.', 500);
  }

  // Saved first, emailed second, and deliberately awaited so a failure is
  // logged against the record. Either way the parent gets a confirmation.
  const mail = await sendConsentEmails(saved);

  const next = `/training/consent/received?name=${encodeURIComponent(parent_name.split(' ')[0])}${mail.parent ? '' : '&mail=0'}`;
  if (wantsJson) return json({ ok: true, id: saved.id, next, emailed: mail.parent });
  return new Response(null, { status: 303, headers: { Location: next } });
};
