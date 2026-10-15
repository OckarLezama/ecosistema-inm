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
// Cifra de las tarjetas: la misma regla en todo el tablero (completa hasta 999,999; millones con dos decimales), como en el Pulso
const cifraKpi = n => n>=1e6 ? (n/1e6).toFixed(2)+' M' : miles(n);
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
  if (window.IANAMI_CUAD) op = window.IANAMI_CUAD(op);
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
function kc(o){ if (o.num!=null && o.val===corto(o.num)) o.val = cifraKpi(o.num); const tag = o.attr ? 'button' : 'div';
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
  return graf(id, { grid:{ left:46, right:12, top:o.ley ? 34 : 22, bottom:14+lin*12 }, legend:o.ley ? { top:0, left:0, icon:'roundRect', itemWidth:12, itemHeight:8, textStyle:{fontSize:11.5}, data:(o.series || []).map(x => x.name).concat(o.tend ? [{ name:'Tendencia', icon:'path://M0,5 L20,5', itemStyle:{ color:'#9A958A' } }] : []) } : { show:false },
    tooltip:{ trigger:'axis', axisPointer:{ type:'shadow' }, formatter:o.tip },
    xAxis:{ type:'category', data:l.map(x => x.lab), axisTick:{show:false}, axisLine:{lineStyle:{color:'#C9C4B5'}}, splitLine:{ show:true, lineStyle:{ color:'#EEEBE2' } }, triggerEvent:true,
      axisLabel:{ interval:0, fontSize:paso<50 ? 9.5 : 10.5, color:'#2B2926', lineHeight:12, formatter:(v,i) => { const t = parte(v).join('\n'); return l[i] && l[i].on ? t.split('\n').map(x => '{s|'+x+'}').join('\n') : t; },
        rich:{ s:{ fontWeight:700, color:VINO, fontSize:paso<50 ? 9.5 : 10.5 } } } },
    yAxis:Object.assign({}, ejeY, o.y || {}),
    series:series.map((s,j) => ({ name:s.name, type:'bar', stack:o.stack ? 'a' : undefined, barMaxWidth:34, itemStyle:{ borderRadius:o.stack ? 0 : [3,3,0,0], color:s.col },
      data:l.map(x => ({ value:x[s.k], itemStyle: series.length===1 ? { color: x.col || (l.some(y => y.on) ? (x.on ? VINO : '#B9CFC6') : VERDE) } : undefined })),
      label: series.length===1 ? { show:paso>=30, position:'top', fontSize:10, color:'#2B2926', lineHeight:12, formatter:o.eti || (p => corto(p.value)) }
        : { show:(o.stack ? false : Q.eti) && paso>=30, position:o.stack ? 'inside' : 'top', fontSize:9, color:o.stack ? '#fff' : '#2B2926', formatter:p => p.value ? corto(p.value) : '' } }))
      .concat(o.tend ? [(() => { const tt = l.map(x => series.reduce((t,s) => t+(x[s.k]||0), 0)), k = o.tend; return { name:'Tendencia', type:'line', smooth:.5, symbol:'none', silent:true, z:5, tooltip:{ show:false },
        lineStyle:{ width:1.6, color:'#2B2926', opacity:.35 }, data:tt.map((_,j) => { const a = Math.max(0, j-k+1), w = tt.slice(a, j+1); return +(w.reduce((x,y)=>x+y,0)/w.length).toFixed(1); }) }; })()] : [])
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
    (otras ? ' · las '+tope+' principales de '+nTot+' y el resto sumado' : '')+' · toca una barra para filtrar'+
    (c.apila && !grp ? (r => Math.abs(r-T)>=1 ? ' · <span title="Registros donde los grupos no suman el total; ver Notas de calidad">total de la base: '+miles(r)+' ('+miles(Math.abs(r-T))+' sin desglose por grupo)</span>' : '')(agg(D.T, null, 1, Object.assign({}, base, {v:'v'}))[0]) : '');
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
const cajaTend = (id, info_k) => '<div class="caja"><h2><span id="'+id+'-t"></span>'+info(info_k)+'</h2><span class="q" id="'+id+'-q"></span><div class="rg-desg" id="'+id+'-c"></div><div class="rg-evo-ley" id="'+id+'-l"></div><div id="'+id+'" class="cv-fill cuadros" style="min-height:320px"></div></div>';
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
const cap = s => s[0].toUpperCase()+s.slice(1), AEREO = new Set(DIC.p.map((p,i) => /vuelos/.test(p) ? i : -1).filter(i => i>=0));   // aeropuertos de llegada de vuelos PRIM
const DSEM = ['lun','mar','mié','jue','vie','sáb','dom'], DSEML = ['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
const dSem = d => (fDia(d).getDay()+6)%7;
const DET = { rep:'totales por punto de repatriación y por O.R.' };
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
    '<div class="rg-g rg-g21 fila-par">'+cajaTend('pm-tr', 'tr')+'<div class="caja"><h2><span id="pm-tp-t"></span>'+info('tp')+'</h2><span class="q" id="pm-tp-q"></span><div id="pm-tp"></div></div></div>'+
    '<div class="rg-g rg-g2"><div class="caja"><h2><span>¿A quién recibe cada punto?</span>'+info('perfil')+'</h2><span class="q" id="pm-pf-q"></span><div id="pm-pf" style="height:420px"></div><div id="pm-pf-m"></div></div>'+
      '<div class="caja"><h2><span>Llegadas de vuelos PRIM</span>'+info('prim')+'</h2><span class="q" id="pm-pr-q"></span><div class="cv-scroll cv-fill"><div id="pm-pr"></div></div></div></div>'+
    '<div class="rg-g pm-g3"><div class="caja"><h2><span>¿Dónde se recibe?</span>'+info('mapa')+'</h2><span class="q" id="pm-mp-q"></span>'+leyMapa([['Garitas y puentes (terrestre)', COLMOD[0]], ['Aeropuertos (vuelos PRIM)', COLMOD[1]]])+'<div id="pm-mp" class="cv-fill pm-mapa" style="min-height:400px"></div></div>'+
      '<div class="caja"><h2><span>¿Qué días se repatría?</span>'+info('ds')+'</h2><span class="q" id="pm-ds-q"></span><div id="pm-ds"></div></div></div>'+
    detIni()+
      '<div class="caja rg-ancho cv-ancho"><h2><span>Totales de '+M[0]+'</span>'+info('tot')+'<span class="cv-h2r cv-h2b" id="pm-tt-sel"></span></h2><span class="q" id="pm-tt-q"></span><div class="cv-scroll cv-fill"><div id="pm-tt"></div></div></div>'+
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
  if (Q.mod!==0 && (Q.pto<0 || AEREO.has(Q.pto))){ const dd = agg(REP, i => REP.d[i], CV.dias, {mod:1, pto:Q.pto}), l = [...dd.keys()].filter(d => dd[d]);
    if (l.length){ const s = l.reduce((t,d) => t+dd[d], 0), u = l[l.length-1], ds = l.map(dSem), moda = [...Array(7).keys()].sort((a,b) => ds.filter(x => x===b).length-ds.filter(x => x===a).length)[0];
      hz.push({ cl:'n', ic:'✈', h:'Vuelos PRIM: '+l.length+' días con llegada'+(Q.pto>=0 ? ' a '+esc(nomP(Q.pto)) : ' a algún aeropuerto'), t:'promedio '+miles(s/l.length)+' personas por día con llegada · el día de la semana con más llegadas: '+DSEML[moda]+' · última: '+fecha(u)+' ('+miles(dd[u])+')'+(Q.mod<0 ? ' · ver solo vuelos PRIM ›' : ''), act:Q.mod<0 ? ' data-pmod="1"' : '' }); } }
  $('cv-hz').innerHTML = hz.map(titular).join('')+info('hz');
  pintarTr(); pintarTp(); pintarPf(); pintarPr();
  totales({ ch:'pm-tt', q:'pm-tt-q', pil:'pm-tt-sel', attr:'data-ptot', val:Q.tot, unidad:M[0], ops:[['p','Por punto'],['e','Por O.R.']], tope:30,
    dim:{ p:{ T:REP, key:i => REP.p[i], nk:NP, nom:nomP, quita:{pto:-1, v:Q.em}, sel:Q.pto>=0 ? [Q.pto] : [] }, e:{ T:REP, key:i => REP.e[i], nk:NE, nom:nomE, quita:{ests:null, v:Q.em}, sel:Q.ests } },
    apila:Q.em==='v' ? GRUPOS.map(g => ({ name:g[1], col:g[2], o:{v:g[0]} })) : null,
    elegir:k => { if (Q.tot==='p') Q.pto = Q.pto===k ? -1 : k; else alternar(Q.ests, k); Q.sel = null; cuerpo(); } });
  pintarDs(); pintarDonde();
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
  const x = GRUPOS.map(g => agg(REP, i => REP.p[i], NP, {pto:-1, v:g[0]})), sg = [...Array(NP).keys()].map(k => x.reduce((t,g) => t+g[k], 0)), tp = agg(REP, i => REP.p[i], NP, {pto:-1, v:'v'}), todos = [...Array(NP).keys()].filter(k => tp[k]).sort((a,b) => tp[b]-tp[a]), TOPF = 12, l = (Q.pfTodos ? todos : todos.slice(0, TOPF).concat(Q.pto>=0 && todos.indexOf(Q.pto)>=TOPF ? [Q.pto] : [])).reverse();
  const caja = $('pm-pf').closest('.caja'); if (!l.length){ caja.hidden = true; return; } caja.hidden = false;
  const sgT = sg.reduce((a,b)=>a+b,0), tpT = tp.reduce((a,b)=>a+b,0);
  const sinPrim = Q.mod===0 || (Q.pto>=0 && !AEREO.has(Q.pto));
  $('pm-pf-q').innerHTML = (sinPrim ? '<b>'+(Q.mod===0 ? 'Solo terrestre' : esc(nomP(Q.pto))+' es garita o puente')+': no hay vuelos PRIM que mostrar.</b> ' : '')+'De cada 100 personas que recibe cada punto, cuántas son de cada grupo · de mayor a menor total (entre paréntesis) · toca uno para filtrar'+(Math.abs(tpT-sgT)>=1 ? ' · <span title="Registros donde los grupos no suman el total; ver Notas de calidad">'+miles(Math.abs(tpT-sgT))+' sin desglose por grupo en la base</span>' : '');
  $('pm-pf').style.height = Math.max(260, l.length*30+64)+'px';
  $('pm-pf-m').innerHTML = todos.length>TOPF ? '<button class="rg-mas-f pm-mas" data-ppftodos>'+(Q.pfTodos ? 'Ver solo los '+TOPF+' principales ▴' : 'Ver los '+todos.length+' puntos ▾')+'</button>' : '';
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
// Vuelos PRIM: cada día con llegada a los aeropuertos (o al elegido), con adultos y NNA
function pintarPr(){
  const caja = $('pm-pr').closest('.caja'), ad = agg(REP, i => REP.d[i], CV.dias, {mod:1, v:'ad'}), me = agg(REP, i => REP.d[i], CV.dias, {mod:1, v:'me'}), vt = agg(REP, i => REP.d[i], CV.dias, {mod:1, v:'v'});
  const dias = [...vt.keys()].filter(d => vt[d]);
  const fila = caja.parentNode;
  if (Q.mod===0 || !dias.length){ const ch = echarts.getInstanceByDom($('pm-pr')); if (ch) ch.dispose(); caja.hidden = true; fila.classList.add('solo'); return; }
  caja.hidden = false; fila.classList.remove('solo');

  const s = dias.reduce((t,d) => t+vt[d], 0), prom = s/dias.length;
  $('pm-pr-q').innerHTML = '<b>'+dias.length+'</b> días con llegada · <b>'+miles(s)+'</b> personas · promedio <b>'+miles(prom)+'</b> por día · punteada: promedio · gris: tendencia (últimos 8 días con llegada)';
  const l = dias.map(d => ({ lab:fecha(d)+' '+DSEM[dSem(d)], full:DSEML[dSem(d)]+' '+fechaA(d), a:ad[d], n:me[d], d:d }));
  const ch = barrasV('pm-pr', l, { q:'pm-pr-q', stack:true, ley:true, tend:8, series:[{ name:'Adultos', k:'a', col:VERDE }, { name:'NNA', k:'n', col:ROJO }],
    tip:ps => { const x = l[ps[0].dataIndex], t = vt[x.d]; return '<b>'+esc(x.full)+'</b><br>'+miles(t)+' personas'+(t>prom*1.25 ? ' · <b>muy arriba del promedio: puede ser más de un vuelo</b>' : t<prom*0.25 ? ' · <b>muy abajo del promedio</b>' : '')+'<br>'+ps.filter(p => p.seriesName!=='Total').map(p => p.marker+esc(p.seriesName)+': <b>'+miles(p.value)+'</b>').join('<br>'); } });
  { const sc = $('pm-pr').parentNode; requestAnimationFrame(() => { sc.scrollLeft = sc.scrollWidth; }); }   // empieza en lo más reciente
  ch.setOption({ series:[{ markLine:{ silent:true, symbol:'none', lineStyle:{ color:'#2B2926', type:'dashed', width:1 }, label:{ formatter:'promedio '+miles(prom), color:'#5C5952', fontSize:10.5, position:'insideEndTop' }, data:[{ yAxis:prom }] } }] });
}
/* ==== [5b] MAPAS, DÍAS Y CRUCES ==================================== */
// Coordenadas aproximadas (ciudad del punto o aeropuerto) para ubicar cada punto en el mapa
const COORD = [[/tijuana|chaparral/,-117.03,32.54],[/mexicali/,-115.47,32.66],[/juárez|juarez/,-106.45,31.75],[/ojinaga/,-104.41,29.56],[/piedras negras/,-100.52,28.70],[/acuña/,-100.93,29.32],
  [/nogales/,-110.94,31.33],[/san luis río|san luis rio/,-114.77,32.48],[/reynosa/,-98.28,26.09],[/nuevo laredo/,-99.51,27.50],[/matamoros/,-97.50,25.88],[/aifa|felipe ángeles/,-99.02,19.74],
  [/agua prieta/,-109.55,31.33],[/villahermosa/,-92.82,17.99],[/tapachula/,-92.37,14.79],[/tulum/,-87.62,20.10],[/hidalgo/,-92.15,14.68],[/monterrey/,-100.11,25.78],[/guadalajara/,-103.31,20.52],
  [/aicm|ciudad de méxico/,-99.07,19.44],[/mérida|merida/,-89.66,20.94],[/campeche/,-90.50,19.82],[/morelia/,-101.03,19.85],[/huatulco/,-96.26,15.78],[/san luis potosí|san luis potosi/,-100.93,22.25],
  [/cancún|cancun/,-86.88,21.04],[/vallarta/,-105.25,20.68],[/hermosillo/,-111.05,29.10],[/zihuatanejo/,-101.46,17.60],[/cabos/,-109.72,23.15],[/quer[eé]taro/,-100.19,20.62]];
const coord = nom => { const n = String(nom).toLowerCase(); const c = COORD.find(x => x[0].test(n)); return c ? [c[1], c[2]] : null; };
// Mapa de la región (México, EE. UU., Centroamérica y Caribe), registrado una sola vez, con los colores del mapa del Pulso
const MT = { mar:'#E4E1D5', tierra:'#F7F5EE', linea:'#CFCBBB', mx:'#FBFAF6', mxL:'#B9B4A6' };
function mapaRegion(){ if (echarts.getMap('pm-region')) return true; const G = window.IANAMI_GEO; if (!G) return false;
  const CA = new Set(['P_320','P_340','P_222','P_084','P_558','P_188','P_591','P_192','P_044','P_388','P_332','P_214','P_124','P_630','P_170','P_862']);
  echarts.registerMap('pm-region', { type:'FeatureCollection', features:G.features.filter(f => f.properties.t==='m' || f.properties.t==='u' || CA.has(f.properties.key)) }); return true; }
// Encuadre que llena la caja sin deformar el mapa: la zona de interés siempre cabe completa y se extiende la geografía alrededor
function encuadreGeo(el, caja){ const w = el.clientWidth || 600, h = el.clientHeight || 400; let x0 = caja[0][0], y1 = caja[0][1], x1 = caja[1][0], y0 = caja[1][1];
  const px = (x1-x0)*.07, py = (y1-y0)*.05; x0 -= px; x1 += px; y0 -= py; y1 += py;
  const a = Math.cos((y0+y1)/2*Math.PI/180), R = (x1-x0)*a/(y1-y0), Rc = w/h;
  if (Rc>R){ const e = ((y1-y0)*Rc/a-(x1-x0))/2; x0 -= e; x1 += e; } else { const e = ((x1-x0)*a/Rc-(y1-y0))/2; y0 -= e; y1 += e; }
  return { boundingCoords:[[x0,y1],[x1,y0]], aspectScale:a, layoutCenter:['50%','50%'], layoutSize:Math.max(w, h) }; }
function mapaGeo(id, caja, op, regiones){ if (!mapaRegion()) return null; const el = $(id); if (!el) return null;
  const geo = () => Object.assign({ map:'pm-region', nameProperty:'key', roam:false, silent:true, itemStyle:{ areaColor:MT.tierra, borderColor:MT.linea, borderWidth:.6 },
    regions:(window.IANAMI_GEO.features.filter(f => f.properties.t==='m').map(f => ({ name:f.properties.key, itemStyle:{ areaColor:MT.mx, borderColor:MT.mxL, borderWidth:.7 } }))).concat(regiones || []) }, encuadreGeo(el, caja));
  const ch = graf(id, Object.assign({ backgroundColor:MT.mar, geo:geo() }, op));
  if (!el._geoObs){ let t = 0; el._geoObs = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { const c = echarts.getInstanceByDom(el); if (c && el._geoF) c.setOption({ geo:el._geoF() }); }, 80); }); el._geoObs.observe(el); }
  el._geoF = geo; return ch; }
// Burbujas: un punto por lugar, tamaño según personas; nombre y cifra en los principales (la leyenda va en HTML, arriba)
function burbujas(id, pts, o){ const mx = Math.max(1, ...pts.map(p => p.v)), top = new Set(pts.slice().sort((a,b) => b.v-a.v).slice(0, o.etiq || 8).map(p => p.nom)), el = $(id);
  const lim = el ? Math.min(el.clientWidth || 600, el.clientHeight || 400) : 400, maxR = Math.max(26, Math.min(o.max || 46, lim/8));
  const ch = mapaGeo(id, o.caja, { tooltip:{ trigger:'item', formatter:p => '<b>'+esc(p.data.nom)+'</b><br>'+miles(p.data.v)+' '+(o.unidad || 'personas')+(o.T ? ' · '+pct(p.data.v, o.T)+'%' : '')+(p.data.extra ? '<br>'+p.data.extra : '')+(o.per ? '<br><span style="font-size:10.5px;opacity:.7">'+o.per+'</span>' : '') },
    series:(o.ley || [[null, VERDE]]).map(L => ({ name:L[0] || 'p', type:'effectScatter', coordinateSystem:'geo', showEffectOn:'render', rippleEffect:{ brushType:'stroke', scale:2.2, period:4.5, number:2 }, itemStyle:{ color:L[1] }, data:pts.filter(p => !L[0] || p.grupo===L[0]).sort((a,b) => b.v-a.v).map(p => ({ name:p.nom, nom:p.nom, v:p.v, k:p.k, extra:p.extra, value:[p.c[0], p.c[1], p.v],
        itemStyle:{ color:L[1], opacity:o.sel!=null && o.sel>=0 && o.sel!==p.k ? .25 : .85, borderColor:'#fff', borderWidth:1.2 },
        label:{ show:top.has(p.nom), position:p.c[0] > -93 ? 'left' : 'right', formatter:'{n|'+p.corto+'} {v|'+corto(p.v)+'}', rich:{ n:{ fontSize:10.5, color:'#2B2926' }, v:{ fontSize:10.5, fontWeight:700, color:'#2B2926' } }, textBorderColor:MT.tierra, textBorderWidth:3 } })),
      symbolSize:v => 6+Math.sqrt(v[2]/mx)*maxR, labelLayout:{ hideOverlap:true }, emphasis:{ scale:1.15, label:{ show:true } } })) });
  if (ch && o.click){ ch.off('click'); ch.on('click', p => { if (p.data && p.data.k!=null) o.click(p.data.k); }); }
  return ch; }
const leyMapa = l => '<div class="pm-ley pm-ley-m">'+l.map(x => '<span><i class="sw" style="background:'+x[1]+';border-radius:50%"></i>'+esc(x[0])+'</span>').join('')+'</div>';
// ¿Dónde se recibe? Puntos de repatriación en el mapa (terrestre en ocre, vuelos PRIM en verde)
function pintarDonde(){
  const x = agg(REP, i => REP.p[i], NP, vEm({pto:-1})), T = x.reduce((a,b)=>a+b,0), caja = $('pm-mp').closest('.caja');
  if (!T){ caja.hidden = true; return; } caja.hidden = false;
  const pts = [...Array(NP).keys()].filter(k => x[k] && coord(nomP(k))).map(k => ({ k:k, nom:nomP(k), corto:nomP(k).replace(/ \(vuelos PRIM\)/,'').replace(/ \(Libertad\)|El Chaparral, /g,''), v:x[k], c:coord(nomP(k)), grupo:AEREO.has(k) ? 'Aérea (vuelos PRIM)' : 'Terrestre' }));
  const tN = pts.filter(p => p.grupo==='Terrestre').reduce((t,p) => t+p.v, 0);
  $('pm-mp-q').innerHTML = '<b>'+miles(T)+'</b> '+MED[Q.em][0]+' en '+pts.length+' puntos · '+pct(tN, T)+'% por la frontera norte (garitas y puentes) y '+pct(T-tN, T)+'% en vuelos PRIM · el tamaño es la cantidad · toca un punto para filtrar';
  burbujas('pm-mp', pts, { caja:[[-118.6,33.2],[-86.4,14.3]], per:fechaA(Q.d0)+' – '+fechaA(Q.d1-1), T:T, unidad:MED[Q.em][0], etiq:9, max:44, sel:Q.pto, ley:[['Terrestre', COLMOD[0]], ['Aérea (vuelos PRIM)', COLMOD[1]]],
    click:k => { Q.pto = Q.pto===k ? -1 : k; Q.sel = null; cuerpo(); } });
}
// ¿Qué días se repatría? Ritmo de la semana (promedio por día, por modalidad) y calendario de cada punto (en qué días recibe)
function pintarDs(){
  const M = MED[Q.em], cuenta = new Array(7).fill(0); for (let d=Q.d0; d<Q.d1; d++) cuenta[dSem(d)]++;
  const x = [0,1].map(m => agg(REP, i => dSem(REP.d[i]), 7, vEm({mod:Q.mod>=0 && Q.mod!==m ? 9 : m}))), av = (m,k) => cuenta[k] ? x[m][k]/cuenta[k] : 0;
  const caja = $('pm-ds').closest('.caja'), tt = DSEM.map((_,k) => av(0,k)+av(1,k)); if (!tt.some(Boolean)){ caja.hidden = true; return; } caja.hidden = false;
  const mx = Math.max(...tt), kMx = tt.indexOf(mx), kMn = tt.indexOf(Math.min(...tt)), prom = tt.reduce((a,b)=>a+b,0)/7;
  $('pm-ds-q').innerHTML = 'Promedio de '+M[0]+' por día de la semana · '+fechaA(Q.d0)+' – '+fechaA(Q.d1-1)+(filtrosTxt().length ? ' · '+filtrosTxt().map(z => '<b>'+esc(z)+'</b>').join(' · ') : '');
  const ritmo = '<div class="pm-dia-r"><h4>Ritmo de la semana <small>promedio por día</small></h4>'+DSEM.map((_,k) => { const t = av(0,k), a = av(1,k);
      return '<div class="pm-dr'+(k===kMx ? ' max' : '')+'"><span>'+DSEML[k]+'</span><span class="b"><i style="width:'+(t/mx*100).toFixed(1)+'%;background:'+COLMOD[0]+'" title="Terrestre: '+miles(t)+'"></i><i style="width:'+(a/mx*100).toFixed(1)+'%;background:'+COLMOD[1]+'" title="Vuelos PRIM: '+miles(a)+'"></i></span><b class="num">'+miles(t+a)+'</b></div>'; }).join('')+
    '<p class="pm-dia-n"><b>'+cap(DSEML[kMx])+'</b> es el día con más llegadas ('+miles(mx)+', '+Math.round((mx/prom-1)*100)+'% arriba del promedio diario); <b>'+DSEML[kMn]+'</b> el de menos ('+miles(tt[kMn])+').</p>'+
    '<div class="pm-ley"><span><i class="sw" style="background:'+COLMOD[0]+'"></i>Terrestre</span><span><i class="sw" style="background:'+COLMOD[1]+'"></i>Vuelos PRIM</span></div></div>';
  // calendario: los 10 puntos con más llegadas; cada celda es el promedio de ese día y su color, qué parte de la semana del punto cae ese día
  const pd = agg(REP, i => REP.p[i]*7+dSem(REP.d[i]), NP*7, vEm({pto:-1})), totP = [...Array(NP).keys()].map(k => { let t = 0; for (let j=0;j<7;j++) t += pd[k*7+j]; return t; });
  const ps = [...Array(NP).keys()].filter(k => totP[k]).sort((a,b) => totP[b]-totP[a]).slice(0, 10);
  const cal = '<div class="pm-dia-c"><h4>¿Qué días recibe cada punto? <small>los 10 con más llegadas · color = parte de su semana</small></h4><div class="pm-hm"><span></span>'+DSEM.map(d => '<span class="h">'+d+'</span>').join('')+
    ps.map(k => { const mxr = Math.max(...[0,1,2,3,4,5,6].map(j => pd[k*7+j])) || 1, fijo = [0,1,2,3,4,5,6].filter(j => pd[k*7+j]/totP[k] >= .05).length;
      return '<button class="n'+(Q.pto===k ? ' on' : '')+'" data-ppt="'+k+'" title="'+esc(nomP(k))+': llega '+(fijo<=3 ? 'casi solo '+fijo+' días de la semana' : 'casi todos los días')+'">'+esc(nomP(k).replace(' (vuelos PRIM)',' ✈'))+'</button>'+
        [0,1,2,3,4,5,6].map(j => { const v = pd[k*7+j], a = v/mxr, prm = cuenta[j] ? v/cuenta[j] : 0;
          return '<span class="c" style="background:rgba(47,102,87,'+(v ? (.08+a*.86).toFixed(2) : 0)+');color:'+(a>.55 ? '#fff' : '#2B2926')+'" title="'+esc(nomP(k))+' · '+DSEML[j]+': '+miles(v)+' en el periodo ('+pct(v, totP[k])+'% de su semana) · promedio '+miles(prm)+'">'+(v ? (prm>=10 ? Math.round(prm) : prm.toFixed(1)) : '·')+'</span>'; }).join(''); }).join('')+
    '</div><p class="pm-dia-n">Cifra = promedio por día. Los vuelos PRIM llegan en días fijos (celdas oscuras, el resto casi vacío); las garitas reciben casi todos los días.</p></div>';
  $('pm-ds').innerHTML = '<div class="pm-dia">'+ritmo+cal+'</div>';
}
// Vuelos comerciales y Guatemala-Honduras: con su propio periodo
function semanalOtro(X, id, q, series, colK){ const T = X.T, w0 = semDe(X.d0), nw = semDe(X.d1)-w0+1, a = series.map(() => new Array(nw).fill(0));
  for (let i=0;i<T.N;i++){ const w = semDe(T.d[i])-w0; series.forEach((s,j) => { if (s.f(i)) a[j][w] += T.v[i]; }); }
  const l = a[0].map((_,w) => { const o = { lab:fecha(semIni(w0+w)), full:'Semana del '+fechaA(semIni(w0+w)) }; series.forEach((s,j) => { o['s'+j] = a[j][w]; }); return o; });
  barrasV(id, l, { q:q, stack:series.length>1, ley:true, tend:4, series:series.map((s,j) => ({ name:s.name, k:'s'+j, col:s.col })),
    tip:ps => '<b>'+esc(l[ps[0].dataIndex].full)+'</b><br>'+ps.filter(p => p.seriesName!=='Total').map(p => (series.length>1 ? p.marker+esc(p.seriesName)+': ' : '')+'<b>'+miles(p.value)+'</b> personas').join('<br>') });
}
function diasOtro(X, grupos){ const T = X.T, n = new Array(7).fill(0), a = grupos.map(() => new Array(7).fill(0)), dias = new Set();
  for (let i=0;i<T.N;i++){ const j = dSem(T.d[i]); grupos.forEach((g,k) => { if (g.f(i)) a[k][j] += T.v[i]; }); if (!dias.has(T.d[i])){ dias.add(T.d[i]); n[j]++; } }
  const t = [0,1,2,3,4,5,6].map(j => a.reduce((s,x) => s+x[j], 0)), mx = Math.max(1, ...t), T0 = t.reduce((x,y)=>x+y,0);
  return '<div class="pm-dia-r pm-dia-o">'+[0,1,2,3,4,5,6].map(j => '<div class="pm-dr'+(t[j]===mx ? ' max' : '')+'"><span>'+DSEML[j]+'<small>'+n[j]+' '+(n[j]===1 ? 'día' : 'días')+' · '+pct(t[j], T0)+'%</small></span><span class="b">'+grupos.map((g,k) => '<i style="width:'+(a[k][j]/mx*100).toFixed(1)+'%;background:'+g.col+'" title="'+esc(g.name)+': '+miles(a[k][j])+'"></i>').join('')+'</span><b class="num">'+miles(t[j])+'</b></div>').join('')+
    (grupos.length>1 ? '<div class="pm-ley">'+grupos.map(g => '<span><i class="sw" style="background:'+g.col+'"></i>'+esc(g.name)+'</span>').join('')+'</div>' : '')+'</div>';
}
const listaO = (l, T, nom, col) => l.map(r => '<div class="barra"><span>'+esc(nom(r[0]))+' <small>'+pct(r[1], T)+'%</small></span><span class="b"><i style="width:'+(r[1]/l[0][1]*100).toFixed(1)+'%;background:'+col+'"></i></span><span class="x">'+miles(r[1])+'</span></div>').join('');
function kpisOtro(cartas){ return '<section class="kpis rg-kpis" id="cv-kpis" data-modo="'+(Q.compacto?'compacto':'tarjetas')+'">'+cartas.map(c => '<div class="kg" style="flex:'+(c.flex || 1)+' 1 0;--g:'+c.col+'"><div class="eti">'+c.eti+'</div><div>'+c.html+'</div></div>').join('')+'</section>'; }
const cartaO = (nom, sub, v, col, ic, d, val) => kc({ col:col, ic:ic, nom:nom, sub:sub, val:val || corto(v), num:val ? null : v, d:'<span class="kc-d">'+d+'</span>' });
function pintarOtro(k){ if (k==='gh') pintarGH(); else pintarCom(); }
// Lo que cambió: las últimas 4 semanas de la base contra las 4 anteriores, el grupo que más se movió y la última llegada
function cambiosOtro(X, grupos, nomU){ const T = X.T, b1 = X.d1+1, a0 = b1-28, p0 = a0-28, sumaV = (d0, d1, f) => { let t = 0; for (let i=0;i<T.N;i++) if (T.d[i]>=d0 && T.d[i]<d1 && (!f || f(i))) t += T.v[i]; return t; };
  const A = sumaV(a0, b1), P = sumaV(p0, a0), hz = [], rng = fecha(a0)+' – '+fecha(X.d1);
  if (P) hz.push({ cl:A>=P ? 'u' : 'd', ic:A>=P ? '▲' : '▼', h:cap(nomU)+(A>=P ? ' suben ' : ' bajan ')+Math.abs((A/P-1)*100).toFixed(1)+'% en las últimas 4 semanas', t:miles(P)+' → '+miles(A)+' · '+rng+' contra las 4 semanas anteriores' });
  const g = grupos.map(x => [x, sumaV(a0, b1, x.f), sumaV(p0, a0, x.f)]).filter(x => x[1] || x[2]).sort((a,b) => Math.abs(b[1]-b[2])-Math.abs(a[1]-a[2]))[0];
  if (g && g[1]!==g[2]) hz.push({ cl:'n', ic:g[1]>g[2] ? '+' : '−', h:esc(g[0].name)+(g[1]>g[2] ? ' es lo que más sube' : ' es lo que más baja')+': '+(g[1]>g[2] ? '+' : '')+miles(g[1]-g[2]), t:miles(g[2])+' → '+miles(g[1])+(A ? ' · ahora es '+pct(g[1], A)+'% del total' : '')+' · últimas 4 semanas' });
  let u = -1, uv = 0; for (let i=0;i<T.N;i++) if (T.d[i]>u){ u = T.d[i]; uv = 0; } for (let i=0;i<T.N;i++) if (T.d[i]===u) uv += T.v[i];
  const atraso = CV.dias-1-u; hz.push({ cl:atraso>14 ? 'al' : 'n', ic:atraso>14 ? '!' : '◷', h:'Última llegada: '+fechaA(u)+' ('+miles(uv)+' personas)', t:atraso>14 ? 'la base llega hasta aquí: '+atraso+' días antes del corte de Repatriados ('+fechaA(CV.dias-1)+'); pedir la actualización' : 'al día con el corte de Repatriados' });
  return '<div class="rg-hz">'+hz.map(titular).join('')+'</div>'; }
// Guatemala y Honduras: EE. UU. envía a mexicanos a Guatemala u Honduras y México los recibe por Ciudad Hidalgo (Chiapas)
function pintarGH(){
  const X = OTROS.gh, T = X.T, PA = X.dic.pa, iG = PA.indexOf('Guatemala'), iH = PA.indexOf('Honduras');
  let V = 0, ME = 0; const porPa = new Array(PA.length).fill(0), dd = new Map(); for (let i=0;i<T.N;i++){ V += T.v[i]; ME += T.me[i]; porPa[T.pa[i]] += T.v[i]; dd.set(T.d[i], (dd.get(T.d[i])||0)+T.v[i]); }
  const dias = [...dd.keys()].sort((a,b) => a-b), G = iG>=0 ? porPa[iG] : 0, H = iH>=0 ? porPa[iH] : 0, mxD = Math.max(...dd.values()), dMx = dias.find(d => dd.get(d)===mxD);
  // cruce con Repatriados: el mismo día, el punto Ciudad Hidalgo
  const pCH = DIC.p.findIndex(p => /hidalgo/i.test(p)), rch = pCH>=0 ? agg(REP, i => REP.d[i], CV.dias, {pto:pCH, mod:-1, ests:null, d0:0, d1:CV.dias, v:'v'}) : null;
  let coin = 0, sRep = 0; if (rch){ dias.forEach(d => { coin += Math.min(dd.get(d), rch[d]||0); }); for (let d=X.d0; d<=X.d1; d++) sRep += rch[d]||0; }
  const pc = V ? coin/V*100 : 0, mismo = pc>=90, dSolo = rch ? dias.filter(d => !(rch[d]>0)).length : 0;
  $('cv-ctl').innerHTML = '<div class="rango"><b>'+fechaA(X.d0)+' – '+fechaA(X.d1)+'</b><span>'+(mismo ? 'Estas personas <b>ya forman parte de los repatriados</b> (llegan por Ciudad Hidalgo): no se suman otra vez. Este archivo agrega <b>de qué país</b> vienen.' : 'periodo propio de la base · no se suma a Repatriados')+'</span></div>';
  const fG = i => T.pa[i]===iG, fH = i => T.pa[i]===iH, CG = VERDE, CHN = VINO;
  $('cv-body').innerHTML = kpisOtro([
      { col:'#2B2926', eti:'Total', html:cartaO('Recibidos', 'por Ciudad Hidalgo, Chiapas', V, '#2B2926', IC.tot, dias.length+' días con llegada') },
      { col:VERDE, eti:'Desde qué país', flex:2, html:cartaO('Desde Guatemala', '', G, CG, IC.tierra, pct(G, V)+'% del total')+cartaO('Desde Honduras', '', H, CHN, IC.tierra, pct(H, V)+'% del total') },
      { col:VERDE, eti:'Cómo llegan', flex:2, html:cartaO('Por llegada', 'promedio de personas', 0, VERDE, IC.tierra, 'la mayor: '+miles(mxD)+' el '+fecha(dMx), miles(V/Math.max(1, dias.length)))+cartaO('NNA', ME ? '' : 'todos son adultos', ME, ROJO, IC.nino, ME ? pct(ME, V)+'% del total' : '0 niñas, niños o adolescentes') }])+
    cambiosOtro(X, [{ name:'Guatemala', f:fG }, { name:'Honduras', f:fH }], 'recibidos')+
    '<div class="rg-g rg-g21"><div class="caja"><h2><span>La ruta: de EE. UU. a México por Centroamérica</span>'+info('ghm')+'</h2><span class="q">EE. UU. envía a mexicanos a Guatemala u Honduras; desde ahí cruzan a México por Ciudad Hidalgo, Chiapas · el grosor es la cantidad</span>'+
        '<ol class="pm-pasos"><li><b>1</b><span>EE. UU. los envía a <b>Guatemala</b> ('+miles(G)+') o a <b>Honduras</b> ('+miles(H)+')</span></li><li><b>2</b><span>Viajan por tierra hasta la frontera sur de México</span></li><li><b>3</b><span>México los recibe en <b>Ciudad Hidalgo</b>, Chiapas</span></li></ol><div id="pm-gh-mapa" class="cv-fill pm-mapa" style="min-height:400px"></div></div>'+
      '<div class="caja"><h2><span>¿Estas personas ya están en Repatriados?</span>'+info('ghc')+'</h2><span class="q">se compara este archivo, día por día, con el punto Ciudad Hidalgo del archivo de Repatriados</span>'+
        (rch ? '<div class="pm-cuadre"><div class="pm-cq"><b class="num">'+(mismo ? 'Sí' : 'No del todo')+'</b><span><b>'+Math.round(pc)+' de cada 100</b> personas de este archivo aparecen en Repatriados <b>el mismo día y con la misma cifra</b>, como llegadas a Ciudad Hidalgo.</span></div>'+
          '<p>'+(mismo ? 'Por eso no se suman a los repatriados: ya están dentro de ese total. Lo único nuevo que trae este archivo es <b>de qué país llegaron</b> (Guatemala u Honduras).' : 'La coincidencia es baja: conviene confirmar con el área si son flujos distintos.')+'</p>'+
          '<div class="pm-cq2"><div><b class="num">'+miles(coin)+'</b><span>coinciden en los dos archivos</span></div><div><b class="num">'+miles(V-coin)+'</b><span>solo en este archivo ('+dSolo+' '+(dSolo===1 ? 'día' : 'días')+' que Repatriados no registró)</span></div><div><b class="num">'+miles(rch.reduce((a,b)=>a+b,0)-sRep)+'</b><span>ya en Repatriados después del '+fecha(X.d1)+': este archivo aún no se actualiza</span></div></div></div>'+
          '<span class="mini pm-cq-l">Barras grises: este archivo · verdes: Repatriados en Ciudad Hidalgo. Si la verde tapa a la gris, es el mismo registro.</span>'+
          '<div id="pm-gh-cq" style="height:230px"></div>' : '<p class="mini">Repatriados no trae el punto Ciudad Hidalgo.</p>')+'</div></div>'+
    '<div class="rg-g rg-g21"><div class="caja"><h2><span>Por semana y país</span>'+info('ghs')+'</h2><span class="q" id="pm-gh-sq">personas por semana · '+fechaA(X.d0)+' – '+fechaA(X.d1)+'</span><div class="cv-scroll"><div id="pm-gh-sem" style="height:300px"></div></div></div>'+
      '<div class="caja"><h2><span>¿Qué días llegan?</span>'+info('ghd')+'</h2><span class="q">personas por día de la semana en todo el periodo · días con llegada</span>'+diasOtro(X, [{ name:'Guatemala', col:CG, f:fG }, { name:'Honduras', col:CHN, f:fH }])+'</div></div>'+
    '<p class="mini" style="padding:0 16px">Fuente: '+esc(X.archivo)+' (DGPMV) · '+fechaA(X.d0)+' – '+fechaA(X.d1)+'. Mexicanos que EE. UU. envió a Guatemala u Honduras y que México recibe por la frontera sur. La ruta del mapa es ilustrativa: el archivo no trae la ciudad de EE. UU. ni el aeropuerto de llegada.</p>';
  semanalOtro(X, 'pm-gh-sem', 'pm-gh-sq', [{ name:'Guatemala', col:CG, f:fG }, { name:'Honduras', col:CHN, f:fH }]);
  // mapa de flujo, centrado en México (como «¿A qué aeropuertos llegan?»): EE. UU. → Guatemala / Honduras → Ciudad Hidalgo.
  // Trazos finos con partículas; el grosor solo distingue el volumen, sin tapar el mapa.
  { const US = [-98.2,30.6], GT = [-90.5,14.6], HN = [-87.2,14.9], CH = [-92.15,14.68], mxF = Math.max(G, H, 1), w = v => 1.4+v/mxF*2.2;
    const nodo = (c, nom, txt, col, pos, r, off) => ({ name:nom, value:[c[0], c[1]], symbolSize:r || 9, itemStyle:{ color:col, borderColor:'#fff', borderWidth:1.5 }, label:{ show:true, position:pos, offset:off || [0,0], distance:7, formatter:'{n|'+nom+'}'+(txt ? '\n{v|'+txt+'}' : ''), rich:{ n:{ fontSize:11.5, fontWeight:700, color:'#2B2926', lineHeight:15 }, v:{ fontSize:10.5, color:'#5C5952' } }, textBorderColor:MT.tierra, textBorderWidth:3 } });
    const lin = (a, b, v, col, cur) => ({ coords:[a, b], v:v, lineStyle:{ width:w(v), color:col, curveness:cur, opacity:.8 } });
    const fx = col => ({ show:true, period:5, trailLength:.55, symbol:'circle', symbolSize:3.5, color:col, loop:true });
    mapaGeo('pm-gh-mapa', [[-112,32],[-84.5,12.6]], { tooltip:{ trigger:'item', formatter:p => p.seriesType==='lines' ? miles(p.data.v)+' personas<br><span style="font-size:10.5px;opacity:.7">'+fechaA(X.d0)+' – '+fechaA(X.d1)+'</span>' : '<b>'+esc(p.name)+'</b>' },
      series:[{ type:'lines', coordinateSystem:'geo', effect:fx(CG), data:[lin(US, GT, G, CG, -.22), lin(GT, CH, G, CG, .5)] },
        { type:'lines', coordinateSystem:'geo', effect:fx(CHN), data:[lin(US, HN, H, CHN, .3), lin(HN, CH, H, CHN, .4)] },
        { type:'scatter', coordinateSystem:'geo', z:3, data:[nodo(US, 'EE. UU.', '', '#5C5952', 'left', 8), nodo(GT, 'Guatemala', miles(G), CG, 'bottom', 9, [10,0]), nodo(HN, 'Honduras', miles(H), CHN, 'right', 9)] },
        { type:'effectScatter', coordinateSystem:'geo', z:4, rippleEffect:{ brushType:'stroke', scale:3, period:4 }, data:[nodo(CH, 'Cd. Hidalgo', 'recibe '+miles(V), '#2B2926', 'left', 10, [-4,-10])] }] },
      [{ name:'P_320', itemStyle:{ areaColor:'#DCE7E3', borderColor:MT.mxL } }, { name:'P_340', itemStyle:{ areaColor:'#F0E2DF', borderColor:MT.mxL } }]); }
  // cuadre por día
  if (rch){ const l = dias.map(d => [fecha(d), dd.get(d), rch[d]||0]);
    graf('pm-gh-cq', { grid:{ left:40, right:8, top:26, bottom:22 }, legend:{ top:0, left:0, icon:'roundRect', itemWidth:12, itemHeight:8, textStyle:{ fontSize:11 } }, tooltip:{ trigger:'axis', axisPointer:{ type:'shadow' } },
      xAxis:{ type:'category', data:l.map(x => x[0]), axisTick:{show:false}, axisLine:{lineStyle:{color:'#C9C4B5'}}, splitLine:{ show:true, lineStyle:{ color:'#EEEBE2' } }, axisLabel:{ fontSize:9.5, color:'#5C5952', hideOverlap:true } },
      yAxis:Object.assign({}, ejeY), series:[{ name:'Este archivo', type:'bar', barGap:'-100%', barMaxWidth:12, data:l.map(x => x[1]), itemStyle:{ color:'#D8D3C4' } }, { name:'Repatriados · Ciudad Hidalgo', type:'bar', barMaxWidth:6, data:l.map(x => x[2]), itemStyle:{ color:VERDE } }] }); }
}
// Vuelos comerciales: por aeropuerto, semana y día de la semana
function pintarCom(){
  const X = OTROS.com, T = X.T, NPc = X.dic.p.length; let V = 0, ME = 0; const porP = new Array(NPc).fill(0), porE = new Array(X.dic.e.length).fill(0), dd = new Map();
  for (let i=0;i<T.N;i++){ V += T.v[i]; ME += T.me[i]; porP[T.p[i]] += T.v[i]; porE[T.e[i]] += T.v[i]; dd.set(T.d[i], (dd.get(T.d[i])||0)+T.v[i]); }
  const lp = porP.map((v,j) => [j, v]).filter(x => x[1]).sort((a,b) => b[1]-a[1]), le = porE.map((v,j) => [j, v]).filter(x => x[1]).sort((a,b) => b[1]-a[1]), nomA = j => X.dic.p[j].replace(/^A\. I\. /,'');
  $('cv-ctl').innerHTML = '<div class="rango"><b>'+fechaA(X.d0)+' – '+fechaA(X.d1)+'</b><span>periodo propio de la base · son otros vuelos (no PRIM): se suman aparte, no están en Repatriados</span></div>';
  const top2 = lp.slice(0, 2).reduce((t,x) => t+x[1], 0);
  $('cv-body').innerHTML = kpisOtro([
      { col:'#2B2926', eti:'Total', html:cartaO('Repatriados', 'en vuelos comerciales', V, '#2B2926', IC.avion, dd.size+' días con llegada') },
      { col:VERDE, eti:'Cómo llegan', flex:2, html:cartaO('Por día con llegada', 'promedio de personas', 0, VERDE, IC.avion, (m => 'la mayor: '+miles(m[1])+' el '+fecha(m[0]))([...dd.entries()].sort((a,b) => b[1]-a[1])[0]), miles(V/Math.max(1, dd.size)))+cartaO('NNA', ME ? '' : 'todos son adultos', ME, ROJO, IC.nino, ME ? pct(ME, V)+'% del total' : '0 niñas, niños o adolescentes') },
      { col:OCRE, eti:'Dónde', flex:1, html:cartaO('Aeropuertos', 'que reciben', 0, OCRE, IC.avion, nomA(lp[0][0])+' y '+nomA(lp[1] ? lp[1][0] : lp[0][0])+': '+pct(top2, V)+'%', String(lp.length)) }])+
    cambiosOtro(X, lp.map(x => ({ name:nomA(x[0]), f:i => T.p[i]===x[0] })), 'repatriados en vuelos comerciales')+
    '<div class="rg-g rg-g2"><div class="caja"><h2><span>¿A qué aeropuertos llegan?</span>'+info('cmm')+'</h2><span class="q">el tamaño es la cantidad · '+miles(V)+' personas en '+lp.length+' aeropuertos</span><div id="pm-cm-mapa" class="cv-fill pm-mapa" style="min-height:380px"></div></div>'+
      '<div class="caja"><h2><span>Por aeropuerto</span>'+info('cma')+'</h2><span class="q">de mayor a menor · el % es la parte del total</span>'+listaO(lp, V, nomA, VERDE)+'<h4 class="mini" style="margin:14px 0 4px">O.R. que recibe</h4>'+listaO(le, V, j => X.dic.e[j], '#778E88')+'</div></div>'+
    '<div class="rg-g rg-g21"><div class="caja"><h2><span>Por semana</span>'+info('cms')+'</h2><span class="q" id="pm-cm-sq">personas por semana · '+fechaA(X.d0)+' – '+fechaA(X.d1)+'</span><div class="cv-scroll"><div id="pm-cm-sem" style="height:300px"></div></div></div>'+
      '<div class="caja"><h2><span>¿Qué días llegan?</span>'+info('cmd')+'</h2><span class="q">personas por día de la semana en todo el periodo · días con llegada</span>'+diasOtro(X, [{ name:'Personas', col:VERDE, f:() => true }])+'</div></div>'+
    '<p class="mini" style="padding:0 16px">Fuente: '+esc(X.archivo)+' (DGPMV) · '+fechaA(X.d0)+' – '+fechaA(X.d1)+'. Mexicanos repatriados desde EE. UU. en vuelos comerciales (no PRIM). No están en el archivo de Repatriados: se suman aparte.</p>';
  semanalOtro(X, 'pm-cm-sem', 'pm-cm-sq', [{ name:'Personas', col:VERDE, f:() => true }]);
  burbujas('pm-cm-mapa', lp.filter(x => coord(X.dic.p[x[0]])).map(x => ({ k:x[0], nom:X.dic.p[x[0]], corto:nomA(x[0]), v:x[1], c:coord(X.dic.p[x[0]]) })), { caja:[[-118.6,33.2],[-86.4,14.3]], per:fechaA(X.d0)+' – '+fechaA(X.d1), T:V, etiq:7, max:40 });
}

/* ==== [6] MONTAJE Y EVENTOS ======================================= */
const INFO = {
  tr:'<b>¿Cómo cambian los repatriados en el tiempo?</b> Mexicanos que EE. UU. regresó a México, por día, semana o mes. Puedes verlos en total o separados por modalidad (garitas y puentes, o vuelos PRIM), grupo, O.R. o punto.<br><br><b>Cómo leerla:</b> la franja es el rango habitual (calculado fuera de vacaciones); lo que sale de la franja es inusual. Las sombras grises son temporadas vacacionales. El último punto hueco es un periodo aún incompleto.',
  tp:'<b>¿Quién llega y por dónde?</b> Cómo se reparten los repatriados del periodo: hombres y mujeres adultos, y niñas, niños y adolescentes (NNA) con o sin acompañante. Abajo, los puntos y las O.R. que más reciben.<br><br>Toca un grupo para analizar solo ese grupo; toca un punto u O.R. para filtrar. Si tocas un día, semana o mes en la gráfica de la izquierda, este panel muestra solo ese periodo y su cambio contra el anterior.',
  perfil:'<b>¿A quién recibe cada punto?</b> De cada 100 personas que llegan a un punto, cuántas son hombres adultos, mujeres adultas, NNA acompañados y NNA no acompañados.<br><br><b>Para qué sirve:</b> muestra qué puntos necesitan más atención a la niñez (los que tienen más rojo reciben más NNA que llegan solos). Se muestran los 12 puntos con más llegadas; el botón de abajo despliega todos.',
  prim:'<b>Llegadas de vuelos PRIM</b> (Programa de Repatriación al Interior de México): cada barra es un día con llegada a algún aeropuerto, con adultos y NNA. La línea punteada es el promedio por día con llegada.<br><br>El archivo no trae el número de vuelos: un día muy por encima del promedio puede ser más de un vuelo.',
  mapa:'<b>¿Dónde se recibe?</b> Cada círculo es un punto de repatriación; su tamaño es cuántas personas recibió en el periodo. En ocre, garitas y puentes de la frontera norte; en verde, aeropuertos con vuelos PRIM.<br><br>Toca un círculo para filtrar todo el tablero por ese punto. Las posiciones son la ciudad del punto (aproximadas).',
  ds:'<b>¿Qué días se repatría?</b> A la izquierda, el promedio de personas que llegan cada día de la semana, por garitas y puentes y por vuelos PRIM.<br><br>A la derecha, los 10 puntos con más llegadas y en qué días reciben: la cifra es el promedio de ese día y el color, qué tan concentrada está su semana en ese día. Un punto con pocas celdas oscuras recibe en días fijos (vuelos programados); uno parejo recibe todos los días.',
  tot:'<b>Totales por punto o por O.R.</b>, de mayor a menor, divididos en hombres y mujeres adultos y NNA acompañados y no acompañados. Toca una barra para filtrar.<br><br>Si la suma de los grupos no da el total es porque algunos registros de la base no cuadran (ver «Notas de calidad de los datos»).',
  hz:'<b>Lo que cambió:</b> cuánto subieron o bajaron los repatriados contra el periodo de comparación (y qué punto lo explica más), el punto donde una mayor parte de los NNA llega sin acompañante y el resumen de los vuelos PRIM. Toca un titular para filtrar.',
  ghm:'<b>La ruta:</b> EE. UU. envía a algunos mexicanos a Guatemala u Honduras; desde ahí viajan por tierra y México los recibe en Ciudad Hidalgo, Chiapas. El grosor de cada flecha es cuántas personas siguieron esa ruta.<br><br>El trazo es ilustrativo: el archivo dice el país, pero no la ciudad de EE. UU. ni el aeropuerto de llegada.',
  ghc:'<b>¿Estas personas ya están en Repatriados?</b> El archivo de Repatriados tiene un punto llamado Ciudad Hidalgo. Se compara, día por día, cuántas personas registra ese punto contra este archivo.<br><br>Si casi todos los días tienen la misma cifra, son <b>las mismas personas registradas en dos archivos</b>: ya están en el total de repatriados y no deben sumarse otra vez. Este archivo sirve para saber <b>de qué país</b> (Guatemala u Honduras) llegaron.',
  ghs:'<b>Personas por semana</b>, separadas por el país desde donde llegaron (Guatemala u Honduras).',
  ghd:'<b>¿Qué días llegan?</b> Personas por día de la semana en todo el periodo, y en cuántos de esos días hubo llegadas. Sirve para planear personal en Ciudad Hidalgo.',
  cmm:'<b>¿A qué aeropuertos llegan?</b> Mexicanos repatriados desde EE. UU. en vuelos comerciales (no son vuelos PRIM). El tamaño del círculo es cuántas personas llegaron a cada aeropuerto.',
  cma:'<b>Por aeropuerto y O.R.</b>, de mayor a menor, con la parte del total. Son llegadas en vuelos comerciales: no están en el archivo de Repatriados.',
  cms:'<b>Personas por semana</b> que llegaron en vuelos comerciales.',
  cmd:'<b>¿Qué días llegan?</b> Personas por día de la semana en todo el periodo, y en cuántos de esos días hubo llegadas.'
};
let popFija = false;
function mostrarInfo(b){ let p = $('pm-pop'); if (!p){ p = document.createElement('div'); p.id = 'pm-pop'; p.className = 'rg-pop fija'; p.setAttribute('role','dialog'); document.body.appendChild(p); }
  if (!b){ p.hidden = true; popFija = false; return; }
  p.innerHTML = '<button class="rg-pop-x" data-ppopx aria-label="Cerrar">×</button>'+INFO[b.dataset.pinfo]; p.hidden = false; popFija = true;
  const r = b.getBoundingClientRect(), w = Math.min(340, innerWidth-24); p.style.width = w+'px'; p.style.left = Math.max(12, Math.min(innerWidth-w-12, r.left-w/2))+'px'; p.style.top = (r.bottom+8+scrollY)+'px'; p.style.position = 'absolute'; }
function cuerpo(){ const c = $('cv-ctl'); if (!c) return; const bd = $('cv-body'); if (bd) bd.querySelectorAll('[_echarts_instance_]').forEach(el => { const ch = echarts.getInstanceByDom(el); if (ch && (el.id==='pm-gh-mapa' || OTROS[Q.vista] || /^pm-(gh|cm)-/.test(el.id))) ch.dispose(); }); document.querySelectorAll('.pm .pm-fuente, .pm .cv-calw').forEach(x => { x.hidden = !!OTROS[Q.vista]; }); if (OTROS[Q.vista]){ pintarOtro(Q.vista); return; } c.innerHTML = htmlCtl(); buscador(); pintarRep(); }
/* ---- Vuelos comerciales (aparte de Repatriados) y Guatemala-Honduras (cruce con Ciudad Hidalgo), con su propio periodo ---- */
const OTROS = {}; Object.keys(CV.otros || {}).forEach(k => { const o = CV.otros[k]; OTROS[k] = Object.assign({}, o, { T:tabla(o.t) }); });
const NOM_OTRO = { com:['Vuelos comerciales', 'Mexicanos repatriados desde EE. UU. en vuelos comerciales'], gh:['Guatemala y Honduras', 'Mexicanos que EE. UU. envió a Guatemala u Honduras y que México recibe por la frontera sur'] };
function montar(cont){
  const pend = 'Pendiente: el área revisa el archivo; se activa en cuanto llegue corregido';
  cont.innerHTML = '<div class="rg cv pm"><div class="rg-sub"><div><span class="mini">Procesos › DGPMV</span><h1>Protección al migrante</h1></div><div class="rg-vistas">'+
    '<button data-pvista="rep" class="'+(Q.vista==='rep'?'on':'')+'">Repatriados</button>'+['com','gh'].map(k => OTROS[k] ? '<button data-pvista="'+k+'" class="'+(Q.vista===k?'on':'')+'" title="'+esc(NOM_OTRO[k][1])+'">'+NOM_OTRO[k][0]+'</button>' : '<button disabled title="'+pend+'">'+NOM_OTRO[k][0]+' <small>sin archivo</small></button>').join('')+'</div></div>'+
    '<div class="ctl rg-ctl" id="cv-ctl"></div><div id="cv-body" class="rg-body anim"></div>'+
    '<p class="mini pm-fuente" style="padding:0 16px">Fuente: '+esc(CV.archivo)+' (DGPMV) · '+fechaA(0)+' – '+fechaA(CV.dias-1)+' · todos son de nacionalidad mexicana. «Aérea» corresponde a los vuelos PRIM.</p>'+
    (CV.calidad.length ? '<details class="cv-calw"><summary>Notas de calidad de los datos ('+CV.calidad.length+')</summary><ul>'+CV.calidad.map(x => '<li>'+esc(x)+'</li>').join('')+'</ul></details>' : '')+'</div>';
  setTimeout(() => { const b = $('cv-body'); if (b) b.classList.remove('anim'); }, 1100);
  cuerpo();
}
function eventos(cont){
  cont.addEventListener('click', e => { if (!e.target.closest('.pm')) return; const T = s => e.target.closest(s); let b;
    if ((b = T('[data-pinfo]'))){ const p = $('pm-pop'); if (p && !p.hidden && p.dataset.cual===b.dataset.pinfo) mostrarInfo(null); else { mostrarInfo(b); $('pm-pop').dataset.cual = b.dataset.pinfo; } return; }
    if ((b = T('[data-pvista]'))){ Q.vista = b.dataset.pvista; document.querySelectorAll('.pm [data-pvista]').forEach(x => x.classList.toggle('on', x===b)); cuerpo(); return; }
    if ((b = T('[data-pmod]'))){ const k = +b.dataset.pmod; if (k<0){ Q.mod = -1; Q.em = 'v'; } else Q.mod = Q.mod===k ? -1 : k; Q.sel = null; cuerpo(); return; }
    if ((b = T('[data-pem]'))){ const k = b.dataset.pem; Q.em = Q.em===k ? 'v' : k; Q.sel = null; cuerpo(); return; }
    if (T('[data-pmas]')){ Q.mas[Q.vista] = !Q.mas[Q.vista]; abrirMasC(); return; }
    if ((b = T('[data-pgran]'))){ Q.gran = b.dataset.pgran; Q.sel = null; cuerpo(); return; }
    if (T('[data-peti]')){ Q.eti = !Q.eti; cuerpo(); return; }
    if ((b = T('[data-pdesg]'))){ Q.desg = b.dataset.pdesg; pintarTr(); pintarTp(); return; }
    if (T('[data-psel]')){ Q.sel = null; pintarTp(); return; }
    if (T('[data-ppftodos]')){ Q.pfTodos = !Q.pfTodos; pintarPf(); return; }
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
// Recibe filtros desde Pregunta a INAMI («Profundizar en el tablero»)
function fijar(p){ const ix = (l, nombres) => (nombres || []).map(n => l.indexOf(n)).filter(i => i>=0); Q.vista = 'rep';
  Q.ests = ix(DIC.e, p.ests).slice(0,3); const pt = ix(DIC.p, p.ptos); Q.pto = pt.length===1 ? pt[0] : -1; Q.mod = p.mod!=null ? p.mod : -1; Q.em = p.em || 'v'; Q.sel = null; if (p.d0 && p.d1){ Q.per = 'pers'; Q.d0 = Math.max(0, diaDe(p.d0)); Q.d1 = Math.min(CV.dias, diaDe(p.d1)+1); if (Q.d1<=Q.d0) Q.d1 = Q.d0+1; } }
window.IANAMI_PROTECCION = { pintar(cont){ if (!listo){ eventos(cont); listo = true; } montar(cont); }, fijar:fijar };
})();
