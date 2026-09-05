// All tab views — Items, Clients, History, Setup
// Imported by main.js
import { S, CATS, today, uuid4, money, money0, dmy, addDays, addMonths,
         blankDraft, rateFor, buyFor, activeCard } from './state.js'
import { upsertItem, setBuyRate, upsertClient, upsertCard, saveSettings, loadBills } from './db.js'

const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const money_fmt = n => '₹'+(Math.round((n||0)*100)/100).toLocaleString('en-IN',{minimumFractionDigits:2})
const ONES=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
const TENS=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
function two(n){return n<20?ONES[n]:TENS[Math.floor(n/10)]+(n%10?' '+ONES[n%10]:'')}
function three(n){return(n>99?ONES[Math.floor(n/100)]+' Hundred'+(n%100?' ':''):'')+(n%100?two(n%100):'')}
export function inWords(num){num=Math.round(num||0);if(!num)return 'Zero Rupees Only';let s='',p=[[10000000,'Crore'],[100000,'Lakh'],[1000,'Thousand']];for(const[v,n]of p){if(num>=v){s+=three(Math.floor(num/v))+' '+n+' ';num%=v}}if(num)s+=three(num);return s.trim().replace(/\s+/g,' ')+' Rupees Only'}

// ─── state for each tab ──────────────────────────────────────────────────────
export let iAsOn='', iCat='', iQ=''
export let openClient='', cQ='', cardSel=null, asOn=''

export function setIAsOn(v){iAsOn=v}
export function setICat(v){iCat=v}
export function setIQ(v){iQ=v}
export function setOpenClient(v){openClient=v}
export function setCQ(v){cQ=v}
export function setCardSel(v){cardSel=v}
export function setAsOn(v){asOn=v}

export let oStatus='', oQ=''
export function setOStatus(v){oStatus=v}
export function setOQ(v){oQ=v}

export let custQ='', custOpen=null, csmForm=false, custAddrs=[]
export function setCustQ(v){custQ=v}
export function setCustOpen(v){custOpen=v}
export function setCsmForm(v){csmForm=v}
export function setCustAddrs(v){custAddrs=v}

const iDate = () => iAsOn || today()
const viewDate = () => asOn || today()

function histSorted(it){return(it.hist||[]).slice().sort((a,b)=>a.d.localeCompare(b.d))}
function buyOnDate(it,d){const h=histSorted(it).filter(x=>x.d<=(d||today()));return h.length?h[h.length-1]:null}
function prevBuyEntry(it,d){const h=histSorted(it).filter(x=>x.d<=(d||today()));return h.length>1?h[h.length-2]:null}
function cardOn(cl,d){if(!cl?.cards)return null;return cl.cards.find(c=>(!c.from||c.from<=d)&&(!c.to||c.to>=d))||null}
function daysLeft(cl,date){const c=activeCard(cl,date);if(!c?.to)return null;return Math.round((new Date(c.to)-new Date(date||today()))/86400000)}
function cardMargin(cl,d){const card=d?cardOn(cl,d):activeCard(cl);if(!card)return{n:0,pct:0};let sell=0,buy=0,n=0;Object.keys(card.rates||{}).forEach(k=>{const r=+card.rates[k];const b=buyFor(k,d||today());if(r>0&&b>0){sell+=r;buy+=b;n++}});return{n,pct:n?Math.round((sell-buy)/buy*100):0}}
const quarterStart=()=>today()
const quarterEnd=()=>{const e=new Date(addMonths(today(),3));e.setDate(e.getDate()-1);return e.toISOString().slice(0,10)}
const stale=()=>S.items.filter(it=>+it.buy>0&&(!it.buyOn||it.buyOn<addDays(today(),-7)))

