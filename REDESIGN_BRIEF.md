# CHACE STUDIOS — Website Redesign Brief
*This is the complete spec. Read it fully before writing code, then implement it in this Astro project. The dev server runs with `npm run dev`. Work section by section; keep commits small.*

## 1. The goal
Rebuild this site to be **simple, straightforward, and motion-rich** like https://www.streams-studio.com/ — but we take ONLY their structural/UX patterns, none of their content or colors:

- One bold statement hero. Minimal nav. No clutter.
- Content lives in **horizontally scrolling card rows** (scroll-snap carousels): drag/arrow-buttons on desktop, natural swipe on mobile, small arrow controls at row ends.
- Cards lift/scale subtly on hover; images zoom slightly. Sections fade/slide in on scroll (IntersectionObserver, CSS transitions — no heavy animation libraries).
- Sticky simple header; clean roomy footer with newsletter-style email block.

## 2. Hard rules
- The name is **CHACE STUDIOS** — never "CHASE", never "Chasebookk". If any copied source text contains those, replace. File `public/assets/img/work-label-no7.png` etc. from the old build: remove any asset that displays old branding.
- **Do not call the business "a podcast studio."** It is a photography & media studio; podcast is one offering among many.
- Brand guideline (keep): near-black `#000000` base, white text, red accent family `#840202 → #FF1909`, big condensed headlines (Archivo Black — already installed), Inter for body, JetBrains Mono for small labels. 90% black / 10% white feel overall.
- **Adopt the rate-card design language** (from the new orange/white CHACE rate cards) for pricing/package sections: clean **white sections** with huge black condensed type, **orange→red gradient accent tiles** (`linear-gradient(135deg,#FFA600,#FF1909,#840202)`), and **black rounded-corner info panels** with white text and `»` bullet markers. The site alternates: dark cinematic sections (hero, portfolio, studio) and white "rate card" sections (packages, pricing). This contrast is the signature look.
- Keep the existing font packages; do not add new dependencies unless essential. Vanilla JS + CSS only for motion.
- Contact email everywhere: **bookings@chace.studio**. Instagram: **@chacestudios** (link `https://instagram.com/chacestudios`).
- Studio address: **5 Pocklingtons Walk, Leicester LE1 6BT, UK** (footer + contact + embedded Google Map on contact section if trivial via iframe, else a "Get directions" link to Google Maps).

## 3. Pages / structure
Keep it to **3 pages** (simple like the reference):
1. `/` — Home: hero → services strip → featured portfolio rows → studio hire + podcast block → B2B strip → CTA → footer
2. `/packages` — All packages & pricing (the rate-card page) + terms + booking form
3. `/portfolio` — Full portfolio, one horizontal swipe row per category (Streams-studio library pattern)

Update Header nav: HOME · PORTFOLIO · PACKAGES · **BOOK NOW** (button, gradient). Mobile: full-screen overlay menu (already exists — keep, restyle if needed).

## 4. Home page sections
1. **Hero (dark):** full-viewport. Giant "CHACE" wordmark treatment stays. Tagline: "Photography. Video. Podcast. Leicester & London." One CTA "BOOK A SHOOT" → /packages. Use `public/assets/img/portfolio/portraits/portraits-03.jpg` (or pick the strongest portrait) as a darkened background, or keep the current hero image if better.
2. **What we do (white, rate-card style):** three gradient icon tiles — Photography / Video & Campaigns / Podcast & Studio Hire — one line each, link to packages.
3. **Selected work (dark):** 2–3 horizontal swipe rows, Streams-style, with row labels: "Portraits & Headshots", "Weddings & Events", "Family, Baby & Graduation". Cards = image + small mono label + category chip. Each card links to /portfolio#category.
4. **The studio (dark):** split section — studio hire £35/hr, £60/2hr + podcast £200/1hr session + "5 Pocklingtons Walk" location line, CTA "Hire the studio".
5. **For business (white):** one bold line — "Don't hire a freelancer. Contract a studio." Schools, universities, estate agents, brands. CTA → mailto:bookings@chace.studio?subject=Business%20enquiry.
6. **CTA + Footer (dark):** big "READY WHEN YOU ARE." + BOOK NOW. Footer: CHACE STUDIOS · 5 Pocklingtons Walk, Leicester LE1 6BT · bookings@chace.studio · Instagram · © year.

## 5. Packages page — THE data
> ⚠️ **SUPERSEDED — read `PACKAGES.md` instead.** It contains the final package names, prices, per-package 1:1 card images, and sales copy (including the new Professional Corporate Headshots package, and the renames: "Pre-Wedding & Engagement", "Civil Wedding", "Podcast & Live Broadcast Production"). The section below is kept only for layout reference; where the two disagree, `PACKAGES.md` wins.

### Layout reference (old data — do not use the prices below)
White rate-card styling. Each package = a card in a horizontal swipe row (grouped as below), with gradient icon tile, price in huge type, details in black rounded panel. "BOOK" button on every card → booking form (section 6) with package preselected.

**PORTRAITS**
- Individual Portrait — 1 look **£170** (4 edited pictures) · 2 looks **£300** (8 edited pictures). Notes: further discount considered on multiple looks; low-resolution unedited available on request.
- Maternity Shoot — Single: 1 look **£170** (4 edited images) · Couple: 1 look **£200** (6 edited images). Low-res unedited on request.
- Baby Shoot (Age 1–10) — 1 look **£150** (4 edited images) · 2 looks **£250** (8 edited images). Discount on multiple looks.
- Family Shoot — **£250 per look** (family of 4) · **£20 per extra person** · 8 pictures per look.

