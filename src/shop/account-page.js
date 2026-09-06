import { requireCustomer, wireLogout } from './shop-auth.js'
import { myOrders, loadAddresses, saveAddress, deleteAddress } from './shop-db.js'
import { renderShell, money, dmyTime, esc, STATUS_LABEL, lookupPincode } from './util.js'

renderShell('orders')
wireLogout()

let customer, addresses = []

async function boot() {
  customer = await requireCustomer()
  document.getElementById('who').innerHTML = `<b>${esc(customer.full_name)}</b><div class="hint">${esc(customer.phone)} · ${esc(customer.authEmail || customer.email)}${customer.type === 'csm' ? ' · Managed account' : ''}</div>`
  await renderOrders()
  addresses = await loadAddresses()
  renderAddresses()
  switchTab(location.hash === '#addresses' ? 'addresses' : 'orders')
}
boot()

document.getElementById('tabOrders').addEventListener('click', () => switchTab('orders'))
document.getElementById('tabAddresses').addEventListener('click', () => switchTab('addresses'))
function switchTab(t) {
  document.getElementById('ordersPane').hidden = t !== 'orders'
  document.getElementById('addressesPane').hidden = t !== 'addresses'
  document.getElementById('tabOrders').style.background = t === 'orders' ? 'var(--leaf-soft)' : ''
  document.getElementById('tabAddresses').style.background = t === 'addresses' ? 'var(--leaf-soft)' : ''
}

async function renderOrders() {
  const orders = await myOrders()
  const pane = document.getElementById('ordersPane')
  if (!orders.length) { pane.innerHTML = '<div class="center-msg">No orders yet.</div>'; return }
  pane.innerHTML = orders.map(o => `
    <a class="panel" href="/shop/order.html?id=${o.id}" style="display:block">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <b>${esc(o.order_no)}</b>
        <span class="pill ${o.status}">${STATUS_LABEL[o.status] || o.status}</span>
      </div>
      <div class="hint" style="margin-top:4px">${dmyTime(o.placed_at)} · ${o.lines.length} item(s)</div>
      <div style="margin-top:6px;font-weight:700" class="num">${money(o.total)}</div>
    </a>`).join('')
}