// ─── ITEMS TAB ───────────────────────────────────────────────────────────────
export function itemsView(){
  const d=iDate(), isPast=d!==today()
  const list=S.items.map((it,i)=>({it,i}))
    .filter(({it})=>!iCat||(it.cat||'Other')===iCat)
    .filter(({it})=>it.name.toLowerCase().includes(iQ.toLowerCase()))
  return `<div class="panel">
  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:4px">
    <input class="search" placeholder="Search ${S.items.length} items…" value="${esc(iQ)}"
      oninput="window._setIQ(this.value)">
    <button class="btn" onclick="window._newItem()">+ New item</button>
    <button class="btn" onclick="window._carryForward()">Carry forward to ${dmy(d).slice(0,6)}</button>
    <button class="btn" onclick="window._printBuyList()">Print list</button>
    <button class="btn" onclick="window._shareBuyList()">Share on WhatsApp</button>
  </div>
  <div class="asonbar">
    <label style="font-weight:600;color:var(--ink)">Buying rates for
      <input class="inp" type="date" style="width:168px;display:inline-block;padding:6px 9px;margin-left:6px"
        value="${d}" max="${today()}" onchange="window._setIAsOn(this.value)"></label>
    ${isPast?`<button class="btn" style="padding:6px 12px" onclick="window._setIAsOn('')">Back to today</button>
      <span class="badge amber" style="margin:0;padding:5px 11px">Showing rates for ${dmy(d)}</span>`
    :`<span style="font-size:13px;color:var(--muted)">Type a new rate to record it for today.</span>`}
  </div>
  <div class="periods">
    ${['All',...CATS].map(c=>`<button class="chip ${(iCat||'All')===c?'on':''}" onclick="window._setICat('${c==='All'?'':c}')">
      ${c}<i>${c==='All'?S.items.length:S.items.filter(x=>(x.cat||'Other')===c).length} items</i></button>`).join('')}
  </div>
  ${stale().length&&d===today()?`<div class="badge amber">${stale().length} items were last priced over a week ago.</div>`:''}
  <div class="tscroll"><table class="grid"><thead><tr>
    <th style="width:30%">Item</th><th style="width:62px">Unit</th>
    <th class="r" style="width:104px">Buying rate</th><th class="r" style="width:96px">Change</th>
    <th style="width:88px">Priced on</th>
    <th class="r" style="width:98px">Cash rate</th>
    <th style="width:66px"></th></tr></thead><tbody>
  ${list.map(({it,i})=>{
    const e=buyOnDate(it,d), p=prevBuyEntry(it,d)
    const b=e?+e.r:0, diff=(p&&b)?b-(+p.r):0, dpc=(p&&+p.r)?Math.round(diff/(+p.r)*100):null
    const onThisDay=e&&e.d===d
    return `<tr>
      <td style="padding-left:10px">${esc(it.name)}</td>
      <td style="color:var(--muted)">${esc(it.unit)}</td>
      <td><input class="cell r num" inputmode="decimal" value="${b||''}" placeholder="0"
          title="${onThisDay?'Recorded today':'Carried from '+(e?dmy(e.d):'—')}"
          oninput="window._setBuy(${i},this.value,'${d}')" onblur="window._rerender()"></td>
      <td class="r num" style="padding-right:12px;font-weight:600;color:${!dpc?'var(--muted)':dpc>0?'var(--red)':'var(--leaf)'}">
        ${dpc==null?'—':(dpc>0?'+':'')+dpc+'%'}</td>
      <td style="font-size:12.5px;color:${onThisDay?'var(--muted)':'var(--marigold)'}">
        ${e?dmy(e.d).slice(0,6):'—'}</td>
      <td><input class="cell r num" inputmode="decimal" value="${it.sell||''}"
          oninput="window._setCashRate(${i},this.value)"></td>
      <td style="white-space:nowrap">
        <button class="del" title="History" onclick="window._showHist(${i})" style="font-size:13px">⋯</button>
        <button class="del" onclick="window._delItem(${i})">×</button></td>
    </tr>`}).join('')}
  </tbody></table></div>
  <p class="hint">Every rate is saved against its date. Pick any past date to see what you paid then. Amber = carried over from an older date.</p>
  </div>`
}

