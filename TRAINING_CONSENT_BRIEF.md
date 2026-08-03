# CHACE STUDIOS Youth Training Programme — Parental Consent Form
*Build spec. Route: `/training/consent`. Two students, both minors, so this doubles as the safeguarding record.*

---

## ⚠️ Read this first, Hadley

This form is the paperwork. It is not the whole job. Before the first session you should have these in place, because you are about to work regularly with a 15 year old and a 17 year old:

1. **Enhanced DBS check.** Regular, scheduled contact with under-18s is exactly what an Enhanced DBS with the children's barred list is for. Apply now, it takes a few weeks. Parents may reasonably ask to see it.
2. **Public liability insurance that covers minors on your premises.** Check your policy explicitly says so, many exclude under-18s.
3. **A one page safeguarding policy.** What you do if a child discloses something, how you handle one-to-one situations, who your named contact is.
4. **Avoid being alone with one student where possible.** Two students is good. If one cancels, keep the door open, work in the main studio, or reschedule.
5. **The 15 year old is under school leaving age.** This is genuine unpaid education rather than work, which is why it sits outside employment rules, but the form must be explicit that no work is required of them and nothing they produce is used commercially without separate consent.

**This is not legal advice.** For a free training scheme with two students and full parental consent you are on reasonable ground, but if you scale this or take on more young people, spend an hour with a solicitor or your insurer.

---

## Page design
Brand-consistent with the rest of the site: dark cinematic header, white form body, orange to red gradient on the submit button. Calm and serious, this is a document a parent is signing. **`noindex, nofollow`.**

Mobile first, this will be opened on a phone.

---

## Content

### Header
**CHACE STUDIOS**
Youth Training Programme, Summer 2026
Parental Consent and Registration

### Intro block
> A free six week training programme in photography and cinematography for two young people, run at CHACE STUDIOS in Leicester. This form records your consent as a parent or guardian, and confirms the details we need to run the programme safely.

**At a glance**
- Six weeks, three sessions per week, starting the first week of August 2026
- CHACE STUDIOS, 5 Pocklingtons Walk, Leicester LE1 6BT
- **Completely free.** No fees, no charges
- **This is training, not employment.** No wages or salary are paid, and your child is not required to work
- Any travel or location costs during the programme are covered by CHACE STUDIOS

### What your child will learn
Present as six clean week blocks, not a wall of text:

| Week | Focus |
|---|---|
| 1 | **Creative approach.** How to see a picture. Camera handling, exposure, framing, and building an eye |
| 2 | **Studio lighting, foundations.** One light properly understood. Shaping, modifiers, and reading what light is doing |
| 3 | **Studio lighting, intensive.** Multi-light setups, portrait lighting patterns, and directing a subject |
| 4 | **Cinematography.** Movement, framing for motion, sound basics, and building a sequence |
| 5 | **Post-production.** Workflow and file management, culling, the editing software we use, and the rules that make an edit work |
| 6 | **Professional colour grading.** Grading for mood and consistency, then a final piece of their own |

Close with:
> Sessions are practical. Your child will be handling professional cameras and lighting from the first week, with supervision throughout.

---

## Form fields

**Student**
- Full name of student *(required)*
- Date of birth *(required)*
- School or college
- Any medical conditions, allergies or additional needs we should know about *(textarea, optional but prompt honestly)*

**Parent or guardian**
- Full name *(required)*
- Relationship to student *(required)*
- Mobile number *(required)*
- Email address *(required)*
- Home address *(required)*

**Emergency contact, someone other than the above**
- Full name *(required)*
- Relationship *(required)*
- Mobile number *(required)*

**Getting to and from the studio**
- Radio: My child will travel independently / I will drop off and collect / Other, with a text field

---

## Consent declarations

Required, must all be ticked to submit:

- [ ] I confirm I am the parent or legal guardian of the student named above.
- [ ] I consent to my child taking part in the CHACE STUDIOS Youth Training Programme as described on this page.
- [ ] I understand the programme is **free of charge**, and that **no wages, salary or payment of any kind** will be made to my child. This is training and mentorship, not employment or work experience, and my child is under no obligation to produce work for CHACE STUDIOS.
- [ ] I understand my child will handle professional camera and lighting equipment under supervision, and I accept that normal studio activity carries everyday risks.
- [ ] I confirm the medical and emergency contact details above are accurate, and I will inform CHACE STUDIOS of any change.
- [ ] I understand that either my child or I may withdraw from the programme at any time, for any reason, without notice or penalty.

Optional, each a separate opt-in so a parent can say yes to one and no to another:

- [ ] **Travel and location shoots.** I consent to my child travelling with CHACE STUDIOS to locations **more than 5 miles from the studio**, including location shoots and exhibitions. I understand I will be told the destination, timings and travel arrangements **in advance of each trip**, and that all costs are covered by CHACE STUDIOS. *(If you leave this unticked, your child will only attend sessions at the studio and at locations within 5 miles.)*
- [ ] **Photography and filming.** I consent to my child being photographed or filmed during the programme for teaching and feedback purposes.
- [ ] **Sharing publicly.** I consent to images or footage of my child, or work created by my child, being shared on CHACE STUDIOS' website and social media. *(You may say yes to the line above and no to this one.)*

**Declaration and signature**
- Typed full name as an electronic signature *(required)*
- Date, auto-filled, read-only
- Small print: *By typing your name you are signing this form electronically. A copy will be emailed to you.*

---

## Behaviour on submit

1. **Save to the database.** New `training_consents` table, every field, plus timestamp and IP. Never lose a consent record.
2. **Email Hadley** at `bookings@chace.studio` with the full submission, subject: `Training consent received, [student name]`.
3. **Email the parent a copy** at the address they gave, so they hold their own record. This matters, a parent should never sign something and receive nothing.
4. Show a warm confirmation page: what happens next, the studio address, and Hadley's contact details.
5. Validate properly, and if the email fails, still save and still confirm. Never lose a submission to a mail error.

## Admin
Add a **Consents** section to `/admin` listing submissions, with each one expandable to show the full record and which optional consents were given. Hadley needs to see at a glance who has and has not consented to travel.

## Acceptance
- [ ] Works on a 375px phone
- [ ] Cannot submit without every required consent ticked
- [ ] Parent receives their copy
- [ ] Submission appears in admin
- [ ] Page is noindex
- [ ] Travel consent is genuinely optional and recorded separately
