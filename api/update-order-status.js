// Admin-only: change an order's status and notify the customer by email
// + WhatsApp. Called from the admin panel's Orders tab.
const { supabaseAdmin, requireAdmin } = require('./_lib/supabaseAdmin')
const { notifyOrderStatus } = require('./_lib/notify')

const VALID = ['pending', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled']

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    await requireAdmin(req)
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { orderId, status, note } = body
    if (!orderId || !VALID.includes(status)) return res.status(400).json({ error: 'Invalid orderId/status' })

    const sb = supabaseAdmin()
    const { data: order, error } = await sb.from('orders').update({ status }).eq('id', orderId).select('*').single()
    if (error) throw error
    await sb.from('order_status_events').insert({ order_id: orderId, status, note: note || '' })

    let notify = { skipped: true }
    try {
      const { data: cust } = await sb.from('customers').select('email,phone').eq('id', order.customer_id).maybeSingle()
      notify = await notifyOrderStatus({ order, email: cust?.email, phone: order.contact_phone || cust?.phone })
    } catch (e) { console.error('notify error', e) }

    res.status(200).json({ ok: true, order, notify })
  } catch (e) {
    res.status(e.message === 'Not authenticated' || e.message === 'Not an admin' ? 403 : 500).json({ error: e.message })
  }
}