// ─── CLIENTS TAB ─────────────────────────────────────────────────────────────
export function clientsView(){
  if(openClient) return cardEditor()
  const d=viewDate(), isPast=d!==today()
  return `<div class="panel">
  <div style="display:flex;gap:10px;align-items:center;margin-bottom:4px;flex-wrap:wrap">
    <h2 style="font-family:'Fraunces',serif;font-weight:600;font-size:19px;margin:0">Clients & agreed rates</h2>
    <button class="btn" style="margin-left:auto" onclick="window._newClient()">+ New client</button>
  </div>
  <div class="asonbar">
    <label style="font-weight:600;color:var(--ink)">Show rates as on
      <input class="inp" type="date" style="width:168px;display:inline-block;padding:6px 9px;margin-left:6px"
        value="${d}" onchange="window._setAsOn(this.value)"></label>
    ${isPast?`<button class="btn" style="padding:6px 12px" onclick="window._setAsOn('')">Back to today</button>
      <span class="badge amber" style="margin:0;padding:5px 11px">Showing what applied on ${dmy(d)}</span>`:''}
  </div>
  ${!S.clients.length?`<div class="empty"><b>No clients yet</b>Add a client and set their agreed price list.</div>`:''}
  ${S.clients.length?`<table class="grid"><thead><tr>
    <th>Client</th><th style="width:110px">Rates agreed</th>
    <th style="width:200px">Valid</th><th class="r" style="width:120px">Margin today</th>
    <th style="width:34px"></th></tr></thead><tbody>
  ${S.clients.map((c,i)=>{
    const card=cardOn(c,d), dl=daysLeft(c,d)
    const n=card?Object.keys(card.rates||{}).filter(k=>card.rates[k]!==''&&card.rates[k]!=null).length:0
    const m=cardMargin(c,d)
    return `<tr class="hrow" onclick="window._openClient('${c.id}')">
      <td style="padding-left:10px;font-weight:600">${esc(c.name)}
        ${c.phone?`<div style="font-weight:400;color:var(--muted);font-size:12.5px">${esc(c.phone)}</div>`:''}</td>
      <td class="num">${n} items</td>
      <td style="color:${!card?'var(--muted)':dl!=null&&dl<0?'var(--red)':dl!=null&&dl<=14?'#8A5A11':'var(--muted)'};font-size:13px">
        ${card?(dmy(card.from)+' – '+dmy(card.to)+(dl!=null&&dl<0?' · ended':dl!=null&&dl<=14?' · '+dl+'d left':'')):'no list for this date'}</td>
      <td class="r num" style="font-weight:600;color:${m.pct<0?'var(--red)':'var(--leaf)'}">${m.n?m.pct+'%':'—'}</td>
      <td><button class="del" onclick="event.stopPropagation();window._delClient(${i})">×</button></td>
    </tr>`}).join('')}</tbody></table>`:''}
  <p class="hint">Margin compares each agreed rate against today's buying rate. Red = selling below cost.</p>
  </div>`
}

