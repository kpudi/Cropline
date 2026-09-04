import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_KEY
export const sb = createClient(URL, KEY)

/* ---- auth ---- */
export const signIn = (email, pw) =>
  sb.auth.signInWithPassword({ email, password: pw })
export const signOut = () => sb.auth.signOut()
export const getSession = () => sb.auth.getSession()

/* ---- generic ---- */
const own = () => sb.auth.getUser().then(r => r.data?.user?.id)

/* ---- settings ---- */
export async function loadSettings() {
  const { data } = await sb.from('settings').select('*').maybeSingle()
  return data
}
export async function saveSettings(s, nextNo) {
  const uid = await own()
  await sb.from('settings').upsert({
    owner: uid, biz: s.biz, addr: s.addr, phone: s.phone,
    gstin: s.gstin, terms: s.terms, prefix: s.prefix,
    next_no: nextNo, updated_at: new Date().toISOString()
  }, { onConflict: 'owner' })
}

/* ---- items ---- */
export async function loadItems() {
  const [{ data: items }, { data: prices }] = await Promise.all([
    sb.from('items').select('*').eq('active', true).order('name'),
    sb.from('item_prices').select('*').order('on_date')
  ])
  const hist = {}
  prices?.forEach(p => { (hist[p.item_id] = hist[p.item_id] || []).push({ d: p.on_date, r: +p.rate }) })
  return (items || []).map(i => {
    const h = hist[i.id] || []
    const last = h[h.length - 1]
    return { id: i.id, name: i.name, unit: i.unit, cat: i.category || 'Other',
      sell: +i.cash_rate || 0, hist: h, buy: last ? last.r : 0, buyOn: last ? last.d : '' }
  })
}
export async function upsertItem(it) {
  const uid = await own()
  const { data } = await sb.from('items').upsert({
    id: it.id, owner: uid, name: it.name.trim(), unit: it.unit,
    category: it.cat || 'Other', cash_rate: +it.sell || 0
  }, { onConflict: 'id' }).select('id').single()
  return data?.id || it.id
}
export async function setBuyRate(itemId, date, rate) {
  const uid = await own()
  if (+rate === 0) { await sb.from('item_prices').delete().eq('item_id', itemId).eq('on_date', date); return }
  await sb.from('item_prices').upsert({ owner: uid, item_id: itemId, on_date: date, rate: +rate }, { onConflict: 'item_id,on_date' })
}

/* ---- clients ---- */
export async function loadClients() {
  const [{ data: clients }, { data: cards }, { data: rci }] = await Promise.all([
    sb.from('clients').select('*').eq('active', true).order('name'),
    sb.from('rate_cards').select('*').order('valid_from'),
    sb.from('rate_card_items').select('*, items(name)')
  ])
  const ratesByCard = {}
  rci?.forEach(r => {
    const n = r.items?.name?.toLowerCase()
    if (n) (ratesByCard[r.card_id] = ratesByCard[r.card_id] || {})[n] = +r.rate
  })
  return (clients || []).map(c => ({
    id: c.id, name: c.name, phone: c.phone || '',
    cards: (cards || []).filter(k => k.client_id === c.id).map(k => ({
      id: k.id, from: k.valid_from, to: k.valid_to, rates: ratesByCard[k.id] || {}
    }))
  }))
}
export async function upsertClient(c) {
  const uid = await own()
  await sb.from('clients').upsert({ id: c.id, owner: uid, name: c.name, phone: c.phone || '' }, { onConflict: 'id' })
}
export async function upsertCard(clientId, card, itemsByName) {
  const uid = await own()
  await sb.from('rate_cards').upsert({ id: card.id, owner: uid, client_id: clientId, valid_from: card.from, valid_to: card.to }, { onConflict: 'id' })
  const rows = Object.entries(card.rates || {}).map(([n, r]) => {
    const it = itemsByName[n]; return it && +r > 0 ? { card_id: card.id, item_id: it.id, rate: +r } : null
  }).filter(Boolean)
  await sb.from('rate_card_items').delete().eq('card_id', card.id)
  if (rows.length) await sb.from('rate_card_items').insert(rows)
}

/* ---- bills ---- */
export async function loadBills(limit = 200) {
  const [{ data: bills }, { data: lines }] = await Promise.all([
    sb.from('bills').select('*').order('bill_date', { ascending: false }).limit(limit),
    sb.from('bill_lines').select('*').order('sort')
  ])
  const byBill = {}
  lines?.forEach(l => { (byBill[l.bill_id] = byBill[l.bill_id] || []).push(l) })
  return (bills || []).map(b => ({
    id: b.id, no: b.bill_no, date: b.bill_date, clientId: b.client_id || '',
    customer: b.customer || '', phone: b.phone || '', gst: +b.gst_pct || 0,
    discount: +b.discount || 0, total: +b.total || 0, cost: +b.cost || 0,
    profit: +b.profit || 0,
    lines: (byBill[b.id] || []).map(l => ({ name: l.name, unit: l.unit, qty: +l.qty, rate: +l.rate, buy: +l.buy_rate }))
  }))
}
export async function saveBill(b, lines, uid) {
  const { data } = await sb.from('bills').upsert({
    id: b.id, owner: uid, bill_no: b.no, bill_date: b.date,
    client_id: b.clientId || null, customer: b.customer || '', phone: b.phone || '',
    gst_pct: +b.gst || 0, discount: +b.discount || 0,
    total: +b.total || 0, cost: +b.cost || 0, profit: +b.profit || 0
  }, { onConflict: 'id' }).select('id').single()
  const billId = data?.id || b.id
  await sb.from('bill_lines').delete().eq('bill_id', billId)
  if (lines.length) await sb.from('bill_lines').insert(
    lines.map((l, k) => ({ bill_id: billId, name: l.name, unit: l.unit, qty: +l.qty, rate: +l.rate, buy_rate: +l.buy || 0, sort: k }))
  )
  return billId
}
