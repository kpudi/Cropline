-- =====================================================================
-- Cropline Ecommerce Add-on Schema
-- Run this in Supabase SQL Editor AFTER your existing supabase-schema.sql
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE everywhere.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. ADMIN ROLE
-- Your existing tables use owner = auth.uid() for the single admin
-- account. The storefront introduces a second kind of signed-in user
-- (customers), so we need an explicit way to say "this uid is staff".
-- ---------------------------------------------------------------------
create table if not exists admins (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
alter table admins enable row level security;
drop policy if exists "admins self read" on admins;
create policy "admins self read" on admins for select using (id = auth.uid());

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from admins where id = auth.uid());
$$;

-- >>> IMPORTANT: after running this file once, seed yourself as admin:
--   insert into admins (id) select id from auth.users where email = 'hskuchampudi@gmail.com'
--   on conflict do nothing;
-- (Any account you use to log into the existing Cropline admin panel.)

-- ---------------------------------------------------------------------
-- 2. CUSTOMERS
-- Every storefront login (self sign-up walk-in OR CSM-issued account)
-- gets one row here, keyed by their Supabase auth uid.
-- ---------------------------------------------------------------------
create table if not exists customers (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  email text not null default '',
  business_name text default '',
  type text not null default 'walkin' check (type in ('csm','walkin')),
  client_id uuid references clients(id) on delete set null, -- CSM-managed customers link to their contracted rate card
  active boolean not null default true,
  created_by text not null default 'self' check (created_by in ('self','csm')),
  created_at timestamptz default now()
);
alter table customers enable row level security;
drop policy if exists "customers self rw" on customers;
create policy "customers self rw" on customers for all
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------
-- 3. ADDRESS BOOK
-- ---------------------------------------------------------------------
create table if not exists customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  label text default 'Address',
  area text not null default 'Custom' check (area in ('Kukatpally','Madhapur','Gachibowli','Custom')),
  line1 text not null default '',
  line2 text default '',
  city text default 'Hyderabad',
  pincode text default '',
  landmark text default '',
  phone text default '',
  is_default boolean default false,
  created_by text not null default 'customer' check (created_by in ('customer','csm')),
  created_at timestamptz default now()
);
alter table customer_addresses enable row level security;
drop policy if exists "addresses owner rw" on customer_addresses;
create policy "addresses owner rw" on customer_addresses for all
  using (customer_id = auth.uid() or is_admin())
  with check (customer_id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------
-- 4. ORDERS (storefront + WhatsApp + admin-entered)
-- Created with IF NOT EXISTS so this works whether or not you already
-- had an `orders` table from the earlier WhatsApp-parsing groundwork.
-- ---------------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique,
  customer_id uuid references customers(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  address_id uuid references customer_addresses(id) on delete set null,
  source text not null default 'storefront' check (source in ('storefront','whatsapp','admin')),
  status text not null default 'pending' check (status in ('pending','confirmed','packed','out_for_delivery','delivered','cancelled')),
  payment_method text not null default 'online' check (payment_method in ('online','cod')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','failed','refunded')),
  razorpay_order_id text,
  razorpay_payment_id text,
  contact_name text default '',
  contact_phone text default '',
  delivery_area text default '',
  delivery_address text default '',
  subtotal numeric default 0,
  delivery_fee numeric default 0,
  total numeric not null default 0,
  notes text default '',
  placed_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- In case an older `orders` table already existed with a different shape,
-- make sure every column this schema needs is present:
alter table orders add column if not exists order_no text;
alter table orders add column if not exists customer_id uuid references customers(id) on delete set null;
alter table orders add column if not exists client_id uuid references clients(id) on delete set null;
alter table orders add column if not exists address_id uuid references customer_addresses(id) on delete set null;
alter table orders add column if not exists source text default 'storefront';
alter table orders add column if not exists status text default 'pending';
alter table orders add column if not exists payment_method text default 'online';
alter table orders add column if not exists payment_status text default 'unpaid';
alter table orders add column if not exists razorpay_order_id text;
alter table orders add column if not exists razorpay_payment_id text;
alter table orders add column if not exists contact_name text default '';
alter table orders add column if not exists contact_phone text default '';
alter table orders add column if not exists delivery_area text default '';
alter table orders add column if not exists delivery_address text default '';
alter table orders add column if not exists subtotal numeric default 0;
alter table orders add column if not exists delivery_fee numeric default 0;
alter table orders add column if not exists total numeric default 0;
alter table orders add column if not exists notes text default '';
alter table orders add column if not exists placed_at timestamptz default now();
alter table orders add column if not exists updated_at timestamptz default now();
create unique index if not exists orders_order_no_key on orders(order_no) where order_no is not null;

create sequence if not exists order_no_seq;
create or replace function set_order_no() returns trigger
language plpgsql as $$
begin
  if new.order_no is null then
    new.order_no := 'CO-' || to_char(now(),'YYMM') || '-' || lpad(nextval('order_no_seq')::text,4,'0');
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_order_no on orders;
create trigger trg_order_no before insert on orders
  for each row execute function set_order_no();

drop trigger if exists trg_order_touch on orders;
create or replace function touch_order() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
create trigger trg_order_touch before update on orders
  for each row execute function touch_order();

alter table orders enable row level security;
drop policy if exists "orders customer select own" on orders;
create policy "orders customer select own" on orders for select
  using (customer_id = auth.uid() or is_admin());
drop policy if exists "orders customer insert own" on orders;
create policy "orders customer insert own" on orders for insert
  with check (customer_id = auth.uid() or is_admin());
drop policy if exists "orders customer cancel own pending" on orders;
create policy "orders customer cancel own pending" on orders for update
  using (customer_id = auth.uid() and status = 'pending')
  with check (customer_id = auth.uid() and status in ('pending','cancelled'));
drop policy if exists "orders admin all" on orders;
create policy "orders admin all" on orders for all
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- 5. ORDER LINES
-- ---------------------------------------------------------------------
create table if not exists order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  item_id uuid references items(id) on delete set null,
  name text not null,
  unit text default 'KG',
  qty numeric not null default 0,
  rate numeric not null default 0,
  amount numeric not null default 0,
  sort int default 0
);
alter table order_lines enable row level security;
drop policy if exists "order_lines via order" on order_lines;
create policy "order_lines via order" on order_lines for all
  using (is_admin() or exists(select 1 from orders o where o.id = order_lines.order_id and o.customer_id = auth.uid()))
  with check (is_admin() or exists(select 1 from orders o where o.id = order_lines.order_id and o.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- 6. ORDER STATUS HISTORY (for notification triggers / audit trail)
-- ---------------------------------------------------------------------
create table if not exists order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  note text default '',
  changed_by uuid,
  changed_at timestamptz default now()
);
alter table order_status_events enable row level security;
drop policy if exists "status events via order" on order_status_events;
create policy "status events via order" on order_status_events for select
  using (is_admin() or exists(select 1 from orders o where o.id = order_status_events.order_id and o.customer_id = auth.uid()));
drop policy if exists "status events admin insert" on order_status_events;
create policy "status events admin insert" on order_status_events for insert
  with check (is_admin());

-- ---------------------------------------------------------------------
-- 7. TERMS & CONDITIONS ACCEPTANCE (ecommerce compliance trail)
-- ---------------------------------------------------------------------
create table if not exists terms_acceptance (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  version text not null default 'v1',
  accepted_at timestamptz default now()
);
alter table terms_acceptance enable row level security;
drop policy if exists "terms self insert/select" on terms_acceptance;
create policy "terms self insert/select" on terms_acceptance for all
  using (customer_id = auth.uid() or is_admin())
  with check (customer_id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------
-- 8. OPEN UP CATALOG READS FOR THE STOREFRONT
-- Items: public price list (cash rate) is fine to expose to anyone
-- browsing the shop, logged in or not. Rate cards are private contract
-- pricing — only the linked customer (or admin) may read them.
-- ---------------------------------------------------------------------
drop policy if exists "items public read" on items;
create policy "items public read" on items for select using (true);

drop policy if exists "clients self read" on clients;
create policy "clients self read" on clients for select
  using (is_admin() or exists(select 1 from customers c where c.id = auth.uid() and c.client_id = clients.id));

drop policy if exists "rate_cards self read" on rate_cards;
create policy "rate_cards self read" on rate_cards for select
  using (is_admin() or exists(select 1 from customers c where c.id = auth.uid() and c.client_id = rate_cards.client_id));

drop policy if exists "rate_card_items self read" on rate_card_items;
create policy "rate_card_items self read" on rate_card_items for select
  using (is_admin() or exists(
    select 1 from rate_cards rc join customers c on c.client_id = rc.client_id
    where rc.id = rate_card_items.card_id and c.id = auth.uid()
  ));

drop policy if exists "settings public read" on settings;
create policy "settings public read" on settings for select using (true);

-- ---------------------------------------------------------------------
-- Done. Next: seed the admins table (see step 1 comment above), then
-- deploy the app with the new Vercel env vars documented in SETUP.md.
-- =====================================================================
