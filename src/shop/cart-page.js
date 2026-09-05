import { getCart, setQty, removeFromCart, cartTotals, repriceCart } from './cart.js'
import { loadCatalog, loadPricingForCustomer } from './shop-db.js'
import { optionalCustomer } from './shop-auth.js'
import { renderShell, money, esc } from './util.js'

renderShell('cart')

async function boot() {
  const cust = await optionalCustomer()
  const catalog = await loadCatalog()
  const rateMap = cust?.client_id ? await loadPricingForCustomer(cust.client_id) : {}
  repriceCart(catalog, rateMap)
  render()
}
boot()

function render() {
  const cart = getCart()
  document.getElementById('empty').hidden = cart.length > 0
  document.getElementById('lines').hidden = cart.length === 0
  document.getElementById('totals').hidden = cart.length === 0
  document.getElementById('toCheckout').hidden = cart.length === 0
  if (!cart.length) return

  document.getElementById('lines').innerHTML = cart.map(l => `
    <div class="cartline" data-name="${esc(l.name)}">
      <div class="cln"><b>${esc(l.name)}</b><small>${money(l.rate)} / ${esc(l.unit)}</small></div>
      <div class="qtybox"><button data-act="dec">−</button><input class="num" data-qty value="${l.qty}"><button data-act="inc">+</button></div>
      <div class="clamt num">${money(l.qty * l.rate)}</div>
      <button class="del" data-act="rm" style="color:#C4BFB4;font-size:18px;padding:4px 6px">×</button>
    </div>`).join('')

  const t = cartTotals(cart)
  document.getElementById('totals').innerHTML = `
    <div class="tr"><span>Subtotal</span><span class="num">${money(t.subtotal)}</span></div>
    <div class="tr"><span>Delivery</span><span class="num">${t.deliveryFee ? money(t.deliveryFee) : 'Free'}</span></div>
    <div class="tr grand"><span>Total</span><span class="num">${money(t.total)}</span></div>`

  document.querySelectorAll('.cartline').forEach(row => {
    const name = row.getAttribute('data-name')
    row.querySelector('[data-act="inc"]').addEventListener('click', () => {
      const l = getCart().find(x => x.name === name); setQty(name, (+l.qty || 0) + 1); render()
    })
    row.querySelector('[data-act="dec"]').addEventListener('click', () => {
      const l = getCart().find(x => x.name === name); setQty(name, (+l.qty || 0) - 1); render()
    })
    row.querySelector('[data-qty]').addEventListener('change', e => { setQty(name, +e.target.value || 0); render() })
    row.querySelector('[data-act="rm"]').addEventListener('click', () => { removeFromCart(name); render() })
  })
}

document.getElementById('toCheckout').addEventListener('click', () => { location.href = '/shop/checkout.html' })
