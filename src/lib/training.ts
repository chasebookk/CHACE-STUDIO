import { sendEmail, ownerNotifyAddress } from './email';

/**
 * Youth Training Programme consent.
 *
 * The declarations live here rather than in the page so the form, the server
 * validation, the emails and the admin view all read from one list. Adding a
 * declaration here makes it required everywhere at once.
 */

export const PROGRAMME = {
  name: 'CHACE STUDIOS Youth Training Programme',
  season: 'Summer 2026',
  address: '5 Pocklingtons Walk, Leicester LE1 6BT',
  email: 'bookings@chace.studio',
} as const;

export interface Declaration {
  /** Column name in training_consents, and the form field name. */
  id: string;
  /** Shown to the parent. Wrapped in <strong> where marked. */
  label: string;
  /** Extra clarifying line, smaller. */
  note?: string;
}

/** All six must be ticked or the submission is refused. */
export const REQUIRED_CONSENTS: Declaration[] = [
  {
    id: 'consent_guardian',
    label: 'I confirm I am the parent or legal guardian of the student named above.',
  },
  {
    id: 'consent_participation',
    label:
      'I consent to my child taking part in the CHACE STUDIOS Youth Training Programme as described on this page.',
  },
  {
    id: 'consent_unpaid',
    label:
      'I understand the programme is <strong>free of charge</strong>, and that <strong>no wages, salary or payment of any kind</strong> will be made to my child. This is training and mentorship, not employment or work experience, and my child is under no obligation to produce work for CHACE STUDIOS.',
  },
  {
    id: 'consent_equipment',
    label:
      'I understand my child will handle professional camera and lighting equipment under supervision, and I accept that normal studio activity carries everyday risks.',
  },
  {
    id: 'consent_details_accurate',
    label:
      'I confirm the medical and emergency contact details above are accurate, and I will inform CHACE STUDIOS of any change.',
  },
  {
    id: 'consent_withdraw',
    label:
      'I understand that either my child or I may withdraw from the programme at any time, for any reason, without notice or penalty.',
  },
];

/** Each recorded separately; a parent may agree to one and decline another. */
export const OPTIONAL_CONSENTS: Declaration[] = [
  {
    id: 'consent_travel',
    label:
      '<strong>Travel and location shoots.</strong> I consent to my child travelling with CHACE STUDIOS to locations <strong>more than 5 miles from the studio</strong>, including location shoots and exhibitions. I understand I will be told the destination, timings and travel arrangements <strong>in advance of each trip</strong>, and that all costs are covered by CHACE STUDIOS.',
    note: 'If you leave this unticked, your child will only attend sessions at the studio and at locations within 5 miles.',
  },
  {
    id: 'consent_filming',
    label:
      '<strong>Photography and filming.</strong> I consent to my child being photographed or filmed during the programme for teaching and feedback purposes.',
  },
  {
    id: 'consent_sharing',
    label:
      "<strong>Sharing publicly.</strong> I consent to images or footage of my child, or work created by my child, being shared on CHACE STUDIOS' website and social media.",
    note: 'You may say yes to the line above and no to this one.',
  },
];

export const CURRICULUM: { week: number; title: string; detail: string }[] = [
  { week: 1, title: 'Creative approach', detail: 'How to see a picture. Camera handling, exposure, framing, and building an eye' },
  { week: 2, title: 'Studio lighting, foundations', detail: 'One light properly understood. Shaping, modifiers, and reading what light is doing' },
  { week: 3, title: 'Studio lighting, intensive', detail: 'Multi-light setups, portrait lighting patterns, and directing a subject' },
  { week: 4, title: 'Cinematography', detail: 'Movement, framing for motion, sound basics, and building a sequence' },
  { week: 5, title: 'Post-production', detail: 'Workflow and file management, culling, the editing software we use, and the rules that make an edit work' },
  { week: 6, title: 'Professional colour grading', detail: 'Grading for mood and consistency, then a final piece of their own' },
];

