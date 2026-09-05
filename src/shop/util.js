// Shared helpers for the storefront (kept separate from the admin's state.js
// so the two apps never fight over the same reactive singleton).
export const today = () => new Date().toISOString().slice(0, 10)
export const uuid4 = () => crypto.randomUUID()
export const money = n => '₹' + (Math.round((n || 0) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })
export const money0 = n => '₹' + Math.round(n || 0).toLocaleString('en-IN')
export const dmy = s => { const d = new Date(String(s).slice(0,10) + 'T00:00:00'); return isNaN(d) ? s : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
export const dmyTime = s => { const d = new Date(s); return isNaN(d) ? s : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }
export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export const CATS = ['Indian Veg', 'Leafy Veg', 'Exotic Veg', 'Fresh Fruits', 'Frozen & Premium', 'Other']
export const AREAS = ['Kukatpally', 'Madhapur', 'Gachibowli', 'Custom']

export const STATUS_LABEL = {
  pending: 'Order placed', confirmed: 'Confirmed', packed: 'Packed',
  out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled'
}
export const STATUS_STEPS = ['pending', 'confirmed', 'packed', 'out_for_delivery', 'delivered']

let toastTimer = null
export function toast(msg) {
  let t = document.querySelector('.shop-toast')
  if (!t) { t = document.createElement('div'); t.className = 'shop-toast'; document.body.appendChild(t) }
  t.textContent = msg
  t.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600)
}

export function renderShell(active, { showFooter = true } = {}) {
  const header = document.getElementById('shopHeader')
  if (header) {
    header.innerHTML = `
      <div class="inner">
        <a href="/" class="mark">Cropline<small>Fresh, direct to your kitchen</small></a>
        <nav class="shopnav">
          <a href="/" data-nav="shop">Shop</a>
          <a href="/shop/account.html" data-nav="orders">My Orders</a>
          <a href="/shop/account.html#addresses" data-nav="addresses">Addresses</a>
          <a href="/shop/cart.html" class="cart-btn" data-nav="cart">Cart <span class="badge" data-cart-count hidden>0</span></a>
        </nav>
      </div>`
    header.querySelectorAll('[data-nav]').forEach(a => { if (a.getAttribute('data-nav') === active) a.classList.add('on') })
  }
  const footer = document.getElementById('shopFooter')
  if (footer && showFooter) {
    footer.innerHTML = `Cropline &middot; Hyderabad
      <div style="margin-top:6px">
        <a href="/shop/terms.html">Terms</a>&middot;
        <a href="/shop/privacy.html">Privacy</a>&middot;
        <a href="/shop/policies.html">Shipping &amp; Refunds</a>
      </div>`
  }
  updateCartBadge()
}
export function updateCartBadge() {
  const el = document.querySelector('[data-cart-count]')
  if (!el) return
  try {
    const cart = JSON.parse(localStorage.getItem('cropline_cart') || '[]')
    const n = cart.reduce((s, l) => s + 1, 0)
    el.textContent = n
    el.hidden = n === 0
  } catch { el.hidden = true }
}
