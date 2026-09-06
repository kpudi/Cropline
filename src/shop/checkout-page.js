import { requireCustomer } from './shop-auth.js'
import { loadAddresses, saveAddress, placeOrder, loadCatalog, loadPricingForCustomer, validateOffer, sb } from './shop-db.js'
import { getCart, cartTotals, clearCart, repriceCart } from './cart.js'
import { renderShell, money, esc, lookupPincode } from './util.js'

// Online payment is switched off until a provider is chosen — the Razorpay
// integration below is fully wired but dormant. To re-enable: flip this to
// true, uncomment the checkout.js script tag in shop/checkout.html, and
// make sure RAZORPAY_KEY_ID/SECRET are set in Vercel.
const PAYMENTS_ENABLED = false

renderShell('cart')
renderPaymentPanel()

function renderPaymentPanel() {
  const panel = document.getElementById('paymentPanel')
  if (PAYMENTS_ENABLED) {
    panel.insertAdjacentHTML('beforeend', `
      <label class="chk"><input type="radio" name="pm" value="online" checked><span>Pay online now (UPI / Card / Netbanking)</span></label>
      <label class="chk"><input type="radio" name="pm" value="cod"><span>Cash on delivery / bill later</span></label>`)
  } else {
    panel.insertAdjacentHTML('beforeend', `
      <p class="hint">Online payment isn't set up yet — your order will be placed on a pay-later basis and your account manager will confirm payment with you directly.</p>`)
  }
}

let customer, addresses = [], selectedAddr = null, cart = [], offer = null

async function boot() {
  customer = await requireCustomer()
  cart = getCart()
  if (!cart.length) { location.href = '/shop/cart.html'; return }
  const [catalog, addrs] = await Promise.all([loadCatalog(), loadAddresses()])
  const rateMap = customer.client_id ? await loadPricingForCustomer(customer.client_id) : {}
  cart = repriceCart(catalog, rateMap)
  addresses = addrs
  selectedAddr = addresses.find(a => a.is_default) || addresses[0] || null
  renderAddresses()
  renderItems()
  renderTotals()
}
boot()

function renderItems() {
  document.getElementById('itemsList').innerHTML = cart.map(l => `
    <div class="tr"><span>${esc(l.name)} <span style="color:var(--muted)">× ${l.qty}${esc(l.unit)}</span></span><span class="num">${money(l.qty * l.rate)}</span></div>
  `).join('')
}

document.getElementById('promoApply').addEventListener('click', async () => {
  const code = document.getElementById('promoInput').value.trim()
  const msg = document.getElementById('promoMsg')
  if (!code) { offer = null; msg.textContent = ''; renderTotals(); return }
  try {
    const t = cartTotals(cart)
    offer = await validateOffer(code, t.subtotal)
    msg.style.color = 'var(--leaf)'
    msg.textContent = `Applied ${offer.code} — ${money(offer.discount)} off${offer.label ? ' (' + offer.label + ')' : ''}`
  } catch (e) {
    offer = null
    msg.style.color = 'var(--red)'
    msg.textContent = e.message
  }
  renderTotals()
})

function renderAddresses() {
  const list = document.getElementById('addrList')
  if (!addresses.length) { list.innerHTML = '<p class="hint">No saved addresses yet — add one below.</p>'; return }
  list.innerHTML = addresses.map(a => `
    <div class="addr-card ${selectedAddr?.id === a.id ? 'on' : ''}" data-id="${a.id}">
      ${a.area ? `<span class="area-tag">${esc(a.area)}</span>` : ''}
      <b>${esc(a.label)}</b>
      <p>${esc(a.line1)}${a.line2 ? ', ' + esc(a.line2) : ''}, ${esc(a.city)}${a.state ? ', ' + esc(a.state) : ''} ${esc(a.pincode)}<br>Phone: ${esc(a.phone)}</p>
    </div>`).join('')
  list.querySelectorAll('.addr-card').forEach(el => el.addEventListener('click', () => {
    selectedAddr = addresses.find(a => a.id === el.getAttribute('data-id')); renderAddresses()
  }))
}

document.getElementById('newAddrBtn').addEventListener('click', () => {
  document.getElementById('newAddrPanel').hidden = false
})

const naPin = document.getElementById('naPin'), naPinHint = document.getElementById('naPinHint')
naPin.addEventListener('input', () => { naPin.value = naPin.value.replace(/\D/g, '').slice(0, 6) })
naPin.addEventListener('blur', async () => {
  if (naPin.value.length !== 6) return
  naPinHint.textContent = 'Looking up pincode…'
  const found = await lookupPincode(naPin.value)
  if (found) {
    document.getElementById('naCity').value = found.city
    document.getElementById('naState').value = found.state
    if (!document.getElementById('naArea').value) document.getElementById('naArea').value = found.area
    naPinHint.textContent = `${found.area ? found.area + ', ' : ''}${found.city}, ${found.state}`
    naPinHint.style.color = 'var(--leaf)'
  } else {
    naPinHint.textContent = "Couldn't find that pincode — enter city/state manually."
    naPinHint.style.color = 'var(--red)'
  }
})