function cardEditor(){
  const cl=S.clients.find(c=>c.id===openClient)
  if(!cl){openClient='';return clientsView()}
  if(!cl.cards.length)cl.cards=[{id:uuid4(),from:quarterStart(),to:quarterEnd(),rates:{}}]
  cl.cards.sort((a,b)=>(a.from||'').localeCompare(b.from||''))
  const live=activeCard(cl), card=(cardSel!=null&&cl.cards[cardSel])?cl.cards[cardSel]:live
  const ci=cl.cards.indexOf(card), isLive=card===live
  const prev=cl.cards.filter(c=>c.to&&card.from&&c.to<card.from).sort((a,b)=>(b.to||'').localeCompare(a.to||''))[0]||null
  const listed=Object.keys(card.rates||{}).filter(k=>card.rates[k]!==''&&card.rates[k]!=null)
  const rows=S.items.map((it,i)=>({it,i,key:it.name.toLowerCase()}))
    .filter(r=>listed.includes(r.key))
    .filter(r=>r.it.name.toLowerCase().includes(cQ.toLowerCase()))
    .sort((a,b)=>(CATS.indexOf(a.it.cat||'Other')-CATS.indexOf(b.it.cat||'Other'))||a.it.name.localeCompare(b.it.name))
  const notListed=S.items.filter(it=>!listed.includes(it.name.toLowerCase()))
  const m=cardMargin(cl), d=daysLeft(cl)
  return `<div class="panel">
  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:6px">
    <button class="btn" onclick="window._closeClient()">← All clients</button>
    <h2 style="font-family:'Fraunces',serif;font-weight:600;font-size:20px;margin:0 0 0 4px">${esc(cl.name)}</h2>
    <button class="btn" style="margin-left:auto" onclick="window._renewCard('${cl.id}')">Renew for 3 months</button>
    <button class="btn" onclick="window._printCard('${cl.id}',${ci})">Print list</button>
    <button class="btn" onclick="window._shareCard('${cl.id}',${ci})">Share on WhatsApp</button>
    ${cl.cards.length>1?`<button class="btn" style="color:var(--red)" onclick="window._dropPeriod('${cl.id}',${ci})">Delete this period</button>`:''}
  </div>
  <div class="periods">
    ${cl.cards.map((c,k)=>{const st=(c.from<=today()&&c.to>=today())?'now':(c.from>today()?'next':'past')
      return `<button class="chip ${k===ci?'on':''} ${st}" onclick="window._setCardSel(${k})">
        ${dmy(c.from).slice(0,6)} – ${dmy(c.to)}<i>${st==='now'?'in force':st==='next'?'upcoming':'ended'} · ${Object.keys(c.rates||{}).length} rates</i></button>`}).join('')}
    <button class="chip add" onclick="window._renewCard('${cl.id}')">+ New period</button>
  </div>
  <div class="asonbar">
    <label style="font-weight:600;color:var(--ink)">Show rates as on
      <input class="inp" type="date" style="width:168px;display:inline-block;padding:6px 9px;margin-left:6px"
        value="${viewDate()}" onchange="window._jumpToDate('${cl.id}',this.value)"></label>
    ${!isLive||asOn?`<button class="btn" style="padding:6px 12px" onclick="window._setAsOn('');window._setCardSel(null)">Back to today</button>`:''}
    ${!isLive?`<span class="badge amber" style="margin:0;padding:5px 11px">Not the current period</span>`:''}
  </div>
  <div class="meta" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
    <label class="f"><span>Phone</span><input class="inp" value="${esc(cl.phone||'')}"
      oninput="window._setClientPhone('${cl.id}',this.value)"></label>
    <label class="f"><span>Valid from</span><input class="inp" type="date" value="${card.from||''}"
      onchange="window._setCardDate('${cl.id}',${ci},'from',this.value)"></label>
    <label class="f"><span>Valid until</span><input class="inp" type="date" value="${card.to||''}"
      onchange="window._setCardDate('${cl.id}',${ci},'to',this.value)"></label>
  </div>
  <div class="badge ${d!=null&&d<0?'red':d!=null&&d<=14?'amber':'green'}">
    ${listed.length} agreed rates${d==null?'':d<0?` · expired ${dmy(card.to)}`:` · ${d} days left`}
    ${m.n?` · margin today ${m.pct}%`:''}</div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:10px 0">
    <input class="search" style="margin:0" placeholder="Search this list…" value="${esc(cQ)}"
      oninput="window._setCQ(this.value)">
    <select class="inp" style="max-width:260px" onchange="window._addToCard('${cl.id}',${ci},this.value);this.value=''">
      <option value="">+ Add an item…</option>
      ${CATS.filter(c=>notListed.some(it=>(it.cat||'Other')===c)).map(c=>`<optgroup label="${esc(c)}">
        ${notListed.filter(it=>(it.cat||'Other')===c).map(it=>`<option value="${esc(it.name)}">${esc(it.name)}</option>`).join('')}
      </optgroup>`).join('')}
    </select>
  </div>
  <div class="periods" style="margin-top:0">
    ${CATS.filter(c=>notListed.some(it=>(it.cat||'Other')===c)).map(c=>{
      const n=notListed.filter(it=>(it.cat||'Other')===c).length
      return `<button class="chip add" onclick="window._addCategory('${cl.id}',${ci},'${esc(c)}')">+ All ${esc(c)} <i>${n} items</i></button>`}).join('')}
  </div>
  ${listed.length?`<table class="grid"><thead><tr>
    <th style="width:32%">Item</th><th style="width:62px">Unit</th>
    <th class="r" style="width:112px">Agreed rate</th>
    ${prev?`<th class="r" style="width:120px">Was (${dmy(prev.to).slice(0,6)})</th>`:''}
    <th class="r" style="width:110px">Buying today</th>
    <th class="r" style="width:96px">Margin</th><th style="width:34px"></th></tr></thead><tbody>
  ${rows.map(({it,key})=>{
    const r=+card.rates[key]||0, b=+it.buy||0
    const pct=b>0&&r>0?Math.round((r-b)/b*100):null
    const o=prev?.rates?.[key], diff=o&&r?r-(+o):null, dp=o&&+o?Math.round(diff/(+o)*100):null
    return `<tr>
      <td style="padding-left:10px">${esc(it.name)}</td>
      <td style="color:var(--muted)">${esc(it.unit)}</td>
      <td><input class="cell r num" inputmode="decimal" value="${card.rates[key]}"
          oninput="window._setRate('${cl.id}',${ci},'${key.replace(/'/g,"\\'")}',this.value)"></td>
      ${prev?(o==null||!+o?'<td class="r" style="color:#C4BFB4;padding-right:12px">new</td>':'<td class="r num" style="padding-right:12px;color:var(--muted)">'+money0(o)+(dp?(' <span style="color:'+(dp>0?'var(--leaf)':'var(--red)')+';font-weight:600">'+(dp>0?'+':'')+dp+'%</span>'):'')+'</td>'):''}
      <td class="r num" style="padding-right:12px;color:var(--muted)">${b?money0(b):'—'}</td>
      <td class="r num" style="font-weight:600;padding-right:12px;color:${pct==null?'var(--muted)':pct<0?'var(--red)':'var(--leaf)'}">${pct==null?'—':pct+'%'}</td>
      <td><button class="del" onclick="window._dropFromCard('${cl.id}',${ci},'${key.replace(/'/g,"\\'")}')">×</button></td>
    </tr>`}).join('')}
  </tbody></table>`:`<div class="empty"><b>No rates yet</b>Add items above, or use + All Category buttons.</div>`}
  </div>`
}

