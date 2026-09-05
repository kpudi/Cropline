// Best-effort order notifications. Neither channel is required to be
// configured — if the env vars are missing, that channel is silently
// skipped, so the app still works without email/WhatsApp wired up yet.
const BRAND = 'Cropline'
const SITE_URL = process.env.SITE_URL || 'https://cropline-ruddy.vercel.app'

const STATUS_TEXT = {
  pending: 'Your order {no} has been received and is pending confirmation.',
  confirmed: 'Your order {no} is confirmed and being prepared.',
  packed: 'Your order {no} has been packed and will be out for delivery soon.',
  out_for_delivery: 'Your order {no} is out for delivery.',
  delivered: 'Your order {no} has been delivered. Thank you for ordering with Cropline!',
  cancelled: 'Your order {no} has been cancelled.'
}
const STATUS_HEADLINE = {
  pending: 'Order received',
  confirmed: 'Order confirmed',
  packed: 'Order packed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Order cancelled'
}

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
function money(n) { return '₹' + Math.round(n || 0).toLocaleString('en-IN') }

// Shared HTML shell so every email (order placed, status updates) looks like
// it came from the same store — a simple green header, a message, an
// optional itemized table, and a footer link back to order tracking.
function emailShell({ preheader, title, bodyHtml, orderUrl }) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F2F0E9;font-family:Arial,Helvetica,sans-serif;color:#16211C">
  <span style="display:none;max-height:0;overflow:hidden">${esc(preheader || '')}</span>
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#1F4D3A;border-radius:12px 12px 0 0;padding:20px 24px">
      <span style="font-size:20px;font-weight:700;color:#fff">Cropline</span>
    </div>
    <div style="background:#fff;border:1px solid #E4E1D8;border-top:none;border-radius:0 0 12px 12px;padding:24px">
      <h1 style="font-size:18px;margin:0 0 12px">${esc(title)}</h1>
      ${bodyHtml}
      ${orderUrl ? `<p style="margin:22px 0 0"><a href="${orderUrl}" style="display:inline-block;background:#1F4D3A;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">Track your order</a></p>` : ''}
    </div>
    <p style="text-align:center;color:#6E7A73;font-size:12px;margin-top:16px">Cropline &middot; Hyderabad &middot; This is an automated message about your order.</p>
  </div>
  </body></html>`
}

function lineItemsTable(lines) {
  if (!lines || !lines.length) return ''
  const rows = lines.map(l => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #E4E1D8;font-size:14px">${esc(l.name)} <span style="color:#6E7A73">&times; ${esc(l.qty)}${esc(l.unit || '')}</span></td>
      <td style="padding:8px 0;border-bottom:1px solid #E4E1D8;font-size:14px;text-align:right">${money(l.amount)}</td>
    </tr>`).join('')
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0">${rows}</table>`
}

async function sendEmail(to, subject, text, html) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM || 'Cropline <onboarding@resend.dev>'
  if (!key || !to) return { skipped: true }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text, ...(html ? { html } : {}) })
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

// Sent once, right after checkout — an itemized receipt, like any storefront
// sends the moment you place an order (before it's even confirmed/packed).
async function notifyOrderPlaced({ order, lines, email, phone, customerName }) {
  const orderUrl = `${SITE_URL}/shop/order.html?id=${order.id}`
  const text = `Hi${customerName ? ' ' + customerName : ''}, thanks for your order ${order.order_no} (${money(order.total)}). ` +
    `We'll email you as it's confirmed, packed and delivered. Track it: ${orderUrl}`
  const html = emailShell({
    preheader: `Order ${order.order_no} received — ${money(order.total)}`,
    title: `Thanks${customerName ? ', ' + esc(customerName) : ''} — we've got your order`,
    orderUrl,
    bodyHtml: `
      <p style="font-size:14px;color:#6E7A73;margin:0 0 4px">Order ${esc(order.order_no)}</p>
      ${lineItemsTable(lines)}
      <table style="width:100%;border-collapse:collapse;margin-top:4px">
        <tr><td style="padding:4px 0;font-size:14px;color:#6E7A73">Subtotal</td><td style="text-align:right;font-size:14px">${money(order.subtotal)}</td></tr>
        ${order.discount_amount ? `<tr><td style="padding:4px 0;font-size:14px;color:#6E7A73">Discount</td><td style="text-align:right;font-size:14px">-${money(order.discount_amount)}</td></tr>` : ''}
        <tr><td style="padding:6px 0;font-size:15px;font-weight:700">Total</td><td style="text-align:right;font-size:15px;font-weight:700">${money(order.total)}</td></tr>
      </table>
      <p style="font-size:14px;line-height:1.5;margin-top:16px">Delivering to: ${esc(order.delivery_address)}</p>
      <p style="font-size:13px;color:#6E7A73">We'll send you an update the moment your order is confirmed, packed, and out for delivery.</p>`
  })
  const [e, w] = await Promise.all([
    sendEmail(email, `Order received: ${order.order_no}`, text, html),
    sendWhatsApp(phone, text)
  ])
  return { email: e, whatsapp: w }
}

// Sent on every status change (confirmed / packed / out for delivery /
// delivered / cancelled) from the admin's Orders tab.
async function notifyOrderStatus({ order, email, phone }) {
  const orderUrl = `${SITE_URL}/shop/order.html?id=${order.id}`
  const text = (STATUS_TEXT[order.status] || `Your order {no} status: ${order.status}`).replace('{no}', order.order_no)
  const html = emailShell({
    preheader: text,
    title: `${STATUS_HEADLINE[order.status] || 'Order update'} — ${esc(order.order_no)}`,
    orderUrl,
    bodyHtml: `<p style="font-size:15px;line-height:1.5">${esc(text)}</p>`
  })
  const [e, w] = await Promise.all([
    sendEmail(email, `Cropline order ${order.order_no}: ${order.status.replace(/_/g, ' ')}`, text, html),
    sendWhatsApp(phone, text)
  ])
  return { email: e, whatsapp: w }
}

module.exports = { notifyOrderStatus, notifyOrderPlaced, sendEmail, sendWhatsApp }
