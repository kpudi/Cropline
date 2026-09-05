// Called by the storefront right after an order is inserted, to send the
// "we've got your order" confirmation email/WhatsApp. Requires the
// customer's own session token (not admin) — we look the order up
// server-side and check it actually belongs to them before emailing anyone,
// so a customer can't use this to spam notifications for someone else's order.
const { supabaseAdmin, requireUser } = require('./_lib/supabaseAdmin')
const { notifyOrderPlaced } = require('./_lib/notify')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const user = await requireUser(req)
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { orderId } = body
    if (!orderId) return res.status(400).json({ error: 'orderId is required' })

    const sb = supabaseAdmin()
    const { data: order } = await sb.from('orders').select('*').eq('id', orderId).maybeSingle()
    if (!order || order.customer_id !== user.id) return res.status(404).json({ error: 'Order not found' })

    const [{ data: lines }, { data: cust }] = await Promise.all([
      sb.from('order_lines').select('*').eq('order_id', orderId).order('sort'),
      sb.from('customers').select('email,phone,full_name').eq('id', order.customer_id).maybeSingle()
    ])

    const notify = await notifyOrderPlaced({
      order, lines: lines || [],
      email: cust?.email || user.email, phone: order.contact_phone || cust?.phone, customerName: cust?.full_name
    })
    res.status(200).json({ ok: true, notify })
  } catch (e) {
    res.status(e.message === 'Not authenticated' ? 403 : 500).json({ error: e.message })
  }
}
