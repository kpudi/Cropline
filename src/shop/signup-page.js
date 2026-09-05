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
    await signUpCustomer({
      email: fd.get('email'), pw: fd.get('pw'), name: fd.get('name'),
      phone: fd.get('phone'), businessName: fd.get('businessName'), termsVersion: 'v1'
    })
    location.href = '/shop/index.html'
  } catch (e2) {
    err.textContent = e2.message || 'Could not create account.'
    err.hidden = false
    btn.disabled = false; btn.textContent = 'Create account'
  }
})
