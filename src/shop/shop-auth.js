import { sb, getSession, myCustomerRow } from './shop-db.js'

// Call at the top of any page that requires a signed-in customer.
// Returns the customer row, or redirects to login and never resolves.
export async function requireCustomer() {
  const { data: { session } } = await getSession()
  if (!session) { location.href = '/shop/login.html?next=' + encodeURIComponent(location.pathname + location.search); return new Promise(() => {}) }
  let cust
  try {
    cust = await myCustomerRow()
  } catch (e) {
    // Profile creation failed (rare — e.g. a real network/RLS problem).
    // Don't silently bounce them in a loop; show it.
    document.body.innerHTML = `<div style="max-width:520px;margin:80px auto;padding:24px;font-family:system-ui;text-align:center">
      <h2>Couldn't load your account</h2><p style="color:#b00">${(e && e.message) || 'Please try logging in again.'}</p>
      <p><a href="/shop/login.html">Back to login</a></p></div>`
    return new Promise(() => {})
  }
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