// ─── HISTORY TAB ─────────────────────────────────────────────────────────────
export function histView(){
  if(!S.bills.length)return`<div class="panel"><div class="empty"><b>No bills yet</b>Save a bill on the Bill tab.</div></div>`
  const rev=Math.round(S.bills.reduce((a,b)=>a+b.total,0))
  const prof=Math.round(S.bills.reduce((a,b)=>a+(b.profit||0),0))
  const m=new Date().toISOString().slice(0,7)
  const mb=S.bills.filter(b=>String(b.date).slice(0,7)===m)
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:18px">
    <div class="stat"><span>Bills</span><b>${S.bills.length}</b></div>
    <div class="stat"><span>Total billed</span><b>${money0(rev)}</b></div>
    <div class="stat"><span>Total profit</span><b style="color:var(--leaf)">${money0(prof)}</b></div>
    <div class="stat"><span>This month</span><b>${money0(mb.reduce((a,b)=>a+b.total,0))}</b></div>
  </div>
  <div class="panel"><table class="grid"><thead><tr>
    <th style="width:110px">Bill no.</th><th style="width:120px">Date</th>
    <th>Customer</th><th class="r" style="width:60px">Items</th>
    <th class="r" style="width:110px">Total</th><th class="r" style="width:100px">Profit</th>
    <th style="width:50px"></th></tr></thead><tbody>
  ${S.bills.map((b,i)=>`<tr class="hrow" onclick="window._loadBill(${i})">
    <td style="padding-left:10px"><span class="pill">${esc(b.no)}</span></td>
    <td style="color:var(--muted)">${dmy(b.date)}</td>
    <td>${esc(b.customer)}</td>
    <td class="r num">${b.lines.length}</td>
    <td class="r num" style="font-weight:600">${money0(b.total)}</td>
    <td class="r num" style="color:var(--leaf);font-weight:600">${money0(b.profit||0)}</td>
    <td style="white-space:nowrap">
      <button class="del" title="Print" onclick="event.stopPropagation();window._printBill(${i})" style="font-size:13px">⎙</button>
      <button class="del" onclick="event.stopPropagation();window._delBill(${i})">×</button></td>
  </tr>`).join('')}</tbody></table>
  <p class="hint">Tap any row to load it back into the Bill tab to reprint or edit.</p></div>`
}

// ─── ORDERS TAB (storefront / WhatsApp / admin-entered) ─────────────────────
const ORDER_STATUSES=['pending','confirmed','packed','out_for_delivery','delivered','cancelled']
const STATUS_LABEL={pending:'Order placed',confirmed:'Confirmed',packed:'Packed',out_for_delivery:'Out for delivery',delivered:'Delivered',cancelled:'Cancelled'}
export function ordersView(){
  const list=S.orders
    .filter(o=>!oStatus||o.status===oStatus)
    .filter(o=>!oQ||(o.order_no+' '+(o.customer?.full_name||'')+' '+(o.contact_phone||'')).toLowerCase().includes(oQ.toLowerCase()))
  const counts={}; ORDER_STATUSES.forEach(s=>counts[s]=S.orders.filter(o=>o.status===s).length)
  return `<div class="panel">
  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
    <h2 style="font-family:'Fraunces',serif;font-weight:600;font-size:19px;margin:0">Orders</h2>
    <input class="search" placeholder="Search order no. / customer / phone…" value="${esc(oQ)}"
      style="margin-left:auto" oninput="window._setOQ(this.value)">
  </div>
  <div class="periods">
    <button class="chip ${!oStatus?'on':''}" onclick="window._setOStatus('')">All<i>${S.orders.length}</i></button>
    ${ORDER_STATUSES.map(s=>`<button class="chip ${oStatus===s?'on':''}" onclick="window._setOStatus('${s}')">${STATUS_LABEL[s]}<i>${counts[s]}</i></button>`).join('')}
  </div>
  ${!list.length?`<div class="empty"><b>No orders</b>${S.orders.length?'No orders match this filter.':'Orders placed from the storefront or entered from WhatsApp will show up here.'}</div>`:
  `<table class="grid"><thead><tr>
    <th style="width:110px">Order</th><th style="width:110px">Placed</th>
    <th>Customer</th><th class="r" style="width:60px">Items</th>
    <th class="r" style="width:100px">Total</th><th style="width:100px">Payment</th>
    <th style="width:190px">Status</th></tr></thead><tbody>
  ${list.map(o=>`<tr>
    <td style="padding-left:10px"><span class="pill">${esc(o.order_no)}</span>${o.source!=='storefront'?`<div style="font-size:11px;color:var(--muted)">${esc(o.source)}</div>`:''}</td>
    <td style="color:var(--muted);font-size:13px">${dmy(o.placed_at)}</td>
    <td>${esc(o.customer?.full_name||o.contact_name||'—')}<div style="font-size:12px;color:var(--muted)">${esc(o.contact_phone||'')}</div></td>
    <td class="r num">${o.lines.length}</td>
    <td class="r num" style="font-weight:600">${money0(o.total)}</td>
    <td style="font-size:12.5px">${o.payment_method==='online'?'Online':'COD'}<div style="color:${o.payment_status==='paid'?'var(--leaf)':'var(--muted)'}">${esc(o.payment_status)}</div></td>
    <td><select class="inp" style="padding:6px 8px" onchange="window._setOrderStatus('${o.id}',this.value)">
      ${ORDER_STATUSES.map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${STATUS_LABEL[s]}</option>`).join('')}
    </select></td>
  </tr>`).join('')}</tbody></table>`}
  <p class="hint">Changing status here emails and WhatsApps the customer automatically (once those are configured).</p>
  </div>`
}

