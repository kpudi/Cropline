// Cart lives in localStorage keyed by item name (works for both logged-out
// browsing and logged-in checkout — merges with the server only at
// place-order time).
import { updateCartBadge } from './util.js'

const KEY = 'cropline_cart'

export function getCart() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function save(cart) {
  localStorage.setItem(KEY, JSON.stringify(cart))
  updateCartBadge()
}
export function addToCart(item, qty) {
  const cart = getCart()
  const i = cart.findIndex(l => l.name.toLowerCase() === item.name.toLowerCase())
  if (i >= 0) cart[i].qty = +(+cart[i].qty + +qty).toFixed(3)
  else cart.push({ id: item.id, name: item.name, unit: item.unit, qty: +qty, rate: +item.rate })
  save(cart)
  return cart
}
export function setQty(name, qty) {
  let cart = getCart()
  if (+qty <= 0) cart = cart.filter(l => l.name.toLowerCase() !== name.toLowerCase())
  else { const i = cart.findIndex(l => l.name.toLowerCase() === name.toLowerCase()); if (i >= 0) cart[i].qty = +qty }
  save(cart)
  return cart
}
export function removeFromCart(name) {
  const cart = getCart().filter(l => l.name.toLowerCase() !== name.toLowerCase())
  save(cart)
  return cart
}
export function clearCart() { save([]) }

// Re-price every cart line against the current catalog + the customer's
// contracted rates (if any) so prices are always fresh at checkout time.
export function repriceCart(catalog, rateMap) {
  const byName = {}
  catalog.forEach(it => { byName[it.name.toLowerCase()] = it })
  const cart = getCart().map(l => {
    const it = byName[l.name.toLowerCase()]
    if (!it) return l
    const rate = rateMap?.[l.name.toLowerCase()] ?? it.sell
    return { ...l, id: it.id, unit: it.unit, rate }
  })
  save(cart)
  return cart
}
export function cartTotals(cart) {
  const subtotal = cart.reduce((s, l) => s + (+l.qty || 0) * (+l.rate || 0), 0)
  return { subtotal, deliveryFee: 0, total: subtotal }
}
