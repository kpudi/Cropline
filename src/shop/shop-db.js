import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_KEY
export const sb = createClient(URL, KEY)

/* ---- auth ---- */
export const getSession = () => sb.auth.getSession()
export const signOut = () => sb.auth.signOut()
export const signInCustomer = (email, pw) => sb.auth.signInWithPassword({ email, password: pw })

const PENDING_PROFILE_KEY = 'cropline_pending_profile'

export async function signUpCustomer({ email, pw, name, phone, businessName, termsVersion }) {
  const profile = { name, phone, businessName: businessName || '', termsVersion: termsVersion || 'v1', email }
  const { data, error } = await sb.auth.signUp({ email, password: pw })
  if (error) throw error

  // If Supabase's "Confirm email" setting is on, signUp() succeeds but
  // returns no session — there's no authenticated user yet, so RLS will
  // reject any write we try right now. Stash the profile and finish the
  // job later (see ensureCustomerProfile), once they've confirmed + logged in.
  if (!data.session) {
    try { localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(profile)) } catch {}
    return { ...data, needsConfirmation: true }
  }

  await createCustomerProfile(data.user.id, profile)
  return { ...data, needsConfirmation: false }
}

async function createCustomerProfile(uid, profile) {
  const { error: custErr } = await sb.from('customers').upsert({
    id: uid, full_name: profile.name || '', phone: profile.phone || '', email: profile.email || '',
    business_name: profile.businessName || '', type: 'walkin', created_by: 'self'
  }, { onConflict: 'id' })
  if (custErr) throw custErr
  const { error: termsErr } = await sb.from('terms_acceptance').insert({
    customer_id: uid, version: profile.termsVersion || 'v1'
  })
  if (termsErr) throw termsErr
}

// Self-healing: called whenever we have an authenticated session. If this
// user doesn't have a `customers` row yet (most commonly because they
// confirmed their email after signing up, so the profile write at signup
// time was skipped), create it now using whatever we stashed at signup —
// or a bare-minimum profile from just their auth email as a last resort.
export async function ensureCustomerProfile() {
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data: existing } = await sb.from('customers').select('*').eq('id', user.id).maybeSingle()
  if (existing) return { ...existing, authEmail: user.email }

  let profile = null
  try { profile = JSON.parse(localStorage.getItem(PENDING_PROFILE_KEY) || 'null') } catch {}
  if (!profile) profile = { name: '', phone: '', businessName: '', termsVersion: 'v1', email: user.email || '' }

  await createCustomerProfile(user.id, profile)
  try { localStorage.removeItem(PENDING_PROFILE_KEY) } catch {}

  const { data } = await sb.from('customers').select('*').eq('id', user.id).maybeSingle()
  return data ? { ...data, authEmail: user.email } : null
}

export async function myCustomerRow() {
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data } = await sb.from('customers').select('*').eq('id', user.id).maybeSingle()
  if (data) return { ...data, authEmail: user.email }
  // No profile row yet — self-heal instead of leaving them stuck.
  return ensureCustomerProfile()
}

/* ---- catalog ---- */
export async function loadCatalog() {
  const { data } = await sb.from('items').select('*').eq('active', true).order('category').order('name')
  return (data || []).map(i => ({ id: i.id, name: i.name, unit: i.unit, cat: i.category || 'Other', sell: +i.cash_rate || 0 }))
}

// Resolve the customer's contracted rate card (if CSM-managed) as a
// { lowercase item name -> rate } map, for the active valid_from/valid_to period.
export async function loadPricingForCustomer(clientId) {
  const map = {} // lowercase item name -> contracted rate
  if (!clientId) return map
  const today = new Date().toISOString().slice(0, 10)
  const { data: cards } = await sb.from('rate_cards').select('*').eq('client_id', clientId)
  if (!cards?.length) return map
  const active = cards.find(c => (!c.valid_from || c.valid_from <= today) && (!c.valid_to || c.valid_to >= today))
    || cards.slice().sort((a, b) => (b.valid_to || '').localeCompare(a.valid_to || ''))[0]
  if (!active) return map
  const { data: rci } = await sb.from('rate_card_items').select('*, items(name)').eq('card_id', active.id)
  rci?.forEach(r => { const n = r.items?.name?.toLowerCase(); if (n) map[n] = +r.rate })
  return map
}

