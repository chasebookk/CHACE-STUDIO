# Private Contract: Divine Ayerume & Bolu — Wedding Coverage
*Build spec. Route `/contract/divine-bolu`. One page: contract, acknowledgement, signature, then payment. `noindex, nofollow`.*

---

## ⚠️ THREE THINGS HADLEY MUST CONFIRM BEFORE THIS GOES LIVE

1. **Day 1 hours.** The brief says "roughly ___ hours" at the traditional wedding venue. I have used **5 hours** to build the standard-rate comparison. Change it if wrong, it moves the headline saving.
2. **The month.** Dates are given as the 17th and 18th with no month. I have assumed **August 2026**. Confirm.
3. **Bolu's full name**, for the contract parties. Divine signs, but the bride should be named.

---

## Page design
Dark cinematic header, white contract body, generous line height because this is meant to be read. Orange to red gradient on the agree-and-pay button only, so nothing competes with it. Mobile first.

**Rotating image panel**, square, same crossfade as the Akinola page. Four images already in `public/assets/img/quotes/divine-bolu/`, `divine-bolu-01.jpg` first and fixed, then 02, 03, 04, looping. Caption underneath: *Divine & Bolu, pre-wedding session at CHACE STUDIOS*.

---

## Header
Eyebrow: **PRIVATE CONTRACT**
Title: **DIVINE & BOLU**
Sub: Wedding Photography Coverage · 17 and 18 August 2026

---

## Opening

> Divine, thank you.
>
> You have trusted CHACE STUDIOS with every step of this story: the proposal, the pre-wedding session, and now both wedding days. That means a great deal, and this agreement reflects it.
>
> Please take your time reading this. It sets out exactly what is covered, what is not, and what we each need from the other. When you are happy, sign at the bottom and you will be taken to payment.

---

## Schedule of services

### Day one, Sunday 17 August 2026, Traditional Wedding
- **Studio session at CHACE STUDIOS** following your makeup session. One outfit, one look, a small set of images of the two of you before the day begins
- **Coverage at the traditional wedding venue**, approximately **5 hours**
- Timings may shift slightly on the day and we will adapt with you

### Day two, Monday 18 August 2026, White Wedding
- **Couple portrait session at the venue** before guests arrive
- **Church ceremony coverage**
- **Reception coverage** back at the venue
- **Nine hours** of coverage, photographed to follow the order of proceedings

---

## Your investment

Present this as a clean table, then the total. This is the part that says thank you without saying it.

| | Standard rate | |
|---|---|---|
| Day one, studio session, one look | £200 | |
| Day one, venue coverage, 5 hours | £675 | *event rate, 10% multi-hour discount applied* |
| Day two, wedding coverage, 9 hours | £2,295 | *£300/hour, 15% multi-hour discount applied* |
| **Standard total** | **£3,170** | |
| **Your agreed rate** | **£500** | |
| **Discount applied** | **£2,670** | |

> This rate is offered in recognition of you choosing CHACE STUDIOS for every part of this journey, from the proposal through to the wedding itself. It is specific to you and to this booking.

**Payment**
- **£400 today** secures both dates
- **£100** due on or immediately after the second day

**Confidentiality.** State this plainly on the page and in the terms:
> The rate in this agreement is confidential and offered privately to Divine and Bolu. Please do not share it. CHACE STUDIOS' published rates remain as advertised.

---

## What is included
- All coverage listed in the schedule above
- Professional editing and retouching of the selected images
- **Delivery as a private online gallery link.** Final retouched images shared via online drive

## What is not included
State these clearly, not buried:
- **Video of any kind.** This agreement covers photography only
- **Printed deliverables.** No albums, prints or photo frames
- **Physical media.** No USB drives, iPads or any device
- Any additional day, location or session not listed above

---

## Terms and conditions

Numbered, plain English, in full on the page.

1. **Coverage focus.** Photography will concentrate on the couple and on the order of proceedings. CHACE STUDIOS will make every reasonable effort to capture the wider event.

