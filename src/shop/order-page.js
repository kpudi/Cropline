import { requireCustomer } from './shop-auth.js'
import { orderById } from './shop-db.js'
import { renderShell, money, dmyTime, esc, STATUS_LABEL, STATUS_STEPS } from './util.js'

renderShell('orders')

async function boot() {
  await requireCustomer()
  const id = new URLSearchParams(location.search).get('id')
  const order = id && await orderById(id)
  const el = document.getElementById('content')
  if (!order) { el.innerHTML = '<div class="center-msg">Order not found.</div>'; return }

  const cancelled = order.status === 'cancelled'
  const stepIdx = STATUS_STEPS.indexOf(order.status)
  el.innerHTML = `
    <div class="panel" style="text-align:center">
      <div style="font-size:32px">✅</div>
      <h1 style="font-family:'Fraunces',serif;font-size:20px;margin:8px 0 2px">Order ${esc(order.order_no)}</h1>
      <p class="hint">Placed ${dmyTime(order.placed_at)}</p>
      <span class="pill ${order.status}" style="margin-top:8px">${STATUS_LABEL[order.status]}</span>
    </div>

    ${!cancelled ? `<div class="panel">
      <div class="steps">
        ${STATUS_STEPS.map((s, i) => `<div class="step ${i <= stepIdx ? 'done' : ''}">
          <div class="dot">${i + 1}</div><div class="lbl">${STATUS_LABEL[s]}</div></div>`).join('')}
      </div>
    </div>` : ''}

    <div class="panel">
      <h2 style="font-size:14px;font-weight:600;margin-bottom:8px">Items</h2>
      ${order.lines.map(l => `<div class="tr"><span>${esc(l.name)} × ${l.qty}${esc(l.unit)}</span><span class="num">${money(l.amount)}</span></div>`).join('')}
      ${order.discount_amount ? `<div class="tr"><span>Discount${order.promo_code ? ' (' + esc(order.promo_code) + ')' : ''}</span><span class="num" style="color:var(--leaf)">−${money(order.discount_amount)}</span></div>` : ''}
      <div class="tr grand"><span>Total</span><span class="num">${money(order.total)}</span></div>
      <p class="hint" style="margin-top:8px">Payment: ${order.payment_method === 'online' ? 'Online' : 'Pay later / invoiced'} · ${esc(order.payment_status)}</p>
    </div>

    <div class="panel">
      <h2 style="font-size:14px;font-weight:600;margin-bottom:8px">Delivering to</h2>
      <p style="font-size:14px">${esc(order.contact_name)} · ${esc(order.contact_phone)}</p>
      <p class="hint" style="margin-top:4px">${esc(order.delivery_address)}</p>
    </div>

    <a class="btn block" href="/" style="text-align:center;display:block">Continue shopping</a>
  `
}
boot()
