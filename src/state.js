// Central app state — single source of truth
import { reactive } from 'https://esm.sh/vue@3/dist/vue.esm-browser.js'

export const S = reactive({
  // auth
  user: null, authReady: false,
  // data
  settings: { biz: 'Cropline', addr: '', phone: '', gstin: '', terms: 'Payment due on delivery.', prefix: 'SS' },
  nextNo: 1,
  items: [], clients: [], bills: [], orders: [], customers: [],
  // UI
  tab: 'bill', loading: false, saving: false, saveErr: '',
  // draft bill
  draft: null
})

export const CATS = ['Indian Veg','Leafy Veg','Exotic Veg','Fresh Fruits','Frozen & Premium','Other']
export const today = () => new Date().toISOString().slice(0, 10)
export const uuid4 = () => crypto.randomUUID()
export const money = n => '₹' + (Math.round((n||0)*100)/100).toLocaleString('en-IN',{minimumFractionDigits:2})
export const money0 = n => '₹' + Math.round(n||0).toLocaleString('en-IN')
export const dmy = s => { const d = new Date(s+'T00:00:00'); return isNaN(d)?s:d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) }
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10) }
export const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth()+n); return x.toISOString().slice(0,10) }

export function blankLine() { return { name:'', unit:'KG', qty:'', rate:'', buy:0 } }
export function blankDraft(settings, nextNo) {
  return { id: uuid4(), no: (settings.prefix||'SS')+'-'+String(nextNo).padStart(4,'0'),
    date: today(), clientId:'', customer:'', phone:'', gst:0, discount:0,
    lines: [blankLine(), blankLine(), blankLine()] }
}

// Rate resolution
export function activeCard(cl, date) {
  if (!cl?.cards?.length) return null
  const d = date || today()
  return cl.cards.find(c => (!c.from||c.from<=d)&&(!c.to||c.to>=d))
      || cl.cards.slice().sort((a,b)=>(b.to||'').localeCompare(a.to||''))[0]
}
export function rateFor(name, clientId, date) {
  const key = String(name||'').trim().toLowerCase()
  const it = S.items.find(x => x.name.toLowerCase()===key)
  const cl = S.clients.find(c => c.id===clientId)
  const card = activeCard(cl, date)
  if (card?.rates?.[key] != null && card.rates[key]!=='') return { rate:+card.rates[key], src:'card' }
  return { rate: it?+it.sell:0, src: cl?'off':'default' }
}
export function buyFor(name, date) {
  const it = S.items.find(x => x.name.toLowerCase()===String(name||'').trim().toLowerCase())
  if (!it) return 0
  const h = (it.hist||[]).filter(x=>x.d<=(date||today())).sort((a,b)=>a.d.localeCompare(b.d))
  const e = h[h.length-1]; return e ? +e.r : +it.buy||0
}
export function calcTotals(draft) {
  let sub=0, cost=0
  draft.lines.forEach(l=>{ const q=+l.qty||0,r=+l.rate||0; sub+=q*r; cost+=q*(+l.buy||0) })
  const gst=sub*(+draft.gst||0)/100, disc=+draft.discount||0
  return { sub, gst, disc, cost, total:Math.max(0,sub+gst-disc), profit:sub-cost-disc }
}
