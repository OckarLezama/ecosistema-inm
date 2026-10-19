/* ==================================================================
   IA-NAMI · INFORMES › ARMA TU INFORME
   Buscas o tocas un concepto y la lámina sale armada con el mismo motor
   que Pregunta a INAMI (js/consulta.js). La ajustas tocándola (periodo,
   comparación, país, estado, punto, quitar piezas) y la sumas a «Mi
   informe»: portada automática, láminas y narrativa de cierre, para
   presentar, bajar en PDF, mandar por WhatsApp o compartir con liga.
   ÍNDICE  [1] UTILIDADES  [2] CONCEPTOS  [3] PERIODOS  [4] LÁMINA
           [5] PALABRAS DE COLOR  [6] BUSCADOR  [7] MI INFORME Y VISOR
           [8] PDF, WHATSAPP Y LIGA  [9] PÁGINA Y ARRANQUE
   ================================================================== */
(function(){
'use strict';
const M = window.IANAMI_MOTOR; if (!M) return;
const { BASES, INDK, total, porDim, serie, cubetas, finBase, entender } = M;

/* ==== [1] UTILIDADES ============================================== */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const f = v => Math.round(v).toLocaleString('en-US');
const pc = r => Math.abs(r)<0.01 ? Math.abs(r*100).toFixed(1) : Math.abs(Math.round(r*100));
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const cp = x => JSON.parse(JSON.stringify(x));
const DAY = 864e5, f0 = s => new Date(s+'T00:00:00Z'), iso = d => new Date(d).toISOString().slice(0,10);
const suma = (s, n) => iso(f0(s).getTime()+n*DAY), dif = (a, b) => Math.round((f0(b)-f0(a))/DAY);
const MS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'], ML = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const fd = s => { const d = f0(s); return d.getUTCDate()+' '+MS[d.getUTCMonth()]+' '+d.getUTCFullYear(); };
const rango = (a, b) => a.slice(0,4)===b.slice(0,4) ? f0(a).getUTCDate()+' '+MS[f0(a).getUTCMonth()]+' – '+fd(b) : fd(a)+' – '+fd(b);
const TIP = { confine:true, backgroundColor:'#2B2926', borderWidth:0, textStyle:{ color:'#fff', fontSize:12.5, fontFamily:'Barlow' } };
const AX = { axisLabel:{ fontSize:10.5, color:'#8A857A' }, axisTick:{ show:false }, axisLine:{ lineStyle:{ color:'#D9D3C6' } } };
const cuad = op => window.IANAMI_CUAD ? window.IANAMI_CUAD(op) : op;
function mk(el, op){ if (!el || !window.echarts) return null; let c = echarts.getInstanceByDom(el) || echarts.init(el, null, { renderer:'svg' });
  op.textStyle = { fontFamily:'Barlow' }; op.animationDuration = 700; op.animationDurationUpdate = 500; c.setOption(cuad(op), true); return c; }
let tToast; function toast(m){ const t = $('ar-toast'); if (!t) return; t.textContent = m; t.classList.add('on'); clearTimeout(tToast); tToast = setTimeout(() => t.classList.remove('on'), 2800); }

/* ==== [2] CONCEPTOS =============================================== */
// A = «¿quién / de dónde?», B = «¿dónde / qué?»; cada lado puede tener varias dimensiones (punto | estado). V = vía para el KPI.
const CONC = [
  ['ing','Control','Ingresos','entradas',['n'],['p','e'],'via'], ['ingmx','Control','Mexicanos que ingresaron','entradas',['p','e'],['via']],
  ['seg','Control','Segunda revisión','casos',['n'],['p','e']], ['rech','Control','Rechazos','rechazos',['n'],['p','e']],
  ['tram','Regulación','Trámites','trámites',['n'],['tipo','doc','e']], ['va','Regulación','Validación de actas','solicitudes',['n'],['tr','e']],
  ['resc','Control','Rescatados','rescates (eventos)',['n'],['e']], ['rep','Protección','Repatriados','repatriados',['p','e'],['mod']],
  ['nna','Control','NNA canalizados','niñas, niños y adolescentes',['n'],['e']], ['pres','Control','Presentados','presentados',['n'],['e','est']],
  ['ret','Control','Retornados','retornados',['n'],['e']], ['cbp','Desde EE. UU.','Encuentros CBP','encuentros',['n'],['sec']],
  ['rec','Desde EE. UU.','Recibidos de EE. UU.','recibidos',['n'],['e']]
].filter(c => INDK[c[0]] && BASES[INDK[c[0]].b]).map(c => ({ k:c[0], area:c[1], t:c[2], u:c[3], A:c[4].filter(d => BASES[INDK[c[0]].b].dims[d]), B:c[5].filter(d => BASES[INDK[c[0]].b].dims[d]), V:c[6] && BASES[INDK[c[0]].b].dims[c[6]] ? c[6] : null }));
const CK = Object.fromEntries(CONC.map(c => [c.k, c]));
const COLA = { Control:['#2F6657','#E3EEE9'], Protección:['#7E302B','#F5E4E1'], Regulación:['#8F7F2E','#F3EEDB'], 'Desde EE. UU.':['#4A463F','#ECE9E2'] };
const base = k => BASES[INDK[k].b], finK = k => finBase(base(k)), iniK = k => base(k).inicio;
const esOR = (k, d) => d==='e' && /O\.R\./.test(base(k).dims.e.nom);
function DIM(k, d){ const rep = k==='rep' || k==='ingmx';
  return ({ n:{ w:'de', all:'todas las nacionalidades', tit:'¿De dónde son?', tipo:'país', ic:'glo' },
    p:{ w:'por', all:'todos los puntos', tit:rep ? '¿Por dónde '+(k==='rep' ? 'regresan' : 'entran')+'?' : k==='rech' || k==='seg' ? '¿En qué punto?' : '¿Por dónde entran?', tipo:'punto', ic:'pin', sub:'aeropuertos agrupados' },
    e:esOR(k, d) ? { w:'en', all:'todas las O.R. (estados)', tit:'¿En qué O.R. (estado)?', tipo:'O.R.', ic:'pin' } : { w:'en', all:'todos los estados', tit:'¿A qué estado?', tipo:'estado', ic:'pin' },
    via:{ w:'vía', all:'todas las vías', tit:'¿Por qué vía de internación?', tipo:'vía', ic:'via' }, mod:{ w:'vía', all:'todas las vías', tit:'¿Cómo regresan?', tipo:'vía', ic:'via' },
    sec:{ w:'en', all:'todos los sectores', tit:'¿En qué sector?', tipo:'sector', ic:'pin' }, est:{ w:'en', all:'todas las estaciones', tit:'¿En qué estación?', tipo:'estación', ic:'pin' },
    tipo:{ w:'de', all:'todos los trámites', tit:'¿Qué trámite?', tipo:'trámite', ic:'doc' }, doc:{ w:'de', all:'todos los documentos', tit:'¿Qué documento?', tipo:'documento', ic:'doc' },
    tr:{ w:'de', all:'todos los trámites', tit:'¿Qué trámite?', tipo:'trámite', ic:'doc' } })[d] || { w:'por', all:'todos', tit:base(k).dims[d].nom, tipo:base(k).dims[d].nom.toLowerCase(), ic:'pin' }; }
// Terminales del mismo aeropuerto se agrupan
const grp = (d, v) => d!=='p' ? v : /^AICM/.test(v) ? 'AICM' : /^Cancún T/.test(v) ? 'Cancún' : /^Los Cabos/.test(v) ? 'Los Cabos' : /^Monterrey T/.test(v) ? 'Monterrey' : /^Guadalajara/.test(v) ? 'Guadalajara' : v;
const IDX = {};
function indices(k, d, nom){ const key = k+'|'+d; if (!IDX[key]){ IDX[key] = {}; base(k).dims[d].vals.forEach((v,i) => { const g = grp(d, v); (IDX[key][g] = IDX[key][g] || []).push(i); }); } return IDX[key][nom] || []; }
const dimA = s => CK[s.k].A[s.iA || 0] || null, dimB = s => CK[s.k].B[s.iB || 0] || null;
function filtros(s, faOver){ const o = {}, a = dimA(s), b = dimB(s), fa = faOver!==undefined ? faOver : s.fa;
  if (a && fa!=null) o[a] = indices(s.k, a, fa); if (b && s.fb!=null) o[b] = indices(s.k, b, s.fb); return o; }
const T_ = (k, a, b, fl) => total({ ind:INDK[k], d0:a, d1:b, filtros:fl || {} });
function porNom(k, d, a, b, fl){ const m = new Map(); porDim({ ind:INDK[k], d0:a, d1:b, filtros:fl || {} }, d).forEach(([i, v]) => { const g = grp(d, base(k).dims[d].vals[i]); m.set(g, (m.get(g) || 0)+v); }); return m; }
function serieK(k, a, b, fl, Cb){ return serie({ ind:INDK[k], d0:a, d1:b, filtros:fl || {} }, Cb); }
const gCub = (a, b) => { const n = dif(a, b)+1; return n<=15 ? 'd' : n<=95 ? 's' : 'm'; };
function cub(a, b){ const C = cubetas(a, b, gCub(a, b)); C.l.forEach((q, i) => { const d = f0(q.a); q.lab = C.g==='m' ? MS[d.getUTCMonth()]+(d.getUTCMonth()===0 || i===0 ? ' '+String(d.getUTCFullYear()).slice(2) : '') : d.getUTCDate()+' '+MS[d.getUTCMonth()]; }); return C; }

/* ==== [3] PERIODOS ================================================ */
function semana(k){ let b = finK(k); while (f0(b).getUTCDay()!==0) b = suma(b, -1); return [suma(b, -6), b]; }
function anios(k){ const l = []; for (let y = +finK(k).slice(0,4); y>=+iniK(k).slice(0,4); y--) l.push(y); return l; }
function meses(k, y){ const fin = finK(k), ini = iniK(k), l = []; for (let m=0;m<12;m++){ const a = y+'-'+String(m+1).padStart(2,'0')+'-01'; if (a>fin) break;
  const e = iso(Date.UTC(y, m+1, 0)); if (e<ini) continue; l.push({ key:'m'+y+String(m+1).padStart(2,'0'), lab:ML[m]+' '+y, a:a<ini ? ini : a, b:e>fin ? fin : e, sub:e>fin ? 'al '+(+fin.slice(8)) : '', y, m }); } return l; }
function PER(k, s){ const fin = finK(k), ini = iniK(k), [sa, sb] = semana(k), o = {}, mx = (x, y) => x>y ? x : y;
  o.sem = { lab:'última semana', a:sa, b:sb, sub:rango(sa, sb) };
  o.sx = { lab:'periodo Sheinbaum', a:mx(ini, '2024-10-01'), b:fin, sub:'desde '+fd(mx(ini, '2024-10-01')) };
  if (ini<='2025-01-20') o.tr = { lab:'periodo Trump', a:'2025-01-20', b:fin, sub:'desde 20 ene 2025' };
  anios(k).forEach(y => { const a = mx(ini, y+'-01-01'), b = (y+'-12-31')>fin ? fin : y+'-12-31'; o['y'+y] = { lab:String(y), a, b, sub:b===fin && y+'-12-31'!==b ? 'al '+fd(b).replace(' '+y,'') : (a!==y+'-01-01' ? 'desde '+fd(a) : '') }; });
  anios(k).forEach(y => meses(k, y).forEach(x => { o[x.key] = x; }));
  if (s && s.p==='cu') o.cu = { lab:rango(s.pa, s.pb), a:s.pa, b:s.pb };
  return o; }
function CMP(k, key, s){ const ini = iniK(k), P = PER(k, s)[key]; if (!P) return []; const L = [], ok = x => x.a>=ini;
  if (key==='sem'){ L.push({ lab:'la semana anterior', a:suma(P.a, -7), b:suma(P.b, -7) }, { lab:'la misma semana del año pasado', a:suma(P.a, -364), b:suma(P.b, -364) }); }
  else if (key==='tr') L.push({ lab:'antes de Trump (desde 1 oct 2024)', a:'2024-10-01', b:'2025-01-19' });
  else if (/^y\d{4}$/.test(key)){ const y = +key.slice(1); L.push({ lab:(y-1)+(P.b.slice(5)!=='12-31' ? ' al mismo día' : ''), a:(y-1)+P.a.slice(4), b:(y-1)+P.b.slice(4) }); }
  else if (/^m\d{6}$/.test(key)){ const y = +key.slice(1,5), m = +key.slice(5)-1; L.push({ lab:ML[m]+' '+(y-1)+(P.sub ? ' al mismo día' : ''), a:(y-1)+P.a.slice(4), b:(y-1)+P.b.slice(4) });
    const pm = m ? { y, m:m-1 } : { y:y-1, m:11 }; L.push({ lab:ML[pm.m]+' '+pm.y+' (mes anterior)', a:pm.y+'-'+String(pm.m+1).padStart(2,'0')+'-01', b:iso(Date.UTC(pm.y, pm.m+1, 0)) }); }
  else if (key==='cu'){ const n = dif(P.a, P.b)+1; L.push({ lab:'el periodo anterior', a:suma(P.a, -n), b:suma(P.a, -1) }, { lab:'el mismo periodo del año pasado', a:suma(P.a, -364), b:suma(P.b, -364) }); }
  return L.filter(ok); }
const nuevo = (k, o) => { const y = 'y'+finK(k).slice(0,4), s = Object.assign({ tipo:'l', k, p:y, fa:null, fb:null, iA:0, iB:0, hide:[] }, o || {}); if (s.cmp===undefined){ const L = CMP(k, s.p, s); s.cmp = L.length ? L[0] : null; } return s; };
function tit(s){ const c = CK[s.k], a = dimA(s), b = dimB(s); let t = c.t; if (s.fa!=null) t += ' '+DIM(s.k, a).w+' '+s.fa; if (s.fb!=null) t += ' '+DIM(s.k, b).w+' '+s.fb; return t; }

/* ==== [4] LÁMINA ================================================== */
const IK = { sum:'<path d="M5 4h10M5 16h10M5 4l6 6-6 6" stroke="currentColor" stroke-width="1.8" fill="none"/>',
  day:'<rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M3 8h14M7 2v4M13 2v4" stroke="currentColor" stroke-width="1.6"/>',
  glo:'<circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M3 10h14M10 3c2.4 2.6 2.4 11.4 0 14M10 3c-2.4 2.6-2.4 11.4 0 14" stroke="currentColor" stroke-width="1.3" fill="none"/>',
  pin:'<path d="M10 18s6-5.5 6-10a6 6 0 0 0-12 0c0 4.5 6 10 6 10z" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="10" cy="8" r="2" fill="currentColor"/>',
  via:'<path d="M3 11l14-6-6 13-2-5z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>',
  doc:'<rect x="4" y="2.5" width="12" height="15" rx="2" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M7 7h6M7 10.5h6M7 14h4" stroke="currentColor" stroke-width="1.6"/>' };
// Íconos de vía, homologados (mismo trazo y tamaño)
const AV = '<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="currentColor"/>';
const IVIA = { 'Aérea':AV, 'Aérea (vuelos PRIM)':AV,
  'Marítima (cruceros)':'<path d="M20 21c-1.4 0-2.8-.5-4-1.3a7 7 0 0 1-8 0c-1.2.8-2.6 1.3-4 1.3H2v2h2c1.4 0 2.7-.4 4-1a8.6 8.6 0 0 0 8 0c1.3.6 2.6 1 4 1h2v-2h-2zM4 19c1.6 0 3-.9 4-2 1 1.1 2.4 2 4 2s3-.9 4-2c1 1.1 2.4 2 4 2l1.9-6.7c.2-.5-.1-1.1-.6-1.3L20 10.6V6a2 2 0 0 0-2-2h-3V1H9v3H6a2 2 0 0 0-2 2v4.6l-1.3.4c-.5.2-.8.8-.6 1.3L4 19zM6 6h12v4L12 8 6 10V6z" fill="currentColor"/>',
  'Terrestre':'<path d="M18.9 6c-.2-.6-.8-1-1.4-1h-11c-.7 0-1.2.4-1.4 1L3 12v8c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-1h12v1c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-8l-2.1-6zM6.5 16a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm11 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM5 11l1.5-4.5h11L19 11H5z" fill="currentColor"/>' };
const chip = r => '<span class="ar-dch '+(Math.abs(r)<0.01 ? 'eq' : r<0 ? 'neg' : 'pos')+'">'+(Math.abs(r)<0.01 ? '≈' : r<0 ? '▼' : '▲')+' '+pc(r)+'%</span>';
const pts = (d, c) => '<span class="ar-pts '+(Math.abs(d)<0.5 ? 'eq' : d<0 ? 'neg' : 'pos')+'" title="'+(Math.abs(d)<0.5 ? 'sin cambio' : (d<0 ? 'bajó ' : 'subió ')+Math.abs(d).toFixed(1)+' puntos porcentuales')+'">'+(Math.abs(d)<0.5 ? '=' : d<0 ? '▼' : '▲')+(c ? '' : ' ')+Math.abs(d).toFixed(Math.abs(d)<10 ? 1 : 0)+(c ? '' : ' pts')+'</span>';
function mspk(y, y2, col){ const v = y.map(z => z || 0), w = 110, h = 46, mx = Math.max(...v, ...(y2 || []).map(z => z || 0), 1), P = a => a.map((z,i) => [(i/(a.length-1 || 1)*w).toFixed(1), (h-4-(z || 0)/mx*(h-10)).toFixed(1)]), p1 = P(v), l = p1[p1.length-1];
  return '<svg class="ar-kch" viewBox="0 0 '+w+' '+h+'">'+(y2 ? '<polyline points="'+P(y2).map(p => p.join(',')).join(' ')+'" fill="none" stroke="#BDB6A6" stroke-width="1.6" stroke-dasharray="3 3"/>' : '')+
    '<polygon points="0,'+h+' '+p1.map(p => p.join(',')).join(' ')+' '+w+','+h+'" fill="'+col+'1f"/><polyline points="'+p1.map(p => p.join(',')).join(' ')+'" fill="none" stroke="'+col+'" stroke-width="2"/><circle cx="'+l[0]+'" cy="'+l[1]+'" r="3.5" fill="#fff" stroke="'+col+'" stroke-width="2"/></svg>'; }
function mbar(y, col){ const v = y.map(z => z || 0), w = 110, h = 46, mx = Math.max(...v, 1), bw = w/v.length, im = v.indexOf(Math.max(...v));
  return '<svg class="ar-kch" viewBox="0 0 '+w+' '+h+'">'+v.map((z,i) => '<rect x="'+(i*bw+1.5).toFixed(1)+'" y="'+(h-z/mx*(h-4)).toFixed(1)+'" width="'+Math.max(1, bw-3).toFixed(1)+'" height="'+(z/mx*(h-4)).toFixed(1)+'" rx="2" fill="'+col+'" opacity="'+(i===im || i===v.length-1 ? 1 : 0.3)+'"/>').join('')+'</svg>'; }
function ring(p, col){ const R = 20, C2 = 2*Math.PI*R; return '<svg class="ar-kch ar-ring" viewBox="0 0 54 54"><circle cx="27" cy="27" r="'+R+'" fill="none" stroke="#EEEAE0" stroke-width="6"/><circle cx="27" cy="27" r="'+R+'" fill="none" stroke="'+col+'" stroke-width="6" stroke-linecap="round" stroke-dasharray="'+(Math.max(p, 0.01)*C2).toFixed(1)+' '+C2+'" transform="rotate(-90 27 27)"/><text x="27" y="31" text-anchor="middle" font-size="11.5" font-weight="700" fill="'+col+'" font-family="Barlow Condensed">'+(p<0.01 ? (p*100).toFixed(1) : Math.round(p*100))+'%</text></svg>'; }
const kc = (ic, lab, val, mid, sub, ch, cls) => '<div class="ar-kc '+(cls || '')+'"><div class="ar-kl"><span class="ar-ki"><svg width="16" height="16" viewBox="0 0 20 20">'+IK[ic]+'</svg></span>'+lab+'</div><div class="ar-kb"><div><b class="ar-kv">'+val+'</b><div class="ar-km">'+(mid || '')+'</div><div class="ar-ksub">'+(sub || '')+'</div></div>'+(ch || '')+'</div></div>';

function render(host, s, inter){
  if (!s){ host.innerHTML = '<div class="ar-vacio"><b>Aquí aparece tu lámina</b><span>Toca un concepto o busca un país, estado, punto u oficina.</span></div>'; return; }
  if (s.tipo==='port') return portada(host, s); if (s.tipo==='nar') return narrativa(host, s);
  const c = CK[s.k], k = s.k, P = PER(k, s)[s.p] || PER(k, s)['y'+finK(k).slice(0,4)], a = P.a, b = P.b, dias = dif(a, b)+1, H = s.hide || [];
  const da = dimA(s), db = dimB(s), cm = s.cmp, cn = cm && cm.fa!=null, ca = cm && !cn ? cm.a : null, cb = cm && !cn ? cm.b : null, cd = cm && !cn ? dif(ca, cb)+1 : dias, porDia = cm && !cn && Math.abs(cd-dias)>1;
  const F = filtros(s), V = T_(k, a, b, F), W = cm ? (cn ? T_(k, a, b, filtros(s, cm.fa)) : T_(k, ca, cb, F)) : null, r = cm && W ? (porDia ? (V/dias)/(W/cd)-1 : V/W-1) : 0;
  const lab2 = cm ? (cn ? cm.fa : cm.lab) : '', tt = tit(s), nm1 = cn ? s.fa : P.lab, DA = da ? DIM(k, da) : null, DB = db ? DIM(k, db) : null;
  const FnoA = filtros(s, null), FnoB = Object.assign({}, F); if (db) delete FnoB[db];
  const mA = da ? porNom(k, da, a, b, Object.assign({}, F, { [da]:[] })) : null, mA2 = da && cm && !cn ? porNom(k, da, ca, cb, Object.assign({}, F, { [da]:[] })) : null;
  const mB = db ? porNom(k, db, a, b, FnoB) : null, mB2 = db && cm ? (cn ? porNom(k, db, a, b, Object.assign(filtros(s, cm.fa), { [db]:[] })) : porNom(k, db, ca, cb, FnoB)) : null;
  const ord = m => [...m.entries()].filter(x => x[1]>0).sort((x, y) => y[1]-x[1]), sm = m => [...m.values()].reduce((x, y) => x+y, 0);
  const Cb = cub(a, b); let C1 = Cb, y1 = serieK(k, a, b, F, Cb), y2 = null, disp = false;
  if (cm){ if (cn) y2 = serieK(k, a, b, filtros(s, cm.fa), Cb);
    else if (porDia){ C1 = cub(ca<a ? ca : a, cb>b ? cb : b); const t1 = serieK(k, a, b, F, C1), t2 = serieK(k, ca, cb, F, C1); y1 = C1.l.map((q,i) => q.b<a || q.a>b ? null : t1[i]); y2 = C1.l.map((q,i) => q.b<ca || q.a>cb ? null : t2[i]); }
    else { const C2 = cub(ca, cb); if (C2.g===Cb.g) y2 = serieK(k, ca, cb, F, C2).slice(0, y1.length); } }
  const ys1 = y1.filter(z => z!=null), ys2 = y2 ? y2.filter(z => z!=null) : null, gl = { d:'por día', s:'por semana', m:'por mes' }[C1.g];
  if (y2 && !porDia && !cn && Math.max(...ys2)>Math.max(...ys1)*3.5) disp = true;
  const mover = (m1, m2) => { if (!m2) return null; const s2 = sm(m2); let best = null; m1.forEach((v, n) => { const o = m2.get(n) || 0; if (n==='Otros' || o<s2*0.02) return; const d = (v/(porDia ? dias : 1))/(o/(porDia ? cd : 1))-1; if (!best || Math.abs(d)>Math.abs(best[1])) best = [n, d]; }); return best; };
  const mvA = mA && mA2 && s.fa==null ? mover(mA, mA2) : null, mvB = mB && mB2 && !cn && s.fb==null ? mover(mB, mB2) : null;
  const tA = mA ? ord(mA)[0] : null, tB = mB ? ord(mB)[0] : null;
  // Frase-conclusión
  let fra;
  if (cn) fra = s.fa+' equivale '+(V>=W ? 'a '+(V/W).toFixed(1)+' veces' : 'al '+(V/W*100<1 ? (V/W*100).toFixed(2) : Math.round(V/W*100))+'% de')+' '+lab2+'.';
  else if (cm && W) fra = tt+': '+(Math.abs(r)<0.01 ? 'prácticamente igual que '+lab2 : (r<0 ? 'bajan ' : 'suben ')+pc(r)+'%'+(porDia ? ' por día' : '')+' contra '+lab2)+(mvA ? '; el mayor cambio es '+mvA[0]+' ('+(mvA[1]<0 ? '' : '+')+Math.round(mvA[1]*100)+'%).' : '.');
  else fra = tA && s.fa==null ? tA[0]+' es el primer lugar con '+Math.round(tA[1]/sm(mA)*100)+' de cada 100'+(tB && s.fb==null ? ' y '+tB[0]+' concentra '+Math.round(tB[1]/sm(mB)*100)+'%' : '')+'.' : tt+': '+f(V)+' '+c.u+' en '+P.lab+'.';
  // con un país (o lo de la izquierda) elegido y comparación: la frase dice si su peso cambió (¿le pasa solo a él o a todos?)
  if (cm && !cn && W && s.fa!=null && mA && mA2){ const t1 = sm(mA), t2 = sm(mA2), p1 = t1 ? (mA.get(s.fa) || 0)/t1*100 : 0, p2 = t2 ? (mA2.get(s.fa) || 0)/t2*100 : 0, dp = p1-p2, ds = p1<10 ? 1 : 0;
    if (t1 && t2) fra = fra.replace(/\.$/, '')+'; '+(Math.abs(dp)<0.15 ? 'su peso en el total no cambia ('+p1.toFixed(ds)+'%): '+(r>=0 ? 'crece' : 'baja')+' al ritmo de todos.' : 'su peso en el total '+(dp>0 ? 'sube' : 'baja')+' de '+p2.toFixed(ds)+'% a '+p1.toFixed(ds)+'%: '+(dp>0 ? (r>=0 ? 'crece más que el resto.' : 'cae menos que el resto.') : (r>=0 ? 'crece menos que el resto.' : 'cae más que el resto.'))); }
  if (s.fra) fra = s.fra;
  // KPI
  const K = [], NK = {}, ref = cm ? lab2.replace(' al mismo día','') : '', nota = INDK[k].nota;
  const kpi = (id, nom, h) => { if (!h || H.includes(id)) { if (h) NK[id] = nom; return; } NK[id] = nom; K.push(inter ? h.replace(/^<div class="ar-kc([^"]*)">/, m => m+'<button class="ar-qz" data-hide="'+id+'" title="Quitar de la lámina">✕</button>') : h); };
  const u = nota ? '<abbr title="'+esc(nota)+'">'+c.u+' ⓘ</abbr>' : c.u;
  kpi('ks', 'Total', kc('sum', 'Total · '+esc(cn ? s.fa : P.lab+(P.sub ? ' ('+P.sub+')' : '')), f(V), cm && W ? chip(V/W-1)+'<span class="ar-dvs">'+(cn ? 'frente a ' : 'que ')+esc(lab2)+'</span>' : '<span class="ar-dvs">'+u+'</span>',
    cm && W ? esc(ref)+': <b>'+f(W)+'</b> · '+(V-W<0 ? '−' : '+')+f(Math.abs(V-W)) : '', mspk(ys1, ys2 && !disp ? ys2 : null, '#2F6657')));
  kpi('kd', 'Promedio por día', kc('day', 'Promedio por día', f(V/dias), cm && W ? chip((V/dias)/(W/cd)-1)+'<span class="ar-dvs">'+(cn ? 'frente a ' : 'que ')+esc(lab2)+'</span>' : '<span class="ar-dvs">máximo '+f(Math.max(...ys1, 0))+' '+gl.replace('por ', 'en un ')+'</span>',
    cm && W ? esc(ref)+': <b>'+f(W/cd)+'</b> por día' : '', mbar(ys1, '#8F7F2E')));
  const share = (m, m2, sel, D_, lado, sel2) => { if (!m) return ''; const o = ord(m), s1 = sm(m); if (!o.length || !s1) return '';
    const pp = p => (p<0.01 ? (p*100).toFixed(2) : Math.round(p*100))+'%';
    if (sel!=null && sel2!=null){ const p = (m.get(sel) || 0)/s1, p2 = (m.get(sel2) || 0)/s1, R2 = o.findIndex(x => x[0]===sel2);
      return kc(D_.ic, esc(sel)+' en el total', pp(p), '<span class="ar-dvs">de todo el '+(c.u==='entradas' ? 'flujo' : 'total')+'</span>'+pts((p-p2)*100), esc(sel2)+': <b>'+pp(p2)+'</b>'+(R2>=0 ? ' · lugar '+(R2+1)+' de '+o.length : ''), ring(p, '#7E302B')); }
    if (sel==null){ const t = o[0], p = t[1]/s1, s2 = m2 ? sm(m2) : 0, p2 = m2 && s2 ? (m2.get(t[0]) || 0)/s2 : null;
      return kc(D_.ic, 'Primer lugar · '+D_.tipo, esc(t[0]), '<span class="ar-dvs"><b>'+Math.round(p*100)+'</b> de cada 100</span>'+(p2!=null ? pts((p-p2)*100) : ''), p2!=null ? 'en '+esc(ref)+' eran '+Math.round(p2*100)+' de cada 100' : '', ring(p, '#7E302B'), 'kn'); }
    const v = m.get(sel) || 0, p = v/s1, R = o.findIndex(x => x[0]===sel), s2 = m2 ? sm(m2) : 0, q2 = m2 && s2 ? (m2.get(sel) || 0)/s2 : null;   // su peso y cuánto cambió contra la comparación
    const otro = lado==='A' ? s.fb : s.fa;   // con la otra dimensión elegida, el total es el de esa (p. ej. India dentro de Cozumel)
    return kc(D_.ic, esc(sel)+(otro!=null ? ' dentro de '+esc(otro) : ' en el total'), pp(p), '<span class="ar-dvs">'+(otro!=null ? 'de todo lo de '+esc(otro) : 'de todo el '+(c.u==='entradas' ? 'flujo' : 'total'))+'</span>'+(q2!=null ? pts((p-q2)*100) : ''), (q2!=null ? 'en '+esc(ref)+' era '+pp(q2)+' · ' : '')+(R>=0 ? 'lugar <b>'+(R+1)+'</b> de '+o.length : ''), ring(p, '#7E302B')); };
  if (da) kpi('ka', s.fa!=null ? s.fa+(s.fb!=null ? ' dentro de '+s.fb : ' en el total') : 'Primer lugar · '+DA.tipo, share(mA, mA2, s.fa, DA, 'A', cn ? cm.fa : null));
  if (db && !(c.V && db===c.V)) kpi('kb', s.fb!=null ? s.fb+(s.fa!=null ? ' dentro de '+s.fa : ' en el total') : 'Primer lugar · '+DB.tipo, share(mB, mB2, s.fb, DB, 'B'));
  let vTxt = '';
  if (c.V && db!==c.V && (s.fb==null || db!=='p')){ const Fv = Object.assign({}, F), mV = porNom(k, c.V, a, b, Fv), mV2 = cm ? (cn ? porNom(k, c.V, a, b, filtros(s, cm.fa)) : porNom(k, c.V, ca, cb, Fv)) : null, tv = sm(mV), tv2 = mV2 ? sm(mV2) : 0, ov = ord(mV);
    if (tv) vTxt = 'Por vía de internación: '+ov.map(([n, v]) => { const p = v/tv*100, p2 = mV2 && tv2 ? (mV2.get(n) || 0)/tv2*100 : null; return esc(n.replace(/ \(.*\)/, '')).toLowerCase()+' <b>'+(p<10 ? p.toFixed(1) : Math.round(p))+'%</b>'+(p2!=null && Math.abs(p-p2)>=0.5 ? ' ('+(p>p2 ? '▲' : '▼')+' '+Math.abs(p-p2).toFixed(1)+' pts)' : ''); }).join(', ')+(mV2 ? ' frente a '+esc(ref) : '')+'.';
    if (tv) kpi('kv', 'Vía de internación', kc('via', '¿Por qué vía de internación?', esc(ov[0][0].replace(' (cruceros)',''))+' '+Math.round(ov[0][1]/tv*100)+'%', '<div class="ar-vrow">'+[...mV.keys()].map(n => { const p = mV.get(n)/tv*100, p2 = mV2 && tv2 ? (mV2.get(n) || 0)/tv2*100 : null;
      return '<span class="ar-vi" title="'+esc(n)+': '+p.toFixed(1)+'% de las entradas'+(p2!=null ? '; en '+esc(ref)+' era '+p2.toFixed(1)+'%' : '')+'"><svg width="16" height="16" viewBox="0 0 24 24">'+(IVIA[n] || AV)+'</svg><i>'+esc(n.replace(/ \(.*\)/, ''))+'</i><b>'+(p<10 ? p.toFixed(1) : Math.round(p))+'%</b>'+(p2!=null ? pts(p-p2, 1) : '')+'</span>'; }).join('')+'</div>', '', '', 'wide')); }
  const show = id => !H.includes(id), x = id => inter ? '<button class="ar-qz" data-hide="'+id+'" title="Quitar de la lámina">✕</button>' : '';
  const tw = show('t'), aw = da && show('a') && s.fa==null, bw = db && show('b') && s.fb==null;   // lo que ya elegiste va como KPI, no como lista
  // si el país (o lo de la izquierda) ya está elegido, su lugar lo toma la otra forma de repartir lo de la derecha (p. ej. India: estados y puntos)
  const dx = !aw && s.fa!=null && s.fb==null && show('x') && c.B.length>1 ? c.B.find(d => d!==db) : null, DX = dx ? DIM(k, dx) : null;
  const segA = inter && c.A.length>1 ? '<span class="ar-sg2">'+c.A.map((d, i) => '<button data-o="iA" data-v="'+i+'" class="'+((s.iA || 0)===i ? 'on' : '')+'">'+DIM(k, d).tipo+'</button>').join('')+'</span>' : '';
  const segB = inter && c.B.length>1 ? '<span class="ar-sg2">'+c.B.map((d, i) => '<button data-o="iB" data-v="'+i+'" class="'+((s.iB || 0)===i ? 'on' : '')+'">'+DIM(k, d).tipo+'</button>').join('')+'</span>' : '';
  const tok = (cls, pop, txt) => '<span class="ar-tk '+cls+'" data-pop="'+pop+'">'+esc(txt)+' <small>▾</small><div class="ar-pop"></div></span>';
  const fr = inter ? '<div class="ar-frase">Ver '+tok('t1', 'k', c.t)+
    (da ? ' '+DA.w+' '+segA+' '+tok(s.fa!=null ? 't2' : 't0', 'fa', s.fa!=null ? s.fa : DA.all) : '')+
    (db ? ' '+DB.w+' '+segB+' '+tok(s.fb!=null ? 't3' : 't0', 'fb', s.fb!=null ? s.fb : DB.all) : '')+
    ' en '+tok('t4', 'p', P.lab)+' '+tok(cm ? 't5' : 't0', 'cmp', cm ? 'contra '+lab2 : '⇄ comparar')+
    '<button class="ar-cerrar" data-close title="Cerrar lámina">✕</button></div>'+
    (H.filter(h => (h!=='a' || (da && s.fa==null)) && (h!=='b' || (db && s.fb==null)) && (h!=='x' || (s.fa!=null && s.fb==null && c.B.length>1)) && (h[0]!=='k' || NK[h])).length ? '<div class="ar-oc">Quitaste: '+H.filter(h => (h!=='a' || (da && s.fa==null)) && (h!=='b' || (db && s.fb==null)) && (h!=='x' || (s.fa!=null && s.fb==null && c.B.length>1)) && (h[0]!=='k' || NK[h])).map(id => '<button data-show="'+id+'">＋ '+esc(id==='a' ? DA.tit : id==='b' ? DB.tit : id==='t' ? '¿Cuándo?' : id==='x' ? (DX ? DX.tit : 'Gráfica') : NK[id])+'</button>').join('')+'</div>' : '') : '';
  const r1 = tw, r2 = aw || bw || dx;
  host.innerHTML = fr+'<div class="ar-cv">'+
    '<div class="ar-lt"><div class="ar-lt1"><div class="ar-ey">'+esc(c.area)+' · '+esc(c.u)+'</div><h2>'+esc(c.t)+'<span>'+esc(tt.slice(c.t.length))+'</span></h2><div class="ar-bar"></div>'+
      '<div class="ar-fra" '+(inter ? 'contenteditable="true" spellcheck="false" data-fra title="Toca para editar"' : '')+'>'+esc(fra)+'</div></div>'+
      '<div class="ar-per"><div><span>Periodo</span><b>'+rango(a, b)+'</b></div>'+(cm ? '<div class="vs"><span>Contra</span><b>'+(cn ? esc(lab2) : rango(ca, cb))+'</b></div>' : '')+'</div></div>'+
    '<div class="ar-ks">'+K.join('')+'</div>'+
    (r1 || r2 ? '<div class="ar-bd" style="grid-template-rows:'+[r1, r2].filter(Boolean).map(() => 'minmax(0,1fr)').join(' ')+'">'+
      (r1 ? '<div class="ar-rw" style="grid-template-columns:1fr"><div class="ar-box">'+x('t')+'<div class="ar-h"><b>¿Cuándo?</b><span class="s1"></span></div><div class="ar-gr g1"></div></div></div>' : '')+
      (r2 ? '<div class="ar-rw" style="grid-template-columns:'+((aw || dx) && bw ? '1fr 1fr' : '1fr')+'">'+
        (aw ? '<div class="ar-box">'+x('a')+'<div class="ar-h"><b>'+esc(DA.tit)+'</b><span class="s2"></span></div><div class="ar-gr g2"></div></div>' : '')+
        (dx ? '<div class="ar-box">'+x('x')+'<div class="ar-h"><b>'+esc(DX.tit)+'</b><span class="sx"></span></div><div class="ar-gr gx"></div></div>' : '')+
        (bw ? '<div class="ar-box">'+x('b')+'<div class="ar-h"><b>'+esc(DB.tit)+'</b><span class="s3"></span></div><div class="ar-gr g3"></div></div>' : '')+'</div>' : '')+'</div>' : '<div class="ar-bd"></div>')+
    '<div class="ar-pie"><span>Fuente: '+esc(INDK[k].proc || c.area)+(nota ? ' · '+esc(nota) : '')+'</span><span>IA-NAMI · datos al '+fd(finK(k))+'</span></div></div>';
  if (!V){ host.querySelectorAll('.ar-rw').forEach(r => r.remove()); const bd = host.querySelector('.ar-bd'); if (bd) bd.innerHTML = '<div class="ar-vacio"><b>Sin registros para esta combinación</b><span>'+esc(tt)+' no tiene '+c.u+' en '+esc(P.lab)+'. Prueba otro periodo o quita uno de los filtros.</span></div>'; }
  if (tw && V){ const mxI = y1.reduce((m, v, i) => v!=null && (m<0 || v>y1[m]) ? i : m, -1), bg = C1.l.length<=26;
    host.querySelector('.s1').textContent = gl+(disp ? ' · en gris, '+lab2+' (escala muy distinta: va como cifra bajo cada '+(C1.g==='m' ? 'mes' : 'periodo')+')' : y2 ? (porDia ? ' · gris: '+lab2 : ' · línea punteada: '+lab2) : '')+(C1.l.some(q => q.inc) ? ' · * incompleto' : '');
    mk(host.querySelector('.g1'), { tooltip:Object.assign({ trigger:'axis', axisPointer:{ type:'line', lineStyle:{ color:'#2F6657', type:'dashed' } } }, TIP), grid:{ left:62, right:18, top:26, bottom:disp ? 36 : 22 },
      legend:y2 && !disp ? { top:-2, right:0, itemWidth:14, itemHeight:3, textStyle:{ fontSize:11, color:'#8A857A' } } : undefined,
      xAxis:Object.assign({ type:'category', data:C1.l.map((q, i) => q.lab+(q.inc ? '*' : '')+(disp && y2[i]!=null ? '\n{g|'+f(y2[i])+'}' : '')) }, AX, { axisLabel:{ fontSize:10.5, color:'#8A857A', lineHeight:15, rich:{ g:{ fontSize:10.5, color:'#A39C8C' } } } }),
      yAxis:{ type:'value', axisLabel:{ fontSize:10.5, color:'#8A857A', formatter:v => f(v) } },
      series:[{ name:nm1, type:'line', data:y1, smooth:0.2, symbolSize:bg ? 9 : 5, lineStyle:{ width:2.6, color:'#2F6657' }, itemStyle:{ color:'#2F6657', borderColor:'#fff', borderWidth:2, shadowBlur:5, shadowColor:'rgba(0,0,0,.25)' },
        label:{ show:bg, position:'top', fontSize:10, color:'#5C574E', formatter:q => q.value==null || q.dataIndex===mxI ? '' : f(q.value) }, labelLayout:{ hideOverlap:true },
        markPoint:mxI>=0 ? { symbol:'roundRect', symbolSize:[1,1], label:{ show:true, position:'top', distance:6, formatter:'máximo · '+f(y1[mxI]), backgroundColor:'#2F6657', color:'#fff', padding:[3,7], borderRadius:5, fontSize:10.5, fontWeight:600 }, data:[{ coord:[mxI, y1[mxI]] }] } : undefined,
        areaStyle:{ color:new echarts.graphic.LinearGradient(0,0,0,1,[{ offset:0, color:'#2F665733' },{ offset:1, color:'#2F665700' }]) } },
       ...(y2 && !disp ? [{ name:lab2, type:'line', data:y2, smooth:0.2, symbolSize:bg ? 7 : 4, lineStyle:{ width:2, color:'#BDB6A6', type:'dashed' }, itemStyle:{ color:'#BDB6A6', borderColor:'#fff', borderWidth:1.5 }, label:{ show:bg, position:porDia ? 'top' : 'bottom', fontSize:9.5, color:'#8A857A', formatter:q => q.value==null ? '' : f(q.value) }, labelLayout:{ hideOverlap:true } }] : [])] }); }
  const d1 = porDia ? dias : 1, d2 = porDia ? cd : 1;
  const bars = (el, m1, m2, sel, dim) => { const h = el.clientHeight || 260, cap = Math.max(2, Math.min(10, Math.floor((h-(m2 ? 16 : 2))/(m2 ? 32 : 26))));
    let o = ord(m1).filter(x => x[0]!=='Otros').map(x => x[0]); if (m2) [...m2.keys()].forEach(n => { if (n!=='Otros' && !o.includes(n) && m2.get(n)>0) o.push(n); }); o = o.slice(0, cap);
    if (sel!=null && !o.includes(sel)) o[o.length-1] = sel; const s1 = sm(m1);
    const rowH = (h-(m2 ? 16 : 2))/Math.max(o.length, 1), bw = m2 ? Math.max(7, Math.min(13, rowH*0.32)) : Math.max(9, Math.min(20, rowH*0.55));
    const dif_ = m2 ? o.map(n => { const nv = Math.round((m1.get(n) || 0)/d1), ov = Math.round((m2.get(n) || 0)/(cn ? 1 : d2)), d = nv-ov; return (d<0 ? '{n|▼ ' : '{p|▲ ')+f(Math.abs(d))+(ov ? '  '+(d<0 ? '' : '+')+Math.round(d/ov*100)+'%' : '')+'}'; }) : null;
    const ch = mk(el, { tooltip:Object.assign({ trigger:'axis', axisPointer:{ type:'shadow' } }, TIP), grid:{ left:Math.min(170, 10+Math.max(...o.map(n => n.length))*7.4), right:m2 ? 118 : 60, top:m2 ? 16 : 0, bottom:0 },
      legend:m2 ? { top:-4, left:0, itemWidth:10, itemHeight:10, textStyle:{ fontSize:10.5, color:'#8A857A' } } : undefined,
      xAxis:{ type:'value', axisLabel:{ show:false }, axisLine:{ show:false }, axisTick:{ show:false } },
      yAxis:[Object.assign({ type:'category', inverse:true, data:o }, AX, { axisLine:{ show:false }, axisLabel:{ fontSize:13, fontFamily:'Barlow Condensed', fontWeight:600, color:'#2B2926' } }),
        ...(m2 ? [{ type:'category', inverse:true, position:'right', data:dif_, axisLine:{ show:false }, axisTick:{ show:false }, splitLine:{ show:false }, axisLabel:{ margin:8, align:'left', rich:{ n:{ fontSize:11.5, fontWeight:600, color:'#7E302B' }, p:{ fontSize:11.5, fontWeight:600, color:'#2F6657' } } } }] : [])],
      series:[{ name:nm1, type:'bar', color:'#2F6657', data:o.map(n => ({ value:Math.round((m1.get(n) || 0)/d1), itemStyle:{ color:sel!=null && sel!==n ? '#C8DAD3' : '#2F6657' } })), barWidth:bw, barGap:'25%', itemStyle:{ borderRadius:[0,4,4,0] },
          label:{ show:true, position:'right', fontSize:11.5, color:'#2F6657', fontWeight:700, formatter:q => f(q.value)+(m2 ? '' : '  '+Math.round((m1.get(o[q.dataIndex]) || 0)/s1*100)+'%') } },
        ...(m2 ? [{ name:lab2, type:'bar', color:'#C9C2B2', data:o.map(n => Math.round((m2.get(n) || 0)/(cn ? 1 : d2))), barWidth:bw, itemStyle:{ borderRadius:[0,4,4,0] }, label:{ show:true, position:'right', fontSize:10.5, color:'#8A857A', formatter:q => f(q.value) } }] : [])] });
    if (inter && ch && dim){ ch.off('click'); ch.on('click', q => { const n = q.name; if (!n) return; S[dim] = S[dim]===n ? null : n; if (dim==='fa' && S.cmp && S.cmp.fa!=null) S.cmp = null; draw(); toast(S[dim]==null ? 'Filtro quitado' : 'Ahora solo: '+n+' · toca otra vez para quitarlo'); }); } };
  const mt = m => m ? ' · mayor cambio: '+(m[1]<0 ? '▼ ' : '▲ ')+m[0]+' '+(m[1]<0 ? '' : '+')+Math.round(m[1]*100)+'%' : '';
  if (dx && V){ const Fx = Object.assign({}, F); delete Fx[dx]; const mX = porNom(k, dx, a, b, Fx), mX2 = cm ? (cn ? porNom(k, dx, a, b, Object.assign(filtros(s, cm.fa), { [dx]:[] })) : porNom(k, dx, ca, cb, Fx)) : null;
    bars(host.querySelector('.gx'), mX, mX2, null, null); host.querySelector('.sx').textContent = (porDia ? 'por día · ' : '')+(DX.sub ? DX.sub+' · ' : '')+s.fa+(s.fb!=null ? ' · '+s.fb : '')+mt(mX2 ? mover(mX, mX2) : null); }
  if (aw && V){ bars(host.querySelector('.g2'), mA, cn ? null : mA2, cn ? null : s.fa, 'fa'); host.querySelector('.s2').textContent = (porDia ? 'por día · ' : '')+(s.fb!=null ? s.fb : DB ? DB.all : '')+mt(mvA); }
  if (bw && V){ bars(host.querySelector('.g3'), mB, mB2, s.fb, 'fb'); host.querySelector('.s3').textContent = (porDia ? 'por día · ' : '')+(DB.sub || '')+(s.fa!=null ? ' · '+s.fa : '')+mt(mvB); }
  // Narrativa: frases con cifras (como el informe migratorio); cada una solo aparece si hay datos
  const hz = [], g_ = { d:'día', s:'semana', m:'mes' }[C1.g], gP = { d:'días', s:'semanas', m:'meses' }[C1.g], dc = (m, t) => Math.round(t[1]/sm(m)*100), cuan = d => (d<0 ? '−' : '+')+f(Math.abs(d));
  const pctT = x => (Math.abs(x)<0.01 ? (x*100).toFixed(1) : Math.round(x*100));
  if (cn) hz.push(esc(s.fa)+' suma <b>'+f(V)+'</b> '+c.u+' en '+esc(P.lab)+'; '+esc(lab2)+', <b>'+f(W)+'</b>: '+(V>=W ? '<b>'+(V/W).toFixed(1)+' veces</b> más' : 'equivale al <b>'+pctT(V/W)+'%</b>')+'.');
  else if (cm && W) hz.push('Suman <b>'+f(V)+'</b> '+c.u+' en '+esc(P.lab)+': '+(Math.abs(r)<0.01 ? 'prácticamente igual que' : '<b>'+pc(r)+'% '+(r<0 ? 'menos' : 'más')+'</b>'+(porDia ? ' por día' : '')+' que')+' '+esc(lab2)+' ('+f(W)+'; '+cuan(V-W)+').');
  else hz.push('Suman <b>'+f(V)+'</b> '+c.u+' en '+esc(P.lab)+'.');
  hz.push('En promedio son <b>'+f(V/dias)+'</b> por día'+(cm && W ? '; '+esc(ref)+' tuvo <b>'+f(W/cd)+'</b>' : '')+'.');
  // tendencia: el último periodo completo contra el promedio de los tres anteriores
  const iv = C1.l.map((q, i) => i).filter(i => y1[i]!=null && !C1.l[i].inc);
  if (iv.length>=4){ const l = iv[iv.length-1], pv = iv.slice(-4, -1).map(i => y1[i]), pr = pv.reduce((x, y) => x+y, 0)/pv.length, d = pr ? y1[l]/pr-1 : 0;
    hz.push('En <b>'+esc(C1.l[l].lab)+'</b> fueron <b>'+f(y1[l])+'</b>: '+(Math.abs(d)<0.02 ? 'en línea con el' : '<b>'+pc(d)+'% '+(d<0 ? 'por debajo' : 'por encima')+'</b> del')+' promedio de los tres '+gP+' previos ('+f(pr)+').'); }
  const vs = iv.length ? iv : C1.l.map((q, i) => i).filter(i => y1[i]!=null);
  if (vs.length>=3){ const mx = vs.reduce((m, i) => y1[i]>y1[m] ? i : m, vs[0]), mn = vs.reduce((m, i) => y1[i]<y1[m] ? i : m, vs[0]);
    hz.push('El '+g_+' más alto fue <b>'+esc(C1.l[mx].lab)+'</b> ('+f(y1[mx])+') y el más bajo, <b>'+esc(C1.l[mn].lab)+'</b> ('+f(y1[mn])+').'); }
  const conc = (m, D, sel) => { if (!m || sel!=null) return; const o = ord(m).filter(x => x[0]!=='Otros'), t = sm(m); if (!o.length || !t) return;
    const t3 = o.slice(0, 3), p3 = Math.round(t3.reduce((x, y) => x+y[1], 0)/t*100);
    hz.push('Por '+D.tipo+', <b>'+esc(o[0][0])+'</b> va primero con <b>'+dc(m, o[0])+' de cada 100</b>'+(o.length>3 ? '; los tres primeros ('+t3.map(x => esc(x[0])).join(', ')+') suman <b>'+p3+' de cada 100</b>' : '')+'.'); };
  const movs = (m1, m2, D, sel) => { if (!m1 || !m2 || sel!=null || cn) return; const k1 = d1 => porDia ? d1 : 1; let up = null, dn = null;
    const s1_ = sm(m1), s2_ = sm(m2); new Set([...m1.keys(), ...m2.keys()]).forEach(n => { if (n==='Otros' || ((m1.get(n) || 0)<s1_*0.01 && (m2.get(n) || 0)<s2_*0.01)) return; const v = (m1.get(n) || 0)/(porDia ? dias : 1), o = (m2.get(n) || 0)/(porDia ? cd : 1), d = v-o;
      if (d>0 && (!up || d>up[1])) up = [n, d, o]; if (d<0 && (!dn || d<dn[1])) dn = [n, d, o]; });
    const tx = x => '<b>'+esc(x[0])+'</b> ('+cuan(x[1])+(x[2] ? ', '+(x[1]<0 ? '' : '+')+Math.round(x[1]/x[2]*100)+'%' : '')+')';
    if (up || dn) hz.push('Por '+D.tipo+', '+(up ? 'lo que más creció fue '+tx(up) : '')+(up && dn ? ' y ' : '')+(dn ? 'lo que más cayó, '+tx(dn) : '')+(porDia ? ' por día' : '')+'.'); };
  if (cn && da && s.fa!=null && mA){ const tA_ = sm(mA), pa = (mA.get(s.fa) || 0)/tA_, pb = (mA.get(cm.fa) || 0)/tA_, o = ord(mA), ra = o.findIndex(x => x[0]===s.fa)+1, rb = o.findIndex(x => x[0]===cm.fa)+1;
    hz.push('Del total, '+esc(s.fa)+' representa <b>'+(pa*100).toFixed(pa<0.01 ? 2 : 1)+'%</b>'+(ra ? ' (lugar '+ra+')' : '')+' y '+esc(cm.fa)+' <b>'+(pb*100).toFixed(pb<0.01 ? 2 : 1)+'%</b>'+(rb ? ' (lugar '+rb+')' : '')+'.'); }
  conc(mA, DA, s.fa); movs(mA, mA2, DA, s.fa); if (vTxt) hz.push(vTxt);
  if (!(c.V && db===c.V)){ conc(mB, DB, s.fb); movs(mB, mB2, DB, s.fb); }
  host._fra = fra; host._hz = hz; host._k = { n:c.t, v:V, r:cm && W && !cn ? V/W-1 : null, ref:cm && !cn ? ref : '', per:P.lab };
}
function portada(host, s){ const it = s.items || [], ks = (s.ks || []).slice(0, 3), t = esc(s.titulo || 'Informe').split(' ');
  host.innerHTML = '<div class="ar-cv ar-cvp"><div class="inf-port pt pt-b"><div class="pt-ilu"><img src="assets/portada/ilustracion.webp" alt=""></div><div class="pt-c"><img class="pt-logos" src="assets/portada/logos.webp" alt="Gobernación · Instituto Nacional de Migración">'+
    '<div class="inf-port-a"><h1><b>'+t[0]+'</b> '+t.slice(1).join(' ')+'</h1><i class="inf-port-r"></i><p class="inf-port-f">'+esc(s.fecha || '')+'</p><p class="inf-port-p">'+esc(s.datos || '')+'</p>'+
    (ks.length ? '<div class="inf-port-k">'+ks.map(x => '<div><span>'+esc(x.n)+'</span><b class="num">'+f(x.v)+'</b>'+(x.r!=null ? '<em class="'+(Math.abs(x.r)<0.01 ? 'n' : x.r>0 ? 'u' : 'd')+'">'+(Math.abs(x.r)<0.01 ? '≈' : x.r<0 ? '▼' : '▲')+' '+pc(x.r)+'% · que '+esc(x.ref)+'</em>' : '')+'</div>').join('')+'</div>' : '')+'</div>'+
    '<ol class="inf-port-i">'+it.map((x, i) => '<li data-arir="'+(i+1)+'"><b>'+String(i+1).padStart(2, '0')+'</b><span>'+esc(x[0])+'<small>'+esc(x[1] || '')+'</small></span><i>›</i></li>').join('')+
      '<li data-arir="'+(it.length+1)+'"><b>'+String(it.length+1).padStart(2, '0')+'</b><span>Narrativa</span><i>›</i></li></ol>'+
    '</div></div></div>'; }
function narrativa(host, s){ const n = s.items.length, cap = n>=3 ? 4 : n===2 ? 8 : 9;
  host.innerHTML = '<div class="ar-cv ar-cvn"><header class="inf-h"><span class="inf-ey">'+esc(s.titulo || 'Informe')+' · cierre</span><h2><b>Narrativa</b> <span>'+esc(s.fecha || '')+'</span></h2></header>'+
    '<div class="inf-hzt ar-nz n'+Math.min(n, 3)+'">'+s.items.map(x => '<div class="inf-c"><span class="inf-ey">'+esc(x[0])+'</span><p class="ar-nlead">'+esc(x[1])+'</p><ul>'+(x[2] || []).slice(0, cap).map(h => '<li>'+h+'</li>').join('')+'</ul></div>').join('')+'</div>'+
    '<div class="ar-pie"><span>Cifras calculadas con las bases del tablero; cada frase solo aparece si hay datos.</span><span>IA-NAMI</span></div></div>'; }

/* ==== [5] PALABRAS DE COLOR ======================================= */
let S = null, MYR = null, HOST = null;
const pf = '<input class="ar-pf" placeholder="Escribe para buscar…">';
function lista(o, m, excl){ return [...m.entries()].filter(x => x[0]!=='Otros' && x[0]!==excl && x[1]>0).sort((x, y) => y[1]-x[1]).map(x => '<button data-o="'+o+'" data-v="'+esc(x[0])+'">'+esc(x[0])+'<em>'+f(x[1])+'</em></button>').join(''); }
function opts(kind){ const c = CK[S.k], k = S.k, P = PER(k, S), Pp = P[S.p], a = Pp.a, b = Pp.b, da = dimA(S), db = dimB(S), F = filtros(S);
  if (kind==='k'){ let g = ''; return CONC.map(x => (x.area!==g ? '<div class="t">'+(g = x.area)+'</div>' : '')+'<button data-o="k" data-v="'+x.k+'">'+esc(x.t)+'</button>').join(''); }
  if (kind==='fa'){ const m = porNom(k, da, a, b, Object.assign({}, F, { [da]:[] })); return pf+'<div class="t">'+DIM(k, da).tipo+'</div><button data-o="fa" data-v="">'+DIM(k, da).all+'<em>'+f([...m.values()].reduce((x, y) => x+y, 0))+'</em></button>'+lista('fa', m); }
  if (kind==='fb'){ const m = porNom(k, db, a, b, Object.assign({}, F, { [db]:[] })); return pf+'<div class="t">'+DIM(k, db).tipo+'</div><button data-o="fb" data-v="">'+DIM(k, db).all+'<em>'+f([...m.values()].reduce((x, y) => x+y, 0))+'</em></button>'+lista('fb', m); }
  if (kind==='p'){ const ys = anios(k), YY = MYR && ys.includes(MYR) ? MYR : ys[0], fijos = ['sem','sx','tr'].concat(ys.slice(0, 2).map(y => 'y'+y)).filter(x => P[x]);
    return '<div class="t">Periodo</div>'+fijos.map(x => '<button data-o="p" data-v="'+x+'" class="'+(S.p===x ? 'on2' : '')+'">'+esc(P[x].lab)+'<em>'+esc(P[x].sub || '')+'</em></button>').join('')+
      '<div class="t">Un mes</div><div class="ar-segb">'+ys.map(y => '<button data-o="my" data-v="'+y+'" class="'+(y===YY ? 'on' : '')+'">'+y+'</button>').join('')+'</div>'+
      '<div class="ar-mg">'+meses(k, YY).map(x => '<button data-o="p" data-v="'+x.key+'" class="'+(S.p===x.key ? 'on' : '')+'">'+MS[x.m]+(x.sub ? '*' : '')+'</button>').join('')+'</div>'+
      '<div class="t">Fechas a la medida</div><div class="ar-cu"><input type="date" id="ar-ca" min="'+iniK(k)+'" max="'+finK(k)+'" value="'+a+'"><input type="date" id="ar-cb" min="'+iniK(k)+'" max="'+finK(k)+'" value="'+b+'"><button data-o="cu">Aplicar</button></div>'+
      '<div class="t nt">«Última semana» se actualiza sola cada lunes · * mes en curso</div>'; }
  if (kind==='cmp'){ const L = CMP(k, S.p, S); let h = pf+'<button data-o="cmp" data-v="no">Sin comparar</button><div class="t">Contra otro periodo</div>'+(L.length ? L.map((x, i) => '<button data-o="cmp" data-v="'+i+'">'+esc(x.lab)+'<em>'+f(T_(k, x.a, x.b, F))+'</em></button>').join('') : '<div class="t nt">No hay un periodo comparable en esta base</div>');
    if (da==='n'){ const m = porNom(k, da, a, b, Object.assign({}, F, { [da]:[] })); h += S.fa!=null ? '<div class="t">'+esc(S.fa)+' contra otro país</div>'+lista('cmpa', m, S.fa) : '<div class="t">Comparar dos países · elige el primero</div>'+lista('cmpf', m); }
    return h; } }
function clic(ev){ const nt = ev.target.closest('[data-hide],[data-show],[data-close]');
  if (nt){ ev.stopPropagation(); if (nt.dataset.close!=null){ S = null; draw(); return; } S.hide = S.hide || [];
    if (nt.dataset.hide){ const vis = ['t','a','b','x'].filter(z => !S.hide.includes(z) && (z!=='a' || (dimA(S) && S.fa==null)) && (z!=='b' || (dimB(S) && S.fb==null)) && (z!=='x' || (S.fa!=null && S.fb==null && CK[S.k].B.length>1))); if (nt.dataset.hide[0]!=='k' && vis.length<=1){ toast('Deja al menos una gráfica en la lámina'); return; } S.hide.push(nt.dataset.hide); toast('Pieza quitada: lo demás ocupa su lugar'); }
    else S.hide = S.hide.filter(z => z!==nt.dataset.show); draw(); return; }
  const o = ev.target.closest('[data-o]');
  if (o){ ev.stopPropagation(); const k = o.dataset.o, v = o.dataset.v;
    if (k==='k'){ S = nuevo(v); toast('Cambiaste a '+CK[v].t+': las opciones se ajustan a lo que trae su base'); }
    else if (k==='fa' || k==='fb'){ S[k] = v==='' ? null : v; if (k==='fa' && S.cmp && S.cmp.fa!=null) S.cmp = null; }
    else if (k==='iA' || k==='iB'){ S[k] = +v; S[k==='iA' ? 'fa' : 'fb'] = null; }
    else if (k==='p'){ S.p = v; const L = CMP(S.k, v, S); S.cmp = L.length ? L[0] : null; }
    else if (k==='my'){ MYR = +v; const t = HOST.querySelector('[data-pop="p"] .ar-pop'); t.innerHTML = opts('p'); return; }
    else if (k==='cu'){ const x = $('ar-ca').value, y = $('ar-cb').value; if (!x || !y || x>y){ toast('Revisa las fechas'); return; } S.p = 'cu'; S.pa = x; S.pb = y; const L = CMP(S.k, 'cu', S); S.cmp = L.length ? L[0] : null; }
    else if (k==='cmp') S.cmp = v==='no' ? null : CMP(S.k, S.p, S)[+v];
    else if (k==='cmpa') S.cmp = { fa:v };
    else if (k==='cmpf'){ S.fa = v; S.cmp = null; draw(); setTimeout(() => { const t = HOST.querySelector('[data-pop="cmp"] .ar-pop'); t.innerHTML = opts('cmp'); t.classList.add('on'); const i = t.querySelector('.ar-pf'); i && i.focus(); toast('Ahora elige o escribe contra qué país'); }, 60); return; }
    delete S.fra; draw(); return; }
  if (ev.target.closest('.ar-pop')) return;
  const t = ev.target.closest('[data-pop]'); if (!t) return; ev.stopPropagation(); const pp = t.querySelector('.ar-pop'), was = pp.classList.contains('on');
  HOST.querySelectorAll('.ar-pop.on').forEach(x => x.classList.remove('on')); if (!was){ pp.innerHTML = opts(t.dataset.pop); pp.classList.add('on'); const i = pp.querySelector('.ar-pf'); i && setTimeout(() => i.focus(), 30); } }
function draw(go){ const lam = $('ar-lam'); if (!lam) return; render(lam, S, true); marca(); if (go) $('ar-lsec').scrollIntoView({ behavior:'smooth', block:'start' }); }

/* ==== [6] BUSCADOR ================================================ */
let IDXB = null, SG = [], SEL = 0, REC = [];
const y26 = (k, fl) => { const y = finK(k).slice(0,4); return T_(k, y+'-01-01', finK(k), fl); };
function indice(){ const I = [], vistos = new Set();
  CONC.forEach(c => I.push({ g:'Conceptos', n:c.t, d:c.area, fn:() => { S = nuevo(c.k); draw(true); } }));
  ['ing','resc'].forEach(k => porNom(k, 'n', finK(k).slice(0,4)+'-01-01', finK(k)).forEach((v, n) => { if (vistos.has(n) || n==='Otros') return; vistos.add(n);
    I.push({ g:'Países', n, pre:'Internaciones de ', d:f(y26('ing', { n:indices('ing','n',n) }))+' entradas este año', fn:() => { S = nuevo('ing', { fa:n }); draw(true); } });
    if (indices('resc','n',n).length) I.push({ g:'Países', n, pre:'Rescatados de ', d:f(y26('resc', { n:indices('resc','n',n) }))+' este año', fn:() => { S = nuevo('resc', { fa:n }); draw(true); } }); }));
  base('ing').dims.e.vals.forEach(e => { I.push({ g:'Estados', n:e, pre:'Ingresos en ', d:'por estado de llegada', fn:() => { S = nuevo('ing', { iB:1, fb:e }); draw(true); } });
    if (indices('resc','e',e).length) I.push({ g:'Estados', n:e, pre:'Rescatados en ', d:'O.R. '+e, fn:() => { S = nuevo('resc', { fb:e }); draw(true); } });
    if (indices('rep','e',e).length) I.push({ g:'Estados', n:e, pre:'Repatriados en ', d:'O.R. '+e, fn:() => { S = nuevo('rep', { iA:1, fa:e }); draw(true); } }); });
  const pts_ = new Set(); base('ing').dims.p.vals.forEach(v => pts_.add(grp('p', v)));
  pts_.forEach(p => I.push({ g:'Puntos', n:p, pre:'Ingresos por ', d:'punto de internación', fn:() => { S = nuevo('ing', { fb:p }); draw(true); } }));
  base('rep').dims.p.vals.forEach(p => I.push({ g:'Puntos', n:p, pre:'Repatriados por ', d:'punto de repatriación', fn:() => { S = nuevo('rep', { fa:p }); draw(true); } }));
  [['Periodo Sheinbaum','sx'],['Periodo Trump','tr'],['Última semana','sem']].forEach(([n, p]) => I.push({ g:'Periodos', n, d:'aplica a la lámina abierta', fn:() => { if (!S) S = nuevo('resc'); S.p = p; const L = CMP(S.k, p, S); S.cmp = L.length ? L[0] : null; draw(true); } }));
  return I; }
const lev = (a, b) => { const m = a.length, n = b.length; if (Math.abs(m-n)>2) return 9; const d = [...Array(m+1)].map((_, i) => [i, ...Array(n).fill(0)]); for (let j=1;j<=n;j++) d[0][j] = j;
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++) d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+(a[i-1]===b[j-1] ? 0 : 1)); return d[m][n]; };
function buscar(t){ IDXB = IDXB || indice(); t = norm(t.trim()); if (!t) return [];
  const sc = x => { const n = norm(x.n); if (n.startsWith(t)) return 3; if (n.split(/[\s(,.]+/).some(w => w.startsWith(t))) return 2; if (n.includes(t)) return 1; return 0; };
  let r = IDXB.map(x => [sc(x), x]).filter(z => z[0]>0);
  if (!r.length && t.length>=4) r = IDXB.map(x => [norm(x.n).split(/[\s(,.]+/).some(w => lev(w, t)<=2) ? 1 : 0, Object.assign({}, x, { fz:1 })]).filter(z => z[0]>0);
  r.sort((p, q) => q[0]-p[0]); const out = [], cnt = {}; for (const [, x] of r){ cnt[x.g] = (cnt[x.g] || 0)+1; if (cnt[x.g]<=3) out.push(x); if (out.length>=7) break; }
  const og = ['Países','Estados','Puntos','Conceptos','Periodos']; return out.sort((p, q) => og.indexOf(p.g)-og.indexOf(q.g)); }
// Frase completa con el motor de Pregunta a INAMI
function frase(t){ if (norm(t).split(/\s+/).length<2 || !entender) return null; let q; try { q = entender(t); } catch(e){ return null; }
  if (!q || !CK[q.ind] || (q.avisos || []).some(a => /^No reconocí qué quieres ver/.test(a))) return null;
  const c = CK[q.ind], B_ = base(q.ind), o = {}; Object.entries(q.filtros || {}).forEach(([d, l]) => { if (!l.length) return; const nom = grp(d, B_.dims[d].vals[l[0]]);
    let i = c.A.indexOf(d); if (i>=0 && o.fa==null){ o.iA = i; o.fa = nom; return; } i = c.B.indexOf(d); if (i>=0 && o.fb==null){ o.iB = i; o.fb = nom; } });
  const w = norm(t), P = PER(q.ind); if (/trump/.test(w) && P.tr) o.p = 'tr'; else if (/sexenio|sheinbaum/.test(w)) o.p = 'sx'; else if (/semana/.test(w)) o.p = 'sem';
  else { const y = (q.d0 || '').slice(0,4); if (q.d0 && q.d0===y+'-01-01' && P['y'+y]) o.p = 'y'+y; else if (q.d0 && q.d1 && (q.d0!==iniK(q.ind) || q.d1!==finK(q.ind))){ o.p = 'cu'; o.pa = q.d0; o.pb = q.d1; } }
  const s = nuevo(q.ind, o); return { g:'Tu frase', n:tit(s), d:(PER(q.ind, s)[s.p] || {}).lab+(s.cmp ? ' · contra '+(s.cmp.lab || s.cmp.fa) : ''), fn:() => { S = s; draw(true); } }; }
const hl = (s, t) => { const i = norm(s).indexOf(norm(t.trim())); return i<0 ? esc(s) : esc(s.slice(0, i))+'<mark>'+esc(s.slice(i, i+t.trim().length))+'</mark>'+esc(s.slice(i+t.trim().length)); };
function pinta(){ const q = $('ar-q'), dd = $('ar-dd'), t = q.value; let h = '';
  if (!t.trim()){ SG = REC.slice(0, 3).concat(HZ.slice(0, 3).map(z => ({ g:'Lo que más cambió', n:z.t, d:z.d, fn:() => { S = cp(z.s); draw(true); } }))); SEL = 0;
    let g = ''; SG.forEach((x, i) => { const gg = i<Math.min(REC.length, 3) ? 'Recientes' : 'Lo que más cambió'; if (gg!==g){ g = gg; h += '<div class="dg">'+g+'</div>'; } h += fila(x, i); });
    dd.innerHTML = h; dd.classList.toggle('on', !!SG.length); return; }
  SG = buscar(t); const fz = frase(t); if (fz) SG.unshift(fz); SEL = 0; let g = '';
  SG.forEach((x, i) => { if (x.g!==g){ g = x.g; h += '<div class="dg">'+g+(x.fz ? ' · ¿quisiste decir…?' : '')+'</div>'; } h += fila(x, i, x.g==='Tu frase' ? '' : t); });
  dd.innerHTML = h || '<div class="dg">No encontré «'+esc(t)+'»</div><div class="dh">Prueba con un país, estado, aeropuerto u oficina, o una frase: «rescatados cubanos en Chiapas».</div>'; dd.classList.add('on'); }
const fila = (x, i, t) => '<button data-s="'+i+'" class="'+(i===SEL ? 'ar-sel' : '')+'"><span class="nm">'+esc(x.pre || '')+(t ? hl(x.n, t) : esc(x.n))+'</span><span class="de">'+esc(x.d || '')+'</span></button>';
function usar(x){ x.fn(); if (x.g!=='Lo que más cambió') REC = [x].concat(REC.filter(z => z.n!==x.n || z.pre!==x.pre)).slice(0, 3); const q = $('ar-q'); q.value = ''; $('ar-dd').classList.remove('on'); q.blur(); }

/* ==== [7] MI INFORME Y VISOR ====================================== */
let PR = [], TIT = 'Informe IA-NAMI', VL = [], VI = 0;
const KEY = x => JSON.stringify(x), yaEsta = x => PR.findIndex(z => KEY(z)===KEY(x));
function agrega(x){ if (!x) return; const i = yaEsta(x); if (i>=0){ toast('Ya está en tu informe (lámina '+(i+1)+')'); return; } PR.push(cp(x)); tray(true); marca(); toast('Agregada · lámina '+PR.length+' de tu informe'); }
function marca(){ const b = $('ar-add'); if (b){ const on = S && yaEsta(S)>=0; b.textContent = on ? '✓ Ya está en tu informe' : '＋ Agregar a mi informe'; b.classList.toggle('ya', !!on); b.hidden = !S; $('ar-full').hidden = !S; }
  document.querySelectorAll('[data-ark]').forEach(x => x.classList.toggle('on', !!S && x.dataset.ark===S.k)); }
function chispa(s){ const P = PER(s.k, s)[s.p]; if (!P) return ''; const Cb = cub(P.a, P.b), y = serieK(s.k, P.a, P.b, filtros(s), Cb), mx = Math.max(...y, 1);
  return '<svg viewBox="0 0 100 24" preserveAspectRatio="none"><polyline points="'+y.map((v, i) => (i/(y.length-1 || 1)*100).toFixed(1)+','+(22-v/mx*18).toFixed(1)).join(' ')+'" fill="none" stroke="#2F6657" stroke-width="2"/></svg>'; }
function tray(nv){ const tl = $('ar-tl'); if (!tl) return; $('ar-tc').textContent = PR.length ? PR.length+' lámina'+(PR.length>1 ? 's' : '')+' · arrastra para ordenar' : 'vacío';
  if (!PR.length){ tl.innerHTML = '<span class="ar-empty">Toca «＋ Agregar a mi informe» en cualquier lámina y aparece aquí.</span>'; return; }
  tl.innerHTML = PR.map((s, i) => { const P = PER(s.k, s)[s.p] || {}; return '<div class="ar-th '+(nv && i===PR.length-1 ? 'new' : '')+'" draggable="true" data-i="'+i+'"><span class="nm">'+(i+1)+'</span><span class="x" data-del="'+i+'">✕</span><h6>'+esc(tit(s))+' · '+esc(P.lab || '')+(s.cmp ? ' ⇄' : '')+'</h6><div class="v">'+f(T_(s.k, P.a, P.b, filtros(s)))+'</div>'+chispa(s)+'</div>'; }).join('');
  tl.querySelectorAll('[data-del]').forEach(x => x.addEventListener('click', ev => { ev.stopPropagation(); PR.splice(+x.dataset.del, 1); tray(); marca(); }));
  tl.querySelectorAll('.ar-th').forEach(x => { x.addEventListener('click', () => { S = cp(PR[+x.dataset.i]); draw(true); });
    x.addEventListener('dragstart', e => e.dataTransfer.setData('i', x.dataset.i)); x.addEventListener('dragover', e => e.preventDefault());
    x.addEventListener('drop', e => { e.preventDefault(); const a = +e.dataTransfer.getData('i'), b = +x.dataset.i; const [m] = PR.splice(a, 1); PR.splice(b, 0, m); tray(); }); });
  tl.scrollLeft = tl.scrollWidth; }
function frases(){ const d = document.createElement('div'); d.style.cssText = 'position:absolute;left:-99999px;top:0;width:1600px'; document.body.appendChild(d);
  const out = PR.map(x => { d.innerHTML = '<div class="ar-lam"></div>'; render(d.firstChild, x, false); const r = [tit(x), d.firstChild._fra || '', d.firstChild._hz || [], d.firstChild._k];
    d.querySelectorAll('.ar-gr').forEach(g => { const c = echarts.getInstanceByDom(g); c && c.dispose(); }); return r; }); d.remove(); return out; }
function completo(){ const it = frases(), hoy = new Date();
  const fe = hoy.getDate()+' de '+ML[hoy.getMonth()]+' de '+hoy.getFullYear();
  return [{ tipo:'port', titulo:TIT, fecha:fe, datos:'Datos al '+fd(finK('resc')), items:it.map(x => [x[0], x[3] ? x[3].per+(x[3].ref ? ' · contra '+x[3].ref : '') : '']), ks:it.map(x => x[3]).filter(Boolean) }].concat(PR, it.length ? [{ tipo:'nar', titulo:TIT, fecha:fe, items:it.map(x => [x[0], x[1], x[2]]) }] : []); }
function vshow(){ const fr = $('ar-fr'); fr.innerHTML = '<div class="ar-lam"></div>'; const L = fr.firstChild; render(L, VL[VI], false); $('ar-vt').textContent = 'Lámina '+(VI+1)+' de '+VL.length+' · ← → o desliza';
  const hz = L._hz || [], nb = $('ar-vnb'); nb.hidden = !hz.length; nb.classList.remove('on'); nb.querySelector('b').textContent = hz.length;
  if (hz.length) L.insertAdjacentHTML('beforeend', '<aside class="inf-hz ar-hz" hidden><span class="inf-hz-e">Narrativa</span><h4>'+esc(tit(VL[VI]))+'</h4><ol>'+hz.map((h, j) => '<li style="--d:'+(j*0.14+0.12)+'s">'+h+'</li>').join('')+'</ol></aside>');
  fit(); }
function vnar(){ const a = $('ar-fr').querySelector('.ar-hz'), nb = $('ar-vnb'); if (!a) return; a.hidden = !a.hidden; nb.classList.toggle('on', !a.hidden); }
function fit(){ const fr = $('ar-fr'), st = fr.parentNode.getBoundingClientRect(); fr.style.transform = 'translate(-50%,-50%)'; const z = fr.getBoundingClientRect().width/1600 || 1;
  const sc = Math.min((innerWidth-16)/(1600*z), (innerHeight-104)/(900*z)); fr.style.transform = 'translate(-50%,-50%) scale('+sc+')'; }
function abrirV(l, t){ VL = l; VI = 0; $('ar-vh').textContent = (t || TIT)+' · '+fd(hoyISO()); $('ar-vis').classList.add('on'); document.body.style.overflow = 'hidden'; vshow();
  const de = document.documentElement; if (de.requestFullscreen && !document.fullscreenElement) de.requestFullscreen().then(() => setTimeout(fit, 120)).catch(() => {}); }
let LIGA = false;
function cerrarV(){ if (LIGA){ if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); location.href = location.pathname; return; } $('ar-vis').classList.remove('on'); document.body.style.overflow = ''; if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); }

/* ==== [8] PDF, WHATSAPP Y LIGA ==================================== */
let OCUPADO = false;
async function pdf(){ if (OCUPADO) return null; if (!PR.length){ toast('Agrega al menos una lámina'); return null; } OCUPADO = true;
  window.IANAMI_FUENTES = window.IANAMI_FUENTES || (d => Promise.all(['400','500','600'].map(w => w+' 16px Barlow').concat(['500','600','700'].map(w => w+' 16px "Barlow Condensed"')).map(f => d.fonts.load(f).catch(() => {}))).then(() => d.fonts.ready));
  try { if (!window.html2canvas || !window.jspdf) await window.IANAMI_LIBS_PDF(); await window.IANAMI_FUENTES(document);
    const L = completo(), doc = new window.jspdf.jsPDF({ orientation:'landscape', unit:'px', format:[1600, 900], hotfixes:['px_scaling'] });
    const d = document.createElement('div'); d.className = 'ar'; d.style.cssText = 'position:fixed;left:0;top:0;width:1600px;max-width:none;padding:0;margin:0;z-index:-1;opacity:0;pointer-events:none'; document.body.appendChild(d);
    for (let i=0;i<L.length;i++){ toast('Preparando el PDF · lámina '+(i+1)+' de '+L.length+'…'); d.innerHTML = '<div class="ar-lam ar-print"></div>'; render(d.firstChild, L[i], false);
      d.querySelectorAll('.ar-gr').forEach(g => { const c = echarts.getInstanceByDom(g); c && c.setOption({ animation:false }); });
      await new Promise(r => setTimeout(r, 60));
      const cv = await window.html2canvas(d.firstChild, { scale:1, backgroundColor:'#FBFAF6', logging:false, onclone:dd => { const e = dd.createElement('style'); e.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;box-shadow:none!important}.ar-cvp{background:#FBFAF6!important}'; dd.head.appendChild(e); dd.querySelectorAll('[_echarts_instance_] > div:nth-child(n+2)').forEach(x => { x.style.display = 'none'; }); window.IANAMI_COLORFIJO && window.IANAMI_COLORFIJO(dd); return window.IANAMI_FUENTES(dd); } });
      if (i) doc.addPage([1600, 900], 'landscape'); const h = Math.min(900, cv.height*1600/cv.width); doc.addImage(cv.toDataURL('image/jpeg', 0.9), 'JPEG', 0, (900-h)/2, 1600, h);
      d.querySelectorAll('.ar-gr').forEach(g => { const c = echarts.getInstanceByDom(g); c && c.dispose(); }); }
    d.remove(); return doc; } finally { OCUPADO = false; } }
const nombre = () => TIT.replace(/[^\wÁÉÍÓÚÑáéíóúñ -]+/g, '').slice(0, 60)+' - descargado '+(() => { const d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); })()+'.pdf';
async function bajar(){ const doc = await pdf(); if (doc){ doc.save(nombre()); toast('PDF listo'); } }
const hoyISO = () => { const d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
const b64u = t => btoa(unescape(encodeURIComponent(t))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), ub64 = t => decodeURIComponent(escape(atob(t.replace(/-/g, '+').replace(/_/g, '/'))));
// cada lámina se guarda solo con lo que cambia respecto a la lámina nueva de ese concepto
function compacta(x){ if (x.p==='cu') return x; const d = nuevo(x.k, { p:x.p }), L = CMP(x.k, x.p, x), ci = x.cmp==null ? -1 : L.findIndex(c => JSON.stringify(c)===JSON.stringify(x.cmp));
  const a = [x.k, x.p===d.p ? 0 : x.p, x.fa, x.fb, x.iA || 0, x.iB || 0, (x.hide || []).join(''), ci>=0 ? ci : ci===-1 && x.cmp==null ? -1 : x.cmp, x.fra || 0];
  while (a.length>1 && [0, null, '', undefined].includes(a[a.length-1])) a.pop(); return a.length===1 ? a[0] : a; }
function expande(a){ if (typeof a==='string') a = [a]; if (!Array.isArray(a)) return a; const [k, p, fa, fb, iA, iB, h, c, fra] = a; if (!CK[k]) return null;
  const s = nuevo(k, Object.assign({ fa:fa || null, fb:fb || null, iA:iA || 0, iB:iB || 0, hide:h ? h.split('') : [] }, p ? { p } : {}, { cmp:undefined }));
  if (p){ const L = CMP(k, s.p, s); s.cmp = L.length ? L[0] : null; }
  if (typeof c==='number') s.cmp = c<0 ? null : (CMP(k, s.p, s)[c] || s.cmp); else if (c && typeof c==='object') s.cmp = c;
  if (fra) s.fra = fra; return s; }
const slug = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
function liga(){ try { return location.origin+location.pathname+'?arma='+slug(TIT)+'-'+hoyISO()+'~'+b64u(JSON.stringify([TIT, PR.map(compacta)])); } catch(e){ return location.href; } }
async function whatsapp(){ const txt = '*'+TIT+'*\n'+frases().map((x, i) => (i+1)+'. '+x[1]).join('\n')+'\n'+liga();
  const tactil = matchMedia('(pointer:coarse)').matches && navigator.canShare && navigator.canShare({ files:[new File(['x'], 'a.pdf', { type:'application/pdf' })] });
  if (!tactil){ window.open('https://wa.me/?text='+encodeURIComponent(txt), '_blank'); const doc = await pdf(); if (doc){ doc.save(nombre()); toast('Se abrió WhatsApp; adjunta el PDF que se descargó'); } return; }
  const doc = await pdf(); if (!doc) return; const file = new File([doc.output('blob')], nombre(), { type:'application/pdf' }); try { await navigator.share({ files:[file], title:TIT, text:txt }); } catch(e){} }
async function copiarLiga(){ if (!PR.length){ toast('Agrega al menos una lámina'); return; } const u = liga(); try { await navigator.clipboard.writeText(u); toast('Liga copiada: abre este informe con los datos del día'); } catch(e){ prompt('Copia la liga', u); } }

/* ==== [9] PÁGINA Y ARRANQUE ======================================= */
let HZ = [];
function hallazgos(){ const L = []; ['rep','resc','ing','seg','tram','cbp','rec'].filter(k => CK[k]).forEach(k => { const s = nuevo(k); if (!s.cmp) return; const P = PER(k, s)[s.p], V = T_(k, P.a, P.b), W = T_(k, s.cmp.a, s.cmp.b); if (!W || V<100) return; L.push({ s, r:V/W-1, V, W, k }); });
  if (CK.rep){ const s = nuevo('rep', { fb:'Aérea (vuelos PRIM)' }); if (s.cmp){ const P = PER('rep', s)[s.p], F = filtros(s), V = T_('rep', P.a, P.b, F), W = T_('rep', s.cmp.a, s.cmp.b, F); if (W) L.push({ s, r:V/W-1, V, W, k:'rep', t:'Repatriados por avión' }); } }
  return L.sort((a, b) => Math.abs(b.r)-Math.abs(a.r)).slice(0, 4).map(x => ({ s:x.s, r:x.r, t:(x.t || CK[x.k].t)+(Math.abs(x.r)<0.01 ? ': prácticamente igual' : (x.r<0 ? ' bajan ' : ' suben ')+pc(x.r)+'%'), d:f(x.W)+' → '+f(x.V)+' · contra '+x.s.cmp.lab })); }
const ICON = { Control:'<path d="M2 11l16-6-6 14-2-6z" fill="currentColor"/>', Protección:'<circle cx="10" cy="7" r="3.5" fill="currentColor"/><path d="M3 18c1-4 4-6 7-6s6 2 7 6" fill="currentColor"/>',
  Regulación:'<rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M7 7h6M7 11h6" stroke="currentColor" stroke-width="2"/>', 'Desde EE. UU.':'<path d="M3 15l4-5 4 3 6-8" stroke="currentColor" stroke-width="2" fill="none"/>' };
function pintar(host){ HOST = host; HZ = hallazgos();
  const areas = [...new Set(CONC.map(c => c.area))];
  host.innerHTML = '<div class="ar">'+
    '<div class="ar-band"><div class="ar-ey">Informes</div><h1>Arma tu informe</h1><p>Escribe lo que quieres ver o toca un concepto. La lámina sale armada; ajústala tocándola y súmala a tu informe.</p>'+
      '<div class="ar-sw"><div class="ar-srch"><svg width="18" height="18" fill="none" stroke="#8A857A" stroke-width="2"><circle cx="8" cy="8" r="6"/><path d="M12.5 12.5l4 4"/></svg><input id="ar-q" autocomplete="off" placeholder="Un país, estado, aeropuerto u oficina… o una frase: «rescatados cubanos en Chiapas»"><span class="k">Enter</span></div><div class="ar-dd" id="ar-dd"></div></div>'+
      (HZ.length ? '<details class="ar-hz"><summary>La plataforma detectó <b>'+HZ.length+' cambios importantes</b> contra el año pasado · <span>'+(HZ[0].r<0 ? '▼ ' : '▲ ')+pc(HZ[0].r)+'%</span> '+esc(HZ[0].t.toLowerCase())+'<i>▾</i></summary>'+
        HZ.map((x, i) => '<div class="ar-hzr"><b class="'+(x.r<0 ? 'neg' : 'pos')+'">'+(x.r<0 ? '▼ ' : '▲ ')+pc(x.r)+'%</b><div><strong>'+esc(x.t)+'</strong><span>'+esc(x.d)+'</span></div><button data-hv="'+i+'">Ver</button><button class="pri" data-ha="'+i+'">＋</button></div>').join('')+'</details>' : '')+'</div>'+
    '<div class="ar-sec"><div class="ar-ey">O toca un concepto · tócalo otra vez para quitarlo</div><div class="ar-areas">'+areas.map(ar => '<div><h4 style="color:'+COLA[ar][0]+'"><i style="background:'+COLA[ar][0]+'"></i>'+esc(ar)+'</h4>'+
      CONC.filter(c => c.area===ar).map(c => { const y = finK(c.k).slice(0,4); return '<button class="ar-cb" data-ark="'+c.k+'"><span class="ic" style="background:'+COLA[ar][1]+';color:'+COLA[ar][0]+'"><svg width="18" height="18" viewBox="0 0 20 20">'+ICON[ar]+'</svg></span><span class="tx"><b>'+esc(c.t)+'</b></span><span class="n">'+f(y26(c.k))+'<small>'+esc(c.u)+' en '+y+'</small></span></button>'; }).join('')+'</div>').join('')+'</div></div>'+
    '<div class="ar-sec" id="ar-lsec"><div class="ar-lam" id="ar-lam"></div><div class="ar-acts"><button class="ar-btn bv" id="ar-add" hidden>＋ Agregar a mi informe</button><button class="ar-btn bo" id="ar-full" hidden>⤢ Ver como se presenta</button></div></div>'+
    '<div class="ar-tray"><div class="ar-tt"><input id="ar-tit" value="'+esc(TIT)+'" aria-label="Título de tu informe" title="Título de la portada"><div id="ar-tc">vacío</div></div><div class="ar-tl" id="ar-tl"></div>'+
      '<div class="ar-tb"><button class="ar-btn bk" id="ar-liga"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>Liga</span></button><button class="ar-btn bk" id="ar-pdf"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>PDF</span></button><button class="ar-btn bw" id="ar-wa"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2a8.7 8.7 0 0 0-7.5 13.1L3.3 20.8l4.6-1.2A8.7 8.7 0 1 0 12 3.2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 8.3c.2-.4.5-.4.7-.4h.5c.2 0 .4.1.5.4l.6 1.5c.1.2 0 .4-.1.6l-.5.6c-.1.1-.1.3 0 .5.6 1 1.4 1.8 2.5 2.4.2.1.4.1.5-.1l.6-.7c.1-.2.4-.2.6-.1l1.4.7c.2.1.4.3.3.6-.1.9-.9 1.7-1.9 1.7-2.8 0-5.9-3-5.9-5.8 0-.7.1-1.3.2-1.9z" fill="currentColor"/></svg><span>WhatsApp</span></button><button class="ar-btn bp" id="ar-pres">▶ Presentar</button></div></div>'+
    '<div class="ar-vis" id="ar-vis"><div class="ar-vbar"><div><b id="ar-vh"></b><br><small id="ar-vt"></small></div><span class="sp"></span><button class="inf-nb ar-vnb" id="ar-vnb" hidden title="Ver la narrativa de esta lámina"><svg viewBox="0 0 24 24"><path d="M5 7h14M5 12h10M5 17h7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>Narrativa</span><b></b></button><button class="ar-btn bk" id="ar-vx">✕ Cerrar</button></div>'+
      '<button class="ar-va" style="left:16px" id="ar-vp">‹</button><button class="ar-va" style="right:16px" id="ar-vn">›</button><div class="ar-stage"><div class="ar-fr" id="ar-fr"></div></div></div>'+
    '<div class="ar-toast" id="ar-toast"></div></div>';
  const lam = $('ar-lam'); lam.addEventListener('click', clic);
  // buscador de cada combo: filtra mientras escribes (sin acentos ni mayúsculas); Enter elige la primera opción visible
  const etq = x => { const em = x.querySelector('em'); return norm(em ? x.textContent.slice(0, -em.textContent.length) : x.textContent); };
  lam.addEventListener('input', ev => { if (!ev.target.classList.contains('ar-pf')) return; const t = norm(ev.target.value.trim()), pp = ev.target.closest('.ar-pop'); let n = 0;
    pp.querySelectorAll('button[data-o]').forEach(x => { const si = !t || etq(x).includes(t); x.classList.toggle('ar-off', !si); if (si) n++; });
    pp.querySelectorAll('.t').forEach(z => z.classList.toggle('ar-off', !!t)); let v = pp.querySelector('.ar-nada'); if (!v){ v = document.createElement('div'); v.className = 'ar-nada'; v.textContent = 'Sin coincidencias'; pp.appendChild(v); } v.classList.toggle('on', !n); });
  lam.addEventListener('keydown', ev => { if (!ev.target.classList.contains('ar-pf') || ev.key!=='Enter') return; ev.preventDefault(); const x = [...ev.target.closest('.ar-pop').querySelectorAll('button[data-o]:not(.ar-off)')][0]; x && x.click(); });
  lam.addEventListener('focusout', ev => { if (ev.target.dataset && ev.target.dataset.fra!=null && S){ const t = ev.target.innerText.trim(); if (t && t!==lam._fra) S.fra = t; else delete S.fra; marca(); } });
  lam.addEventListener('keydown', ev => { if (ev.target.dataset && ev.target.dataset.fra!=null && ev.key==='Enter'){ ev.preventDefault(); ev.target.blur(); } });
  host.addEventListener('click', ev => { if (!ev.target.closest('.ar-pop')) host.querySelectorAll('.ar-pop.on').forEach(x => x.classList.remove('on')); if (!ev.target.closest('.ar-sw')) $('ar-dd').classList.remove('on'); });
  host.querySelectorAll('[data-ark]').forEach(x => x.addEventListener('click', () => { if (S && S.k===x.dataset.ark){ S = null; draw(); toast('Selección quitada'); return; } S = nuevo(x.dataset.ark); draw(true); }));
  host.querySelectorAll('[data-hv]').forEach(x => x.addEventListener('click', () => { S = cp(HZ[+x.dataset.hv].s); draw(true); }));
  host.querySelectorAll('[data-ha]').forEach(x => x.addEventListener('click', () => agrega(HZ[+x.dataset.ha].s)));
  const q = $('ar-q'), dd = $('ar-dd'); q.addEventListener('input', pinta); q.addEventListener('focus', pinta);
  q.addEventListener('keydown', e => { if (!SG.length) return; if (e.key==='ArrowDown' || e.key==='ArrowUp'){ e.preventDefault(); SEL = (SEL+(e.key==='ArrowDown' ? 1 : SG.length-1))%SG.length; dd.querySelectorAll('[data-s]').forEach(b => b.classList.toggle('ar-sel', +b.dataset.s===SEL)); }
    if (e.key==='Enter' && SG[SEL]) usar(SG[SEL]); if (e.key==='Escape'){ dd.classList.remove('on'); q.blur(); } });
  dd.addEventListener('mousedown', e => e.preventDefault()); dd.addEventListener('click', ev => { const b = ev.target.closest('[data-s]'); if (b) usar(SG[+b.dataset.s]); });
  $('ar-add').addEventListener('click', () => agrega(S)); $('ar-full').addEventListener('click', () => S && abrirV([cp(S)], 'Así se presenta'));
  $('ar-tit').addEventListener('input', e => { TIT = e.target.value.trim() || 'Informe IA-NAMI'; });
  $('ar-pres').addEventListener('click', () => { if (!PR.length){ toast('Agrega al menos una lámina'); return; } abrirV(completo()); });
  $('ar-pdf').addEventListener('click', bajar); $('ar-wa').addEventListener('click', whatsapp); $('ar-liga').addEventListener('click', copiarLiga);
  $('ar-vx').addEventListener('click', cerrarV); $('ar-vn').addEventListener('click', () => { if (VI<VL.length-1){ VI++; vshow(); } }); $('ar-vp').addEventListener('click', () => { if (VI>0){ VI--; vshow(); } });
  $('ar-vnb').addEventListener('click', vnar);
  $('ar-fr').addEventListener('click', e => { const li = e.target.closest('[data-arir]'); if (li){ VI = +li.dataset.arir; vshow(); } });
  const vis = $('ar-vis'); let sx = null, sy = null; const ini = (x, y) => { sx = x; sy = y; }, fin = (x, y) => { if (sx==null) return; const d = x-sx, dy = y-sy; sx = null; if (Math.abs(d)>50 && Math.abs(d)>Math.abs(dy)) $(d<0 ? 'ar-vn' : 'ar-vp').click(); };
  // con mouse, arrastrar; con el dedo, deslizar (los eventos táctiles no se pierden aunque la gráfica capture el toque)
  vis.addEventListener('pointerdown', e => { if (e.pointerType!=='touch') ini(e.clientX, e.clientY); }); vis.addEventListener('pointerup', e => { if (e.pointerType!=='touch') fin(e.clientX, e.clientY); });
  vis.addEventListener('touchstart', e => { if (e.touches.length===1) ini(e.touches[0].clientX, e.touches[0].clientY); else sx = null; }, { passive:true });
  vis.addEventListener('touchend', e => fin(e.changedTouches[0].clientX, e.changedTouches[0].clientY), { passive:true });
  // Liga compartida
  const m = location.search.match(/[?&]arma=([^&]+)/); if (m){ try { const v = decodeURIComponent(m[1]);
      if (v.includes('~')){ const o = JSON.parse(ub64(v.slice(v.lastIndexOf('~')+1))); TIT = o[0] || TIT; PR = (o[1] || []).map(expande).filter(x => x && CK[x.k]); }
      else { const o = JSON.parse(decodeURIComponent(escape(atob(v)))); TIT = o.t || TIT; PR = (o.l || []).filter(x => x && CK[x.k]); }
      $('ar-tit').value = TIT; LIGA = true; } catch(e){} }
  tray(); render(lam, S, true); marca(); if (m && PR.length) setTimeout(() => abrirV(completo()), 250); }
addEventListener('keydown', e => { const v = $('ar-vis'); if (!v || !v.classList.contains('on')) return; if (e.key==='ArrowRight') $('ar-vn').click(); if (e.key==='ArrowLeft') $('ar-vp').click(); if (e.key==='Escape') cerrarV(); });
addEventListener('resize', () => { document.querySelectorAll('.ar-gr').forEach(g => { const c = window.echarts && echarts.getInstanceByDom(g); c && c.resize(); }); const v = $('ar-vis'); if (v && v.classList.contains('on')) fit(); });

window.IANAMI_ARMA = { pintar, _prueba:{ CONC, PER, CMP, nuevo, render, tit, get S(){ return S; }, set S(x){ S = x; draw(); }, get PR(){ return PR; }, agrega, completo, buscar, frase } };
})();