document.getElementById('naSave').addEventListener('click', async () => {
  const phone = document.getElementById('naPhone').value.trim()
  if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g, ''))) { alert('Enter a valid 10-digit mobile number.'); return }
  const a = {
    label: document.getElementById('naLabel').value || 'Address',
    area: document.getElementById('naArea').value,
    line1: document.getElementById('naLine1').value,
    line2: document.getElementById('naLine2').value,
    pincode: document.getElementById('naPin').value,
    city: document.getElementById('naCity').value,
    state: document.getElementById('naState').value,
    phone: phone.replace(/\D/g, ''),
    isDefault: addresses.length === 0
  }
  if (!a.line1) { alert('Address line 1 is required.'); return }
  if (!/^\d{6}$/.test(a.pincode)) { alert('Enter a valid 6-digit pincode.'); return }
  const saved = await saveAddress(a)
  addresses.push(saved); selectedAddr = saved
  document.getElementById('newAddrPanel').hidden = true
  renderAddresses()
})

function renderTotals() {
  const t = cartTotals(cart)
  const discount = offer?.discount || 0
  const total = Math.max(0, t.total - discount)
  document.getElementById('totals').innerHTML = `
    <div class="tr"><span>Subtotal</span><span class="num">${money(t.subtotal)}</span></div>
    ${discount ? `<div class="tr"><span>Discount (${esc(offer.code)})</span><span class="num" style="color:var(--leaf)">−${money(discount)}</span></div>` : ''}
    <div class="tr"><span>Delivery</span><span class="num">Free</span></div>
    <div class="tr grand"><span>Total</span><span class="num">${money(total)}</span></div>`
}

const err = document.getElementById('err')
document.getElementById('placeBtn').addEventListener('click', async () => {
  err.hidden = true
  if (!selectedAddr) { err.textContent = 'Please add or select a delivery address.'; err.hidden = false; return }
  if (!cart.length) { err.textContent = 'Your cart is empty.'; err.hidden = false; return }
  const pm = PAYMENTS_ENABLED ? document.querySelector('input[name=pm]:checked').value : 'cod'
  const btn = document.getElementById('placeBtn')
  btn.disabled = true; btn.textContent = 'Placing order…'
  try {
    const t = cartTotals(cart)
    const discount = offer?.discount || 0
    const total = Math.max(0, t.total - discount)
    const order = await placeOrder({
      customerId: customer.id, clientId: customer.client_id, addressId: selectedAddr.id,
      contactName: customer.full_name, contactPhone: selectedAddr.phone,
      deliveryArea: selectedAddr.area, deliveryAddress: `${selectedAddr.line1}, ${selectedAddr.line2 || ''}, ${selectedAddr.city}, ${selectedAddr.state || ''} ${selectedAddr.pincode}`,
      lines: cart, subtotal: t.subtotal, deliveryFee: t.deliveryFee, total,
      promoCode: offer?.code || null, discountAmount: discount, paymentMethod: pm
    })
    if (pm === 'cod') {
      clearCart()
      location.href = '/shop/order.html?id=' + order.id
      return
    }
    await payWithRazorpay(order)
  } catch (e) {
    err.textContent = e.message || 'Could not place order.'; err.hidden = false
    btn.disabled = false; btn.textContent = 'Place order'
  }
})

async function payWithRazorpay(order) {
  const btn = document.getElementById('placeBtn')
  const resp = await fetch('/api/create-razorpay-order', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: order.total, receipt: order.order_no })
  })
  const rzp = await resp.json()
  if (!resp.ok) throw new Error(rzp.error || 'Could not start payment.')
  await sb.from('orders').update({ razorpay_order_id: rzp.id }).eq('id', order.id)

  const options = {
    key: rzp.keyId, amount: rzp.amount, currency: rzp.currency, order_id: rzp.id,
    name: 'Cropline', description: 'Order ' + order.order_no,
    prefill: { name: customer.full_name, contact: order.contact_phone, email: customer.authEmail || customer.email },
    theme: { color: '#1F4D3A' },
    handler: async (result) => {
      try {
        const v = await fetch('/api/verify-payment', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id, razorpay_order_id: result.razorpay_order_id, razorpay_payment_id: result.razorpay_payment_id, razorpay_signature: result.razorpay_signature })
        })
        if (!v.ok) throw new Error((await v.json()).error || 'Payment verification failed')
        clearCart()
        location.href = '/shop/order.html?id=' + order.id
      } catch (e) {
        err.textContent = e.message; err.hidden = false
        btn.disabled = false; btn.textContent = 'Place order'
      }
    },
    modal: {
      ondismiss: () => {
        err.textContent = 'Payment cancelled. Your order is saved as pending — you can retry payment from My Orders.'
        err.hidden = false
        btn.disabled = false; btn.textContent = 'Place order'
      }
    }
  }
  new Razorpay(options).open()
}
