import { loadCatalog, loadPricingForCustomer } from './shop-db.js'
import { optionalCustomer } from './shop-auth.js'
import { addToCart, getCart, setQty } from './cart.js'
import { renderShell, toast, money, CATS, esc } from './util.js'
import { parseList } from '../parser.js'

renderShell('shop')

let catalog = [], rateMap = {}, activeCat = 'All', query = ''

async function boot() {
  const cust = await optionalCustomer()
  const [items] = await Promise.all([loadCatalog()])
  catalog = items
  if (cust?.client_id) rateMap = await loadPricingForCustomer(cust.client_id)
  catalog = catalog.map(i => ({ ...i, effRate: rateMap[i.name.toLowerCase()] ?? i.sell, contracted: rateMap[i.name.toLowerCase()] != null }))
  renderChips()
  renderGrid()
  document.getElementById('loading').hidden = true
  document.getElementById('grid').hidden = false
}
boot()

function renderChips() {
  const cats = ['All', ...CATS.filter(c => catalog.some(i => i.cat === c))]
  document.getElementById('chips').innerHTML = cats.map(c =>
    `<button class="chip ${c === activeCat ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')
  document.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => {
    activeCat = b.getAttribute('data-cat'); renderChips(); renderGrid()
  }))
}

function renderGrid() {
  const q = query.trim().toLowerCase()
  const list = catalog.filter(i =>
    (activeCat === 'All' || i.cat === activeCat) &&
    (!q || i.name.toLowerCase().includes(q)))
  const grid = document.getElementById('grid')
  if (!list.length) { grid.innerHTML = `<div class="center-msg">No items match your search.</div>`; return }
  const cartMap = {}; getCart().forEach(l => cartMap[l.name.toLowerCase()] = l.qty)
  grid.innerHTML = list.map(i => {
    const inCart = cartMap[i.name.toLowerCase()] || 0
    return `<div class="card" data-name="${esc(i.name)}">
      <div class="thumb">🥬</div>
      <div class="cname">${esc(i.name)}</div>
      <div class="ccat">${esc(i.cat)} · per ${esc(i.unit)}</div>
      <div class="crow">
        <div class="cprice">${money(i.effRate)}${i.contracted ? '<small><br>your rate</small>' : ''}</div>
        ${inCart
          ? `<div class="qtybox"><button data-act="dec">−</button><input class="num" data-qty value="${inCart}" inputmode="decimal"><button data-act="inc">+</button></div>`
          : `<button class="addbtn" data-act="add">Add</button>`}
      </div>
    </div>`
  }).join('')
  grid.querySelectorAll('.card').forEach(card => {
    const name = card.getAttribute('data-name')
    const item = catalog.find(i => i.name === name)
    card.querySelector('[data-act="add"]')?.addEventListener('click', () => {
      addToCart({ id: item.id, name: item.name, unit: item.unit, rate: item.effRate }, 1)
      toast(item.name + ' added to cart')
      renderGrid()
    })
    card.querySelector('[data-act="inc"]')?.addEventListener('click', () => {
      addToCart({ id: item.id, name: item.name, unit: item.unit, rate: item.effRate }, 1)
      renderGrid()
    })
    card.querySelector('[data-act="dec"]')?.addEventListener('click', () => {
      const cart = getCart(); const line = cart.find(l => l.name.toLowerCase() === name.toLowerCase())
      setQty(name, (line?.qty || 1) - 1); renderGrid()
    })
    card.querySelector('[data-qty]')?.addEventListener('change', e => { setQty(name, +e.target.value || 0); renderGrid() })
  })
}

document.getElementById('search').addEventListener('input', e => { query = e.target.value; renderGrid() })

/* ---- paste WhatsApp order ---- */
const scrim = document.getElementById('pasteScrim')
document.getElementById('pasteBtn').addEventListener('click', () => { scrim.hidden = false; document.getElementById('pasteResult').innerHTML = '' })
document.getElementById('pasteCancel').addEventListener('click', () => scrim.hidden = true)
document.getElementById('pasteParse').addEventListener('click', () => {
  const text = document.getElementById('pasteText').value
  const parseItems = catalog.map(i => ({ name: i.name, unit: i.unit, sell: i.effRate, buy: 0 }))
  const rows = parseList(text, parseItems)
  const box = document.getElementById('pasteResult')
  if (!rows.length) { box.innerHTML = '<p class="hint">Could not read any items from that text.</p>'; return }
  box.innerHTML = `<p class="hint" style="margin-bottom:8px">${rows.length} item(s) found — review before adding:</p>` +
    rows.map((r, k) => `<div class="cartline">
        <div class="cln"><b>${esc(r.matched || r.name)}</b><small>${r.qty} ${esc(r.unit)} ${r.matched ? '' : '· not matched, will be skipped'}</small></div>
        <input type="checkbox" data-row="${k}" ${r.matched ? 'checked' : 'disabled'}>
      </div>`).join('') +
    `<button class="btn pri block" id="pasteAdd" style="margin-top:10px">Add checked items to cart</button>`
  document.getElementById('pasteAdd').addEventListener('click', () => {
    let n = 0
    rows.forEach((r, k) => {
      const cb = box.querySelector(`[data-row="${k}"]`)
      if (cb?.checked && r.matched) {
        const it = catalog.find(i => i.name === r.matched)
        if (it) { addToCart({ id: it.id, name: it.name, unit: it.unit, rate: it.effRate }, r.qty); n++ }
      }
    })
    scrim.hidden = true
    toast(n + ' item(s) added to cart')
    renderGrid()
  })
})
