# Cropline Ecommerce Add-on — Setup Guide

## Round 6: real email verification + order emails, and a proper signup flow

**Email confirmation was already real** — Supabase itself sends the
verification email and checks the click, nothing here fakes it. What was
missing is what makes it feel real to a customer, so this round adds:

- **A working "resend confirmation email" button**, on both the signup
  "check your email" screen and on the login page if someone tries to log in
  before confirming. No more being stuck if the email lands in spam or the
  link expires.
- **An actual order-confirmation email**, sent the moment an order is
  placed (previously, the customer only got emailed on the admin's *next*
  status change — nothing at all when they first checked out). It's an
  itemized receipt: line items, subtotal, discount, total, delivery address,
  with a "Track your order" button.
- **Branded HTML emails** for both the new order-confirmation email and the
  existing status-update emails (confirmed / packed / out for delivery /
  delivered / cancelled) — a simple green Cropline header instead of plain
  text, matching the storefront's look. Falls back to plain text
  automatically for any inbox that doesn't render HTML.
- **A properly redesigned signup page** — two-column layout (like a real
  storefront's "Create account" page) explaining what having an account
  gets you, and a real step-by-step "check your email" screen after
  submitting instead of just a one-line message under the button.

None of this needed new environment variables — it reuses `RESEND_API_KEY`
you already have (or will add, see the table below).

### Two Supabase Auth settings you should check, so verification links actually work

These aren't things I can set from code — they're one-time settings in your
Supabase dashboard under **Authentication → URL Configuration**:

1. **Site URL** should be `https://cropline-ruddy.vercel.app` — this is
   what Supabase uses to build the confirmation link it emails out. If it's
   still the default `localhost:3000`, every confirmation link sends
   customers to a page that doesn't exist.
2. **Redirect URLs** should include `https://cropline-ruddy.vercel.app/**`
   (the `**` allows any path). Without this, Supabase blocks the redirect
   after someone clicks confirm, even if Site URL is correct.

Also under **Authentication → Providers → Email**, make sure **"Confirm
email"** is switched on — that's what makes signup require clicking the
emailed link at all, rather than logging you in immediately.

Optionally, under **Authentication → Email Templates → Confirm signup**,
you can replace Supabase's default template text/logo with Cropline
branding — that's the one email in this whole flow that still uses
Supabase's own template rather than one of ours, since account verification
has to happen before anything of ours is allowed to run.

### One Resend limitation worth knowing

On Resend's free/sandbox `from` address (`onboarding@resend.dev`), emails
only deliver to **your own verified Resend account email** — not to real
customers. To actually email customers, verify your own sending domain in
Resend (Resend dashboard → Domains — add a couple of DNS records at your
domain registrar) and set `RESEND_FROM` to something like
`Cropline <orders@yourdomain.com>`. Until then, order/status emails will
silently no-op for anyone who isn't you, exactly like before this round —
nothing is broken, there's just a real domain to verify when you're ready to
go live with email.

This adds a customer-facing storefront (catalog, cart, "paste WhatsApp order",
checkout, address book, order tracking), self sign-up + CSM-issued logins
with Terms & Conditions acceptance, and an Orders + Customers tab in your
existing admin panel — on top of the Cropline billing app you already have
running.

**Online payment is currently switched off** — checkout only offers
"pay later / invoiced" for now, since no payment provider has been chosen
yet. The Razorpay integration is fully built and dormant behind a flag
(`PAYMENTS_ENABLED = false` in `src/shop/checkout-page.js`) — flip that to
`true`, uncomment the Razorpay script tag in `shop/checkout.html`, and add
the two Razorpay env vars whenever you're ready to switch it on (works with
Razorpay as-is; a different provider would need its `/api` functions swapped
in following the same pattern).

## Round 5: fixed the checkout redirect bug, explained the ₹0 prices

