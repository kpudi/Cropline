// WhatsApp order list parser
/* ============ WhatsApp order list parser ============ */
const ALIAS={
  mashroom:'mushroom',mushrom:'mushroom',mushrooms:'mushroom',mashrooms:'mushroom',
  lamon:'lemon',lemn:'lemon',nimbu:'lemon',limbu:'lemon',lime:'lemon',
  garlick:'garlic',garlik:'garlic',lehsun:'garlic',lasun:'garlic',
  bellpaper:'capsicum',bellpepper:'capsicum',bellpepers:'capsicum',bell:'capsicum',pepper:'capsicum',
  capsicum:'capsicum',shimla:'capsicum',
  besli:'basil',bazil:'basil',basils:'basil',
  icbarg:'iceberg',iceburg:'iceberg',iceberge:'iceberg',
  ladyfinger:'lady finger',bhindi:'lady finger',okra:'lady finger',bhendi:'lady finger',
  dhania:'coriander',kothmir:'coriander',cilantro:'coriander',corriander:'coriander',coriender:'coriander',
  pudina:'mint',podina:'mint',
  adrak:'ginger',ginger:'ginger',
  aloo:'potato',alu:'potato',batata:'potato',potatoes:'potato',
  pyaz:'onion',piyaz:'onion',kanda:'onion',onions:'onion',
  tamatar:'tomato',tamater:'tomato',tomatoes:'tomato',tomatos:'tomato',
  gobi:'cauliflower',gobhi:'cauliflower',cauli:'cauliflower',califlower:'cauliflower',
  cauliflour:'cauliflower',phoolgobi:'cauliflower',
  palak:'spinach',palaak:'spinach',
  gajar:'carrot',carrots:'carrot',
  mirchi:'chilli',mirch:'chilli',chili:'chilli',chily:'chilli',chilly:'chilli',chillies:'chilli',
  chillis:'chilli',chilie:'chilli',
  kheera:'cucumber',khira:'cucumber',cucumbers:'cucumber',
  matar:'peas',mutter:'peas',pea:'peas',
  baingan:'brinjal',bengan:'brinjal',eggplant:'brinjal',aubergine:'brinjal',
  lauki:'bottle gourd',doodhi:'bottle gourd',
  karela:'bitter gourd',
  turai:'turi',tori:'turi',ridge:'turi',
  parwal:'parval',
  makai:'corn',bhutta:'corn',sweetcorn:'sweet corn',
  patta:'cabbage',cabage:'cabbage',
  beetroot:'beetroot',chukandar:'beetroot',
  nariyal:'coconut',
  kaddu:'pumpkin',
  methi:'fenugreek',
  spring:'spring',onion:'onion',
  brocoli:'broccoli',brocolli:'broccoli',
  zucchni:'zucchini',zuccini:'zucchini',jucchini:'zucchini',
  bok:'bok',choy:'choy',
  celary:'celery',selery:'celery',
  parsly:'parsley',parselly:'parsley',
  leafs:'leaf',leaves:'leaf',leves:'leaf',
  green:'green',greens:'green',
  bean:'beans',
  papaya:'papaya',papya:'papaya',
  pineaple:'pineapple',anannas:'pineapple',ananas:'pineapple',
  avacado:'avocado',avocardo:'avocado',
  bannana:'banana',banan:'banana',
  peeled:'peeled',pealed:'peeled',peel:'peeled',
  hole:'whole',
  big:'big',small:'small',baby:'baby',fresh:'fresh',
};
const NOISE=new Set(['pls','please','plz','need','send','required','req','and','of','the','ka','kg','for','tomorrow','today','morning','order','item','items']);

const UNITS={
  kg:['kg','kgs','kilo','kilos','kilogram','kilograms','k'],
  gm:['g','gm','gms','gram','grams','grm'],
  pc:['nos','no','nug','pc','pcs','piece','pieces','pcs.','count'],
  pack:['pack','packs','pkt','pkts','pk','packet','packets','punnet'],
  bunch:['bunch','bunches','bdl','bundle','gucha'],
  box:['box','boxes','crate','crates','tray'],
  l:['l','ltr','ltrs','litre','litres','liter','liters','lt'],
  doz:['doz','dozen','dz'],
};
const UNITWORD={};
for(const k in UNITS) UNITS[k].forEach(w=>UNITWORD[w]=k);
const UNITOUT={kg:'KG',gm:'GM',pc:'PC',pack:'PACK',bunch:'BUNCH',box:'BOX',l:'L',doz:'DOZ'};
const allUnitWords=Object.keys(UNITWORD).sort((a,b)=>b.length-a.length).map(w=>w.replace('.','\\.')).join('|');

