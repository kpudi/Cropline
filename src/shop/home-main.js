import { loadCatalog } from './shop-db.js'
import { renderShell, esc, CATS } from './util.js'

renderShell('shop')
document.getElementById('yr').textContent = new Date().getFullYear()

const CAT_META = {
  'Indian Veg': { icon: '🥕', desc: 'Daily mandi-fresh staples, hand-graded.' },
  'Leafy Veg': { icon: '🌱', desc: 'Cut & packed the morning of delivery.' },
  'Exotic Veg': { icon: '🥗', desc: 'Premium exotics, hydroponic lettuces, fresh herbs.' },
  'Fresh Fruits': { icon: '🍎', desc: 'Local & imported, ripeness-checked.' },
  'Frozen & Premium': { icon: '❄️', desc: 'IQF berries, pulps, and premium imports.' },
  'Other': { icon: '🧺', desc: 'Everything else on the daily list.' }
}

async function boot() {
  const items = await loadCatalog()
  document.getElementById('statItems').textContent = items.length + '+'
  const cats = CATS.filter(c => items.some(i => i.cat === c))
  document.getElementById('catGrid').innerHTML = cats.map(c => {
    const meta = CAT_META[c] || { icon: '🧺', desc: '' }
    return `<a class="cat-card" href="/shop/catalog.html?cat=${encodeURIComponent(c)}">
      <span class="cat-arrow">→</span>
      <div class="cat-ico">${meta.icon}</div>
      <h3>${esc(c)}</h3>
      <p>${esc(meta.desc)}</p>
    </a>`
  }).join('')
}
boot()