// ─── CUSTOMERS TAB (self sign-up + CSM-managed accounts) ────────────────────
export function customersView(){
  if(custOpen) return customerDetail()
  const list=S.customers.filter(c=>!custQ||(c.full_name+' '+c.phone+' '+c.email).toLowerCase().includes(custQ.toLowerCase()))
  return `<div class="panel">
  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
    <h2 style="font-family:'Fraunces',serif;font-weight:600;font-size:19px;margin:0">Customers</h2>
    <input class="search" placeholder="Search customers…" value="${esc(custQ)}" oninput="window._setCustQ(this.value)">
    <button class="btn pri" style="margin-left:auto" onclick="window._setCsmForm(true)">+ New CSM login</button>
  </div>
  ${csmForm?csmFormHtml():''}
  ${!list.length?`<div class="empty"><b>No customers yet</b>Self sign-ups from the storefront, and CSM-issued logins you create, both show up here.</div>`:
  `<table class="grid"><thead><tr>
    <th>Name</th><th style="width:150px">Phone</th><th style="width:100px">Type</th>
    <th style="width:160px">Linked client</th><th style="width:34px"></th></tr></thead><tbody>
  ${list.map(c=>`<tr class="hrow" onclick="window._openCustomer('${c.id}')">
    <td style="padding-left:10px;font-weight:600">${esc(c.full_name)}<div style="font-weight:400;color:var(--muted);font-size:12.5px">${esc(c.email)}</div></td>
    <td>${esc(c.phone)}</td>
    <td><span class="pill" style="background:${c.type==='csm'?'var(--leaf-soft)':'#F2F0E9'}">${c.type==='csm'?'CSM':'Walk-in'}</span></td>
    <td>${esc(S.clients.find(cl=>cl.id===c.client_id)?.name||'—')}</td>
    <td>${c.active===false?'<span style="color:var(--red);font-size:12px">inactive</span>':''}</td>
  </tr>`).join('')}</tbody></table>`}
  </div>`
}
function csmFormHtml(){
  return `<div class="panel" style="background:#fff;margin-bottom:14px">
  <h3 style="font-size:14px;font-weight:600;margin-bottom:10px">Create a CSM-managed login</h3>
  <div class="meta" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
    <label class="f"><span>Full name</span><input class="inp" id="csmName"></label>
    <label class="f"><span>Business name</span><input class="inp" id="csmBiz"></label>
    <label class="f"><span>Phone</span><input class="inp" id="csmPhone"></label>
    <label class="f"><span>Email (login)</span><input class="inp" type="email" id="csmEmail"></label>
    <label class="f"><span>Temporary password</span><input class="inp" id="csmPw" placeholder="min 6 characters"></label>
    <label class="f"><span>Link to existing client (optional)</span>
      <select class="inp" id="csmClient"><option value="">— none —</option>
        ${S.clients.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}
      </select></label>
  </div>
  <div style="display:flex;gap:8px">
    <button class="btn" onclick="window._setCsmForm(false)">Cancel</button>
    <button class="btn pri" onclick="window._createCsmCustomer()">Create login</button>
  </div>
  </div>`
}
function customerDetail(){
  const c=S.customers.find(x=>x.id===custOpen)
  if(!c){custOpen=null;return customersView()}
  return `<div class="panel">
  <button class="btn" onclick="window._closeCustomer()">← All customers</button>
  <h2 style="font-family:'Fraunces',serif;font-weight:600;font-size:20px;margin:10px 0 4px">${esc(c.full_name)}</h2>
  <p class="hint" style="margin-bottom:14px">${esc(c.email)} · ${esc(c.phone)} · ${c.type==='csm'?'CSM-managed':'Self sign-up'}</p>
  <div class="meta" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
    <label class="f"><span>Linked client (contracted rate card)</span>
      <select class="inp" onchange="window._linkCustomer('${c.id}',this.value)">
        <option value="">— none / walk-in pricing —</option>
        ${S.clients.map(cl=>`<option value="${cl.id}" ${cl.id===c.client_id?'selected':''}>${esc(cl.name)}</option>`).join('')}
      </select></label>
    <label class="f"><span>Account status</span>
      <select class="inp" onchange="window._setCustActive('${c.id}',this.value==='1')">
        <option value="1" ${c.active!==false?'selected':''}>Active</option>
        <option value="0" ${c.active===false?'selected':''}>Inactive</option>
      </select></label>
  </div>
  <h3 style="font-size:14px;font-weight:600;margin:16px 0 8px">Address book</h3>
  <div id="custAddrList" style="display:flex;flex-direction:column;gap:8px">${custAddrs.map(a=>`
    <div class="addr-card-admin" style="border:1px solid var(--line);border-radius:10px;padding:10px 12px">
      <b>${esc(a.label)}</b> <span style="color:var(--muted);font-size:12px">${esc(a.area)}</span>
      <div style="font-size:13px;color:var(--muted)">${esc(a.line1)}${a.line2?', '+esc(a.line2):''}, ${esc(a.city)} ${esc(a.pincode)} · ${esc(a.phone)}</div>
      <button class="del" onclick="window._deleteCustAddr('${a.id}')" style="margin-top:4px">Delete</button>
    </div>`).join('')||'<p class="hint">No saved addresses yet.</p>'}</div>
  <button class="btn" style="margin-top:10px" onclick="window._newCustAddrForm()">+ Add address</button>
  <div id="custAddrForm"></div>
  </div>`
}

