import { signInCustomer } from './shop-db.js'

const form = document.getElementById('loginForm')
const err = document.getElementById('err')
const next = new URLSearchParams(location.search).get('next') || '/shop/index.html'

form.addEventListener('submit', async e => {
  e.preventDefault()
  err.hidden = true
  const fd = new FormData(form)
  const btn = form.querySelector('button[type=submit]')
  btn.disabled = true; btn.textContent = 'Logging in…'
  const { error } = await signInCustomer(fd.get('email'), fd.get('pw'))
  if (error) {
    err.textContent = error.message; err.hidden = false
    btn.disabled = false; btn.textContent = 'Log in'
    return
  }
  location.href = next
})