2. **Moments that may be missed.** Because the primary focus is the bride and groom, some moments may not be captured, including the arrival of guests unknown to the photography team. This is accepted as a normal limitation of documentary wedding coverage and is not a failure of service.

3. **Logistics and movement.** Transporting the photography team, lighting and equipment between locations on both days is the responsibility of the client. This includes movement between the studio, the ceremony venue, the church and the reception.

4. **Timings.** Schedules given are approximate. Weddings run late. CHACE STUDIOS will remain flexible and adapt to the day as it unfolds. Significant overrun beyond the contracted hours may be chargeable and will be discussed at the time rather than added afterwards.

5. **Delivery.** A private online gallery will be provided for selection. Final edited images are delivered **7 to 10 days after selection**, with retouching completed within **4 to 6 working days** of that selection.

6. **Creative approach.** CHACE STUDIOS retains creative control over styling, framing and post-production, consistent with the work shown in the pre-wedding session.

7. **Payment.** £400 secures both dates. The remaining £100 is due on or immediately after 18 August 2026.

8. **Cancellation.** The deposit secures the dates and is non-refundable, as those dates are then held exclusively and turned away from other clients.

9. **Confidentiality of rate.** The rate in this agreement is private and specific to this booking.

10. **Use of images.** CHACE STUDIOS may use selected images for portfolio and social media. If you would prefer otherwise, say so in the notes below and it will be honoured.

11. **Force majeure.** In the event of illness, accident or circumstances genuinely beyond control, CHACE STUDIOS will arrange a suitably qualified replacement photographer or refund all monies paid.

---

## Acknowledgement

All required, cannot submit unless every box is ticked.

- [ ] I have read this agreement in full and I understand what is included and what is not.
- [ ] I understand this agreement covers **photography only**, and does not include video.
- [ ] I understand delivery is by **online gallery link only**, with no printed items, albums, frames, USB drives or other devices included.
- [ ] I understand the focus is on the couple and the order of proceedings, and that some moments, including the arrival of unfamiliar guests, may not be captured.
- [ ] I understand that **moving the photography team, lighting and equipment between locations on both days is my responsibility**.
- [ ] I understand the agreed rate is **confidential** and specific to this booking.
- [ ] I agree to the terms and conditions set out above.

---

## Fields

- **Full name of signing party** *(required, prefilled "Divine Ayerume", editable)*
- **Partner's full name** *(required, prefilled "Bolu")*
- **Email address** *(required)*
- **Mobile number** *(required)*
- **Venue name and address, day one** *(required)*
- **Venue and church addresses, day two** *(required)*
- **Anything else I should know** *(textarea, generous. Label it: "Special requests, family groupings, people I must not miss, anything at all.")*
- **Electronic signature**: typed full name *(required)*
- Date, auto-filled, read-only

Small print: *By typing your name you are signing this agreement electronically. A copy will be emailed to you.*

---

## On submit

1. Save the full signed contract to a `contracts` table, every field, every checkbox, timestamp and IP
2. Redirect to **Stripe Checkout for £400**, cards, Apple Pay, Google Pay, Klarna, Pay by Bank
3. On successful payment, send **four emails**:
   - To Hadley: **booking confirmation** with dates, venues and payment
   - To Hadley: **the completed signed contract**
   - To Divine: **booking confirmation** copy
   - To Divine: **the completed signed contract** copy
4. Confirmation page: thank you, both dates, balance due, studio address, contact details

Record it in the bookings system as a two-day booking so the calendar blocks **17 and 18 August 2026** and neither date can be booked by anyone else.

## Acceptance
- [ ] Cannot reach payment without every box ticked and the signature filled
- [ ] Four emails send, two to Hadley and two to Divine
- [ ] Both dates blocked in the calendar on payment
- [ ] Works properly on a phone
- [ ] noindex, nofollow
- [ ] Rate appears nowhere public
