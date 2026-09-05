import { signInCustomer, resendConfirmation } from './shop-db.js'

const form = document.getElementById('loginForm')
const err = document.getElementById('err')
const resendBtn = document.getElementById('resendBtn')
const next = new URLSearchParams(location.search).get('next') || '/'

form.addEventListener('submit', async e => {
  e.preventDefault()
  err.hidden = true
  resendBtn.hidden = true
  const fd = new FormData(form)
  const btn = form.querySelector('button[type=submit]')
  btn.disabled = true; btn.textContent = 'Logging in…'
  const { error } = await signInCustomer(fd.get('email'), fd.get('pw'))
  if (error) {
    if (/email.*not.*confirm/i.test(error.message)) {
      err.textContent = 'Please confirm your email first — check your inbox for the link we sent when you signed up.'
      resendBtn.hidden = false
      resendBtn.dataset.email = fd.get('email')
    } else {
      err.textContent = error.message
    }
    err.hidden = false
    btn.disabled = false; btn.textContent = 'Log in'
    return
  }
  location.href = next
})

let cooldown = 0
resendBtn.addEventListener('click', async () => {
  if (cooldown > 0) return
  const email = resendBtn.dataset.email
  try {
    const { error } = await resendConfirmation(email)
    if (error) throw error
    err.style.color = 'var(--leaf)'
    err.textContent = 'Sent — check your inbox again.'
    err.hidden = false
    cooldown = 30
    const tick = () => {
      if (cooldown <= 0) { resendBtn.disabled = false; resendBtn.textContent = 'Resend confirmation email'; return }
      resendBtn.textContent = `Resend confirmation email (${cooldown}s)`
      cooldown--; setTimeout(tick, 1000)
    }
    resendBtn.disabled = true; tick()
  } catch (e) {
    err.style.color = 'var(--red)'
    err.textContent = e.message || 'Could not resend right now.'
    err.hidden = false
  }
})