/* ---- address book ---- */
export async function loadAddresses() {
  const { data } = await sb.from('customer_addresses').select('*').order('is_default', { ascending: false }).order('created_at')
  return data || []
}
export async function saveAddress(a) {
  const { data: { user } } = await sb.auth.getUser()
  const row = {
    id: a.id, customer_id: user.id, label: a.label || 'Address', area: a.area || 'Custom',
    line1: a.line1, line2: a.line2 || '', city: a.city || 'Hyderabad', pincode: a.pincode || '',
    landmark: a.landmark || '', phone: a.phone || '', is_default: !!a.isDefault, created_by: a.createdBy || 'customer'
  }
  if (row.is_default) await sb.from('customer_addresses').update({ is_default: false }).eq('customer_id', user.id)
  const { data, error } = await sb.from('customer_addresses').upsert(row, { onConflict: 'id' }).select('*').single()
  if (error) throw error
  return data
}
export async function deleteAddress(id) {
  await sb.from('customer_addresses').delete().eq('id', id)
}

/* ---- offers / promo codes ---- */
export async function validateOffer(code, subtotal) {
  const clean = String(code || '').trim()
  if (!clean) return null
  const { data } = await sb.from('offers').select('*').ilike('code', clean).eq('active', true).maybeSingle()
  if (!data) throw new Error('That promo code is invalid or no longer active.')
  const today = new Date().toISOString().slice(0, 10)
  if (data.valid_from && data.valid_from > today) throw new Error('That promo code is not active yet.')
  if (data.valid_to && data.valid_to < today) throw new Error('That promo code has expired.')
  if (subtotal < (+data.min_order || 0)) throw new Error(`This code needs a minimum order of ${money0(data.min_order)}.`)
  const discount = data.type === 'percent' ? subtotal * (+data.value / 100) : +data.value
  return { code: data.code, label: data.label, discount: Math.min(Math.max(discount, 0), subtotal) }
}
function money0(n) { return '₹' + Math.round(n || 0).toLocaleString('en-IN') }

/* ---- orders ---- */
export async function placeOrder({ customerId, clientId, addressId, contactName, contactPhone, deliveryArea, deliveryAddress, lines, subtotal, deliveryFee, total, paymentMethod, notes, promoCode, discountAmount }) {
  const { data: order, error } = await sb.from('orders').insert({
    customer_id: customerId, client_id: clientId || null, address_id: addressId || null,
    source: 'storefront', status: 'pending', payment_method: paymentMethod,
    payment_status: paymentMethod === 'cod' ? 'unpaid' : 'unpaid',
    contact_name: contactName, contact_phone: contactPhone,
    delivery_area: deliveryArea, delivery_address: deliveryAddress,
    subtotal, delivery_fee: deliveryFee || 0, total,
    promo_code: promoCode || null, discount_amount: discountAmount || 0,
    notes: notes || ''
  }).select('*').single()
  if (error) throw error
  await sb.from('order_lines').insert(lines.map((l, k) => ({
    order_id: order.id, item_id: l.id || null, name: l.name, unit: l.unit,
    qty: +l.qty, rate: +l.rate, amount: +l.qty * +l.rate, sort: k
  })))
  await sb.from('order_status_events').insert({ order_id: order.id, status: 'pending', note: 'Order placed' }).catch(() => {})
  return order
}

export async function markOrderPaid(orderId, razorpayOrderId, razorpayPaymentId) {
  await sb.from('orders').update({
    payment_status: 'paid', razorpay_order_id: razorpayOrderId, razorpay_payment_id: razorpayPaymentId, status: 'confirmed'
  }).eq('id', orderId)
  await sb.from('order_status_events').insert({ order_id: orderId, status: 'confirmed', note: 'Payment received' }).catch(() => {})
}

export async function myOrders() {
  const { data: orders } = await sb.from('orders').select('*').order('placed_at', { ascending: false })
  const { data: lines } = await sb.from('order_lines').select('*').order('sort')
  const byOrder = {}
  lines?.forEach(l => { (byOrder[l.order_id] = byOrder[l.order_id] || []).push(l) })
  return (orders || []).map(o => ({ ...o, lines: byOrder[o.id] || [] }))
}
export async function orderById(id) {
  const { data: order } = await sb.from('orders').select('*').eq('id', id).maybeSingle()
  if (!order) return null
  const { data: lines } = await sb.from('order_lines').select('*').eq('order_id', id).order('sort')
  return { ...order, lines: lines || [] }
}

export async function loadSettings() {
  const { data } = await sb.from('settings').select('*').maybeSingle()
  return data
}
