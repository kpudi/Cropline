// Best-effort order-status notifications. Neither channel is required to
// be configured — if the env vars are missing, that channel is silently
// skipped, so the app still works without email/WhatsApp wired up yet.
const STATUS_TEXT = {
  pending: 'Your order {no} has been received and is pending confirmation.',
  confirmed: 'Your order {no} is confirmed and being prepared.',
  packed: 'Your order {no} has been packed and will be out for delivery soon.',
  out_for_delivery: 'Your order {no} is out for delivery.',
  delivered: 'Your order {no} has been delivered. Thank you for ordering with Cropline!',
  cancelled: 'Your order {no} has been cancelled.'
}

async function sendEmail(to, subject, text) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM || 'Cropline <orders@resend.dev>'
  if (!key || !to) return { skipped: true }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text })
    })
    if (!r.ok) return { error: await r.text() }
    return { ok: true }
  } catch (e) { return { error: e.message } }
}

async function sendWhatsApp(toPhone, text) {
  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneId || !toPhone) return { skipped: true }
  const to = String(toPhone).replace(/[^\d]/g, '')
  const withCC = to.length === 10 ? '91' + to : to
  try {
    const r = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: withCC, type: 'text', text: { body: text } })
    })
    if (!r.ok) return { error: await r.text() }
    return { ok: true }
  } catch (e) { return { error: e.message } }
}

async function notifyOrderStatus({ order, email, phone }) {
  const text = (STATUS_TEXT[order.status] || `Your order {no} status: ${order.status}`).replace('{no}', order.order_no)
  const [e, w] = await Promise.all([
    sendEmail(email, `Cropline order ${order.order_no}: ${order.status.replace(/_/g, ' ')}`, text),
    sendWhatsApp(phone, text)
  ])
  return { email: e, whatsapp: w }
}

module.exports = { notifyOrderStatus, sendEmail, sendWhatsApp }
