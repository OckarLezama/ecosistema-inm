/* ==================================================================
   IA-NAMI · CONTROL Y VERIFICACIÓN MIGRATORIA (DGCVM)
   Vista de la Dirección General de Control y Verificación Migratoria,
   con tres pestañas: Internaciones (llegadas, segunda revisión y
   rechazos), Estaciones (presentados y retornos) y Canalizados (NNA y
   adultos que los acompañan). Todo se calcula en la página sobre
   datos/control.js. Usa los estilos de la vista de Regulación.
   ÍNDICE  [1] DATOS Y FILTROS   [2] UTILIDADES   [3] CONTROLES E INDICADORES
           [4] COMPONENTES COMUNES   [5] INTERNACIONES   [6] ESTACIONES
           [7] CANALIZADOS   [8] MONTAJE Y EVENTOS
   ================================================================== */
(function(){
'use strict';
const CV = window.IANAMI_CVM; if (!CV) return;

/* ==== [1] DATOS Y FILTROS ========================================= */
const tabla = o => { const t = {}; Object.keys(o).forEach(k => { t[k] = Int32Array.from(o[k]); }); t.N = t.d.length; return t; };
const ING = tabla(CV.ing), SEG = tabla(CV.seg), PRE = tabla(CV.pre), RET = tabla(CV.ret), NNA = tabla(CV.nna), ADU = tabla(CV.adu), ORR = tabla(CV.orr), REC = tabla(CV.rec);
// Solo algunas O.R. registran reincidentes; la reincidencia se mide únicamente donde se registra
const REI_OR = (() => { const x = new Float64Array(CV.dic.e.length); for (let i=0;i<ORR.d.length;i++) x[ORR.e[i]] += ORR.rei[i]; return new Set([...x.keys()].filter(e => x[e]>0)); })(), conRei = i => REI_OR.has(ORR.e[i]);
ORR.sd = ORR.v.map((x,i) => Math.max(0, x-ORR.pre[i]-ORR.can[i]));             // rescatados sin destino registrado
const DIC = CV.dic, NE = DIC.e.length, NN = DIC.n.length, NP = DIC.p.length, NS = DIC.s.length, MX = DIC.n.indexOf('México');
const INI = new Date(CV.inicio+'T00:00:00'), DS = (INI.getDay()+6)%7;
const semDe = d => Math.floor((d+DS)/7), semIni = w => w*7-DS, NSEM = semDe(CV.dias-1)+1;
const Q = { det:{}, vista:'int', per:'todo', d0:0, d1:CV.dias, cmp:30, nats:[], ests:[], pto:-1, via:-1, gran:'auto', eti:false, desgI:'tot', desgE:'tot', desgC:'tot', sel:null, tot:'n', sc:'n', rk:'r', em:'res', tote:'n', orTodo:false, reo:'n', mxm:'s', emo:'n', prm:'n', mas:{}, can:'nna', cls:-1, totc:'n', compacto:false };
// Vía de cada punto (la que más personas trae), para filtrar la segunda revisión por vía
const PV = (() => { const c = new Float64Array(NP*3); for (let i=0;i<ING.N;i++) c[ING.p[i]*3+ING.vi[i]] += ING.v[i]; return [...Array(NP).keys()].map(p => { const x = [c[p*3], c[p*3+1], c[p*3+2]]; return x.indexOf(Math.max(...x)); }); })();

// Suma de una tabla por una clave, con los filtros activos (periodo, nacionalidades, O.R. y punto)
function agg(T, key, nk, o){
  o = o || {}; const out = new Float64Array(nk), d0 = o.d0!=null ? o.d0 : Q.d0, d1 = o.d1!=null ? o.d1 : Q.d1, v = o.v ? T[o.v] : T.v;
  const ns = (o.nats!==undefined ? o.nats : Q.nats), es = (o.ests!==undefined ? o.ests : Q.ests), sn = ns && ns.length && T.n ? new Set(ns) : null, se = es && es.length && T.e ? new Set(es) : null;
  const pto = o.pto!==undefined ? o.pto : Q.pto, conP = pto>=0 && T.p, sinMx = T.n && (T===ING || T===SEG) && !o.soloMx, soloMx = o.soloMx && T.n, ex = o.ex;
  const via = o.via!==undefined ? o.via : Q.via, cls = o.cls!==undefined ? o.cls : Q.cls, conV = via>=0 && (T===ING || T===SEG), conC = cls>=0 && T===NNA;
  for (let i=0;i<T.N;i++){ const d = T.d[i]; if (d<d0 || d>=d1) continue;
    if (sinMx && T.n[i]===MX) continue; if (soloMx && T.n[i]!==MX) continue; if (sn && !sn.has(T.n[i])) continue; if (se && !se.has(T.e[i])) continue; if (conP && T.p[i]!==pto) continue; if (conV && (T===ING ? T.vi[i] : PV[T.p[i]])!==via) continue; if (conC && T.c[i]!==cls) continue; if (ex && !ex(i)) continue;
    out[key ? key(i) : 0] += v[i]; }
  return out;
}
const tot = (T, o) => agg(T, null, 1, o)[0];
const llegada = i => ING.vi[i]!==2;          // el % de rechazo se mide sobre llegadas por aire y tierra: los cruceros no pasan por la misma revisión
const VIAS = ['Aérea','Terrestre','Marítima (cruceros)'], COLV = ['#2F6657','#8F7F2E','#778E88'];
const rech = i => SEG.r[i]===1;

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
// Regla única (igual que el Pulso): año, mes y personalizado se comparan solos contra las mismas fechas del año anterior
// (personalizado sin año anterior: contra el tramo de igual duración justo antes); Sheinbaum y Trump, semana anterior, últimos 30 días o 3 meses.
const MESC = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const cmpFijo = () => Q.per==='anio' || Q.per==='pers';
function ventanaFija(){ const n = Q.d1-Q.d0, f = fDia(Q.d0), b = Math.round((new Date(f.getFullYear()-1, f.getMonth(), f.getDate()) - INI)/864e5);
  if (b>=0) return [[Q.d0, Q.d1], [b, b+n]]; if (Q.per==='pers' && Q.d0-n>=0) return [[Q.d0, Q.d1], [Q.d0-n, Q.d0]]; return null; }
function nomFijo(){ const w = ventanaFija(); if (!w) return ''; if (w[1][1]===w[0][0]) return 'los '+(Q.d1-Q.d0)+' días previos';
  return Q.per==='anio' ? (Q.mes ? MESC[Q.mes-1]+' '+(Q.anio-1) : String(Q.anio-1)) : 'mismas fechas de '+fDia(w[1][0]).getFullYear(); }
const txtCmp = () => cmpFijo() ? (nomFijo() ? 'contra '+nomFijo() : '') : Q.cmp==='sem' ? 'en la semana' : Q.cmp===90 ? 'en los últimos 3 meses' : 'en los últimos 30 días';
const OPC_CMP = [['sem','Semana anterior'],[30,'Últimos 30 días'],[90,'Últimos 3 meses']];
const cmpFijoHtml = () => '<span class="rg-sel rg-fijo">'+(nomFijo() ? 'Comparado con <b>'+nomFijo()+'</b>' : 'Sin periodo anterior con datos para comparar')+'</span>';
function ventanas(){ if (cmpFijo()) return ventanaFija(); if (['sem',30,90].indexOf(Q.cmp)<0) Q.cmp = 30; const N = Q.cmp;
  if (N==='sem'){ let w = semDe(Q.d1-1); if (semIni(w)+6 >= Q.d1) w--; const b = semIni(w); return b-7 >= Q.d0 ? [[b, b+7], [b-7, b]] : null; }
  return N==='aa' || 2*N > Q.d1-Q.d0 ? null : [[Q.d1-N, Q.d1], [Q.d1-2*N, Q.d1-N]]; }
const etqCmp = () => { const w = ventanas(); if (!w) return ''; return fecha(w[0][0])+' – '+fecha(w[0][1]-1)+' contra '+fecha(w[1][0])+' – '+fecha(w[1][1]-1); };
const iso = d => { const f = fDia(d); return f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0')+'-'+String(f.getDate()).padStart(2,'0'); };
// Grupo de tarjetas que se abre y cierra con un botón, igual que «Constancias y oficios» en Regulación migratoria
const masG = (tit, val, eti, col, cartas) => '<button class="rg-tog'+(Q.mas[Q.vista]?' on':'')+'" data-cmas aria-expanded="'+!!Q.mas[Q.vista]+'"><span>'+tit+'</span><b class="num">'+val+'</b><i>'+(Q.mas[Q.vista]?'‹':'›')+'</i></button>'+
  '<div class="kg rg-mas'+(Q.mas[Q.vista]?' abierto':'')+'" style="--g:'+col+'"><div class="eti">'+eti+'</div><div>'+cartas+'</div></div>';
function abrirMasC(){ const k = $('cv-kpis'), g = k && k.querySelector('.rg-mas'), t = k && k.querySelector('[data-cmas]'); if (!g) return; const on = !!Q.mas[Q.vista];
  g.classList.toggle('abierto', on); t.classList.toggle('on', on); t.setAttribute('aria-expanded', on); t.querySelector('i').textContent = on ? '‹' : '›';
  if (on){ k.classList.add('ancho'); const f = Date.now(), paso = () => { k.scrollLeft = k.scrollWidth; if (Date.now()-f < 650) requestAnimationFrame(paso); }; requestAnimationFrame(paso); } else { k.scrollLeft = 0; setTimeout(() => { if (!Q.mas[Q.vista]) k.classList.remove('ancho'); }, 620); } }
// «Ver detalle»: igual que en Regulación migratoria; arriba queda lo esencial y el resto se abre con un botón
const DET = { int:'totales, semana a semana y rechazos por punto', est:'totales y dónde se presenta cada nacionalidad', can:'nacionalidad, O.R. que canaliza y recibidos de EE. UU.' };
const detIni = () => { const on = !!Q.det[Q.vista]; return '<button class="rg-det-b cv-det-b'+(on?' on':'')+'" data-cdet aria-expanded="'+on+'">'+(on ? 'Ocultar detalle ▴' : 'Ver detalle: '+DET[Q.vista]+' ▾')+'</button><div class="cv-det"'+(on ? '' : ' hidden')+'>'; };
const plegar = () => '<button class="plegar" data-cplegar aria-label="'+(Q.compacto?'Mostrar tarjetas':'Compactar indicadores')+'" title="'+(Q.compacto?'Mostrar tarjetas':'Compactar indicadores')+'"><svg width="12" height="12" viewBox="0 0 12 12"><path d="'+(Q.compacto?'M2 4l4 4 4-4':'M2 8l4-4 4 4')+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
const chipD = (a,b) => { if (!b || a+b<40) return '<span class="kc-d">—</span>'; const dl = (a/b-1)*100; return '<span class="kc-d'+(Math.abs(dl)>=20?' f':'')+'">'+(cmpFijo() ? '' : '<span class="kc-l">'+({ sem:'Semana', 30:'30 días', 90:'3 meses' })[Q.cmp]+': '+(a>=1e6 ? (a/1e6).toFixed(2)+' M' : a>=1e4 ? (a/1e3).toFixed(1)+' k' : a>0 && a<5 ? 'menos de 5' : miles(a))+'</span> ')+(dl>=0?'▲ ':'▼ ')+Math.abs(dl).toFixed(1)+'%'+(cmpFijo() && nomFijo() ? '<span class="kc-l"> vs. '+nomFijo()+'</span>' : '')+'</span>'; };   // el % dice de qué es
const IC = { avion:'M2 16l20-6-20-6 3 6zM5 10h9', tierra:'M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6', barco:'M3 17l2 3h14l2-3zM12 3v11M6 14l6-7 6 7', lupa:'M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14zM20 20l-4-4',
             no:'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM6 6l12 12', tot:'M4 7h16M4 12h16M4 17h10', est:'M4 20V8l8-5 8 5v12zM9 20v-6h6v6', ret:'M20 12H5M11 6l-6 6 6 6', nino:'M12 4a2 2 0 1 0 0 4a2 2 0 0 0 0-4zM8 21v-7l-2-3 6-2 6 2-2 3v7', adulto:'M12 3a3 3 0 1 0 0 6a3 3 0 0 0 0-6zM6 21v-6a6 6 0 0 1 12 0v6' };
const svgI = d => '<span class="kc-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="'+d+'"/></svg></span>';
function minibarras(v){ const mx = Math.max.apply(null,v)||1; return '<span class="kc-b" aria-hidden="true">'+v.map((x,i) => '<i class="'+(i===v.length-1?'h':'p')+'" style="height:'+Math.max(8,x/mx*100).toFixed(0)+'%"></i>').join('')+'</span>'; }
function kc(o){ if (o.num!=null && o.val===corto(o.num)) o.val = cifraKpi(o.num); const tag = o.attr ? 'button' : 'div';
  return '<'+tag+' class="kc'+(o.on?' on':'')+'"'+(o.attr||'')+' style="--g:'+o.col+';--gs:'+o.col+'1F;--ga:'+o.col+'"'+(o.title ? ' title="'+esc(o.title)+'"' : '')+'>'+
    '<span class="kc-top">'+svgI(o.ic)+'<span class="kc-nf"><span class="kc-n">'+o.nom+'</span><span class="kc-f">'+(o.sub||'')+'</span></span></span>'+
    '<span class="kc-v num"'+(o.num!=null ? ' data-v="'+Math.round(o.num)+'"' : '')+'>'+o.val+'</span><span class="kc-pie">'+(o.d||'<span class="kc-d"></span>')+(o.b||'')+'</span></'+tag+'>'; }
const info = k => '<button class="rg-i" data-cinfo="'+k+'" aria-label="Qué muestra esta sección">i</button>';
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
const filtrosTxt = () => Q.nats.map(nomN).concat(Q.ests.map(nomE), Q.pto>=0 ? [nomP(Q.pto)] : []);
// «Año»: como en Pulso, se elige el año y, si se quiere, un mes; los meses sin datos quedan deshabilitados
const pad2 = n => String(n).padStart(2,'0');
function fijarAnio(){ const y = Q.anio, m = Q.mes || 0, a = diaDe(y+'-'+pad2(m || 1)+'-01'), b = m ? diaDe((m===12 ? (y+1)+'-01' : y+'-'+pad2(m+1))+'-01') : diaDe((y+1)+'-01-01');
  Q.d0 = Math.max(0, a); Q.d1 = Math.min(CV.dias, b); if (Q.d1<=Q.d0) Q.d1 = Q.d0+1; }
function selAnio(){ const y0 = fDia(0).getFullYear(), y1 = fDia(CV.dias-1).getFullYear(), an = []; for (let y=y0; y<=y1; y++) an.push(y);
  return '<span class="per-extra"><select id="cv-anio" aria-label="Año">'+an.map(y => '<option'+(y===Q.anio ? ' selected' : '')+'>'+y+'</option>').join('')+'</select>'+
    '<select id="cv-mes" aria-label="Mes"><option value="0">Todo el año</option>'+MES.map((m,i) => { const ini = diaDe(Q.anio+'-'+pad2(i+1)+'-01'), fin = diaDe((i===11 ? (Q.anio+1)+'-01' : Q.anio+'-'+pad2(i+2))+'-01'), ok = ini<CV.dias && fin>0;
      return '<option value="'+(i+1)+'"'+((Q.mes || 0)===i+1 ? ' selected' : '')+(ok ? '' : ' disabled')+'>'+m+'</option>'; }).join('')+'</select></span>'; }
function htmlCtl(){
  const okN = n => n==='sem' ? (() => { const q = Q.cmp; Q.cmp = 'sem'; const w = ventanas(); Q.cmp = q; return !!w; })() : n!=='aa' && 2*n <= Q.d1-Q.d0;
  return '<div class="pil">'+[['todo','Sheinbaum'],['trump','Trump'],['anio','Año'],['pers','Personalizado']].map(x => '<button data-cper="'+x[0]+'" class="'+(Q.per===x[0]?'on':'')+'">'+x[1]+'</button>').join('')+'</div>'+
    (Q.per==='anio' ? selAnio() : '')+
    (Q.per==='pers' ? '<span class="per-extra"><input type="date" id="cv-d0" value="'+iso(Q.d0)+'" min="'+iso(0)+'" max="'+iso(CV.dias-1)+'"> – <input type="date" id="cv-d1" value="'+iso(Q.d1-1)+'" min="'+iso(0)+'" max="'+iso(CV.dias-1)+'"></span>' : '')+
    '<div class="rango"><b>'+fechaA(Q.d0)+' – '+fechaA(Q.d1-1)+'</b><span>'+(Q.d1-Q.d0)+' días</span></div>'+
    (cmpFijo() ? cmpFijoHtml() : '<label class="rg-sel">Comparar con <select id="cv-cmp">'+OPC_CMP.map(x => '<option value="'+x[0]+'"'+(String(Q.cmp)===String(x[0])?' selected':'')+(okN(x[0])?'':' disabled')+'>'+x[1]+'</option>').join('')+'</select></label>')+
    '<span class="rg-cmp-n">'+etqCmp()+'</span>'+
    '<div class="busca rg-busca"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="cv-bus" type="search" autocomplete="off" placeholder="Buscar nacionalidad, O.R. o punto" aria-label="Buscar nacionalidad, O.R. o punto de internación"><div class="res" id="cv-bus-r" hidden></div></div>'+
    '<span class="rg-chips">'+Q.nats.map((n,j) => '<span class="tag-f" style="background:'+COMP[j]+'">'+esc(nomN(n))+' <button data-cquita="n'+n+'" aria-label="Quitar">×</button></span>').join('')+
    Q.ests.map(e => '<span class="tag-f" style="background:'+OCRE+'">'+esc(nomE(e))+' <button data-cquita="e'+e+'" aria-label="Quitar">×</button></span>').join('')+
    (Q.via>=0 && Q.vista==='int' ? '<span class="tag-f" style="background:'+COLV[Q.via]+'">Vía '+esc(VIAS[Q.via].toLowerCase())+' <button data-cquita="v" aria-label="Quitar">×</button></span>' : '')+
    (Q.pto>=0 ? '<span class="tag-f" style="background:'+VERDE+'"'+(Q.vista!=='int' ? ' title="El punto solo aplica a Internaciones"' : '')+'>'+esc(nomP(Q.pto))+(Q.vista!=='int' ? ' <small>(solo Internaciones)</small>' : '')+' <button data-cquita="p" aria-label="Quitar">×</button></span>' : '')+'</span>';
}
function buscador(){
  const items = DIC.n.map((n,i) => ({n:n, t:'Nacionalidad', v:{t:'n', i:i}})).filter(x => x.v.i!==MX)
    .concat(DIC.e.map((e,i) => ({n:e, t:'O.R.', v:{t:'e', i:i}})), DIC.p.map((p,i) => ({n:p, t:'Punto de internación', v:{t:'p', i:i}})));
  autocompletar($('cv-bus'), $('cv-bus-r'), items, x => { agregar(x.v.t, x.v.i); });
}
function agregar(t, i){
  if (t==='n'){ if (Q.nats.indexOf(i)<0){ if (Q.nats.length>=3) Q.nats.shift(); Q.nats.push(i); } }
  else if (t==='e'){ if (Q.ests.indexOf(i)<0){ if (Q.ests.length>=3) Q.ests.shift(); Q.ests.push(i); } }
  else Q.pto = Q.pto===i ? -1 : i;
  cuerpo();
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
    : c.apila ? c.apila.map(a => ({ name:a.name, col:a.col, x:agg(D.T, D.key, D.nk, Object.assign({}, base, {ex:a.ex})) })) : [{ name:'', x:agg(D.T, D.key, D.nk, base) }];
  const suma = k => series.reduce((t,s) => t+s.x[k], 0), T = [...Array(D.nk).keys()].reduce((t,k) => t+suma(k), 0), caja = $(c.ch).closest('.caja');
  if (!T){ caja.hidden = true; return; } caja.hidden = false;
  let cats = [...Array(D.nk).keys()].filter(k => suma(k)>0).sort((a,b) => suma(b)-suma(a)); const nTot = cats.length, tope = grp ? 15 : (c.tope || 30);
  let otras = null; if (cats.length>tope){ const r = cats.slice(tope).filter(k => sel.indexOf(k)<0); otras = { n:r.length, v:series.map(s => r.reduce((t,k) => t+s.x[k], 0)) }; cats = cats.slice(0, tope).concat(cats.slice(tope).filter(k => sel.indexOf(k)>=0)); }
  const l = cats.map(k => { const o = { lab:D.corto ? D.corto(k) : D.nom(k), full:D.nom(k), on:!grp && sel.indexOf(k)>=0, k:k }; series.forEach((s,j) => { o['s'+j] = s.x[k]; }); return o; });
  if (otras){ const o = { lab:'Otras ('+otras.n+')', full:'Otras '+otras.n, k:-1, col:'#C9C4B5' }; series.forEach((s,j) => { o['s'+j] = otras.v[j]; }); l.push(o); }
  $(c.pil).innerHTML = (c.ops.length ? '<div class="pil chica">'+c.ops.map(x => '<button '+c.attr+'="'+x[0]+'" class="'+(X===x[0]?'on':'')+'">'+x[1]+'</button>').join('')+'</div>' : '')+(grp ? '<button class="rg-ib'+(Q.eti?' on':'')+'" data-ceti title="'+(Q.eti?'Ocultar':'Mostrar')+' el valor de cada parte">123</button>' : '');
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
  if (c.ley) $(c.ley).innerHTML = solo ? '<span><i class="ln" style="background:#2F6657"></i>'+esc(c.total.nom.toLowerCase())+'</span>'+(c.extra || []).map(x => '<span><i class="ln" style="background:repeating-linear-gradient(90deg,'+x.col+' 0 4px,transparent 4px 7px)"></i>'+esc(x.nom)+'</span>').join('')+'<span><i class="bd"></i>rango habitual</span>'+(temps.length ? '<span><i class="tp"></i>temporada vacacional</span>' : '')+(C.l.some(x => x.inc) ? '<span><i class="ic"></i>periodo incompleto</span>' : '')
    : c.barras ? (temps.length ? '<span><i class="tp"></i>temporada vacacional</span>' : '')+(C.l.some(x => x.inc) ? '<span><i class="ic"></i>periodo incompleto (tono claro)</span>' : '') : '<span class="rg-cmp">'+c.nota(c.desg)+' Toca un nombre de la leyenda para ocultarlo o mostrarlo.</span>';
  $(c.ctl).innerHTML = (c.ops ? '<span>Ver</span>'+pil(c.attr, c.desg, c.ops) : '<span></span>')+pil('data-cgran', Q.gran, [['auto','Auto'],['d','Día'],['s','Semana'],['m','Mes']])+
    '<button class="rg-ib'+(Q.eti?' on':'')+'" data-ceti title="'+(Q.eti?'Ocultar':'Mostrar')+' valores en la gráfica">123</button>';
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
    (r ? ' · <button class="cv-lnk" data-csel>ver todo el periodo</button>' : ' · toca un punto de la gráfica para ver ese día, semana o mes');
  if (!T){ $(c.body).innerHTML = '<p class="mini">Sin registros con estos filtros.</p>'; return; }
  $(c.body).innerHTML = (c.pre ? c.pre(o, ant) : '')+c.secciones.map(s => { const x = agg(s.T, s.key, s.nk, Object.assign({}, s.quita, o)), xa = ant ? agg(s.T, s.key, s.nk, Object.assign({}, s.quita, ant)) : null;
    // el % se calcula sobre el total de la propia lista: si la sección quita un filtro (p. ej. nacionalidad), su base también lo quita
    let base = 0; for (let k=0;k<x.length;k++) if (k!==s.sin) base += x[k];
    return '<h4>'+s.tit+(ant ? '<small>cambio contra el anterior</small>' : '')+'</h4>'+listaD(top(x, s.n || 6, s.sin).map(y => [y[0], y[1], s.nom(y[0]), xa ? y[1]-xa[y[0]] : null]), base || T, s.col || '#2B2926', s.attr, s.sel); }).join('');
}

/* ==== [5] INTERNACIONES =========================================== */
// Por nacionalidad o por punto: internados (aire y tierra), casos en segunda revisión y rechazados. «Llegaron» = internados + rechazados
function tablaRech(dim){
  const key = dim==='n' ? (T => i => T.n[i]) : (T => i => T.p[i]), nk = dim==='n' ? NN : NP, o = dim==='n' ? {nats:null} : {pto:-1};
  const l = agg(ING, key(ING), nk, Object.assign({ ex:llegada }, o)), r = agg(SEG, key(SEG), nk, Object.assign({ ex:rech }, o)), s = agg(SEG, key(SEG), nk, o);
  const out = []; for (let k=0;k<nk;k++) if ((l[k] || r[k]) && k!==(dim==='n' ? MX : -1)) out.push({ k:k, l:l[k], r:r[k], s:s[k], ll:l[k]+r[k], t:tasa(r[k], l[k]) }); return out;
}
// Total del país = extranjeros (lo que mide Control) + mexicanos que regresan; con el periodo y filtros elegidos (no aplica al elegir nacionalidad)
function totalPais(){ if (Q.nats.length) return ''; const ext = tot(ING, {}), mx = tot(ING, { soloMx:true }), T = ext+mx; if (!T) return '';
  return '<p class="cv-totpais"><span>Ingresaron al país <b>'+cifraKpi(T)+'</b> = extranjeros <b>'+cifraKpi(ext)+'</b> ('+(ext/T*100).toFixed(1)+'%) + mexicanos que regresan <b>'+cifraKpi(mx)+'</b> ('+(mx/T*100).toFixed(1)+'%)</span>'+
    '<i class="cv-tpb" aria-hidden="true"><i style="width:'+(ext/T*100).toFixed(1)+'%"></i></i><span class="mini">Las tarjetas y gráficas de esta sección cuentan solo extranjeros.</span></p>'; }
function pintarInt(){
  const b = $('cv-body'), w = ventanas(), crucero = Q.via===2;
  const L = tot(ING, {ex:llegada}), R = tot(SEG, {ex:rech}), base = tasa(R, L);
  const tv = (k, nom, sub, ic) => tarjeta(nom, sub, ic, k<0 ? '#2B2926' : COLV[k], ING, {via:k}, ' data-cvia="'+k+'" aria-pressed="'+(Q.via===k)+'"', null, Q.via===k);
  b.innerHTML = '<section class="kpis rg-kpis" id="cv-kpis" data-modo="'+(Q.compacto?'compacto':'tarjetas')+'">'+
      '<div class="kg" style="flex:4 1 0;--g:#2B2926"><div class="eti">Internaciones de extranjeros · toca una vía para filtrar</div><div>'+
        tv(-1, 'Todas las vías', 'internaciones', IC.tot)+tv(0, 'Aérea', '', IC.avion)+tv(1, 'Terrestre', '', IC.tierra)+tv(2, 'Marítima', 'pasajeros de crucero', IC.barco)+'</div></div>'+
      '<div class="kg g-irr" style="flex:3 1 0;--g:'+ROJO+'"><div class="eti">Segunda revisión · aire y tierra</div><div>'+
        tarjeta('Casos', 'en segunda revisión', IC.lupa, OCRE, SEG, {})+tarjeta('Rechazos', 'no se internaron', IC.no, ROJO, SEG, {ex:rech})+
        kc({ nom:'% rechazado', sub:'de quienes llegan', ic:IC.no, col:VINO, val:crucero ? '—' : tasaTxt(base), d: crucero ? '<span class="kc-d">no aplica a cruceros</span>' : w ? chipD(tasa(tot(SEG, {ex:rech, d0:w[0][0], d1:w[0][1]}), tot(ING, {ex:llegada, d0:w[0][0], d1:w[0][1]}))*1e3, tasa(tot(SEG, {ex:rech, d0:w[1][0], d1:w[1][1]}), tot(ING, {ex:llegada, d0:w[1][0], d1:w[1][1]}))*1e3) : '' })+'</div></div>'+plegar()+'</section>'+
    totalPais()+'<div class="rg-hz" id="cv-hz"></div>'+
    '<div class="rg-g rg-g21 fila-par">'+cajaTend('cv-tr', 'tr')+'<div class="caja"><h2><span id="cv-tp-t"></span>'+info('tp')+'</h2><span class="q" id="cv-tp-q"></span><div id="cv-tp"></div></div></div>'+
    (crucero ? '<p class="cv-cal" style="background:var(--panel2);color:var(--ink2)">Los pasajeros de crucero no pasan por segunda revisión. Quita el filtro de vía marítima para ver los rechazos.</p>' :
    '<div class="rg-g rg-g21"><div class="caja"><h2><span>¿Dónde y a quién se rechaza?</span>'+info('disp')+pil('data-csc', Q.sc, [['n','Nacionalidades'],['p','Puntos']])+'</h2><span class="q" id="cv-disp-q"></span><div id="cv-disp" class="cv-fill" style="min-height:440px"></div></div>'+
      '<div class="caja"><h2><span id="cv-emb-t"></span>'+info('emb')+'<span class="cv-h2r" id="cv-emb-o"></span></h2><span class="q" id="cv-emb-q"></span><div id="cv-emb"></div></div></div>')+
    detIni()+
    '<div class="caja rg-ancho cv-ancho"><h2><span>Totales de internaciones</span>'+info('tot')+'<span class="cv-h2r cv-h2b" id="cv-tt-sel"></span></h2><span class="q" id="cv-tt-q"></span><div class="cv-scroll cv-fill"><div id="cv-tt"></div></div></div>'+
    (crucero ? '' : '<div class="rg-g rg-g2">'+cajaTend('cv-sem', 'sem')+
      '<div class="caja"><h2><span>Rechazos por punto</span>'+info('pto')+pil('data-crk', Q.rk, [['r','Rechazos'],['t','De cada 1,000']])+'</h2><span class="q" id="cv-pto-q"></span><div class="cv-scroll cv-fill"><div id="cv-pto"></div></div></div></div>')+'</div>';
  const tn = crucero ? [] : tablaRech('n'), tp = crucero ? [] : tablaRech('p'), prom = tasa(tot(SEG, {ex:rech, nats:null, pto:-1, via:-1}), tot(ING, {ex:llegada, nats:null, pto:-1, via:-1})), hz = [];
  if (w){ const a = agg(ING, i => ING.n[i], NN, {nats:null, d0:w[0][0], d1:w[0][1]}), c0 = agg(ING, i => ING.n[i], NN, {nats:null, d0:w[1][0], d1:w[1][1]}), cuenta = k => k!==MX && (!Q.nats.length || Q.nats.indexOf(k)>=0);   // sin mexicanos, igual que las tarjetas; con nacionalidades elegidas, solo ellas
    let ta = 0, tc = 0; for (let k=0;k<NN;k++) if (cuenta(k)){ ta += a[k]; tc += c0[k]; }
    let m = -1, dm = 0; if (Q.nats.length<2) for (let k=0;k<NN;k++){ const dl = a[k]-c0[k]; if (k!==MX && !Q.nats.length && Math.abs(dl)>Math.abs(dm)){ dm = dl; m = k; } }
    if (tc) hz.push({ cl:ta>=tc ? 'u' : 'd', ic:ta>=tc ? '▲' : '▼', h:'Internaciones '+(ta>=tc ? 'suben ' : 'bajan ')+Math.abs((ta/tc-1)*100).toFixed(1)+'% '+txtCmp()+(Q.via>=0 ? ' por vía '+VIAS[Q.via].toLowerCase() : ''), t:corto(tc)+' → '+corto(ta)+(m>=0 ? ' · lo que más cambió: '+esc(nomN(m))+' ('+(dm>0 ? '+' : '')+corto(dm)+') · filtrar ›' : ''), act:m>=0 ? ' data-cn="'+m+'"' : '' }); }
  const pt = tp.filter(x => x.r>=100).sort((a,b) => b.t-a.t)[0]; if (pt && prom) hz.push({ cl:'al', ic:'!', h:esc(nomP(pt.k))+' rechaza a '+deCada(pt.t)+' que llegan', t:'el promedio nacional es '+deCada(prom)+' · '+miles(pt.r)+' rechazos · ver solo este punto ›', act:' data-cpt="'+pt.k+'"' });
  const nt = tn.slice().sort((a,b) => b.r-a.r)[0], Rn = tn.reduce((t,x) => t+x.r, 0); if (nt && Rn) hz.push({ cl:'d', ic:'%', h:esc(nomN(nt.k))+' concentra '+pct(nt.r, Rn)+'% de los rechazos', t:'se rechaza a '+deCada(nt.t)+' que llegan · '+miles(nt.r)+' de '+miles(Rn)+' · filtrar por ella ›', act:' data-cn="'+nt.k+'"' });
  $('cv-hz').innerHTML = hz.map(titular).join('')+info('hz');
  pintarTr(); pintarTp();
  totales({ ch:'cv-tt', q:'cv-tt-q', pil:'cv-tt-sel', attr:'data-ctot', val:Q.tot, unidad:'internaciones', ops:[['n','Por nacionalidad'],['e','Por O.R.'],['p','Por punto']],
    dim:{ n:{ T:ING, key:i => ING.n[i], nk:NN, nom:nomN, quita:{nats:null}, sel:Q.nats },
          p:{ T:ING, key:i => ING.p[i], nk:NP, nom:nomP, corto:k => nomP(k).replace(/^Aerop\. /,''), quita:{pto:-1}, sel:Q.pto>=0 ? [Q.pto] : [] },
          e:{ T:ING, key:i => ING.e[i], nk:NE, nom:nomE, corto:k => abr(nomE(k)), quita:{ests:null}, sel:Q.ests } },
    elegir:k => { if (Q.tot==='n') alternar(Q.nats, k); else if (Q.tot==='p') Q.pto = Q.pto===k ? -1 : k; else alternar(Q.ests, k); cuerpo(); } });
  if (!crucero){ pintarDisp(tn, tp, prom); pintarEmb(tn, tp, prom); pintarSem(); pintarPto(tp, prom); }
}
function pintarTr(){
  qTend('cv-tr');
  const lin = k => k==='via' ? VIAS.map((v,j) => ({ nom:v, col:COLV[j], T:ING, o:{via:j}, j:j })).filter(x => Q.via<0 || Q.via===x.j)
    : k==='nat' ? (Q.nats.length ? Q.nats : topK(ING, i => ING.n[i], NN, {nats:null}, 5, MX)).map((n,j) => ({ nom:nomN(n), col:Q.nats.length ? COMP[j] : PAL5[j], T:ING, o:{nats:[n]} }))
    : (Q.ests.length ? Q.ests : topK(ING, i => ING.e[i], NE, {ests:null}, 5)).map((e,j) => ({ nom:nomE(e), col:Q.ests.length ? COMP[j] : PAL5[j], T:ING, o:{ests:[e]} }));
  tendencia({ id:'cv-tr', ctl:'cv-tr-c', ley:'cv-tr-l', titulo:['cv-tr-t', k => 'Internaciones'+{tot:'', via:' por vía', nat:' por nacionalidad', or:' por O.R.'}[k]], desg:Q.desgI, attr:'data-cdesgi',
    ops:[['tot','Total'],['via','Por vía'],['nat','Por nacionalidad'],['or','Por O.R.']], total:{ nom:'Internaciones', T:ING, o:{} }, lineas:lin,
    nota:k => ({ via:'Las tres vías.', nat:Q.nats.length ? 'Las nacionalidades que elegiste.' : 'Las 5 nacionalidades con más internaciones.', or:Q.ests.length ? 'Las O.R. que elegiste.' : 'Las 5 O.R. con más internaciones.' }[k]),
    clic:cub => { Q.sel = [cub.a, cub.b]; pintarTp(); } });
}
// Panel «¿Quién entra?»: primero la vía; después las listas en el orden de lo que muestra la gráfica (Ver)
function pintarTp(){
  const viaBar = o => { const v = agg(ING, i => ING.vi[i], 3, Object.assign({via:-1}, o)), TV = v[0]+v[1]+v[2] || 1, nom = ['Aérea','Terrestre','Marítima'];
    return '<h4>Por vía</h4><div class="cv-vb">'+[0,1,2].map(k => v[k] ? '<button data-cvia="'+k+'" class="'+(Q.via===k ? 'on' : '')+'" style="width:'+(v[k]/TV*100).toFixed(2)+'%;background:'+COLV[k]+'" title="'+VIAS[k]+': '+miles(v[k])+' personas ('+pct(v[k],TV)+'%)">'+(v[k]/TV>=.18 ? pct(v[k],TV)+'% · '+corto(v[k]) : v[k]/TV>=.07 ? Math.round(v[k]/TV*100)+'%' : '')+'</button>' : '').join('')+'</div>'+
      '<div class="cv-vl">'+[0,1,2].map(k => '<button data-cvia="'+k+'" class="'+(Q.via===k ? 'on' : '')+'" title="'+VIAS[k]+': '+miles(v[k])+'"><i class="sw" style="background:'+COLV[k]+'"></i>'+nom[k]+' <b>'+pct(v[k],TV)+'%</b> <small>'+corto(v[k])+'</small></button>').join('')+'</div>'; };
  const S = { nat:{ tit:'Nacionalidades', T:ING, key:i => ING.n[i], nk:NN, nom:nomN, attr:'data-cn', quita:{nats:null}, sel:Q.nats, n:10, sin:MX },
              or:{ tit:'Estados (O.R.)', T:ING, key:i => ING.e[i], nk:NE, nom:nomE, attr:'data-ce', quita:{ests:null}, sel:Q.ests, n:6 },
              pto:{ tit:'Puntos de internación', T:ING, key:i => ING.p[i], nk:NP, nom:nomP, attr:'data-cpt', quita:{pto:-1}, sel:Q.pto>=0 ? [Q.pto] : [], n:6 } };
  const orden = Q.desgI==='or' ? ['or','nat','pto'] : ['nat','or','pto'], col = Q.via>=0 ? COLV[Q.via] : '#2B2926';
  panelP({ t:'cv-tp-t', q:'cv-tp-q', body:'cv-tp', titulo:'¿Quién entra?', unidad:'internaciones'+(Q.via>=0 ? ' por vía '+VIAS[Q.via].toLowerCase() : ''), o:{}, total:o => tot(ING, o), pre:viaBar, secciones:orden.map(k => Object.assign({ col:col }, S[k])) });
  // Con nacionalidades elegidas: abrir Pulso filtrado por la primera (mapa grande, flujos y perfil)
  const P = window.IANAMI_PULSO, n0 = Q.nats.find(n => P && P.tiene(DIC.n[n]));
  if (n0!=null) $('cv-tp').insertAdjacentHTML('beforeend', '<button class="rg-vert cv-apulso" data-cpulso="'+n0+'">Ver '+esc(DIC.n[n0])+' en el mapa de Pulso ›</button>');
}
// Dispersión: personas que llegaron (escala logarítmica) contra % rechazado; el tamaño es el número de rechazos
function pintarDisp(tn, tp, base){
  const dimN = Q.sc==='n', l = (dimN ? tn : tp).filter(x => x.r>=10 && x.l>0), sel = dimN ? Q.nats : (Q.pto>=0 ? [Q.pto] : []), nom = dimN ? nomN : nomP;
  const mxR = Math.max(1, ...l.map(x => x.r)), tops = l.slice().sort((a,b) => b.r-a.r).slice(0, 9).map(x => x.k);
  $('cv-disp-q').innerHTML = '<b>Solo llegadas por aire y tierra</b> · '+(dimN ? 'Cada círculo es una nacionalidad' : 'Cada círculo es un punto de internación')+' con 10 rechazos o más · tamaño = número de rechazos · línea punteada = promedio nacional ('+deCada(base)+') · <b>arriba a la derecha: muchas llegadas y alto rechazo</b> · toca uno para filtrar';
  const ch = graf('cv-disp', { grid:{ left:56, right:24, top:34, bottom:46 },
    tooltip:{ formatter:p => { const x = l[p.dataIndex]; return '<b>'+esc(nom(x.k))+'</b><br>Llegaron <b>'+miles(x.ll)+'</b> personas: '+miles(x.l)+' se internaron y '+miles(x.r)+' fueron rechazadas<br>'+
      miles(x.s)+' pasaron a segunda revisión'+(x.s ? ' (de ellas, '+pct(x.r, x.s)+'% rechazadas)' : '')+'<br><b>Se rechaza a '+deCada(x.t)+'</b> · promedio nacional: '+deCada(base); } },
    xAxis:{ type:'log', name:'personas que llegaron en el periodo (internadas + rechazadas)', nameLocation:'middle', nameGap:28, nameTextStyle:{ color:'#5C5952', fontSize:11 }, axisLabel:{ color:'#5C5952', fontSize:10.5, formatter:v => corto(v) }, splitLine:{ lineStyle:{ color:'#EEEBE2' } }, axisLine:{lineStyle:{color:'#C9C4B5'}} },
    yAxis:{ type:'log', name:'% rechazado', nameTextStyle:{ color:'#5C5952', fontSize:11, align:'left' }, axisLabel:{ color:'#5C5952', fontSize:10.5, formatter:v => (v>=1 ? v : v.toPrecision(1))+'%' }, splitLine:{ lineStyle:{ color:'#EEEBE2' } }, axisLine:{lineStyle:{color:'#C9C4B5'}} },
    series:[{ type:'scatter', labelLayout:{ hideOverlap:true }, data:l.map(x => ({ value:[x.ll, Math.max(x.t, 0.001)], symbolSize:8+Math.sqrt(x.r/mxR)*46,
        itemStyle:{ color: sel.length ? (sel.indexOf(x.k)>=0 ? (dimN ? COMP[sel.indexOf(x.k)] : VINO) : 'rgba(154,149,138,.35)') : (x.t>base ? 'rgba(196,96,90,.72)' : 'rgba(47,102,87,.55)'), borderColor:'#fff', borderWidth:1 },
        label:{ show: sel.length ? sel.indexOf(x.k)>=0 : tops.indexOf(x.k)>=0, formatter:() => nom(x.k).replace(/^Aerop\. /,''), position:'right', fontSize:11, color:'#2B2926', fontWeight: sel.indexOf(x.k)>=0 ? 700 : 500 } })),
      emphasis:{ scale:1.12, itemStyle:{ borderColor:'#2B2926', borderWidth:2 } },
      markLine:{ silent:true, symbol:'none', lineStyle:{ color:'#2B2926', type:'dashed', width:1 }, label:{ formatter:'promedio nacional '+tasaTxt(base), color:'#5C5952', fontSize:10.5, position:'insideEndTop' }, data:[{ yAxis:Math.max(base, 0.001) }] } }] });
  ch.off('click'); ch.on('click', p => { const x = l[p.dataIndex]; if (!x) return; if (dimN) alternar(Q.nats, x.k); else Q.pto = Q.pto===x.k ? -1 : x.k; cuerpo(); });
}
// «De cada 1,000 que llegan»: en palabras, cuántos pasan a revisión y cuántos se rechazan, contra el promedio nacional.
// Con una nacionalidad elegida, su ficha; con 2 o 3, el perfil comparado
function pintarEmb(tn, tp, base){
  $('cv-emb-o').innerHTML = ''; if (Q.nats.length>=2){ pintarRadarN(); return; }
  const f = v => v>=10 ? Math.round(v) : v.toFixed(1), veces = t => base ? (t/base>=1.5 ? Math.round(t/base)+' veces el promedio' : t/base<=0.67 ? 'abajo del promedio' : 'cerca del promedio') : '';
  $('cv-emb-t').textContent = Q.nats.length ? 'Ficha de '+nomN(Q.nats[0]) : 'De cada 1,000 que llegan';
  if (Q.nats.length===1){ const x = tn.find(y => y.k===Q.nats[0]);
    if (!x || !x.ll){ $('cv-emb-q').textContent = ''; $('cv-emb').innerHTML = '<p class="mini">Sin llegadas por aire o tierra con estos filtros.</p>'; return; }
    const rank = tn.filter(y => y.r>=100).sort((a,b) => b.t-a.t).findIndex(y => y.k===x.k)+1, pr = agg(SEG, i => SEG.p[i], NP, {ex:rech, pto:-1}), pl = agg(ING, i => ING.p[i], NP, {ex:llegada, pto:-1});
    const pts = top(pr, 4).map(y => [y[0], y[1], tasa(y[1], pl[y[0]])]);
    $('cv-emb-q').innerHTML = 'llegaron '+miles(x.ll)+' personas de '+esc(nomN(x.k))+' por aire y tierra en el periodo';
    $('cv-emb').innerHTML = '<div class="cv-fic"><p class="cv-fic-h">De cada <b>1,000</b> que llegan, <b class="o">'+f(x.s/x.ll*1000)+'</b> pasan a segunda revisión y <b class="r">'+f(x.r/x.ll*1000)+'</b> son rechazados.</p>'+
      '<p>El promedio de todas las nacionalidades es <b>'+f(base*10)+'</b> rechazados de cada 1,000: '+'su tasa de rechazo está <b>'+veces(x.t)+'</b>.'+(rank ? ' Es la <b>'+rank+'.ª</b> nacionalidad con mayor % de rechazo (entre las que tienen 100 rechazos o más).' : '')+'</p>'+
      '<p>De quienes pasan a segunda revisión, se rechaza al <b>'+pct(x.r, x.s)+'%</b>.</p></div>'+
      '<h4>Dónde se les rechaza más</h4>'+pts.map(y => '<button class="barra pc" data-cpt="'+y[0]+'"><span>'+esc(nomP(y[0]))+' <small>'+deCada(y[2])+'</small></span><span class="b"><i style="width:'+(y[1]/(pts[0][1]||1)*100).toFixed(1)+'%;background:'+ROJO+'"></i></span><span class="x">'+miles(y[1])+'</span></button>').join(''); return; }
  const l = tn.filter(x => x.r>=100).sort((a,b) => Q.emo==='p' ? b.t-a.t : b.r-a.r).slice(0, 9), mx = Math.max(1, ...l.map(x => x.s/x.ll*1000));
  $('cv-emb-o').innerHTML = pil('data-cemo', Q.emo, [['n','Más rechazos'],['p','Mayor proporción']]);
  $('cv-emb-q').innerHTML = (Q.emo==='p' ? 'las 9 con mayor proporción de rechazo' : 'las 9 con más rechazos')+' (100 rechazos o más) · <i class="sw" style="background:#D9D2B4"></i>pasan a segunda revisión <i class="sw" style="background:'+ROJO+'"></i>son rechazados · toca una para ver su ficha';
  $('cv-emb').innerHTML = '<div class="cv-emb h"><span></span><span></span><span>'+(Q.emo==='p' ? 'rechazados de cada 1,000' : 'rechazos')+'</span></div>'+l.map(x => { const s = x.s/x.ll*1000, r = x.r/x.ll*1000;
    return '<button class="cv-emb" data-cn="'+x.k+'" title="'+esc(nomN(x.k))+': de cada 1,000 que llegan, '+f(s)+' pasan a revisión y '+f(r)+' son rechazados"><span class="cv-emb-n">'+esc(nomN(x.k))+'<small>llegaron '+corto(x.ll)+'</small></span>'+
      '<span class="cv-emb-b"><i class="s" style="width:'+(s/mx*100).toFixed(1)+'%"></i><i class="r" style="width:'+(r/mx*100).toFixed(1)+'%"></i></span>'+
      '<span class="cv-emb-v">'+(Q.emo==='p' ? '<b>'+f(r)+'</b><small>'+veces(x.t)+' · '+corto(x.r)+' rechazos</small>' : '<b>'+miles(x.r)+'</b><small>'+f(r)+' de cada 1,000 · '+veces(x.t)+'</small>')+'</span></button>'; }).join('')+
    '<p class="rg-base">Promedio de todas las nacionalidades: <b>'+f(base*10)+'</b> rechazados de cada 1,000 que llegan.</p>';
}
// Comparación de 2 o 3 nacionalidades, en la misma medida que «De cada 1,000 que llegan», lado a lado
function pintarRadarN(){
  const base = tasa(tot(SEG, {ex:rech, nats:null, pto:-1, via:-1}), tot(ING, {ex:llegada, nats:null, pto:-1, via:-1})), f = v => v>=10 ? Math.round(v) : v.toFixed(1);
  $('cv-emb-t').textContent = 'Comparación';
  $('cv-emb-q').innerHTML = 'cada nacionalidad medida de cada 1,000 personas que llegan por aire o tierra, para compararlas aunque viajen en cantidades muy distintas';
  $('cv-emb').innerHTML = '<div class="cv-cmp">'+Q.nats.map((n,j) => { const o = {nats:[n]}, l = tot(ING, Object.assign({ex:llegada}, o)), r = tot(SEG, Object.assign({ex:rech}, o)), s = tot(SEG, o), ll = l+r;
    const p = agg(ING, i => ING.p[i], NP, Object.assign({ex:llegada, pto:-1}, o)), pk = top(p, 1)[0], t = tasa(r, l);
    return '<div class="cv-cmp-c" style="--c:'+COMP[j]+'"><b class="cv-cmp-n">'+esc(nomN(n))+'</b><small>llegaron '+corto(ll)+'</small>'+
      (ll ? '<span class="cv-cmp-v"><b>'+f(s/ll*1000)+'</b> pasan a segunda revisión</span><span class="cv-cmp-v r"><b>'+f(r/ll*1000)+'</b> son rechazados</span>'+
        '<span class="cv-cmp-x">'+(base && t/base>=1.5 ? Math.round(t/base)+' veces el promedio' : base && t/base<=0.67 ? 'abajo del promedio' : 'cerca del promedio')+'</span>'+
        (pk ? '<span class="cv-cmp-p">Entra sobre todo por <b>'+esc(nomP(pk[0]))+'</b> ('+pct(pk[1], l)+'%)</span>' : '') : '<span class="mini">Sin llegadas por aire o tierra.</span>')+'</div>'; }).join('')+'</div>'+
    '<p class="rg-base">Cifras de cada 1,000 que llegan. Promedio de todas las nacionalidades: <b>'+f(base*10)+'</b> rechazados de cada 1,000.</p>';
}
function radar(id, nombres, ejes, val, fmt, extra){
  $(id).innerHTML = '<div id="'+id+'-r" style="height:380px"></div>';
  graf(id+'-r', { legend:{ bottom:0, data:nombres, icon:'roundRect', itemWidth:12, itemHeight:8 },
    tooltip:{ formatter:p => '<b>'+esc(p.name)+'</b><br>'+ejes.map((e,j) => e+': <b>'+fmt(p.value[j])+'</b>'+(extra ? extra(p.dataIndex, j) : '')).join('<br>') },
    radar:{ radius:'60%', center:['50%','48%'], indicator:ejes.map((e,j) => ({ name:e, max:Math.max(0.01, ...val.map(v => v[j]))*1.1 })), axisName:{ color:'#2B2926', fontSize:11 },
      splitArea:{ areaStyle:{ color:['#FBF9F3','#F4F2EA'] } }, splitLine:{ lineStyle:{ color:'#E2DED0' } }, axisLine:{ lineStyle:{ color:'#E2DED0' } } },
    series:[{ type:'radar', data:nombres.map((n,j) => ({ name:n, value:val[j], lineStyle:{ color:COMP[j], width:2 }, itemStyle:{ color:COMP[j] }, areaStyle:{ color:COMP[j], opacity:.12 } })) }] });
}
function pintarSem(){
  qTend('cv-sem');
  tendencia({ id:'cv-sem', ctl:'cv-sem-c', ley:'cv-sem-l', titulo:['cv-sem-t', () => 'Segunda revisión por resultado'], desg:'tot', barras:true, total:{ nom:'Casos', T:SEG, o:{} },
    lineas:() => [{ nom:'Rechazo', col:ROJO, T:SEG, o:{ex:rech} }, { nom:'Internación', col:'#B9CFC6', T:SEG, o:{ex:i => !rech(i)} }] });
}
function pintarPto(tp, base){
  const t = Q.rk==='t', l = tp.filter(x => t ? x.r>=30 : x.r>0).sort((a,b) => t ? b.t-a.t : b.r-a.r).slice(0, 15)
    .map(x => ({ lab:nomP(x.k).replace(/^Aerop\. /,''), full:nomP(x.k), v: t ? +(x.t*10).toFixed(1) : x.r, on:Q.pto===x.k, k:x.k, x:x, col: t ? (Q.pto>=0 ? (Q.pto===x.k ? VINO : '#E5B9B3') : (x.t>base ? ROJO : VERDE)) : null }));
  $('cv-pto-q').innerHTML = t ? 'rechazados de cada 1,000 personas que llegan por ese punto · los 15 más altos (30 rechazos o más) · rojo: arriba del promedio nacional ('+(base*10).toFixed(1)+')' : 'total de personas rechazadas en cada punto · los 15 con más rechazos · toca uno para filtrar';
  const ch = barrasV('cv-pto', l, { q:'cv-pto-q', tip:ps => { const x = l[ps[0].dataIndex].x; return '<b>'+esc(nomP(x.k))+'</b><br>Llegaron '+miles(x.ll)+' · '+miles(x.r)+' rechazados<br>Se rechaza a '+deCada(x.t); }, eti: t ? (p => p.value>=10 ? Math.round(p.value) : p.value) : null });
  ch.off('click'); ch.on('click', p => { const k = p.componentType==='xAxis' ? l.findIndex(x => x.lab===p.value) : p.dataIndex; if (l[k]){ Q.pto = Q.pto===l[k].k ? -1 : l[k].k; cuerpo(); } });
}

/* ==== [6] RESCATES Y ESTACIONES =================================== */
// Medidas: lo que reportan las O.R. tras un rescate (archivo de DGCOR) y lo que registra el sistema (DGCVM)
const MED = { res:['rescatados', ORR, {}, 'o'], pv:['rescatados por primera vez', ORR, {v:'pv'}, 'o'], rei:['reincidentes', ORR, {v:'rei'}, 'o'], opre:['presentados (reporte de las O.R.)', ORR, {v:'pre'}, 'o'],
  ocan:['canalizados al DIF (reporte de las O.R.)', ORR, {v:'can'}, 'o'], pre:['presentados (sistema)', PRE, {}, 's'], ra:['retornos asistidos', RET, {v:'ra'}, 's'], dep:['deportaciones', RET, {v:'dep'}, 's'] };
function pintarEst(){
  const b = $('cv-body'), M = MED[Q.em], w = ventanas();
  const sel = (k, nom, sub, ic, col) => tarjeta(nom, sub, ic, col, MED[k][1], MED[k][2], ' data-cem="'+k+'" aria-pressed="'+(Q.em===k)+'"', null, Q.em===k);
  const R = tot(ORR, {ex:conRei}), RE = tot(ORR, {v:'rei'}), reiTxt = [...REI_OR].map(nomE).join(', ');
  if (Q.em!=='pre' && Q.desgE==='est') Q.desgE = 'tot'; if (Q.em!=='res' && (Q.desgE==='tipo' || Q.desgE==='dest')) Q.desgE = 'tot'; if (Q.em!=='pre' && Q.tote==='s') Q.tote = 'n';
  b.innerHTML = '<section class="kpis rg-kpis" id="cv-kpis" data-modo="'+(Q.compacto?'compacto':'tarjetas')+'">'+
      '<div class="kg" style="flex:5 1 0;--g:'+OCRE+'"><div class="eti">Rescates · reporte de las O.R. · toca para analizar</div><div>'+sel('res', 'Rescatados', fuente('o','O.R.'), IC.tot, '#2B2926')+sel('pv', 'Primera vez', 'incluye O.R. sin registro de reincidencia', IC.est, VERDE)+
        sel('rei', 'Reincidentes', REI_OR.size<=2 ? 'solo los registra '+reiTxt : pct(RE, R)+'% donde se registra', IC.ret, ROJO)+sel('opre', 'Presentados en estación', fuente('o','O.R.'), IC.est, OCRE)+sel('ocan', 'Canalizados al DIF', fuente('o','O.R.'), IC.nino, '#778E88')+'</div></div>'+
      masG('Sistema<br>DGCVM', corto(tot(PRE, {})), 'Sistema DGCVM · <button class="cv-lnk" data-cdif>¿por qué dos cifras de presentados?</button>', VERDE, sel('pre', 'Presentados', fuente('s','sistema'), IC.est, '#2B2926')+sel('ra', 'Retornos asistidos', '', IC.ret, VERDE)+sel('dep', 'Deportaciones', '', IC.ret, VINO))+plegar()+'</section>'+
    '<div class="rg-hz" id="cv-hz"></div>'+
    '<div class="rg-g rg-g21 fila-par">'+cajaTend('cv-ps', 'tre')+'<div class="caja"><h2><span id="cv-pp-t"></span>'+info('pe')+'</h2><span class="q" id="cv-pp-q"></span><div id="cv-pp"></div></div></div>'+
    '<div class="rg-g rg-g2"><div class="caja"><h2><span>¿Quién reincide?</span>'+info('rein')+'<span id="cv-rn-o" class="cv-h2r"></span></h2><span class="q" id="cv-rn-q"></span><div id="cv-rn"></div></div>'+
      '<div class="caja"><h2><span>¿Quién se presenta y quién retorna?</span>'+info('pr')+'<span class="cv-h2r" id="cv-pr-o"></span></h2><span class="q" id="cv-pr-q"></span><div class="cv-scroll cv-fill"><div id="cv-pr"></div></div></div></div>'+
    detIni()+
    '<div class="caja rg-ancho cv-ancho"><h2><span>Totales de '+M[0]+'</span>'+info('tote')+'<span class="cv-h2r cv-h2b" id="cv-te-sel"></span></h2><span class="q" id="cv-te-q"></span><div class="cv-scroll cv-fill"><div id="cv-te"></div></div></div>'+
    '<div class="caja rg-ancho cv-ancho"><h2><span>¿Dónde se presenta cada nacionalidad?</span>'+info('mx')+'<span id="cv-mx-o" class="cv-h2r"></span></h2><span class="q" id="cv-mx-q"></span><div id="cv-mx"></div></div>'+'</div>';
  // Titulares: lo que cambió en rescates, reincidencia y presentados
  const hz = [];
  if (w){ const a = tot(ORR, {d0:w[0][0], d1:w[0][1]}), c = tot(ORR, {d0:w[1][0], d1:w[1][1]}), xa = agg(ORR, i => ORR.n[i], NN, {nats:null, d0:w[0][0], d1:w[0][1]}), xc = agg(ORR, i => ORR.n[i], NN, {nats:null, d0:w[1][0], d1:w[1][1]});
    let m = -1, dm = 0; for (let k=0;k<NN;k++){ const d = xa[k]-xc[k]; if (Math.abs(d)>Math.abs(dm)){ dm = d; m = k; } }
    if (c) hz.push({ cl:a>=c ? 'd' : 'u', ic:a>=c ? '▲' : '▼', h:'Rescates '+(a>=c ? 'suben ' : 'bajan ')+Math.abs((a/c-1)*100).toFixed(1)+'% '+txtCmp(), t:miles(c)+' → '+miles(a)+(m>=0 ? ' · lo que más cambió: '+esc(nomN(m))+' ('+(dm>0 ? '+' : '')+miles(dm)+') · filtrar ›' : ''), act:m>=0 ? ' data-cn="'+m+'"' : '' });
    const pa = tot(PRE, {d0:w[0][0], d1:w[0][1]}), pc = tot(PRE, {d0:w[1][0], d1:w[1][1]}); if (pc) hz.push({ cl:pa>=pc ? 'd' : 'u', ic:pa>=pc ? '▲' : '▼', h:'Presentados (sistema) '+(pa>=pc ? 'suben ' : 'bajan ')+Math.abs((pa/pc-1)*100).toFixed(1)+'% '+txtCmp(), t:miles(pc)+' → '+miles(pa)+' · ver la tendencia ›', act:' data-cem="pre"' }); }
  const rn = agg(ORR, i => ORR.n[i], NN, {nats:null, v:'rei'}), tn = agg(ORR, i => ORR.n[i], NN, {nats:null, ex:conRei}), cand = [...Array(NN).keys()].filter(k => rn[k]).sort((a,b) => rn[b]-rn[a])[0], alta = [...Array(NN).keys()].filter(k => tn[k]>=300).sort((a,b) => rn[b]/tn[b]-rn[a]/tn[a])[0];
  if (cand!=null && tn[cand]) hz.push({ cl:'al', ic:'↻', h:esc(nomN(cand))+': '+Math.round(rn[cand]/tn[cand]*100)+' de cada 100 rescatados ya lo habían sido ('+corto(rn[cand])+' personas)', t:(alta!=null && alta!==cand ? 'la proporción más alta es '+esc(nomN(alta))+' ('+Math.round(rn[alta]/tn[alta]*100)+' de cada 100, '+corto(rn[alta])+' personas) · ' : '')+'solo '+esc(reiTxt)+' registra reincidencia · filtrar ›', act:' data-cn="'+cand+'"' });
  $('cv-hz').innerHTML = hz.map(titular).join('')+info('hze');
  // Tendencia y panel de la medida elegida
  qTend('cv-ps'); $('cv-ps-q').insertAdjacentHTML('beforeend', ' · '+(M[3]==='o' ? fuente('o','reporte de las O.R. (DGCOR)') : fuente('s','sistema DGCVM')));
  const lin = k => k==='tipo' ? [{ nom:'Primera vez', col:VERDE, T:ORR, o:{v:'pv', ex:conRei} }, { nom:'Reincidentes', col:ROJO, T:ORR, o:{v:'rei', ex:conRei} }]
    : k==='dest' ? [{ nom:'Presentados en estación', col:OCRE, T:ORR, o:{v:'pre'} }, { nom:'Canalizados al DIF', col:'#778E88', T:ORR, o:{v:'can'} }, { nom:'Sin destino registrado', col:'#B66666', T:ORR, o:{v:'sd'} }]
    : k==='nat' ? (Q.nats.length ? Q.nats : topK(M[1], i => M[1].n[i], NN, Object.assign({nats:null}, M[2]), 5)).map((n,j) => ({ nom:nomN(n), col:Q.nats.length ? COMP[j] : PAL5[j], T:M[1], o:Object.assign({nats:[n]}, M[2]) }))
    : k==='est' ? topK(PRE, i => PRE.s[i], NS, {}, 5).map((x,j) => ({ nom:DIC.s[x], col:PAL5[j], T:PRE, o:{ex:i => PRE.s[i]===x} }))
    : (Q.ests.length ? Q.ests : topK(M[1], i => M[1].e[i], NE, Object.assign({ests:null}, M[2]), 5)).map((e,j) => ({ nom:nomE(e), col:Q.ests.length ? COMP[j] : PAL5[j], T:M[1], o:Object.assign({ests:[e]}, M[2]) }));
  const cap = M[0][0].toUpperCase()+M[0].slice(1);
  tendencia({ id:'cv-ps', ctl:'cv-ps-c', ley:'cv-ps-l', titulo:['cv-ps-t', k => cap+{tot:'', tipo:': primera vez y reincidentes', dest:' por destino', nat:' por nacionalidad', est:' por estación', or:' por O.R.'}[k]], desg:Q.desgE, attr:'data-cdesge',
    ops:[['tot','Total']].concat(Q.em==='res' ? [['tipo','1.ª vez / reincidentes'],['dest','Destino']] : [], [['nat','Por nacionalidad']], Q.em==='pre' ? [['est','Por estación']] : [], [['or','Por O.R.']]),
    total:{ nom:cap, T:M[1], o:M[2] }, extra:Q.em==='pre' ? [{ nom:'Presentados (reporte de las O.R.)', col:GRIS, T:ORR, o:{v:'pre'} }] : Q.em==='opre' ? [{ nom:'Presentados (sistema)', col:GRIS, T:PRE, o:{} }] : [], lineas:lin,
    nota:k => ({ tipo:'Rescatados por primera vez y reincidentes, solo en '+[...REI_OR].map(nomE).join(', ')+', la única O.R. que registra reincidencia.', dest:'A dónde se envió a los rescatados, según la O.R.', nat:'Las 5 nacionalidades principales (o las que elegiste).', est:'Las 5 estaciones con más presentados.', or:'Las 5 O.R. principales (o las que elegiste).' }[k]),
    clic:cub => { Q.sel = [cub.a, cub.b]; pintarPe(); } });
  pintarPe();
  totales({ ch:'cv-te', q:'cv-te-q', pil:'cv-te-sel', attr:'data-ctote', val:Q.tote, unidad:M[0], ops:[['n','Por nacionalidad'],['e','Por O.R.']].concat(Q.em==='pre' ? [['s','Por estación']] : []),
    dim:{ n:{ T:M[1], key:i => M[1].n[i], nk:NN, nom:nomN, quita:Object.assign({nats:null}, M[2]), sel:Q.nats },
          s:{ T:PRE, key:i => PRE.s[i], nk:NS, nom:k => DIC.s[k], quita:{}, sel:[] },
          e:{ T:M[1], key:i => M[1].e[i], nk:NE, nom:nomE, corto:k => abr(nomE(k)), quita:Object.assign({ests:null}, M[2]), sel:Q.ests } },
    elegir:k => { if (Q.tote==='n') alternar(Q.nats, k); else if (Q.tote==='e') alternar(Q.ests, k); else return; cuerpo(); } });
  pintarRein(); pintarPR(); pintarMx();
}
function pintarPe(){
  const M = MED[Q.em];
  panelP({ t:'cv-pp-t', q:'cv-pp-q', body:'cv-pp', titulo:'¿De quién se trata?', unidad:M[0], o:M[2], total:o => tot(M[1], o),
    pre:Q.em==='res' ? (o => { let a = tot(ORR, Object.assign({v:'pv', ex:conRei}, o)), r = tot(ORR, Object.assign({v:'rei'}, o)), tt = tot(ORR, o), p = tot(ORR, Object.assign({v:'pre'}, o)), c = tot(ORR, Object.assign({v:'can'}, o)), t = a+r || 1, sd = Math.max(0, tt-p-c), rt = tt || 1;
      const barra2 = (tit, l, tt) => { const tg = t; t = tt; const h = barra(tit, l); t = tg; return h; };
      const barra = (tit, l) => '<h4>'+tit+'</h4><div class="cv-vb">'+l.map(x => x[1] ? '<span style="width:'+(x[1]/t*100).toFixed(2)+'%;background:'+x[2]+'" title="'+x[0]+': '+miles(x[1])+' ('+pct(x[1],t)+'%)">'+(x[1]/t>=.12 ? pct(x[1],t)+'%' : '')+'</span>' : '').join('')+'</div><div class="cv-vl">'+l.map(x => '<span title="'+x[0]+': '+miles(x[1])+'"><i class="sw" style="background:'+x[2]+'"></i>'+x[0]+' <b>'+pct(x[1],t)+'%</b> <small>'+corto(x[1])+'</small></span>').join('')+'</div>';
      return (a+r ? barra('¿Primera vez o reincidentes? · solo '+esc([...REI_OR].map(nomE).join(', ')), [['1.ª vez', a, VERDE], ['Reincidentes', r, ROJO]]) : '')+barra2('¿A dónde se les envió?', [['Estación', p, OCRE], ['DIF', c, '#778E88'], ['Sin destino', sd, '#B66666']], rt); }) : null,
    secciones:[{ tit:'Nacionalidades', T:M[1], key:i => M[1].n[i], nk:NN, nom:nomN, attr:'data-cn', quita:Object.assign({nats:null}, M[2]), sel:Q.nats, n:8 },
               { tit:'Estados (O.R.)', T:M[1], key:i => M[1].e[i], nk:NE, nom:nomE, attr:'data-ce', quita:Object.assign({ests:null}, M[2]), sel:Q.ests, n:6 }].concat(Q.em==='pre' ? [{ tit:'Estaciones', T:PRE, key:i => PRE.s[i], nk:NS, nom:k => DIC.s[k], attr:'data-cx', quita:{}, n:5 }] : []) });
}
// Ventana: por qué hay dos cifras de presentados (reporte de las O.R. y sistema), por O.R.
function ventanaDif(){
  const ro = agg(ORR, i => ORR.e[i], NE, {v:'pre', ests:null}), rs = agg(PRE, i => PRE.e[i], NE, {ests:null}), TO = ro.reduce((a,b)=>a+b,0), TS = rs.reduce((a,b)=>a+b,0);
  const filas = [...Array(NE).keys()].filter(e => ro[e] || rs[e]).sort((a,b) => ro[b]-ro[a]).slice(0, 10), mx = Math.max(1, ...filas.map(e => Math.max(ro[e], rs[e])));
  modal('¿Por qué hay dos cifras de presentados?',
    '<p>Son dos registros distintos del mismo proceso:</p><ul><li>'+fuente('o','Reporte de las O.R.')+' <b>'+miles(TO)+'</b>: personas que la O.R. envió a una estación después de un rescate.</li>'+
    '<li>'+fuente('s','Sistema DGCVM')+' <b>'+miles(TS)+'</b>: personas que quedaron registradas como presentadas en la estación.</li></ul>'+
    '<p>No se suman. Si el sistema registra mucho menos que la O.R., hay presentaciones sin capturar o criterios distintos; vale la pena conciliarlo con el área.</p>'+
    (filas.length ? '<h4>Por O.R. · de cada 100 que reporta la O.R., cuántos aparecen en el sistema</h4>'+filas.map(e => { const q = ro[e] ? Math.round(rs[e]/ro[e]*100) : null;
      return '<div class="cv-dif"><span>'+esc(nomE(e))+'</span><span class="cv-dif-b"><i style="width:'+(ro[e]/mx*100).toFixed(1)+'%;background:'+OCRE+'"></i><i style="width:'+(rs[e]/mx*100).toFixed(1)+'%;background:#2B2926"></i></span>'+
        '<span class="cv-dif-n"><small>O.R.</small> '+corto(ro[e])+' <small>· sistema</small> '+corto(rs[e])+'</span><b class="'+(q!=null && q<50 ? 'r' : '')+'">'+(q==null ? '—' : q)+'</b></div>'; }).join('') : ''));
}
function modal(tit, html){ let m = $('cv-modal'); if (!m){ m = document.createElement('div'); m.id = 'cv-modal'; m.className = 'cv-modal'; m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); document.body.appendChild(m); }
  m.innerHTML = '<div class="cv-modal-c"><div class="cv-modal-h"><h3>'+tit+'</h3><button data-cmodalx aria-label="Cerrar">×</button></div>'+html+'</div>'; m.hidden = false; }
// Reincidencia: de cada 100 rescatados de una nacionalidad, cuántos ya lo habían sido antes; solo donde la O.R. la registra
function pintarRein(){
  const caja = $('cv-rn').closest('.caja'), ok = i => conRei(i), t = agg(ORR, i => ORR.n[i], NN, {nats:null, ex:ok}), r = agg(ORR, i => ORR.n[i], NN, {nats:null, v:'rei', ex:ok});
  const T = t.reduce((a,b)=>a+b,0), RT = r.reduce((a,b)=>a+b,0), reiTxt = [...REI_OR].filter(e => !Q.ests.length || Q.ests.indexOf(e)>=0).map(nomE).join(', ');
  if (!RT){ caja.hidden = true; return; } caja.hidden = false;
  const prom = RT/T*100, ord = Q.reo || 'n', base = [...Array(NN).keys()].filter(k => r[k] && t[k]>=300);
  const l = (Q.nats.length ? base.filter(k => Q.nats.indexOf(k)>=0) : base).sort((a,b) => ord==='n' ? r[b]-r[a] : r[b]/t[b]-r[a]/t[a]).slice(0, 10), mx = 100;
  $('cv-rn-q').innerHTML = 'de cada 100 rescatados, cuántos ya habían sido rescatados antes · <b>solo '+esc(reiTxt)+' registra reincidencia</b> · promedio: <b>'+Math.round(prom)+' de cada 100</b> · <i class="sw" style="background:'+ROJO+'"></i>arriba del promedio <i class="sw" style="background:'+VERDE+'"></i>abajo o igual · nacionalidades con 300 rescatados o más';
  $('cv-rn-o').innerHTML = pil('data-creo', ord, [['n','Más reincidentes'],['p','Mayor proporción']]);
  $('cv-rn').innerHTML = '<div class="cv-emb h"><span></span><span></span><span>'+(ord==='n' ? 'reincidentes' : 'de cada 100')+'</span></div>'+l.map(k => { const p = r[k]/t[k]*100;
    return '<button class="cv-emb'+(Q.nats.indexOf(k)>=0 ? ' on' : '')+'" data-cn="'+k+'" title="'+esc(nomN(k))+': '+miles(r[k])+' reincidentes de '+miles(t[k])+' rescatados"><span class="cv-emb-n">'+esc(nomN(k))+'<small>'+corto(r[k])+' reincidentes de '+corto(t[k])+'</small></span>'+
      '<span class="cv-emb-b"><i class="s" style="width:100%"></i><i class="r" style="width:'+p.toFixed(1)+'%;background:'+(p>prom ? ROJO : VERDE)+'"></i></span>'+
      '<span class="cv-emb-v"><b style="color:'+(p>prom ? '#A8443E' : '#2F6657')+'">'+(ord==='n' ? miles(r[k]) : Math.round(p))+'</b><small>'+(ord==='n' ? Math.round(p)+' de cada 100 · ' : '')+(p>prom+5 ? 'arriba del promedio' : p<prom-5 ? 'abajo del promedio' : 'cerca del promedio')+'</small></span></button>'; }).join('')+
    '<p class="rg-base">«Más reincidentes» ordena por cantidad de personas; «Mayor proporción», por cuántos de cada 100. Una nacionalidad pequeña puede tener una proporción muy alta con pocas personas.</p>';
}
// Presentados y retornos (sistema): de cada 100 presentados, cuántos salen del país, por nacionalidad u O.R.
function pintarPR(){
  const caja = $('cv-pr').closest('.caja'), porE = Q.prm==='e', key = T => porE ? (i => T.e[i]) : (i => T.n[i]), nk = porE ? NE : NN, quita = porE ? {ests:null} : {nats:null}, nom = porE ? nomE : nomN;
  const pn = agg(PRE, key(PRE), nk, quita), ra = agg(RET, key(RET), nk, Object.assign({v:'ra'}, quita)), dp = agg(RET, key(RET), nk, Object.assign({v:'dep'}, quita)), sel = porE ? Q.ests : Q.nats;
  let ks = [...Array(nk).keys()].filter(k => pn[k]>=20); if (sel.length) ks = ks.filter(k => sel.indexOf(k)>=0);
  $('cv-pr-o').innerHTML = pil('data-cprm', Q.prm, [['n','Por nacionalidad'],['e','Por O.R.']]);
  if (!ks.length){ caja.hidden = true; return; } caja.hidden = false;
  ks = ks.sort((a,b) => pn[b]-pn[a]).slice(0, 12).sort((a,b) => (ra[b]+dp[b])/pn[b]-(ra[a]+dp[a])/pn[a]); const P = ks.reduce((t,k) => t+pn[k], 0), Rt = ks.reduce((t,k) => t+ra[k]+dp[k], 0), prom = P ? Rt/P*100 : 0;
  const l = ks.map(k => { const q = (ra[k]+dp[k])/pn[k]*100; return { lab:porE ? abr(nom(k)) : nom(k), full:nom(k), k:k, v:+q.toFixed(1), on:sel.indexOf(k)>=0, col:q>=prom ? VERDE : '#B9CFC6', p:pn[k], a:ra[k], d:dp[k] }; });
  $('cv-pr-q').innerHTML = 'de cada 100 presentados, cuántos salieron del país (retorno asistido o deportación) · '+(porE ? 'las 12 O.R.' : 'las 12 nacionalidades')+' con más presentados, ordenadas de más a menos retornos · entre paréntesis, cuántos se presentaron · verde: arriba del promedio ('+(prom>=10 ? Math.round(prom) : prom.toFixed(1))+' de cada 100) · toca una barra para filtrar';
  const ch = barrasV('cv-pr', l.map(x => Object.assign({}, x, { lab:x.lab+' '+'('+corto(x.p)+')' })), { q:'cv-pr-q', eti:p => { const v = l[p.dataIndex].v; return v>=10 ? Math.round(v) : v; },
    tip:ps => { const x = l[ps[0].dataIndex]; return '<b>'+esc(x.full)+'</b><br>'+miles(x.p)+' presentados<br>'+miles(x.a)+' retornos asistidos · '+miles(x.d)+' deportaciones<br><b>Salen '+(x.v>=10 ? Math.round(x.v) : x.v)+' de cada 100</b>'; } });
  ch.off('click'); ch.on('click', p => { const k = p.componentType==='xAxis' ? l.findIndex(x => x.lab+' ('+corto(x.p)+')'===p.value) : p.dataIndex; if (l[k]){ alternar(porE ? Q.ests : Q.nats, l[k].k); cuerpo(); } });
}
// Matriz estación (u O.R.) × nacionalidad. Al pasar el cursor: su fila y su columna se sombrean y la celda se ilumina con su número en negrita
function pintarMx(){
  const caja = $('cv-mx').closest('.caja'), porOR = Q.mxm==='e', KR = porOR ? (i => PRE.e[i]) : (i => PRE.s[i]), NRk = porOR ? NE : NS, nomR = porOR ? nomE : (k => DIC.s[k]);
  const ps = agg(PRE, KR, NRk, {ests:porOR ? null : undefined}), pn = agg(PRE, i => PRE.n[i], NN, {nats:null});
  let R = [...Array(NRk).keys()].filter(k => ps[k]).sort((a,b) => ps[b]-ps[a]), C = [...Array(NN).keys()].filter(k => pn[k]).sort((a,b) => pn[b]-pn[a]);
  if (porOR && Q.ests.length) R = R.filter(k => Q.ests.indexOf(k)>=0); R = R.slice(0, 12);
  if (Q.nats.length) C = C.filter(k => Q.nats.indexOf(k)>=0); C = C.slice(0, 10);
  $('cv-mx-o').innerHTML = pil('data-cmxm', Q.mxm || 's', [['s','Estación × nacionalidad'],['e','O.R. × nacionalidad']]);
  if (!R.length || !C.length){ caja.hidden = true; return; } caja.hidden = false;
  const m = agg(PRE, i => KR(i)*NN + PRE.n[i], NRk*NN, {nats:null, ests:porOR ? null : undefined}), v = (r,c) => m[r*NN+c];
  let mx = 1; R.forEach(r => C.forEach(c => { mx = Math.max(mx, v(r,c)); }));
  const ram = ['#EEF4F1','#CFE0D9','#9FC0B3','#5E9384','#2F6657','#173A31'], datos = [];
  R.forEach((r,y) => C.forEach((c,x) => { const n = v(r,c), t = n ? Math.log1p(n)/Math.log1p(mx) : 0; datos.push({ value:[x, y, n], itemStyle:{ color: n ? echarts.color.lerp(t, ram) : '#FBF9F3' }, label:{ color: t>.62 ? '#fff' : '#2B2926' } }); }));
  // Con 2 o 3 nacionalidades (u O.R.), una frase que las compara
  const frase = Q.nats.length>=2 ? C.map((c,j) => { const col = R.map(r => v(r,c)), t = col.reduce((a,b)=>a+b,0), k = col.indexOf(Math.max(...col)); return t ? '<b style="color:'+COMP[j]+'">'+esc(nomN(c))+'</b>: '+pct(col[k], t)+'% en '+esc(nomR(R[k])) : ''; }).filter(Boolean).join(' · ')
    : porOR && Q.ests.length>=2 ? R.map(r => { const fila = C.map(c => v(r,c)), t = fila.reduce((a,b)=>a+b,0), k = fila.indexOf(Math.max(...fila)); return t ? '<b>'+esc(nomE(r))+'</b>: '+pct(fila[k], t)+'% son de '+esc(nomN(C[k])) : ''; }).filter(Boolean).join(' · ') : '';
  $('cv-mx-q').innerHTML = (frase ? '<span class="cv-mx-f">'+frase+'</span><br>' : '')+'presentados (sistema) · '+(porOR ? 'O.R.' : 'estaciones')+' con más presentados contra '+(Q.nats.length ? 'las nacionalidades que elegiste' : 'las '+C.length+' nacionalidades principales')+' · más oscuro = más personas';
  const el = $('cv-mx'); el.style.height = (R.length*30+70)+'px';
  const ch = graf('cv-mx', { animation:false, tooltip:{ formatter:p => p.seriesIndex ? '' : '<b>'+esc(nomN(C[p.value[0]]))+' en '+esc(nomR(R[p.value[1]]))+'</b><br>'+miles(p.value[2])+' presentados · '+pct(p.value[2], ps[R[p.value[1]]])+'% de '+(porOR ? 'la O.R.' : 'la estación') },
    grid:{ left:150, top:44, bottom:6, width:Math.min(Math.max(200, el.clientWidth-170), C.length*110) },
    xAxis:{ type:'category', data:C.map(nomN), position:'top', axisTick:{show:false}, axisLine:{show:false}, axisLabel:{ interval:0, fontSize:11, color:'#2B2926', width:84, overflow:'break' }, axisPointer:GUIA },
    yAxis:{ type:'category', data:R.map(nomR), inverse:true, axisTick:{show:false}, axisLine:{show:false}, axisLabel:{ fontSize:11.5, color:'#2B2926' }, axisPointer:GUIA },
    series:[{ type:'heatmap', data:datos, label:{ show:true, fontSize:10.5, formatter:p => p.value[2] ? corto(p.value[2]) : '' }, itemStyle:{ borderColor:'#FCFBF7', borderWidth:2.5, borderRadius:5 }, emphasis:{ disabled:true } }, BANDA(), FOCO()] });
  hoverMx(ch, datos, C.length, R.length, mx);
}
// Resaltado de cruces: la fila y la columna de la celda quedan a todo color y el resto se atenúa; sus nombres y su número van en negrita
const GUIA = { show:false };
const BANDA = () => ({ id:'banda', type:'scatter', data:[], silent:true });
const FOCO = () => ({ id:'foco', type:'scatter', data:[], silent:true, z:30, symbol:'rect', animation:false, itemStyle:{ color:'rgba(0,0,0,0)' }, label:{ show:true, position:'inside', fontWeight:700, fontSize:11, formatter:p => p.value[2] ? corto(p.value[2]) : '0' } });
function hoverMx(ch, datos, nC, nR, mx){
  const rich = { s:{ fontWeight:700, color:'#2B2926', fontSize:11.5 }, o:{ color:'#9A958A', fontSize:11.5 } };
  const a = ch.convertToPixel({gridIndex:0}, [0,0]), b = ch.convertToPixel({gridIndex:0}, [1,1]), w = Math.abs(b[0]-a[0]), h = Math.abs(b[1]-a[1]);
  ch.off('mouseover'); ch.off('globalout');
  ch.on('mouseover', p => { if (p.seriesIndex!==0) return; const t = p.value[2] ? Math.log1p(p.value[2])/Math.log1p(mx) : 0;
    const luz = datos.map(x => x.value[0]===p.value[0] || x.value[1]===p.value[1] ? x : Object.assign({}, x, { itemStyle:Object.assign({}, x.itemStyle, { opacity:.2 }), label:Object.assign({}, x.label, { opacity:.25 }) }));
    ch.setOption({ yAxis:{ axisLabel:{ formatter:(v,i) => i===p.value[1] ? '{s|'+v+'}' : '{o|'+v+'}', rich:rich } }, xAxis:{ axisLabel:{ formatter:(v,i) => i===p.value[0] ? '{s|'+v+'}' : '{o|'+v+'}', rich:rich } },
      series:[{ data:luz }, {}, { id:'foco', data:[{ value:p.value, label:{ color:t>.62 ? '#fff' : '#2B2926' } }], symbolSize:[w-4, h-4] }] }); });
  ch.on('globalout', () => ch.setOption({ yAxis:{ axisLabel:{ formatter:v => v } }, xAxis:{ axisLabel:{ formatter:v => v } }, series:[{ data:datos }, {}, { id:'foco', data:[] }] }));
}

/* ==== [7] CANALIZADOS (SIRENNA) =================================== */
function pintarCan(){
  const b = $('cv-body'), nna = Q.can==='nna', w = ventanas(), T = nna ? NNA : ADU, MO = CV.motivos;
  const tc = (k, nom, ic, col) => tarjeta(nom, k<0 ? fuente('s','SIRENNA') : '', ic, col, NNA, {cls:k}, ' data-ccls="'+k+'" aria-pressed="'+(nna && Q.cls===k)+'"', null, nna && Q.cls===k);
  b.innerHTML = '<section class="kpis rg-kpis" id="cv-kpis" data-modo="'+(Q.compacto?'compacto':'tarjetas')+'">'+
      '<div class="kg" style="flex:4 1 0;--g:'+ROJO+'"><div class="eti">Niñas, niños y adolescentes · SIRENNA · toca para filtrar</div><div>'+tc(-1, 'NNA canalizados', IC.nino, '#2B2926')+tc(0, 'Acompañados', IC.nino, COLC[0])+tc(1, 'No acompañados', IC.nino, COLC[1])+tc(2, 'Separados', IC.nino, COLC[2])+'</div></div>'+
      '<div class="kg" style="flex:1 1 0;--g:'+VERDE+'"><div class="eti">Adultos</div><div>'+tarjeta('Adultos acompañantes', fuente('s','SIRENNA'), IC.adulto, VERDE, ADU, {}, ' data-ccan="adu" aria-pressed="'+!nna+'"', null, !nna)+'</div></div>'+
      masG('Reporte<br>de las O.R.', corto(tot(ORR, {v:'can'})), 'Reporte de las O.R.', GRIS, tarjeta('Canalizados al DIF', fuente('o','tras un rescate'), IC.nino, GRIS, ORR, {v:'can'})+tarjeta('Menores recibidos de EE. UU.', fuente('o','O.R. de la frontera norte'), IC.nino, GRIS, REC, {v:'me'}))+plegar()+'</section>'+
    '<div class="rg-hz" id="cv-hz"></div>'+
    '<div class="rg-g rg-g21 fila-par">'+cajaTend('cv-cs', 'ctend')+'<div class="caja"><h2><span id="cv-cp-t"></span>'+info('cp')+'</h2><span class="q" id="cv-cp-q"></span><div id="cv-cp"></div></div></div>'+
    '<div class="rg-g rg-g2"><div class="caja"><h2><span>¿Cómo salen?</span>'+info('sal')+'</h2><span class="q" id="cv-sal-q"></span><div id="cv-sal"></div></div>'+
      '<div class="caja"><h2><span>'+(nna ? 'Edad y sexo' : 'Sexo')+'</span>'+info('edad')+'</h2><span class="q">'+(nna ? 'grupos de edad a la fecha del evento'+(Q.cls>=0 ? ' · '+CV.clases[Q.cls].toLowerCase()+'s' : '') : 'adultos que acompañan a NNA')+'</span><div id="cv-ed" class="cv-fill" style="min-height:260px"></div></div></div>'+
    detIni()+
    '<div class="rg-g rg-g2"><div class="caja"><h2><span>Nacionalidad de '+(nna ? 'los NNA' : 'los adultos')+'</span>'+info('cnat')+'<span class="cv-h2r cv-h2b" id="cv-cn-o"></span></h2><span class="q" id="cv-cn-q"></span><div class="cv-scroll cv-fill"><div id="cv-cn"></div></div></div>'+
      '<div class="caja"><h2><span>O.R. que canaliza</span>'+info('cor')+'<span class="cv-h2r cv-h2b" id="cv-ce-o"></span></h2><span class="q" id="cv-ce-q"></span><div class="cv-scroll cv-fill"><div id="cv-ce"></div></div></div></div>'+
    '<div class="caja rg-ancho cv-ancho"><h2><span>Recibidos de EE. UU.</span>'+info('rec')+'</h2><span class="q" id="cv-re-q"></span><div class="cv-rec"><div id="cv-re-k"></div><div class="cv-scroll"><div id="cv-re" style="height:260px"></div></div></div></div>'+'</div>';
  // Titulares: qué pasó con los NNA en la comparación elegida
  const hz = [];
  if (w){ const per = txtCmp(), a = tot(T, {d0:w[0][0], d1:w[0][1]}), c = tot(T, {d0:w[1][0], d1:w[1][1]});
    if (c) hz.push({ cl:a>=c ? 'd' : 'u', ic:a>=c ? '▲' : '▼', h:(nna ? 'NNA canalizados' : 'Adultos acompañantes')+' '+(a>=c ? 'suben ' : 'bajan ')+Math.abs((a/c-1)*100).toFixed(1)+'% '+per, t:miles(c)+' → '+miles(a)+' · ver la tendencia ›', act:'' });
    if (nna){ const na = tot(NNA, {cls:1, d0:w[0][0], d1:w[0][1]}), nc = tot(NNA, {cls:1, d0:w[1][0], d1:w[1][1]}); hz.push({ cl:na>nc ? 'al' : 'u', ic:na>nc ? '!' : '▼', h:'NNA no acompañados '+(na>=nc ? 'suben' : 'bajan')+': '+miles(nc)+' → '+miles(na)+' '+per, t:'ver solo no acompañados ›', act:' data-ccls="1"' }); }
    const xa = agg(T, i => T.n[i], NN, {nats:null, d0:w[0][0], d1:w[0][1]}), xc = agg(T, i => T.n[i], NN, {nats:null, d0:w[1][0], d1:w[1][1]}); let m = -1, dm = 0;
    for (let k=0;k<NN;k++){ const d = xa[k]-xc[k]; if (Math.abs(d)>Math.abs(dm)){ dm = d; m = k; } }
    if (m>=0 && dm) hz.push({ cl:dm>0 ? 'd' : 'u', ic:dm>0 ? '▲' : '▼', h:esc(nomN(m))+(dm>0 ? ' sube ' : ' baja ')+miles(Math.abs(dm))+' '+per, t:miles(xc[m])+' → '+miles(xa[m])+' · el mayor cambio entre nacionalidades · filtrar ›', act:' data-cn="'+m+'"' }); }
  $('cv-hz').innerHTML = hz.map(titular).join('')+info('hzc');
  // Tendencia y panel: al tocar un periodo, motivo de salida, nacionalidades y O.R. de ese periodo
  qTend('cv-cs'); if (nna) $('cv-cs-q').insertAdjacentHTML('beforeend', ' · '+fuente('s','SIRENNA')+' NNA canalizados · '+fuente('o','reporte de las O.R.')+' canalizados al DIF tras un rescate (otra fuente: no se suma)');
  if (!nna && Q.desgC==='cls') Q.desgC = 'tot';
  const usadosM = MO.map((_,k) => k).filter(k => tot(T, {ex:i => T.m[i]===k}));
  tendencia({ id:'cv-cs', ctl:'cv-cs-c', ley:'cv-cs-l', titulo:['cv-cs-t', k => (nna ? 'NNA canalizados' : 'Adultos acompañantes')+{tot:'', mot:' por motivo de salida', cls:' por condición', nat:' por nacionalidad', or:' por O.R.'}[k]], desg:Q.desgC, attr:'data-cdesgc',
    ops:[['tot','Total'],['mot','Por motivo de salida']].concat(nna ? [['cls','Por condición']] : [], [['nat','Por nacionalidad'],['or','Por O.R.']]),
    total:{ nom:nna ? 'NNA canalizados (SIRENNA)' : 'Adultos acompañantes', T:T, o:{} }, extra:nna ? [{ nom:'Canalizados al DIF (reporte de las O.R.)', col:GRIS, T:ORR, o:{v:'can'} }] : [],
    lineas:k => k==='mot' ? usadosM.map(m => ({ nom:MO[m], col:COLM[m], T:T, o:{ex:i => T.m[i]===m} }))
      : k==='cls' ? CV.clases.map((c,j) => ({ nom:c, col:COLC[j], T:NNA, o:{cls:j} }))
      : k==='nat' ? (Q.nats.length ? Q.nats : topK(T, i => T.n[i], NN, {nats:null}, 5)).map((n,j) => ({ nom:nomN(n), col:Q.nats.length ? COMP[j] : PAL5[j], T:T, o:{nats:[n]} }))
      : (Q.ests.length ? Q.ests : topK(T, i => T.e[i], NE, {ests:null}, 5)).map((e,j) => ({ nom:nomE(e), col:Q.ests.length ? COMP[j] : PAL5[j], T:T, o:{ests:[e]} })),
    nota:k => ({ mot:'Todos los motivos de salida.', cls:'Acompañados, no acompañados y separados.', nat:'Las 5 nacionalidades con más canalizados (o las que elegiste).', or:'Las 5 O.R. con más canalizados (o las que elegiste).' }[k]),
    clic:cub => { Q.sel = [cub.a, cub.b]; pintarCp(); } });
  pintarCp();
  // Cómo salen: de cada 100 (cuadrícula como «Composición» de Pulso) y semana a semana
  pintarSal(T, nna);
  if (nna){ const sepa = Q.cls<0, gr = [0,1,2], v = (g, s, a) => tot(NNA, {ex:i => NNA.g[i]===g && NNA.s[i]===s && (!sepa || (a ? NNA.c[i]===0 : NNA.c[i]!==0))});
    const S = sepa ? [['NNA hombres acompañados',0,1,'#778E88'],['NNA hombres no acompañados o separados',0,0,'#B9CFC6'],['NNA mujeres acompañadas',1,1,ROJO],['NNA mujeres no acompañadas o separadas',1,0,'#E5B9B3']] : [['NNA hombres',0,1,'#778E88'],['NNA mujeres',1,1,ROJO]];
    const D = S.map(x => gr.map(g => v(g, x[1], x[2]))), tg = gr.map(g => D.reduce((t,d) => t+d[g], 0)), T = tg.reduce((a,b)=>a+b,0), mxE = Math.max(1, ...gr.map(g => Math.max(D.filter((_,j) => S[j][1]===0).reduce((t,d)=>t+d[g],0), D.filter((_,j) => S[j][1]===1).reduce((t,d)=>t+d[g],0))));
    $('cv-ed').closest('.caja').querySelector('.q').innerHTML = '<b>'+miles(T)+'</b> '+(sepa ? 'NNA' : CV.clases[Q.cls].toLowerCase()+'s')+' · grupos de edad a la fecha del evento'+(sepa ? ' · tono claro: no acompañados o separados' : '');
    graf('cv-ed', { grid:{ left:70, right:24, top:sepa ? 50 : 30, bottom:24 }, legend:{ top:0, left:0, icon:'roundRect', itemWidth:12, itemHeight:8, textStyle:{fontSize:11}, selectedMode:false },
      tooltip:{ trigger:'axis', axisPointer:{ type:'shadow' }, formatter:ps => '<b>'+CV.edades[ps[0].dataIndex]+' años · '+miles(tg[ps[0].dataIndex])+'</b><br>'+ps.map(p => p.marker+p.seriesName+': <b>'+miles(Math.abs(p.value))+'</b>').join('<br>') },
      xAxis:{ type:'value', axisLabel:{ formatter:v => corto(Math.abs(v)), color:'#5C5952', fontSize:10.5 }, splitLine:{ lineStyle:{ color:'#EEEBE2' } } },
      yAxis:{ type:'category', data:CV.edades.slice(0,3), axisTick:{show:false}, axisLabel:{ fontSize:12, color:'#2B2926', lineHeight:15, formatter:(v,i) => v+'\n{t|'+miles(tg[i])+'}', rich:{ t:{ fontSize:11, fontWeight:700, color:'#2B2926' } } } },
      animationDurationUpdate:300, series:S.map((x,j) => ({ name:x[0], type:'bar', stack:'a', barWidth:'58%', data:D[j].map(n => x[1]===0 ? -n : n), itemStyle:{ color:x[3] }, emphasis:{ focus:'series', itemStyle:{ shadowBlur:8, shadowColor:'rgba(0,0,0,.18)' } }, blur:{ itemStyle:{ opacity:.35 } },
        label:{ show:true, position:'inside', fontSize:11, color:x[2] ? '#fff' : '#2B2926', fontWeight:600, formatter:p => Math.abs(p.value)>=mxE*.1 ? miles(Math.abs(p.value)) : '' } })) }); }
  else { const h = tot(ADU, {ex:i => ADU.s[i]===0}), m = tot(ADU, {ex:i => ADU.s[i]===1});
    graf('cv-ed', { tooltip:{ formatter:p => p.name+': <b>'+miles(p.value)+'</b> ('+p.percent+'%)' }, series:[{ type:'pie', radius:['48%','72%'], data:[{ name:'Mujeres', value:m, itemStyle:{ color:ROJO } }, { name:'Hombres', value:h, itemStyle:{ color:'#778E88' } }],
      label:{ formatter:p => p.name+'\n{b|'+p.percent.toFixed(1)+'%}', rich:{ b:{ fontSize:18, fontWeight:700 } }, fontSize:12 }, itemStyle:{ borderColor:'#FCFBF7', borderWidth:3 } }] }); }
  // Nacionalidad y O.R., las dos a la vista, apiladas por condición (NNA) o por sexo (adultos)
  const apila = nna ? (Q.cls>=0 ? null : CV.clases.map((c,j) => ({ name:c, col:COLC[j], ex:i => NNA.c[i]===j }))) : [{ name:'Mujeres', col:ROJO, ex:i => ADU.s[i]===1 }, { name:'Hombres', col:'#778E88', ex:i => ADU.s[i]===0 }];
  totales({ ch:'cv-cn', q:'cv-cn-q', pil:'cv-cn-o', attr:'data-x', val:'n', tope:15, unidad:nna ? 'NNA' : 'adultos', ops:[], apila:apila, dim:{ n:{ T:T, key:i => T.n[i], nk:NN, nom:nomN, quita:{nats:null}, sel:Q.nats } }, elegir:k => { alternar(Q.nats, k); cuerpo(); } });
  totales({ ch:'cv-ce', q:'cv-ce-q', pil:'cv-ce-o', attr:'data-x', val:'e', tope:15, unidad:nna ? 'NNA' : 'adultos', ops:[], apila:apila, dim:{ e:{ T:T, key:i => T.e[i], nk:NE, nom:nomE, corto:k => abr(nomE(k)), quita:{ests:null}, sel:Q.ests } }, elegir:k => { alternar(Q.ests, k); cuerpo(); } });
  // Recibidos de EE. UU. (reporte de las O.R.)
  const ad = tot(REC, {v:'ad'}), me = tot(REC, {v:'me'}), rn = agg(REC, i => REC.n[i], NN, {nats:null, v:'ad'}), rm = agg(REC, i => REC.n[i], NN, {nats:null, v:'me'}), re = agg(REC, i => REC.e[i], NE, {v:'ad'}), rme = agg(REC, i => REC.e[i], NE, {v:'me'});
  $('cv-re').closest('.caja').hidden = !(ad+me); if (!(ad+me)) return;
  $('cv-re-q').innerHTML = fuente('o','reporte de las O.R.')+' extranjeros que EE. UU. entregó a México en la frontera norte · no pasan necesariamente por SIRENNA';
  $('cv-re-k').innerHTML = '<p class="rg-dato"><b class="num">'+miles(ad+me)+'</b> recibidos · <b>'+miles(me)+'</b> menores ('+pct(me, ad+me)+'%)</p><h4>Por O.R.</h4>'+
    [...Array(NE).keys()].filter(e => re[e]+rme[e]).sort((a,b) => re[b]+rme[b]-re[a]-rme[a]).map(e => '<div class="barra pc"><span>'+esc(nomE(e))+' <small>'+pct(rme[e], re[e]+rme[e])+'% menores</small></span><span class="b"><i style="width:'+((re[e]+rme[e])/(ad+me||1)*100).toFixed(1)+'%;background:'+GRIS+'"></i></span><span class="x">'+miles(re[e]+rme[e])+'</span></div>').join('');
  const lr = [...Array(NN).keys()].filter(k => rn[k]+rm[k]).sort((a,b) => rn[b]+rm[b]-rn[a]-rm[a]).map(k => ({ lab:nomN(k), full:nomN(k), on:Q.nats.indexOf(k)>=0, k:k, s0:rm[k], s1:rn[k] }));
  if (lr.length) barrasV('cv-re', lr, { stack:true, ley:true, series:[{ name:'Menores', k:'s0', col:ROJO }, { name:'Adultos', k:'s1', col:'#9A958A' }], tip:ps => '<b>'+esc(ps[0].name)+'</b><br>'+ps.map(p => p.marker+p.seriesName+': <b>'+miles(p.value)+'</b>').join('<br>') });
}
// «¿Cómo salen?»: de cada 100 canalizados, cuántos salen por cada motivo, en una cuadrícula de 100 y semana a semana
const cap1 = t => t.charAt(0).toUpperCase()+t.slice(1);
function pintarSal(T, nna){
  const MO = CV.motivos, x = agg(T, i => T.m[i], MO.length, {}), t = x.reduce((a,b)=>a+b,0), caja = $('cv-sal').closest('.caja');
  if (!t){ caja.hidden = true; return; } caja.hidden = false;
  const orden = MO.map((_,k) => k).filter(k => x[k]).sort((a,b) => x[b]-x[a]);
  // reparto de 100 celdas por el método del mayor residuo, para que sumen exactamente 100
  const q = orden.map(k => x[k]/t*100), base = q.map(Math.floor); let falta = 100-base.reduce((a,b)=>a+b,0);
  q.map((v,i) => [v-base[i], i]).sort((a,b) => b[0]-a[0]).forEach(r => { if (falta>0){ base[r[1]]++; falta--; } });
  const celdas = []; orden.forEach((k,i) => { for (let c=0;c<base[i];c++) celdas.push('<i data-salm="'+k+'" style="background:'+COLM[k]+';animation-delay:'+(celdas.length*6)+'ms" title="'+esc(MO[k])+'"></i>'); });
  const quien = nna ? (Q.cls>=0 ? 'NNA '+CV.clases[Q.cls].toLowerCase()+'s' : 'NNA canalizados') : 'adultos acompañantes', verbo = { 0:'abandonaron el PAM', 1:'salieron por retorno asistido', 2:'se regularizaron', 3:'fueron deportados', 4:'siguen en proceso', 5:'evadieron', 6:'salieron por otro motivo', 7:'fallecieron' };
  const top3 = orden.slice(0, 3).map((k,i) => '<b style="color:'+COLM[k]+'">'+base[i]+'</b> '+verbo[k]);
  $('cv-sal-q').innerHTML = 'de cada 100 '+quien+', cómo concluyó su canalización'+(nna && Q.cls<0 ? ' · toca una tarjeta de arriba para ver una condición' : '');
  // semana a semana: % del motivo principal
  const S = semanas(), s0 = S[0].w, k0 = orden[0], sem = agg(T, i => (semDe(T.d[i])-s0)*MO.length + T.m[i], S.length*MO.length, {});
  const col = S.map((s,w) => { const tt = MO.reduce((a,_,m) => a+sem[w*MO.length+m], 0); return [s, tt, tt ? sem[w*MO.length+k0]/tt : 0]; }).filter(c => c[1]>0);
  // con más de 20 semanas, las barras se vuelven ilegibles: se agrupa por mes (con el año en enero y en la primera)
  let porMes = false, colM = col;
  if (col.length>20){ porMes = true; const mk = d => { const f = fDia(d); return f.getFullYear()*12+f.getMonth(); }, m0 = mk(Q.d0), nm = mk(Q.d1-1)-m0+1, mm = agg(T, i => (mk(T.d[i])-m0)*MO.length + T.m[i], nm*MO.length, {});
    colM = [...Array(nm).keys()].map(j => { const tt = MO.reduce((a,_,m) => a+mm[j*MO.length+m], 0), y = Math.floor((m0+j)/12), mo = (m0+j)%12, ult = j===nm-1 && fDia(Q.d1-1).getDate()<28;
      return [{ a:0, lab:MES[mo]+(mo===0 || j===0 ? ' '+String(y).slice(2) : ''), full:MES[mo]+' '+y, inc:ult }, tt, tt ? mm[j*MO.length+k0]/tt : 0]; }).filter(c => c[1]>0); }
  $('cv-sal').innerHTML = '<div class="cien cv-sal-w"><div class="cien-g cv-cien" role="img" aria-label="De cada 100 '+quien+'">'+celdas.join('')+'</div><div class="cien-d">'+
      '<p class="cien-f">De cada <b>100</b> '+quien+', '+top3.slice(0, -1).join(', ')+(top3.length>1 ? ' y ' : '')+top3[top3.length-1]+'.</p>'+
      orden.map((k,i) => '<div class="cien-l" data-salm="'+k+'"><i style="background:'+COLM[k]+'"></i><span>'+esc(MO[k])+' <small>'+base[i]+' de cada 100</small></span><b class="num">'+miles(x[k])+'</b></div>').join('')+
      '<div class="cien-l t"><span>Total</span><b class="num">'+miles(t)+'</b></div></div></div>'+
    (colM.length>1 ? '<div class="cien-m"><span class="mini"><b>'+(porMes ? 'Mes a mes' : 'Semana a semana')+'</b> · de cada 100, cuántos '+verbo[k0]+'</span><div class="cien-c cv-cien-c">'+colM.map((c,i) => '<div title="'+(porMes ? cap1(c[0].full) : 'Semana del '+fecha(c[0].a))+' · '+Math.round(c[2]*100)+' de cada 100 ('+miles(c[1])+' en total)'+(c[0].inc ? ' · semana incompleta' : '')+'"><span>'+Math.round(c[2]*100)+'</span>'+
      '<i style="animation-delay:'+(i*40)+'ms"><b style="height:'+(c[2]*100).toFixed(1)+'%;background:'+COLM[k0]+(c[0].inc ? ';opacity:.5' : '')+'"></b><b style="height:'+((1-c[2])*100).toFixed(1)+'%;background:#E2DED0"></b></i><small'+(colM.length>12 && i%3 ? ' class="o"' : '')+'>'+(porMes ? c[0].lab : c[0].lab.replace(/ .*/,''))+'</small></div>').join('')+'</div></div>' : '')+
    '<p class="rg-base">«Abandono de PAM» es como viene en la base; su definición oficial está por confirmar con el área.</p>';
}
function pintarCp(){
  const nna = Q.can==='nna', T = nna ? NNA : ADU, MO = CV.motivos;
  panelP({ t:'cv-cp-t', q:'cv-cp-q', body:'cv-cp', titulo:'¿Qué pasó?', unidad:nna ? 'NNA' : 'adultos', o:{}, total:o => tot(T, o),
    secciones:[{ tit:'Motivo de salida', T:T, key:i => T.m[i], nk:MO.length, nom:k => MO[k], attr:'data-x', quita:{}, n:8, col:ROJO },
               { tit:'Nacionalidades', T:T, key:i => T.n[i], nk:NN, nom:nomN, attr:'data-cn', quita:{nats:null}, sel:Q.nats, n:6 },
               { tit:'Estados (O.R.)', T:T, key:i => T.e[i], nk:NE, nom:nomE, attr:'data-ce', quita:{ests:null}, sel:Q.ests, n:5 }] });
}

/* ==== [8] MONTAJE Y EVENTOS ======================================= */
const INFO = {
  tre:'<b>Rescates en el tiempo</b> por día, semana o mes, con el rango habitual y las temporadas vacacionales. Los presentados se muestran con sus dos fuentes: el reporte de las O.R. (DGCOR) y el sistema (DGCVM).',
  pe:'<b>Composición del periodo:</b> nacionalidades, O.R. y estaciones con más registros, y su cambio contra el periodo anterior de la misma duración.',
  dif:'<b>Dos registros de presentados.</b> El reporte de las O.R. (DGCOR) cuenta a quienes se envían a una estación tras un rescate; el sistema de DGCVM cuenta a quienes quedan presentados. Miden cosas distintas y con cortes distintos, por eso no se suman. La columna «Sistema / O.R.» indica qué parte del reporte aparece en el sistema.',
  rein:'<b>Reincidencia:</b> de cada 100 personas rescatadas de una nacionalidad, cuántas ya habían sido rescatadas antes. Solo se calcula con las O.R. que registran reincidencia; las demás reportan 0. «Más reincidentes» ordena por número de personas (la cifra grande); «Mayor proporción», por cuántas de cada 100 (la cifra grande pasa a ser esa proporción).',
  hze:'<b>Titulares:</b> el cambio de los rescates y de los presentados contra el periodo de comparación, y la nacionalidad con más reincidencia.',
  hzc:'<b>Titulares:</b> el cambio de los canalizados y de los NNA no acompañados contra el periodo de comparación, y la nacionalidad que más cambió.',
  cp:'<b>Composición del periodo:</b> cómo concluyó la canalización (motivo de salida), nacionalidades y O.R., y su cambio contra el periodo anterior de la misma duración.',
  cor:'<b>O.R. que canalizan</b>, de mayor a menor, divididas por condición de los NNA (acompañados, no acompañados o separados) o por sexo de los adultos.',
  rec:'<b>Extranjeros que EE. UU. entregó a México</b>, adultos y menores, según el reporte de las O.R. de la frontera norte (DGCOR). Es otra fuente: no se suma a los canalizados de SIRENNA.',
  tr:'<b>Internaciones legales de extranjeros</b> por día, semana o mes, en total o por vía, nacionalidad u O.R. La franja marca el rango habitual (calculado fuera de vacaciones) y la sombra gris, las temporadas vacacionales. No incluye mexicanos.',
  tp:'<b>Quién entra en el periodo:</b> el reparto por vía (aérea, terrestre y marítima), las 10 nacionalidades, los estados (O.R.) y los puntos de internación con más internaciones.',
  ctend:'<b>Canalizados en el tiempo</b> (SIRENNA), en total o por motivo de salida, condición, nacionalidad u O.R. La línea punteada son los NNA que las O.R. reportan como canalizados al DIF tras un rescate (DGCOR): es otra fuente y no se suma.',
  tot:'<b>Internaciones por nacionalidad, O.R. o punto</b>, de mayor a menor: las 30 principales y el resto sumado en «Otras». No incluye mexicanos.',
  tote:'<b>Totales por nacionalidad, O.R. o estación</b>, de mayor a menor: las 30 principales y el resto sumado en «Otras».',
  perfil:'<b>Qué parte del total nacional corresponde a cada O.R.</b> en internaciones, rechazos, presentados, retornos y canalizados. Muestra el perfil de cada O.R.: una frontera sur concentra presentados y NNA; un aeropuerto, internaciones y rechazos.',
  disp:'<b>Llegadas y rechazos por nacionalidad o punto.</b> Cada círculo es una nacionalidad o un punto de internación: hacia la derecha, más llegadas; hacia arriba, mayor % de rechazo; el tamaño es el número de rechazos. Rojo: arriba del promedio nacional; verde: abajo. Las escalas son logarítmicas para comparar volúmenes grandes y chicos. Llegadas = internados + rechazados, por aire y tierra.',
  emb:() => { const t = tablaRech('n').filter(x => x.r>=100), may = t.slice().sort((a,b) => b.r-a.r)[0], alt = t.slice().sort((a,b) => b.t-a.t)[0], f = v => v>=10 ? Math.round(v) : v.toFixed(1);
    return '<b>¿Por qué «de cada 1,000»?</b> Si solo se cuentan rechazos, siempre ganan las nacionalidades que más viajan. Medirlo de cada 1,000 personas que llegan permite comparar a todas en la misma escala.'+
      (may && alt && may.k!==alt.k ? '<br><br>Ejemplo: <b>'+esc(nomN(may.k))+'</b> tiene más rechazos ('+miles(may.r)+') que <b>'+esc(nomN(alt.k))+'</b> ('+miles(alt.r)+'), pero de cada 1,000 que llegan se rechaza a <b>'+f(may.r/may.ll*1000)+'</b> de '+esc(nomN(may.k))+' y a <b>'+f(alt.r/alt.ll*1000)+'</b> de '+esc(nomN(alt.k))+': proporcionalmente, a quien llega de '+esc(nomN(alt.k))+' se le rechaza más.' : '')+
      '<br><br>«Llegan» = se internaron + fueron rechazadas, por aire y tierra. Solo se listan nacionalidades con 100 rechazos o más, para que unos cuantos casos no exageren la proporción.'; },
  sem:'<b>Casos de segunda revisión por semana</b> (lunes a domingo) y su resultado: rechazo o internación. Las semanas incompletas del inicio y del final van en tono claro.',
  pto:'<b>Puntos de internación</b> ordenados por número de rechazos o por rechazos de cada 1,000 llegadas. No incluye cruceros, que no pasan por segunda revisión.',
  hz:'<b>Titulares:</b> el cambio de las internaciones contra el periodo de comparación, el punto que más rechaza en proporción a sus llegadas y la nacionalidad que concentra más rechazos.',
  fuentes:'<b>Dos fuentes distintas.</b> «Sistema» es lo registrado por DGCVM; «Reporte de las O.R.» es lo que cada Oficina de Representación informa tras un rescate (DGCOR). Miden cosas parecidas con criterios diferentes, por eso no se suman ni se restan.',
  pr:'<b>Presentados y retornos por nacionalidad u O.R.</b> (sistema DGCVM): presentados, retornos asistidos y deportaciones. «Retornan de cada 100» indica cuántos salen del país por cada 100 presentados; no da seguimiento a las mismas personas.',
  mx:'<b>Dónde se presenta cada nacionalidad</b> (sistema DGCVM): presentados por estación u O.R. y por nacionalidad. Más oscuro = más personas.',
  sal:'<b>Cómo concluye la canalización:</b> de cada 100 personas, cuántas salen por cada motivo (retorno asistido, regularización, abandono, etc.), y la evolución semanal del motivo principal.',
  edad:'<b>Edad y sexo de los canalizados</b>, por grupo de edad a la fecha del evento. La fecha de nacimiento no se publica.',
  cnat:'<b>Canalizados por nacionalidad</b>, de mayor a menor, divididos por condición (NNA) o por sexo (adultos).'
};
let popFija = false;
function mostrarInfo(b){ let p = $('cv-pop'); if (!p){ p = document.createElement('div'); p.id = 'cv-pop'; p.className = 'rg-pop fija'; p.setAttribute('role','dialog'); document.body.appendChild(p); }
  if (!b){ p.hidden = true; popFija = false; return; }
  p.innerHTML = '<button class="rg-pop-x" data-cpopx aria-label="Cerrar">×</button>'+(typeof INFO[b.dataset.cinfo]==='function' ? INFO[b.dataset.cinfo]() : INFO[b.dataset.cinfo]); p.hidden = false; popFija = true;
  const r = b.getBoundingClientRect(), w = Math.min(340, innerWidth-24); p.style.width = w+'px'; p.style.left = Math.max(12, Math.min(innerWidth-w-12, r.left-w/2))+'px'; p.style.top = (r.bottom+8+scrollY)+'px'; p.style.position = 'absolute'; }
function cuerpo(){ const c = $('cv-ctl'); if (!c) return; c.innerHTML = htmlCtl(); buscador(); ({ int:pintarInt, est:pintarEst, can:pintarCan })[Q.vista](); }
function montar(cont){
  cont.innerHTML = '<div class="rg cv"><div class="rg-sub"><div><span class="mini">Procesos › DGCVM y DGCOR</span><h1>Control migratorio <button type="button" class="pc-b" data-cvsala aria-label="Pantalla completa" title="Pantalla completa: lo principal en un vistazo"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/></svg><span>Pantalla completa</span></button></h1></div><div class="rg-vistas">'+
    [['int','Internaciones'],['est','Rescates'],['can','Canalizados (NNA)']].map(x => '<button data-cvista="'+x[0]+'" class="'+(Q.vista===x[0]?'on':'')+'">'+x[1]+'</button>').join('')+'</div></div>'+
    '<div class="ctl rg-ctl" id="cv-ctl"></div><div id="cv-body" class="rg-body anim"></div>'+
    (CV.calidad.length ? '<details class="cv-calw"><summary>Notas de calidad de los datos ('+CV.calidad.length+')</summary><ul>'+CV.calidad.map(x => '<li>'+esc(x)+'</li>').join('')+'</ul></details>' : '')+'</div>';
  setTimeout(() => { const b = $('cv-body'); if (b) b.classList.remove('anim'); }, 1100);
  cuerpo();
}
function eventos(cont){
  cont.addEventListener('click', e => { if (!e.target.closest('.cv')) return; const T = s => e.target.closest(s); let b;
    if (T('[data-cvsala]')){ if (window.IANAMI_PULSO && window.IANAMI_PULSO.sala) window.IANAMI_PULSO.sala('control'); return; }
    if ((b = T('[data-cvista]'))){ Q.vista = b.dataset.cvista; Q.sel = null; montar(cont); return; }
    if ((b = T('[data-cinfo]'))){ const p = $('cv-pop'); if (p && !p.hidden && p.dataset.cual===b.dataset.cinfo) mostrarInfo(null); else { mostrarInfo(b); $('cv-pop').dataset.cual = b.dataset.cinfo; } return; }
    if ((b = T('[data-csc]'))){ Q.sc = b.dataset.csc; cuerpo(); return; }
    if ((b = T('[data-crk]'))){ Q.rk = b.dataset.crk; cuerpo(); return; }
    if ((b = T('[data-ccan]'))){ Q.can = Q.can==='adu' ? 'nna' : 'adu'; Q.cls = -1; cuerpo(); return; }
    if ((b = T('[data-ccls]'))){ const k = +b.dataset.ccls; Q.can = 'nna'; Q.cls = Q.cls===k ? -1 : k; cuerpo(); return; }
    if ((b = T('[data-cpulso]'))){ window.IANAMI_PULSO.verNat(DIC.n[+b.dataset.cpulso], 'ing'); return; }
    if ((b = T('[data-cvia]'))){ const k = +b.dataset.cvia; Q.via = k<0 || Q.via===k ? -1 : k; cuerpo(); return; }
    if ((b = T('[data-cem]'))){ Q.em = b.dataset.cem; Q.sel = null; if (['pre','ra','dep'].indexOf(Q.em)>=0) Q.mas.est = true; cuerpo(); return; }
    if (T('[data-cmas]')){ Q.mas[Q.vista] = !Q.mas[Q.vista]; abrirMasC(); return; }
    if ((b = T('[data-cemo]'))){ Q.emo = b.dataset.cemo; cuerpo(); return; }
    if ((b = T('[data-cprm]'))){ Q.prm = b.dataset.cprm; pintarPR(); return; }
    if ((b = T('[data-cgran]'))){ Q.gran = b.dataset.cgran; Q.sel = null; cuerpo(); return; }
    if (T('[data-ceti]')){ Q.eti = !Q.eti; cuerpo(); return; }
    if ((b = T('[data-cdesgi]'))){ Q.desgI = b.dataset.cdesgi; pintarTr(); pintarTp(); return; }
    if ((b = T('[data-cdesge]'))){ Q.desgE = b.dataset.cdesge; cuerpo(); return; }
    if ((b = T('[data-cdesgc]'))){ Q.desgC = b.dataset.cdesgc; cuerpo(); return; }
    if (T('[data-csel]')){ Q.sel = null; ({ int:pintarTp, est:pintarPe, can:pintarCp })[Q.vista](); return; }
    if (T('[data-cdif]')){ ventanaDif(); return; }
    if ((b = T('[data-creo]'))){ Q.reo = b.dataset.creo; pintarRein(); return; }
    if ((b = T('[data-cmxm]'))){ Q.mxm = b.dataset.cmxm; pintarMx(); return; }
    if ((b = T('[data-ce]'))){ alternar(Q.ests, +b.dataset.ce); cuerpo(); return; }
    if (T('[data-cdet]')){ Q.det[Q.vista] = !Q.det[Q.vista]; cuerpo(); return; }
    if (T('[data-cplegar]')){ Q.compacto = !Q.compacto; cuerpo(); return; }
    if ((b = T('[data-cper]'))){ Q.per = b.dataset.cper; if (Q.per==='todo'){ Q.d0 = 0; Q.d1 = CV.dias; } else if (Q.per==='trump'){ Q.d0 = Math.max(0, diaDe('2025-01-20')); Q.d1 = CV.dias; } else if (Q.per==='anio'){ Q.anio = fDia(CV.dias-1).getFullYear(); Q.mes = 0; fijarAnio(); } Q.sel = null; cuerpo(); return; }
    if ((b = T('[data-ctot]'))){ Q.tot = b.dataset.ctot; cuerpo(); return; }
    if ((b = T('[data-ctote]'))){ Q.tote = b.dataset.ctote; cuerpo(); return; }
    if ((b = T('[data-ctotc]'))){ Q.totc = b.dataset.ctotc; cuerpo(); return; }
    if ((b = T('[data-cpt]'))){ agregar('p', +b.dataset.cpt); return; }
    if ((b = T('[data-cn]'))){ alternar(Q.nats, +b.dataset.cn); cuerpo(); return; }
    if ((b = T('[data-cquita]'))){ const k = b.dataset.cquita; if (k==='p') Q.pto = -1; else if (k==='v') Q.via = -1; else if (k[0]==='e') Q.ests.splice(Q.ests.indexOf(+k.slice(1)),1); else Q.nats.splice(Q.nats.indexOf(+k.slice(1)),1); cuerpo(); return; }
  });
  cont.addEventListener('mouseover', e => { const w = e.target.closest('.cv-sal-w'); if (!w) return; const t = e.target.closest('[data-salm]');
    w.classList.toggle('foc', !!t); w.querySelectorAll('[data-salm]').forEach(x => x.classList.toggle('on', !!t && x.dataset.salm===t.dataset.salm)); });
  cont.addEventListener('mouseout', e => { const w = e.target.closest('.cv-sal-w'); if (w && !w.contains(e.relatedTarget)){ w.classList.remove('foc'); w.querySelectorAll('.on').forEach(x => x.classList.remove('on')); } });
  cont.addEventListener('change', e => { if (!e.target.closest('.cv')) return; const id = e.target.id;
    if (id==='cv-cmp'){ Q.cmp = /^\d+$/.test(e.target.value) ? +e.target.value : e.target.value; cuerpo(); }
    if (id==='cv-anio' || id==='cv-mes'){ if (id==='cv-anio'){ Q.anio = +e.target.value; Q.mes = 0; } else Q.mes = +e.target.value; fijarAnio(); Q.sel = null; cuerpo(); return; }
    else if (id==='cv-d0' || id==='cv-d1'){ const a = diaDe($('cv-d0').value), b = diaDe($('cv-d1').value)+1; if (!isNaN(a) && !isNaN(b) && b>a){ Q.d0 = Math.max(0, a); Q.d1 = Math.min(CV.dias, b); Q.sel = null; cuerpo(); } } });
  document.addEventListener('click', e => { const m = $('cv-modal'); if (m && !m.hidden && (e.target.closest('[data-cmodalx]') || e.target===m)) m.hidden = true; });
  document.addEventListener('keydown', e => { const m = $('cv-modal'); if (e.key==='Escape' && m) m.hidden = true; });
  document.addEventListener('click', e => { if (e.target.closest('[data-cpopx]') || (!e.target.closest('#cv-pop, [data-cinfo]') && popFija)) mostrarInfo(null); });
}
let listo = false;
// Recibe filtros desde Pregunta a INAMI («Profundizar en el tablero»): nombres de nacionalidad, O.R. y punto, periodo y vista
function fijar(p){ const ix = (l, nombres) => (nombres || []).map(n => l.indexOf(n)).filter(i => i>=0);
  if (p.vista) Q.vista = p.vista; Q.nats = ix(DIC.n, p.nats).slice(0,3); Q.ests = ix(DIC.e, p.ests).slice(0,3); const pt = ix(DIC.p, p.ptos); Q.pto = pt.length===1 ? pt[0] : -1;
  Q.via = p.via!=null ? p.via : -1; if (p.em) Q.em = p.em; if (p.can) Q.can = p.can; Q.cls = -1; Q.sel = null; if (p.d0 && p.d1){ Q.per = 'pers'; Q.d0 = Math.max(0, diaDe(p.d0)); Q.d1 = Math.min(CV.dias, diaDe(p.d1)+1); if (Q.d1<=Q.d0) Q.d1 = Q.d0+1; } }
window.IANAMI_CONTROL = { pintar(cont){ if (!listo){ eventos(cont); listo = true; } montar(cont); }, fijar:fijar };
})();
