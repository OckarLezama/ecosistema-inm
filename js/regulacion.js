/* ==================================================================
   IA-NAMI · REGULACIÓN (DGRAM)
   Vista de la Dirección General de Regulación y Archivo Migratorio, con
   tres pestañas: Trámites, Documentos vigentes y Validación de actas del
   Registro Civil. Todo se calcula en la página sobre
   datos/regulacion.js (tabla diaria de trámites, cortes de documentos
   vigentes y solicitudes de validación).
   ÍNDICE  [1] DATOS Y FILTROS   [2] UTILIDADES Y COLORES
           [3] CONTROLES E INDICADORES   [4] TRÁMITES
           [5] DOCUMENTOS VIGENTES       [6] VALIDACIÓN DEL REGISTRO CIVIL
           [7] MONTAJE Y EVENTOS
   ================================================================== */
(function(){
'use strict';
const RG = window.IANAMI_REG; if (!RG) return;
// «Sin expedición» no es un documento: son trámites rechazados, cancelados o desistidos; se nombra así en toda la vista
{ const i = RG.condiciones.indexOf('Sin expedición'); if (i>=0) RG.condiciones[i] = 'Sin documento (rechazado o cancelado)'; }

/* ==== [1] DATOS Y FILTROS ========================================= */
const K = {}; Object.keys(RG.cols).forEach(k => { K[k] = Int32Array.from(RG.cols[k]); });
const NR = K.v.length, DIC = RG.dic, NE = DIC.e.length, NO = DIC.o.length, NN = DIC.n.length, NT = DIC.t.length, NC = RG.condiciones.length, NG = DIC.g.length, NRS = DIC.r.length;
const INI = new Date(RG.inicio+'T00:00:00'), DS = (INI.getDay()+6)%7;
const semDe = d => Math.floor((d+DS)/7), NSEM = semDe(RG.dias-1)+1, semIni = w => w*7-DS;
const mesDe = d => { const f = new Date(INI.getFullYear(), INI.getMonth(), INI.getDate()+d); return (f.getFullYear()-INI.getFullYear())*12 + f.getMonth()-INI.getMonth(); };
const EMP = 2;                                                     // sexo «Empleador»
const Q = { vista:'tram', doc:-1, nats:[], ests:[], per:'todo', d0:0, d1:RG.dias, cmp:'sem', pv:'res', pof:-1, gran:'auto', ofi:-1, ofiF:-1, mz:null, tot:'c', desg:'tot', det:false, tipoG:'l', eti:false, dvTodo:false, dvT:'e', dvOrd:null, vaB:null, perfil:[], fil:'n', col:'c',
            dvSel:null, vaF:null, mas:false, compacto:false };
Object.defineProperty(Q, 'est', { get(){ return Q.ests.length===1 ? Q.ests[0] : -1; }, set(v){ Q.ests = v>=0 ? [v] : []; } });
const estOk = e => !Q.ests.length || Q.ests.indexOf(e)>=0;
// Suma por clave. Filtros: documento, estado, oficina y nacionalidades; por omisión usa los elegidos (Q); o.doc / o.est / o.ofi / o.nats = null los quitan.
function agg(key, nk, o){
  o = o || {}; const out = new Float64Array(nk), d0 = o.d0!=null ? o.d0 : Q.d0, d1 = o.d1!=null ? o.d1 : Q.d1;
  const doc = o.doc!==undefined ? o.doc : Q.doc, est = o.est!==undefined ? o.est : (Q.ests.length ? Q.ests : null), es = Array.isArray(est) ? new Set(est) : null, of = o.ofi!==undefined ? o.ofi : Q.ofiF, ko = K.o, nsel = o.nats!==undefined ? o.nats : Q.nats, ns = nsel && nsel.length ? new Set(nsel) : null, ex = o.ex;
  const kd = K.d, kc = K.c, ke = K.e, kn = K.n, kv = K.v, fk = typeof key==='function';
  for (let i=0;i<NR;i++){ const d = kd[i]; if (d<d0 || d>=d1) continue;
    if (doc!=null && doc>=0 && kc[i]!==doc) continue; if (es ? !es.has(ke[i]) : (est!=null && est>=0 && ke[i]!==est)) continue; if (of!=null && of>=0 && ko[i]!==of) continue;
    if (ns && !ns.has(kn[i])) continue; if (ex && !ex(i)) continue;
    out[fk ? key(i) : key ? key[i] : 0] += kv[i]; }
  return out;
}
const tot = o => agg(null, 1, o)[0];
const personas = i => K.s[i]!==EMP;

/* ==== [2] UTILIDADES Y COLORES ==================================== */
const $ = id => document.getElementById(id), MES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const miles = n => Math.round(n).toLocaleString('en-US'), corto = n => n>=1e6 ? (n/1e6).toFixed(2)+' M' : n>=1e4 ? (n/1e3).toFixed(1)+' k' : miles(n);
const pct = (a,b) => b ? (a/b*100).toFixed(1) : '0.0', esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fDia = d => new Date(INI.getFullYear(), INI.getMonth(), INI.getDate()+d);
const fecha = d => { const f = fDia(d); return f.getDate()+' '+MES[f.getMonth()]; }, fechaA = d => { const f = fDia(d); return f.getDate()+' '+MES[f.getMonth()]+' '+f.getFullYear(); };
const iso = d => { const f = fDia(d); return f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0')+'-'+String(f.getDate()).padStart(2,'0'); };
const diaDe = s => Math.round((new Date(s+'T00:00:00') - INI)/864e5);
const semTxt = w => 'del '+fecha(Math.max(0,semIni(w)))+' al '+fecha(Math.min(RG.dias-1, semIni(w)+6));
// Tonos de la paleta institucional: verdes, rojos, arenas y grises
const COLD = ['#2F6657','#C4605A','#8FB0A4','#7E302B','#8F7F2E','#BDB58D','#E5B9B3','#5C5952','#9A958A','#55490F','#CFCBBB','#808080'];
const COLN = ['#2B2926','#A8443E','#766820'];
const corta = s => s.replace(' por parte de residentes','').replace('Expedición','Exp.').replace('documento migratorio','doc. migratorio');
const nomO = s => s.replace(/^(OR|SRL|SRF|RL|SR) /,'');
function graf(id, op){ const el = $(id); if (!el) return null; let ch = echarts.getInstanceByDom(el); if (!ch){ ch = echarts.init(el); new ResizeObserver(() => ch.resize()).observe(el); }
  ch.setOption(Object.assign({ textStyle:{ fontFamily:'Barlow, sans-serif', color:'#2B2926' }, animationDuration:800, animationDurationUpdate:600, animationEasingUpdate:'cubicInOut',
    tooltip:{ backgroundColor:'#2B2926', borderWidth:0, textStyle:{ color:'#F4F2EA', fontSize:12 }, extraCssText:'border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.25)' } }, op), true); return ch; }
const sinAcento = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
// Buscador con autocompletar, con el mismo comportamiento que el de Pulso
function autocompletar(inp, res, items, elegir){
  if (!inp) return; items.forEach(x => x.q = sinAcento(x.n)); let hall = [], act = 0;
  const pinta = () => { res.innerHTML = hall.length ? hall.map((x,i) => '<button type="button" data-i="'+i+'" class="'+(i===act?'act':'')+'"><span>'+esc(x.n)+'</span><small>'+x.t+'</small></button>').join('') : '<span class="mini" style="padding:6px 9px;display:block">Sin coincidencias</span>'; };
  inp.addEventListener('input', () => { const q = sinAcento(inp.value.trim()); if (!q){ res.hidden = true; return; }
    hall = items.filter(x => x.q.indexOf(q)===0).concat(items.filter(x => x.q.indexOf(q)>0)).slice(0,9); act = 0; res.hidden = false; pinta(); });
  inp.addEventListener('keydown', e => {
    if ((e.key==='ArrowDown' || e.key==='ArrowUp') && hall.length){ act = (act + (e.key==='ArrowDown' ? 1 : -1) + hall.length) % hall.length; pinta(); e.preventDefault(); }
    else if (e.key==='Enter'){ if (!res.hidden && hall[act]){ res.hidden = true; elegir(hall[act]); } e.preventDefault(); }
    else if (e.key==='Escape') res.hidden = true; });
  inp.addEventListener('blur', () => setTimeout(() => { res.hidden = true; }, 150));
  res.addEventListener('mousedown', e => { const b = e.target.closest('[data-i]'); if (b){ e.preventDefault(); res.hidden = true; elegir(hall[+b.dataset.i]); } });
}
const cajaBusca = (id, ph) => '<div class="busca rg-busca"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="'+id+'" type="search" autocomplete="off" placeholder="'+ph+'" aria-label="'+ph+'"><div class="res" id="'+id+'-r" hidden></div></div>';
// Filtros activos de Trámites (nacionalidades, estado, oficina) en negritas
const filtros = () => Q.nats.map(n => DIC.n[n]).concat(Q.ests.map(e => DIC.e[e]), Q.ofiF>=0 ? [nomO(DIC.o[Q.ofiF])] : []);
const filtrosTxt = () => filtros().map(x => '<b>'+esc(x)+'</b>').join(' · ');
// «Comparar con»: semana anterior (lunes a domingo completas), o los últimos N días contra los N previos
function ventanas(){ const N = Q.cmp;
  if (N==='sem'){ let w = semDe(Q.d1-1); if (semIni(w)+6 >= Q.d1) w--; const b = semIni(w); return b-7 >= Q.d0 ? [[b, b+7], [b-7, b]] : null; }
  return N==='aa' || 2*N > Q.d1-Q.d0 ? null : [[Q.d1-N,Q.d1],[Q.d1-2*N,Q.d1-N]]; }
const etqCmp = () => { const w = ventanas(); if (!w) return ''; return Q.cmp==='sem' ? 'la semana del '+fecha(w[0][0])+' al '+fecha(w[0][1]-1)+' (contra la anterior)' : Q.cmp===7 ? 'los últimos 7 días' : Q.cmp===90 ? 'los últimos 3 meses' : 'los últimos '+Q.cmp+' días'; };
const chipD = (a,b) => { if (!b) return '<span class="kc-d">—</span>'; const dl = (a/b-1)*100; return '<span class="kc-d'+(Math.abs(dl)>=20?' f':'')+'">'+(dl>=0?'▲ ':'▼ ')+Math.abs(dl).toFixed(1)+'%</span>'; };
const mov = m => '<span class="mv '+(m>0?'u':m<0?'d':'e')+'">'+(m>0?'▲'+m:m<0?'▼'+(-m):'=')+'</span>';
function lugares(key, nk, r, o){ const x = agg(key, nk, Object.assign({}, o, {d0:r[0], d1:r[1]})), l = Array.from(x).map((v,i)=>[i,v]).sort((a,b)=>b[1]-a[1]), p = {}; l.forEach((y,j) => p[y[0]] = j+1); return p; }
function temporadaEn(a, b){
  const T = window.IANAMI_TEMPORADAS || {}, n = {invierno:'las vacaciones de invierno', semana_santa:'Semana Santa', verano:'las vacaciones de verano'};
  for (const k of Object.keys(n)) for (const x of (T[k] || [])){ if (!x.inicio) continue; const i = diaDe(x.inicio), f = x.fin ? diaDe(x.fin) : i; if (i<=b && f>=a) return n[k]; }
  return '';
}

/* ==== [3] CONTROLES E INDICADORES (mismo diseño que Pulso) ========= */
const IC = { tot:'M4 7h16M4 12h16M4 17h10', tarj:'M3 6h18v12H3zM3 10h18M7 15h4', doc:'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
             acta:'M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h3', alerta:'M12 3l9 16H3zM12 10v4M12 17v.5', ok:'M5 12l4 4 10-10', reloj:'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM12 7v5l3 2' };
const svgI = d => '<span class="kc-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="'+d+'"/></svg></span>';
function minibarras(v){ const mx = Math.max.apply(null,v)||1; return '<span class="kc-b" aria-hidden="true">'+v.map((x,i) => '<i class="'+(i===v.length-1?'h':'p')+'" style="height:'+Math.max(8,x/mx*100).toFixed(0)+'%"></i>').join('')+'</span>'; }
// Tarjeta con el mismo marcado que las de Pulso: ícono, nombre, nota, cifra, variación y mini barras
function kc(o){
  const tag = o.attr ? 'button' : 'div';
  return '<'+tag+' class="kc'+(o.on?' on':'')+'"'+(o.attr||'')+' style="--g:'+o.col+';--gs:'+o.col+'1F;--ga:'+o.col+'"'+(o.title ? ' title="'+esc(o.title)+'"' : '')+'>'+
    '<span class="kc-top">'+svgI(o.ic)+(o.sub ? '<span class="kc-nf"><span class="kc-n">'+o.nom+'</span><span class="kc-f">'+o.sub+'</span></span>' : '<span class="kc-n">'+o.nom+'</span>')+'</span>'+
    '<span class="kc-v num"'+(o.num!=null ? ' data-v="'+o.num+'" data-f="'+(o.fmt||'c')+'"' : '')+'>'+o.val+'</span><span class="kc-pie">'+(o.d||'<span class="kc-d"></span>')+(o.b||'')+'</span></'+tag+'>';
}
// Las cifras de las tarjetas suben desde cero y las mini barras crecen, igual que en Pulso
function contar(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = Array.prototype.slice.call(document.querySelectorAll('.rg .kc-v[data-v]')), t0 = performance.now(), dur = 900;
  const paso = t => { const e = Math.min(1,(t-t0)/dur), f = 1-Math.pow(1-e,3);
    els.forEach(el => { if (el.isConnected){ const v = +el.dataset.v*f; el.textContent = el.dataset.f==='m' ? miles(v) : corto(v); } }); if (e<1) requestAnimationFrame(paso); };
  requestAnimationFrame(paso);
}
const plegar = () => '<button class="plegar" data-rplegar aria-label="'+(Q.compacto?'Mostrar tarjetas':'Compactar indicadores')+'" title="'+(Q.compacto?'Mostrar tarjetas':'Compactar indicadores')+'"><svg width="12" height="12" viewBox="0 0 12 12"><path d="'+(Q.compacto?'M2 4l4 4 4-4':'M2 8l4-4 4 4')+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
function htmlCtl(){
  const ok = n => n!=='aa' && n!=='sem' && 2*n <= Q.d1-Q.d0;
  return '<div class="pil">'+[['todo','Sheinbaum'],['trump','Trump'],['anio','Año'],['pers','Personalizado']].map(x => '<button data-rper="'+x[0]+'" class="'+(Q.per===x[0]?'on':'')+'"'+(x[0]==='trump'?' disabled title="Sin datos en ese periodo"':'')+'>'+x[1]+'</button>').join('')+'</div>'+
    (Q.per==='pers' ? '<span class="per-extra"><input type="date" id="rg-d0" value="'+iso(Q.d0)+'" min="'+iso(0)+'" max="'+iso(RG.dias-1)+'"> – <input type="date" id="rg-d1" value="'+iso(Q.d1-1)+'" min="'+iso(0)+'" max="'+iso(RG.dias-1)+'"></span>' : '')+
    '<div class="rango"><b>'+fechaA(Q.d0)+' – '+fechaA(Q.d1-1)+'</b><span>'+(Q.d1-Q.d0)+' días</span></div>'+
    '<label class="rg-sel">Comparar con <select id="rg-cmp">'+[['sem','Semana anterior'],[7,'7 días previos'],[30,'30 días previos'],[90,'3 meses previos'],['aa','Mismo periodo del año anterior']].map(x => { const ap = x[0]==='sem' ? (() => { const q = Q.cmp; Q.cmp = 'sem'; const w = ventanas(); Q.cmp = q; return !!w; })() : ok(x[0]);
      return '<option value="'+x[0]+'"'+(String(Q.cmp)===String(x[0])?' selected':'')+(ap?'':' disabled')+'>'+x[1]+(x[0]==='aa' ? ' (sin datos aún)' : '')+'</option>'; }).join('')+'</select></label>'+
    (Q.cmp==='sem' && ventanas() ? '<span class="rg-cmp-n">'+rangoTxt(ventanas()[0])+' contra '+rangoTxt(ventanas()[1])+'</span>' : '')+
    cajaBusca('rg-bus', 'Buscar nacionalidad, estado u oficina')+'<span class="rg-chips">'+Q.nats.map((n,j) => '<span class="tag-f" style="background:'+COLN[j]+'">'+esc(DIC.n[n])+' <button data-rquita="n'+n+'" aria-label="Quitar">×</button></span>').join('')+
      Q.ests.map((e,j) => '<span class="tag-f" style="background:'+(Q.ests.length>1 ? ['#2F6657','#C4605A','#8F7F2E'][j] : '#8F7F2E')+'">'+esc(DIC.e[e])+' <button data-rquita="e'+e+'" aria-label="Quitar">×</button></span>').join('')+
      (Q.ofiF>=0 ? '<span class="tag-f" style="background:#2F6657">'+esc(nomO(DIC.o[Q.ofiF]))+' <button data-rquita="o" aria-label="Quitar">×</button></span>' : '')+'</span>';
}

/* ==== [4] TRÁMITES ================================================ */
function pintarKpis(){
  const w = ventanas(), por = agg(K.c, NC, {doc:null}), T = por.reduce((a,b)=>a+b,0);
  const a = w ? agg(K.c, NC, {doc:null, d0:w[0][0], d1:w[0][1]}) : null, b = w ? agg(K.c, NC, {doc:null, d0:w[1][0], d1:w[1][1]}) : null;
  const sem = agg(i => semDe(K.d[i])*NC + K.c[i], NSEM*NC, {doc:null}), s0 = semDe(Q.d0), s1 = semDe(Q.d1-1);
  const serie = ids => { const v = []; for (let x=s0;x<=s1;x++) v.push(ids.reduce((t,c) => t+sem[x*NC+c], 0)); return v; }, suma = (arr, ids) => ids.reduce((t,c) => t+arr[c], 0);
  const todos = [...Array(NC).keys()], tarj = todos.slice(0, RG.tarjetas), otros = todos.slice(RG.tarjetas);
  const carta = (c, ids, nom, ic, col) => { const v = suma(por, ids);
    return kc({ attr:' data-rdoc="'+c+'" aria-pressed="'+(Q.doc===c)+'"', on:Q.doc===c, col:col, ic:ic, nom:nom, sub: c<0 ? 'en el periodo' : '', val:corto(v), num:v,
      d: w ? chipD(suma(a,ids), suma(b,ids)) : '', b:minibarras(serie(ids)), title:nom+': '+miles(v)+' trámites'+(c<0 ? '' : ' · '+pct(v,T)+'% del total') }); };
  const tO = suma(por, otros);
  $('rg-kpis').dataset.modo = Q.compacto ? 'compacto' : 'tarjetas';
  $('rg-kpis').innerHTML =
    '<div class="kg" style="flex:1 1 0;--g:#2B2926"><div class="eti" title="'+esc(['Total'].concat(filtros()).join(' · '))+'"><span class="eti-t">Total'+(filtros().length ? ' · '+filtrosTxt() : '')+'</span></div><div>'+carta(-1, todos, 'Todos los trámites', IC.tot, '#2B2926')+'</div></div>'+
    '<div class="kg g-reg" style="flex:'+RG.tarjetas+' 1 0"><div class="eti">Tarjetas · condición de estancia</div><div>'+tarj.map(c => carta(c, [c], RG.condiciones[c], IC.tarj, '#2F6657')).join('')+'</div></div>'+
    '<button class="rg-tog'+(Q.mas?' on':'')+'" data-rmas aria-expanded="'+Q.mas+'" title="'+(Q.mas?'Ocultar':'Ver')+' constancias y oficios"><span>Constancias<br>y oficios</span><b class="num">'+corto(tO)+'</b><i>'+(Q.mas?'‹':'›')+'</i></button>'+
    '<div class="kg rg-mas" style="--g:#5C5952"><div class="eti">Constancias y oficios</div><div>'+otros.map(c => carta(c, [c], RG.condiciones[c], IC.doc, '#5C5952')).join('')+'</div></div>'+plegar();
  if (Q.mas) abrirMas(false);
}
// Muestra u oculta constancias y oficios; la franja se desliza para dejarlas a la vista
function abrirMas(animar){
  const k = $('rg-kpis'), g = k && k.querySelector('.rg-mas'), t = k && k.querySelector('[data-rmas]'); if (!g) return;
  g.classList.toggle('abierto', Q.mas); t.classList.toggle('on', Q.mas); t.setAttribute('aria-expanded', Q.mas); t.querySelector('i').textContent = Q.mas ? '‹' : '›';
  if (Q.mas){ k.classList.add('ancho'); if (animar){ const f = Date.now(), paso = () => { k.scrollLeft = k.scrollWidth; if (Date.now()-f < 650) requestAnimationFrame(paso); }; requestAnimationFrame(paso); } else k.scrollLeft = k.scrollWidth; }
  else { k.scrollLeft = 0; setTimeout(() => { if (!Q.mas) k.classList.remove('ancho'); }, 620); }
}
function escala(){ const n = Q.d1-Q.d0; return Q.gran!=='auto' ? Q.gran : n<=31 ? 'd' : n<=183 ? 's' : 'm'; }
function cubetas(g){
  const b = g==='d' ? (d => d-Q.d0) : g==='s' ? (d => semDe(d)-semDe(Q.d0)) : (d => mesDe(d)-mesDe(Q.d0)), n = b(Q.d1-1)+1, lab = [];
  for (let i=0;i<n;i++){ if (g==='d') lab.push(fecha(Q.d0+i)); else if (g==='s') lab.push(fecha(Math.max(Q.d0, semIni(semDe(Q.d0)+i)))); else { const f = fDia(Q.d0); const m = new Date(f.getFullYear(), f.getMonth()+i, 1); lab.push(MES[m.getMonth()]+' '+String(m.getFullYear()).slice(2)); } }
  return { b:b, n:n, lab:lab };
}
// Negativos esperados por oficina según su mezcla de trámites (no contra el promedio simple)
let NEG = [];
const RESUELTO = DIC.r.map(x => ['Positivos','Negativos','Enviados a S.R.E.','Desistidos'].indexOf(x)>=0);
function negEsperado(){
  const iNeg = DIC.r.indexOf('Negativos'), iP = DIC.r.indexOf('En proceso'), o = {est:null, ofi:null, nats:Q.nats};
  const n = agg(i => K.o[i]*NT + K.t[i], NO*NT, Object.assign({}, o, {ex:i => RESUELTO[K.r[i]]})), ng = agg(i => K.o[i]*NT + K.t[i], NO*NT, Object.assign({}, o, {ex:i => K.r[i]===iNeg}));
  const nt = new Float64Array(NT), gt = new Float64Array(NT); for (let x=0; x<NO*NT; x++){ nt[x%NT] += n[x]; gt[x%NT] += ng[x]; }
  const out = [];
  for (let of=0; of<NO; of++){ let v = 0, neg = 0, esp = 0;
    for (let t=0; t<NT; t++){ const k = of*NT+t; v += n[k]; neg += ng[k]; if (nt[t]) esp += n[k]*gt[t]/nt[t]; }
    if (!v){ out.push(null); continue; }
    const pe = esp/v, po = neg/v, z = (po-pe)/Math.sqrt(Math.max(pe*(1-pe), 1e-4)/v);
    out.push({ v:v, po:po, pe:pe, alto: v>=300 && po-pe>0.02 && z>3 }); }
  return out;
}
let SERIE_DOC = {};                                                // documento → índice de su línea, para resaltarla desde la tarjeta
function pintarEvolucion(){
  const g = escala(), C = cubetas(g); let omitidos = 0;
  if (g==='d'){ const t = agg(i => K.d[i]-Q.d0, Q.d1-Q.d0, {}), con = Array.from(t).filter(x => x>0).sort((a,b)=>a-b), med = con.length ? con[con.length>>1] : 0, idx = new Int32Array(Q.d1-Q.d0).fill(-1), lab = [];
    for (let d=0; d<t.length; d++) if (t[d] >= med*0.15){ idx[d] = lab.length; lab.push(fecha(Q.d0+d)); } else omitidos++;
    C.b = d => idx[d-Q.d0]; C.n = lab.length; C.lab = lab; }
  const serie = o => Array.from(agg(i => C.b(K.d[i]), C.n, Object.assign({}, o, {ex:i => C.b(K.d[i])>=0}))), totS = v => v.reduce((a,b)=>a+b,0);
  const base = { type:'line', smooth:.4, showSymbol:true, symbol:'circle', symbolSize:C.n>40 ? 4 : 6, triggerLineEvent:true, emphasis:{ focus:'series' } }, series = [];
  SERIE_DOC = {};
  if (Q.nats.length){
    const t = serie({}); series.push(Object.assign({}, base, { name:(Q.doc>=0 ? RG.condiciones[Q.doc] : 'Total')+' '+corto(totS(t)), data:t, lineStyle:{ width:2, color:'#B5B0A3', type:'dashed' }, color:'#B5B0A3' }));
    Q.nats.forEach((n,j) => { const v = serie({nats:[n]}); series.push(Object.assign({}, base, { name:DIC.n[n]+' '+corto(totS(v)), data:v, lineStyle:{ width:2.6, color:COLN[j] }, color:COLN[j] })); });
  } else if (Q.doc<0){
    const por = agg(K.c, NC, {doc:null}), T = por.reduce((a,b)=>a+b,0), vis = [...Array(RG.tarjetas).keys()].filter(c => por[c]/T >= 0.005), resto = [...Array(NC).keys()].filter(c => vis.indexOf(c)<0);
    const m = agg(i => C.b(K.d[i])*NC + K.c[i], C.n*NC, {doc:null, ex:i => C.b(K.d[i])>=0});
    vis.forEach(c => { const v = C.lab.map((_,x) => m[x*NC+c]); SERIE_DOC[c] = series.length; series.push(Object.assign({}, base, { name:RG.condiciones[c]+' '+corto(totS(v)), data:v, lineStyle:{ width:2.4, color:COLD[c] }, color:COLD[c] })); });
    const v = C.lab.map((_,x) => resto.reduce((t,c) => t+m[x*NC+c],0)); resto.forEach(c => SERIE_DOC[c] = series.length);
    series.push(Object.assign({}, base, { name:'Constancias y oficios '+corto(totS(v)), data:v, lineStyle:{ width:2.4, color:'#A7A296' }, color:'#A7A296' }));
  } else {
    const v = serie({}), col = COLD[Q.doc], prom = totS(v)/Math.max(1,v.length);
    series.push(Object.assign({}, base, { name:RG.condiciones[Q.doc]+' '+corto(totS(v)), data:v, lineStyle:{ width:2.6, color:col }, color:col,
      areaStyle:{ color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:col+'40'},{offset:1,color:col+'04'}]) },
      markLine:{ silent:true, symbol:'none', lineStyle:{ color:'#9A958A', type:'dashed' }, label:{ formatter:'promedio '+corto(prom), color:'#5C5952', fontSize:10.5, position:'insideEndTop' }, data:[{ yAxis:Math.round(prom) }] } }));
  }
  // barras (apiladas cuando son todos los documentos) y valores en cada punto, a elección
  const barras = Q.tipoG==='b', apilar = barras && Q.doc<0 && !Q.nats.length, mxv = apilar ? Math.max.apply(null, C.lab.map((_,x) => series.reduce((t,s) => t+s.data[x], 0))) : Math.max.apply(null, series.map(s => Math.max.apply(null, s.data)));
  series.forEach(s => {
    if (barras){ const gris = s.lineStyle && s.lineStyle.type==='dashed'; Object.assign(s, { type:'bar', barMaxWidth:30, stack:apilar ? 't' : undefined, itemStyle:{ color:gris ? '#D8D3C4' : s.color, borderRadius:apilar ? 0 : [3,3,0,0] } }); delete s.areaStyle; delete s.smooth; }
    s.label = { show:Q.eti, position:apilar ? 'inside' : 'top', fontSize:9.5, color:apilar ? '#fff' : '#2B2926', formatter:p => !p.value || (apilar && p.value < mxv*0.06) ? '' : corto(p.value) };
  });
  const angosto = $('rg-evo').clientWidth < 560;
  let foco = null;
  const ch = graf('rg-evo', { tooltip:{ trigger:'axis', order:'valueDesc', axisPointer:{ type:barras ? 'shadow' : 'line' }, formatter:ps => '<b>'+(g==='s' ? 'Semana '+semTxt(semDe(Q.d0)+ps[0].dataIndex) : ps[0].name)+'</b><br>'+(foco!=null && ps.some(p => p.seriesIndex===foco) ? ps.filter(p => p.seriesIndex===foco) : ps).map(p => p.marker+esc(p.seriesName.replace(/ [\d.,]+( k| M)?$/,''))+': <b>'+miles(p.value)+'</b>').join('<br>') },
    legend:Object.assign({ left:0, textStyle:{fontSize:11, color:'#2B2926'}, icon:'roundRect', itemWidth:12, itemHeight:8, itemGap:16 }, angosto ? { top:0 } : { bottom:0 }),
    grid:{ left:46, right:16, top:angosto ? (series.length>2 ? 64 : 30) : (Q.eti ? 22 : 10), bottom:angosto ? 26 : (series.length>4 ? 80 : 52) },
    xAxis:{ type:'category', data:C.lab, boundaryGap:barras, axisTick:{show:false}, axisLine:{lineStyle:{color:'#C9C4B5'}}, axisLabel:{ color:'#5C5952', fontSize:10.5, hideOverlap:true } },
    yAxis:{ type:'value', axisLabel:{ color:'#5C5952', fontSize:10.5, formatter:v => miles(v) }, splitLine:{ lineStyle:{ color:'#EFECE1' } } }, dataZoom:[{ type:'inside' }], series:series });
  ch.off('mouseover'); ch.off('mouseout'); ch.off('globalout');
  ch.on('mouseover', p => { if (p.componentType==='series') foco = p.seriesIndex; }); ch.on('mouseout', () => { foco = null; }); ch.on('globalout', () => { foco = null; });
  $('rg-evo-t').textContent = Q.doc>=0 ? RG.condiciones[Q.doc] : Q.nats.length ? 'Trámites por nacionalidad' : 'Condiciones de estancia por tipo de documento';
  $('rg-evo-q').innerHTML = {d:'por día', s:'por semana', m:'por mes'}[g]+(omitidos ? ' (sin fines de semana ni festivos)' : '')+' · '+fechaA(Q.d0)+' – '+fechaA(Q.d1-1)+(Q.est>=0 || Q.ofiF>=0 ? ' · '+[Q.est>=0 ? DIC.e[Q.est] : '', Q.ofiF>=0 ? nomO(DIC.o[Q.ofiF]) : ''].filter(Boolean).map(x => '<b>'+esc(x)+'</b>').join(' · ') : '');
  document.querySelectorAll('[data-rgran]').forEach(b => b.classList.toggle('on', b.dataset.rgran===Q.gran));
  // resolución: porcentaje sobre los trámites ya resueltos; los que siguen en proceso van aparte
  const o = {nats:Q.nats}, r = agg(K.r, NRS, o), iP = DIC.r.indexOf('En proceso'), proc = iP>=0 ? r[iP] : 0, RES = r.reduce((a,b)=>a+b,0) - proc;
  const cr = {Positivos:'#2F6657', Negativos:'#C4605A', 'Enviados a S.R.E.':'#8F7F2E', Cancelados:'#9A958A', Desistidos:'#BDB58D'};
  $('rg-res').innerHTML = '<span class="rg-res-t" title="Porcentaje sobre los trámites ya resueltos">Resolución</span>'+Object.keys(cr).filter(x => DIC.r.indexOf(x)>=0).map(x => { const v = r[DIC.r.indexOf(x)];
      return '<span class="rg-res-i" title="'+esc(x)+': '+miles(v)+' de '+miles(RES)+' resueltos"><i style="background:'+cr[x]+'"></i>'+x.replace('Enviados a ','')+' <b class="num">'+pct(v,RES)+'%</b></span>'; }).join('')+
    '<span class="rg-res-p" title="Aún sin resolución; no entran en los porcentajes">En proceso <b class="num">'+miles(proc)+'</b></span>'+
    '<span class="rg-tools"><span class="pil chica"><button data-rtg="l" class="'+(barras?'':'on')+'">Líneas</button><button data-rtg="b" class="'+(barras?'on':'')+'">Barras</button></span>'+
    '<button class="rg-ib'+(Q.eti?' on':'')+'" data-reti aria-pressed="'+Q.eti+'" title="'+(Q.eti?'Ocultar':'Mostrar')+' valores en la gráfica">123</button></span>';
}
function filaRank(j, nom, v, T, mx, m, col, attr, on, pt){
  return '<'+(attr?'button':'div')+' class="rg-nr'+(on?' on':'')+'"'+(attr||'')+' style="--c:'+col+'"><span class="n">'+(pt ? '<i class="pt"></i>' : j+1)+'</span><span class="nm">'+esc(nom)+'<i style="width:'+(v/mx*100).toFixed(1)+'%"></i></span>'+(m==null ? '<span></span>' : mov(m))+'<span class="x">'+corto(v)+'</span><span class="p">'+pct(v,T)+'%</span></'+(attr?'button':'div')+'>';
}
function pintarTops(){
  const w = ventanas(), on = {ex:personas};
  { const v = agg(K.n, NN, on), T = v.reduce((a,b)=>a+b,0), l = Array.from(v).map((x,i)=>[i,x]).filter(x => x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,10), mx = l.length ? l[0][1] : 1;
    const ra = w ? lugares(K.n, NN, w[0], on) : null, rb = w ? lugares(K.n, NN, w[1], on) : null;
    $('rg-tn').innerHTML = l.map((x,j) => { const k = Q.nats.indexOf(x[0]); return filaRank(j, DIC.n[x[0]], x[1], T, mx, w ? rb[x[0]]-ra[x[0]] : null, k>=0 ? COLN[k] : '#2F6657', ' data-rnat="'+x[0]+'"', k>=0, k>=0); }).join('')+
      '<span class="nota">Clic en hasta 3 nacionalidades para verlas en la gráfica</span>'; }
  const oo = {est:null, nats:Q.nats}, e = agg(K.e, NE, oo), TE = e.reduce((a,b)=>a+b,0), le = Array.from(e).map((x,i)=>[i,x]).filter(x => x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,10), me = le.length ? le[0][1] : 1;
  const ea = w ? lugares(K.e, NE, w[0], oo) : null, eb = w ? lugares(K.e, NE, w[1], oo) : null;
  $('rg-te').innerHTML = le.map((x,j) => filaRank(j, DIC.e[x[0]], x[1], TE, me, w ? eb[x[0]]-ea[x[0]] : null, '#8F7F2E', ' data-ror="'+x[0]+'"', Q.ests.indexOf(x[0])>=0)).join('')+'<span class="nota">Clic para filtrar por O.R.</span>';
  const q = (Q.doc>=0 ? RG.condiciones[Q.doc] : 'Todos los trámites')+(w ? ' · ▲▼ lugares en '+Q.cmp+' días' : '');
  const fe = [Q.ests.map(e => DIC.e[e]).join(' + '), Q.ofiF>=0 ? nomO(DIC.o[Q.ofiF]) : ''].filter(Boolean).map(x => '<b>'+esc(x)+'</b>').join(' · '), fn = Q.nats.map(n => '<b>'+esc(DIC.n[n])+'</b>').join(', ');
  $('rg-tn-q').innerHTML = esc(q)+(fe ? ' · '+fe : ''); $('rg-te-q').innerHTML = esc(q)+(fn ? ' · '+fn : '');
}
// Análisis breve con la misma ventana que «Comparar»: variación, quién lidera (con margen) y tendencia; una alerta solo si la hay
function redactar(o, nom){
  const w = ventanas(), t = [], llenas = [];
  for (let k=semDe(Q.d0); k<=semDe(Q.d1-1); k++) if (semIni(k)>=Q.d0 && semIni(k)+6<Q.d1) llenas.push(k);
  let rA, rB, etq;
  if (w){ rB = {d0:w[0][0], d1:w[0][1]}; rA = {d0:w[1][0], d1:w[1][1]}; etq = Q.cmp===7 ? 'en los últimos 7 días' : Q.cmp===90 ? 'en los últimos 3 meses' : 'en los últimos '+Q.cmp+' días'; }
  else if (llenas.length>=2){ const u = llenas[llenas.length-1], p = llenas[llenas.length-2]; rB = {d0:semIni(u), d1:semIni(u)+7}; rA = {d0:semIni(p), d1:semIni(p)+7}; etq = 'en la última semana completa'; }
  else return ['El periodo es demasiado corto para comparar.'];
  const A = tot(Object.assign({}, o, rA)), B = tot(Object.assign({}, o, rB)), dl = A ? (B/A-1)*100 : 0, temp = temporadaEn(rB.d0, rB.d1-1);
  t.push((B>=A ? 'Suben' : 'Bajan')+' <strong>'+miles(Math.abs(B-A))+'</strong> '+nom+' '+etq+' frente al periodo previo ('+miles(A)+' → '+miles(B)+', '+(dl>=0?'+':'')+dl.toFixed(1)+'%)'+(temp ? '; coincide con '+temp : '')+'.');
  // líder: solo se dice que «sustituye» si le saca más de 5% al segundo
  const top2 = (key, nk, r) => { const x = Array.from(agg(key, nk, r)).map((v,i) => [i,v]).sort((a,b)=>b[1]-a[1]); return x[0][1] ? x : null; };
  const lider = (key, nk, ex, dic, que) => { const a = top2(key, nk, Object.assign({}, o, rA, ex)), b = top2(key, nk, Object.assign({}, o, rB, ex)); if (!a || !b) return '';
    const n1 = '<strong>'+esc(dic(b[0][0]))+'</strong>', mg = b[1][1] ? (b[0][1]-b[1][1])/b[1][1] : 1;
    if (mg < 0.05) return n1+' y '+esc(dic(b[1][0]))+' están prácticamente empatados'+que;
    return a[0][0]===b[0][0] ? n1+' sigue al frente'+que : n1+' sustituye a '+esc(dic(a[0][0]))+que; };
  const parte = [];
  if (!o.nats || o.nats.length!==1) parte.push(lider(K.n, NN, {ex:personas}, i => DIC.n[i], ''));
  if ((o.est==null || o.est<0) && Q.ofiF<0) parte.push(lider(K.e, NE, {}, i => DIC.e[i], ' como la O.R. con más '+nom));
  if (parte.filter(Boolean).length) t.push(parte.filter(Boolean).join('; ')+'.');
  // tendencia semanal (promedio de 3 semanas); si coincide con una temporada, se dice que es estacional
  if (llenas.length>=4){ const v = agg(i => semDe(K.d[i]), NSEM, o), ma = llenas.map((k,j) => j<2 ? null : (v[llenas[j-2]]+v[llenas[j-1]]+v[k])/3).filter(x => x!=null), off = llenas.length-ma.length;
    const sg = x => Math.abs(x)<0.015 ? 0 : Math.sign(x), dir = ma.length>1 && ma[ma.length-2] ? sg((ma[ma.length-1]-ma[ma.length-2])/ma[ma.length-2]) : 0; let j = ma.length-1;
    while (j>0 && ma[j-1] && sg((ma[j]-ma[j-1])/ma[j-1])===dir) j--;
    const desde = llenas[j+off], est = temporadaEn(semIni(desde), Q.d1-1);
    t.push(dir===0 ? 'Sin tendencia clara.' : est ? 'El '+(dir>0?'alza':'descenso')+' desde la semana '+semTxt(desde)+' coincide con '+est+': es estacional, no tendencia.' : 'Tendencia '+(dir>0?'ascendente':'descendente')+' desde la semana '+semTxt(desde)+'.'); }
  // alerta: oficina con negativos por encima de lo esperado para su mezcla de trámites
  const al = NEG.map((x,i) => x && x.alto && estOk(RG.ofiEst[i]) ? [i, x] : null).filter(Boolean).sort((a,b) => (b[1].po-b[1].pe)-(a[1].po-a[1].pe));
  if (al.length) t.push('⚠ <strong>'+esc(nomO(DIC.o[al[0][0]]))+'</strong> tiene '+(al[0][1].po*100).toFixed(1)+'% de negativos contra '+(al[0][1].pe*100).toFixed(1)+'% esperado por su mezcla de trámites'+(al.length>1 ? ' (y '+(al.length-1)+' oficina'+(al.length>2?'s':'')+' más)' : '')+'.');
  return t;
}
function pintarAnalisis(){
  const hay = Q.doc>=0 || Q.nats.length || Q.ests.length || Q.ofiF>=0;
  const quien = hay ? [Q.doc>=0 ? RG.condiciones[Q.doc] : ''].concat(filtros()).filter(Boolean).join(' · ') : 'Todos los trámites';
  $('rg-an').innerHTML = '<b class="l">Análisis<br><span>'+esc(quien)+'</span></b><p>'+redactar(hay ? {nats:Q.nats} : {doc:null, est:null}, 'trámites').join(' ')+'</p>';
}
function barrasHTML(lista, total, color){ const mx = lista.length ? lista[0][1] : 1;
  return lista.map(r => '<div class="barra pc"><span>'+esc(r[0])+' <small>'+pct(r[1],total)+'%</small></span><span class="b"><i style="width:'+(r[1]/mx*100).toFixed(1)+'%;background:'+color+'"></i></span><span class="x">'+corto(r[1])+'</span></div>').join(''); }