function renderAddresses() {
  const pane = document.getElementById('addressesPane')
  pane.innerHTML = `
    <div id="addrCards" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px"></div>
    <button class="btn block" id="addAddr">+ Add new address</button>
    <div class="panel" id="addrForm" hidden style="margin-top:12px"></div>
  `
  paintAddrCards()
  document.getElementById('addAddr').addEventListener('click', () => openForm())
}
function paintAddrCards() {
  const wrap = document.getElementById('addrCards')
  if (!addresses.length) { wrap.innerHTML = '<p class="hint">No saved addresses yet.</p>'; return }
  wrap.innerHTML = addresses.map(a => `
    <div class="addr-card" data-id="${a.id}">
      ${a.area ? `<span class="area-tag">${esc(a.area)}</span>` : ''}${a.is_default ? ' <span class="hint">Default</span>' : ''}
      <b>${esc(a.label)}</b>
      <p>${esc(a.line1)}${a.line2 ? ', ' + esc(a.line2) : ''}, ${esc(a.city)}${a.state ? ', ' + esc(a.state) : ''} ${esc(a.pincode)}<br>Phone: ${esc(a.phone)}</p>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn sm" data-act="edit">Edit</button>
        <button class="btn sm danger" data-act="del">Delete</button>
      </div>
    </div>`).join('')
  wrap.querySelectorAll('.addr-card').forEach(el => {
    const a = addresses.find(x => x.id === el.getAttribute('data-id'))
    el.querySelector('[data-act="edit"]').addEventListener('click', () => openForm(a))
    el.querySelector('[data-act="del"]').addEventListener('click', async () => {
      if (!confirm('Delete this address?')) return
      await deleteAddress(a.id); addresses = addresses.filter(x => x.id !== a.id); paintAddrCards()
    })
  })
}
function openForm(a) {
  const form = document.getElementById('addrForm')
  form.hidden = false
  form.innerHTML = `
    <label class="f"><span>Label</span><input class="inp" id="fLabel" value="${esc(a?.label || '')}" placeholder="Home, Restaurant, Kitchen…"></label>
    <label class="f"><span>Pincode</span><input class="inp" id="fPin" value="${esc(a?.pincode || '')}" inputmode="numeric" maxlength="6" placeholder="6-digit PIN code"></label>
    <div id="fPinHint" class="hint" style="margin:-8px 0 12px"></div>
    <div style="display:flex;gap:10px">
      <label class="f" style="flex:1"><span>City</span><input class="inp" id="fCity" value="${esc(a?.city || '')}" placeholder="Auto-filled from pincode"></label>
      <label class="f" style="flex:1"><span>State</span><input class="inp" id="fState" value="${esc(a?.state || '')}" placeholder="Auto-filled from pincode"></label>
    </div>
    <label class="f"><span>Locality / Area</span><input class="inp" id="fArea" value="${esc(a?.area || '')}" placeholder="Neighbourhood or post office area"></label>
    <label class="f"><span>Address line 1</span><input class="inp" id="fLine1" value="${esc(a?.line1 || '')}"></label>
    <label class="f"><span>Address line 2 / landmark</span><input class="inp" id="fLine2" value="${esc(a?.line2 || '')}"></label>
    <label class="f"><span>Contact phone</span><input class="inp" id="fPhone" value="${esc(a?.phone || '')}" placeholder="10-digit mobile number"></label>
    <label class="chk"><input type="checkbox" id="fDefault" ${a?.is_default ? 'checked' : ''}><span>Set as default address</span></label>
    <div style="display:flex;gap:8px"><button class="btn" id="fCancel">Cancel</button><button class="btn pri" id="fSave" style="flex:1">Save address</button></div>
  `
  document.getElementById('fCancel').addEventListener('click', () => form.hidden = true)
  const fPin = document.getElementById('fPin'), fPinHint = document.getElementById('fPinHint')
  fPin.addEventListener('input', () => { fPin.value = fPin.value.replace(/\D/g, '').slice(0, 6) })
  fPin.addEventListener('blur', async () => {
    if (fPin.value.length !== 6) return
    fPinHint.textContent = 'Looking up pincode…'
    const found = await lookupPincode(fPin.value)
    if (found) {
      document.getElementById('fCity').value = found.city
      document.getElementById('fState').value = found.state
      if (!document.getElementById('fArea').value) document.getElementById('fArea').value = found.area
      fPinHint.textContent = `${found.area ? found.area + ', ' : ''}${found.city}, ${found.state}`
      fPinHint.style.color = 'var(--leaf)'
    } else {
      fPinHint.textContent = "Couldn't find that pincode — enter city/state manually."
      fPinHint.style.color = 'var(--red)'
    }
  })
  document.getElementById('fSave').addEventListener('click', async () => {
    const phone = document.getElementById('fPhone').value.trim().replace(/\D/g, '')
    if (!/^[6-9]\d{9}$/.test(phone)) { alert('Enter a valid 10-digit mobile number.'); return }
    const pincode = document.getElementById('fPin').value
    if (!/^\d{6}$/.test(pincode)) { alert('Enter a valid 6-digit pincode.'); return }
    const row = {
      id: a?.id, label: document.getElementById('fLabel').value || 'Address',
      area: document.getElementById('fArea').value, line1: document.getElementById('fLine1').value,
      line2: document.getElementById('fLine2').value, pincode,
      city: document.getElementById('fCity').value, state: document.getElementById('fState').value,
      phone, isDefault: document.getElementById('fDefault').checked
    }
    if (!row.line1) { alert('Address line 1 is required.'); return }
    const saved = await saveAddress(row)
    if (a) addresses = addresses.map(x => x.id === saved.id ? saved : x)
    else addresses.push(saved)
    if (saved.is_default) addresses = addresses.map(x => x.id === saved.id ? x : { ...x, is_default: false })
    form.hidden = true
    paintAddrCards()
  })
}
