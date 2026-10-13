/* ==================================================================
   IA-NAMI · PROTECCIÓN AL MIGRANTE (DGPMV)
   Vista del proceso de Protección al migrante. Pestaña activa:
   Repatriados (mexicanos que EE. UU. entrega a México por garitas,
   puentes y vuelos PRIM). Vuelos comerciales y Guatemala-Honduras se
   activan cuando el área envíe los archivos corregidos. Todo se
   calcula en la página sobre datos/proteccion.js. Usa los mismos
   componentes y estilos que Control migratorio.
   ÍNDICE  [1] DATOS Y FILTROS   [2] UTILIDADES   [3] CONTROLES E INDICADORES
           [4] COMPONENTES COMUNES   [5] REPATRIADOS   [6] MONTAJE Y EVENTOS
   ================================================================== */
(function(){
'use strict';
const CV = window.IANAMI_PMV; if (!CV) return;

/* ==== [1] DATOS Y FILTROS ========================================= */
const tabla = o => { const t = {}; Object.keys(o).forEach(k => { t[k] = Int32Array.from(o[k]); }); t.N = t.d.length; return t; };
const REP = tabla(CV.rep);
const DIC = { e:CV.dic.e, p:CV.dic.p, n:[] }, NE = DIC.e.length, NP = DIC.p.length, NN = 0;
const INI = new Date(CV.inicio+'T00:00:00'), DS = (INI.getDay()+6)%7;
const semDe = d => Math.floor((d+DS)/7), semIni = w => w*7-DS;
// em = medida que se analiza (columna): v total, ad adultos, ah hombres, am mujeres, me NNA, ac acompañados, na no acompañados
const Q = { det:{}, vista:'rep', per:'todo', d0:0, d1:CV.dias, cmp:'sem', nats:[], ests:[], pto:-1, mod:-1, cls:-1, gran:'auto', eti:false, desg:'tot', sel:null, tot:'p', em:'v', mas:{}, compacto:false };
// Suma de una tabla por una clave, con los filtros activos (periodo, O.R., punto y modalidad); o.v elige la columna
function agg(T, key, nk, o){
  o = o || {}; const out = new Float64Array(nk), d0 = o.d0!=null ? o.d0 : Q.d0, d1 = o.d1!=null ? o.d1 : Q.d1, v = T[o.v || 'v'];
  const es = o.ests!==undefined ? o.ests : Q.ests, se = es && es.length ? new Set(es) : null;
  const pto = o.pto!==undefined ? o.pto : Q.pto, mod = o.mod!==undefined ? o.mod : Q.mod, ex = o.ex;
  for (let i=0;i<T.N;i++){ const d = T.d[i]; if (d<d0 || d>=d1) continue;
    if (se && !se.has(T.e[i])) continue; if (pto>=0 && T.p[i]!==pto) continue; if (mod>=0 && T.m[i]!==mod) continue; if (ex && !ex(i)) continue;
    out[key ? key(i) : 0] += v[i]; }
  return out;
}
const tot = (T, o) => agg(T, null, 1, o)[0];
const MODS = ['Terrestre','Aérea (vuelos PRIM)'], COLMOD = ['#8F7F2E','#2F6657'];
// Medidas: [nombre en plural para textos, nombre de la tarjeta]
const MED = { v:['repatriados','Repatriados'], ad:['adultos','Adultos'], ah:['hombres adultos','Hombres'], am:['mujeres adultas','Mujeres'], me:['NNA','NNA'], ac:['NNA acompañados','Acompañados'], na:['NNA no acompañados','No acompañados'] };
// Grupos que no se traslapan: con ellos se arma el perfil de cada punto
const GRUPOS = [['ah','Hombres adultos','#2F6657'],['am','Mujeres adultas','#8F7F2E'],['ac','NNA acompañados','#778E88'],['na','NNA no acompañados','#C4605A']];
const vEm = o => Object.assign({ v:Q.em }, o || {});

/* ==== [2] UTILIDADES ============================================== */
const $ = id => document.getElementById(id), MES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const miles = n => Math.round(n).toLocaleString('en-US'), corto = n => n>=1e6 ? (n/1e6).toFixed(2)+' M' : n>=1e4 ? (n/1e3).toFixed(1)+' k' : miles(n);
const pct = (a,b) => b ? (a/b*100).toFixed(1) : '0.0', esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const tasa = (r, l) => l+r ? r/(l+r)*100 : 0, tasaTxt = x => x>=1 ? x.toFixed(1)+'%' : x>=0.1 ? x.toFixed(2)+'%' : x.toFixed(3)+'%';
const fDia = d => new Date(INI.getFullYear(), INI.getMonth(), INI.getDate()+d);
const fecha = d => { const f = fDia(d); return f.getDate()+' '+MES[f.getMonth()]; }, fechaA = d => fecha(d)+' '+fDia(d).getFullYear();
const sinAcento = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const VERDE = '#2F6657', ROJO = '#C4605A', OCRE = '#8F7F2E', VINO = '#7E302B', GRIS = '#9A958A', COMP = ['#2B2926','#A8443E','#766820'];
const COLM = ['#C4605A','#2F6657','#8F7F2E','#7E302B','#BDB58D','#B66666','#CFCBBB','#2B2926'];       // motivos de salida
const COLC = ['#778E88','#C4605A','#8F7F2E'];                                                             // acompañado, no acompañado, separado
// Objeto vacío que acepta cualquier llamada: las gráficas del detalle plegado no se dibujan hasta abrirlo
const NADA = new Proxy(function(){}, { get:(t,k) => k===Symbol.toPrimitive ? () => 0 : NADA, apply:() => NADA });
function graf(id, op){ const el = $(id); if (!el) return null; if (el.closest('.cv-det[hidden]')) return NADA; let ch = echarts.getInstanceByDom(el); if (!ch){ ch = echarts.init(el); new ResizeObserver(() => ch.resize()).observe(el); }
  ch.setOption(Object.assign({ textStyle:{ fontFamily:'Barlow, sans-serif', color:'#2B2926' }, animationDuration:800, animationDurationUpdate:600,
    tooltip:{ backgroundColor:'#2B2926', borderWidth:0, textStyle:{ color:'#F4F2EA', fontSize:12 }, extraCssText:'border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.25)' } }, op), true); return ch; }
const ejeY = { type:'value', axisLabel:{ color:'#5C5952', fontSize:10.5, formatter:v => corto(v) }, splitLine:{ lineStyle:{ color:'#EEEBE2' } } };
const ejeX = data => ({ type:'category', data:data, axisTick:{show:false}, axisLine:{lineStyle:{color:'#C9C4B5'}}, axisLabel:{ color:'#5C5952', fontSize:10.5 } });
// Semanas lunes a domingo dentro del periodo; las incompletas se marcan
function semanas(){ const s0 = semDe(Q.d0), s1 = semDe(Q.d1-1), l = [];
  for (let w=s0; w<=s1; w++){ const a = Math.max(Q.d0, semIni(w)), b = Math.min(Q.d1, semIni(w)+7); l.push({ w:w, a:a, b:b, inc:b-a<7, lab:fecha(a) }); } return l; }
const porSem = (T, o) => { const S = semanas(), s0 = S[0].w, x = agg(T, i => semDe(T.d[i])-s0, S.length, o); return S.map((s,k) => x[k]); };
// «Comparar con»: la última semana completa contra la anterior, o los últimos N días contra los N previos
function ventanas(){ const N = Q.cmp;
  if (N==='sem'){ let w = semDe(Q.d1-1); if (semIni(w)+6 >= Q.d1) w--; const b = semIni(w); return b-7 >= Q.d0 ? [[b, b+7], [b-7, b]] : null; }
  return N==='aa' || 2*N > Q.d1-Q.d0 ? null : [[Q.d1-N, Q.d1], [Q.d1-2*N, Q.d1-N]]; }
const etqCmp = () => { const w = ventanas(); if (!w) return ''; return fecha(w[0][0])+' – '+fecha(w[0][1]-1)+' contra '+fecha(w[1][0])+' – '+fecha(w[1][1]-1); };
const iso = d => { const f = fDia(d); return f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0')+'-'+String(f.getDate()).padStart(2,'0'); };
// Grupo de tarjetas que se abre y cierra con un botón, igual que «Constancias y oficios» en Regulación migratoria
const masG = (tit, val, eti, col, cartas) => '<button class="rg-tog'+(Q.mas[Q.vista]?' on':'')+'" data-pmas aria-expanded="'+!!Q.mas[Q.vista]+'"><span>'+tit+'</span><b class="num">'+val+'</b><i>'+(Q.mas[Q.vista]?'‹':'›')+'</i></button>'+
  '<div class="kg rg-mas'+(Q.mas[Q.vista]?' abierto':'')+'" style="--g:'+col+'"><div class="eti">'+eti+'</div><div>'+cartas+'</div></div>';
function abrirMasC(){ const k = $('cv-kpis'), g = k && k.querySelector('.rg-mas'), t = k && k.querySelector('[data-pmas]'); if (!g) return; const on = !!Q.mas[Q.vista];
  g.classList.toggle('abierto', on); t.classList.toggle('on', on); t.setAttribute('aria-expanded', on); t.querySelector('i').textContent = on ? '‹' : '›';
  if (on){ k.classList.add('ancho'); const f = Date.now(), paso = () => { k.scrollLeft = k.scrollWidth; if (Date.now()-f < 650) requestAnimationFrame(paso); }; requestAnimationFrame(paso); } else { k.scrollLeft = 0; setTimeout(() => { if (!Q.mas[Q.vista]) k.classList.remove('ancho'); }, 620); } }
// «Ver detalle»: igual que en Regulación migratoria; arriba queda lo esencial y el resto se abre con un botón
const detIni = () => { const on = !!Q.det[Q.vista]; return '<button class="rg-det-b cv-det-b'+(on?' on':'')+'" data-pdet aria-expanded="'+on+'">'+(on ? 'Ocultar detalle ▴' : 'Ver detalle: '+DET[Q.vista]+' ▾')+'</button><div class="cv-det"'+(on ? '' : ' hidden')+'>'; };
const plegar = () => '<button class="plegar" data-pplegar aria-label="'+(Q.compacto?'Mostrar tarjetas':'Compactar indicadores')+'" title="'+(Q.compacto?'Mostrar tarjetas':'Compactar indicadores')+'"><svg width="12" height="12" viewBox="0 0 12 12"><path d="'+(Q.compacto?'M2 4l4 4 4-4':'M2 8l4-4 4 4')+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
const chipD = (a,b) => { if (!b || a+b<40) return '<span class="kc-d">—</span>'; const dl = (a/b-1)*100; return '<span class="kc-d'+(Math.abs(dl)>=20?' f':'')+'">'+(dl>=0?'▲ ':'▼ ')+Math.abs(dl).toFixed(1)+'%</span>'; };
const IC = { avion:'M2 16l20-6-20-6 3 6zM5 10h9', tierra:'M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6', barco:'M3 17l2 3h14l2-3zM12 3v11M6 14l6-7 6 7', lupa:'M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14zM20 20l-4-4',
             no:'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM6 6l12 12', tot:'M4 7h16M4 12h16M4 17h10', est:'M4 20V8l8-5 8 5v12zM9 20v-6h6v6', ret:'M20 12H5M11 6l-6 6 6 6', nino:'M12 4a2 2 0 1 0 0 4a2 2 0 0 0 0-4zM8 21v-7l-2-3 6-2 6 2-2 3v7', adulto:'M12 3a3 3 0 1 0 0 6a3 3 0 0 0 0-6zM6 21v-6a6 6 0 0 1 12 0v6' };
const svgI = d => '<span class="kc-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="'+d+'"/></svg></span>';
function minibarras(v){ const mx = Math.max.apply(null,v)||1; return '<span class="kc-b" aria-hidden="true">'+v.map((x,i) => '<i class="'+(i===v.length-1?'h':'p')+'" style="height:'+Math.max(8,x/mx*100).toFixed(0)+'%"></i>').join('')+'</span>'; }
function kc(o){ const tag = o.attr ? 'button' : 'div';
  return '<'+tag+' class="kc'+(o.on?' on':'')+'"'+(o.attr||'')+' style="--g:'+o.col+';--gs:'+o.col+'1F;--ga:'+o.col+'"'+(o.title ? ' title="'+esc(o.title)+'"' : '')+'>'+
    '<span class="kc-top">'+svgI(o.ic)+'<span class="kc-nf"><span class="kc-n">'+o.nom+'</span><span class="kc-f">'+(o.sub||'')+'</span></span></span>'+
    '<span class="kc-v num"'+(o.num!=null ? ' data-v="'+Math.round(o.num)+'"' : '')+'>'+o.val+'</span><span class="kc-pie">'+(o.d||'<span class="kc-d"></span>')+(o.b||'')+'</span></'+tag+'>'; }
const info = k => '<button class="rg-i" data-pinfo="'+k+'" aria-label="Qué muestra esta sección">i</button>';
const pil = (attr, val, ops) => '<div class="pil chica">'+ops.map(x => '<button '+attr+'="'+x[0]+'" class="'+(String(val)===String(x[0])?'on':'')+'">'+x[1]+'</button>').join('')+'</div>';
const fuente = (cl, txt) => '<span class="cv-src '+cl+'">'+txt+'</span>';
const titular = h => '<button class="rg-hz-i '+h.cl+'"'+(h.act||'')+'><span class="rg-hz-ic">'+h.ic+'</span><span class="rg-hz-x"><span class="rg-hz-h">'+h.h+'</span><small>'+h.t+'</small></span></button>';
const nomN = n => DIC.n[n], nomP = p => DIC.p[p], nomE = e => DIC.e[e];
// Barras verticales de mayor a menor con el mismo formato de Totales (nombres en varias líneas, valor encima, cuadrícula)
function barrasV(id, l, o){
  const el = $(id), w = el.parentNode.clientWidth || 900, paso0 = (w-60)/Math.max(1,l.length), ancho = Math.max(w, 60+l.length*(w<700 ? 56 : 42)), paso = (ancho-60)/Math.max(1,l.length);
  el.style.width = ancho+'px'; if (ancho>w+4 && o.q) $(o.q).insertAdjacentHTML('beforeend', ' · <b>desliza la gráfica para ver todos →</b>'); const cpl = Math.max(6, Math.floor((paso-6)/5.4));
  const parte = v => String(v).split(' ').reduce((a,x) => { const u = a[a.length-1]; if (u && (u+' '+x).length<=cpl) a[a.length-1] = u+' '+x; else a.push(x); return a; }, []), lin = Math.max(1, ...l.map(x => parte(x.lab).length));
  const series = o.series || [{ name:'', k:'v' }];
  return graf(id, { grid:{ left:46, right:12, top:o.ley ? 34 : 22, bottom:14+lin*12 }, legend:o.ley ? { top:0, left:0, icon:'roundRect', itemWidth:12, itemHeight:8, textStyle:{fontSize:11.5}, data:(o.series || []).map(x => x.name) } : { show:false },
    tooltip:{ trigger:'axis', axisPointer:{ type:'shadow' }, formatter:o.tip },
    xAxis:{ type:'category', data:l.map(x => x.lab), axisTick:{show:false}, axisLine:{lineStyle:{color:'#C9C4B5'}}, splitLine:{ show:true, lineStyle:{ color:'#EEEBE2' } }, triggerEvent:true,
      axisLabel:{ interval:0, fontSize:paso<50 ? 9.5 : 10.5, color:'#2B2926', lineHeight:12, formatter:(v,i) => { const t = parte(v).join('\n'); return l[i] && l[i].on ? t.split('\n').map(x => '{s|'+x+'}').join('\n') : t; },
        rich:{ s:{ fontWeight:700, color:VINO, fontSize:paso<50 ? 9.5 : 10.5 } } } },
    yAxis:Object.assign({}, ejeY, o.y || {}),
    series:series.map((s,j) => ({ name:s.name, type:'bar', stack:o.stack ? 'a' : undefined, barMaxWidth:34, itemStyle:{ borderRadius:o.stack ? 0 : [3,3,0,0], color:s.col },
      data:l.map(x => ({ value:x[s.k], itemStyle: series.length===1 ? { color: x.col || (l.some(y => y.on) ? (x.on ? VINO : '#B9CFC6') : VERDE) } : undefined })),
      label: series.length===1 ? { show:paso>=30, position:'top', fontSize:10, color:'#2B2926', lineHeight:12, formatter:o.eti || (p => corto(p.value)) }
        : { show:(o.stack ? false : Q.eti) && paso>=30, position:o.stack ? 'inside' : 'top', fontSize:9, color:o.stack ? '#fff' : '#2B2926', formatter:p => p.value ? corto(p.value) : '' } }))
      .concat(o.stack && series.length>1 ? [{ name:'Total', type:'bar', stack:'a', silent:true, barMaxWidth:34, data:l.map(() => 0), itemStyle:{ color:'transparent' }, tooltip:{ show:false },
        label:{ show:paso>=26, position:'top', fontSize:10, color:'#2B2926', fontWeight:600, formatter:p => corto(series.reduce((t,s) => t+(l[p.dataIndex][s.k]||0), 0)) } }] : []) });
}
function autocompletar(inp, res, items, elegir){
  if (!inp) return; items.forEach(x => x.q = sinAcento(x.n)); let hall = [], act = 0;
  const pinta = () => { res.innerHTML = hall.length ? hall.map((x,i) => '<button type="button" data-i="'+i+'" class="'+(i===act?'act':'')+'"><span>'+esc(x.n)+'</span><small>'+x.t+'</small></button>').join('') : '<span class="mini" style="padding:6px 9px;display:block">Sin coincidencias</span>'; };
  inp.addEventListener('input', () => { const q = sinAcento(inp.value.trim()); if (!q){ res.hidden = true; return; }
    hall = items.filter(x => x.q.indexOf(q)===0).concat(items.filter(x => x.q.indexOf(q)>0)).slice(0,9); act = 0; res.hidden = false; pinta(); });
  inp.addEventListener('keydown', e => { if ((e.key==='ArrowDown' || e.key==='ArrowUp') && hall.length){ act = (act + (e.key==='ArrowDown' ? 1 : -1) + hall.length) % hall.length; pinta(); e.preventDefault(); }
    else if (e.key==='Enter'){ if (!res.hidden && hall[act]){ res.hidden = true; elegir(hall[act]); } e.preventDefault(); } else if (e.key==='Escape') res.hidden = true; });
  inp.addEventListener('blur', () => setTimeout(() => { res.hidden = true; }, 150));
  res.addEventListener('mousedown', e => { const b = e.target.closest('[data-i]'); if (b){ e.preventDefault(); res.hidden = true; elegir(hall[+b.dataset.i]); } });
}

/* ==== [3] CONTROLES E INDICADORES ================================= */
const filtrosTxt = () => Q.ests.map(nomE).concat(Q.pto>=0 ? [nomP(Q.pto)] : [], Q.mod>=0 ? [MODS[Q.mod]] : []);
// «Año»: como en Pulso, se elige el año y, si se quiere, un mes; los meses sin datos quedan deshabilitados
const pad2 = n => String(n).padStart(2,'0');
function fijarAnio(){ const y = Q.anio, m = Q.mes || 0, a = diaDe(y+'-'+pad2(m || 1)+'-01'), b = m ? diaDe((m===12 ? (y+1)+'-01' : y+'-'+pad2(m+1))+'-01') : diaDe((y+1)+'-01-01');
  Q.d0 = Math.max(0, a); Q.d1 = Math.min(CV.dias, b); if (Q.d1<=Q.d0) Q.d1 = Q.d0+1; }
function selAnio(){ const y0 = fDia(0).getFullYear(), y1 = fDia(CV.dias-1).getFullYear(), an = []; for (let y=y0; y<=y1; y++) an.push(y);
  return '<span class="per-extra"><select id="pm-anio" aria-label="Año">'+an.map(y => '<option'+(y===Q.anio ? ' selected' : '')+'>'+y+'</option>').join('')+'</select>'+
    '<select id="pm-mes" aria-label="Mes"><option value="0">Todo el año</option>'+MES.map((m,i) => { const ini = diaDe(Q.anio+'-'+pad2(i+1)+'-01'), fin = diaDe((i===11 ? (Q.anio+1)+'-01' : Q.anio+'-'+pad2(i+2))+'-01'), ok = ini<CV.dias && fin>0;
      return '<option value="'+(i+1)+'"'+((Q.mes || 0)===i+1 ? ' selected' : '')+(ok ? '' : ' disabled')+'>'+m+'</option>'; }).join('')+'</select></span>'; }
function htmlCtl(){
  const okN = n => n==='sem' ? (() => { const q = Q.cmp; Q.cmp = 'sem'; const w = ventanas(); Q.cmp = q; return !!w; })() : n!=='aa' && 2*n <= Q.d1-Q.d0;
  return '<div class="pil">'+[['todo','Sheinbaum'],['trump','Trump'],['anio','Año'],['pers','Personalizado']].map(x => '<button data-pper="'+x[0]+'" class="'+(Q.per===x[0]?'on':'')+'"'+(x[0]==='trump'?' disabled title="Sin datos en ese periodo"':'')+'>'+x[1]+'</button>').join('')+'</div>'+
    (Q.per==='anio' ? selAnio() : '')+
    (Q.per==='pers' ? '<span class="per-extra"><input type="date" id="pm-d0" value="'+iso(Q.d0)+'" min="'+iso(0)+'" max="'+iso(CV.dias-1)+'"> – <input type="date" id="pm-d1" value="'+iso(Q.d1-1)+'" min="'+iso(0)+'" max="'+iso(CV.dias-1)+'"></span>' : '')+
    '<div class="rango"><b>'+fechaA(Q.d0)+' – '+fechaA(Q.d1-1)+'</b><span>'+(Q.d1-Q.d0)+' días</span></div>'+
    '<label class="rg-sel">Comparar con <select id="pm-cmp">'+[['sem','Semana anterior'],[7,'7 días previos'],[30,'30 días previos'],[90,'3 meses previos'],['aa','Mismo periodo del año anterior']].map(x => '<option value="'+x[0]+'"'+(String(Q.cmp)===String(x[0])?' selected':'')+(okN(x[0])?'':' disabled')+'>'+x[1]+(x[0]==='aa' ? ' (sin datos aún)' : '')+'</option>').join('')+'</select></label>'+
    '<span class="rg-cmp-n">'+etqCmp()+'</span>'+
    '<div class="busca rg-busca"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="pm-bus" type="search" autocomplete="off" placeholder="Buscar O.R. o punto de repatriación" aria-label="Buscar O.R. o punto de repatriación"><div class="res" id="pm-bus-r" hidden></div></div>'+
    '<span class="rg-chips">'+Q.ests.map(e => '<span class="tag-f" style="background:'+OCRE+'">'+esc(nomE(e))+' <button data-pquita="e'+e+'" aria-label="Quitar">×</button></span>').join('')+
    (Q.pto>=0 ? '<span class="tag-f" style="background:'+VERDE+'">'+esc(nomP(Q.pto))+' <button data-pquita="p" aria-label="Quitar">×</button></span>' : '')+
    (Q.mod>=0 ? '<span class="tag-f" style="background:'+COLMOD[Q.mod]+'">'+esc(MODS[Q.mod])+' <button data-pquita="m" aria-label="Quitar">×</button></span>' : '')+'</span>';
}
function buscador(){
  const items = DIC.e.map((e,i) => ({n:e, t:'O.R.', v:{t:'e', i:i}})).concat(DIC.p.map((p,i) => ({n:p, t:'Punto de repatriación', v:{t:'p', i:i}})));
  autocompletar($('pm-bus'), $('pm-bus-r'), items, x => { agregar(x.v.t, x.v.i); });
}
function agregar(t, i){
  if (t==='e'){ if (Q.ests.indexOf(i)<0){ if (Q.ests.length>=3) Q.ests.shift(); Q.ests.push(i); } }
  else Q.pto = Q.pto===i ? -1 : i;
  Q.sel = null; cuerpo();
}
// Tarjeta con cifra, variación de la última semana y mini barras por semana
function tarjeta(nom, sub, ic, col, T, o, attr, fmt, on){
  const w = ventanas(), v = tot(T, o), s = porSem(T, o);
  return kc({ nom:nom, sub:sub, ic:ic, col:col, num:v, val:fmt ? fmt(v) : corto(v), d: w ? chipD(tot(T, Object.assign({}, o, {d0:w[0][0], d1:w[0][1]})), tot(T, Object.assign({}, o, {d0:w[1][0], d1:w[1][1]}))) : '', b:minibarras(s.slice(-10)), attr:attr, on:on });
}

/* ==== [4] COMPONENTES COMUNES ===================================== */
// Lista de barras horizontales que se pueden tocar (nacionalidades, puntos, O.R.)
function listaB(l, total, col, attr, sel){ const mx = l.length ? l[0][1] : 1;
  return l.map(r => '<button class="barra pc'+(sel && sel.indexOf(r[0])>=0 ? ' on' : '')+'" '+attr+'="'+r[0]+'"><span>'+esc(r[2])+' <small>'+pct(r[1], total)+'%</small></span><span class="b"><i style="width:'+(r[1]/mx*100).toFixed(1)+'%;background:'+col+'"></i></span><span class="x">'+corto(r[1])+'</span></button>').join(''); }
const top = (x, n, quita) => [...x.keys()].filter(k => x[k] && (quita==null || k!==quita)).sort((a,b) => x[b]-x[a]).slice(0, n).map(k => [k, x[k]]);
// Totales de mayor a menor con botones por dimensión, igual que en Regulación migratoria:
// aplica los demás filtros, resalta lo elegido en la propia dimensión y, si se comparan 2 o 3 nacionalidades u O.R., una barra por cada una
function totales(c){
  const X = c.val, D = c.dim[X], G = Q.nats.length>=2 ? 'n' : Q.ests.length>=2 ? 'e' : null, grp = G && G!==X && D.T.e && (G==='e' || D.T.n) ? (G==='n' ? Q.nats : Q.ests) : null;
  const base = Object.assign({}, D.quita), sel = D.sel || [];
  const series = grp ? grp.map((v,j) => ({ name:G==='n' ? nomN(v) : nomE(v), col:COMP[j], x:agg(D.T, D.key, D.nk, Object.assign({}, base, G==='n' ? {nats:[v]} : {ests:[v]})) }))
    : c.apila ? c.apila.map(a => ({ name:a.name, col:a.col, x:agg(D.T, D.key, D.nk, Object.assign({}, base, a.o || {ex:a.ex})) })) : [{ name:'', x:agg(D.T, D.key, D.nk, base) }];
  const suma = k => series.reduce((t,s) => t+s.x[k], 0), T = [...Array(D.nk).keys()].reduce((t,k) => t+suma(k), 0), caja = $(c.ch).closest('.caja');
  if (!T){ caja.hidden = true; return; } caja.hidden = false;
  let cats = [...Array(D.nk).keys()].filter(k => suma(k)>0).sort((a,b) => suma(b)-suma(a)); const nTot = cats.length, tope = grp ? 15 : (c.tope || 30);
  let otras = null; if (cats.length>tope){ const r = cats.slice(tope).filter(k => sel.indexOf(k)<0); otras = { n:r.length, v:series.map(s => r.reduce((t,k) => t+s.x[k], 0)) }; cats = cats.slice(0, tope).concat(cats.slice(tope).filter(k => sel.indexOf(k)>=0)); }
  const l = cats.map(k => { const o = { lab:D.corto ? D.corto(k) : D.nom(k), full:D.nom(k), on:!grp && sel.indexOf(k)>=0, k:k }; series.forEach((s,j) => { o['s'+j] = s.x[k]; }); return o; });
  if (otras){ const o = { lab:'Otras ('+otras.n+')', full:'Otras '+otras.n, k:-1, col:'#C9C4B5' }; series.forEach((s,j) => { o['s'+j] = otras.v[j]; }); l.push(o); }
  $(c.pil).innerHTML = (c.ops.length ? '<div class="pil chica">'+c.ops.map(x => '<button '+c.attr+'="'+x[0]+'" class="'+(X===x[0]?'on':'')+'">'+x[1]+'</button>').join('')+'</div>' : '')+(grp ? '<button class="rg-ib'+(Q.eti?' on':'')+'" data-peti title="'+(Q.eti?'Ocultar':'Mostrar')+' el valor de cada parte">123</button>' : '');
  const lug = !grp && sel.length===1 ? cats.indexOf(sel[0])+1 : 0;
  $(c.q).innerHTML = '<b>'+miles(T)+'</b> '+c.unidad+' · '+fechaA(Q.d0)+' – '+fechaA(Q.d1-1)+(filtrosTxt().length ? ' · '+filtrosTxt().map(x => '<b>'+esc(x)+'</b>').join(' · ') : '')+
    (grp ? ' · una barra por cada '+(G==='n' ? 'nacionalidad' : 'O.R.')+' que comparas' : lug ? ' · <b class="rg-totr">'+esc(D.nom(sel[0]))+' resaltada: '+lug+'.º lugar</b>' : '')+
    (otras ? ' · las '+tope+' principales de '+nTot+' y el resto sumado' : '')+' · toca una barra para filtrar';
  const ch = barrasV(c.ch, l, { q:c.q, ley:!!(grp || c.apila), stack:!!c.apila && !grp, series:series.map((s,j) => ({ name:s.name, k:'s'+j, col:s.col })),
    tip:ps => '<b>'+esc(l[ps[0].dataIndex].full)+'</b><br>'+ps.map(p => (series.length>1 ? p.marker+esc(p.seriesName)+': ' : '')+'<b>'+miles(p.value)+'</b>'+(series.length>1 ? '' : ' · '+pct(p.value, T)+'%')).join('<br>') });
  ch.off('click'); ch.on('click', p => { const k = p.componentType==='xAxis' ? l.findIndex(x => x.lab===p.value) : p.dataIndex; if (l[k] && l[k].k>=0) c.elegir(l[k].k); });
}
const alternar = (arr, k) => { const j = arr.indexOf(k); if (j>=0) arr.splice(j,1); else { if (arr.length>=3) arr.shift(); arr.push(k); } };

/* ==== [4b] TENDENCIA (mismo formato que «Trámites concluidos» de Regulación migratoria) ==== */
const ABR = {'Aguascalientes':'Ags','Baja California':'BC','Baja California Sur':'BCS','Campeche':'Camp','Chiapas':'Chis','Chihuahua':'Chih','Ciudad de México':'CDMX','Coahuila':'Coah','Colima':'Col','Durango':'Dgo','Estado de México':'Edomex','Guanajuato':'Gto','Guerrero':'Gro','Hidalgo':'Hgo','Jalisco':'Jal','Michoacán':'Mich','Morelos':'Mor','Nayarit':'Nay','Nuevo León':'NL','Oaxaca':'Oax','Puebla':'Pue','Querétaro':'Qro','Quintana Roo':'QRoo','San Luis Potosí':'SLP','Sinaloa':'Sin','Sonora':'Son','Tabasco':'Tab','Tamaulipas':'Tamps','Tlaxcala':'Tlax','Veracruz':'Ver','Yucatán':'Yuc','Zacatecas':'Zac'};
const abr = e => ABR[e] || e, PAL5 = ['#2F6657','#C4605A','#8F7F2E','#7E302B','#778E88'];
const diaDe = s => Math.round((new Date(s+'T00:00:00') - INI)/864e5);
function temporadaEn(a, b){
  const T = window.IANAMI_TEMPORADAS || {}, n = {invierno:'Vacaciones de invierno', semana_santa:'Semana Santa', verano:'Vacaciones de verano'};
  for (const k of Object.keys(n)) for (const x of (T[k] || [])){ if (!x.inicio) continue; const i = diaDe(x.inicio), f = x.fin ? diaDe(x.fin) : i; if (i<=b && f>=a) return n[k]; }
  return '';
}
// Cubetas de tiempo: día, semana (lunes a domingo) o mes; «Auto» elige según el largo del periodo
function cubetasG(){
  const n = Q.d1-Q.d0, g = Q.gran==='auto' ? (n<=35 ? 'd' : n<=200 ? 's' : 'm') : Q.gran, l = [];
  if (g==='d') for (let d=Q.d0; d<Q.d1; d++) l.push({ a:d, b:d+1, inc:0 });
  else if (g==='s') semanas().forEach(s => l.push({ a:s.a, b:s.b, inc:s.inc ? s.b-s.a : 0 }));
  else { let d = Q.d0; while (d<Q.d1){ const f = fDia(d), sig = Math.round((new Date(f.getFullYear(), f.getMonth()+1, 1) - INI)/864e5), fin = Math.min(Q.d1, sig); l.push({ a:d, b:fin, inc:f.getDate()!==1 || fin<sig ? fin-d : 0 }); d = fin; } }
  const idx = new Int32Array(CV.dias).fill(-1); l.forEach((c,k) => { for (let d=c.a; d<c.b; d++) idx[d] = k; });
  return { g:g, l:l, n:l.length, idx:idx, u:{d:'día', s:'semana', m:'mes'}[g] };
}
const serieC = (C, T, o) => Array.from(agg(T, i => C.idx[T.d[i]], C.n, o));
const nomCub = (C, k) => { const c = C.l[k]; return C.g==='d' ? fechaA(c.a) : C.g==='m' ? MES[fDia(c.a).getMonth()]+' '+fDia(c.a).getFullYear() : 'Semana del '+fecha(c.a)+' al '+fecha(c.b-1); };
// c = { id, ctl, ley, titulo, desg, attr, ops, total:{nom, T, o}, lineas(k) → [{nom, col, T, o}], extra:[{nom, col, T, o}], barras, clic(cubeta) }
function tendencia(c){
  const C = cubetasG(), solo = c.desg==='tot' && !c.barras, L = c.barras ? c.lineas('tot') : solo ? [] : c.lineas(c.desg), verde = '#2F6657';
  const tot = serieC(C, c.total.T, c.total.o || {}), datos = L.map(x => serieC(C, x.T, x.o || {})), ext = solo ? (c.extra || []).map(x => serieC(C, x.T, x.o || {})) : [];
  const card = $(c.id).closest('.caja'); if (!tot.some(Boolean) && !datos.some(x => x.some(Boolean))){ card.hidden = true; return null; } card.hidden = false;
  const base = tot.filter((v,k) => !C.l[k].inc && !temporadaEn(C.l[k].a, C.l[k].b-1)), mu = base.reduce((a,b)=>a+b,0)/Math.max(1,base.length), sd = Math.sqrt(base.reduce((a,b)=>a+(b-mu)*(b-mu),0)/Math.max(1,base.length));
  const temps = []; let ini = -1, nomT = '';
  C.l.forEach((x,k) => { const t = temporadaEn(x.a, x.b-1); if (t && ini<0){ ini = k; nomT = t; } if (ini>=0 && (!t || k===C.n-1)){ temps.push([{ xAxis:ini, name:nomT }, { xAxis:t ? k : k-1 }]); ini = -1; } });
  const marca = { silent:true, itemStyle:{ color:'rgba(154,149,138,.14)' }, label:{ color:'#5C5952', fontSize:11, fontWeight:600, position:'insideTop', distance:6 }, data:temps };
  const pt = (v,k) => C.l[k].inc ? { value:v, symbol:'emptyCircle', symbolSize:9 } : v, series = [];
  if (solo){
    series.push({ name:c.total.nom, type:'line', smooth:.35, data:tot.map(pt), symbol:'circle', symbolSize:C.g==='d' ? 4 : 8, z:3, lineStyle:{ width:3, color:verde }, color:verde, itemStyle:{ borderColor:'#FCFBF7', borderWidth:2 },
      areaStyle:{ color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(47,102,87,.28)'},{offset:1,color:'rgba(47,102,87,.02)'}]) }, label:{ show:Q.eti, position:'top', fontSize:10, color:'#2B2926', formatter:p => corto(p.value) }, markArea:marca });
    (c.extra || []).forEach((x,j) => series.push({ name:x.nom, type:'line', smooth:.35, data:ext[j], symbol:'circle', symbolSize:5, lineStyle:{ width:2, type:'dashed', color:x.col }, color:x.col, label:{ show:Q.eti, position:'top', fontSize:9.5, color:x.col, formatter:p => p.value ? corto(p.value) : '' } }));
    series.push({ name:'banda-a', type:'line', data:C.l.map(() => Math.max(0, Math.round(mu-sd))), stack:'banda', lineStyle:{ opacity:0 }, symbol:'none', silent:true, z:1 },
                { name:'banda-b', type:'line', data:C.l.map(() => Math.round(mu+sd - Math.max(0, mu-sd))), stack:'banda', lineStyle:{ width:1, type:'dashed', color:'rgba(47,102,87,.35)' }, symbol:'none', silent:true, z:1, areaStyle:{ color:'rgba(47,102,87,.10)' } });
  } else L.forEach((x,j) => series.push(c.barras ? { name:x.nom, type:'bar', stack:'a', barMaxWidth:30, data:datos[j].map((v,k) => ({ value:v, itemStyle:{ opacity:C.l[k].inc ? .45 : 1 } })), color:x.col, markArea:j===0 ? marca : undefined,
      label:{ show:Q.eti, position:j===L.length-1 ? 'top' : 'inside', fontSize:9.5, color:j===L.length-1 ? '#2B2926' : '#fff', formatter:p => p.value ? corto(p.value) : '' } }
    : { markArea:j===0 ? marca : undefined, name:x.nom, type:'line', smooth:.35, data:datos[j].map(pt), symbol:'circle', symbolSize:C.g==='d' ? 3 : 6, lineStyle:{ width:2.6, color:x.col, type:x.dash ? 'dashed' : 'solid' }, color:x.col, emphasis:{ focus:'series', lineStyle:{ width:4 } },
      label:{ show:Q.eti, position:'top', fontSize:9.5, color:x.col, formatter:p => p.value ? corto(p.value) : '' } }));
  let mesAnt = -1;
  const etiqueta = (v, k) => { const f = fDia(C.l[k].a); if (C.g==='m') return '{m|'+MES[f.getMonth()]+'}\n{a|'+f.getFullYear()+'}'; const nuevo = f.getMonth()!==mesAnt || k===0; mesAnt = f.getMonth(); return nuevo ? '{d|'+f.getDate()+'}\n{m|'+MES[f.getMonth()]+'}' : '{d|'+f.getDate()+'}'; };
  const ch = graf(c.id, { tooltip:{ trigger:'axis', axisPointer:{ type:c.barras ? 'shadow' : 'line', lineStyle:{ color:'#9A958A', type:'dashed' } }, formatter:ps => { ps = ps.filter(p => p.seriesName.indexOf('banda')<0); const k = ps[0].dataIndex, cub = C.l[k];
      const est = cub.inc ? 'Periodo incompleto ('+cub.inc+(cub.inc===1 ? ' día' : ' días')+')' : tot[k]>mu+sd ? 'Arriba de lo habitual' : tot[k]<mu-sd ? 'Abajo de lo habitual' : 'Dentro de lo habitual';
      return '<b>'+nomCub(C, k)+'</b><br>'+ps.map(p => p.marker+esc(p.seriesName)+': <b>'+miles(p.value)+'</b>'+(solo || !tot[k] || c.barras ? '' : ' <span style="opacity:.7">('+pct(p.value, tot[k])+'%)</span>')).join('<br>')+'<br><span style="opacity:.75">'+(solo ? est : '')+(c.clic ? (solo ? ' · ' : '')+'toca para ver el detalle' : '')+'</span>'; } },
    legend:solo ? { show:false } : { type:'scroll', top:0, left:0, right:0, textStyle:{fontSize:11.5, color:'#2B2926'}, inactiveColor:'#C9C4B5', icon:'roundRect', itemWidth:14, itemHeight:4, itemGap:16, selectedMode:true, data:solo ? [c.total.nom].concat(c.extra.map(x => x.nom)) : L.map(x => x.nom) },
    grid:{ left:52, right:20, top:solo ? 30 : 40, bottom:40 },
    xAxis:{ type:'category', data:C.l.map((_,k) => k), boundaryGap:!!c.barras, axisTick:{show:false}, axisLine:{lineStyle:{color:'#C9C4B5'}}, splitLine:{ show:true, lineStyle:{ color:'#EEEBE2' } },
      axisLabel:{ color:'#5C5952', interval:C.n>16 ? 'auto' : 0, formatter:etiqueta, rich:{ d:{ fontSize:11, color:'#2B2926', lineHeight:15 }, m:{ fontSize:10.5, color:'#8F7F2E', fontWeight:600, lineHeight:14 }, a:{ fontSize:10, color:'#716D65' } } } },
    yAxis:{ type:'value', axisLabel:{ color:'#5C5952', fontSize:10.5, formatter:v => corto(v) }, splitLine:{ lineStyle:{ color:'#EEEBE2' } } }, series:series });
  if (c.titulo) $(c.titulo[0]).textContent = c.titulo[1](c.desg);
  if (c.ley) $(c.ley).innerHTML = solo ? '<span><i class="ln" style="background:#2F6657"></i>'+esc(/^NNA/.test(c.total.nom) ? c.total.nom : c.total.nom.toLowerCase())+'</span>'+(c.extra || []).map(x => '<span><i class="ln" style="background:repeating-linear-gradient(90deg,'+x.col+' 0 4px,transparent 4px 7px)"></i>'+esc(x.nom)+'</span>').join('')+'<span><i class="bd"></i>rango habitual</span>'+(temps.length ? '<span><i class="tp"></i>temporada vacacional</span>' : '')+(C.l.some(x => x.inc) ? '<span><i class="ic"></i>periodo incompleto</span>' : '')
    : c.barras ? (temps.length ? '<span><i class="tp"></i>temporada vacacional</span>' : '')+(C.l.some(x => x.inc) ? '<span><i class="ic"></i>periodo incompleto (tono claro)</span>' : '') : '<span class="rg-cmp">'+c.nota(c.desg)+' Toca un nombre de la leyenda para ocultarlo o mostrarlo.</span>';
  $(c.ctl).innerHTML = (c.ops ? '<span>Ver</span>'+pil(c.attr, c.desg, c.ops) : '<span></span>')+pil('data-pgran', Q.gran, [['auto','Auto'],['d','Día'],['s','Semana'],['m','Mes']])+
    '<button class="rg-ib'+(Q.eti?' on':'')+'" data-peti title="'+(Q.eti?'Ocultar':'Mostrar')+' valores en la gráfica">123</button>';
  ch.getZr().off('click');
  if (c.clic) ch.getZr().on('click', e => { if (!ch.containPixel({ gridIndex:0 }, [e.offsetX, e.offsetY])) return; const k = Math.round(ch.convertFromPixel({ gridIndex:0 }, [e.offsetX, e.offsetY])[0]); if (!isNaN(k) && k>=0 && k<C.n) c.clic(C.l[k], C, k); });
  return ch;
}
const cajaTend = (id, info_k) => '<div class="caja"><h2><span id="'+id+'-t"></span>'+info(info_k)+'</h2><span class="q" id="'+id+'-q"></span><div class="rg-desg" id="'+id+'-c"></div><div class="rg-evo-ley" id="'+id+'-l"></div><div id="'+id+'" class="cv-fill" style="min-height:320px"></div></div>';
const qTend = id => { const C = cubetasG(); $(id+'-q').innerHTML = {d:'por día', s:'por semana (lunes a domingo)', m:'por mes'}[C.g]+' · '+fechaA(Q.d0)+' – '+fechaA(Q.d1-1)+(filtrosTxt().length ? ' · '+filtrosTxt().map(x => '<b>'+esc(x)+'</b>').join(' · ') : ''); };
const topK = (T, key, nk, o, n, quita) => top(agg(T, key, nk, o), n, quita).map(x => x[0]);

/* ==== [4c] PANEL DE PERIODO ======================================= */
// Rango elegido al tocar la gráfica (día, semana o mes) y el anterior del mismo largo, para comparar
const rangoSel = () => Q.sel && Q.sel[0]>=Q.d0 && Q.sel[1]<=Q.d1 ? Q.sel : null;
const rangoTxt = r => r[1]-r[0]===1 ? fechaA(r[0]) : 'Del '+fecha(r[0])+' al '+fecha(r[1]-1);
const deCada = t => t>=10 ? '1 de cada '+Math.max(2, Math.round(100/t)) : (t*10>=10 ? Math.round(t*10) : (t*10).toFixed(1))+' de cada 1,000';
// Lista de barras que se pueden tocar; con periodo elegido muestra el cambio contra el periodo anterior
function listaD(l, total, col, attr, sel){ const mx = l.length ? l[0][1] : 1;
  return l.map(r => '<button class="barra pc'+(r[3]!=null ? ' dl' : '')+(sel && sel.indexOf(r[0])>=0 ? ' on' : '')+'" '+attr+'="'+r[0]+'"><span>'+esc(r[2])+' <small>'+pct(r[1], total)+'%</small></span><span class="b"><i style="width:'+(r[1]/mx*100).toFixed(1)+'%;background:'+col+'"></i></span><span class="x">'+corto(r[1])+'</span>'+
    (r[3]!=null ? '<span class="cv-dl '+(r[3]>0 ? 'u' : r[3]<0 ? 'd' : '')+'">'+(r[3]>0 ? '▲ '+corto(r[3]) : r[3]<0 ? '▼ '+corto(-r[3]) : '=')+'</span>' : '')+'</button>').join(''); }
// c = { t, q, body, unidad, T, o, total(o), pre(o, ant), secciones:[{tit, T, key, nk, nom, attr, quita, sel, n, col, sin}] }
function panelP(c){
  const r = rangoSel(), o = Object.assign({}, c.o, r ? {d0:r[0], d1:r[1]} : {}), ant = r && r[0]-(r[1]-r[0])>=Q.d0 ? Object.assign({}, c.o, {d0:r[0]-(r[1]-r[0]), d1:r[0]}) : null;
  const T = c.total(o), A = ant ? c.total(ant) : 0;
  $(c.t).textContent = r ? rangoTxt(r) : c.titulo;
  $(c.q).innerHTML = '<b>'+miles(T)+'</b> '+c.unidad+(ant && A ? ' · '+chipD(T, A)+' contra '+(r[1]-r[0]===1 ? 'el día' : r[1]-r[0]<=7 ? 'la semana' : 'el periodo')+' anterior' : '')+
    (r ? ' · <button class="cv-lnk" data-psel>ver todo el periodo</button>' : ' · toca un punto de la gráfica para ver ese día, semana o mes');
  if (!T){ $(c.body).innerHTML = '<p class="mini">Sin registros con estos filtros.</p>'; return; }
  $(c.body).innerHTML = (c.pre ? c.pre(o, ant) : '')+c.secciones.map(s => { const x = agg(s.T, s.key, s.nk, Object.assign({}, s.quita, o)), xa = ant ? agg(s.T, s.key, s.nk, Object.assign({}, s.quita, ant)) : null;
    // el % se calcula sobre el total de la propia lista: si la sección quita un filtro (p. ej. nacionalidad), su base también lo quita
    let base = 0; for (let k=0;k<x.length;k++) if (k!==s.sin) base += x[k];
    return '<h4>'+s.tit+(ant ? '<small>cambio contra el anterior</small>' : '')+'</h4>'+listaD(top(x, s.n || 6, s.sin).map(y => [y[0], y[1], s.nom(y[0]), xa ? y[1]-xa[y[0]] : null]), base || T, s.col || '#2B2926', s.attr, s.sel); }).join('');
}

/* ==== [5] REPATRIADOS ============================================= */
const cap = s => s[0].toUpperCase()+s.slice(1), AIFA = DIC.p.findIndex(p => /AIFA/.test(p));
const DSEM = ['lun','mar','mié','jue','vie','sáb','dom'], DSEML = ['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
const dSem = d => (fDia(d).getDay()+6)%7;
const DET = { rep:'totales por punto y O.R., y promedio por día de la semana' };
function pintarRep(){
  const b = $('cv-body'), w = ventanas(), M = MED[Q.em];
  if (Q.em!=='v' && Q.desg==='grp') Q.desg = 'tot';
  const T0 = tot(REP, {v:'v'}), AD = tot(REP, {v:'ad'}), ME = tot(REP, {v:'me'});
  const diasPrim = agg(REP, i => REP.d[i], CV.dias, {mod:1}).filter(Boolean).length;
  const tm = (k, nom, sub, ic, col) => { const on = k<0 ? Q.mod<0 && Q.em==='v' : Q.mod===k; if (k>=0 && !on && !tot(REP, {mod:k, v:'v'})) return ''; return tarjeta(nom, sub, ic, col, REP, {mod:k, v:'v'}, ' data-pmod="'+k+'" aria-pressed="'+on+'"', null, on); };
  const te = (k, sub, ic, col) => { if (!tot(REP, {v:k}) && Q.em!==k) return ''; return tarjeta(MED[k][1], sub, ic, col, REP, {v:k}, ' data-pem="'+k+'" aria-pressed="'+(Q.em===k)+'"', null, Q.em===k); };
  const grupo = (flex, col, eti, cartas) => cartas ? '<div class="kg" style="flex:'+flex+' 1 0;--g:'+col+'"><div class="eti">'+eti+'</div><div>'+cartas+'</div></div>' : '';
  const ad = te('ah', pct(tot(REP, {v:'ah'}), AD)+'% de los adultos', IC.adulto, '#2F6657')+te('am', pct(tot(REP, {v:'am'}), AD)+'% de los adultos', IC.adulto, OCRE);
  const nn = te('me', pct(ME, T0)+'% del total', IC.nino, '#2B2926')+te('ac', pct(tot(REP, {v:'ac'}), ME)+'% de los NNA', IC.nino, '#778E88')+te('na', pct(tot(REP, {v:'na'}), ME)+'% de los NNA', IC.nino, ROJO);
  b.innerHTML = '<section class="kpis rg-kpis" id="cv-kpis" data-modo="'+(Q.compacto?'compacto':'tarjetas')+'">'+
      grupo(3, '#2B2926', 'Mexicanos repatriados de EE. UU. · toca una modalidad para filtrar', tm(-1, 'Repatriados', 'todas las modalidades', IC.tot, '#2B2926')+tm(0, 'Terrestre', 'garitas y puentes', IC.tierra, COLMOD[0])+tm(1, 'Aérea', 'vuelos PRIM · '+diasPrim+' días con llegada', IC.avion, COLMOD[1]))+
      grupo(2, VERDE, 'Adultos · '+pct(AD, T0)+'% del total', ad)+grupo(3, ROJO, 'Niñas, niños y adolescentes · toca una para analizar', nn)+plegar()+'</section>'+
    '<div class="rg-hz" id="cv-hz"></div>'+
    '<div class="rg-g rg-g21">'+cajaTend('pm-tr', 'tr')+'<div class="caja"><h2><span id="pm-tp-t"></span>'+info('tp')+'</h2><span class="q" id="pm-tp-q"></span><div id="pm-tp"></div></div></div>'+
    '<div class="rg-g rg-g2"><div class="caja"><h2><span>¿A quién recibe cada punto?</span>'+info('perfil')+'</h2><span class="q" id="pm-pf-q"></span><div id="pm-pf" style="height:420px"></div></div>'+
      '<div class="caja"><h2><span>Llegadas de vuelos PRIM</span>'+info('prim')+'</h2><span class="q" id="pm-pr-q"></span><div class="cv-scroll"><div id="pm-pr" style="height:380px"></div></div></div></div>'+
    detIni()+
      '<div class="caja rg-ancho cv-ancho"><h2><span>Totales de '+M[0]+'</span>'+info('tot')+'<span class="cv-h2r cv-h2b" id="pm-tt-sel"></span></h2><span class="q" id="pm-tt-q"></span><div class="cv-scroll cv-fill"><div id="pm-tt"></div></div></div>'+
      '<div class="caja rg-ancho cv-ancho"><h2><span>¿Qué días se repatría?</span>'+info('ds')+'</h2><span class="q" id="pm-ds-q"></span><div class="cv-scroll"><div id="pm-ds" style="height:300px"></div></div></div>'+
    '</div>';
  // Titulares: cambio en la comparación, el punto donde más NNA llegan solos y los vuelos PRIM
  const hz = [];
  if (w){ const ta = tot(REP, vEm({d0:w[0][0], d1:w[0][1]})), tc = tot(REP, vEm({d0:w[1][0], d1:w[1][1]}));
    let m = -1, dm = 0; if (Q.pto<0){ const a = agg(REP, i => REP.p[i], NP, vEm({d0:w[0][0], d1:w[0][1]})), c = agg(REP, i => REP.p[i], NP, vEm({d0:w[1][0], d1:w[1][1]})); for (let k=0;k<NP;k++){ const dl = a[k]-c[k]; if (Math.abs(dl)>Math.abs(dm)){ dm = dl; m = k; } } }
    if (tc) hz.push({ cl:ta>=tc ? 'u' : 'd', ic:ta>=tc ? '▲' : '▼', h:cap(M[0])+(ta>=tc ? ' suben ' : ' bajan ')+Math.abs((ta/tc-1)*100).toFixed(1)+'% '+(Q.cmp==='sem' ? 'en la semana' : 'en los últimos '+Q.cmp+' días'),
      t:miles(tc)+' → '+miles(ta)+(m>=0 && dm ? ' · lo que más cambió: '+esc(nomP(m))+' ('+(dm>0 ? '+' : '')+miles(dm)+') · filtrar ›' : ''), act:m>=0 && dm ? ' data-ppt="'+m+'"' : '' }); }
  const me = agg(REP, i => REP.p[i], NP, {pto:-1, v:'me'}), na = agg(REP, i => REP.p[i], NP, {pto:-1, v:'na'}), sMe = me.reduce((a,b)=>a+b,0), sNa = na.reduce((a,b)=>a+b,0);
  const pn = [...Array(NP).keys()].filter(k => me[k]>=100).sort((a,b) => na[b]/me[b]-na[a]/me[a])[0];
  if (pn!=null && na[pn]) hz.push({ cl:'al', ic:'!', h:esc(nomP(pn))+': '+pct(na[pn], me[pn])+'% de sus NNA llegan no acompañados', t:miles(na[pn])+' de '+miles(me[pn])+' · en todos los puntos: '+pct(sNa, sMe)+'% · ver solo este punto ›', act:' data-ppt="'+pn+'"' });
  if (Q.mod!==0 && (Q.pto<0 || Q.pto===AIFA)){ const dd = agg(REP, i => REP.d[i], CV.dias, {mod:1, pto:-1}), l = [...dd.keys()].filter(d => dd[d]);
    if (l.length){ const s = l.reduce((t,d) => t+dd[d], 0), u = l[l.length-1], ds = l.map(dSem), moda = [...Array(7).keys()].sort((a,b) => ds.filter(x => x===b).length-ds.filter(x => x===a).length)[0];
      hz.push({ cl:'n', ic:'✈', h:'Vuelos PRIM: '+l.length+' días con llegada al AIFA', t:'promedio '+miles(s/l.length)+' personas por día con llegada · la mayoría en '+DSEML[moda]+' · última: '+fecha(u)+' ('+miles(dd[u])+')'+(Q.mod<0 ? ' · ver solo vuelos PRIM ›' : ''), act:Q.mod<0 ? ' data-pmod="1"' : '' }); } }
  $('cv-hz').innerHTML = hz.map(titular).join('')+info('hz');
  pintarTr(); pintarTp(); pintarPf(); pintarPr();
  totales({ ch:'pm-tt', q:'pm-tt-q', pil:'pm-tt-sel', attr:'data-ptot', val:Q.tot, unidad:M[0], ops:[['p','Por punto'],['e','Por O.R.']], tope:30,
    dim:{ p:{ T:REP, key:i => REP.p[i], nk:NP, nom:nomP, quita:{pto:-1, v:Q.em}, sel:Q.pto>=0 ? [Q.pto] : [] }, e:{ T:REP, key:i => REP.e[i], nk:NE, nom:nomE, quita:{ests:null, v:Q.em}, sel:Q.ests } },
    apila:Q.em==='v' ? GRUPOS.map(g => ({ name:g[1], col:g[2], o:{v:g[0]} })) : null,
    elegir:k => { if (Q.tot==='p') Q.pto = Q.pto===k ? -1 : k; else alternar(Q.ests, k); Q.sel = null; cuerpo(); } });
  pintarDs();
}
// Tendencia de la medida elegida, con desglose por modalidad, grupo, O.R. o punto
function pintarTr(){
  const M = MED[Q.em];
  qTend('pm-tr');
  tendencia({ id:'pm-tr', ctl:'pm-tr-c', ley:'pm-tr-l', titulo:['pm-tr-t', k => cap(M[0])+{tot:'', mod:' por modalidad', grp:' por grupo', or:' por O.R.', pto:' por punto'}[k]], desg:Q.desg, attr:'data-pdesg',
    ops:[['tot','Total'],['mod','Por modalidad']].concat(Q.em==='v' ? [['grp','Por grupo']] : [], [['or','Por O.R.'],['pto','Por punto']]),
    total:{ nom:cap(M[0]), T:REP, o:vEm() }, extra:[],
    lineas:k => k==='mod' ? [0,1].map(m => ({ nom:MODS[m], col:COLMOD[m], T:REP, o:vEm({mod:m}) }))
      : k==='grp' ? GRUPOS.map(g => ({ nom:g[1], col:g[2], T:REP, o:{v:g[0]} }))
      : k==='or' ? (Q.ests.length ? Q.ests : topK(REP, i => REP.e[i], NE, vEm({ests:null}), 5)).map((e,j) => ({ nom:nomE(e), col:Q.ests.length ? COMP[j] : PAL5[j], T:REP, o:vEm({ests:[e]}) }))
      : (Q.pto>=0 ? [Q.pto] : topK(REP, i => REP.p[i], NP, vEm({pto:-1}), 5)).map((p,j) => ({ nom:nomP(p), col:PAL5[j], T:REP, o:vEm({pto:p}) })),
    nota:k => ({ mod:'Terrestre (garitas y puentes) y aérea (vuelos PRIM).', grp:'Hombres y mujeres adultos, NNA acompañados y no acompañados.', or:Q.ests.length ? 'Las O.R. que elegiste.' : 'Las 5 O.R. con más '+M[0]+'.', pto:Q.pto>=0 ? 'El punto que elegiste.' : 'Los 5 puntos con más '+M[0]+'.' })[k],
    clic:cub => { Q.sel = [cub.a, cub.b]; pintarTp(); } });
}
// Panel: quiénes llegan (grupos), por qué O.R. y por qué punto, en el periodo o en lo que se tocó de la gráfica
function pintarTp(){
  const M = MED[Q.em];
  const pre = o => { const v = GRUPOS.map(g => tot(REP, Object.assign({}, o, {v:g[0]}))), TV = v.reduce((a,b)=>a+b,0) || 1;
    return '<h4>¿Quiénes son?</h4><div class="cv-vb">'+GRUPOS.map((g,k) => v[k] ? '<button data-pem="'+g[0]+'" class="'+(Q.em===g[0] ? 'on' : '')+'" style="width:'+(v[k]/TV*100).toFixed(2)+'%;background:'+g[2]+'" title="'+g[1]+': '+miles(v[k])+' ('+pct(v[k],TV)+'%)">'+(v[k]/TV>=.18 ? pct(v[k],TV)+'%' : v[k]/TV>=.07 ? Math.round(v[k]/TV*100)+'%' : '')+'</button>' : '').join('')+'</div>'+
      '<div class="cv-vl pm-vl">'+GRUPOS.map((g,k) => '<button data-pem="'+g[0]+'" class="'+(Q.em===g[0] ? 'on' : '')+'" title="'+g[1]+': '+miles(v[k])+'"><i class="sw" style="background:'+g[2]+'"></i>'+g[1]+' <b>'+pct(v[k],TV)+'%</b> <small>'+corto(v[k])+'</small></button>').join('')+'</div>'; };
  const S = { or:{ tit:'Oficinas de Representación', T:REP, key:i => REP.e[i], nk:NE, nom:nomE, attr:'data-pe', quita:{ests:null, v:Q.em}, sel:Q.ests, n:6, col:OCRE },
              pto:{ tit:'Puntos de repatriación', T:REP, key:i => REP.p[i], nk:NP, nom:nomP, attr:'data-ppt', quita:{pto:-1, v:Q.em}, sel:Q.pto>=0 ? [Q.pto] : [], n:12, col:VERDE } };
  panelP({ t:'pm-tp-t', q:'pm-tp-q', body:'pm-tp', titulo:'¿Quién llega?', unidad:M[0], o:{}, total:o => tot(REP, vEm(o)), pre:pre, secciones:(Q.desg==='or' ? ['or','pto'] : ['pto','or']).map(k => S[k]) });
}
// Perfil de cada punto: de cada 100 que recibe, cuántos son de cada grupo
function pintarPf(){
  const x = GRUPOS.map(g => agg(REP, i => REP.p[i], NP, {pto:-1, v:g[0]})), sg = [...Array(NP).keys()].map(k => x.reduce((t,g) => t+g[k], 0)), tp = agg(REP, i => REP.p[i], NP, {pto:-1, v:'v'}), l = [...Array(NP).keys()].filter(k => tp[k]).sort((a,b) => tp[a]-tp[b]);
  const caja = $('pm-pf').closest('.caja'); if (!l.length){ caja.hidden = true; return; } caja.hidden = false;
  $('pm-pf-q').innerHTML = 'De cada 100 personas que recibe cada punto · ordenados por total (entre paréntesis) · toca uno para filtrar';
  $('pm-pf').style.height = Math.max(260, l.length*32+70)+'px';
  const ch = graf('pm-pf', { grid:{ left:8, right:16, top:34, bottom:24, containLabel:true },
    legend:{ top:0, left:0, icon:'roundRect', itemWidth:12, itemHeight:8, textStyle:{ fontSize:11.5 }, data:GRUPOS.map(g => g[1]) },
    tooltip:{ trigger:'axis', axisPointer:{ type:'shadow' }, formatter:ps => { const k = l[ps[0].dataIndex]; return '<b>'+esc(nomP(k))+'</b> · '+miles(tp[k])+' personas<br>'+ps.map(p => p.marker+esc(p.seriesName)+': <b>'+miles(x[p.seriesIndex][k])+'</b> ('+p.value.toFixed(1)+'%)').join('<br>'); } },
    xAxis:{ type:'value', max:100, axisLabel:{ formatter:'{value}%', color:'#5C5952', fontSize:10.5 }, splitLine:{ lineStyle:{ color:'#EEEBE2' } } },
    yAxis:{ type:'category', data:l.map(k => nomP(k)+' ('+corto(tp[k])+')'), axisTick:{show:false}, axisLine:{lineStyle:{color:'#C9C4B5'}}, triggerEvent:true,
      axisLabel:{ color:'#2B2926', fontSize:11, formatter:(v,i) => Q.pto===l[i] ? '{s|'+v+'}' : v, rich:{ s:{ fontWeight:700, color:VINO, fontSize:11 } } } },
    series:GRUPOS.map((g,j) => ({ name:g[1], type:'bar', stack:'a', barMaxWidth:22, color:g[2], itemStyle:{ borderColor:'#FCFBF7', borderWidth:1 },
      data:l.map(k => ({ value:sg[k] ? x[j][k]/sg[k]*100 : 0, itemStyle:{ opacity:Q.pto>=0 && Q.pto!==k ? .35 : 1 } })),
      label:{ show:true, position:'inside', fontSize:10, color:'#fff', formatter:p => p.value>=9 ? Math.round(p.value)+'%' : '' } })) });
  ch.off('click'); ch.on('click', p => { const k = p.componentType==='yAxis' ? l[p.dataIndex!=null ? p.dataIndex : l.findIndex(z => nomP(z)+' ('+corto(tp[z])+')'===p.value)] : l[p.dataIndex]; if (k!=null){ Q.pto = Q.pto===k ? -1 : k; Q.sel = null; cuerpo(); } });
}
// Vuelos PRIM: cada día con llegada al AIFA, con adultos y NNA
function pintarPr(){
  const caja = $('pm-pr').closest('.caja'), ad = agg(REP, i => REP.d[i], CV.dias, {mod:1, v:'ad'}), me = agg(REP, i => REP.d[i], CV.dias, {mod:1, v:'me'}), vt = agg(REP, i => REP.d[i], CV.dias, {mod:1, v:'v'});
  const dias = [...vt.keys()].filter(d => vt[d]);
  if (Q.mod===0 || !dias.length){ caja.hidden = true; return; } caja.hidden = false;
  const s = dias.reduce((t,d) => t+vt[d], 0), prom = s/dias.length;
  $('pm-pr-q').innerHTML = '<b>'+dias.length+'</b> días con llegada · <b>'+miles(s)+'</b> personas · promedio <b>'+miles(prom)+'</b> por día · la línea punteada es el promedio';
  const l = dias.map(d => ({ lab:fecha(d)+' '+DSEM[dSem(d)], full:DSEML[dSem(d)]+' '+fechaA(d), a:ad[d], n:me[d], d:d }));
  const ch = barrasV('pm-pr', l, { q:'pm-pr-q', stack:true, ley:true, series:[{ name:'Adultos', k:'a', col:VERDE }, { name:'NNA', k:'n', col:ROJO }],
    tip:ps => { const x = l[ps[0].dataIndex], t = vt[x.d]; return '<b>'+esc(x.full)+'</b><br>'+miles(t)+' personas'+(t>prom*1.25 ? ' · <b>muy arriba del promedio: puede ser más de un vuelo</b>' : t<prom*0.25 ? ' · <b>muy abajo del promedio</b>' : '')+'<br>'+ps.filter(p => p.seriesName!=='Total').map(p => p.marker+esc(p.seriesName)+': <b>'+miles(p.value)+'</b>').join('<br>'); } });
  ch.setOption({ series:[{ markLine:{ silent:true, symbol:'none', lineStyle:{ color:'#2B2926', type:'dashed', width:1 }, label:{ formatter:'promedio '+miles(prom), color:'#5C5952', fontSize:10.5, position:'insideEndTop' }, data:[{ yAxis:prom }] } }] });
}
// Promedio por día de la semana, por modalidad
function pintarDs(){
  const M = MED[Q.em], cuenta = new Array(7).fill(0); for (let d=Q.d0; d<Q.d1; d++) cuenta[dSem(d)]++;
  const x = [0,1].map(m => agg(REP, i => dSem(REP.d[i]), 7, vEm({mod:Q.mod>=0 && Q.mod!==m ? 9 : m})));
  const l = DSEM.map((n,k) => ({ lab:DSEML[k], full:DSEML[k], t:cuenta[k] ? x[0][k]/cuenta[k] : 0, a:cuenta[k] ? x[1][k]/cuenta[k] : 0 }));
  const caja = $('pm-ds').closest('.caja'); if (!l.some(y => y.t || y.a)){ caja.hidden = true; return; } caja.hidden = false;
  $('pm-ds-q').innerHTML = 'Promedio de '+M[0]+' por día · '+fechaA(Q.d0)+' – '+fechaA(Q.d1-1)+(filtrosTxt().length ? ' · '+filtrosTxt().map(z => '<b>'+esc(z)+'</b>').join(' · ') : '');
  barrasV('pm-ds', l, { q:'pm-ds-q', stack:true, ley:true, series:[{ name:'Terrestre', k:'t', col:COLMOD[0] }, { name:'Aérea (vuelos PRIM)', k:'a', col:COLMOD[1] }],
    tip:ps => '<b>'+esc(l[ps[0].dataIndex].full)+'</b><br>'+ps.filter(p => p.seriesName!=='Total').map(p => p.marker+esc(p.seriesName)+': <b>'+miles(p.value)+'</b> en promedio').join('<br>') });
}

/* ==== [6] MONTAJE Y EVENTOS ======================================= */
const INFO = {
  tr:'<b>Repatriados en el tiempo</b>, o la medida que elegiste en las tarjetas: el total con su rango habitual, o desglosado por modalidad, grupo, O.R. o punto. Elige día, semana o mes; «123» muestra el valor de cada punto. Toca un punto de la gráfica para ver a la derecha quiénes llegaron ese día, semana o mes.',
  tp:'<b>Quiénes llegan y por dónde</b> en el periodo o en el punto que tocaste de la gráfica: hombres y mujeres adultos y NNA acompañados y no acompañados (toca uno para analizarlo), las O.R. y los puntos de repatriación. Con un periodo elegido, cuánto cambió cada uno contra el anterior.',
  perfil:'<b>De cada 100 personas que recibe cada punto</b>, cuántas son hombres adultos, mujeres adultas, NNA acompañados y NNA no acompañados. Muestra la especialización de cada punto: unos reciben casi solo adultos y otros concentran a los NNA que llegan solos. Toca un punto para filtrar.',
  prim:'<b>Cada barra es un día con llegada de vuelos PRIM al AIFA</b> (la modalidad aérea del archivo), con adultos y NNA. El archivo no trae el número de vuelos: por eso se cuentan días con llegada. Un día muy arriba del promedio puede ser más de un vuelo.',
  tot:'<b>Totales de mayor a menor</b> por punto de repatriación u O.R. Con «Repatriados» elegido, cada barra se divide en hombres y mujeres adultos y NNA acompañados y no acompañados. Toca una barra para filtrar.',
  ds:'<b>Promedio por día de la semana</b>: cuántas personas se repatrían en promedio cada lunes, martes, etc., por garitas y puentes y por vuelos PRIM. Sirve para planear la atención en los puntos.',
  hz:'<b>Titulares automáticos</b>: cómo cambió la medida elegida en la comparación, el punto donde más NNA llegan sin acompañante y los días con llegada de vuelos PRIM.'
};
let popFija = false;
function mostrarInfo(b){ let p = $('pm-pop'); if (!p){ p = document.createElement('div'); p.id = 'pm-pop'; p.className = 'rg-pop fija'; p.setAttribute('role','dialog'); document.body.appendChild(p); }
  if (!b){ p.hidden = true; popFija = false; return; }
  p.innerHTML = '<button class="rg-pop-x" data-ppopx aria-label="Cerrar">×</button>'+INFO[b.dataset.pinfo]; p.hidden = false; popFija = true;
  const r = b.getBoundingClientRect(), w = Math.min(340, innerWidth-24); p.style.width = w+'px'; p.style.left = Math.max(12, Math.min(innerWidth-w-12, r.left-w/2))+'px'; p.style.top = (r.bottom+8+scrollY)+'px'; p.style.position = 'absolute'; }
function cuerpo(){ const c = $('cv-ctl'); if (!c) return; c.innerHTML = htmlCtl(); buscador(); pintarRep(); }
function montar(cont){
  const pend = 'Pendiente: el área revisa el archivo; se activa en cuanto llegue corregido';
  cont.innerHTML = '<div class="rg cv pm"><div class="rg-sub"><div><span class="mini">Procesos › DGPMV</span><h1>Protección al migrante</h1></div><div class="rg-vistas">'+
    '<button data-pvista="rep" class="on">Repatriados</button><button disabled title="'+pend+'">Vuelos comerciales <small>en revisión</small></button><button disabled title="'+pend+'">Guatemala y Honduras <small>en revisión</small></button></div></div>'+
    '<div class="ctl rg-ctl" id="cv-ctl"></div><div id="cv-body" class="rg-body anim"></div>'+
    '<p class="mini pm-fuente" style="padding:0 16px">Fuente: '+esc(CV.archivo)+' (DGPMV) · '+fechaA(0)+' – '+fechaA(CV.dias-1)+' · todos son de nacionalidad mexicana. «Aérea» corresponde a los vuelos PRIM.</p>'+
    (CV.calidad.length ? '<details class="cv-calw"><summary>Notas de calidad de los datos ('+CV.calidad.length+')</summary><ul>'+CV.calidad.map(x => '<li>'+esc(x)+'</li>').join('')+'</ul></details>' : '')+'</div>';
  setTimeout(() => { const b = $('cv-body'); if (b) b.classList.remove('anim'); }, 1100);
  cuerpo();
}
function eventos(cont){
  cont.addEventListener('click', e => { if (!e.target.closest('.pm')) return; const T = s => e.target.closest(s); let b;
    if ((b = T('[data-pinfo]'))){ const p = $('pm-pop'); if (p && !p.hidden && p.dataset.cual===b.dataset.pinfo) mostrarInfo(null); else { mostrarInfo(b); $('pm-pop').dataset.cual = b.dataset.pinfo; } return; }
    if ((b = T('[data-pmod]'))){ const k = +b.dataset.pmod; if (k<0){ Q.mod = -1; Q.em = 'v'; } else Q.mod = Q.mod===k ? -1 : k; Q.sel = null; cuerpo(); return; }
    if ((b = T('[data-pem]'))){ const k = b.dataset.pem; Q.em = Q.em===k ? 'v' : k; Q.sel = null; cuerpo(); return; }
    if (T('[data-pmas]')){ Q.mas[Q.vista] = !Q.mas[Q.vista]; abrirMasC(); return; }
    if ((b = T('[data-pgran]'))){ Q.gran = b.dataset.pgran; Q.sel = null; cuerpo(); return; }
    if (T('[data-peti]')){ Q.eti = !Q.eti; cuerpo(); return; }
    if ((b = T('[data-pdesg]'))){ Q.desg = b.dataset.pdesg; pintarTr(); pintarTp(); return; }
    if (T('[data-psel]')){ Q.sel = null; pintarTp(); return; }
    if (T('[data-pdet]')){ Q.det[Q.vista] = !Q.det[Q.vista]; cuerpo(); return; }
    if (T('[data-pplegar]')){ Q.compacto = !Q.compacto; cuerpo(); return; }
    if ((b = T('[data-pper]'))){ Q.per = b.dataset.pper; if (Q.per==='todo'){ Q.d0 = 0; Q.d1 = CV.dias; } else if (Q.per==='anio'){ Q.anio = fDia(CV.dias-1).getFullYear(); Q.mes = 0; fijarAnio(); } Q.sel = null; cuerpo(); return; }
    if ((b = T('[data-ptot]'))){ Q.tot = b.dataset.ptot; cuerpo(); return; }
    if ((b = T('[data-ppt]'))){ agregar('p', +b.dataset.ppt); return; }
    if ((b = T('[data-pe]'))){ alternar(Q.ests, +b.dataset.pe); Q.sel = null; cuerpo(); return; }
    if ((b = T('[data-pquita]'))){ const k = b.dataset.pquita; if (k==='p') Q.pto = -1; else if (k==='m') Q.mod = -1; else Q.ests.splice(Q.ests.indexOf(+k.slice(1)),1); Q.sel = null; cuerpo(); return; }
  });
  cont.addEventListener('change', e => { if (!e.target.closest('.pm')) return; const id = e.target.id;
    if (id==='pm-cmp'){ Q.cmp = /^\d+$/.test(e.target.value) ? +e.target.value : e.target.value; cuerpo(); }
    if (id==='pm-anio' || id==='pm-mes'){ if (id==='pm-anio'){ Q.anio = +e.target.value; Q.mes = 0; } else Q.mes = +e.target.value; fijarAnio(); Q.sel = null; cuerpo(); return; }
    else if (id==='pm-d0' || id==='pm-d1'){ const a = diaDe($('pm-d0').value), b = diaDe($('pm-d1').value)+1; if (!isNaN(a) && !isNaN(b) && b>a){ Q.d0 = Math.max(0, a); Q.d1 = Math.min(CV.dias, b); Q.sel = null; cuerpo(); } } });
  document.addEventListener('click', e => { if (e.target.closest('[data-ppopx]') || (!e.target.closest('#pm-pop, [data-pinfo]') && popFija)) mostrarInfo(null); });
}
let listo = false;
window.IANAMI_PROTECCION = { pintar(cont){ if (!listo){ eventos(cont); listo = true; } montar(cont); } };
})();