export const TRAVEL_OPTIONS = [
  { value: 'independent', label: 'My child will travel independently' },
  { value: 'parent', label: 'I will drop off and collect' },
  { value: 'other', label: 'Other' },
] as const;

export interface ConsentRow {
  id: number;
  student_name: string;
  student_dob: string;
  student_school: string | null;
  medical_notes: string | null;
  parent_name: string;
  parent_relationship: string;
  parent_phone: string;
  parent_email: string;
  parent_address: string;
  emergency_name: string;
  emergency_relationship: string;
  emergency_phone: string;
  travel_arrangement: string;
  travel_other: string | null;
  consent_guardian: boolean;
  consent_participation: boolean;
  consent_unpaid: boolean;
  consent_equipment: boolean;
  consent_details_accurate: boolean;
  consent_withdraw: boolean;
  consent_travel: boolean;
  consent_filming: boolean;
  consent_sharing: boolean;
  signature_name: string;
  signed_date: string;
  ip: string | null;
  created_at: string;
}

export function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Strips the <strong> markup from a declaration for plain contexts. */
export function plain(label: string): string {
  return label.replace(/<[^>]+>/g, '');
}

export function travelLabel(row: Pick<ConsentRow, 'travel_arrangement' | 'travel_other'>): string {
  const match = TRAVEL_OPTIONS.find((o) => o.value === row.travel_arrangement);
  if (row.travel_arrangement === 'other') return row.travel_other?.trim() || 'Other, unspecified';
  return match?.label ?? row.travel_arrangement;
}

