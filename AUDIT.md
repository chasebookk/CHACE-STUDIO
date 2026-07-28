# CHACE STUDIOS — Site Audit
*Deep scan of code, security, business logic, live site and SEO. 28 checks run.*

---

## 🔴 HIGH: Webhook is not idempotent (can double-count money)

**File:** `src/pages/api/stripe-webhook.ts`

Stripe retries a webhook whenever your endpoint returns a non-2xx status **or times out**. Your endpoint does database writes *and* sends emails through Resend before responding, so a slow email is enough to trigger a retry. There is no guard against processing the same event twice.

Two consequences:

1. **Balance payments double-count.** The balance branch is additive:
   ```ts
   const newPaid = booking.paid_pence + amountTotal;
   ```
   A retry adds the amount again. A client who paid a £54 balance shows as having paid £108, and the booking may flip to `paid_in_full` when it isn't. This is the one that can actually corrupt your records.

2. **Duplicate confirmation emails.** The deposit and full branches call `notifyFromDb()` unconditionally, so a retry sends the client a second confirmation and you a second notification.

**Fix:** add a `processed_events` table keyed on the Stripe `event.id`, insert with `ON CONFLICT DO NOTHING`, and return early if the row already existed. Also make the balance path absolute rather than additive by recomputing from Stripe rather than incrementing, and add a `UNIQUE` constraint on `stripe_session_id`.

---

## 🟠 MEDIUM

### No rate limiting on `/api/checkout`
Anyone can POST repeatedly. Each request writes a booking row and **holds a calendar slot for 30 minutes**, so a trivial script could block out your entire week and fill the database. Add a simple per-IP limit (for example 5 checkout attempts per 10 minutes) returning 429.

### No canonical URL
`chace.studio` and `chace-studio.vercel.app` serve byte-identical pages. Google may index the vercel.app copy and split your ranking between two addresses. Add `<link rel="canonical">` in `Base.astro` pointing at the `chace.studio` version of each page.

### No `robots.txt` and no `sitemap.xml`
Neither exists. Search engines have no crawl guidance and no page index. For a business that lives on local search ("photography studio Leicester") this is worth fixing properly. The sitemap should exclude `/admin`, `/quote/*` and `/book/*`.

### No security headers
There is no `vercel.json`. Missing `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options` and a basic `Permissions-Policy`. Cheap to add, and it stops your site being framed by a phishing page.

---

## 🟢 LOW / NOTES

- **`.claude/` is untracked.** Add it to `.gitignore` so it never gets committed.
- **Remaining dashes are fine.** 17 files still contain `–` and `—`, but every one is either a code comment or a correct numeric range (`14:00–15:00`, `1–3 speakers`, `ages 1–10`). These are proper typography, not the AI tell you were removing. Recommend leaving them.
- **`.env.example`** contains only placeholders, no real values.

---

## ✅ VERIFIED CLEAN

**Security**
- No secrets in tracked files **or anywhere in git history** (21 commits scanned)
- `.env` correctly gitignored
- Every admin endpoint enforces `checkAdminAuth` **and** same-origin
- `/admin` page itself returns 401 when unauthenticated
- Webhook signature verified before any processing
- Private `/quote/*` pages carry `noindex, nofollow`

**Business logic** (all cross-checked against PACKAGES.md)
- Every package price matches the spec exactly, in integer pence
- Family 15% above 1 look: 2 looks = £425 ✓
- Civil Wedding 15% above 1 hour: 2 hours = £510 ✓
- Event Shoot 10% above 2 hours: 3 hours = £405 ✓
- Studio Hire +£30/hour after 2: 3 hours = £90 ✓
- 10-hour daily cap applied to all hourly packages
- Session durations scale with looks and hours, so the calendar blocks the true session length rather than a single slot
- **Slot conflict handling is genuinely well built:** if a slot is taken during payment, it auto-refunds, flags CONFLICT in admin, and emails the client an apology with a rebooking link

**Frontend / performance**
- No console errors on the live site
- No broken images, all `<img>` tags have alt text
- Largest image is 389KB, nothing over 500KB
- OG share image exists and resolves
- Meta description, OG and Twitter card tags present
- Repo clean, nothing unpushed

---

## Priority order
1. Webhook idempotency (money correctness)
2. Rate limiting on checkout (calendar protection)
3. Canonical + robots + sitemap (SEO, before you promote the site)
4. Security headers (quick win)
