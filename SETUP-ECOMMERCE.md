# Cropline Ecommerce Add-on — Setup Guide

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
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` secret | Creating CSM logins |
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