function longDate(iso: string): string {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function wrap(inner: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f5f3ef;padding:24px">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;padding:28px">
      <div style="font-weight:800;letter-spacing:-0.5px;font-size:18px;color:#111;margin-bottom:4px">CHACE STUDIOS</div>
      <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#888;margin-bottom:22px">Youth Training Programme, ${PROGRAMME.season}</div>
      ${inner}
      <div style="margin-top:26px;padding-top:16px;border-top:1px solid #eee;color:#888;font-size:12px;line-height:19px">
        CHACE STUDIOS, ${PROGRAMME.address}<br>
        <a href="mailto:${PROGRAMME.email}" style="color:#888">${PROGRAMME.email}</a>
      </div>
    </div>
  </div>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#888;font-size:13px;width:42%;vertical-align:top">${label}</td>
    <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#111;font-size:14px;vertical-align:top">${value}</td>
  </tr>`;
}

function yesNo(given: boolean): string {
  return given
    ? '<span style="color:#0a7a3d;font-weight:700">Yes</span>'
    : '<span style="color:#a11;font-weight:700">No</span>';
}

function detailsTable(c: ConsentRow): string {
  return `<table style="width:100%;border-collapse:collapse">
    ${row('Student', escapeHtml(c.student_name))}
    ${row('Date of birth', longDate(c.student_dob))}
    ${row('School or college', escapeHtml(c.student_school || 'Not given'))}
    ${row('Medical, allergies, needs', escapeHtml(c.medical_notes || 'None declared'))}
    ${row('Parent or guardian', `${escapeHtml(c.parent_name)} (${escapeHtml(c.parent_relationship)})`)}
    ${row('Mobile', escapeHtml(c.parent_phone))}
    ${row('Email', `<a href="mailto:${escapeHtml(c.parent_email)}" style="color:#111">${escapeHtml(c.parent_email)}</a>`)}
    ${row('Home address', escapeHtml(c.parent_address).replace(/\n/g, '<br>'))}
    ${row('Emergency contact', `${escapeHtml(c.emergency_name)} (${escapeHtml(c.emergency_relationship)})<br>${escapeHtml(c.emergency_phone)}`)}
    ${row('Getting to the studio', escapeHtml(travelLabel(c)))}
  </table>`;
}

function optionalTable(c: ConsentRow): string {
  return `<table style="width:100%;border-collapse:collapse">
    ${row('Travel beyond 5 miles', yesNo(c.consent_travel))}
    ${row('Photography and filming', yesNo(c.consent_filming))}
    ${row('Sharing publicly', yesNo(c.consent_sharing))}
  </table>`;
}

async function notifyOwner(c: ConsentRow): Promise<boolean> {
  const body = wrap(`
    <h1 style="margin:0 0 6px;font-size:20px;color:#111">Training consent received</h1>
    <p style="margin:0 0 20px;color:#666;font-size:14px">
      Signed by ${escapeHtml(c.parent_name)} on ${longDate(c.signed_date)}. Record #${c.id}.
    </p>
    ${detailsTable(c)}
    <div style="margin-top:22px">
      <div style="color:#111;font-size:15px;font-weight:700;margin-bottom:8px">Optional consents</div>
      ${optionalTable(c)}
    </div>
    <div style="margin-top:22px;padding:16px;background:#faf7f2;border-radius:10px;color:#444;font-size:13px;line-height:20px">
      All six required declarations were ticked. Electronic signature:
      <strong style="color:#111">${escapeHtml(c.signature_name)}</strong>.
      ${c.ip ? `Submitted from ${escapeHtml(c.ip)}.` : ''}
    </div>`);

  return sendEmail(ownerNotifyAddress(), `Training consent received, ${plain(c.student_name)}`, body);
}

/** The parent's own copy. A parent should never sign something and receive nothing. */
async function notifyParent(c: ConsentRow): Promise<boolean> {
  const travelLine = c.consent_travel
    ? 'You have consented to travel beyond 5 miles. You will still be told the destination, timings and arrangements before each trip.'
    : 'You have not consented to travel beyond 5 miles, so your child will only attend sessions at the studio and at locations within 5 miles.';

  const body = wrap(`
    <h1 style="margin:0 0 6px;font-size:20px;color:#111">Thank you, ${escapeHtml(c.parent_name.split(' ')[0])}.</h1>
    <p style="margin:0 0 20px;color:#666;font-size:14px">
      This is your copy of the consent form you signed for
      <strong style="color:#111">${escapeHtml(c.student_name)}</strong> on ${longDate(c.signed_date)}. Keep it for your records.
    </p>
    ${detailsTable(c)}
    <div style="margin-top:22px">
      <div style="color:#111;font-size:15px;font-weight:700;margin-bottom:8px">What you agreed to</div>
      <ul style="margin:0;padding-left:18px;color:#444;font-size:14px;line-height:22px">
        ${REQUIRED_CONSENTS.map((d) => `<li>${plain(d.label)}</li>`).join('')}
      </ul>
    </div>
    <div style="margin-top:22px">
      <div style="color:#111;font-size:15px;font-weight:700;margin-bottom:8px">Optional permissions</div>
      ${optionalTable(c)}
      <p style="margin:12px 0 0;color:#666;font-size:13px;line-height:20px">${travelLine}</p>
    </div>
    <div style="margin-top:22px;padding:16px;background:#fff6e8;border-radius:10px;color:#5a3b00;font-size:14px;line-height:21px">
      <strong>You can change your mind at any time.</strong> Email
      <a href="mailto:${PROGRAMME.email}" style="color:#5a3b00">${PROGRAMME.email}</a>
      and we will update or withdraw this consent, no reason needed.
    </div>`);

  return sendEmail(c.parent_email, `Your copy: CHACE STUDIOS training consent for ${c.student_name}`, body);
}

/**
 * Both emails, never throwing. A consent record is already saved by the time
 * this runs, so a mail failure must not turn into a failed submission.
 */
export async function sendConsentEmails(c: ConsentRow): Promise<{ owner: boolean; parent: boolean }> {
  const [owner, parent] = await Promise.all([
    notifyOwner(c).catch((err) => {
      console.error('[training] owner email threw:', err);
      return false;
    }),
    notifyParent(c).catch((err) => {
      console.error('[training] parent email threw:', err);
      return false;
    }),
  ]);
  if (!owner || !parent) {
    console.error(`[training] consent #${c.id} saved but email incomplete (owner=${owner}, parent=${parent})`);
  }
  return { owner, parent };
}
