# Cropline — Round 7: real landing page, real addresses, product photos

Same deal as previous rounds: no push access to `kpudi/Cropline` in this
session, so here's a zip. Copy these files on top of your working tree
(they only touch the files listed below — nothing in your bill/items/
clients/history/setup admin flow was removed), commit, push.

## 1. Delete one file first

- **Delete `shop/index.html`** if it still exists in your repo. It was a
  stray leftover from before Round 4's routing fix — never actually part
  of the build, just dead weight that could confuse anyone reading the repo.

## 2. Copy these files in (overwrite)

| File | What changed |
|---|---|
| `index.html` | **New** — this is now a real marketing homepage (hero, "Shop by category", feature grid, CTA band, real footer) instead of the bare product grid. |
| `shop/catalog.html` | **New file** — the actual product grid + search + "Paste WhatsApp order" now lives here (this *is* your old `index.html` content, lightly reheaded). |
| `src/shop/home-main.js` | **New file** — powers the new homepage: pulls your live catalogue to build the category cards and item count, so it's never out of sync with what you're actually selling. |
| `vite.config.js` | Registers `shop/catalog.html` as a build entry. |
| `src/shop/util.js` | Nav now points "Shop" at `/shop/catalog.html`; added `lookupPincode()` (see below); header now shows a "Sign in" / "My account" button and a live cart ₹ amount, not just a count. |
| `src/shop/shop-main.js` | Reads `?cat=` from the URL so homepage category cards land pre-filtered; renders real product photos and an "Out of stock" state. |
| `src/shop/checkout-page.js`, `shop/checkout.html` | New address form: pincode first, auto-fills city + state, free-text locality instead of the old 3-suburb dropdown. Phone/pincode validation. |
| `src/shop/account-page.js` | Same address-form treatment for the "My addresses" tab. |
| `shop/login.html` | Removed the "Own the business? Admin login" line — admins should just go to `/admin/` directly; no reason to advertise it to customers. |
| `src/db.js` | `loadItems`/`upsertItem` now carry `image_url` + `in_stock`; new `uploadItemImage()` for the admin photo uploader. |
| `src/shop/shop-db.js` | `loadCatalog` now returns each item's photo + stock state; `saveAddress` now saves `state` too. |
| `src/main.js` | Wires the new Items-tab photo upload + in-stock toggle. |
| `admin/index.html` | Added the small CSS for the photo thumbnail and stock switch in the Items table. |
| `src/views.js` | Items tab: new Photo column (click to upload) and In stock toggle column. |
| `supabase-schema-ecommerce.sql` | See below — new columns + a storage bucket. Re-running the whole file is safe. |

## 3. Run the schema update

In Supabase → SQL Editor, run the file again (it's additive — safe even
though most of it already exists). The new part at the bottom (Round 7):

- Drops the old `area` check-constraint that locked customer addresses to
  `Kukatpally` / `Madhapur` / `Gachibowli` / `Custom` — that's the actual
  cause of "addresses aren't working" for anyone outside those three.
  `area` is now a free-text locality field.
- Adds a `state` column to `customer_addresses`.
- Adds `image_url` and `in_stock` to `items`.
- Creates a public Storage bucket called `product-images` with
  admin-only write access — this is where product photos live.

No new environment variables needed for any of this.

## 4. What "addresses weren't working" actually was, and the fix

The address form only ever offered three Hyderabad neighbourhoods in a
dropdown (`Kukatpally`/`Madhapur`/`Gachibowli`/`Custom`) and a database
constraint enforced exactly that list — so any customer outside Hyderabad,
or typing anything else into "Custom", could hit save failures depending
on what else was missing.

Now:
- The person types their **6-digit pincode first**. On blur, it's looked
  up against `api.postalpincode.in` — a free, keyless government-backed
  API — which returns the district (city), state, and a suggested
  locality name.
- **City and State auto-fill** and are still editable if the lookup is
  slightly off (India Post data isn't always perfectly current).
- "Area" is now a **free-text locality** field, pre-filled from the
  lookup but editable, instead of a hardcoded dropdown.
- This works for **any Indian pincode**, not just Hyderabad — a Mumbai or
  Chennai customer will get their own city/state filled in correctly.
- Added real phone (10-digit, starts 6–9) and pincode (6-digit) validation
  on both the checkout form and the "My addresses" tab, so bad data can't
  get saved silently.

If a pincode genuinely isn't found (rare, but the free API isn't 100%
complete), the person just types city/state manually — nothing blocks them.

## 5. Product photos — how it actually works now

- Items tab in admin: click the small photo square next to any item →
  pick an image → it uploads straight to the new `product-images` Storage
  bucket and updates that item's `image_url`.
- No manual bucket setup needed beyond running the schema file — the SQL
  creates the bucket and its access policies for you.
- The storefront catalogue now shows the real photo instead of a generic
  🥬 emoji for any item that has one; items without a photo yet still
  show the emoji placeholder, so nothing looks broken while you're filling
  photos in gradually.
- Images are public-read (any storefront visitor can see them, same as
  any e-commerce product photo) but only an admin account can upload or
  replace one.

## 6. In-stock toggle

Each item in the Items tab now has an **In stock** switch. Flip it off to
pull an item off the storefront without deleting it or losing its price
history — it shows as greyed-out with an "Out of stock" tag and can't be
added to cart. Flip it back on any time (e.g. once a shipment lands).

## 7. The homepage redesign

Matched the layout and tone from the reference screenshots you shared —
hero section with a headline, live stats, and a produce photo; a "Shop by
category" grid built from whatever categories you actually have items in
(so it never goes stale); a feature/trust-signal band; and a proper footer
with real link columns instead of one grey line of text.

The actual shopping experience (search, filters, "Paste WhatsApp order",
cart) is unchanged in behavior — it just moved from `/` to
`/shop/catalog.html`, with `/` now reserved for the marketing homepage,
which is how most real storefronts split a landing page from the shop
itself. Every internal link (nav, hero buttons, category cards, footer)
was updated to point at the new location.

## 8. What's next (not in this round)

This was a big ask and I scoped it down to what's concretely shippable in
one pass. Still open, in rough priority order if you want to keep going:

- **"Industry-standard admin" is a big, fuzzy ask** — this round covers
  product photos and stock toggling, which were the two concrete gaps you
  called out. A fuller admin pass (a dashboard/overview tab with today's
  orders + revenue at a glance, bulk CSV export, low-stock alerts, etc.)
  is a reasonable next round rather than trying to guess your whole wishlist
  at once — tell me which of those (or something else) matters most and
  I'll build that next.
- Delivery-fee rules / minimum order value (still free/zero everywhere).
- Product photo galleries (multiple photos per item) — today it's one
  photo per item, which covers the common case.
- Razorpay online payment (still dormant behind `PAYMENTS_ENABLED = false`
  in `src/shop/checkout-page.js` — unchanged this round).

## 9. Testing checklist

- [ ] Visit `/` — new homepage loads, category cards match your actual
      catalogue, "Shop today's produce" goes to `/shop/catalog.html`.
- [ ] From a category card, land on the catalog pre-filtered to that category.
- [ ] Checkout → add address → type a non-Hyderabad pincode (e.g. a Mumbai
      or Bangalore one) → city/state auto-fill correctly.
- [ ] Try an invalid phone number → see a validation error, not a silent save.
- [ ] Admin → Items → click an item's photo square → upload an image → see
      it appear on the storefront catalogue.
- [ ] Admin → Items → toggle an item's In stock switch off → confirm it
      shows "Out of stock" and can't be added to cart on the storefront.
- [ ] Login page no longer shows "Own the business? Admin login".
