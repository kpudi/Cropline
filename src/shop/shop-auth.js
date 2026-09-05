import { sb, getSession, myCustomerRow } from './shop-db.js'

// Call at the top of any page that requires a signed-in customer.
// Returns the customer row, or redirects to login and never resolves.
export async function requireCustomer() {
  const { data: { session } } = await getSession()
  if (!session) { location.href = '/shop/login.html?next=' + encodeURIComponent(location.pathname + location.search); return new Promise(() => {}) }
  const cust = await myCustomerRow()
  if (!cust) { location.href = '/shop/login.html'; return new Promise(() => {}) }
  return cust
}

// For pages that work whether or not you're logged in (catalog).
export async function optionalCustomer() {
  const { data: { session } } = await getSession()
  if (!session) return null
  return myCustomerRow()
}

export function wireLogout(sel = '[data-logout]') {
  document.querySelectorAll(sel).forEach(b => b.addEventListener('click', async () => {
    await sb.auth.signOut()
    location.href = '/shop/login.html'
  }))
}