**WEDDINGS & EVENTS**
- Pre-Wedding / Engagement — 1 look **£200** (7 images per look) · 2 looks **£400** · 3 looks **£500**.
- Civil Wedding & Proposals — starts **£300** (1 hr, within London): 10 retouched portraits of couple + all edited images.
- Event Shoot — starts **£300** (2 hours, within London). Includes but not limited to naming ceremonies, birthday parties, corporate events. Further discount considered on multiple hours.

**STUDIO & PRODUCTION**
- Studio Hire — **£35 / 1 hour** · **£60 / 2 hours**.
- Podcast Production (in-studio) — **£200 / 1-hour session** (1–3 speakers) · **£150 per episode** on a continuous package. Note: we are not responsible for designing your assets such as intro cards and display graphics.
- Fashion & Brand Campaigns — **Price on request** — arranged based on timing, number of outfits, models and creative direction. CTA: "Discuss your campaign" → mailto.

Also show a quiet line under the grid: "Headshots, graduation and more — see the portfolio, then book the portrait package that fits."

**Terms & conditions (collapsible/accordion at bottom of packages page, exactly this content):**
- All pictures are delivered in soft copies via Google Drive / WhatsApp; events via a custom web gallery, frames, USB. Photobooks available on request at their charges.
- All appointments are strictly by time slot — lateness may attract extra charges or cancellation. Extra hours are to be paid immediately. Off-site shoots attract extra charges depending on location.
- Delivery of pictures is 7–10 days after selection. Express delivery attracts extra charges (24-hour turnaround £50 · 48-hour £35). Edits delivered within 4–6 working days after selection.
- Payment terms: full payment when booking a single outfit; bookings with more than one outfit require an 80% deposit to secure the booking; the remaining balance must be paid immediately after the shoot.
- Additional charges: extra edited image £20 · delay fee £15 per 30 minutes · outdoor/location logistics fee £45 · additional person in frame £40 (includes one additional edited image) · midnight sessions (from 10:00 PM) additional £35.
- Studio rental fees are payable by the client. Refund policy: no refunds.

## 6. Booking form (on /packages)
Replicate the rate-card booking form fields: Name · Email address · Phone · Package (select, prefilled when arriving from a card) · Number of looks/outfits · Shoot location (Studio / On location — with address field) · Proposed shoot date · Proposed time slot · Anything else.
This is a static site: on submit, build a `mailto:bookings@chace.studio` with a formatted subject ("Booking request — {package}") and body from the fields. Show a friendly "Your email app will open — hit send and we'll confirm your slot" note. (Payment/Stripe stays on our other system for now — do NOT build payment here.)

## 7. Portfolio page + image manifest
All images live in `public/assets/img/portfolio/{category}/{category}-NN.jpg` (already processed, web-ready ~1600px):

| Category | Folder | Count | Row label on site |
|---|---|---|---|
| Individual Portraits | `portraits` | 25 | Individual Portraits |
| Headshots | `headshots` | 16 | Headshots |
| Events | `events` | 20 | Events |
| Bridal Showers | `bridal-shower` | 9 | (merge into Events row, after events images) |
| Civil Weddings & Proposals | `weddings` | 6 | Weddings & Proposals |
| Pre-Wedding | `pre-wedding` | 3 | Pre-Wedding |
| Family | `family` | 5 | Family |
| Baby Shoots | `baby-shoots` | 6 | Baby Shoots |
| Graduation | `graduation` | 22 | Graduation |
| Fashion & Brand | `fashion` | 9 | Fashion & Brand Campaigns |

Rules: lazy-load everything below the fold (`loading="lazy"`, `decoding="async"`). Use `<img>` with fixed aspect-ratio boxes (portrait 4:5 cards) and `object-fit: cover`. No lightbox needed — keep it simple; a card click can just enlarge via CSS `:target` or simply do nothing on v1.
**Package card images:** every package now has a real 1:1 photo in `public/assets/img/pricing/` — see the table in `PACKAGES.md`. No gradient placeholder tiles anywhere on the packages page.
Old Base44-era placeholder images under `public/assets/img/work-*.png` and `cap-*.png`: delete and replace usages with real portfolio images (podcast card may keep `cap-podcast.png` if it looks right, else gradient tile).

## 8. Motion spec (site-wide)
- Carousels: CSS `scroll-snap-type: x mandatory`, momentum scroll, hide scrollbar, left/right arrow buttons (desktop) that `scrollBy` one card; drag-to-scroll on desktop via pointer events; native swipe on mobile.
- Reveal: sections and cards get `opacity 0 → 1, translateY(24px) → 0, 500ms ease-out staggered` via one small IntersectionObserver util.
- Hover: cards `transform: translateY(-6px)`, image `scale(1.04)`, 300ms; gradient buttons brighten.
- Respect `prefers-reduced-motion: reduce` — disable all of the above.

## 9. SEO & meta
Per-page titles/descriptions: "Photography Studio Leicester | CHACE STUDIOS", "Photography Packages & Prices Leicester", "Portfolio". OG tags with a strong portrait image. `robots` allow. Footer includes full address (good for local SEO).

## 10. Acceptance checklist (verify before finishing)
- [ ] `npm run build` passes clean
- [ ] Zero occurrences of "CHASE"/"Chasebookk" in rendered output (`grep -ri chase src/ --include='*.astro'` shows only CHACE)
- [ ] All 10 portfolio categories render with real images; nothing 404s
- [ ] Every package shows the exact prices in §5
- [ ] Carousels swipe on mobile viewport (375px) and arrow-scroll on desktop
- [ ] Booking form generates a correct mailto with package name
- [ ] bookings@chace.studio and the Leicester address appear in the footer
- [ ] Lighthouse: no image over ~400KB on first viewport; lazy-loading verified