// ─── SETUP TAB ───────────────────────────────────────────────────────────────
export function setupView(){
  const s=S.settings
  return `<div class="panel" style="max-width:560px">
  <h2 style="font-family:'Fraunces',serif;font-weight:600;font-size:19px;margin:0 0 4px">Business details</h2>
  <p style="color:var(--muted);font-size:14px;margin:0 0 18px">These print at the top of every bill.</p>
  <div class="meta" style="grid-template-columns:1fr 1fr">
    <label class="f" style="grid-column:1/-1"><span>Business name</span><input class="inp" value="${esc(s.biz)}"
      oninput="window._setSetting('biz',this.value)"></label>
    <label class="f" style="grid-column:1/-1"><span>Address</span><input class="inp" value="${esc(s.addr)}"
      oninput="window._setSetting('addr',this.value)"></label>
    <label class="f"><span>Phone</span><input class="inp" value="${esc(s.phone)}"
      oninput="window._setSetting('phone',this.value)"></label>
    <label class="f"><span>GSTIN</span><input class="inp" value="${esc(s.gstin)}"
      oninput="window._setSetting('gstin',this.value)"></label>
    <label class="f"><span>Bill prefix</span><input class="inp" value="${esc(s.prefix)}"
      oninput="window._setSetting('prefix',this.value)"></label>
    <label class="f"><span>Next bill number</span><input class="inp num" type="number" value="${S.nextNo}"
      oninput="window._setNextNo(+this.value)"></label>
    <label class="f" style="grid-column:1/-1"><span>Footer note</span><input class="inp" value="${esc(s.terms)}"
      oninput="window._setSetting('terms',this.value)"></label>
  </div>
  <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
    <button class="btn" onclick="window._exportCSV()">Download bills CSV</button>
    <button class="btn" onclick="window._doSignOut()">Sign out</button>
  </div>
  <p class="hint">All changes save to Supabase automatically.</p>
  </div>`
}

