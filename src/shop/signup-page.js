import { signUpCustomer } from './shop-db.js'

const form = document.getElementById('signupForm')
const err = document.getElementById('err')

form.addEventListener('submit', async e => {
  e.preventDefault()
  err.hidden = true
  const fd = new FormData(form)
  if (!document.getElementById('tcCheck').checked) {
    err.textContent = 'Please accept the Terms & Conditions to continue.'; err.hidden = false; return
  }
  const btn = form.querySelector('button[type=submit]')
  btn.disabled = true; btn.textContent = 'Creating account…'
  try {
    const result = await signUpCustomer({
      email: fd.get('email'), pw: fd.get('pw'), name: fd.get('name'),
      phone: fd.get('phone'), businessName: fd.get('businessName'), termsVersion: 'v1'
    })
    if (result.needsConfirmation) {
      err.style.color = 'var(--leaf, #2f7d4f)'
      err.textContent = 'Almost there — check your email and click the confirmation link, then log in to start shopping.'
      err.hidden = false
      btn.disabled = true; btn.textContent = 'Check your email'
      return
    }
    location.href = '/'
  } catch (e2) {
    err.textContent = e2.message || 'Could not create account.'
    err.hidden = false
    btn.disabled = false; btn.textContent = 'Create account'
  }
})