**Checkout redirecting you back to login, no matter what you tried** — this
was a real bug I introduced, now fixed. Supabase's "Confirm email" setting
was on, so when someone signed up, `signUp()` succeeded but didn't hand back
a logged-in session yet (it's waiting on the confirmation click). The old
code went ahead and tried to create their `customers` profile row anyway —
that write silently failed (no session yet = blocked by the security rules),
so the account existed in Supabase Auth but had no profile. Later, even
after confirming their email and logging in successfully, `requireCustomer()`
looked for that profile, found nothing, and bounced them back to the login
page — forever, since the profile was never going to appear on its own.
That's almost certainly what looked like "redirecting to the main page."

Fixed in `src/shop/shop-db.js` and `src/shop/shop-auth.js`:
- Sign-up now correctly detects the "waiting on email confirmation" case and
  shows *"check your email to confirm, then log in"* instead of pretending
  it worked.
- Any page a customer visits while logged in now **self-heals**: if their
  profile row is missing for any reason, it's created right then, using
  whatever they typed at sign-up (or a bare-minimum profile if that's not
  available). Nobody can get permanently stuck again.
- If profile creation ever does fail (e.g. a real connection problem),
  you'll now see an actual error message instead of a silent bounce back to
  login — much easier to diagnose if it ever happens again.

**"All prices are 0"** — this one isn't a bug, it's missing data. The
storefront's walk-in price for each item comes from **Cash rate**, the
column in your Items tab you fill in per item (`items.cash_rate` in
Supabase). Your actual billing has always run off per-client rate cards, so
Cash rate was never something you had to keep filled in before — the
storefront is the first thing that reads it, and for most of your ~212
items it's still blank, hence ₹0.

Two ways to fix it:
1. **Fastest**: Items tab → new **"Fill missing cash rates"** button. It
   asks for a margin % (e.g. 25) and sets Cash rate = Buying rate ×
   (1 + margin%) for every item that has a buying rate but no cash rate yet,
   in one click. Items with no buying rate on file either are left alone —
   it tells you how many, so you can fill those in by hand.
2. Or just type a value into the Cash rate column for the items you
   actually want on the walk-in storefront (you don't need all 212 priced —
   only the ones a walk-in customer should be able to buy).

Either way, note this only affects **walk-in** pricing. CSM-managed
customers always see their own contracted rate-card price regardless of
what Cash rate says.

## Round 4: routing fix, done properly this time

The `vercel.json` rewrite approach depended on that file landing exactly at
the repo root during a manual GitHub upload, and it kept not landing there.
So instead of a config file, the site is now physically restructured:

- `index.html` (repo root) **is** the storefront now — literally the file
  that used to be `shop/index.html`.
- The admin/billing app moved to `admin/index.html` — visit it at
  `https://cropline-ruddy.vercel.app/admin/` (note the trailing slash).
- `vercel.json` is deleted — no longer needed, one less thing to place
  correctly.

This is enforced by `vite.config.js` (which file builds to which URL), not
by a separate config Vercel has to notice — so as long as the build succeeds
at all, this routing is guaranteed correct. Bookmark `/admin/` for daily use.

## Round 3 changes (previous update)

- Fixed: the paste-WhatsApp popup wouldn't close (a CSS bug, now fixed
  everywhere it could recur — see `[hidden]{display:none!important}` in
  `src/shop/shop.css`).
- Checkout now shows an itemized order summary (name, quantity, price per
  line), not just a total.
- Admin panel header has a **"View storefront ↗"** button that opens `/` in
  a new tab.
- Items tab: product name, category, and unit are now editable inline
  (previously only the buying/cash rates were).
- New **Offers** tab: create promo codes (percent or flat discount, optional
  minimum order and date range). Customers enter the code at checkout.

### If `/` still isn't showing the shop after this update
That's almost certainly because `vercel.json` didn't get uploaded to the
**root** of the repo. GitHub's drag-and-drop uploader puts files wherever
you were browsing when you opened "Add file → Upload files" — if you were
inside a subfolder, `vercel.json` landed there instead of at the top level,
where Vercel requires it. Go to the **repo's root listing** on github.com
(click the repo name / the breadcrumb all the way back) — you should see
`vercel.json` sitting next to `package.json` and `index.html`, not nested
inside `shop/` or `src/`. If it's missing or misplaced from the root, delete
the stray copy and re-upload it from the root page specifically.

## 0. Why you're getting a zip instead of a pushed branch

This session doesn't have push access to `kpudi/Cropline` (no GitHub App /
token attached), so I built everything against a local clone and packaged
it as a zip instead of opening a PR. Steps below get it into your repo.

## 1. Apply the code

1. Unzip the attached file.
2. In your local clone of `kpudi/Cropline`, copy every file from the zip in
   on top of your existing working tree (it only adds new files plus small,
   additive edits to `vite.config.js`, `src/db.js`, `src/state.js`,
   `src/main.js`, `src/views.js` — nothing in your existing bill/items/
   clients/history/setup flow was removed).
3. `git add -A && git commit -m "Add customer storefront, orders, CSM accounts" && git push`
4. **Re-set the GitHub repo back to Private** (Settings → General → Danger
   Zone → Change visibility) now that I'm done reading it.

## 2. Run the new database schema

In Supabase → SQL Editor, run `supabase-schema-ecommerce.sql` (it's
additive/idempotent — safe even if some tables already partially exist).

Then, **important**, seed yourself as admin so the admin panel keeps working
and so your Orders/Customers tabs can bypass RLS the way `owner=auth.uid()`
did before:

```sql
insert into admins (id) select id from auth.users where email = 'hskuchampudi@gmail.com'
on conflict do nothing;
```

(Use whatever email you currently log into the Cropline admin panel with.)

## 3. Environment variables

Copy `.env.example` → `.env` locally for `npm run dev`, and add the same
keys in **Vercel → Project → Settings → Environment Variables** for
production. The `VITE_...` ones are already public/safe (you're using them
today); everything else is server-only and must **never** get a `VITE_`
prefix.

| Variable | Where to get it | Required for |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` secret | Creating CSM logins **and** updating order status from the Orders tab — both go through server-side `/api` functions that need this key. Without it, those two actions fail with a "server is missing..." error; everything else (storefront browsing, checkout, self sign-up) works fine without it. |
| `RESEND_API_KEY`, `RESEND_FROM` | resend.com (free tier: 100 emails/day) — verify a sending domain or use their sandbox `onboarding@resend.dev` while testing | Order-status emails |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | developers.facebook.com → create a Meta App → add "WhatsApp" product → get a test number + permanent token | Order-status WhatsApp messages |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Not needed yet — payments are switched off. Add these later, once you've picked a provider. | Online checkout (currently disabled) |

**Nothing breaks if you leave the notification or payment keys blank** —
`notify.js` silently skips whichever channel isn't configured, and checkout
just runs pay-later-only while `PAYMENTS_ENABLED` is `false`. Ship the
storefront now and wire these up whenever you're ready.

### When you're ready to turn payments back on
Whichever provider you land on (Razorpay or otherwise), the pattern already
built is: create a payment session server-side in `/api`, open the
provider's checkout on the client, verify the signature server-side in
`/api/verify-payment.js`, then mark the order paid. For Razorpay
specifically, everything's already wired — just set `PAYMENTS_ENABLED = true`
in `src/shop/checkout-page.js`, uncomment the script tag in
`shop/checkout.html`, and add `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` (start
in Razorpay's Test Mode, which works immediately with fake cards/UPI, before
their KYC/activation is done — switch to Live keys once that's approved).

### WhatsApp Cloud API notes
Meta's free tier gives you one test phone number that can only message
numbers you've explicitly added as testers in the Meta dashboard — fine for
your own testing, but to message real customers you'll need to add and
verify your own WhatsApp Business phone number in the same Meta app
(a short verification flow in Meta's UI, no code changes needed here).

## 3a. Routing: the shop is now your homepage

`vercel.json` (new file) makes `https://cropline-ruddy.vercel.app/` serve
the storefront, and moves the admin panel to
`https://cropline-ruddy.vercel.app/admin`. This is a routing rule only — no
files moved — so `/shop/index.html` etc. still work too, they're just not
what customers need to type anymore. Update any bookmark you use for the
admin panel to `/admin`.

## 4. What's in this add-on

- `supabase-schema-ecommerce.sql` — customers, customer_addresses, orders,
  order_lines, order_status_events, terms_acceptance, admins table + RLS.
- `shop/*.html` + `src/shop/*.js` — the storefront: catalog (`index.html`),
  cart, checkout (pay-later for now, Razorpay dormant), login/signup (with
  T&C checkbox), account page (order history + address book), order
  tracking, and Terms/Privacy/Shipping&Refund policy pages.
- `api/*.js` — Vercel serverless functions: create + verify Razorpay
  payments, update order status (+ trigger notifications), and create
  CSM-managed customer logins (uses the Supabase service role key, so it
  can only run server-side).
- Admin panel: two new tabs, **Orders** (filter by status, advance status —
  which emails/WhatsApps the customer) and **Customers** (see self sign-ups,
  create a CSM login for a contracted client, link them to their rate card,
  manage their saved addresses).

## 5. How pricing works for the two customer types

- **CSM-managed clients**: you create their login from Customers → *+ New
  CSM login*, optionally linking them to an existing entry in your Clients
  tab. They see their negotiated rate-card prices in the storefront
  automatically (same rate cards you already manage today).
- **Walk-in customers**: sign up themselves at `/shop/signup.html` and see
  your standard cash rate (the same `sell` price shown in your Items tab).

## 6. Things you'll likely want next (not built yet)

- A delivery-fee rule (currently free/zero everywhere) or minimum order value.
- Admin ability to edit/cancel an order's line items after it's placed.
- Product photos (you asked to add these later — the `<div class="thumb">`
  in `shop-main.js`/`shop.css` is a placeholder emoji tile; swap in real
  `<img>` tags once you have images, ideally via Supabase Storage).
- Razorpay webhook as a belt-and-braces backup to the client-side
  `verify-payment` call (currently sufficient for a v1 launch, but a
  webhook protects against a customer closing the tab mid-payment).