// ─── PRINT helpers ───────────────────────────────────────────────────────────
export function buildBillPrint(draft, totals){
  const s=S.settings, ls=draft.lines.filter(l=>l.name.trim()&&+l.qty>0)
  document.getElementById('print').innerHTML=`<div class="doc">
  <div class="ptop">
    <div><div class="pbiz">${esc(s.biz||'')}</div>
      <div>${[esc(s.addr),esc(s.phone),s.gstin?'GSTIN: '+esc(s.gstin):''].filter(Boolean).join('<br>')}</div></div>
    <div style="text-align:right;font-size:11px">No. ${esc(draft.no)}<br>${dmy(draft.date)}</div>
  </div>
  <div class="pwho"><div><b>To:</b> ${esc(draft.customer||'Cash')}${draft.phone?' · '+esc(draft.phone):''}</div><div>${ls.length} items</div></div>
  <table class="ptable"><thead><tr><th>#</th><th>Description</th><th>Unit</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
  <tbody>${ls.map((l,i)=>`<tr><td>${i+1}</td><td>${esc(l.name)}</td><td>${esc(l.unit)}</td><td class="r">${+l.qty}</td><td class="r">${money_fmt(l.rate)}</td><td class="r">${money_fmt(l.qty*l.rate)}</td></tr>`).join('')}</tbody>
  <tfoot>
    <tr><td colspan="4"></td><td class="r">Subtotal</td><td class="r">${money_fmt(totals.sub)}</td></tr>
    ${totals.gst?`<tr><td colspan="4"></td><td class="r">GST ${draft.gst}%</td><td class="r">${money_fmt(totals.gst)}</td></tr>`:''}
    ${totals.disc?`<tr><td colspan="4"></td><td class="r">Less</td><td class="r">−${money_fmt(totals.disc)}</td></tr>`:''}
    <tr class="ptotal"><td colspan="4"></td><td class="r">Total</td><td class="r">${money0(totals.total)}</td></tr>
  </tfoot></table>
  <div style="font-size:11px;margin-top:8px"><b>In words:</b> ${inWords(totals.total)}</div>
  <div class="pfoot"><div>${esc(s.terms||'')}</div><div class="psign">For ${esc(s.biz||'')}</div></div>
  </div>`
}
export function buildCardPrint(clientId, ci){
  const cl=S.clients.find(c=>c.id===clientId); if(!cl)return
  const card=cl.cards[ci]||activeCard(cl)
  const keys=Object.keys(card.rates||{}).filter(k=>card.rates[k]!==''&&card.rates[k]!=null)
  const rows=keys.map(k=>{const it=S.items.find(x=>x.name.toLowerCase()===k)
    return{name:it?it.name:k,unit:it?it.unit:'',cat:it?(it.cat||'Other'):'Other',rate:+card.rates[k]}})
    .sort((a,b)=>(CATS.indexOf(a.cat)-CATS.indexOf(b.cat))||a.name.localeCompare(b.name))
  let last=''
  document.getElementById('print').innerHTML=`<div class="doc">
  <div class="ptop"><div><div class="pbiz">${esc(S.settings.biz||'')}</div></div>
    <div style="text-align:right;font-size:11px">Price list for ${esc(cl.name)}<br>${dmy(card.from)} – ${dmy(card.to)}</div></div>
  <table class="ptable"><thead><tr><th>#</th><th>Item</th><th>Unit</th><th class="r">Rate</th></tr></thead><tbody>
  ${rows.map((r,i)=>{const h=(r.cat!==last)?`<tr><td colspan="4" style="font-weight:700;padding-top:9px;border-bottom:1.2px solid #000">${esc(r.cat)}</td></tr>`:'';last=r.cat;return h+`<tr><td>${i+1}</td><td>${esc(r.name)}</td><td>${esc(r.unit)}</td><td class="r">${money_fmt(r.rate)}</td></tr>`}).join('')}
  </tbody></table>
  <div class="pfoot"><div>Prices held to ${dmy(card.to)}.</div><div class="psign">For ${esc(S.settings.biz||'')}</div></div></div>`
}
export function cardTextWA(clientId, ci){
  const cl=S.clients.find(c=>c.id===clientId); const card=cl?.cards[ci]||activeCard(cl)
  const keys=Object.keys(card?.rates||{}).filter(k=>card.rates[k]!==''&&card.rates[k]!=null)
  const rows=keys.map(k=>{const it=S.items.find(x=>x.name.toLowerCase()===k);return(it?it.name:k)+' — '+money0(card.rates[k])+'/'+(it?it.unit:'KG')}).sort()
  return [S.settings.biz,'Price list for '+cl.name,dmy(card.from)+' to '+dmy(card.to),'',...rows,'',S.settings.phone].filter(Boolean).join('\n')
}
export function buyListTextWA(d){
  const rows=S.items.map(it=>({it,e:buyOnDate(it,d)})).filter(x=>x.e&&+x.e.r>0).map(x=>x.it.name+' — '+money0(x.e.r)+'/'+x.it.unit).sort()
  return [S.settings.biz+' · buying rates',dmy(d),'',...rows].join('\n')
}