const FRACT={'½':0.5,'¼':0.25,'¾':0.75};

function normTokens(s){
  return s.toLowerCase()
    .replace(/[^a-z0-9\s]/g,' ')
    .split(/\s+/).filter(Boolean)
    .map(w=>ALIAS[w]||w)
    .flatMap(w=>w.split(' '))
    .filter(w=>w.length>1&&!NOISE.has(w));
}
function bigrams(s){const t=' '+s.replace(/[^a-z0-9]/g,'')+' ';const o=[];
  for(let i=0;i<t.length-1;i++)o.push(t.slice(i,i+2));return o}
function dice(a,b){
  const A=bigrams(a),B=bigrams(b);if(!A.length||!B.length)return 0;
  const m={};A.forEach(x=>m[x]=(m[x]||0)+1);let hit=0;
  B.forEach(x=>{if(m[x]>0){m[x]--;hit++}});
  return 2*hit/(A.length+B.length);
}
function tokenScore(a,b){
  if(!a.length||!b.length)return 0;
  let hit=0;
  a.forEach(t=>{ if(b.some(u=>u===t||(t.length>3&&u.length>3&&dice(t,u)>0.72))) hit++; });
  const p=hit/a.length, r=hit/b.length;
  return p+r?2*p*r/(p+r):0;
}
function matchItem(name,items){
  const at=normTokens(name), aj=at.join('');
  let best=null,bs=0;
  items.forEach((it,i)=>{
    const bt=normTokens(it.name);
    const s=0.62*tokenScore(at,bt)+0.38*dice(aj,bt.join(''));
    if(s>bs){bs=s;best=i}
  });
  return {idx:best,score:+bs.toFixed(3)};
}

function parseLine(raw,items){
  let s=String(raw).replace(/[\u2013\u2014\u2012]/g,'-').replace(/\u00a0/g,' ').trim();
  if(!s)return null;
  s=s.replace(/^\s*\d{1,2}\s*[.)]\s+(?=[a-zA-Z])/,'');      // "1. Onion"
  s=s.replace(/^[\-–•*>+]+\s*/,'');                          // bullets
  if(/^(total|order|good\s*(morning|evening)|hi|hello|thanks|thank you|ok|okay|date)\b/i.test(s))return null;
  if(!/[a-zA-Z]/.test(s))return null;

  for(const f in FRACT){                       // 1½ -> 1.5 ,  ½ -> 0.5
    s=s.replace(new RegExp('(\\d)\\s*'+f,'g'),(m,d)=>String(+d+FRACT[f]));
    s=s.replace(new RegExp(f,'g'),String(FRACT[f]));
  }
  s=s.replace(/\b(half|aadha)\b/gi,'0.5').replace(/\bquarter\b/gi,'0.25');
  s=s.replace(/(\d)\s*\/\s*(\d)/g,(m,a,b)=>String(+a/+b));   // 1/2 -> 0.5

  const re=new RegExp('(\\d+(?:\\.\\d+)?)\\s*('+allUnitWords+')?(?![a-z])','gi');
  let m,last=null;
  while((m=re.exec(s))!==null) last=m;
  if(!last)return null;

  let qty=parseFloat(last[1]);
  let uw=(last[2]||'').toLowerCase().replace('.','');
  let unit=uw?UNITWORD[uw]:null;

  let name=(s.slice(0,last.index)+' '+s.slice(last.index+last[0].length))
    .replace(/[.\-–—:;,_=]+/g,' ').replace(/\s+/g,' ').trim();
  if(!name)return null;

  const {idx,score}=matchItem(name,items);
  const it=idx!=null?items[idx]:null;

  // unit reconciliation
  let outUnit;
  if(!unit) outUnit = it?it.unit:'KG';
  else if(unit==='gm'&&it&&it.unit==='KG'){ qty=+(qty/1000).toFixed(3); outUnit='KG'; }
  else if(unit==='kg'&&it&&it.unit==='GM'){ qty=qty*1000; outUnit='GM'; }
  else outUnit=UNITOUT[unit];

  return {raw:String(raw).trim(),name,qty,unit:outUnit,idx,score,
    matched:it?it.name:null, rate:it?it.sell:0, buy:it?it.buy:0};
}
function parseList(text,items){
  return String(text).split(/\r?\n/).map(l=>parseLine(l,items)).filter(Boolean);
}

export {parseList,parseLine,matchItem};
