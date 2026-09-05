// Verifies the Razorpay payment signature server-side, then marks the
// order paid+confirmed using the service-role key (the customer's own
// RLS grant doesn't allow setting status='confirmed' — only admins/
// this trusted server code can).
const crypto = require('crypto')
const { supabaseAdmin } = require('./_lib/supabaseAdmin')
const { notifyOrderStatus } = require('./_lib/notify')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body
    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({ error: 'Missing payment fields' })

    const secret = process.env.RAZORPAY_KEY_SECRET
    if (!secret) return res.status(500).json({ error: 'Payments are not configured yet.' })

    const expected = crypto.createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex')
    if (expected !== razorpay_signature) return res.status(400).json({ error: 'Payment signature mismatch — payment not verified.' })

    const sb = supabaseAdmin()
    const { data: order, error } = await sb.from('orders').update({
      payment_status: 'paid', status: 'confirmed',
      razorpay_order_id, razorpay_payment_id
    }).eq('id', orderId).select('*').single()
    if (error) throw error
    await sb.from('order_status_events').insert({ order_id: orderId, status: 'confirmed', note: 'Payment verified' })

    // Fire-and-forget notification (don't fail the request if this errors)
    try {
      const { data: cust } = await sb.from('customers').select('email,phone').eq('id', order.customer_id).maybeSingle()
      await notifyOrderStatus({ order, email: cust?.email, phone: order.contact_phone || cust?.phone })
    } catch (e) { console.error('notify error', e) }

    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