function pintarOficinas(){
  const iNeg = DIC.r.indexOf('Negativos'), iPos = DIC.r.indexOf('Positivos'), iP = DIC.r.indexOf('En proceso');
  const m = agg(i => K.o[i]*NRS + K.r[i], NO*NRS, {est:null, ofi:null, nats:Q.nats}), vol = o => { let t = 0; for (let r=0;r<NRS;r++) t += m[o*NRS+r]; return t; };
  const lista = []; for (let o=0;o<NO;o++){ if (!estOk(RG.ofiEst[o])) continue; const v = vol(o); if (v>0) lista.push([o, v]); }
  lista.sort((a,b)=>b[1]-a[1]);
  $('rg-of-q').textContent = (Q.ests.length ? Q.ests.map(e => DIC.e[e]).join(' + ')+' · '+lista.length+' oficinas' : 'Principales del país')+(Q.doc>=0 ? ' · '+RG.condiciones[Q.doc] : '')+' · % sobre resueltos';
  $('rg-of').innerHTML = '<div class="rg-of-h"><span>Oficina</span><span>Trámites</span><span>Resultado</span><span>Neg.</span></div>'+lista.slice(0, 10).map(x => { const o = x[0], v = x[1], res = DIC.r.reduce((t,_,r) => t+(RESUELTO[r] ? m[o*NRS+r] : 0), 0) || 1, pos = m[o*NRS+iPos], neg = m[o*NRS+iNeg], otr = Math.max(0, res-pos-neg), e = NEG[o], alto = e && e.alto;
    return '<button class="rg-of-r'+(Q.ofi===o || Q.ofiF===o ?' on':'')+'" data-rofi="'+o+'"><span>'+esc(nomO(DIC.o[o]))+'</span><span class="x">'+corto(v)+'</span>'+
      '<span class="rg-res2" title="Positivos '+pct(pos,res)+'% · negativos '+pct(neg,res)+'% · otros '+pct(otr,res)+'%"><i style="width:'+pct(pos,res)+'%;background:#2F6657"></i><i style="width:'+pct(neg,res)+'%;background:#C4605A"></i><i style="width:'+pct(otr,res)+'%;background:#D8D3C4"></i></span>'+
      '<span class="ng'+(alto?' alto':'')+'" title="'+(e ? 'Esperado por su mezcla de trámites: '+(e.pe*100).toFixed(1)+'%' : '')+'">'+(alto?'⚠ ':'')+pct(neg,res)+'%</span></button>'+
      (Q.ofi===o ? '<div class="rg-of-d">'+(() => { const t = agg(K.t, NT, {est:null, ofi:null, nats:Q.nats, ex:i => K.o[i]===o}), l = Array.from(t).map((y,i) => [corta(DIC.t[i]), y]).filter(y => y[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,5); return barrasHTML(l, v, '#7AA598'); })()+'</div>' : ''); }).join('')+
    '<span class="nota"><i class="sw" style="background:#2F6657"></i>positivos <i class="sw" style="background:#C4605A"></i>negativos <i class="sw" style="background:#D8D3C4"></i>otros · ⚠ negativos arriba de lo esperado para su mezcla de trámites · clic para ver sus trámites</span>';
}
function pintarTipoEdad(){
  const o = {nats:Q.nats}, T = tot(o), t = agg(K.t, NT, o), lt = Array.from(t).map((x,i)=>[i,x]).filter(x => x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,8), mt = lt.length ? lt[0][1] : 1, col = Q.doc>=0 ? COLD[Q.doc] : '#2F6657';
  $('rg-tipo').innerHTML = lt.map(x => '<div class="barra larga" title="'+esc(DIC.t[x[0]])+': '+miles(x[1])+'"><span>'+esc(corta(DIC.t[x[0]]))+' <small>'+pct(x[1],T)+'%</small></span><span class="b"><i style="width:'+(x[1]/mt*100).toFixed(1)+'%;background:'+col+'"></i></span><span class="x">'+corto(x[1])+'</span></div>').join('');
  const m = agg(i => K.s[i]*8 + K.a[i], 16, Object.assign({}, o, {ex:i => K.s[i]<2 && K.a[i]>=0})), H = Array.from(m.slice(0,8)), M = Array.from(m.slice(8,16)), th = H.reduce((a,b)=>a+b,0), tm = M.reduce((a,b)=>a+b,0), mx = Math.max.apply(null, H.concat(M))||1;
  $('rg-sx').innerHTML = '<span><b class="num">'+pct(th,th+tm)+'%</b> hombres</span><span class="r"><b class="num">'+pct(tm,th+tm)+'%</b> mujeres</span>';
  graf('rg-pir', { tooltip:{ trigger:'axis', axisPointer:{type:'shadow'}, formatter:ps => '<b>'+RG.edades[ps[0].dataIndex]+' años</b><br>Hombres '+miles(H[ps[0].dataIndex])+' · Mujeres '+miles(M[ps[0].dataIndex]) },
    grid:{ left:4, right:4, top:4, bottom:4, containLabel:true }, xAxis:{ type:'value', min:-mx*1.3, max:mx*1.3, show:false },
    yAxis:{ type:'category', data:RG.edades, axisTick:{show:false}, axisLine:{show:false}, axisLabel:{ fontSize:11, fontWeight:600, color:'#2B2926' } },
    series:[{ type:'bar', stack:'p', barWidth:'66%', data:H.map(v => -v), itemStyle:{ color:'#8A857A', borderRadius:[4,0,0,4] }, label:{ show:true, position:'left', fontSize:10, color:'#5C5952', formatter:p => corto(-p.value) } },
            { type:'bar', stack:'p', data:M, itemStyle:{ color:'#C4605A', borderRadius:[0,4,4,0] }, label:{ show:true, position:'right', fontSize:10, color:'#5C5952', formatter:p => corto(p.value) } }] });
}
// ¿Qué documento obtiene cada grupo? Cada barra es el 100% de sus trámites, repartido por el documento que resultó
const DIM = { n:['Nacionalidad', K.n, NN, i => DIC.n[i], personas, 'nacionalidad'], e:['O.R.', K.e, NE, i => DIC.e[i], null, 'O.R.'], o:['Oficina', K.o, NO, i => nomO(DIC.o[i]), null, 'oficina'], a:['Edad', K.a, 8, i => RG.edades[i]+' años', i => K.a[i]>=0, 'grupo de edad'] };
const I_SIN = RG.condiciones.indexOf('Sin documento (rechazado o cancelado)');
const nomMz = c => c===-1 ? 'Constancias y oficios' : c===-2 ? 'Sin documento (rechazado o cancelado)' : RG.condiciones[c];
const colMz = c => c===-1 ? '#A7A296' : c===-2 ? '#B9B3A4' : COLD[c];
const fondoMz = c => c===-2 ? 'repeating-linear-gradient(45deg,#CFCABD 0 4px,#E6E2D7 4px 8px)' : colMz(c);
let mzFoco = null;
function pintarMezcla(){
  const F = DIM[Q.fil] || DIM.n, G = RG.tarjetas, otrosC = [...Array(NC).keys()].slice(G).filter(c => c!==I_SIN), cols = [...Array(G).keys()].concat([-1, -2]);
  const o = {doc:null, ex:F[4]}; o.nats = Q.fil==='n' ? null : Q.nats; if (Q.fil==='e') o.est = null; if (Q.fil==='o'){ o.ofi = null; o.est = null; }
  const m = agg(i => F[1][i]*NC + K.c[i], F[2]*NC, o), val = (f,c) => c===-1 ? otrosC.reduce((t,k)=>t+m[f*NC+k],0) : c===-2 ? (I_SIN>=0 ? m[f*NC+I_SIN] : 0) : m[f*NC+c];
  let fil = []; for (let f=0; f<F[2]; f++){ let t = 0; for (let k=0;k<NC;k++) t += m[f*NC+k]; if (t >= (Q.fil==='a' ? 1 : 30)) fil.push([f,t]); }
  if (Q.fil==='n' && Q.nats.length) fil = fil.filter(x => Q.nats.indexOf(x[0])>=0);
  if (Q.fil==='e' && Q.ests.length) fil = fil.filter(x => Q.ests.indexOf(x[0])>=0);
  if (Q.fil==='o' && Q.ofiF>=0) fil = fil.filter(x => x[0]===Q.ofiF);
  if (Q.fil==='o' && Q.ests.length) fil = fil.filter(x => Q.ests.indexOf(RG.ofiEst[x[0]])>=0);
  if (Q.fil==='a') fil.sort((a,b)=>a[0]-b[0]); else fil = fil.sort((a,b)=>b[1]-a[1]).slice(0,12);
  if (Q.mz!=null) fil.sort((a,b) => val(b[0],Q.mz)/b[1] - val(a[0],Q.mz)/a[1]);
  $('rg-mz-t').textContent = '¿Qué documento obtiene cada '+F[5]+'?';
  $('rg-mz-sel').innerHTML = Object.keys(DIM).map(k => '<button data-rfil="'+k+'" class="'+(Q.fil===k?'on':'')+'">'+DIM[k][0]+'</button>').join('');
  $('rg-mz').innerHTML = fil.map(x => { const f = x[0], t = x[1], foco = Q.mz!=null ? Q.mz : cols.reduce((a,c) => val(f,c)>val(f,a) ? c : a, cols[0]);
      const dTxt = '<b class="num" style="color:'+colMz(foco)+'">'+pct(val(f,foco),t)+'%</b> '+esc(nomMz(foco));
      return '<div class="rg-mz-r"><span title="'+esc(F[3](f))+'">'+esc(F[3](f))+'</span><span class="rg-mz-b">'+cols.map(c => { const v = val(f,c), p = v/t*100;
        return v ? '<i data-c="'+c+'" data-w="'+v+'" data-p="'+p.toFixed(1)+'" style="flex:0 0 0;background:'+fondoMz(c)+(Q.mz!=null && Q.mz!==c ? ';opacity:.3' : '')+'" title="'+esc(nomMz(c))+': '+miles(v)+' · '+p.toFixed(1)+'%">'+(p>=12 ? Math.round(p)+'%' : '')+'</i>' : ''; }).join('')+
        '</span><span class="rg-mz-d" data-base="'+esc(dTxt)+'">'+dTxt+'</span><span class="x num">'+corto(t)+'</span></div>'; }).join('')+
    '<div class="rg-ley rg-mz-l"><span>Ordenar por:</span>'+cols.map(c => '<button data-rmz="'+c+'" class="'+(Q.mz===c?'on':'')+'"><i style="background:'+fondoMz(c)+'"></i>'+esc(nomMz(c))+'</button>').join('')+'</div>';
  $('rg-mz-q').innerHTML = 'Cada barra es el 100% de los trámites de la '+F[5]+', repartido por el documento que se emitió · pasa el cursor o toca un color para compararlo en todas · clic para ordenar'+(filtrosTxt() ? ' · '+filtrosTxt() : '');
  mzFoco = null;
  requestAnimationFrame(() => document.querySelectorAll('#rg-mz .rg-mz-b i').forEach((el, k) => { el.style.transitionDelay = Math.min(k*6, 360)+'ms'; el.style.flex = el.dataset.w+' 1 0'; }));
}
// Resalta un documento en todas las barras y muestra su porcentaje en cada renglón
function focoMezcla(c){
  if (c===mzFoco) return; mzFoco = c; const box = $('rg-mz'); if (!box) return;
  box.classList.toggle('foco', c!=null);
  const ps = c==null ? [] : Array.from(box.querySelectorAll('.rg-mz-b i[data-c="'+c+'"]')).map(i => +i.dataset.p);
  box.querySelectorAll('.rg-mz-r').forEach(r => { r.querySelectorAll('.rg-mz-b i').forEach(i => i.classList.toggle('f', c!=null && +i.dataset.c===c));
    const d = r.querySelector('.rg-mz-d'), s = c!=null ? r.querySelector('.rg-mz-b i[data-c="'+c+'"]') : null;
    const lug = s ? 1+ps.filter(p => p > +s.dataset.p).length : 0;
    d.innerHTML = c==null ? d.dataset.base : '<b class="num" style="color:'+colMz(c)+'">'+(s ? s.dataset.p : '0.0')+'%</b> '+esc(nomMz(c))+(lug ? ' <small>· '+lug+'.º de '+ps.length+'</small>' : ''); });
}
/* ---- Trámites: lectura del director --------------------------------
   titulares · línea de trámites concluidos · panel guía a la derecha:
   «Resumen» lleva de la mano (nacionalidad → O.R. → oficina → documento),
   «¿Qué cambió?» al tocar un punto, «¿Qué explica…?» al tocar un titular.  */
const MOV = [['n','Personas nuevas','#2F6657'], ['c','Cambios de condición','#8FB0A4'], ['r','Renovaciones y reposiciones','#BDB58D'], ['a','Avisos y permisos','#9A958A']];
const movDe = s => /^Regularización|^Visa|^Tarjeta visitante|por acuerdo/.test(s) ? 0 : /^Cambio/.test(s) ? 1 : /renovación|canje|^Reposición|ampliación/.test(s) ? 2 : 3;
const MOV_T = Int8Array.from(DIC.t.map(movDe));
const DESG = { tot:'Total', doc:'por documento', nat:'por nacionalidad', or:'por O.R.' };
const PAL5 = ['#2F6657','#C4605A','#8F7F2E','#7E302B','#8FB0A4'];
let PANEL = null;                                                  // punto tocado en la gráfica
const plural = (n, uno, varios) => n===1 ? uno : n+' '+varios;
const may = s => s ? s[0].toUpperCase()+s.slice(1) : s;
const rangoTxt = r => fecha(r[0])+' – '+fecha(r[1]-1);
function cubetasEvo(){
  const g = escala(), C = cubetas(g); let omitidos = 0;
  if (g==='d'){ const t = agg(i => K.d[i]-Q.d0, Q.d1-Q.d0, {}), con = Array.from(t).filter(x => x>0).sort((a,b)=>a-b), med = con.length ? con[con.length>>1] : 0, idx = new Int32Array(Q.d1-Q.d0).fill(-1), lab = [], dias = [];
    for (let d=0; d<t.length; d++) if (t[d] >= med*0.15){ idx[d] = lab.length; lab.push(fecha(Q.d0+d)); dias.push(Q.d0+d); } else omitidos++;
    C.b = d => idx[d-Q.d0]; C.n = lab.length; C.lab = lab; C.rango = k => [dias[k], dias[k]+1]; }
  else { const rg = []; for (let d=Q.d0; d<Q.d1; d++){ const k = C.b(d); if (!rg[k]) rg[k] = [d, d+1]; else rg[k][1] = d+1; } C.rango = k => rg[k]; }
  C.inc = C.lab.map((_,k) => { if (g==='d') return 0; const r = C.rango(k), n = r[1]-r[0]; if (g==='s') return n<7 ? n : !semNormal(semDe(r[0])) ? -1 : 0; return fDia(r[0]).getDate()!==1 || fDia(r[1]).getDate()!==1 ? n : 0; });
  C.g = g; C.omitidos = omitidos; C.u = {d:['día','días'], s:['semana','semanas'], m:['mes','meses']}[g]; return C;
}
const nomPunto = (C, k) => { const r = C.rango(k); return C.g==='d' ? fechaA(r[0]) : C.g==='s' ? 'semana del '+fecha(r[0])+' al '+fecha(r[1]-1) : (() => { const f = fDia(r[0]); return MES[f.getMonth()]+' '+f.getFullYear(); })(); };
function lineas(){
  const top = (key, nk, o, n) => Array.from(agg(key, nk, o)).map((v,i)=>[i,v]).filter(x => x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,n).map(x => x[0]);
  if (Q.desg==='doc') return top(K.c, NC, {doc:null}, 5).map((c,j) => ({ nom:RG.condiciones[c], col:PAL5[j], ex:i => K.c[i]===c, o:{doc:null} }));
  if (Q.desg==='nat'){ const ns = Q.nats.length ? Q.nats : top(K.n, NN, {ex:personas}, 5); return ns.map((n,j) => ({ nom:DIC.n[n], col:Q.nats.length ? COLN[j] : PAL5[j], ex:i => K.n[i]===n && personas(i), o:{nats:null} })); }
  if (Q.desg==='or' && Q.ests.length>=2) return Q.ests.map((e,j) => ({ nom:DIC.e[e], col:['#2F6657','#C4605A','#8F7F2E'][j], ex:i => K.e[i]===e, o:{est:null} }));
  if (Q.desg==='or'){ if (Q.est>=0 || Q.ofiF>=0) return top(K.o, NO, {}, 5).map((o,j) => ({ nom:nomO(DIC.o[o]), col:PAL5[j], ex:i => K.o[i]===o }));
    return top(K.e, NE, {}, 5).map((e,j) => ({ nom:DIC.e[e], col:PAL5[j], ex:i => K.e[i]===e })); }
  return [];
}
function pintarPrincipal(){
  const C = cubetasEvo(), L = lineas(), enC = i => C.b(K.d[i])>=0, serieDe = (ex, o) => Array.from(agg(i => C.b(K.d[i]), C.n, Object.assign({}, o, {ex:i => enC(i) && (!ex || ex(i))})));
  const tot = serieDe(null, {}), datos = L.map(x => serieDe(x.ex, x.o));
  const base = tot.filter((v,k) => { const r = C.rango(k); return !C.inc[k] && !temporadaEn(r[0], r[1]-1); }), mu = base.reduce((a,b)=>a+b,0)/Math.max(1,base.length), sd = Math.sqrt(base.reduce((a,b)=>a+(b-mu)*(b-mu),0)/Math.max(1,base.length));
  const temps = []; let ini = -1, nomT = '';
  C.lab.forEach((_,k) => { const r = C.rango(k), t = temporadaEn(r[0], r[1]-1); if (t && ini<0){ ini = k; nomT = may(t.replace(/^las /,'')); }
    if (ini>=0 && (!t || k===C.n-1)){ temps.push([{ xAxis:ini, name:nomT }, { xAxis:t ? k : k-1 }]); ini = -1; } });
  const solo = !L.length, verde = '#2F6657', pt = (v,k) => C.inc[k] ? { value:v, symbol:'emptyCircle', symbolSize:9 } : v;
  const marca = { silent:true, itemStyle:{ color:'rgba(154,149,138,.14)' }, label:{ color:'#5C5952', fontSize:11, fontWeight:600, position:'insideTop', distance:6 }, data:temps }, series = [];
  if (solo) series.push({ name:'Trámites concluidos', type:'line', smooth:.35, data:tot.map(pt), symbol:'circle', symbolSize:8, z:3, lineStyle:{ width:3, color:verde }, color:verde, itemStyle:{ borderColor:'#FCFBF7', borderWidth:2 },
    areaStyle:{ color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(47,102,87,.28)'},{offset:1,color:'rgba(47,102,87,.02)'}]) },
    label:{ show:Q.eti, position:'top', fontSize:10, color:'#2B2926', formatter:p => corto(p.value) }, markArea:marca });
  L.forEach((x,j) => series.push({ markArea:j===0 ? marca : undefined, name:x.nom, type:'line', smooth:.35, data:datos[j].map(pt), symbol:'circle', symbolSize:6, triggerLineEvent:true, lineStyle:{ width:2.6, color:x.col }, color:x.col, emphasis:{ focus:'series', lineStyle:{ width:4 } },
    label:{ show:Q.eti, position:'top', fontSize:9.5, color:x.col, formatter:p => corto(p.value) } }));
  if (solo) series.push({ name:'banda-a', type:'line', data:C.lab.map(() => Math.max(0, Math.round(mu-sd))), stack:'banda', lineStyle:{ opacity:0 }, symbol:'none', silent:true, z:1 },
                        { name:'banda-b', type:'line', data:C.lab.map(() => Math.round(mu+sd - Math.max(0, mu-sd))), stack:'banda', lineStyle:{ width:1, type:'dashed', color:'rgba(47,102,87,.35)' }, symbol:'none', silent:true, z:1, areaStyle:{ color:'rgba(47,102,87,.10)' } });
  let mesAnt = -1;
  const etiqueta = (v, k) => { const r = C.rango(k); if (!r) return v; const f = fDia(r[0]); if (C.g==='m') return '{m|'+MES[f.getMonth()]+'}\n{a|'+f.getFullYear()+'}';
    const nuevo = f.getMonth()!==mesAnt || k===0; mesAnt = f.getMonth(); return nuevo ? '{d|'+f.getDate()+'}\n{m|'+MES[f.getMonth()]+'}' : '{d|'+f.getDate()+'}'; };
  let foco = null;
  const ch = graf('rg-evo', { tooltip:{ trigger:'axis', axisPointer:{ type:'line', lineStyle:{ color:'#9A958A', type:'dashed' } }, formatter:ps => { ps = ps.filter(p => p.seriesName.indexOf('banda')<0); if (foco!=null && ps.some(p => p.seriesIndex===foco)) ps = ps.filter(p => p.seriesIndex===foco); const k = ps[0].dataIndex;
      const est = C.inc[k]===-1 ? 'Semana de cierre de oficinas: muy pocos trámites' : C.inc[k] ? 'Periodo incompleto: '+plural(C.inc[k], '1 día', 'días') : tot[k]>mu+sd ? 'Arriba de lo habitual' : tot[k]<mu-sd ? 'Abajo de lo habitual' : 'Dentro de lo habitual';
      return '<b>'+may(nomPunto(C, k))+'</b><br>'+ps.map(p => p.marker+esc(p.seriesName)+': <b>'+miles(p.value)+'</b>'+(solo ? '' : ' <span style="opacity:.7">('+pct(p.value, tot[k])+'%)</span>')).join('<br>')+'<br><span style="opacity:.75">'+(solo ? est+' · ' : '')+'toca para ver qué cambió</span>'; } },
    legend:solo ? { show:false } : { top:0, left:0, textStyle:{fontSize:11.5, color:'#2B2926'}, icon:'roundRect', itemWidth:14, itemHeight:4, itemGap:16, data:L.map(x => x.nom) },
    grid:{ left:52, right:20, top:solo ? 30 : 40, bottom:40 },
    xAxis:{ type:'category', data:C.lab, boundaryGap:false, axisTick:{show:false}, axisLine:{lineStyle:{color:'#C9C4B5'}}, splitLine:{ show:true, lineStyle:{ color:'#EEEBE2' } },
      axisLabel:{ color:'#5C5952', interval:C.n>16 ? 'auto' : 0, formatter:etiqueta, rich:{ d:{ fontSize:11, color:'#2B2926', lineHeight:15 }, m:{ fontSize:10.5, color:'#8F7F2E', fontWeight:600, lineHeight:14 }, a:{ fontSize:10, color:'#716D65' } } } },
    yAxis:{ type:'value', axisLabel:{ color:'#5C5952', fontSize:10.5, formatter:v => corto(v) }, splitLine:{ lineStyle:{ color:'#EEEBE2' } } }, series:series });
  $('rg-evo-t').textContent = solo ? 'Trámites concluidos' : 'Trámites concluidos '+(Q.desg==='or' && (Q.est>=0 || Q.ofiF>=0) ? 'por oficina' : DESG[Q.desg]);
  $('rg-evo-q').innerHTML = {d:'por día', s:'por semana', m:'por mes'}[C.g]+(C.omitidos ? ' (sin fines de semana ni festivos)' : '')+' · '+fechaA(Q.d0)+' – '+fechaA(Q.d1-1)+(filtrosTxt() ? ' · '+filtrosTxt() : '')+(Q.doc>=0 ? ' · <b>'+esc(RG.condiciones[Q.doc])+'</b>' : '');
  $('rg-evo-ley').innerHTML = solo ? '<span><i class="ln" style="background:#2F6657"></i>trámites concluidos</span><span><i class="bd"></i>rango habitual</span>'+(temps.length ? '<span><i class="tp"></i>temporada vacacional</span>' : '')+(C.inc.some(Boolean) ? '<span><i class="ic"></i>semana incompleta o de cierre</span>' : '') :
    '<span class="rg-cmp">'+(Q.desg==='nat' && Q.nats.length ? 'Las nacionalidades que elegiste' : 'Las 5 con más trámites en el periodo')+'. Pasa el cursor por una línea para ver solo esa.</span>';
  $('rg-desg').innerHTML = '<span>Ver</span><div class="pil chica">'+Object.keys(DESG).map(k => '<button data-rdesg="'+k+'" class="'+(Q.desg===k?'on':'')+'">'+DESG[k]+'</button>').join('')+'</div>'+
    '<div class="pil chica">'+[['auto','Auto'],['d','Día'],['s','Semana'],['m','Mes']].map(x => '<button data-rgran="'+x[0]+'" class="'+(Q.gran===x[0]?'on':'')+'">'+x[1]+'</button>').join('')+'</div>'+
    '<button class="rg-ib'+(Q.eti?' on':'')+'" data-reti title="'+(Q.eti?'Ocultar':'Mostrar')+' valores">123</button>';
  let bajo = null; ch.off('mouseover'); ch.off('mouseout'); ch.off('globalout'); ch.getZr().off('click');
  ch.on('mouseover', p => { if (p.componentType==='series' && !solo && p.seriesIndex<L.length){ bajo = p.seriesIndex; foco = p.seriesIndex; } }); ch.on('mouseout', () => { bajo = null; foco = null; }); ch.on('globalout', () => { foco = null; });
  ch.getZr().on('click', e => { if (!ch.containPixel({ gridIndex:0 }, [e.offsetX, e.offsetY])) return; const k = Math.round(ch.convertFromPixel({ gridIndex:0 }, [e.offsetX, e.offsetY])[0]);
    if (isNaN(k) || k<0 || k>=C.n) return; PANEL = { k:k, s:bajo }; Q.pv = 'sem'; pintarPanel(); });
  pintarPrincipal._ctx = { C:C, L:L, mu:mu, sd:sd };
}
/* ---- panel guía ---- */
const filaP = (nom, v, T, mx, attr, col) => '<button class="rg-pb"'+attr+'><span>'+esc(nom)+'</span><span class="b"><i style="width:'+(v/mx*100).toFixed(1)+'%;background:'+(col||'#2F6657')+'"></i></span><b class="num">'+corto(v)+'</b><em>'+pct(v,T)+'%</em></button>';
function lista(key, nk, o, n, nom, attr, col){ const x = Array.from(agg(key, nk, o)).map((v,i)=>[i,v]).filter(y => y[1]>0).sort((a,b)=>b[1]-a[1]), T = x.reduce((a,y)=>a+y[1],0), l = x.slice(0,n), mx = l.length ? l[0][1] : 1;
  return { html:l.map(y => filaP(nom(y[0]), y[1], T, mx, attr(y[0]), col)).join(''), n:x.length, top:x }; }
function cabeza(sub, tit, volver){ return '<div class="rg-pnl-h"><div><span class="mini">'+sub+'</span><h3>'+tit+'</h3></div>'+(volver ? '<button class="rg-x" data-rvolver aria-label="Volver al resumen" title="Volver al resumen">×</button>' : '')+'</div>'; }
function panelResumen(){
  const T = tot({}), pasos = [], hay = Q.nats.length || Q.ests.length || Q.ofiF>=0 || Q.doc>=0;
  // frase del cruce actual
  let frase = '<b class="num">'+miles(T)+'</b> trámites'+(hay ? '' : ' en todo el país')+(Q.nats.length>=2 ? ' entre las '+Q.nats.length+' nacionalidades' : Q.ests.length>=2 ? ' entre '+Q.ests.map(e => esc(DIC.e[e])).join(Q.ests.length===2 ? ' y ' : ', ').replace(/, ([^,]*)$/, ' y $1') : '')+'.';
  if (hay){ const docs = Array.from(agg(K.c, NC, {doc:null})).map((v,i)=>[i,v]).sort((a,b)=>b[1]-a[1]), TD = docs.reduce((a,x)=>a+x[1],0);
    frase += Q.doc<0 && TD ? ' Sobre todo '+docs.slice(0,2).filter(x => x[1]>0).map(x => '<b>'+esc(RG.condiciones[x[0]])+'</b> ('+pct(x[1],TD)+'%)').join(' y ')+'.' : '';
    if (Q.nats.length===1 && (Q.est>=0 || Q.ofiF>=0)){ const r = Array.from(agg(K.n, NN, {nats:null, ex:personas})).map((v,i)=>[i,v]).sort((a,b)=>b[1]-a[1]), lug = r.findIndex(x => x[0]===Q.nats[0])+1;
      if (lug) frase += ' Es la <b>'+lug+'.ª</b> nacionalidad en '+esc(Q.est>=0 ? DIC.e[Q.est] : nomO(DIC.o[Q.ofiF]))+'.'; } }
  if (!T){ $('rg-pnl').innerHTML = '<div class="rg-pnl-fijo">'+cabeza('Resumen del periodo', filtros().concat(Q.doc>=0 ? [RG.condiciones[Q.doc]] : []).map(esc).join(' · '), false)+'</div><p class="rg-pnl-n">No hay trámites con esta combinación en el periodo. Quita un filtro para ampliar la búsqueda.</p><button class="rg-limpia" data-rlimpia>Quitar todos los filtros</button>'; return; }
  if (Q.nats.length>=2){ const filas = Q.nats.map((n,j) => { const o = {nats:[n]}, t = tot(o), d = Array.from(agg(K.c, NC, Object.assign({doc:null}, o))).map((v,i)=>[i,v]).sort((a,b)=>b[1]-a[1])[0],
        e = Array.from(agg(K.e, NE, o)).map((v,i)=>[i,v]).sort((a,b)=>b[1]-a[1])[0], sx = agg(K.s, 3, o);
      return '<tr><th><i class="sw" style="background:'+COLN[j]+'"></i>'+esc(DIC.n[n])+'</th><td class="num">'+miles(t)+'</td><td>'+(d && d[1] ? esc(RG.condiciones[d[0]])+' <small>'+pct(d[1], tot(Object.assign({doc:null}, o)))+'%</small>' : '—')+'</td><td>'+(e && e[1] ? esc(abr(DIC.e[e[0]]))+' <small>'+pct(e[1],t)+'%</small>' : '—')+'</td><td>'+pct(sx[1], sx[0]+sx[1])+'%</td></tr>'; }).join('');
    pasos.push('<h4>Comparación<small>cada una por separado</small></h4><table class="rg-cmpt"><thead><tr><th></th><th>Trámites</th><th>Documento principal</th><th>O.R. principal</th><th>Mujeres</th></tr></thead><tbody>'+filas+'</tbody></table>'+
      '<p class="rg-base">Lo de abajo (y el detalle) suma las '+Q.nats.length+' nacionalidades juntas.</p>'); }
  if (Q.ests.length>=2 && Q.nats.length<2){ const filas = Q.ests.map((e,j) => { const o = {est:[e]}, t = tot(o), d = Array.from(agg(K.c, NC, Object.assign({doc:null}, o))).map((v,i)=>[i,v]).sort((a,b)=>b[1]-a[1])[0],
        n = Array.from(agg(K.n, NN, Object.assign({ex:personas}, o))).map((v,i)=>[i,v]).sort((a,b)=>b[1]-a[1])[0], sx = agg(K.s, 3, o);
      return '<tr><th><i class="sw" style="background:'+['#2F6657','#C4605A','#8F7F2E'][j]+'"></i>'+esc(abr(DIC.e[e]))+'</th><td class="num">'+miles(t)+'</td><td>'+(d && d[1] ? esc(RG.condiciones[d[0]])+' <small>'+pct(d[1], tot(Object.assign({doc:null}, o)))+'%</small>' : '—')+'</td><td>'+(n && n[1] ? esc(DIC.n[n[0]])+' <small>'+pct(n[1],t)+'%</small>' : '—')+'</td><td>'+pct(sx[1], sx[0]+sx[1])+'%</td></tr>'; }).join('');
    pasos.push('<h4>Comparación<small>cada O.R. por separado</small></h4><table class="rg-cmpt"><thead><tr><th></th><th>Trámites</th><th>Documento principal</th><th>Nacionalidad principal</th><th>Mujeres</th></tr></thead><tbody>'+filas+'</tbody></table>'+
      '<p class="rg-base">Lo de abajo (y el detalle) suma las '+Q.ests.length+' O.R. juntas.</p>'); }
  const sec = (t, q, cuerpo) => '<h4>'+t+'<small>'+q+'</small></h4>'+cuerpo;
  if (Q.nats.length<3){ const l = lista(K.n, NN, {nats:null, ex:personas}, 6, i => DIC.n[i], i => ' data-rpn="'+i+'"'+(Q.nats.indexOf(i)>=0 ? ' disabled' : ''), '#2F6657');
    l.html += '<button class="rg-vert" data-rvert="n">Ver las '+Math.min(l.n,30)+(l.n>30 ? ' y otras' : '')+' ›</button>';
    pasos.push(sec(Q.nats.length ? '¿Agregar otra nacionalidad?' : '¿De qué nacionalidad?', Q.nats.length ? 'hasta 3 para comparar' : 'toca una para filtrar', l.html)); }
  if (Q.ests.length<3 && Q.ofiF<0){ const l = lista(K.e, NE, Q.ests.length ? {est:null} : {}, 6, i => DIC.e[i], i => ' data-rpe="'+i+'"'+(Q.ests.indexOf(i)>=0 ? ' disabled' : ''), '#8F7F2E'); l.html += '<button class="rg-vert" data-rvert="e">Ver las '+l.n+' ›</button>'; pasos.push(sec(Q.ests.length ? '¿Comparar con otra O.R.?' : '¿En qué O.R.?', Q.ests.length ? 'hasta 3 para comparar' :  Q.nats.length>=2 ? 'las '+Q.nats.length+' juntas' : 'toca una para filtrar', l.html)); }
  if (Q.est>=0 && Q.ofiF<0){ const l = lista(K.o, NO, {}, 6, i => nomO(DIC.o[i]), i => ' data-rpo="'+i+'"', '#8F7F2E'); if (l.n>=2) pasos.push(sec('¿En qué oficina?', l.n+' oficinas con trámites', l.html)); }
  if (Q.doc<0){ const l = lista(K.c, NC, {doc:null}, 6, i => RG.condiciones[i], i => ' data-rdoc="'+i+'"', '#7E302B'); pasos.push(sec('¿Qué documento?', Q.nats.length>=2 ? 'las '+Q.nats.length+' juntas' : 'toca uno para filtrar', l.html)); }
  $('rg-pnl').innerHTML = '<div class="rg-pnl-fijo">'+cabeza('Resumen del periodo', hay ? filtros().concat(Q.doc>=0 ? [RG.condiciones[Q.doc]] : []).map(esc).join(' · ') : 'Todo el país', false)+
    '<p class="rg-pnl-q">'+fechaA(Q.d0)+' – '+fechaA(Q.d1-1)+'</p></div><p class="rg-frase">'+frase+'</p>'+pasos.join('')+
    (hay ? '<button class="rg-limpia" data-rlimpia>Quitar todos los filtros</button>' : '');
}
function panelSemana(){
  const ctx = pintarPrincipal._ctx; if (!ctx || !PANEL || PANEL.k>=ctx.C.n){ Q.pv = 'res'; return panelResumen(); }
  const C = ctx.C, k = PANEL.k, x = PANEL.s!=null ? ctx.L[PANEL.s] : null, r = C.rango(k), prev = [];
  for (let j=k-1; j>=0 && prev.length<4; j--){ const rj = C.rango(j); if (!C.inc[j] && !temporadaEn(rj[0], rj[1]-1)) prev.unshift(j); }
  const exS = x ? x.ex : null, oS = x && x.o ? x.o : {}, rg = j => C.rango(j);
  const mover = (key, nk, nom, ex, o) => { const a = agg(key, nk, Object.assign({}, oS, o, { d0:r[0], d1:r[1], ex:ex })), b = new Float64Array(nk);
    prev.forEach(j => { const y = agg(key, nk, Object.assign({}, oS, o, { d0:rg(j)[0], d1:rg(j)[1], ex:ex })); for (let i=0;i<nk;i++) b[i] += y[i]/prev.length; });
    const l = []; for (let i=0;i<nk;i++){ if (Math.max(a[i], b[i]) < 10) continue; l.push([nom(i), a[i]-b[i], b[i] ? (a[i]/b[i]-1)*100 : null]); }
    const up = l.filter(y => y[1]>=1).sort((p,q)=>q[1]-p[1]).slice(0,4), dn = l.filter(y => y[1]<=-1).sort((p,q)=>p[1]-q[1]).slice(0,4), mx = Math.max(1, ...up.concat(dn).map(y => Math.abs(y[1])));
    const fila = y => '<div class="rg-mv"><span title="'+esc(y[0])+'">'+esc(y[0])+'</span><span class="rg-mv-b"><i class="'+(y[1]>0?'u':'d')+'" style="width:'+(Math.abs(y[1])/mx*100).toFixed(1)+'%"></i></span><b class="num '+(y[1]>0?'u':'d')+'">'+(y[1]>0?'+':'−')+miles(Math.abs(y[1]))+'</b><em>'+(y[2]==null ? 'nuevo' : (y[2]>0?'+':'')+y[2].toFixed(0)+'%')+'</em></div>';
    return (up.length ? '<span class="rg-mv-t u">Suben</span>'+up.map(fila).join('') : '')+(dn.length ? '<span class="rg-mv-t d">Bajan</span>'+dn.map(fila).join('') : '') || '<p class="mini">Sin cambios relevantes.</p>'; };
  const tA = tot(Object.assign({}, oS, { d0:r[0], d1:r[1], ex:exS })), tB = prev.reduce((t,j) => t+tot(Object.assign({}, oS, { d0:rg(j)[0], d1:rg(j)[1], ex:exS })), 0)/Math.max(1,prev.length);
  const contra = prev.length===1 ? 'la '+C.u[0]+' anterior ('+rangoTxt(rg(prev[0]))+')' : 'el promedio de '+(C.g==='m' ? 'los ' : 'las ')+prev.length+' '+C.u[1]+' anteriores ('+fecha(rg(prev[0])[0])+' – '+fecha(rg(prev[prev.length-1])[1]-1)+')';
  let cuerpo;
  if (C.inc[k]===-1) cuerpo = '<p class="rg-pnl-n">En esta semana las oficinas casi no operaron ('+miles(tot({d0:r[0], d1:r[1]}))+' trámites). Compararla contra semanas normales daría caídas cercanas a 100% que no dicen nada.</p>';
  else if (C.inc[k]) cuerpo = '<p class="rg-pnl-n">Este periodo está incompleto ('+plural(C.inc[k], '1 día', 'días')+' con datos), así que no se compara.</p>';
  else if (!prev.length) cuerpo = '<p class="rg-pnl-n">No hay '+C.u[1]+' anteriores completas y fuera de vacaciones para comparar.</p>';
  else { const dl = tB ? (tA/tB-1)*100 : 0, dentro = !x && ctx.mu ? (tA>ctx.mu+ctx.sd ? 'arriba de lo habitual' : tA<ctx.mu-ctx.sd ? 'abajo de lo habitual' : 'dentro de lo habitual') : '';
    cuerpo = '<div class="rg-pnl-k"><b class="num">'+miles(tA)+'</b><span class="'+(dl>=0?'u':'d')+'">'+(dl>=0?'▲ ':'▼ ')+Math.abs(dl).toFixed(1)+'%</span>'+(dentro ? '<i class="rg-hab">'+dentro+'</i>' : '')+'</div>'+
      '<p class="rg-base">Contra '+contra+': '+miles(Math.round(tB))+' en promedio. Se excluyen semanas incompletas o de vacaciones para no comparar contra una base baja.'+(dentro ? ' «Habitual» = la franja verde de la gráfica.' : '')+'</p>'+
      (x && x.o && 'nats' in x.o ? '' : '<h4>Nacionalidades</h4>'+mover(K.n, NN, i => DIC.n[i], i => (!exS || exS(i)) && personas(i), {}))+
      '<h4>'+(Q.est>=0 || Q.ofiF>=0 ? 'Oficinas' : 'O.R.')+'</h4>'+(Q.est>=0 || Q.ofiF>=0 ? mover(K.o, NO, i => nomO(DIC.o[i]), exS, {}) : mover(K.e, NE, i => DIC.e[i], exS, {})); }
  $('rg-pnl').innerHTML = '<div class="rg-pnl-fijo">'+cabeza('¿Qué cambió?', may(nomPunto(C, k)), true)+'<p class="rg-pnl-q">'+(x ? 'Solo <b style="color:'+x.col+'">'+esc(x.nom)+'</b>' : 'Todos los trámites')+(filtrosTxt() ? ' · '+filtrosTxt() : '')+'</p></div>'+cuerpo;
}
// ¿Qué explica la variación del titular? aporte de cada documento, nacionalidad y O.R. al cambio total
function panelVariacion(){
  const v = ventanasTit(), A = tot(v.rA), B = tot(v.rB), D = B-A, sube = D>=0;
  const aporte = (key, nk, nom, o) => { const a = agg(key, nk, Object.assign({}, v.rA, o)), b = agg(key, nk, Object.assign({}, v.rB, o)), l = [];
    for (let i=0;i<nk;i++){ const d = b[i]-a[i]; if (D && Math.sign(d)===Math.sign(D) && Math.abs(d)>=1) l.push([nom(i), d, a[i], b[i]]); }
    l.sort((p,q) => Math.abs(q[1])-Math.abs(p[1])); const mx = l.length ? Math.abs(l[0][1]) : 1;
    return l.slice(0,4).map(y => '<div class="rg-mv"><span title="'+esc(y[0])+'">'+esc(y[0])+'</span><span class="rg-mv-b"><i class="'+(sube?'u':'d')+'" style="width:'+(Math.abs(y[1])/mx*100).toFixed(1)+'%"></i></span><b class="num '+(sube?'u':'d')+'">'+(y[1]>0?'+':'−')+miles(Math.abs(y[1]))+'</b><em>'+pct(Math.abs(y[1]), Math.abs(D))+'%</em></div>').join('') || '<p class="mini">Sin datos.</p>'; };
  const temp = temporadaEn(v.rB.d0, v.rB.d1-1);
  $('rg-pnl').innerHTML = '<div class="rg-pnl-fijo">'+cabeza('¿Qué explica el cambio?', (sube ? 'Suben ' : 'Bajan ')+miles(Math.abs(D))+' trámites', true)+
      '<p class="rg-pnl-q">'+rangoTxt([v.rB.d0, v.rB.d1])+' ('+miles(B)+') contra '+rangoTxt([v.rA.d0, v.rA.d1])+' ('+miles(A)+')'+(filtrosTxt() ? ' · '+filtrosTxt() : '')+'</p></div>'+
    (temp ? '<p class="rg-pnl-n">El periodo coincide con '+temp+': parte del cambio es estacional.</p>' : '')+
    '<p class="rg-base">El % indica qué parte del cambio total explica cada uno.</p>'+
    (Q.doc<0 ? '<h4>Por documento</h4>'+aporte(K.c, NC, i => RG.condiciones[i], {doc:null}) : '')+
    '<h4>Por nacionalidad</h4>'+aporte(K.n, NN, i => DIC.n[i], {ex:personas})+
    (Q.est<0 && Q.ofiF<0 ? '<h4>Por O.R.</h4>'+aporte(K.e, NE, i => DIC.e[i], {}) : '<h4>Por oficina</h4>'+aporte(K.o, NO, i => nomO(DIC.o[i]), {}));
}
// Oficina con negativos por arriba de lo esperado: en qué trámites
function panelOficina(o){
  const e = NEG[o], iNeg = DIC.r.indexOf('Negativos'), resuelto = i => RESUELTO[K.r[i]];
  const n = agg(K.t, NT, {est:null, ofi:null, ex:i => K.o[i]===o && resuelto(i)}), g = agg(K.t, NT, {est:null, ofi:null, ex:i => K.o[i]===o && K.r[i]===iNeg});
  const nN = agg(K.t, NT, {est:null, ofi:null, ex:resuelto}), gN = agg(K.t, NT, {est:null, ofi:null, ex:i => K.r[i]===iNeg}), l = [];
  for (let t=0;t<NT;t++){ if (!n[t]) continue; const esp = nN[t] ? n[t]*gN[t]/nN[t] : 0; l.push([corta(DIC.t[t]), g[t], esp, n[t]]); }
  l.sort((p,q) => (q[1]-q[2])-(p[1]-p[2]));
  $('rg-pnl').innerHTML = '<div class="rg-pnl-fijo">'+cabeza('Negativos por arriba de lo esperado', esc(nomO(DIC.o[o])), true)+'<p class="rg-pnl-q">'+fechaA(Q.d0)+' – '+fechaA(Q.d1-1)+'</p></div>'+
    (e ? '<div class="rg-pnl-k"><b class="num">'+(e.po*100).toFixed(1)+'%</b><span class="d">de negativos</span><i class="rg-hab">se esperaría '+(e.pe*100).toFixed(1)+'%</i></div>' : '')+
    '<p class="rg-base">«Se esperaría» = lo que tendría esta oficina si cada uno de sus trámites se rechazara como el promedio nacional de ese mismo trámite. Así no se castiga a una oficina por atender trámites más difíciles.</p>'+
    '<h4>Dónde rechaza de más<small>negativos reales contra esperados</small></h4>'+l.slice(0,6).map(y => '<div class="rg-ofx"><span title="'+esc(y[0])+'">'+esc(y[0])+'</span><b class="num'+(y[1]-y[2]>1?' d':'')+'">'+miles(y[1])+'</b><em>esperados '+miles(Math.round(y[2]))+' de '+miles(y[3])+'</em></div>').join('');
}
function pintarPanel(){ ({ res:panelResumen, sem:panelSemana, var:panelVariacion, of:() => panelOficina(Q.pof) })[Q.pv || 'res'](); const p = $('rg-pnl'); if (p) p.scrollTop = 0; }
// Ventanas de los titulares: las del combo «Comparar con»; si no caben, las dos últimas semanas completas
function ventanasTit(){ const w = ventanas(); if (w) return { rB:{d0:w[0][0], d1:w[0][1]}, rA:{d0:w[1][0], d1:w[1][1]}, etq:etqCmp() };
  const u = semDe(Q.d1-1) - (semIni(semDe(Q.d1-1))+6>=Q.d1 ? 1 : 0); return { rB:{d0:semIni(u), d1:semIni(u)+7}, rA:{d0:semIni(u-1), d1:semIni(u)}, etq:'la última semana completa' }; }
// Semanas «normales»: con al menos 25% del volumen nacional típico (fuera quedan los cierres de oficinas, p. ej. fin de año)
const SEM_T = agg(i => semDe(K.d[i]), NSEM, {doc:null, est:null, ofi:null, nats:null, d0:0, d1:RG.dias});
const SEM_MED = (() => { const v = Array.from(SEM_T).filter(x => x>0).sort((a,b)=>a-b); return v.length ? v[v.length>>1] : 0; })();
const semNormal = w => SEM_T[w] >= SEM_MED*0.25;
function ventanasNormales(){ let w = semDe(Q.d1-1); if (semIni(w)+6 >= Q.d1) w--; while (w>=0 && !semNormal(w)) w--; let p = w-1; while (p>=0 && !semNormal(p)) p--;
  return p>=0 && semIni(p) >= Q.d0 ? { rB:{d0:semIni(w), d1:semIni(w)+7}, rA:{d0:semIni(p), d1:semIni(p)+7}, etq:'la última semana normal ('+fecha(semIni(w))+' al '+fecha(semIni(w)+6)+')' } : null; }
function pintarHallazgos(){
  const v = ventanasTit(), out = [], A = tot(v.rA), B = tot(v.rB), dl = A ? (B/A-1)*100 : 0, temp = temporadaEn(v.rB.d0, v.rB.d1-1), cierre = !semNormal(semDe(v.rB.d0));
  out.push({ cl:dl>=0 ? 'u' : 'd', ic:dl>=0 ? '▲' : '▼', h:'<b>'+(dl>=0?'Suben':'Bajan')+' '+Math.abs(dl).toFixed(1)+'%</b> los trámites en '+v.etq+(cierre ? ': las oficinas casi no operaron'+(temp ? ' ('+temp.replace(/^las /,'')+')' : '') : temp ? ' (temporada vacacional)' : ''), t:miles(A)+' → '+miles(B)+' · ver qué lo explica ›', act:' data-rpv="var"' });
  const vn = cierre ? ventanasNormales() : v;
  if (Q.nats.length!==1 && vn){ const a = agg(K.n, NN, Object.assign({ex:personas}, vn.rA)), b = agg(K.n, NN, Object.assign({ex:personas}, vn.rB)); let best = -1, bv = 0;
    for (let i=0;i<NN;i++){ if (a[i] < 150) continue; const x = (b[i]-a[i])/a[i]; if (Math.abs(x) > Math.abs(bv)){ bv = x; best = i; } }
    if (best>=0) out.push({ cl:bv>=0 ? 'u' : 'd', ic:bv>=0 ? '↗' : '↘', h:'<b>'+esc(DIC.n[best])+' '+(bv>=0?'sube':'baja')+' '+Math.abs(bv*100).toFixed(0)+'%</b>, el mayor cambio entre nacionalidades'+(cierre ? ' en '+vn.etq : ''), t:miles(a[best])+' → '+miles(b[best])+' · filtrar por ella ›', act:' data-rpn="'+best+'"' }); }
  const al = NEG.map((x,i) => x && x.alto && estOk(RG.ofiEst[i]) && (Q.ofiF<0 || Q.ofiF===i) ? [i, x] : null).filter(Boolean).sort((p,q) => (q[1].po-q[1].pe)-(p[1].po-p[1].pe));
  if (al.length) out.push({ cl:'al', ic:'!', h:'<b>'+esc(nomO(DIC.o[al[0][0]]))+'</b> rechaza más de lo esperado', t:(al[0][1].po*100).toFixed(1)+'% de negativos; se esperaría '+(al[0][1].pe*100).toFixed(1)+'% · ver por qué ›', act:' data-rpof="'+al[0][0]+'"' });
  $('rg-hz').innerHTML = out.map(h => '<button class="rg-hz-i '+h.cl+'"'+h.act+'><span class="rg-hz-ic">'+h.ic+'</span><span class="rg-hz-x"><span class="rg-hz-h">'+h.h+'</span><small>'+h.t+'</small></span></button>').join('')+info('hz');
}
function pintarNuevos(){
  const m = agg(i => MOV_T[K.t[i]], 4, {}), T = m.reduce((a,b)=>a+b,0), v = ventanasTit();
  const nA = agg(i => MOV_T[K.t[i]], 4, v.rA)[0], nB = agg(i => MOV_T[K.t[i]], 4, v.rB)[0];
  let stock = RG.dv_tipo ? RG.dv_tipo.reduce((a,x)=>a+x[1]+x[2],0) : 0, donde = 'en el país';
  if (Q.ests.length && RG.dv_e){ stock = Q.ests.reduce((t,e) => { const i = RG.dv_e.indexOf(DIC.e[e]); return t+(i>=0 ? RG.dv_et[i] : 0); }, 0); donde = 'en '+Q.ests.map(e => DIC.e[e]).join(' y '); }
  if (Q.nats.length===1 && RG.dv_n){ const f = RG.dv_n.find(x => x[0]===DIC.n[Q.nats[0]]); stock = f ? f[1]+f[2] : 0; donde = 'de '+DIC.n[Q.nats[0]]; }
  if (Q.ofiF>=0 || Q.nats.length>1 || Q.doc>=0) stock = 0;
  const vias = agg(K.t, NT, {ex:i => MOV_T[K.t[i]]===0}), lv = Array.from(vias).map((x,i)=>[corta(DIC.t[i]).replace('Regularización por ','Regularización: ').replace('razones ',''), x]).filter(x => x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,5);
  $('rg-nv').innerHTML = '<div class="rg-nv-a"><div class="rg-nv-h"><b class="num">'+corto(m[0])+'</b><span>personas se documentaron por primera vez<br><b>'+pct(m[0],T)+'%</b> de todos los trámites concluidos'+(nA ? ' · '+(nB>=nA?'▲ ':'▼ ')+Math.abs((nB/nA-1)*100).toFixed(1)+'% en '+v.etq : '')+'</span></div>'+
      (stock ? '<p class="rg-nv-s">Equivalen al <b>'+pct(m[0], stock)+'%</b> de las '+corto(stock)+' personas con documento vigente '+esc(donde)+'.</p>' : '')+
      '<div class="rg-stack">'+MOV.map((x,j) => '<i style="flex:'+m[j]+';background:'+x[2]+'" title="'+x[1]+': '+miles(m[j])+'"></i>').join('')+'</div>'+
      '<div class="rg-ley">'+MOV.map((x,j) => '<span><i style="background:'+x[2]+'"></i>'+x[1]+' <b>'+pct(m[j],T)+'%</b></span>').join('')+'</div></div>'+
    '<div class="rg-nv-b"><h4>Por qué vía entran</h4>'+barrasHTML(lv, m[0], '#2F6657')+'</div>';
}
// Totales en barras verticales, de mayor a menor, con un botón por dimensión (documento, nacionalidad, O.R.).
// Si comparas 2 o 3 O.R. o nacionalidades, cada categoría lleva una barra por cada una; si no, una sola barra y lo elegido resaltado.
const KEYD = { c:[() => K.c, NC, i => RG.condiciones[i]], n:[() => K.n, NN, i => DIC.n[i]], e:[() => K.e, NE, i => DIC.e[i]] };
function pintarTotales(){
  const X = Q.tot, G = Q.ests.length>=2 ? 'e' : Q.nats.length>=2 ? 'n' : null, grp = G && G!==X ? (G==='e' ? Q.ests : Q.nats) : null;
  const sinPropio = { c:{doc:null}, n:{nats:null}, e:{est:null, ofi:null} }[X], kx = KEYD[X][0](), nk = KEYD[X][1], nom = KEYD[X][2];
  const base = Object.assign({}, sinPropio, X==='n' ? {ex:personas} : {}), sel = { c:Q.doc>=0 ? [Q.doc] : [], n:Q.nats, e:Q.ests.length ? Q.ests : Q.ofiF>=0 ? [RG.ofiEst[Q.ofiF]] : [] }[X];
  const series = grp ? grp.map(v => Array.from(agg(kx, nk, Object.assign({}, base, G==='e' ? {est:[v]} : {nats:[v]})))) : [Array.from(agg(kx, nk, base))];
  let cats = [...Array(nk).keys()].map(i => [i, series.reduce((t,s)=>t+s[i],0)]).filter(x => x[1]>0).sort((a,b)=>b[1]-a[1]);
  const lim = grp && X!=='c' ? 15 : X==='n' ? 30 : 99, nTot = cats.length;
  let otras = null; if (cats.length>lim){ const r = cats.slice(lim).filter(x => sel.indexOf(x[0])<0); otras = { n:r.length, v:series.map(s => r.reduce((t,x)=>t+s[x[0]],0)) }; cats = cats.slice(0,lim).concat(cats.slice(lim).filter(x => sel.indexOf(x[0])>=0)); }
  const emp = X==='n' ? (grp ? grp.map(v => tot(Object.assign({nats:null, ex:i => !personas(i)}, G==='e' ? {est:[v]} : {}))) : [tot({nats:null, ex:i => !personas(i)})]) : null;
  const lab = cats.map(x => X==='e' ? abr(nom(x[0])) : nom(x[0])).concat(otras ? [(X==='e' ? 'Otras O.R.' : 'Otras')+' ('+otras.n+')'] : [], emp && emp.some(Boolean) ? ['Empleadores'] : []);
  const full = cats.map(x => nom(x[0])).concat(otras ? [(X==='e' ? 'Otras O.R.' : 'Otras nacionalidades')+' ('+otras.n+')'] : [], emp && emp.some(Boolean) ? ['Empleadores (sin nacionalidad)'] : []);
  const val = j => cats.map(x => series[j][x[0]]).concat(otras ? [otras.v[j]] : [], emp && emp.some(Boolean) ? [emp[j]] : []);
  const T = full.map((_,i) => series.reduce((t,s,j) => t+val(j)[i], 0)).reduce((a,b)=>a+b,0);
  const nomG = v => G==='e' ? DIC.e[v] : DIC.n[v], colG = j => [ '#2F6657','#C4605A','#8F7F2E' ][j];
  const filtroTxt = []; if (X!=='c' && Q.doc>=0) filtroTxt.push(RG.condiciones[Q.doc]); if (X!=='n' && Q.nats.length && G!=='n') filtroTxt.push(Q.nats.map(n => DIC.n[n]).join(', ')); if (X!=='e' && (Q.ests.length || Q.ofiF>=0) && G!=='e') filtroTxt.push(Q.ests.length ? Q.ests.map(e => DIC.e[e]).join(', ') : nomO(DIC.o[Q.ofiF]));
  const lug = !grp && sel.length===1 ? cats.findIndex(x => x[0]===sel[0])+1 : 0;
  $('rg-tot-sel').innerHTML = [['c','Por documento'],['n','Por nacionalidad'],['e','Por O.R.']].map(x => '<button data-rtot="'+x[0]+'" class="'+(X===x[0]?'on':'')+'">'+x[1]+'</button>').join('');
  $('rg-tot-q').innerHTML = '<b>'+miles(T)+'</b> trámites · '+fechaA(Q.d0)+' – '+fechaA(Q.d1-1)+(filtroTxt.length ? ' · '+filtroTxt.map(x => '<b>'+esc(x)+'</b>').join(' · ') : '')+
    (grp ? ' · una barra por cada '+(G==='e' ? 'O.R.' : 'nacionalidad')+' que comparas'+(sel.length ? ' · en rojo las '+(X==='n' ? 'nacionalidades' : X==='e' ? 'O.R.' : 'documentos')+' que elegiste' : '') : lug ? ' · <b class="rg-totr">'+esc(nom(sel[0]))+' resaltada: '+lug+'.º lugar</b>' : sel.length>1 ? ' · elegidas resaltadas' : '')+
    (otras ? ' · las '+lim+' principales de '+nTot+' y el resto sumado' : X==='e' ? ' · '+nTot+' O.R.' : '');
  const el = $('rg-tot'), caja = $('rg-tot-w').clientWidth || 1200, minCat = grp ? 10*grp.length+14 : 44, angosto = (($('rg-tot-w').clientWidth)||1200) < 700, mc = angosto ? Math.max(minCat, 56) : minCat, ancho = Math.max(caja, 60+lab.length*mc), paso = (ancho-60)/Math.max(1, lab.length);
  el.style.width = ancho+'px'; if (ancho>caja+4) $('rg-tot-q').insertAdjacentHTML('beforeend', ' · <b>desliza la gráfica para ver todas →</b>'); $('rg-tot-w').scrollLeft = 0;
  const cpl = Math.max(6, Math.floor((paso-6)/5.4)), parte = v => String(v).split(' ').reduce((a,w) => { const u = a[a.length-1]; if (u && (u+' '+w).length<=cpl) a[a.length-1] = u+' '+w; else a.push(w); return a; }, []),
    lineas = Math.max(...lab.map(v => parte(v).length)), conEti = !grp ? paso>=26 : paso/grp.length>=24;
  el.style.height = (X==='c' ? 340 : 380)+'px';
  graf('rg-tot', { grid:{ left:46, right:12, top:grp ? 40 : 24, bottom:14+lineas*12 },
    legend:grp ? { top:0, left:0, data:grp.map(nomG), textStyle:{fontSize:11.5}, icon:'roundRect', itemWidth:12, itemHeight:8 } : { show:false },
    tooltip:{ trigger:'axis', axisPointer:{ type:'shadow' }, formatter:ps => '<b>'+esc(full[ps[0].dataIndex])+'</b><br>'+ps.map(p => (grp ? p.marker+esc(p.seriesName)+': ' : '')+'<b>'+miles(p.value)+'</b> trámites'+(grp ? '' : ' · '+pct(p.value,T)+'%')).join('<br>') },
    xAxis:{ type:'category', data:lab, axisTick:{show:false}, axisLine:{lineStyle:{color:'#C9C4B5'}}, splitLine:{ show:true, lineStyle:{ color:'#EEEBE2' } },
      axisLabel:{ interval:0, rotate:0, fontSize:paso<50 ? 9.5 : paso<58 ? 10 : 10.5, color:'#2B2926', lineHeight:12, hideOverlap:false,
        formatter:(v,i) => { const t = parte(v).join('\n'); return sel.indexOf((cats[i]||[])[0])>=0 ? t.split('\n').map(x => '{s|'+x+'}').join('\n') : t; }, rich:{ s:{ fontWeight:700, color:'#7E302B', fontSize:paso<54 ? 10 : 10.5 } } } },
    yAxis:{ type:'value', axisLabel:{ color:'#5C5952', fontSize:10.5, formatter:v => corto(v) }, splitLine:{ lineStyle:{ color:'#EEEBE2' } } },
    color:grp ? grp.map((_,j) => colG(j)) : undefined, series:series.map((s,j) => ({ name:grp ? nomG(grp[j]) : 'Trámites', type:'bar', barMaxWidth:grp ? 26 : 34, barGap:'12%', itemStyle:{ borderRadius:[3,3,0,0] },
      data:val(j).map((v,i) => ({ value:v, itemStyle:{ color:grp ? colG(j) : i>=cats.length ? '#C9C4B5' : sel.length ? (sel.indexOf(cats[i][0])>=0 ? '#7E302B' : '#B9CFC6') : '#2F6657' } })),
      label:{ show:conEti, position:'top', fontSize:grp || paso<40 ? 9 : 10, color:'#2B2926', formatter:p => p.value ? corto(p.value) : '' } })) });
}
function alternarNat(n){ const k = Q.nats.indexOf(n); if (k>=0) Q.nats.splice(k,1); else { if (Q.nats.length>=3) Q.nats.shift(); Q.nats.push(n); }
  if (Q.nats.length>=2) Q.desg = 'nat'; else if (Q.desg==='nat' && Q.nats.length===1) Q.desg = 'tot'; tramites(); }
function tramites(){
  $('rg-ctl').innerHTML = htmlCtl(); NEG = negEsperado(); pintarKpis(); pintarHallazgos(); pintarPrincipal(); pintarPanel(); pintarNuevos();
  if (Q.det){ pintarTotales(); pintarOficinas(); pintarTipoEdad(); pintarMezcla(); const n = $('rg-det-n'); if (n) n.innerHTML = 'Detalle de: <b>'+(filtros().length || Q.doc>=0 ? filtros().concat(Q.doc>=0 ? [RG.condiciones[Q.doc]] : []).map(esc).join(Q.nats.length>=2 ? ' + ' : ' · ') : 'todo el país')+'</b>'+(Q.nats.length>=2 ? ' (suma de las '+Q.nats.length+' nacionalidades)' : ''); }
  autocompletar($('rg-bus'), $('rg-bus-r'), DIC.n.map((x,i) => ({n:x, t:'Nacionalidad', v:i})).concat(DIC.e.map((x,i) => ({n:x, t:'Estado', v:i})), DIC.o.map((x,i) => ({n:nomO(x), t:'Oficina', v:i}))), elegirBusca);
}
function agregarEst(e){ if (Q.ests.indexOf(e)<0){ if (Q.ests.length>=3) Q.ests.shift(); Q.ests.push(e); } Q.ofiF = -1; Q.ofi = -1; Q.pv = 'res';
  if (Q.ests.length>=2) Q.desg = 'or'; tramites(); }
function elegirBusca(x){
  if (x.t==='Nacionalidad'){ if (Q.nats.indexOf(x.v)<0){ Q.pv = 'res'; alternarNat(x.v); } return; }
  if (x.t==='Estado'){ agregarEst(x.v); return; } else { Q.ofiF = x.v; Q.ests = []; }
  Q.ofi = -1; Q.pv = 'res'; tramites();
}
function vistaTramites(){
  $('rg-body').innerHTML = '<div class="ctl rg-ctl" id="rg-ctl"></div><section class="kpis rg-kpis" id="rg-kpis" data-modo="tarjetas"></section>'+
    '<div class="rg-hz" id="rg-hz"></div>'+
    '<div class="rg-pp abierto" id="rg-pp"><div class="caja rg-main"><h2><span id="rg-evo-t"></span>'+info('evo')+'</h2><span class="q" id="rg-evo-q"></span><div class="rg-desg" id="rg-desg"></div><div class="rg-evo-ley" id="rg-evo-ley"></div><div id="rg-evo" class="rg-evo"></div></div>'+
      '<aside class="caja rg-pnl" id="rg-pnl"></aside></div>'+
    '<div class="caja rg-ancho rg-nv"><h2><span>¿Cuántas personas nuevas se documentan?</span>'+info('nv')+'</h2><div id="rg-nv" class="rg-nv-g"></div></div>'+
    '<button class="rg-det-b'+(Q.det?' on':'')+'" data-rdet>'+(Q.det ? 'Ocultar detalle ▴' : 'Ver detalle: oficinas, tipo de trámite, edad y sexo, documento por nacionalidad ▾')+'</button>'+
    (Q.det ? '<p class="rg-det-n" id="rg-det-n"></p><div class="caja rg-cru" id="rg-totales"><h2><span>Totales</span>'+info('tot')+'<div class="pil chica" id="rg-tot-sel"></div></h2><span class="q" id="rg-tot-q"></span><div id="rg-tot-w"><div id="rg-tot"></div></div></div><div class="rg-g rg-g3"><div class="caja"><h2><span>Oficinas</span>'+info('of')+'</h2><span class="q" id="rg-of-q"></span><div class="rg-of" id="rg-of"></div></div>'+
      '<div class="caja"><h2><span>Tipo de trámite</span>'+info('tipo')+'</h2><span class="q">principales · el % es la parte del total</span><div id="rg-tipo"></div></div>'+
      '<div class="caja"><h2><span>Edad y sexo</span>'+info('edad')+'</h2><div class="rg-sx" id="rg-sx"></div><div id="rg-pir" style="flex:1;min-height:230px"></div></div></div>'+
      '<div class="caja rg-cru"><h2><span id="rg-mz-t"></span>'+info('mz')+'<div class="pil chica" id="rg-mz-sel"></div></h2><span class="q" id="rg-mz-q"></span><div id="rg-mz" class="rg-mz"></div></div>' : '');
  tramites();
}
// ---- Ayuda (i): qué muestra, de dónde sale y cómo leerlo
const INFO = {
  hz:'<b>Titulares del periodo.</b> Los tres datos que más conviene saber, calculados solos con cada carga de datos: cuánto subieron o bajaron los trámites, la nacionalidad que más cambió y la oficina con más rechazos de lo esperado. Respetan el periodo, el «Comparar con» y los filtros. Toca uno para ver la explicación.',
  evo:'<b>Trámites concluidos en el INM</b> (con o sin documento: tarjetas, constancias, oficios, y también rechazados o cancelados) en el periodo elegido. <br>• <b>Franja verde:</b> lo normal, calculado con las semanas fuera de vacaciones. Si un punto sale de la franja, es un cambio real. <br>• <b>Sombra gris:</b> temporada vacacional; ahí bajar es esperado. <br>• <b>Punto hueco:</b> semana con pocos días de datos. <br>Toca cualquier punto y a la derecha verás qué cambió ahí. Con «Ver» separas las 5 líneas principales por documento, nacionalidad u O.R.',
  nv:'<b>Personas que se documentan por primera vez</b>: regularizaciones, visas y tarjetas de visitante regional o trabajador fronterizo. No incluye renovaciones, cambios de condición ni avisos. El % sobre el stock compara contra las personas con documento vigente al último corte.',
  of:'<b>Las 10 oficinas con más trámites.</b> La barra muestra positivos (verde), negativos (rojo) y otros. El ⚠ marca a las oficinas que rechazan más de lo que se esperaría por el tipo de trámites que atienden. Los % son sobre trámites ya resueltos.',
  dvt:'<b>Personas con documento vigente</b> por estado o por nacionalidad, con hombres, mujeres y cada tipo de documento. Toca una tarjeta de arriba (por ejemplo «Vis. Regional») o un encabezado para ordenar la tabla; la tarjeta también filtra los rankings y el detalle por ese documento.',
  dvm:'<b>Dónde viven y de dónde son.</b> Cada celda cruza un estado con un país: más oscuro = más personas. Al pasar el cursor se iluminan su fila, su columna y sus totales. Los rankings ordenan países o estados de mayor a menor. Toca para ver el detalle a la derecha.',
  dvd:'<b>Detalle de un estado o un país.</b> Escribe o toca uno: si es estado, verás de qué países son sus residentes; si es país, en qué estados viven.',
  vah:'<b>Titulares de la semana.</b> Volumen y cambio en la composición matrimonio/nacimiento, nacionalidades que concentran las solicitudes (y cuántas veces su peso en los trámites) y actas reportadas por una O.R. de otro estado.',
  vae:'<b>Solicitudes de validación por día.</b> Pasa el cursor por una línea para ver solo esa y su % del total; sobre «Total» se ven todas. «123» muestra los valores.',
  van:'<b>Nacionalidades que más piden validación.</b> «×» compara su parte de las validaciones contra su parte de todos los trámites migratorios: ×3 o más significa que validan mucho más de lo que pesan.',
  vax:'<b>Actas registradas en un estado y reportadas por la O.R. de otro.</b> No incluye la DGRAM, que es oficina central. Es una señal para revisar, no una conclusión.',
  vaf:'<b>Del Registro Civil donde se registró el acta (izquierda) a la O.R. que la reporta (derecha).</b> Verde = mismo estado; rojo = otro estado; gris = DGRAM. Toca una franja para resaltarla; toca fuera para soltarla.',
  vaa:'<b>Días entre el registro del acta y la solicitud.</b> Un matrimonio de 30 días o menos es una señal para revisar.',
  tot:'<b>Totales del periodo, de mayor a menor.</b> Elige con los botones: por documento, por nacionalidad (las 30 principales y el resto sumado) o por O.R. (las 32). Aplica los demás filtros y resalta en rojo lo que elegiste en esa misma dimensión, para ver qué lugar ocupa. Si comparas 2 o 3 O.R. o nacionalidades, cada barra se divide en una por cada una.',
  tipo:'<b>Tipos de trámite con más volumen</b> en el periodo y con los filtros elegidos.',
  edad:'<b>Personas por grupo de edad y sexo</b> (sin trámites de empleadores).',
  mz:'<b>Qué documento obtiene cada grupo.</b> «Sin documento» = el trámite se rechazó, se canceló o la persona desistió, así que no se le entregó ningún documento. Cada barra es el 100% de los trámites de una nacionalidad (u O.R., oficina o edad), repartido por el documento emitido. Pasa el cursor o toca un color: a la derecha verás su % y el lugar que ocupa ese grupo en ese documento. Clic para ordenar.'
};
const info = k => '<button class="rg-i" data-rinfo="'+k+'" aria-label="Qué muestra esta sección">i</button>';
let infoFija = false;
function mostrarInfo(b, fija){
  let p = $('rg-pop'); if (!p){ p = document.createElement('div'); p.id = 'rg-pop'; p.className = 'rg-pop'; p.setAttribute('role','dialog'); document.body.appendChild(p); }
  if (!b){ if (!infoFija || fija===null){ p.hidden = true; infoFija = false; } return; }
  infoFija = !!fija; p.innerHTML = (fija ? '<button class="rg-pop-x" data-rpopx aria-label="Cerrar">×</button>' : '')+INFO[b.dataset.rinfo]; p.hidden = false; p.classList.toggle('fija', infoFija);
  const r = b.getBoundingClientRect(), w = p.offsetWidth; p.style.left = Math.max(8, Math.min(r.left-12, window.innerWidth-w-8))+'px'; p.style.top = (r.bottom+8)+'px';
}

/* ==== [5] DOCUMENTOS VIGENTES ===================================== */
const ABR = {'Aguascalientes':'Ags','Baja California':'BC','Baja California Sur':'BCS','Campeche':'Camp','Chiapas':'Chis','Chihuahua':'Chih','Ciudad de México':'CDMX','Coahuila':'Coah','Colima':'Col','Durango':'Dgo','Estado de México':'Edomex','Guanajuato':'Gto','Guerrero':'Gro','Hidalgo':'Hgo','Jalisco':'Jal','Michoacán':'Mich','Morelos':'Mor','Nayarit':'Nay','Nuevo León':'NL','Oaxaca':'Oax','Puebla':'Pue','Querétaro':'Qro','Quintana Roo':'QRoo','San Luis Potosí':'SLP','Sinaloa':'Sin','Sonora':'Son','Tabasco':'Tab','Tamaulipas':'Tamps','Tlaxcala':'Tlax','Veracruz':'Ver','Yucatán':'Yuc','Zacatecas':'Zac'};
const abr = e => ABR[e] || e, cortoE = e => e.replace('Ciudad de México','CDMX').replace('Baja California Sur','BCS');
function vistaVigentes(){
  if (!RG.dv_m){ $('rg-body').innerHTML = '<div class="caja"><p class="mini">Falta el archivo de documentos vigentes por estado y país.</p></div>'; return; }
  const DV = window.IANAMI_DATOS && window.IANAMI_DATOS.docs, corte = DV && DV.corte ? DV.corte.split('-').reverse().join('/') : '—';
  const tipos = RG.dv_tipo.map(x => x[0]), T = RG.dv_tipo.reduce((a,b)=>a+b[1]+b[2],0), M = RG.dv_tipo.reduce((a,b)=>a+b[2],0);
  const ti = RG.dv_tipo.map((x,k) => x.concat([k])).sort((a,b) => (b[1]+b[2])-(a[1]+a[2]));
  const nomT = s => s.replace('Residente','Res.').replace('Visitante','Vis.').replace(' por Razones',' ').replace(' Estudiante',' Est.').replace(' con Fines de',' ').replace('Trabajador Fronterizo','Trab. Front.').replace(/\s+/g,' ');
  const hm = (h, m) => '<span class="rg-hm kc-hm" title="Hombres '+miles(h)+' · Mujeres '+miles(m)+'"><i style="width:'+pct(h,h+m)+'%"></i><i style="width:'+pct(m,h+m)+'%"></i></span>';
  const tarjeta = (nom, x, col, sub, ic, k) => kc({ attr:' data-rdvk="'+k+'" aria-pressed="'+(Q.dvOrd===k)+'"', on:Q.dvOrd===k, col:col, ic:ic||IC.tarj, nom:nom, sub:sub, val:corto(x[1]+x[2]), num:x[1]+x[2], d:'<span class="kc-d">'+pct(x[2],x[1]+x[2])+'% mujeres</span>', b:hm(x[1],x[2]), title:nom+': '+miles(x[1]+x[2])+' · '+pct(x[1]+x[2],T)+'% del total · toca para ordenar la tabla por este documento' });
  const vista = Q.dvT || 'e', kT = Q.dvOrd!=null && Q.dvOrd>=0 ? Q.dvOrd : -1, tipoT = kT>=0 ? tipos[kT] : null;
  const valE = f => kT>=0 ? f[3+kT] : f[1]+f[2], valN = f => kT>=0 ? (RG.dv_nt.indexOf(tipoT)>=0 ? f[3+RG.dv_nt.indexOf(tipoT)] : 0) : f[1]+f[2];
  const totTipo = kT>=0 ? RG.dv_tipo[kT][1]+RG.dv_tipo[kT][2] : T;
  const nomSel = s => !s ? '' : s.t==='e' ? RG.dv_e[s.i] : s.t==='p' ? RG.dv_p[s.i] : RG.dv_n[s.i][0];
  const porTipo = (f, cols) => cols.map((x,k) => [nomT(x), f[3+k]]).filter(x => x[1]>0).sort((a,b)=>b[1]-a[1]);
  $('rg-body').innerHTML = '<div class="ctl rg-ctl"><div class="rango"><b>Corte al '+esc(corte)+'</b><span>stock semanal · no depende del periodo</span></div></div>'+
    '<section class="kpis rg-kpis" data-modo="'+(Q.compacto?'compacto':'tarjetas')+'"><div class="kg" style="flex:1 1 0;--g:#2B2926"><div class="eti">Total</div><div>'+tarjeta('Con documento vigente', ['', T-M, M], '#2B2926', 'personas extranjeras', IC.tot, -1)+'</div></div>'+
      '<div class="kg g-reg" style="flex:5 1 0"><div class="eti">Por tipo de documento · toca uno para filtrar</div><div>'+ti.slice(0,5).map(x => tarjeta(nomT(x[0]), x, '#2F6657', '', IC.tarj, x[3])).join('')+'</div></div>'+plegar()+'</section>'+
    // 1) tabla por estado o nacionalidad
    '<div class="caja rg-ancho"><h2><span>'+(Q.dvR==='n' ? 'Nacionalidad' : 'Estado')+' × tipo de documento</span>'+info('dvt')+'<div class="pil chica"><button data-rdvr="e" class="'+(Q.dvR!=='n'?'on':'')+'">Por estado</button><button data-rdvr="n" class="'+(Q.dvR==='n'?'on':'')+'">Por nacionalidad</button></div></h2>'+
      '<span class="q" id="rg-dve-q"></span><div class="rg-tbw" id="rg-dve"></div></div>'+
    // 2) cruce estado × país, con rankings
    '<div class="rg-g rg-g82"><div class="caja rg-mxc"><h2><span id="rg-dv-t"></span>'+info('dvm')+'<div class="pil chica">'+[['e','Estado × país'],['p','País × estado'],['rp','Ranking de países'],['re','Ranking de estados']].map(x => '<button data-rdvt="'+x[0]+'" class="'+(vista===x[0]?'on':'')+'">'+x[1]+'</button>').join('')+'</div></h2>'+
        '<span class="q" id="rg-dv-q"></span><div id="rg-dv-w"><div id="rg-dv"></div></div><div id="rg-dv-mas"></div></div>'+
      '<div class="caja rg-dvp"><h2><span>Detalle</span>'+info('dvd')+'<span id="rg-dvx" class="rg-dvx"></span></h2>'+cajaBusca('rg-dv-bus', 'Escribe un estado o un país')+'<div id="rg-dvd"></div></div></div>';
  // ---- panel de detalle: estado → sus países, o país → sus estados
  const E = RG.dv_e.map((e,i)=>[i, RG.dv_et[i]]).sort((a,b)=>b[1]-a[1]), P = RG.dv_p.map((p,j)=>[j, RG.dv_m.reduce((t,f)=>t+f[j],0)]).sort((a,b)=>b[1]-a[1]);
  const detalle = () => { $('rg-dvx').innerHTML = Q.dvSel ? '<span class="tag-f" style="background:#7E302B">'+esc(nomSel(Q.dvSel))+' <button data-rdvsx aria-label="Quitar selección" title="Quitar selección">×</button></span>' : '';
    const s = Q.dvSel || {t:'e', i:E[0][0]}, fN = RG.dv_n && RG.dv_n.find(x => x[0]===nomSel(s));
    const tipoH = (f, cols, t) => f ? '<h4>Por tipo de documento</h4>'+barrasHTML(porTipo(f, cols), t, '#8F7F2E') : '';
    if (s.t==='n'){ const t = fN[1]+fN[2];
      $('rg-dvd').innerHTML = '<p class="rg-dato"><b class="num">'+miles(t)+'</b> personas de <b>'+esc(fN[0])+'</b> con documento vigente · '+pct(fN[2], t)+'% mujeres</p>'+tipoH(fN, RG.dv_nt, t)+
        '<span class="nota">El archivo de estado × país no incluye a '+esc(fN[0])+': no se puede saber en qué estados viven.</span>'; return; }
    if (s.t==='e'){ const f = RG.dv_m[s.i], t = RG.dv_et[s.i], l = RG.dv_p.map((p,j)=>[p, f[j]]).filter(x => x[1]>0).sort((a,b)=>b[1]-a[1]), ed = (RG.dv_ed || []).find(x => x[0]===RG.dv_e[s.i]);
      $('rg-dvd').innerHTML = '<p class="rg-dato"><b class="num">'+miles(t)+'</b> personas con documento vigente en <b>'+esc(RG.dv_e[s.i])+'</b>'+(ed ? ' · '+pct(ed[2], ed[1]+ed[2])+'% mujeres' : '')+'</p>'+
        tipoH(ed, tipos, t)+'<h4>De qué país son</h4>'+barrasHTML(l, t, '#2F6657')+(RG.dv_otros && RG.dv_otros[s.i] ? '<span class="nota">Otros países fuera de esta lista: '+miles(RG.dv_otros[s.i])+'</span>' : '')+(kT>=0 ? '<span class="nota">El reparto por país incluye todos los tipos de documento: el archivo no lo separa por tipo.</span>' : ''); }
    else { const l = RG.dv_e.map((e,i)=>[e, RG.dv_m[i][s.i]]).filter(x => x[1]>0).sort((a,b)=>b[1]-a[1]), t = RG.dv_m.reduce((a,f)=>a+f[s.i],0), n = (RG.dv_n || []).find(x => x[0]===RG.dv_p[s.i]);
      $('rg-dvd').innerHTML = '<p class="rg-dato"><b class="num">'+miles(t)+'</b> personas de <b>'+esc(RG.dv_p[s.i])+'</b> con documento vigente'+(n ? ' · '+pct(n[2], n[1]+n[2])+'% mujeres' : '')+'</p>'+
        tipoH(fN, RG.dv_nt, fN ? fN[1]+fN[2] : t)+'<h4>En qué estado viven</h4>'+barrasHTML(l, t, '#2F6657')+(kT>=0 ? '<span class="nota">El reparto por estado incluye todos los tipos de documento: el archivo no lo separa por tipo.</span>' : ''); } };
  window.__rgDetalle = detalle;
  autocompletar($('rg-dv-bus'), $('rg-dv-bus-r'), RG.dv_e.map((e,i) => ({n:e, t:'Estado', v:{t:'e',i:i}})).concat(RG.dv_p.map((p,j) => ({n:p, t:'País', v:{t:'p',i:j}}))), x => { Q.dvSel = x.v; $('rg-dv-bus').value = ''; detalle(); });
  detalle();
  // ---- matriz o ranking
  const todo = Q.dvMxTodo, el = $('rg-dv');
  if (vista==='rp' || vista==='re'){
    let l; if (vista==='rp'){ l = RG.dv_n.map((f,j) => { const ip = RG.dv_p.indexOf(f[0]); return [f[0], valN(f), ip>=0 ? {t:'p', i:ip} : {t:'n', i:j}]; }).filter(x => x[1]>0).sort((a,b)=>b[1]-a[1]);
      const nN = l.length, top = l.slice(0,25).concat(l.slice(25).filter(x => x[0]===nomSel(Q.dvSel))), resto = totTipo - top.reduce((a,x)=>a+x[1],0); l = top; l.nN = nN; if (resto>0) l.push(['Otras nacionalidades', resto, null]); }
    else l = RG.dv_ed.map(f => [f[0], valE(f), {t:'e', i:RG.dv_e.indexOf(f[0])}]).filter(x => x[1]>0).sort((a,b)=>b[1]-a[1]);
    const TT = l.reduce((a,x)=>a+x[1],0), nSel = nomSel(Q.dvSel), esSel = x => x[2] && x[0]===nSel, haySel = l.some(esSel);
    $('rg-dv-t').innerHTML = (vista==='rp' ? 'Ranking de países de origen' : 'Ranking de estados')+(tipoT ? ' · <span class="rg-totr">'+esc(nomT(tipoT))+'</span>' : '');
    $('rg-dv-q').innerHTML = '<b>'+miles(TT)+'</b> personas'+(tipoT ? ' con '+esc(tipoT)+' (toca la tarjeta otra vez para ver todos los tipos)' : '')+' · '+(vista==='rp' ? 'las '+(l.length-1)+' principales de '+l.nN+' nacionalidades y el resto sumado' : 'los '+l.length+' estados')+' · de mayor a menor · '+(haySel ? 'toca la barra roja otra vez (o la × del detalle) para quitarla' : 'toca una barra para ver su detalle a la derecha');
    $('rg-dv-mas').innerHTML = '';
    const lab = l.map(x => !x[2] ? 'Otras' : vista==='re' ? abr(x[0]) : x[0].replace(/\s*\(.*\)$/, '')), caja = $('rg-dv-w').clientWidth || 900, ancho = Math.max(caja, 60+l.length*(caja<700 ? 56 : 26)), paso = (ancho-60)/l.length;
    el.style.width = ancho+'px'; el.style.height = '380px'; $('rg-dv-w').scrollLeft = 0;
    if (ancho>caja+4) $('rg-dv-q').insertAdjacentHTML('beforeend', ' · <b>desliza la gráfica para ver todos →</b>');
    const cpl = Math.max(6, Math.floor((paso-6)/5.4)), parte = v => String(v).split(' ').reduce((a,w) => { const u = a[a.length-1]; if (u && (u+' '+w).length<=cpl) a[a.length-1] = u+' '+w; else a.push(w); return a; }, []), lineas = Math.max(...lab.map(v => parte(v).length));
    const ch = graf('rg-dv', { grid:{ left:46, right:12, top:24, bottom:14+lineas*12 },
      tooltip:{ trigger:'axis', axisPointer:{ type:'shadow' }, formatter:ps => '<b>'+esc(l[ps[0].dataIndex][0])+'</b><br><b>'+miles(ps[0].value)+'</b> personas'+(tipoT ? ' con '+esc(nomT(tipoT)) : '')+' · '+pct(ps[0].value,TT)+'%' },
      xAxis:{ type:'category', data:lab, axisTick:{show:false}, axisLine:{lineStyle:{color:'#C9C4B5'}}, splitLine:{ show:true, lineStyle:{ color:'#EEEBE2' } }, triggerEvent:true,
        axisLabel:{ interval:0, rotate:0, fontSize:paso<50 ? 9.5 : paso<58 ? 10 : 10.5, color:'#2B2926', lineHeight:12, hideOverlap:false,
          formatter:(v,k) => { const t = parte(v).join('\n'); return l[k] && esSel(l[k]) ? t.split('\n').map(x => '{s|'+x+'}').join('\n') : t; }, rich:{ s:{ fontWeight:700, color:'#7E302B', fontSize:paso<50 ? 9.5 : paso<58 ? 10 : 10.5 } } } },
      yAxis:{ type:'value', axisLabel:{ color:'#5C5952', fontSize:10.5, formatter:v => corto(v) }, splitLine:{ lineStyle:{ color:'#EEEBE2' } } },
      series:[{ type:'bar', barMaxWidth:34, itemStyle:{ borderRadius:[3,3,0,0] }, data:l.map(x => ({ value:x[1], itemStyle:{ color:!x[2] ? '#C9C4B5' : !haySel ? '#2F6657' : esSel(x) ? '#7E302B' : '#B9CFC6' } })),
        label:{ show:paso>=26, position:'top', fontSize:paso<40 ? 9 : 10, color:'#2B2926', formatter:p => corto(p.value) } }] });
    ch.off('click'); ch.on('click', p => { const k = p.componentType==='xAxis' ? lab.indexOf(p.value) : p.dataIndex, s = l[k] && l[k][2]; if (s){ Q.dvSel = nomSel(Q.dvSel)===l[k][0] ? null : s; vistaVigentes(); } });
  } else {
    const tr = vista==='p', R0 = tr ? P : E, R = todo || tr ? R0 : R0.slice(0,15), C = (tr ? E : P.slice(0,15)).slice(), v = (r,c) => tr ? RG.dv_m[c][r] : RG.dv_m[r][c];
    const nR = R.map(x => tr ? RG.dv_p[x[0]] : cortoE(RG.dv_e[x[0]])), nC = C.map(x => tr ? abr(RG.dv_e[x[0]]) : RG.dv_p[x[0]]);
    if (!tr) C.sort((a,b) => R.reduce((t,r) => t+v(r[0],b[0]), 0) - R.reduce((t,r) => t+v(r[0],a[0]), 0));
    const totR = R.map(r => C.reduce((t,c) => t+v(r[0],c[0]), 0)), totC = C.map(c => R.reduce((t,r) => t+v(r[0],c[0]), 0));
    let mx = 1; R.forEach(r => C.forEach(c => { mx = Math.max(mx, v(r[0],c[0])); }));
    const ram = ['#EEF4F1','#CFE0D9','#9FC0B3','#5E9384','#2F6657','#173A31'], datos = [], chico = tr;
    R.forEach((r,y) => C.forEach((c,x) => { const n = v(r[0],c[0]), t = n ? Math.log1p(n)/Math.log1p(mx) : 0;
      datos.push({ value:[x, y, n], itemStyle:{ color: n ? echarts.color.lerp(t, ram) : '#FBF9F3' }, label:{ color: t>.62 ? '#fff' : '#2B2926' } }); }));
    $('rg-dv-t').textContent = tr ? 'País de origen × estado' : 'Estado × país de origen';
    $('rg-dv-q').textContent = (tr ? 'los 25 países del archivo contra los 32 estados' : (todo ? 'los 32 estados' : 'los 15 estados con más documentos')+' contra los 15 países principales')+' · pasa el cursor para ubicar fila y columna · toca para ver el detalle';
    if (tipoT) $('rg-dv-q').insertAdjacentHTML('afterbegin', '<b class="rg-totr">Este cruce suma todos los tipos de documento: el archivo de estado × país no trae el desglose por tipo. </b>');
    el.style.width = ''; el.style.height = (R.length*(tr ? 26 : 24)+110)+'px';
    $('rg-dv-mas').innerHTML = tr ? '' : '<button class="rg-mas-f" data-rdvmx>'+(todo ? 'Ver solo los 15 principales ▴' : 'Ver los 32 estados ▾')+'</button>';
    const guia = { show:true, type:'shadow', shadowStyle:{ color:'rgba(47,102,87,.10)' }, label:{ show:true, backgroundColor:'#2B2926', color:'#fff', fontSize:11, padding:[3,6], borderRadius:4 }, triggerTooltip:false };
    const ch = graf('rg-dv', { tooltip:{ formatter:p => p.seriesIndex===0 ? '<b>'+esc(tr ? RG.dv_p[R[p.value[1]][0]]+' en '+RG.dv_e[C[p.value[0]][0]] : RG.dv_p[C[p.value[0]][0]]+' en '+RG.dv_e[R[p.value[1]][0]])+'</b><br>'+miles(p.value[2])+' personas · '+pct(p.value[2], totR[p.value[1]])+'% de la fila' : '<b>'+esc(p.name)+'</b><br>'+miles(p.value) },
      axisPointer:{ link:[{ xAxisIndex:[0,1] }, { yAxisIndex:[0,2] }] },
      grid:[{ left:118, right:104, top:100, bottom:6 }, { left:118, right:104, top:chico ? 44 : 52, height:chico ? 44 : 36 }, { right:46, width:52, top:100, bottom:6 }],
      xAxis:[{ type:'category', data:nC, gridIndex:0, axisLabel:{show:false}, axisTick:{show:false}, axisLine:{show:false}, axisPointer:Object.assign({}, guia, { label:{ show:false } }) }, { type:'category', data:nC, gridIndex:1, show:false }, { type:'value', gridIndex:2, show:false }],
      yAxis:[{ type:'category', data:nR, gridIndex:0, inverse:true, axisLabel:{ fontSize:11.5, color:'#2B2926' }, axisTick:{show:false}, axisLine:{show:false}, triggerEvent:true, axisPointer:Object.assign({}, guia, { label:{ show:true, backgroundColor:'#7E302B', color:'#fff', fontSize:11.5, fontWeight:700, padding:[3,6], borderRadius:4 } }) }, { type:'value', gridIndex:1, show:false }, { type:'category', data:nR, gridIndex:2, inverse:true, show:false }],
      series:[{ type:'heatmap', xAxisIndex:0, yAxisIndex:0, data:datos, label:{ show:!chico, fontSize:10, formatter:p => p.value[2] ? corto(p.value[2]) : '' }, itemStyle:{ borderColor:'#FCFBF7', borderWidth:chico ? 1.5 : 2.5, borderRadius:chico ? 3 : 5 }, emphasis:{ disabled:true } },
              { type:'bar', xAxisIndex:1, yAxisIndex:1, data:totC, itemStyle:{ color:'#9FC0B3', borderRadius:[3,3,0,0] }, barWidth:'62%', label:{ show:true, position:'top', distance:4, fontSize:chico ? 9 : 10, color:'#2B2926', lineHeight:12, rotate:chico ? 90 : 0, align:chico ? 'left' : 'center', verticalAlign:chico ? 'middle' : 'bottom', formatter:p => chico ? nC[p.dataIndex] : nC[p.dataIndex]+'\n'+corto(p.value) },
                emphasis:{ itemStyle:{ color:'#7E302B' }, label:{ fontWeight:700, color:'#fff', backgroundColor:'#7E302B', borderRadius:3, padding:[2,4] } } },
              { type:'bar', xAxisIndex:2, yAxisIndex:2, data:totR, itemStyle:{ color:'#2F6657', borderRadius:[0,3,3,0] }, barWidth:'60%', label:{ show:true, position:'right', fontSize:10, color:'#5C5952', formatter:p => corto(p.value) }, emphasis:{ itemStyle:{ color:'#7E302B' }, label:{ fontWeight:700, color:'#7E302B' } } },
              { id:'banda', type:'scatter', xAxisIndex:0, yAxisIndex:0, data:[], silent:true, z:15, symbol:'rect', animation:false, itemStyle:{ color:'rgba(126,48,43,.12)' } },
              { id:'foco', type:'scatter', xAxisIndex:0, yAxisIndex:0, data:[], silent:true, z:20, symbol:'roundRect', animationDurationUpdate:120, itemStyle:{ opacity:1, borderColor:'#FCFBF7', borderWidth:2.5, borderRadius:6, shadowBlur:16, shadowOffsetY:3, shadowColor:'rgba(0,0,0,.35)' }, z:30,
                label:{ show:true, position:'inside', fontWeight:700, fontSize:14, formatter:p => p.value[2] ? miles(p.value[2]) : '0' } }] });
    // al pasar sobre una celda se iluminan su país (barra de arriba) y su estado (barra de la derecha)
    ch.off('mouseover'); ch.off('mouseout'); ch.off('globalout'); ch.off('click');
    // al pasar sobre una celda: la celda crece un poco con su número en negrita, y se marcan su columna (arriba) y su fila (izquierda y derecha)
    const cel = (() => { const a = ch.convertToPixel({gridIndex:0}, [0,0]), b = ch.convertToPixel({gridIndex:0}, [1,1]); return [Math.abs(b[0]-a[0]), Math.abs(b[1]-a[1])]; })();
    const enfoca = p => { const d = datos[p.dataIndex], fondo = d.itemStyle.color, t = p.value[2] ? Math.log1p(p.value[2])/Math.log1p(mx) : 0;
      const banda = []; C.forEach((_,x) => { if (x!==p.value[0]) banda.push([x, p.value[1]]); }); R.forEach((_,y) => { if (y!==p.value[1]) banda.push([p.value[0], y]); });
      ch.setOption({ series:[{ id:'banda', data:banda, symbolSize:[cel[0], cel[1]] }, { id:'foco', data:[{ value:p.value, symbolSize:[Math.max(cel[0]*1.5, 62), Math.max(cel[1]*1.7, 32)], itemStyle:{ color:echarts.color.lift(fondo, t>.62 ? -0.12 : -0.06) }, label:{ color:t>.62 ? '#fff' : '#2B2926' } }] }] }); };
    ch.on('mouseover', p => { if (p.seriesIndex!==0) return; ch.dispatchAction({ type:'downplay', seriesIndex:[1,2] }); ch.dispatchAction({ type:'highlight', seriesIndex:1, dataIndex:p.value[0] }); ch.dispatchAction({ type:'highlight', seriesIndex:2, dataIndex:p.value[1] }); enfoca(p); });
    ch.on('globalout', () => { ch.dispatchAction({ type:'downplay', seriesIndex:[1,2] }); ch.setOption({ series:[{ id:'banda', data:[] }, { id:'foco', data:[] }] }); });
    ch.on('click', p => { let s = null;
      if (p.componentType==='yAxis') s = {t:tr?'p':'e', i:R[nR.indexOf(p.value)][0]};
      else if (p.seriesIndex===0) s = {t:tr?'p':'e', i:R[p.value[1]][0]}; else if (p.seriesIndex===2) s = {t:tr?'p':'e', i:R[p.dataIndex][0]}; else if (p.seriesIndex===1) s = {t:tr?'e':'p', i:C[p.dataIndex][0]};
      if (s){ Q.dvSel = Q.dvSel && nomSel(Q.dvSel)===nomSel(s) ? null : s; detalle(); } });
  }
  // ---- tabla: totales y sexo por tipo de documento; las tarjetas de arriba la ordenan
  const porN = Q.dvR==='n' && RG.dv_n;
  const base = porN ? RG.dv_n.map(f => [f[0], f[1], f[2]].concat(tipos.map(x => { const k = RG.dv_nt.indexOf(x); return k>=0 ? f[3+k] : 0; }))) : (RG.dv_ed || []);
  if (base.length){ const ord = Q.dvOrd==null ? -1 : Q.dvOrd, key = f => ord===-1 ? f[1]+f[2] : ord===-2 ? f[2]/Math.max(1,f[1]+f[2]) : ord===-3 ? f[1] : ord===-4 ? f[2] : f[3+ord];
    const filas = base.slice().sort((a,b) => key(b)-key(a)), mxT = Math.max.apply(null, filas.map(f => f[1]+f[2])), mxG = Math.max.apply(null, filas.map(f => Math.max.apply(null, f.slice(3)))) || 1;
    const tono = (n, m, c) => { if (!n) return ''; const t = Math.log1p(n)/Math.log1p(m); return ' style="background:'+echarts.color.modifyAlpha(c, (0.08+t*0.82).toFixed(2))+';color:'+(t>.62?'#fff':'#2B2926')+'"'; };
    const cab = (k, txt, tit) => '<th data-rdvo="'+k+'" class="'+(ord===k?'on':'')+'" title="Ordenar por '+esc(tit)+'">'+txt+(ord===k?' ▾':'')+'</th>';
    $('rg-dve-q').innerHTML = (ord>=0 ? 'Ordenado por <b>'+esc(tipos[ord])+'</b> · ' : '')+'toca una tarjeta de arriba o un encabezado para ordenar · color: más oscuro = más documentos (misma escala en toda la tabla)';
    $('rg-dve').innerHTML = '<table class="rg-tb rg-tbe"><thead><tr><th class="l">'+(porN ? 'Nacionalidad' : 'Estado')+'</th>'+cab(-1,'Total','total')+cab(-3,'Hombres','hombres')+cab(-4,'Mujeres','mujeres')+cab(-2,'% M','porcentaje de mujeres')+
        tipos.map((x,k) => cab(k, nomT(x).replace(' ','<br>'), x).replace('<th ', '<th'+(ord===k ? ' style="background:#E3ECE8"' : '')+' ')).join('')+'</tr></thead><tbody>'+
      filas.slice(0, Q.dvTodo ? filas.length : 12).map(f => { const t = f[1]+f[2];
        return '<tr><th class="l">'+esc(f[0])+'</th><td class="tot"'+tono(t, mxT, '#2B2926')+'>'+corto(t)+'</td><td class="pm">'+corto(f[1])+'</td><td class="pm">'+corto(f[2])+'</td><td class="pm"><span class="rg-hm" style="display:inline-flex;width:38px;vertical-align:middle;margin-right:5px"><i style="width:'+pct(f[1],t)+'%"></i><i style="width:'+pct(f[2],t)+'%"></i></span>'+pct(f[2],t)+'%</td>'+
          tipos.map((x,k) => '<td'+tono(f[3+k], mxG, '#2F6657')+(ord===k && f[3+k] ? ' class="sel"' : '')+' title="'+esc(f[0]+' · '+x)+': '+miles(f[3+k])+'">'+(f[3+k] ? corto(f[3+k]) : '·')+'</td>').join('')+'</tr>'; }).join('')+'</tbody></table>'+
      (filas.length>12 ? '<button class="rg-mas-f" data-rdvtodo>'+(Q.dvTodo ? 'Ver solo los 12 principales ▴' : 'Ver '+(porN ? 'las '+filas.length+' nacionalidades' : 'los '+filas.length+' estados')+' ▾')+'</button>' : ''); }
}

/* ==== [6] VALIDACIÓN DEL REGISTRO CIVIL =========================== */
// Cada renglón: [día, días entre registro y solicitud, O.R. que reporta, entidad de registro, nacionalidad, trámite, acto, resultado, oficina solicitante]
// La DGRAM es oficina central: reporta actas de todo el país, así que no cuenta como «otro estado».
const CENTRAL = 'DGRAM';
function vistaValidacion(){
  if (!RG.va){ $('rg-body').innerHTML = '<div class="caja"><p class="mini">Falta el archivo de validaciones del Registro Civil.</p></div>'; return; }
  const VD = RG.va_dic, iniV = new Date(RG.va_ini+'T00:00:00'), f = Q.vaF, nd = Math.max.apply(null, RG.va.map(r => r[0]))+1, B = Q.vaB;
  const V = B ? RG.va.filter(r => B.t==='n' ? VD.n[r[4]]===B.v : B.t==='s' ? VD.sol[r[8]]===B.v : VD.ent[r[3]]===B.v || VD.ofr[r[2]]===B.v) : RG.va;
  const fV = d => { const x = new Date(iniV.getFullYear(), iniV.getMonth(), iniV.getDate()+d); return x.getDate()+' '+MES[x.getMonth()]; };
  const iMat = VD.acto.indexOf('Matrimonio'), iNac = VD.acto.indexOf('Nacimiento'), iVal = VD.res.indexOf('Válida'), iPen = VD.res.indexOf('Pendiente');
  const central = r => VD.ofr[r[2]]===CENTRAL, otroEdo = r => !central(r) && VD.ofr[r[2]]!==VD.ent[r[3]];
  const FIL = { todos:null, mat:r => r[6]===iMat, nac:r => r[6]===iNac, rec:r => r[6]===iMat && r[1]>=0 && r[1]<=30, otro:otroEdo, val:r => r[7]===iVal, pen:r => r[7]===iPen };
  const L = f ? V.filter(FIL[f]) : V, n = V.length, conBase = nd>=14;
  const porDia = fn => { const v = new Array(nd).fill(0); V.forEach(r => { if (!fn || fn(r)) v[r[0]]++; }); return v; };
  const kp = [['todos','Solicitudes','#2B2926',IC.acta], ['mat','Matrimonio','#C4605A',IC.acta], ['nac','Nacimiento','#C4605A',IC.acta], ['rec','Matrimonio de ≤30 días','#C4605A',IC.reloj], ['otro','Acta de otro estado','#C4605A',IC.alerta], ['val','Válidas','#2F6657',IC.ok], ['pen','Pendientes','#2F6657',IC.reloj]];
  const carta = x => { const v = porDia(FIL[x[0]]), t = v.reduce((a,b)=>a+b,0); return kc({ attr:' data-rva="'+x[0]+'"', on:(f||'todos')===x[0], col:x[2], ic:x[3], nom:x[1], sub:x[0]==='todos' ? fV(0)+' – '+fV(nd-1) : '', val:miles(t), num:t, fmt:'m', d:'<span class="kc-d">'+(x[0]==='todos' ? 'por día' : pct(t,n)+'%')+'</span>', b:minibarras(v), title:x[1]+': '+miles(t)+' · '+pct(t,n)+'% del total' }); };
  const quien = B ? ' · <b>'+esc(B.v)+'</b>' : '', tF = B ? ' · <b>'+esc(B.v)+'</b>' : '';
  $('rg-body').innerHTML = '<div class="ctl rg-ctl"><div class="rango"><b>'+fV(0)+' – '+fV(nd-1)+' '+iniV.getFullYear()+'</b><span>corte semanal · aplica desde el '+fV(0)+' '+iniV.getFullYear()+'</span></div>'+
      cajaBusca('rg-va-bus', 'Buscar estado, nacionalidad u oficina')+(B ? '<span class="tag-f">'+esc(B.v)+' <button data-rvab aria-label="Quitar filtro">×</button></span>' : '')+'</div>'+
    '<section class="kpis rg-kpis" data-modo="'+(Q.compacto?'compacto':'tarjetas')+'"><div class="kg" style="flex:1 1 0;--g:#2B2926"><div class="eti">Total'+tF+'</div><div>'+carta(kp[0])+'</div></div>'+
      '<div class="kg g-irr" style="flex:2 1 0"><div class="eti">Tipo de acta</div><div>'+kp.slice(1,3).map(carta).join('')+'</div></div>'+
      '<div class="kg g-irr" style="flex:2 1 0"><div class="eti">Señales para revisar</div><div>'+kp.slice(3,5).map(carta).join('')+'</div></div>'+
      '<div class="kg g-reg" style="flex:2 1 0"><div class="eti">Resultado</div><div>'+kp.slice(5).map(carta).join('')+'</div></div>'+plegar()+'</section>'+
    '<div class="rg-hz" id="rg-va-hz"></div>'+
    '<div class="rg-g rg-g4"><div class="caja"><h2><span>Solicitudes por tipo de acta</span>'+info('vae')+'<button class="rg-ib'+(Q.vaEti?' on':'')+'" data-rvaeti title="'+(Q.vaEti?'Ocultar':'Mostrar')+' valores">123</button></h2><span class="q">por día · '+fV(0)+' – '+fV(nd-1)+(f ? ' · '+kp.find(x => x[0]===f)[1] : '')+quien+'</span><div id="rg-va-evo" style="flex:1;min-height:290px"></div></div>'+
      '<div class="caja"><h2><span>Nacionalidades</span>'+info('van')+'</h2><span class="q">× = veces su peso en los trámites migratorios'+quien+'</span><div id="rg-va-nat"></div></div>'+
      '<div class="caja"><h2><span>Actas de otro estado</span>'+info('vax')+'</h2><span class="q">Registro Civil → O.R. que la reporta · sin la DGRAM'+quien+'</span><div id="rg-va-cx"></div></div></div>'+
    '<div class="rg-g rg-g21"><div class="caja"><h2><span>¿Quién reporta las actas de cada Registro Civil?</span>'+info('vaf')+'</h2><span class="q" id="rg-va-fq"></span><div id="rg-va-fl" style="height:480px"></div></div>'+
      '<div class="caja"><h2><span>Antigüedad del acta</span>'+info('vaa')+'</h2><span class="q">días entre el registro y la solicitud · tamaño = solicitudes</span><div id="rg-va-ant" style="height:180px"></div>'+
        '<p class="nota">La señal de acta reciente aplica a <b>matrimonio</b>. En nacimiento lo normal es un acta reciente; ahí la señal sería el registro tardío, que requiere la fecha de nacimiento (no viene en la base).</p><hr class="sep"><h2><span>¿Para qué trámite se pide?</span></h2><div id="rg-va-tt"></div></div></div>'+
    '<p class="nota" style="padding:0 16px">Número de acta, oficialía, libro y municipio nunca se publican. Las señales son para revisar, no conclusiones.</p>';
  const items = []; new Set(VD.ent.concat(VD.ofr)).forEach(e => items.push({n:e, t:'Estado / O.R.', v:{t:'e', v:e}}));
  VD.n.forEach(x => items.push({n:x, t:'Nacionalidad', v:{t:'n', v:x}})); VD.sol.forEach(x => { if (!items.some(y => y.n===x)) items.push({n:x, t:'Oficina solicitante', v:{t:'s', v:x}}); });
  autocompletar($('rg-va-bus'), $('rg-va-bus-r'), items, x => { Q.vaB = x.v; vistaValidacion(); });
  // evolución por tipo de acta
  const sm = nd>31, cub = d => sm ? Math.floor(d/7) : d, nb = cub(nd-1)+1, lab = Array.from({length:nb}, (x,i) => fV(sm ? i*7 : i));
  const serie = fn => { const v = new Array(nb).fill(0); L.forEach(r => { if (fn(r)) v[cub(r[0])]++; }); return v; };
  const sMat = serie(r => r[6]===iMat), sNac = serie(r => r[6]===iNac), sTot = sMat.map((v,i) => v+sNac[i]), base = { type:'line', smooth:.4, showSymbol:true, symbol:'circle', symbolSize:7, triggerLineEvent:true, emphasis:{ focus:'series' }, label:{ show:!!Q.vaEti, position:'top', fontSize:10, color:'#2B2926' } };
  let focoV = null;
  const chV = graf('rg-va-evo', { tooltip:{ trigger:'axis', formatter:ps => { const k = ps[0].dataIndex, fo = focoV!=null && focoV<2 ? ps.filter(p => p.seriesIndex===focoV) : ps;
      return '<b>'+ps[0].name+'</b><br>'+fo.map(p => p.marker+esc(p.seriesName.replace(/ \d+$/,''))+': <b>'+p.value+'</b>'+(p.seriesIndex<2 ? ' <span style="opacity:.75">('+pct(p.value, sTot[k])+'% del total)</span>' : '')).join('<br>'); } }, legend:{ bottom:0, left:0, textStyle:{fontSize:11}, icon:'roundRect', itemWidth:12, itemHeight:8, itemGap:14 },
    grid:{ left:40, right:16, top:12, bottom:48 }, xAxis:{ type:'category', data:lab, boundaryGap:false, axisTick:{show:false}, axisLine:{lineStyle:{color:'#C9C4B5'}}, axisLabel:{ color:'#5C5952', fontSize:11 } },
    yAxis:{ type:'value', axisLabel:{ color:'#5C5952', fontSize:10.5 }, splitLine:{ lineStyle:{ color:'#EFECE1' } } },
    series:[Object.assign({}, base, { name:'Matrimonio '+sMat.reduce((a,b)=>a+b,0), data:sMat, lineStyle:{ width:2.6, color:'#C4605A' }, color:'#C4605A' }),
            Object.assign({}, base, { name:'Nacimiento '+sNac.reduce((a,b)=>a+b,0), data:sNac, lineStyle:{ width:2.6, color:'#8F7F2E' }, color:'#8F7F2E' }),
            Object.assign({}, base, { name:'Total '+L.length, data:sTot, lineStyle:{ width:2, color:'#B5B0A3', type:'dashed' }, color:'#B5B0A3' })] });
  chV.off('mouseover'); chV.off('mouseout'); chV.on('mouseover', p => { if (p.componentType==='series') focoV = p.seriesIndex; }); chV.on('mouseout', () => { focoV = null; });
  // nacionalidades: peso en validación contra su peso en los trámites migratorios
  const tN = agg(K.n, NN, {doc:null, est:null, ofi:null, nats:null, d0:0, d1:RG.dias, ex:personas}), TT = tN.reduce((a,b)=>a+b,0), pT = {}; DIC.n.forEach((x,i) => pT[x] = tN[i]/TT);
  const nat = {}; L.forEach(r => { const k = VD.n[r[4]]; nat[k] = nat[k] || [0,0]; nat[k][r[6]===iMat?0:1]++; });
  const ln = Object.entries(nat).sort((a,b)=>(b[1][0]+b[1][1])-(a[1][0]+a[1][1])).slice(0,9), mxn = ln.length ? ln[0][1][0]+ln[0][1][1] : 1, veces = x => pT[x[0]] ? ((x[1][0]+x[1][1])/L.length)/pT[x[0]] : null;
  $('rg-va-nat').innerHTML = ln.map(x => { const t = x[1][0]+x[1][1], vz = veces(x);
    return '<div class="rg-rep rg-rep4"><span>'+esc(x[0])+'</span><span class="b"><i style="width:'+(x[1][0]/mxn*100).toFixed(1)+'%;background:#C4605A"></i><i style="width:'+(x[1][1]/mxn*100).toFixed(1)+'%;background:#8F7F2E"></i></span><b class="num">'+t+'</b>'+
      '<em class="'+(vz>=3?'al':'')+'" title="'+pct(t,L.length)+'% de las validaciones contra '+(pT[x[0]] ? (pT[x[0]]*100).toFixed(1) : '—')+'% de los trámites">'+(vz ? '×'+(vz>=10 ? Math.round(vz) : vz.toFixed(1)) : '—')+'</em></div>'; }).join('')+
    '<span class="nota"><i class="sw" style="background:#C4605A"></i>matrimonio <i class="sw" style="background:#8F7F2E"></i>nacimiento · ×3 o más en rojo</span>';
  // cruces entre estados (sin la DGRAM)
  const cx = {}, porOrig = {}; L.forEach(r => { const e = VD.ent[r[3]]; porOrig[abr(e)] = (porOrig[abr(e)]||0)+1; if (otroEdo(r)){ const k = abr(e)+' → '+abr(VD.ofr[r[2]]); cx[k] = (cx[k]||0)+1; porOrig[abr(e)] = (porOrig[abr(e)]||0); } });
  const nCen = L.filter(central).length, lx = Object.entries(cx).sort((a,b)=>b[1]-a[1]).slice(0,9), mxx = lx.length ? lx[0][1] : 1, fuera = Object.values(cx).reduce((a,b)=>a+b,0), sinC = L.length-nCen;
  $('rg-va-cx').innerHTML = '<p class="rg-dato"><b class="num">'+pct(fuera, sinC)+'%</b> de las actas las reporta una O.R. de otro estado</p>'+
    (lx.length ? lx.map(x => '<div class="rg-rep"><span title="'+esc(x[0])+'">'+esc(x[0])+'</span><span class="b"><i style="width:'+(x[1]/mxx*100).toFixed(1)+'%;background:#C4605A"></i></span><b class="num">'+x[1]+'</b><em>'+pct(x[1], porOrig[x[0].split(' → ')[0]])+'%</em></div>').join('') : '<p class="mini">Sin cruces en la selección.</p>')+
    '<span class="nota">% = parte de las actas de ese Registro Civil · la DGRAM (central) reportó '+nCen+' ('+pct(nCen, L.length)+'%)</span>';
  // análisis: concentración, otro estado y variación solo con base suficiente
  const t = [], top = ln.slice(0,2);
  if (top.length){ const s = top.reduce((a,x)=>a+x[1][0]+x[1][1],0), mt = top.reduce((a,x)=>a+x[1][0],0);
    t.push('<strong>'+top.map(x => esc(x[0])).join('</strong> y <strong>')+'</strong> concentran <strong>'+pct(s, L.length)+'%</strong> de las solicitudes ('+top.map(x => { const vz = veces(x); return vz ? '×'+vz.toFixed(1) : '—'; }).join(' y ')+' su peso en trámites); '+pct(mt, s)+'% son de matrimonio.'); }
  if (lx.length) t.push('<strong>'+pct(fuera, sinC)+'%</strong> de las actas las reporta una O.R. de otro estado (sin contar la DGRAM); el cruce principal es <strong>'+esc(lx[0][0])+'</strong> ('+lx[0][1]+').');
  if (conBase){ const w = Math.floor(nd/7), sem = k => L.filter(r => Math.floor(r[0]/7)===k).length, A = sem(w-2), Bv = sem(w-1);   // últimas dos semanas completas
    t.push('Variación '+(Bv>=A?'positiva':'negativa')+' de <strong>'+Math.abs(Bv-A)+'</strong> solicitudes de semana a semana ('+A+' → '+Bv+').'); }
  else t.push('Con '+nd+' días de datos aún no hay base para comparar; la comparación semanal inicia con la segunda semana completa.');
  // titulares: volumen y composición, concentración de nacionalidades y otro estado
  const hz = [], sem = k => L.filter(r => Math.floor(r[0]/7)===k), wC = Math.floor(nd/7);
  if (conBase){ const A = sem(wC-2), Bv = sem(wC-1), mA = A.filter(r => r[6]===iMat).length, mB = Bv.filter(r => r[6]===iMat).length, dl = A.length ? (Bv.length/A.length-1)*100 : 0;
    hz.push({ cl:dl>=0?'u':'d', ic:dl>=0?'▲':'▼', h:'<b>'+(dl>=0?'Suben':'Bajan')+' '+Math.abs(dl).toFixed(1)+'%</b> las solicitudes de semana a semana', t:A.length+' → '+Bv.length+' · matrimonio '+pct(mA,A.length)+'% → '+pct(mB,Bv.length)+'%' }); }
  else { const mT = L.filter(r => r[6]===iMat).length;
    hz.push({ cl:'n', ic:'◆', h:'<b>'+miles(L.length)+' solicitudes</b> en '+nd+' días; '+pct(mT, L.length)+'% son de matrimonio', t:'con menos de dos semanas aún no se compara semana a semana' }); }
  const t5 = ln.slice(0,5), c5 = t5.reduce((a,x)=>a+x[1][0]+x[1][1],0);
  if (t5.length){ const vz = veces(t5[0]); hz.push({ cl:vz>=3 ? 'al' : 'n', ic:vz>=3 ? '!' : '◆', h:'<b>'+esc(t5[0][0])+'</b> encabeza con '+pct(t5[0][1][0]+t5[0][1][1], L.length)+'%'+(vz ? ' (×'+vz.toFixed(1)+' su peso en trámites)' : ''), t:'las 5 principales concentran '+pct(c5, L.length)+'%: '+t5.map(x => esc(x[0])).join(', ') }); }
  if (lx.length) hz.push({ cl:'n', ic:'⇄', h:'<b>'+pct(fuera, sinC)+'%</b> de las actas las reporta una O.R. de otro estado', t:'cruce principal: '+esc(lx[0][0])+' ('+lx[0][1]+') · sin contar la DGRAM' });
  $('rg-va-hz').innerHTML = hz.map(h => '<div class="rg-hz-i '+h.cl+'"><span class="rg-hz-ic">'+h.ic+'</span><span class="rg-hz-x"><span class="rg-hz-h">'+h.h+'</span><small>'+h.t+'</small></span></div>').join('')+info('vah');
  // para qué trámite se pide la validación
  const tt = {}; L.forEach(r => { const k = VD.t[r[5]]; tt[k] = (tt[k]||0)+1; });
  $('rg-va-tt').innerHTML = barrasHTML(Object.entries(tt).sort((a,b)=>b[1]-a[1]).map(x => [x[0].replace(' por unidad familiar',' (unidad familiar)'), x[1]]), L.length, '#2F6657');
  // flujo: Registro Civil de origen → O.R. que reporta (verde = mismo estado, rojo = otro estado, gris = central)
  const cuenta = idx => { const c = {}; L.forEach(r => { const x = (idx===3 ? VD.ent : VD.ofr)[r[idx]]; c[x] = (c[x]||0)+1; }); return c; };
  const topN = idx => Object.entries(cuenta(idx)).sort((a,b)=>b[1]-a[1]).slice(0,10).map(x => x[0]);
  const iz = topN(3), de = topN(2), fl = {};
  L.forEach(r => { const e = VD.ent[r[3]], o = VD.ofr[r[2]], a = iz.indexOf(e)>=0 ? e : 'Otros estados', b = de.indexOf(o)>=0 ? o : 'Otras O.R.', k = a+'|'+b;
    fl[k] = fl[k] || {s:a, t:b, v:0, tipo: o===CENTRAL ? 'c' : e===o ? 'm' : 'o'}; fl[k].v++; });
  const tc = Object.entries(cx).sort((a,b)=>b[1]-a[1]).slice(0,3);
  $('rg-va-fq').innerHTML = '<i class="sw" style="background:#2F6657"></i>mismo estado <i class="sw" style="background:#C4605A"></i>otro estado <i class="sw" style="background:#B5B0A3"></i>DGRAM (central)'+(tc.length ? ' · mayores cruces: '+tc.map(x => '<b>'+esc(x[0])+'</b> ('+x[1]+')').join(', ') : '');
  const nI = iz.concat(Object.values(fl).some(x => x.s==='Otros estados') ? ['Otros estados'] : []), nD = de.concat(Object.values(fl).some(x => x.t==='Otras O.R.') ? ['Otras O.R.'] : []);
  const colL = {m:['#2F6657',.28], o:['#C4605A',.6], c:['#9A958A',.35]};
  const chF = graf('rg-va-fl', { tooltip:{ formatter:p => p.dataType==='edge' ? '<b>'+p.value+' actas</b> registradas en '+esc(p.data.source.slice(2))+' y reportadas por la O.R. '+esc(p.data.target.slice(2))+'<br><span style="opacity:.75">'+({m:'mismo estado', o:'otro estado', c:'oficina central (DGRAM)'})[p.data.tipo]+'</span>' : '<b>'+esc(p.name.slice(2))+'</b><br>'+p.value+' actas' },
    series:[{ type:'sankey', left:130, right:150, top:18, bottom:8, nodeWidth:12, nodeGap:9, layoutIterations:0, draggable:false, emphasis:{ focus:'adjacency' },
      data:nI.map(e => ({ name:'I·'+e, depth:0, itemStyle:{ color:'#8F7F2E', borderWidth:0 } })).concat(nD.map(o => ({ name:'D·'+o, depth:1, itemStyle:{ color:o===CENTRAL ? '#9A958A' : '#2F6657', borderWidth:0 } }))),
      links:Object.values(fl).map(x => ({ source:'I·'+x.s, target:'D·'+x.t, value:x.v, tipo:x.tipo, lineStyle:{ color:colL[x.tipo][0], opacity:colL[x.tipo][1], curveness:.5 } })),
      levels:[{ depth:0, label:{ position:'left' } }, { depth:1, label:{ position:'right' } }], label:{ show:true, fontSize:12, color:'#2B2926', formatter:p => p.name.slice(2)+'  '+p.value } }],
    graphic:[{ type:'text', left:0, top:0, style:{ text:'Registro Civil', font:'600 11px Barlow, sans-serif', fill:'#8F7F2E' } }, { type:'text', right:0, top:0, style:{ text:'O.R. que reporta', font:'600 11px Barlow, sans-serif', fill:'#2F6657' } }] });
  chF.getZr().off('click'); chF.getZr().on('click', e => { if (!e.target) chF.dispatchAction({ type:'downplay', seriesIndex:0 }); });
  // antigüedad: burbujas por tramo y tipo de acta
  const tramos = [['≤30 d',0,30],['1–3 m',31,90],['3–6 m',91,180],['6–12 m',181,365],['1–2 a',366,730],['2–5 a',731,1825],['>5 a',1826,1e9]], bur = [];
  [[iMat,'Matrimonio','#C4605A'],[iNac,'Nacimiento','#8F7F2E']].forEach((a,y) => tramos.forEach((tr,x) => { const v = L.filter(r => r[6]===a[0] && r[1]>=tr[1] && r[1]<=tr[2]).length; bur.push({ value:[x, y, v], itemStyle:{ color:a[2], opacity: x===0 && y===0 ? 1 : .55 } }); }));
  const mxb = Math.max.apply(null, bur.map(b => b.value[2]).concat(1));
  graf('rg-va-ant', { tooltip:{ formatter:p => (p.value[1]===0?'Matrimonio':'Nacimiento')+' · '+tramos[p.value[0]][0]+': '+p.value[2]+' actas' },
    grid:{ left:74, right:10, top:6, bottom:22 }, xAxis:{ type:'category', data:tramos.map(t => t[0]), axisLabel:{fontSize:10.5,color:'#5C5952'}, axisTick:{show:false}, axisLine:{show:false}, splitLine:{show:true,lineStyle:{color:'#EFECE1'}} },
    yAxis:{ type:'category', data:['Matrimonio','Nacimiento'], axisLabel:{fontSize:11.5,fontWeight:600}, axisTick:{show:false}, axisLine:{show:false} },
    series:[{ type:'scatter', data:bur, symbolSize:d => 6+40*Math.sqrt(d[2]/mxb), label:{ show:true, color:'#fff', fontSize:10.5, fontWeight:600, formatter:p => p.value[2]>=12 ? p.value[2] : '' }, emphasis:{ scale:1.15 } }] });
}

/* ==== [7] MONTAJE Y EVENTOS ======================================= */
function montar(cont){
  cont.innerHTML = '<div class="rg"><div class="rg-sub"><div><span class="mini">Direcciones › DGRAM</span><h1>Regulación y Archivo Migratorio</h1></div><div class="rg-vistas">'+
    [['tram','Trámites'],['dv','Documentos vigentes'],['val','Validación R. Civil']].map(x => '<button data-rvista="'+x[0]+'" class="'+(Q.vista===x[0]?'on':'')+'">'+x[1]+'</button>').join('')+'</div></div><div id="rg-body" class="rg-body anim"></div></div>';
  setTimeout(() => { const b = $('rg-body'); if (b) b.classList.remove('anim'); }, 1100);
  ({ tram:vistaTramites, dv:vistaVigentes, val:vistaValidacion })[Q.vista]();
  contar();
}
function eventos(cont){
  cont.addEventListener('click', e => { const T = s => e.target.closest(s); let b;
    if ((b = T('[data-rvista]'))){ Q.vista = b.dataset.rvista; montar(cont); return; }
    if ((b = T('[data-rdoc]'))){ const c = +b.dataset.rdoc; Q.doc = Q.doc===c ? -1 : c; tramites(); return; }
    if (T('[data-rmas]')){ Q.mas = !Q.mas; abrirMas(true); return; }
    if (T('[data-rplegar]')){ Q.compacto = !Q.compacto; montar(cont); return; }
    if ((b = T('[data-rper]'))){ Q.per = b.dataset.rper; if (Q.per==='todo'){ Q.d0 = 0; Q.d1 = RG.dias; } else if (Q.per==='anio'){ const y = fDia(RG.dias-1).getFullYear(); Q.d0 = Math.max(0, diaDe(y+'-01-01')); Q.d1 = Math.min(RG.dias, diaDe((y+1)+'-01-01')); } tramites(); return; }
    if ((b = T('[data-rcmp]'))){ Q.cmp = b.dataset.rcmp==='aa' ? 'aa' : +b.dataset.rcmp; tramites(); return; }
    if ((b = T('[data-rgran]'))){ Q.gran = b.dataset.rgran; pintarPrincipal(); return; }
    if ((b = T('[data-rofi]'))){ const o = +b.dataset.rofi; Q.ofi = Q.ofi===o ? -1 : o; pintarOficinas(); return; }
    if ((b = T('[data-rnat]'))){ alternarNat(+b.dataset.rnat); return; }
    if ((b = T('[data-ror]'))){ const x = +b.dataset.ror; if (Q.ests.indexOf(x)>=0){ Q.ests.splice(Q.ests.indexOf(x),1); if (Q.ests.length<2 && Q.desg==='or') Q.desg = 'tot'; Q.ofi = -1; tramites(); } else agregarEst(x); return; }
    if ((b = T('[data-rfil]'))){ Q.fil = b.dataset.rfil; Q.mz = null; pintarMezcla(); return; }
    if ((b = T('[data-rtg]'))){ Q.tipoG = b.dataset.rtg; pintarEvolucion(); return; }
    if (T('[data-reti]')){ Q.eti = !Q.eti; pintarPrincipal(); return; }
    if ((b = T('[data-rdesg]'))){ Q.desg = b.dataset.rdesg; PANEL = null; pintarPrincipal(); return; }
    if (T('[data-rcierra]')){ cerrarPanel(); return; }
    if (T('[data-rdet]')){ Q.det = !Q.det; vistaTramites(); return; }
    if ((b = T('[data-rver]'))){ Q.det = true; Q.ofi = +b.dataset.rver; vistaTramites(); const of = $('rg-of'); if (of) of.closest('.caja').scrollIntoView({ behavior:'smooth', block:'center' }); return; }
    if ((b = T('[data-rtot]'))){ Q.tot = b.dataset.rtot; pintarTotales(); return; }
    if ((b = T('[data-rvert]'))){ Q.tot = b.dataset.rvert; Q.det = true; vistaTramites(); const c = $('rg-totales'); if (c) c.scrollIntoView({ behavior:'smooth', block:'start' }); return; }
    if ((b = T('[data-rpv]'))){ Q.pv = b.dataset.rpv; pintarPanel(); return; }
    if ((b = T('[data-rpof]'))){ Q.pv = 'of'; Q.pof = +b.dataset.rpof; pintarPanel(); return; }
    if ((b = T('[data-rpn]'))){ const n = +b.dataset.rpn; Q.pv = 'res'; if (Q.nats.indexOf(n)<0) alternarNat(n); return; }
    if ((b = T('[data-rpe]'))){ agregarEst(+b.dataset.rpe); return; }
    if ((b = T('[data-rpo]'))){ Q.ofiF = +b.dataset.rpo; Q.est = -1; Q.pv = 'res'; tramites(); return; }
    if (T('[data-rvolver]')){ Q.pv = 'res'; PANEL = null; pintarPanel(); return; }
    if (T('[data-rlimpia]')){ Q.nats = []; Q.ests = []; Q.ofiF = -1; Q.doc = -1; Q.pv = 'res'; Q.desg = 'tot'; tramites(); return; }
    if ((b = T('[data-rhn]'))){ Q.nats = [+b.dataset.rhn]; Q.desg = 'nat'; PANEL = null; tramites(); return; }
    if ((b = T('[data-rinfo]'))){ const p = $('rg-pop'); if (p && !p.hidden && infoFija && p.dataset.cual===b.dataset.rinfo) mostrarInfo(null, null); else { mostrarInfo(b, true); $('rg-pop').dataset.cual = b.dataset.rinfo; } return; }
    if (T('[data-rdvtodo]')){ Q.dvTodo = !Q.dvTodo; vistaVigentes(); return; }
    if ((b = T('.rg-mz-b i[data-c]'))){ const c = +b.dataset.c; Q.mz = Q.mz===c ? null : c; pintarMezcla(); return; }
    if ((b = T('[data-rmz]'))){ const c = +b.dataset.rmz; Q.mz = Q.mz===c ? null : c; pintarMezcla(); return; }
    if ((b = T('[data-rquita]'))){ const k = b.dataset.rquita; if (k[0]==='e'){ Q.ests.splice(Q.ests.indexOf(+k.slice(1)), 1); if (Q.ests.length<2 && Q.desg==='or') Q.desg = 'tot'; } else if (k==='o') Q.ofiF = -1; else Q.nats.splice(Q.nats.indexOf(+k.slice(1)), 1); Q.ofi = -1; tramites(); return; }
    if ((b = T('[data-rdvk]'))){ const k = +b.dataset.rdvk; Q.dvOrd = Q.dvOrd===k ? null : k; vistaVigentes(); return; }
    if (T('[data-rdvsx]')){ Q.dvSel = null; vistaVigentes(); return; }
    if (T('[data-rdvmx]')){ Q.dvMxTodo = !Q.dvMxTodo; vistaVigentes(); return; }
    if ((b = T('[data-rdvt]'))){ Q.dvT = b.dataset.rdvt; vistaVigentes(); return; }
    if ((b = T('[data-rdvo]'))){ Q.dvOrd = +b.dataset.rdvo; vistaVigentes(); return; }
    if ((b = T('[data-rdvr]'))){ Q.dvR = b.dataset.rdvr; Q.dvOrd = null; vistaVigentes(); return; }
    if (T('[data-rvaeti]')){ Q.vaEti = !Q.vaEti; vistaValidacion(); return; }
    if (T('[data-rvab]')){ Q.vaB = null; vistaValidacion(); return; }
    if ((b = T('[data-rva]'))){ Q.vaF = b.dataset.rva==='todos' || Q.vaF===b.dataset.rva ? null : b.dataset.rva; vistaValidacion(); return; }
  });
  // al pasar el cursor: la tarjeta resalta su línea y el color de la mezcla se compara en todos los renglones
  cont.addEventListener('mouseover', e => {
    const seg = e.target.closest('.rg-mz-b i[data-c], [data-rmz]');
    if (seg) focoMezcla(+(seg.dataset.c!=null ? seg.dataset.c : seg.dataset.rmz)); else if (mzFoco!=null && !e.target.closest('#rg-mz')) focoMezcla(null);
    const el = $('rg-evo'), ch = el && echarts.getInstanceByDom(el); if (!ch) return;
    const t = e.target.closest('[data-rdoc]'), k = t ? SERIE_DOC[+t.dataset.rdoc] : null;
    if (k!=null && k!==cont._luz){ ch.dispatchAction({ type:'downplay' }); ch.dispatchAction({ type:'highlight', seriesIndex:k }); cont._luz = k; }
    else if (k==null && cont._luz!=null){ ch.dispatchAction({ type:'downplay' }); cont._luz = null; }
  });
  cont.addEventListener('mouseleave', () => focoMezcla(null));
  // ayuda (i): con mouse se asoma al pasar; con un toque queda fija con su ×
  let puntero = 'mouse';
  document.addEventListener('pointerdown', e => { puntero = e.pointerType; if (!e.target.closest('#rg-pop, [data-rinfo]')) mostrarInfo(null, null); }, true);
  document.addEventListener('click', e => { if (e.target.closest('[data-rpopx]')) mostrarInfo(null, null); });
  cont.addEventListener('mouseover', e => { const b = e.target.closest('[data-rinfo]'); if (b && puntero==='mouse' && !infoFija) mostrarInfo(b, false); });
  cont.addEventListener('mouseout', e => { const b = e.target.closest('[data-rinfo]'); if (b && !b.contains(e.relatedTarget)) mostrarInfo(null); });
  window.addEventListener('scroll', () => { if (!infoFija) mostrarInfo(null); }, {passive:true});
  cont.addEventListener('change', e => { const id = e.target.id;
    if (id==='rg-cmp'){ const v = e.target.value; Q.cmp = v==='sem' || v==='aa' ? v : +v; tramites(); return; }
    if (id==='rg-d0' || id==='rg-d1'){ Q.d0 = Math.max(0, diaDe($('rg-d0').value)); Q.d1 = Math.min(RG.dias, diaDe($('rg-d1').value)+1); if (Q.d1<=Q.d0) Q.d1 = Q.d0+1; tramites(); } });
}
let listo = false;
window.IANAMI_REGULACION = { pintar(cont){ if (!listo){ eventos(cont); listo = true; } montar(cont); } };
})();
