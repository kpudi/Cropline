import { signUpCustomer, resendConfirmation } from './shop-db.js'

const form = document.getElementById('signupForm')
const err = document.getElementById('err')
const signupBox = form.closest('.auth-box')
const confirmPanel = document.getElementById('confirmPanel')

form.addEventListener('submit', async e => {
  e.preventDefault()
  err.hidden = true
  const fd = new FormData(form)
  if (!document.getElementById('tcCheck').checked) {
    err.textContent = 'Please accept the Terms & Conditions to continue.'; err.hidden = false; return
  }
  const email = fd.get('email')
  const btn = form.querySelector('button[type=submit]')
  btn.disabled = true; btn.textContent = 'Creating account…'
  try {
    const result = await signUpCustomer({
      email, pw: fd.get('pw'), name: fd.get('name'),
      phone: fd.get('phone'), businessName: fd.get('businessName'), termsVersion: 'v1'
    })
    if (result.needsConfirmation) {
      showConfirmPanel(email)
      return
    }
    location.href = '/'
  } catch (e2) {
    err.textContent = e2.message || 'Could not create account.'
    err.hidden = false
    btn.disabled = false; btn.textContent = 'Create account'
  }
})

function showConfirmPanel(email) {
  signupBox.hidden = true
  confirmPanel.hidden = false
  document.getElementById('confirmEmail').textContent = email
  confirmPanel.dataset.email = email
}

let cooldown = 0
document.getElementById('resendBtn').addEventListener('click', async () => {
  if (cooldown > 0) return
  const msg = document.getElementById('resendMsg')
  const btn = document.getElementById('resendBtn')
  const email = confirmPanel.dataset.email
  btn.disabled = true
  try {
    const { error } = await resendConfirmation(email)
    if (error) throw error
    msg.style.color = 'var(--leaf)'
    msg.textContent = 'Sent — check your inbox again.'
    msg.hidden = false
    startCooldown(btn)
  } catch (e) {
    msg.style.color = 'var(--red)'
    msg.textContent = e.message || 'Could not resend right now — try again in a moment.'
    msg.hidden = false
    btn.disabled = false
  }
})

function startCooldown(btn) {
  cooldown = 30
  const tick = () => {
    if (cooldown <= 0) { btn.disabled = false; btn.textContent = 'Resend confirmation email'; return }
    btn.textContent = `Resend confirmation email (${cooldown}s)`
    cooldown--
    setTimeout(tick, 1000)
  }
  tick()
}
