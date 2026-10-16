/* ==================================================================
   IA-NAMI · ANALIZAR
   Dos cosas, con el mismo motor que Pregunta a INAMI (js/consulta.js):
   · Informe migratorio: láminas de una semana (lunes a domingo) contra un
     periodo de referencia, en pantalla completa, con hallazgos y PDF.
   · Análisis y comparaciones: conceptos, nacionalidades, estados y periodos
     lado a lado, también en láminas de pantalla completa.
   Todo se calcula en la página con las bases; nada se captura a mano.
   ÍNDICE  [1] UTILIDADES  [2] FECHAS  [3] VISOR DE LÁMINAS  [4] PIEZAS
           [5] INFORME  [6] ANÁLISIS  [7] PÁGINA  [8] ARRANQUE
   ================================================================== */
(function(){
'use strict';
const M = window.IANAMI_MOTOR; if (!M) return;
const { BASES, INDK, total, porDim, serie, cubetas, medParte, parteDe, finBase, sumaDias, difDias } = M;

/* ==== [1] UTILIDADES ============================================== */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const miles = n => Math.round(n).toLocaleString('en-US');
const corto = n => { const a = Math.abs(n); return a>=1e6 ? (n/1e6).toFixed(2)+' M' : a>=1e4 ? (n/1e3).toFixed(1)+' k' : miles(n); };
const pct = (a, b) => b ? a/b*100 : 0, pc = (a, b) => Math.round(pct(a, b))+'%';
const flecha = x => (x>=0 ? '▲ ' : '▼ ')+Math.abs(x).toFixed(Math.abs(x)<10 ? 1 : 0)+'%';
const cap = s => s ? s[0].toUpperCase()+s.slice(1) : s;
const C = { verde:'#2F6657', vino:'#7E302B', rojo:'#C4605A', ocre:'#8F7F2E', ink:'#2B2926', ink2:'#5C5952', gris:'#9A958A', arena:'#DDD5BE', arena2:'#EDE8D8', linea:'#E2DED0', fondo:'#FCFBF7', salvia:'#778E88' };
const SERIES = ['#2F6657','#7E302B','#8F7F2E','#778E88','#C4605A','#2B2926','#B9A86A','#5E7F9A'];
// Suma de un indicador (con una de sus partes) entre dos fechas; filtros por nombre de valor
function V(k, p, a, b, f){ const ind = INDK[k]; if (!ind) return 0; return total(Object.assign({ ind:ind, d0:a, d1:b, filtros:f || {} }, p ? medParte(ind, parteDe(ind, p)) : {})); }
function S(k, p, a, b, g, f){ const ind = INDK[k], Cb = cubetas(a, b, g); return { C:Cb, v:ind ? serie(Object.assign({ ind:ind, d0:a, d1:b, filtros:f || {} }, p ? medParte(ind, parteDe(ind, p)) : {}), Cb) : Cb.l.map(() => 0) }; }
function D(k, p, a, b, dim, f){ const ind = INDK[k]; if (!ind || !BASES[ind.b].dims[dim]) return []; return porDim(Object.assign({ ind:ind, d0:a, d1:b, filtros:f || {} }, p ? medParte(ind, parteDe(ind, p)) : {}), dim).map(([i,v]) => [BASES[ind.b].dims[dim].vals[i], v]); }
const fin = k => INDK[k] ? finBase(BASES[INDK[k].b]) : null, ini = k => INDK[k] ? BASES[INDK[k].b].inicio : null;

/* ==== [2] FECHAS ================================================== */
const MESC = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'], MESL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const f0 = s => new Date(s+'T00:00:00'), iso = f => f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0')+'-'+String(f.getDate()).padStart(2,'0');
const fx = s => { const f = f0(s); return f.getDate()+' '+MESC[f.getMonth()]; }, fxa = s => fx(s)+' '+f0(s).getFullYear();
const rango = (a, b) => f0(a).getFullYear()===f0(b).getFullYear() ? (f0(a).getMonth()===f0(b).getMonth() ? f0(a).getDate() : fx(a))+' – '+fx(b)+' '+f0(b).getFullYear() : fxa(a)+' – '+fxa(b);
const dSem = s => (f0(s).getDay()+6)%7;
const minS = l => l.filter(Boolean).sort()[0], maxS = l => l.filter(Boolean).sort().slice(-1)[0];
// Corte común del informe: el último día que traen las bases semanales (CBP, rescates, repatriados y recibidos)
const CORTE = minS(['cbp','resc','rep','rec'].map(fin));
// Semanas completas de lunes a domingo que caben en el corte, de la más reciente a la más vieja
function semanas(n){ let b = CORTE; while (dSem(b)!==6) b = sumaDias(b, -1); const l = []; for (let i=0;i<n;i++){ l.push([sumaDias(b, -6), b]); b = sumaDias(b, -7); } return l; }
const REF = { trump:['Periodo Trump', '2025-01-20'], sheinbaum:['Periodo Sheinbaum', '2024-10-01'], anio:['En el año', null] };
const refIni = (r, b) => r==='anio' ? f0(b).getFullYear()+'-01-01' : REF[r][1];
const esSemana = (a, b) => dSem(a)===0 && difDias(a, b)===6;
const enPer = X => X.etR.replace(/^Periodo/, 'periodo').replace(/^En el año/, 'año');

/* ==== [3] VISOR DE LÁMINAS ======================================== */
// Láminas 16:9 que llenan la pantalla. --u es 1% del ancho de la lámina: todo se mide con esa unidad (también las gráficas).
let VISOR = null;
function abrirVisor(o){
  cerrarVisor(); const el = document.createElement('div'); el.className = 'inf'; el.setAttribute('role','dialog'); el.setAttribute('aria-label', o.titulo);
  const L = o.laminas;
  el.innerHTML = '<div class="inf-st" id="inf-st"><div class="inf-tr" id="inf-tr">'+L.map((l,i) => '<section class="inf-sl" data-i="'+i+'" aria-roledescription="lámina" aria-label="'+esc(l.tit)+'">'+l.html+
      (l.hz && l.hz.length ? '<aside class="inf-hz" hidden><h4>Hallazgos</h4><ol>'+l.hz.map((h,j) => '<li style="--d:'+(j*0.12+0.1)+'s">'+h+'</li>').join('')+'</ol></aside>'+
        '<button class="inf-hzb" data-infhz aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Hallazgos</span><b>'+l.hz.length+'</b></button>' : '')+
      '<footer class="inf-pie"><span>'+esc(l.fte || '')+'</span><span>IA-NAMI · '+esc(o.pie || '')+' · '+(i+1)+'/'+L.length+'</span></footer></section>').join('')+'</div></div>'+
    '<div class="inf-ctl"><div class="inf-ctl-t"><b>'+esc(o.titulo)+'</b><span>'+esc(o.sub || '')+'</span></div>'+
      '<div class="inf-ctl-b"><button data-infpdf title="Descargar PDF"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>PDF</span></button>'+
      (o.liga ? '<button data-infliga title="Compartir"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 12h8M12 8l4 4-4 4M4 5v14h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Compartir</span></button>' : '')+
      '<button data-infx title="Cerrar (Esc)" aria-label="Cerrar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div></div>'+
    '<button class="inf-fl iz" data-infmov="-1" aria-label="Lámina anterior"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'+
    '<button class="inf-fl de" data-infmov="1" aria-label="Lámina siguiente"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'+
    '<nav class="inf-pt" aria-label="Láminas">'+L.map((l,i) => '<button data-infir="'+i+'" title="'+esc(l.tit)+'" aria-label="'+esc(l.tit)+'"></button>').join('')+'</nav><div class="inf-gira" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM19 8a5 5 0 0 1 0 8M21 6v4h-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Gira el teléfono para ver la lámina completa</div><div class="inf-msg" id="inf-msg" role="status"></div>';
  document.body.appendChild(el); document.body.classList.add('en-inf');
  VISOR = { el:el, o:o, i:0, ch:[] };
  medir(); dibujar(); ir(Math.max(0, Math.min(L.length-1, o.inicio || 0)), true);
  if (document.documentElement.requestFullscreen && !document.fullscreenElement && o.completa!==false) document.documentElement.requestFullscreen().catch(() => {});
  eventosVisor(el);
}
function cerrarVisor(){ if (!VISOR) return; VISOR.ch.forEach(c => c.dispose()); VISOR.el.remove(); document.body.classList.remove('en-inf'); window.removeEventListener('resize', alCambiar); document.removeEventListener('keydown', teclas); VISOR = null;
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); }
// La lámina más grande que cabe en la pantalla, siempre 16:9
function medir(){ if (!VISOR) return; const w = innerWidth, h = innerHeight, W = Math.min(w-16, (h-104)*16/9), st = $('inf-st');
  st.style.width = W+'px'; st.style.height = (W*9/16)+'px'; VISOR.U = W/100; VISOR.el.style.setProperty('--u', VISOR.U+'px'); }
function dibujar(){ const V0 = VISOR; V0.ch.forEach(c => c.dispose()); V0.ch = [];
  V0.o.laminas.forEach((l, i) => (l.graf || []).forEach(g => { const el = V0.el.querySelector('.inf-sl[data-i="'+i+'"] #'+g.id); if (!el) return;
    const ch = echarts.init(el, null, { devicePixelRatio:Math.max(2, window.devicePixelRatio || 1) }); ch.setOption(g.op(V0.U)); V0.ch.push(ch); })); }
let tCambio = 0; function alCambiar(){ clearTimeout(tCambio); tCambio = setTimeout(() => { medir(); dibujar(); ir(VISOR.i, true); }, 120); }
function ir(i, sin){ const V0 = VISOR; if (!V0) return; const n = V0.o.laminas.length; i = Math.max(0, Math.min(n-1, i)); V0.i = i;
  const tr = $('inf-tr'); tr.style.transition = sin ? 'none' : ''; tr.style.transform = 'translateX('+(-i*100)+'%)';
  V0.el.querySelectorAll('[data-infir]').forEach((b,j) => b.classList.toggle('on', j===i));
  V0.el.querySelector('.inf-fl.iz').disabled = i===0; V0.el.querySelector('.inf-fl.de').disabled = i===n-1;
  V0.el.querySelectorAll('.inf-sl').forEach((s,j) => { s.classList.toggle('activa', j===i); s.setAttribute('aria-hidden', j!==i); }); }
function hallazgos(sl, on){ const a = sl.querySelector('.inf-hz'), b = sl.querySelector('[data-infhz]'); if (!a) return; on = on==null ? a.hidden : on; a.hidden = !on; b.classList.toggle('on', on); b.setAttribute('aria-expanded', on); }
function teclas(e){ if (!VISOR) return; if (e.key==='ArrowRight' || e.key==='PageDown'){ ir(VISOR.i+1); e.preventDefault(); } else if (e.key==='ArrowLeft' || e.key==='PageUp'){ ir(VISOR.i-1); e.preventDefault(); } else if (e.key==='Escape') cerrarVisor(); }
function eventosVisor(el){
  window.addEventListener('resize', alCambiar); document.addEventListener('keydown', teclas);
  el.addEventListener('click', e => { const T = s => e.target.closest(s); let b;
    if ((b = T('[data-infmov]'))) return ir(VISOR.i + +b.dataset.infmov);
    if ((b = T('[data-infir]'))) return ir(+b.dataset.infir);
    if ((b = T('[data-infhz]'))) return hallazgos(b.closest('.inf-sl'));
    if (T('[data-infx]')) return cerrarVisor();
    if (T('[data-infpdf]')) return pdf();
    if (T('[data-infliga]')) return compartir(); });
  // deslizar con el dedo (tableta): un gesto horizontal de más de 50 px cambia de lámina
  let x0 = null, y0 = 0; const st = $('inf-st');
  st.addEventListener('pointerdown', e => { if (e.target.closest('button, .inf-hz')) return; x0 = e.clientX; y0 = e.clientY; });
  st.addEventListener('pointerup', e => { if (x0==null) return; const dx = e.clientX-x0, dy = e.clientY-y0; x0 = null; if (Math.abs(dx)>50 && Math.abs(dx)>Math.abs(dy)*1.3) ir(VISOR.i + (dx<0 ? 1 : -1)); });
  st.addEventListener('pointercancel', () => { x0 = null; });
}
function aviso(t){ const m = $('inf-msg'); if (!m) return; m.textContent = t; m.classList.add('on'); clearTimeout(aviso.t); aviso.t = setTimeout(() => m.classList.remove('on'), 3200); }
// PDF: una lámina por página, del tamaño de la lámina. Se dibuja cada lámina con sus gráficas y los hallazgos en la última página.
async function pdf(){ const V0 = VISOR; if (!V0) return; aviso('Preparando el PDF…');
  try { if (!window.html2canvas || !window.jspdf) await window.IANAMI_LIBS_PDF();
    const st = $('inf-st'), w = st.offsetWidth, h = st.offsetHeight, { jsPDF } = window.jspdf, doc = new jsPDF({ orientation:'landscape', unit:'px', format:[1600, 900], hotfixes:['px_scaling'] }), i0 = V0.i;
    V0.el.classList.add('imprimiendo');
    for (let i=0;i<V0.o.laminas.length;i++){ ir(i, true); await new Promise(r => setTimeout(r, 140)); const sl = V0.el.querySelector('.inf-sl[data-i="'+i+'"]');
      const cv = await html2canvas(sl, { scale:1600/w*1.5, backgroundColor:'#FCFBF7', useCORS:true, width:w, height:h, ignoreElements:x => x.classList && (x.classList.contains('inf-hzb') || x.classList.contains('inf-hz')) });
      if (i) doc.addPage([1600, 900], 'landscape'); doc.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 1600, 900); }
    V0.el.classList.remove('imprimiendo'); ir(i0, true);
    doc.save((V0.o.archivo || 'informe')+'.pdf'); aviso('PDF descargado.');
  } catch(err){ V0.el.classList.remove('imprimiendo'); aviso('No se pudo generar el PDF. Inténtalo de nuevo.'); } }
async function compartir(){ const u = VISOR.o.liga; try { if (navigator.share){ await navigator.share({ title:VISOR.o.titulo, url:u }); return; } } catch(e){ if (e && e.name==='AbortError') return; }
  try { await navigator.clipboard.writeText(u); aviso('Liga copiada: quien la abra verá este mismo informe con los datos del tablero.'); } catch(e){ aviso(u); } }

/* ==== [4] PIEZAS ================================================== */
// Encabezado de lámina, bandas de cifras, reparto 100% y gráficas con la unidad de la lámina
const enc = (t1, t2, et) => '<header class="inf-h"><span class="inf-lo">IA-NAMI <small>'+(et || 'Informe migratorio')+'</small></span><h2><b>'+t1+'</b> '+(t2 || '')+'</h2></header>';
const chip = (a, b, txt) => b ? '<span class="inf-chip '+(a>=b ? 'u' : 'd')+'">'+flecha(pct(a, b)-100)+' <small>'+txt+'</small></span>' : '';
function reparto(l, tot){ return '<div class="inf-rp">'+l.map(x => '<span class="inf-rp-s" style="flex:'+Math.max(x.v, tot*0.06)+' 1 0;--c:'+x.c+'"><b>'+x.nom+' '+pc(x.v, tot)+'</b><i>'+miles(x.v)+'</i></span>').join('')+'</div>'; }
function banda(o){ return '<div class="inf-bd '+(o.tono || '')+'"><div class="inf-bd-l"><b>'+o.eti+'</b><span>'+o.fechas+'</span></div>'+
  '<div class="inf-bd-n"><span class="num">'+miles(o.n)+'</span><span class="u">'+o.uni+'</span><small>promedio diario <b>'+miles(o.prom)+'</b>'+(o.chip || '')+'</small></div>'+(o.rp ? reparto(o.rp, o.n) : '')+'</div>'; }
const caja = (tit, sub, cuerpo, cls) => '<div class="inf-c '+(cls || '')+'"><h3>'+tit+(sub ? ' <small>'+sub+'</small>' : '')+'</h3>'+cuerpo+'</div>';
// Opciones comunes de las gráficas: tamaños en --u, rejilla tenue, eje en miles cortos
const ejeX = (u, data, o) => Object.assign({ type:'category', data:data, axisTick:{ show:false }, axisLine:{ lineStyle:{ color:'#C9C4B5' } }, axisLabel:{ color:C.ink2, fontSize:u*0.72, hideOverlap:true } }, o || {});
const ejeY = u => ({ type:'value', splitLine:{ lineStyle:{ color:'#ECE8DC' } }, axisLabel:{ color:C.ink2, fontSize:u*0.68, formatter:v => corto(v) } });
const ley = (u, l) => ({ top:0, left:0, itemWidth:u*1.1, itemHeight:u*0.55, itemGap:u*1.4, textStyle:{ fontSize:u*0.78, color:C.ink2 }, data:l });
const tip = u => ({ trigger:'axis', confine:true, textStyle:{ fontSize:Math.max(12, u*0.8) }, valueFormatter:v => v==null ? '—' : miles(v) });
const linea = (u, nom, data, col, o) => Object.assign({ name:nom, type:'line', data:data, symbol:'circle', symbolSize:u*0.42, lineStyle:{ width:u*0.17, color:col }, itemStyle:{ color:col }, emphasis:{ focus:'series' } }, o || {});
// Etiqueta solo en el último punto y en el máximo de la serie: lo demás se lee en el eje
function marcas(data, u, col){ let mx = -1, j = -1; data.forEach((v,i) => { if (v!=null && v>mx){ mx = v; j = i; } }); const ult = data.length-1;
  return data.map((v,i) => (i===ult || i===j) && v!=null ? { value:v, label:{ show:true, position:'top', fontSize:u*0.72, fontWeight:700, color:col, formatter:p => miles(p.value) } } : v); }
const etiq = c => c.g==='m' ? c.l.map(x => MESC[f0(x.a).getMonth()]+' '+String(f0(x.a).getFullYear()).slice(2)) : c.g==='s' ? c.l.map(x => fx(x.a)) : c.l.map(x => fx(x.a));

/* ==== [5] INFORME ================================================= */
function datosInforme(a, b, ref){
  const r0 = refIni(ref, b), dias = difDias(a, b)+1, dR = difDias(r0, b)+1, pa = sumaDias(a, -dias), pb = sumaDias(a, -1), sem = esSemana(a, b);
  const eti = sem ? 'Semana' : 'Periodo personalizado', fch = rango(a, b), etR = REF[ref][0]+(ref==='anio' ? ' '+f0(b).getFullYear() : ''), fchR = rango(r0, b);
  const ano0 = f0(b).getFullYear()+'-01-01';
  return { a, b, ref, r0, dias, dR, pa, pb, sem, eti, fch, etR, fchR, ano0, anoAnt:(f0(b).getFullYear()-1)+'' };
}
function laminaPortada(X){
  const idx = ['Encuentros con extranjeros por CBP','Encuentros por sector de la CBP','Mexicanos y extranjeros recibidos de EE. UU.','Mexicanos repatriados por tipo de retorno','Extranjeros rescatados por el INM','Caravanas migrantes','Hallazgos'];
  return { tit:'Portada', fte:'', html:'<div class="inf-port"><div class="inf-port-a"><span class="inf-lo">IA-NAMI <small>Inteligencia migratoria · INM</small></span>'+
    '<h1><b>INFORME</b> MIGRATORIO</h1><div class="inf-port-r"></div><p class="inf-port-f">'+(X.sem ? 'Semana del <b>'+fx(X.a)+'</b> al <b>'+fxa(X.b)+'</b>' : 'Periodo personalizado: <b>'+rango(X.a, X.b)+'</b>')+'</p>'+
    '<p class="inf-port-p">Referencia: '+esc(X.etR)+' · '+X.fchR+'</p><p class="inf-port-c">Datos de las bases del INM y de la CBP · generado el '+fxa(iso(new Date()))+'</p></div>'+
    '<ol class="inf-port-i">'+idx.map((t,i) => '<li data-infir="'+(i+1)+'"><b>'+String(i+1).padStart(2,'0')+'</b>'+t+'</li>').join('')+'</ol></div>' };
}
// Lámina 1: encuentros de la CBP (en EE. UU.), semana y periodo, por semana en el año y por mes desde el inicio del periodo
function laminaCBP(X){
  const t = V('cbp', null, X.a, X.b), mx = V('cbp', 'mx', X.a, X.b), ex = t-mx, tp = V('cbp', null, X.pa, X.pb);
  const T = V('cbp', null, X.r0, X.b), MX = V('cbp', 'mx', X.r0, X.b);
  const w0 = (() => { let s = X.ano0; while (dSem(s)!==0) s = sumaDias(s, 1); return s; })();
  const sw = S('cbp', null, w0, X.b, 's'), swm = S('cbp', 'mx', w0, X.b, 's'), swr = S('resc', null, w0, X.b, 's');
  const sm = S('cbp', null, X.r0, X.b, 'm'), smm = S('cbp', 'mx', X.r0, X.b, 'm');
  const lw = etiq(sw.C), lm = etiq(sm.C), sx = sw.v.map((v,i) => v-swm.v[i]), smx = sm.v.map((v,i) => v-smm.v[i]);
  const semR = sumaDias(X.a, 0), sec = D('cbp', null, X.a, X.b, 'sec'), ult4 = sw.v.slice(-5, -1), prom4 = ult4.length ? ult4.reduce((x,y)=>x+y,0)/ult4.length : 0;
  const hz = [];
  if (tp) hz.push('<b>'+miles(t)+'</b> encuentros en la semana: '+(t>=tp ? 'suben ' : 'bajan ')+'<b>'+Math.abs(pct(t, tp)-100).toFixed(1)+'%</b> contra la anterior ('+miles(tp)+').');
  if (prom4) hz.push('Contra el promedio de las 4 semanas previas ('+miles(prom4)+'): <b>'+flecha(pct(t, prom4)-100)+'</b>.');
  hz.push('<b>'+pc(mx, t)+'</b> de los encuentros de la semana son de mexicanos; en el '+esc(enPer(X))+', <b>'+pc(MX, T)+'</b>.');
  if (sec.length) hz.push('El sector con más encuentros en la semana es <b>'+esc(sec[0][0])+'</b> ('+miles(sec[0][1])+', '+pc(sec[0][1], t)+').');
  const rs = V('resc', null, X.a, X.b); if (rs && ex) hz.push('En la misma semana el INM rescató a <b>'+miles(rs)+'</b> extranjeros en México; la CBP encontró a <b>'+miles(ex)+'</b> extranjeros en su frontera.');
  return { tit:'Encuentros con extranjeros por CBP', fte:'Fuente: CBP (encuentros en la frontera de EE. UU. con México) · rescates: DGCOR. Semanas de lunes a domingo.', hz:hz,
    html:enc('ENCUENTROS', 'POR LA CBP')+'<div class="inf-bds">'+
      banda({ eti:X.eti, fechas:X.fch, n:t, uni:'encuentros', prom:t/X.dias, chip:X.sem ? chip(t, tp, 'vs semana anterior') : '', rp:[{ nom:'MEX', v:mx, c:C.verde }, { nom:'EXT', v:ex, c:C.vino }], tono:'a' })+
      banda({ eti:X.etR, fechas:X.fchR, n:T, uni:'encuentros', prom:T/X.dR, rp:[{ nom:'MEX', v:MX, c:C.verde }, { nom:'EXT', v:T-MX, c:C.vino }], tono:'b' })+'</div>'+
      '<div class="inf-g2">'+caja('Encuentros por semana · '+f0(X.b).getFullYear(), 'total, mexicanos y extranjeros; punteada: rescates del INM', '<div id="g-cbp-s" class="inf-gr"></div>')+
        caja('Encuentros por mes', X.fchR+' · mexicanos y extranjeros', '<div id="g-cbp-m" class="inf-gr"></div>')+'</div>',
    graf:[{ id:'g-cbp-s', op:u => ({ grid:{ left:u*3.4, right:u*1.2, top:u*3, bottom:u*2.2 }, legend:ley(u, ['Total','Mexicanos','Extranjeros','Rescates INM']), tooltip:tip(u), xAxis:ejeX(u, lw), yAxis:ejeY(u),
        series:[linea(u, 'Total', marcas(sw.v, u, C.ink), C.ink), linea(u, 'Mexicanos', swm.v, C.verde), linea(u, 'Extranjeros', sx, C.vino), linea(u, 'Rescates INM', swr.v, C.ocre, { lineStyle:{ width:u*0.13, color:C.ocre, type:[u*0.4, u*0.3] }, symbolSize:u*0.3 })] }) },
      { id:'g-cbp-m', op:u => ({ grid:{ left:u*3.4, right:u*1.2, top:u*3, bottom:u*2.2 }, legend:ley(u, ['Mexicanos','Extranjeros']), tooltip:tip(u), xAxis:ejeX(u, lm), yAxis:ejeY(u),
        series:[{ name:'Mexicanos', type:'bar', stack:'t', data:smm.v, itemStyle:{ color:C.verde }, barMaxWidth:u*2.2 }, { name:'Extranjeros', type:'bar', stack:'t', data:smx, itemStyle:{ color:C.vino, borderRadius:[u*0.25,u*0.25,0,0] }, barMaxWidth:u*2.2,
          label:{ show:true, position:'top', fontSize:u*0.6, color:C.ink, formatter:p => corto(sm.v[p.dataIndex]) } }] }) }] };
}
// Lámina 2: sectores de la CBP, de oeste a este, con el estado mexicano con el que colindan
const SECTOR = { 'San Diego':[[-117.0,32.6],'Baja California'], 'El Centro':[[-115.55,32.75],'Baja California'], 'Yuma':[[-114.6,32.55],'Sonora'], 'Tucson':[[-110.95,31.45],'Sonora'], 'El Paso':[[-106.5,31.75],'Chihuahua'],
  'Big Bend':[[-103.6,29.6],'Chihuahua / Coahuila'], 'Del Rio':[[-100.9,29.4],'Coahuila'], 'Laredo':[[-99.5,27.5],'Coahuila / N. León / Tamaulipas'], 'Rio Grande':[[-98.2,26.2],'Tamaulipas'] };
function mapaRegion(){ if (echarts.getMap('inf-region')) return true; const G = window.IANAMI_GEO; if (!G) return false;
  echarts.registerMap('inf-region', { type:'FeatureCollection', features:G.features.filter(f => f.properties.t==='m' || f.properties.t==='u') }); return true; }
function laminaSectores(X){
  const T = V('cbp', null, X.r0, X.b), MX = V('cbp', 'mx', X.r0, X.b), l = D('cbp', null, X.r0, X.b, 'sec'), lm = new Map(D('cbp', 'mx', X.r0, X.b, 'sec')), ls = new Map(D('cbp', null, X.a, X.b, 'sec')), lp = new Map(D('cbp', null, X.pa, X.pb, 'sec'));
  const fil = l.map(([n,v],i) => ({ n, v, mx:lm.get(n) || 0, ex:v-(lm.get(n) || 0), s:ls.get(n) || 0, p:lp.get(n) || 0, r:i+1 }));
  const hz = [], top3 = fil.slice(0,3).reduce((x,f) => x+f.v, 0);
  if (fil.length>=3) hz.push('<b>'+fil.slice(0,3).map(f => esc(f.n)).join(', ')+'</b> concentran <b>'+pc(top3, T)+'</b> de los encuentros del '+esc(enPer(X))+'.');
  const ext = fil.filter(f => f.v>=1000).sort((a,b) => b.ex/b.v-a.ex/a.v)[0]; if (ext) hz.push('Donde más pesan los extranjeros: <b>'+esc(ext.n)+'</b>, con <b>'+pc(ext.ex, ext.v)+'</b> de sus encuentros.');
  const cam = fil.filter(f => f.p>=50).map(f => [f, f.s-f.p]).sort((a,b) => Math.abs(b[1])-Math.abs(a[1]))[0];
  if (cam && cam[1]) hz.push('En la semana, el cambio más grande fue en <b>'+esc(cam[0].n)+'</b>: '+miles(cam[0].p)+' → '+miles(cam[0].s)+' (<b>'+flecha(pct(cam[0].s, cam[0].p)-100)+'</b>).');
  const mxv = Math.max(1, ...fil.map(f => f.v));
  const tabla = '<table class="inf-tb"><thead><tr><th>#</th><th>Sector</th><th>Colinda con</th><th class="x">Total</th><th class="x">MEX</th><th class="x">EXT</th><th class="x">Semana</th></tr></thead><tbody>'+
    fil.map(f => '<tr><td><b class="inf-rk">'+f.r+'</b></td><td><b>'+esc(f.n)+'</b><span class="inf-tb-b"><i style="width:'+(f.mx/mxv*100).toFixed(1)+'%;background:'+C.verde+'"></i><i style="width:'+(f.ex/mxv*100).toFixed(1)+'%;background:'+C.vino+'"></i></span></td><td class="m">'+esc((SECTOR[f.n] || [0,''])[1])+'</td>'+
      '<td class="x"><b>'+miles(f.v)+'</b> <small>'+pc(f.v, T)+'</small></td><td class="x">'+miles(f.mx)+'</td><td class="x">'+miles(f.ex)+'</td><td class="x">'+miles(f.s)+(f.p ? ' <small class="'+(f.s>=f.p ? 'u' : 'd')+'">'+(f.s>=f.p ? '▲' : '▼')+'</small>' : '')+'</td></tr>').join('')+'</tbody></table>';
  return { tit:'Encuentros por sector de la CBP', fte:'Fuente: CBP. Sectores de la Patrulla Fronteriza y puertos de entrada, ordenados de mayor a menor. «Semana»: '+X.fch+'.', hz:hz,
    html:enc('ENCUENTROS POR SECTOR', '· '+esc(X.etR)+' · '+X.fchR)+
      '<div class="inf-sec"><div class="inf-sec-k"><div class="inf-kk v"><span>Mexicanos</span><b class="num">'+miles(MX)+'</b><small>'+pc(MX, T)+'</small></div><div class="inf-kk r"><span>Extranjeros</span><b class="num">'+miles(T-MX)+'</b><small>'+pc(T-MX, T)+'</small></div><div class="inf-kk"><span>Total</span><b class="num">'+miles(T)+'</b><small>'+miles(T/X.dR)+' por día</small></div></div>'+
      '<div class="inf-c inf-sec-m"><div id="g-sec" class="inf-gr"></div></div><div class="inf-c inf-sec-t">'+tabla+'</div></div>',
    graf:[{ id:'g-sec', op:u => { if (!mapaRegion()) return {}; const mv = Math.max(1, ...fil.map(f => f.v));
      return { backgroundColor:'#E4E1D5', geo:{ map:'inf-region', nameProperty:'key', roam:false, silent:true, boundingCoords:[[-119.2,34.6],[-95.8,24.4]], aspectScale:0.86, layoutCenter:['50%','50%'], layoutSize:'100%',
          itemStyle:{ areaColor:'#F7F5EE', borderColor:'#CFCBBB', borderWidth:0.6 }, regions:window.IANAMI_GEO.features.filter(f => f.properties.t==='m').map(f => ({ name:f.properties.key, itemStyle:{ areaColor:'#FBFAF6', borderColor:'#B9B4A6' } })) },
        tooltip:{ confine:true, textStyle:{ fontSize:Math.max(12, u*0.8) }, formatter:p => '<b>'+esc(p.data.n)+'</b><br>'+miles(p.data.v)+' encuentros · '+pc(p.data.mx, p.data.v)+' mexicanos' },
        series:[{ type:'scatter', coordinateSystem:'geo', data:fil.filter(f => SECTOR[f.n]).map(f => ({ n:f.n, v:f.v, mx:f.mx, value:SECTOR[f.n][0].concat(f.v) })),
          symbolSize:d => u*0.9 + Math.sqrt(d[2]/mv)*u*4.6, itemStyle:{ color:'rgba(126,48,43,.78)', borderColor:'#fff', borderWidth:1.5 },
          label:{ show:true, position:'top', fontSize:u*0.78, color:C.ink, fontWeight:600, formatter:p => fil.find(f => f.n===p.data.n).r+'° '+p.data.n+'\n{v|'+corto(p.data.v)+'}', rich:{ v:{ fontSize:u*0.7, color:C.ink2, fontWeight:500 } } }, labelLayout:{ hideOverlap:true } }] }; } }] };
}
// Lámina 3: personas que EE. UU. entrega a México (mexicanos repatriados + extranjeros recibidos)
function laminaRecibidos(X){
  const mx = V('rep', null, X.a, X.b), ex = V('rec', null, X.a, X.b), t = mx+ex, tp = V('rep', null, X.pa, X.pb)+V('rec', null, X.pa, X.pb);
  const MX = V('rep', null, X.r0, X.b), EX = V('rec', null, X.r0, X.b), T = MX+EX;
  const aer = V('rep', 'aer', X.a, X.b), ter = mx-aer, pa = BASES.rep.dims.p.vals, AE = pa.map((n,i) => /vuelos/.test(n) ? i : -1).filter(i => i>=0);
  // vuelos PRIM: días con llegada y personas por aeropuerto en la semana (el archivo no trae número de vuelos)
  const prim = AE.map(i => { const nom = pa[i].replace(/\s*\(vuelos.*$/,''), f = { p:[i] }, Cb = cubetas(X.a, X.b, 'd'), s = serie(Object.assign({ ind:INDK.rep, d0:X.a, d1:X.b, filtros:f }, medParte(INDK.rep, parteDe(INDK.rep, 'aer'))), Cb);
    return { nom, v:s.reduce((x,y)=>x+y,0), d:s.filter(Boolean).length }; }).filter(x => x.v).sort((a,b) => b.v-a.v);
  const ghF = fin('gh'), ghOk = INDK.gh && ghF>=X.b, ghS = INDK.gh ? V('gh', null, X.a, X.b) : 0, ghL = INDK.gh ? D('gh', null, ini('gh'), ghF, 'pa') : [], ghT = ghL.reduce((x,y) => x+y[1], 0);
  const w0 = (() => { let s = X.ano0; while (dSem(s)!==0) s = sumaDias(s, 1); return s; })(), smx = S('rep', null, w0, X.b, 's'), sex = S('rec', null, w0, X.b, 's'), lw = etiq(smx.C), st = smx.v.map((v,i) => v+sex.v[i]);
  const hz = [];
  if (tp) hz.push('<b>'+miles(t)+'</b> personas recibidas de EE. UU. en la semana: <b>'+flecha(pct(t, tp)-100)+'</b> contra la anterior.');
  hz.push('<b>'+pc(aer, mx)+'</b> de los mexicanos llegaron en vuelos PRIM ('+miles(aer)+') y '+pc(ter, mx)+' por garitas y puentes ('+miles(ter)+').');
  if (prim.length) hz.push('Aeropuerto con más llegadas: <b>'+esc(prim[0].nom)+'</b>, '+miles(prim[0].v)+' personas en '+prim[0].d+' '+(prim[0].d===1 ? 'día' : 'días')+' con vuelo.');
  hz.push('Los extranjeros son <b>'+pc(ex, t)+'</b> de lo recibido en la semana ('+miles(ex)+'); en el '+esc(enPer(X))+', '+pc(EX, T)+'.');
  const cajaAer = caja(miles(aer)+' connacionales vía aérea', 'vuelos PRIM · '+X.fch, prim.length ? '<ul class="inf-ls">'+prim.map(p => '<li><b>'+esc(p.nom)+'</b><span>'+p.d+' '+(p.d===1 ? 'día' : 'días')+'</span><i>'+miles(p.v)+'</i></li>').join('')+'</ul><p class="inf-nt">Días con llegada: el archivo no trae el número de vuelos.</p>' : '<p class="inf-nt">Sin llegadas aéreas en el periodo.</p>', 'inf-c-k');
  const cajaTer = caja(miles(ter + (ghOk ? ghS : 0))+' connacionales vía terrestre', X.fch, '<div class="inf-dos"><div><b class="num">'+miles(ter)+'</b><span>Frontera norte<br><small>garitas y puentes</small></span></div><div><b class="num">'+(ghOk ? miles(ghS) : '—')+'</b><span>Frontera sur<br><small>'+(ghOk ? 'Guatemala y Honduras' : 'sin datos de la semana · último dato '+fx(ghF))+'</small></span></div></div>', 'inf-c-k');
  const cajaGH = INDK.gh ? caja(miles(ghT)+' mexicanos enviados por EE. UU. a otros países', rango(ini('gh'), ghF), '<div class="inf-dos">'+ghL.map(([n,v]) => '<div><b class="num">'+miles(v)+'</b><span>'+esc(n)+'</span></div>').join('')+'</div>', 'inf-c-k') : '';
  return { tit:'Mexicanos y extranjeros recibidos de EE. UU.', fte:'Fuente: DGPMV (repatriados, Guatemala y Honduras) y DGCOR (extranjeros recibidos). La frontera sur ya está contada en Repatriados (Ciudad Hidalgo).', hz:hz,
    html:enc('MEXICANOS Y EXTRANJEROS RECIBIDOS', 'DE EE. UU.')+'<div class="inf-bds uno">'+banda({ eti:X.eti, fechas:X.fch, n:t, uni:'recibidos', prom:t/X.dias, chip:X.sem ? chip(t, tp, 'vs semana anterior') : '', rp:[{ nom:'MEX', v:mx, c:C.verde }, { nom:'EXT', v:ex, c:C.vino }], tono:'a' })+'</div>'+
      '<div class="inf-g12"><div class="inf-col">'+cajaAer+cajaTer+cajaGH+'</div>'+caja('Personas devueltas por EE. UU., por semana', f0(X.b).getFullYear()+' · total, mexicanos y extranjeros', '<div id="g-rec" class="inf-gr"></div>')+'</div>'+
      '<div class="inf-bds uno pie">'+banda({ eti:X.etR, fechas:X.fchR, n:T, uni:'recibidos', prom:T/X.dR, rp:[{ nom:'MEX', v:MX, c:C.verde }, { nom:'EXT', v:EX, c:C.vino }], tono:'b' })+'</div>',
    graf:[{ id:'g-rec', op:u => ({ grid:{ left:u*3.4, right:u*1.2, top:u*3, bottom:u*2.2 }, legend:ley(u, ['Total','Mexicanos','Extranjeros']), tooltip:tip(u), xAxis:ejeX(u, lw), yAxis:ejeY(u),
      series:[{ name:'Total', type:'bar', data:st, itemStyle:{ color:C.arena, borderRadius:[u*0.2,u*0.2,0,0] }, barMaxWidth:u*1.6 }, linea(u, 'Mexicanos', marcas(smx.v, u, C.verde), C.verde), linea(u, 'Extranjeros', sex.v, C.vino)] }) }] };
}
// Lámina 4: repatriados por tipo de retorno (garitas y puentes contra vuelos PRIM), por semana y por año
function laminaRetorno(X){
  const T = V('rep', null, X.r0, X.b), A = V('rep', 'aer', X.r0, X.b);
  let w0 = X.r0; while (dSem(w0)!==0) w0 = sumaDias(w0, 1);
  const st = S('rep', null, w0, X.b, 's'), sa = S('rep', 'aer', w0, X.b, 's'), ster = st.v.map((v,i) => v-sa.v[i]), lw = etiq(st.C);
  const anos = []; for (let y = f0(X.r0).getFullYear(); y<=f0(X.b).getFullYear(); y++){ const a = maxS([X.r0, y+'-01-01']), b = minS([X.b, y+'-12-31']); const t = V('rep', null, a, b), ae = V('rep', 'aer', a, b); anos.push({ y, a, b, t, ae, te:t-ae }); }
  const ja = st.C.l.findIndex(c => c.a.slice(0,4)!==st.C.l[0].a.slice(0,4)), hz = [];
  if (anos.length>1){ const p = anos[anos.length-2], u = anos[anos.length-1]; hz.push('La vía aérea pasó de <b>'+pc(p.ae, p.t)+'</b> de los repatriados en '+p.y+' a <b>'+pc(u.ae, u.t)+'</b> en '+u.y+'.'); }
  const sem = st.v[st.v.length-1], semA = sa.v[sa.v.length-1]; if (sem) hz.push('Última semana: <b>'+miles(sem)+'</b> repatriados, <b>'+pc(semA, sem)+'</b> en vuelos PRIM.');
  const mx = st.v.indexOf(Math.max(...st.v)); if (mx>=0) hz.push('La semana con más repatriados del periodo fue la del <b>'+fxa(st.C.l[mx].a)+'</b>: '+miles(st.v[mx])+'.');
  return { tit:'Mexicanos repatriados por tipo de retorno', fte:'Fuente: DGPMV, Repatriados. Aérea = vuelos PRIM. Semanas de lunes a domingo.', hz:hz,
    html:enc('MEXICANOS REPATRIADOS', 'POR TIPO DE RETORNO')+
      '<div class="inf-rt"><div class="inf-kk"><span>'+esc(X.etR)+' · '+X.fchR+'</span><b class="num">'+miles(T)+'</b><small>repatriados</small></div><div class="inf-kk o"><span>Terrestre</span><b class="num">'+miles(T-A)+'</b><small>'+pc(T-A, T)+'</small></div><div class="inf-kk v"><span>Aérea</span><b class="num">'+miles(A)+'</b><small>'+pc(A, T)+'</small></div></div>'+
      caja('Repatriados por semana', 'terrestre (garitas y puentes) y aérea (vuelos PRIM); barras: total', '<div id="g-ret" class="inf-gr"></div>', 'inf-c-alta')+
      '<div class="inf-anos">'+anos.map(y => '<div class="inf-ano"><b>'+y.y+'</b><span class="num">'+miles(y.t)+'</span><small>'+rango(y.a, y.b)+'</small><div class="inf-ano-r"><span><i style="background:'+C.ocre+'"></i>Terrestre <b>'+miles(y.te)+'</b> ('+pc(y.te, y.t)+')</span><span><i style="background:'+C.verde+'"></i>Aérea <b>'+miles(y.ae)+'</b> ('+pc(y.ae, y.t)+')</span></div></div>').join('')+'</div>',
    graf:[{ id:'g-ret', op:u => ({ grid:{ left:u*3.4, right:u*1.2, top:u*3, bottom:u*2.2 }, legend:ley(u, ['Total','Terrestre','Aérea']), tooltip:tip(u), xAxis:ejeX(u, lw), yAxis:ejeY(u),
      series:[{ name:'Total', type:'bar', data:st.v, itemStyle:{ color:C.arena2 }, barCategoryGap:'20%', markLine:ja>0 ? { silent:true, symbol:'none', lineStyle:{ color:C.ink2, type:'dashed' }, label:{ formatter:st.C.l[ja].a.slice(0,4), fontSize:u*0.8, fontWeight:700, color:C.ink }, data:[{ xAxis:ja }] } : undefined },
        linea(u, 'Terrestre', marcas(ster, u, C.ocre), C.ocre, { symbolSize:u*0.3 }), linea(u, 'Aérea', marcas(sa.v, u, C.verde), C.verde, { symbolSize:u*0.3 })] }) }] };
}
// Lámina 5: rescatados por el INM, primera vez y reincidencia
function laminaRescates(X){
  const R = (p, a, b) => V('resc', p, a, b), t = R(null, X.a, X.b), pv = R('pv', X.a, X.b), rei = R('rei', X.a, X.b), T = R(null, X.r0, X.b), PV = R('pv', X.r0, X.b), REI = R('rei', X.r0, X.b), tp = R(null, X.pa, X.pb);
  const sm = S('resc', null, X.r0, X.b, 'm'), spv = S('resc', 'pv', X.r0, X.b, 'm'), sre = S('resc', 'rei', X.r0, X.b, 'm'), lm = etiq(sm.C);
  const anos = []; for (let y = f0(X.r0).getFullYear(); y<=f0(X.b).getFullYear(); y++){ const a = maxS([X.r0, y+'-01-01']), b = minS([X.b, y+'-12-31']); anos.push({ y, t:R(null, a, b), pv:R('pv', a, b), re:R('rei', a, b) }); }
  const ua = anos[anos.length-1], hz = [];
  if (tp) hz.push('<b>'+miles(t)+'</b> rescatados en la semana: <b>'+flecha(pct(t, tp)-100)+'</b> contra la anterior ('+miles(tp)+').');
  hz.push('<b>'+pc(pv, t)+'</b> de los rescatados de la semana fueron de primera vez; en el '+esc(enPer(X))+', <b>'+pc(PV, T)+'</b>.');
  if (anos.length>1){ const p = anos[anos.length-2]; hz.push('La reincidencia bajó de <b>'+pc(p.re, p.t)+'</b> en '+p.y+' a <b>'+pc(ua.re, ua.t)+'</b> en '+ua.y+'.'.replace('bajó', ua.re/ua.t<=p.re/p.t ? 'bajó' : 'subió')); }
  const nat = D('resc', null, X.a, X.b, 'n'); if (nat.length) hz.push('Nacionalidad con más rescatados en la semana: <b>'+esc(nat[0][0])+'</b> ('+miles(nat[0][1])+', '+pc(nat[0][1], t)+').');
  const fila = (eti, fch, a, b, c, tono) => '<div class="inf-rs '+tono+'"><div class="inf-bd-l"><b>'+eti+'</b><span>'+fch+'</span></div><div class="inf-rs-n"><span class="num">'+miles(a)+'</span><small>primera vez</small></div><span class="inf-rs-o">+</span><div class="inf-rs-n r"><span class="num">'+miles(b)+'</span><small>reincidencias</small></div><span class="inf-rs-o">=</span><div class="inf-rs-n t"><span class="num">'+miles(a+b)+'</span><small>rescatados · '+miles(c)+' por día</small></div></div>';
  return { tit:'Extranjeros rescatados por el INM', fte:'Fuente: DGCOR, reporte de rescates de las O.R. Semanas de lunes a domingo.', hz:hz,
    html:enc('EXTRANJEROS RESCATADOS', 'POR EL INM')+'<div class="inf-rss">'+fila(X.eti, X.fch, pv, rei, t/X.dias, 'a')+fila(X.etR, X.fchR, PV, REI, T/X.dR, 'b')+'</div>'+
      caja('Rescates por mes', X.fchR+' · barras: total; líneas: primera vez y reincidencia', '<div id="g-res" class="inf-gr"></div>', 'inf-c-alta')+
      '<p class="inf-fr">En '+ua.y+' se han rescatado <b>'+miles(ua.t)+'</b> extranjeros: <b>'+miles(ua.pv)+'</b> por primera vez y <b>'+miles(ua.re)+'</b> reincidencias.</p>',
    graf:[{ id:'g-res', op:u => ({ grid:{ left:u*3.4, right:u*1.2, top:u*3, bottom:u*2.2 }, legend:ley(u, ['Total','Primera vez','Reincidencia']), tooltip:tip(u), xAxis:ejeX(u, lm), yAxis:ejeY(u),
      series:[{ name:'Total', type:'bar', data:sm.v, itemStyle:{ color:C.arena, borderRadius:[u*0.2,u*0.2,0,0] }, barMaxWidth:u*2.6, label:{ show:true, position:'top', fontSize:u*0.62, color:C.ink, formatter:p => corto(p.value) } },
        linea(u, 'Primera vez', spv.v, C.verde, { symbolSize:u*0.36 }), linea(u, 'Reincidencia', sre.v, C.vino, { symbolSize:u*0.36 })] }) }] };
}
// Lámina 6: caravanas (registro de caravanas: nombre, salida y personas estimadas)
function laminaCaravanas(X){
  const L = ((window.IANAMI_DATOS || {}).caravanas || []).filter(c => c.f && c.f<=X.b).sort((a,b) => a.f<b.f ? -1 : 1);
  if (!L.length) return null;
  const desde = L[0].f, enR = L.filter(c => c.f>=X.r0), u0 = L[L.length-1], enS = L.filter(c => c.f>=X.a && c.f<=X.b), mxp = Math.max(1, ...L.map(c => c.p || 0));
  const ETQ = new Set(L.slice().sort((a,b) => (b.p||0)-(a.p||0)).slice(0, 4).map(c => c.n).concat([u0.n]));
  const hz = ['Desde '+fxa(desde)+' se registran <b>'+L.length+'</b> caravanas; en el '+esc(enPer(X))+', <b>'+enR.length+'</b>.'];
  hz.push('La más reciente: <b>«'+esc(u0.n)+'»</b>, salió el '+fxa(u0.f)+' de '+esc(u0.s)+' con <b>'+miles(u0.p || 0)+'</b> personas estimadas.');
  if (enS.length) hz.push('En la semana salieron <b>'+enS.length+'</b> caravanas.');
  const grande = L.slice().sort((a,b) => (b.p||0)-(a.p||0))[0]; hz.push('La más grande registrada: «'+esc(grande.n)+'» ('+fxa(grande.f)+'), con '+miles(grande.p || 0)+' personas.');
  return { tit:'Caravanas migrantes', fte:'Fuente: registro de caravanas. Personas estimadas al salir, según los reportes.', hz:hz,
    html:enc('CARAVANAS', 'MIGRANTES')+
      '<div class="inf-cv"><div class="inf-cv-k"><div class="inf-kk"><span>Desde '+fxa(desde)+'</span><b class="num">'+L.length+'</b><small>caravanas</small></div><div class="inf-kk r"><span>'+esc(X.etR)+'</span><b class="num">'+enR.length+'</b><small>caravanas</small></div>'+
        '<div class="inf-c inf-cv-u"><h3>La más reciente</h3><b>«'+esc(u0.n)+'»</b><span>Salió el <b>'+fxa(u0.f)+'</b></span><span>de '+esc(u0.s)+'</span><span class="num">'+miles(u0.p || 0)+' <small>personas estimadas</small></span></div></div>'+
      caja('Cada caravana, por fecha de salida', 'altura y tamaño: personas estimadas · en vino, las del '+esc(enPer(X)), '<div id="g-car" class="inf-gr"></div>', 'inf-cv-g')+'</div>',
    graf:[{ id:'g-car', op:u => ({ grid:{ left:u*3.4, right:u*5, top:u*2.5, bottom:u*2.6 }, tooltip:{ confine:true, textStyle:{ fontSize:Math.max(12, u*0.8) }, formatter:p => '<b>«'+esc(p.data.n)+'»</b><br>'+fxa(p.data.f)+' · '+esc(p.data.s)+'<br>'+miles(p.data.p)+' personas estimadas' },
      xAxis:{ type:'time', axisLabel:{ fontSize:u*0.72, color:C.ink2, formatter:v => { const f = new Date(v); return MESC[f.getMonth()]+' '+String(f.getFullYear()).slice(2); } }, splitLine:{ show:false }, axisLine:{ lineStyle:{ color:'#C9C4B5' } } },
      yAxis:ejeY(u),
      series:[{ type:'scatter', data:L.map(c => ({ n:c.n, f:c.f, s:c.s, p:c.p || 0, value:[c.f, c.p || 0] })), symbolSize:d => u*0.8 + Math.sqrt(d[1]/mxp)*u*4.2,
        itemStyle:{ color:p => p.data.f>=X.r0 ? 'rgba(126,48,43,.75)' : 'rgba(154,149,138,.55)', borderColor:'#fff', borderWidth:1 },
        label:{ show:true, position:'top', fontSize:u*0.72, color:C.ink, formatter:p => ETQ.has(p.data.n) ? p.data.n : '' }, labelLayout:{ hideOverlap:true } }] }) }] };
}
function laminaHallazgos(L, X){ const g = L.filter(l => l.hz && l.hz.length);
  return { tit:'Hallazgos', fte:'Cifras calculadas con las bases del tablero; cada hallazgo solo aparece si hay datos.', html:enc('HALLAZGOS', X.sem ? 'DE LA SEMANA · '+X.fch : '· '+X.fch, '')+
    '<div class="inf-hzt">'+g.map(l => '<div class="inf-c"><h3>'+esc(l.tit)+'</h3><ul>'+l.hz.map(h => '<li>'+h+'</li>').join('')+'</ul></div>').join('')+'</div>' }; }
function informe(a, b, ref){
  const X = datosInforme(a, b, ref || 'trump');
  const L = [laminaCBP(X), laminaSectores(X), laminaRecibidos(X), laminaRetorno(X), laminaRescates(X), laminaCaravanas(X)].filter(Boolean);
  const todo = [laminaPortada(X)].concat(L, [laminaHallazgos(L, X)]);
  const u = new URL(location.href); u.search = '?informe='+a+'_'+b+'&ref='+X.ref; u.hash = '';
  abrirVisor({ titulo:'Informe migratorio', sub:(X.sem ? 'Semana ' : 'Periodo personalizado ')+X.fch+' · '+X.etR, pie:'Informe migratorio · '+X.fch, laminas:todo, liga:u.toString(), archivo:'Informe migratorio '+a+' a '+b });
}

/* ==== [6] ANÁLISIS ================================================ */
// Un análisis: hasta 3 conceptos (indicador o una de sus partes) × hasta 4 valores (nacionalidades o estados) × 1 o 2 periodos.
// Se presenta en láminas: resumen, en el tiempo, desglose y hallazgos.
const CONCEPTOS = M.IND.filter(x => !BASES[x.b].foto).flatMap(x => [{ k:x.k, p:null, nom:cap(x.nom) }].concat((x.partes || []).filter(p => !p.rei || x.k==='resc').map(p => ({ k:x.k, p:p.k, nom:cap(x.nom)+' · '+p.nom }))));
const idC = c => c.k+(c.p ? '.'+c.p : ''), cDe = id => CONCEPTOS.find(c => idC(c)===id);
const nomPer = (a, b) => { const fa = f0(a), fb = f0(b); if (a.slice(5)==='01-01' && b.slice(5)==='12-31' && fa.getFullYear()===fb.getFullYear()) return String(fa.getFullYear());
  if (fa.getDate()===1 && iso(new Date(fb.getFullYear(), fb.getMonth()+1, 0))===b && fa.getMonth()===fb.getMonth() && fa.getFullYear()===fb.getFullYear()) return cap(MESL[fa.getMonth()])+' '+fa.getFullYear(); return rango(a, b); };
function valoresDim(dim){ const s = new Set(); CONCEPTOS.forEach(c => { const D0 = BASES[INDK[c.k].b].dims[dim]; if (D0) D0.vals.forEach(v => s.add(v)); }); return [...s].sort((a,b) => a.localeCompare(b, 'es')); }
function filtroDe(k, dim, nom){ if (!dim || !nom) return {}; const D0 = BASES[INDK[k].b].dims[dim]; if (!D0) return null; const i = D0.vals.indexOf(nom); return i<0 ? null : { [dim]:[i] }; }
function armarSeries(A){ const out = [], av = [];
  A.conceptos.forEach(c => (A.valores.length ? A.valores : [null]).forEach(v => A.periodos.forEach((per, j) => {
    const nomC = cDe(idC(c)).nom, f = filtroDe(c.k, A.dim, v);
    if (f===null){ av.push(nomC+': la base no trae '+(A.dim==='n' ? 'nacionalidad' : 'estado')+' «'+v+'».'); return; }
    if (per.b<ini(c.k) || per.a>fin(c.k)){ av.push(nomC+': sin datos en '+per.nom+' (la base va del '+fxa(ini(c.k))+' al '+fxa(fin(c.k))+').'); return; }
    out.push({ c, v, per, j, f, clave:idC(c)+'|'+(v || ''), nom:[nomC].concat(v ? [v] : [], A.periodos.length>1 ? [per.nom] : []).join(' · ') }); })));
  const varios = new Set(out.map(s => idC(s.c))).size>1, dosP = new Set(out.map(s => s.j)).size>1;
  out.forEach(s => { s.corto = [varios ? cDe(idC(s.c)).nom : null, s.v, dosP ? s.per.nom : null].filter(Boolean).join(' · ') || cDe(idC(s.c)).nom; });
  return { s:out.slice(0, 8), av:av.concat(out.length>8 ? ['Se muestran las primeras 8 combinaciones.'] : []), dos:dosP }; }
function analisis(A){
  const { s:SS, av, dos } = armarSeries(A); if (!SS.length){ alert(av.join('\n') || 'No hay datos para esa combinación.'); return; }
  // mismo color para el mismo concepto y valor; el periodo anterior va punteado
  const claves = [...new Set(SS.map(s => s.clave))];
  SS.forEach(s => { const a = s.per.a, b = s.per.b, n = difDias(a, b)+1; s.col = SERIES[claves.indexOf(s.clave) % SERIES.length]; s.t = V(s.c.k, s.c.p, a, b, s.f); s.dias = n; s.fin = fin(s.c.k); s.ini = ini(s.c.k);
    s.dReal = difDias(maxS([a, s.ini]), minS([b, s.fin]))+1; s.prom = s.t/Math.max(1, s.dReal); });
  SS.forEach(s => { const par = dos ? SS.find(o => o.clave===s.clave && o.j!==s.j) : null; if (par && s.j===1) s.vs = { txt:'vs '+par.per.nom+' (por día)', a:par.prom, b:s.prom };
    if (!dos){ const n = s.dias, a0 = sumaDias(s.per.a, -n), a1 = sumaDias(s.per.a, -1); if (a0>=s.ini){ const t0 = V(s.c.k, s.c.p, a0, a1, s.f); if (t0>=30) s.vs = { txt:'vs los '+n+' días anteriores', a:t0, b:s.t }; } } });
  const P0 = A.periodos[A.periodos.length-1], g = cubetas(P0.a, P0.b, 'auto').g;
  // fuera de lo que cubre la base no hay dato (no es cero): esos tramos quedan vacíos
  SS.forEach(s => { s.ser = S(s.c.k, s.c.p, s.per.a, s.per.b, g, s.f); s.ser.v = s.ser.v.map((v,i) => { const c = s.ser.C.l[i]; return c.b<s.ini || c.a>s.fin ? null : v; }); });
  const base = SS.filter(s => s.j===Math.max(...SS.map(x => x.j)))[0] || SS[0], nX = Math.max(...SS.map(s => s.ser.v.length)), CL = base.ser.C.l, inc = CL.length && CL[CL.length-1].inc;
  const xs = (dos ? [...Array(nX).keys()].map(i => g==='m' ? cap(MESC[f0(CL[Math.min(i, CL.length-1)].a).getMonth()]) : (g==='s' ? 'Sem ' : 'Día ')+(i+1)) : etiq(base.ser.C)).map((x,i) => inc && i===CL.length-1 ? x+' *' : x);
  // desglose: la dimensión que más explica y que no se está comparando
  const k0 = base.c.k, dims = BASES[INDK[k0].b].dims, dimD = ['n','e','p','sec','pa','doc','mot'].find(d => dims[d] && d!==A.dim) || null;
  const SD = dimD ? SS.filter(s => BASES[INDK[s.c.k].b].dims[dimD]) : [], des = SD.map(s => new Map(D(s.c.k, s.c.p, s.per.a, s.per.b, dimD, s.f))), top = des.length ? [...des[SD.indexOf(base)>=0 ? SD.indexOf(base) : 0].entries()].sort((a,b) => b[1]-a[1]).slice(0, 12).map(x => x[0]) : [];
  // hallazgos: totales, cambio, el mayor, el máximo y quién encabeza
  const hz = [], tot = SS.reduce((x,s) => x+(s.j===base.j ? s.t : 0), 0), nomD = d => dims[d].nom.toLowerCase();
  SS.filter(s => s.j===base.j).forEach(s => { let h = '<b>'+esc(s.corto)+'</b>: <b>'+miles(s.t)+'</b> ('+miles(s.prom)+' por día)'; if (s.vs) h += ', <b>'+flecha(pct(s.vs.b, s.vs.a)-100)+'</b> '+esc(s.vs.txt); hz.push(h+'.'); });
  if (claves.length>1){ const o = SS.filter(s => s.j===base.j).sort((a,b) => b.t-a.t); if (o.length>1 && o[1].t) hz.push('<b>'+esc(o[0].corto)+'</b> es '+(o[0].t/o[1].t>=2 ? (o[0].t/o[1].t).toFixed(1)+' veces ' : pc(o[0].t-o[1].t, o[1].t)+' más que ')+'<b>'+esc(o[1].corto)+'</b>.'); }
  SS.filter(s => s.j===base.j).forEach(s => { const v = s.ser.v.map(x => x || 0), i = v.indexOf(Math.max(...v)); if (v.length>2 && v[i]) hz.push('Máximo de '+esc(s.corto)+': <b>'+miles(v[i])+'</b> '+(g==='m' ? 'en '+MESL[f0(s.ser.C.l[i].a).getMonth()]+' '+f0(s.ser.C.l[i].a).getFullYear() : (g==='s' ? 'la semana del ' : 'el ')+fxa(s.ser.C.l[i].a))+'.'); });
  if (dimD && top.length) hz.push('Por '+nomD(dimD)+', encabeza <b>'+esc(top[0])+'</b> en '+esc(SD[0].corto)+' ('+pc(des[0].get(top[0]), SD[0].t)+').');
  const fte = 'Fuente: '+[...new Set(SS.map(s => BASES[INDK[s.c.k].b].fuente))].join(', ')+(av.length ? ' · '+av.join(' ') : '')+(inc ? ' · * periodo incompleto.' : '');
  const tit = A.titulo || [...new Set(SS.map(s => cDe(idC(s.c)).nom))].join(' y ');
  const tarj = SS.map(s => '<div class="inf-an-k'+(s.j!==base.j ? ' prev' : '')+'" style="--c:'+s.col+'"><span>'+esc(s.corto)+'</span><b class="num">'+miles(s.t)+'</b><small>'+rango(s.per.a, s.per.b)+' · '+miles(s.prom)+' por día</small>'+
    (s.vs ? '<em class="'+(s.vs.b>=s.vs.a ? 'u' : 'd')+'">'+flecha(pct(s.vs.b, s.vs.a)-100)+' <small>'+esc(s.vs.txt)+'</small></em>' : '')+
    (s.fin<s.per.b ? '<em class="n">datos al '+fxa(s.fin)+'</em>' : s.ini>s.per.a ? '<em class="n">datos desde el '+fxa(s.ini)+'</em>' : '')+'</div>').join('');
  const L = [
    { tit:'Resumen', fte:fte, hz:hz, html:enc(esc(tit).toUpperCase(), dos ? '· '+esc(A.periodos.map(p => p.nom).join(' contra ')) : '· '+rango(P0.a, P0.b), 'Análisis')+'<div class="inf-an-r">'+tarj+'</div>'+
      caja('En el tiempo', { d:'por día', s:'por semana', m:'por mes' }[g]+(dos ? ' · periodos alineados; punteado: '+esc(A.periodos[0].nom) : '')+(inc ? ' · * incompleto' : ''), '<div id="g-an-t" class="inf-gr"></div>', 'inf-c-total') } ];
  if (dimD && top.length) L.push({ tit:'Desglose', fte:fte, hz:hz.slice(-2), html:enc('POR '+esc(dims[dimD].nom.toUpperCase()), '· '+esc(tit)+(top.length>=12 ? ' · las 12 con más registros' : '')+', de mayor a menor', 'Análisis')+caja(esc(tit), dos ? esc(A.periodos.map(p => p.nom).join(' contra ')) : rango(P0.a, P0.b), '<div id="g-an-d" class="inf-gr"></div>', 'inf-c-total') });
  L.push({ tit:'Hallazgos', fte:fte, html:enc('HALLAZGOS', '· '+esc(tit), 'Análisis')+'<div class="inf-hzt uno"><div class="inf-c"><ul>'+hz.map(h => '<li>'+h+'</li>').join('')+'</ul></div></div>' });
  L[0].graf = [{ id:'g-an-t', op:u => ({ grid:{ left:u*3.6, right:u*2, top:u*3.2, bottom:u*2.4 }, legend:ley(u, SS.map(s => s.corto)), tooltip:Object.assign(tip(u), dos ? { formatter:ps => ps.map(p => { const s = SS[p.seriesIndex], c = s.ser.C.l[p.dataIndex]; return p.marker+esc(s.corto)+(c ? ' <small>('+rango(c.a, c.b)+')</small>' : '')+': <b>'+(p.value==null ? '—' : miles(p.value))+'</b>'; }).join('<br>') } : {}),
    xAxis:ejeX(u, xs), yAxis:ejeY(u), series:SS.map(s => linea(u, s.corto, s.j===base.j ? marcas(s.ser.v, u, s.col) : s.ser.v, s.col, { connectNulls:false, symbolSize:u*0.34, lineStyle:{ width:u*(s.j===base.j ? 0.2 : 0.14), color:s.col, type:s.j!==base.j ? [u*0.5, u*0.3] : 'solid' }, itemStyle:{ color:s.j!==base.j ? '#fff' : s.col, borderColor:s.col, borderWidth:u*0.1 } })) }) }];
  if (dimD && top.length) L[1].graf = [{ id:'g-an-d', op:u => ({ grid:{ left:u*12, right:u*4, top:SD.length>1 ? u*2.6 : u*0.6, bottom:u*0.6 }, legend:SD.length>1 ? ley(u, SD.map(s => s.corto)) : { show:false }, tooltip:Object.assign(tip(u), { axisPointer:{ type:'shadow' } }),
    xAxis:{ type:'value', show:false }, yAxis:{ type:'category', inverse:true, data:top, axisTick:{ show:false }, axisLine:{ show:false }, axisLabel:{ fontSize:u*0.85, color:C.ink, width:u*11, overflow:'truncate' } },
    series:SD.map((s,k) => ({ name:s.corto, type:'bar', data:top.map(n => des[k].get(n) || 0), itemStyle:{ color:s.j!==base.j ? 'rgba(0,0,0,0)' : s.col, borderColor:s.col, borderWidth:s.j!==base.j ? 1.5 : 0, borderRadius:[0,u*0.2,u*0.2,0] }, barMaxWidth:u*1.8, barGap:'15%',
      label:{ show:SD.length<=3, position:'right', fontSize:u*0.7, color:C.ink2, formatter:p => p.value ? corto(p.value) : '' } })) }) }];
  abrirVisor({ titulo:'Análisis · '+tit, sub:A.periodos.map(p => p.nom).join(' contra '), pie:'Análisis', laminas:L, archivo:'Analisis '+tit });
}

/* ==== [7] PÁGINA ================================================== */
// Estado del armador de análisis: conceptos, con qué se compara y periodos
const H = { conceptos:['resc'], dim:'n', valores:[], per:'anio', cmp:'aa', a:null, b:null, a2:null, b2:null };
const FINM = maxS(CONCEPTOS.map(c => fin(c.k)));
function periodosDe(){ const b0 = FINM, y = f0(b0).getFullYear();
  const P = { ult30:[sumaDias(b0, -29), b0], sem:semanas(1)[0], mes:[b0.slice(0,8)+'01', b0], anio:[y+'-01-01', b0], trump:['2025-01-20', b0], shein:['2024-10-01', b0], pers:[H.a || sumaDias(b0, -29), H.b || b0] }[H.per];
  const p1 = { a:P[0], b:P[1], nom:nomPer(P[0], P[1]) }; if (H.per==='anio') p1.nom = y+' (al '+fx(b0)+')';
  if (H.cmp==='no') return [p1];
  const n = difDias(p1.a, p1.b)+1; let a, b;
  if (H.cmp==='ant'){ a = sumaDias(p1.a, -n); b = sumaDias(p1.a, -1); } else if (H.cmp==='aa'){ const r = s => (+s.slice(0,4)-1)+s.slice(4); a = r(p1.a); b = r(p1.b); } else { a = H.a2 || sumaDias(p1.a, -n); b = H.b2 || sumaDias(p1.a, -1); }
  const p0 = { a, b, nom:H.per==='anio' && H.cmp==='aa' ? (y-1)+' (al '+fx(b)+')' : nomPer(a, b) }; return [p0, p1]; }
function htmlPagina(){
  const W = semanas(16), opW = W.map((w,i) => '<option value="'+w[0]+'_'+w[1]+'">'+(i===0 ? 'Última semana: ' : '')+rango(w[0], w[1])+'</option>').join('');
  const ops = CONCEPTOS.map(c => '<option value="'+idC(c)+'">'+esc(c.nom)+'</option>').join('');
  return '<div class="an"><div class="an-h"><div><h1>Analizar</h1><p>El informe de la semana y cualquier análisis, en láminas de pantalla completa que puedes presentar, descargar o compartir.</p></div></div>'+
    '<div class="an-g">'+
    '<section class="an-c an-inf"><div class="an-c-h"><span class="an-ic"><svg viewBox="0 0 24 24"><path d="M4 5h16v11H4zM8 20h8M12 16v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><h2>Informe migratorio</h2><p>Siete láminas con la semana y el periodo de referencia: encuentros CBP, sectores, recibidos de EE. UU., repatriados, rescates y caravanas.</p></div></div>'+
      '<label class="an-l">Semana<select id="an-sem">'+opW+'<option value="pers">Personalizado…</option></select></label>'+
      '<div class="an-pers" id="an-ip" hidden><label class="an-l">Del<input type="date" id="an-ia"></label><label class="an-l">al<input type="date" id="an-ib"></label></div>'+
      '<label class="an-l">Comparar con<select id="an-ref"><option value="trump">Periodo Trump (desde 20 ene 2025)</option><option value="sheinbaum">Periodo Sheinbaum (desde 1 oct 2024)</option><option value="anio">El año en curso</option></select></label>'+
      '<button class="an-go" data-angen>Generar informe <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'+
      '<p class="an-nt">Datos al <b>'+fxa(CORTE)+'</b> (último día común de CBP, rescates, repatriados y recibidos).</p></section>'+
    '<section class="an-c an-an"><div class="an-c-h"><span class="an-ic"><svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><h2>Análisis y comparaciones</h2><p>Escribe lo que quieres ver o arma la comparación: conceptos, nacionalidades o estados, y periodos.</p></div></div>'+
      '<form class="an-q" id="an-q"><input id="an-txt" type="text" autocomplete="off" placeholder="Por ejemplo: rescatados de Honduras y Guatemala 2026 contra 2025"><button type="submit">Analizar</button></form>'+
      '<div class="an-ej">'+['rescatados de Venezuela y Cuba este año','repatriados en vuelos PRIM','trámites de Guatemala en Chiapas','encuentros CBP mexicanos'].map(t => '<button type="button" data-anej="'+esc(t)+'">'+esc(t)+'</button>').join('')+'</div>'+
      '<div class="an-arm"><div class="an-paso"><b>1</b><div><span class="an-et">Qué quieres ver <small>hasta 3</small></span><div class="an-chips" id="an-cc"></div><select id="an-c" aria-label="Agregar concepto"><option value="">+ agregar concepto</option>'+ops+'</select></div></div>'+
        '<div class="an-paso"><b>2</b><div><span class="an-et">Comparar entre <small>hasta 4, opcional</small></span><div class="an-seg" id="an-dim"><button type="button" data-andim="n">Nacionalidades</button><button type="button" data-andim="e">Estados</button></div>'+
          '<div class="an-chips" id="an-vv"></div><input id="an-v" list="an-vl" placeholder="Escribe y elige…" autocomplete="off"><datalist id="an-vl"></datalist></div></div>'+
        '<div class="an-paso"><b>3</b><div><span class="an-et">Periodo</span><div class="an-seg" id="an-per">'+[['sem','Semana'],['ult30','30 días'],['mes','Mes'],['anio','Año'],['trump','Trump'],['shein','Sheinbaum'],['pers','Personalizado']].map(([k,t]) => '<button type="button" data-anper="'+k+'">'+t+'</button>').join('')+'</div>'+
          '<div class="an-pers" id="an-pp" hidden><input type="date" id="an-pa" aria-label="Desde"><input type="date" id="an-pb" aria-label="Hasta"></div>'+
          '<span class="an-et">Contra</span><div class="an-seg" id="an-cmp">'+[['no','Sin comparar'],['ant','Periodo anterior'],['aa','Año anterior'],['otro','Otro periodo']].map(([k,t]) => '<button type="button" data-ancmp="'+k+'">'+t+'</button>').join('')+'</div>'+
          '<div class="an-pers" id="an-po" hidden><input type="date" id="an-oa" aria-label="Desde"><input type="date" id="an-ob" aria-label="Hasta"></div><p class="an-res" id="an-res"></p></div></div>'+
        '<button class="an-go" data-anver>Ver análisis <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></section>'+
    '</div></div>';
}
function pintarArmador(){ const r = $('an-cc'); if (!r) return;
  r.innerHTML = H.conceptos.map((id,i) => '<span class="an-ch" style="--c:'+SERIES[i]+'">'+esc((cDe(id) || {}).nom || id)+'<button type="button" data-anqc="'+i+'" aria-label="Quitar">×</button></span>').join('');
  $('an-c').disabled = H.conceptos.length>=3;
  $('an-vv').innerHTML = H.valores.map((v,i) => '<span class="an-ch">'+esc(v)+'<button type="button" data-anqv="'+i+'" aria-label="Quitar">×</button></span>').join('');
  $('an-v').disabled = H.valores.length>=4; $('an-v').placeholder = H.dim==='n' ? 'Escribe una nacionalidad…' : 'Escribe un estado…';
  $('an-vl').innerHTML = valoresDim(H.dim).map(v => '<option value="'+esc(v)+'">').join('');
  document.querySelectorAll('[data-andim]').forEach(b => b.classList.toggle('on', b.dataset.andim===H.dim));
  document.querySelectorAll('[data-anper]').forEach(b => b.classList.toggle('on', b.dataset.anper===H.per));
  document.querySelectorAll('[data-ancmp]').forEach(b => b.classList.toggle('on', b.dataset.ancmp===H.cmp));
  $('an-pp').hidden = H.per!=='pers'; $('an-po').hidden = H.cmp!=='otro';
  const P = periodosDe(); $('an-res').innerHTML = P.map(p => '<b>'+esc(p.nom)+'</b>').join(' contra ');
}
function desdeTexto(t){ const q = M.entender(t); M.limitar(q);
  H.conceptos = [q.ind+(q.partes[0] ? '.'+q.partes[0] : '')].filter(cDe); if (!H.conceptos.length) H.conceptos = [q.ind];
  const dim = (q.filtros.n || []).length ? 'n' : (q.filtros.e || []).length ? 'e' : null, B = BASES[INDK[q.ind].b];
  H.dim = dim || H.dim; H.valores = dim ? q.filtros[dim].map(i => B.dims[dim].vals[i]) : [];
  // «contra», «vs» o dos años en el texto: comparación de periodos
  const anos = (t.match(/\b20\d\d\b/g) || []).filter((x,i,a) => a.indexOf(x)===i).sort();
  if (anos.length>=2){ H.per = 'pers'; H.a = anos[1]+'-01-01'; H.b = minS([anos[1]+'-12-31', FINM]); H.cmp = 'otro'; H.a2 = anos[0]+'-01-01'; H.b2 = anos[0]+'-12-31';
    if (H.b<anos[1]+'-12-31'){ H.b2 = anos[0]+H.b.slice(4); } }
  else { const B0 = BASES[INDK[q.ind].b], todo = q.d0<=B0.inicio && q.d1>=finBase(B0), anio = q.d0===FINM.slice(0,4)+'-01-01';
    if (todo){ H.per = 'shein'; H.cmp = 'no'; } else if (anio){ H.per = 'anio'; H.cmp = /contra|vs|compar|anterior|pasado/.test(t) ? 'aa' : 'no'; }
    else { H.per = 'pers'; H.a = q.d0; H.b = q.d1; H.cmp = /contra|vs|comparad/.test(t) ? 'ant' : 'no'; } }
  pintarArmador(); }
function verAnalisis(){ const c = H.conceptos.map(id => { const x = cDe(id); return x ? { k:x.k, p:x.p } : null; }).filter(Boolean); if (!c.length) return;
  analisis({ conceptos:c, dim:H.valores.length ? H.dim : null, valores:H.valores.slice(), periodos:periodosDe() }); }
function eventosPagina(cont){
  cont.addEventListener('click', e => { if (!e.target.closest('.an')) return; const T = s => e.target.closest(s); let b;
    if (T('[data-angen]')){ const v = $('an-sem').value; let a, z; if (v==='pers'){ a = $('an-ia').value; z = $('an-ib').value; if (!a || !z || z<a) return alert('Elige las dos fechas del periodo.'); } else [a, z] = v.split('_'); informe(a, z, $('an-ref').value); return; }
    if ((b = T('[data-anej]'))){ $('an-txt').value = b.dataset.anej; desdeTexto(b.dataset.anej); verAnalisis(); return; }
    if ((b = T('[data-anqc]'))){ H.conceptos.splice(+b.dataset.anqc, 1); pintarArmador(); return; }
    if ((b = T('[data-anqv]'))){ H.valores.splice(+b.dataset.anqv, 1); pintarArmador(); return; }
    if ((b = T('[data-andim]'))){ if (H.dim!==b.dataset.andim){ H.dim = b.dataset.andim; H.valores = []; } pintarArmador(); return; }
    if ((b = T('[data-anper]'))){ H.per = b.dataset.anper; pintarArmador(); return; }
    if ((b = T('[data-ancmp]'))){ H.cmp = b.dataset.ancmp; pintarArmador(); return; }
    if (T('[data-anver]')) return verAnalisis(); });
  cont.addEventListener('submit', e => { if (e.target.id!=='an-q') return; e.preventDefault(); const t = $('an-txt').value.trim(); if (!t) return; desdeTexto(t); verAnalisis(); });
  cont.addEventListener('change', e => { const id = e.target.id;
    if (id==='an-sem') $('an-ip').hidden = e.target.value!=='pers';
    if (id==='an-c' && e.target.value){ if (H.conceptos.indexOf(e.target.value)<0 && H.conceptos.length<3) H.conceptos.push(e.target.value); e.target.value = ''; pintarArmador(); }
    if (id==='an-v'){ const v = e.target.value.trim(), l = valoresDim(H.dim), m = l.find(x => x.toLowerCase()===v.toLowerCase()); if (m && H.valores.indexOf(m)<0 && H.valores.length<4) H.valores.push(m); e.target.value = ''; pintarArmador(); }
    if (id==='an-pa') H.a = e.target.value; if (id==='an-pb') H.b = e.target.value; if (id==='an-oa') H.a2 = e.target.value; if (id==='an-ob') H.b2 = e.target.value;
    if (/^an-(pa|pb|oa|ob)$/.test(id)) pintarArmador(); });
}

/* ==== [8] ARRANQUE ================================================ */
let listo = false;
window.IANAMI_ANALIZAR = {
  pintar(cont){ cont.innerHTML = htmlPagina(); if (!listo){ eventosPagina(cont); listo = true; } pintarArmador();
    const p = new URLSearchParams(location.search), inf = p.get('informe');   // liga compartida: abre el mismo informe
    if (inf && /^\d{4}-\d\d-\d\d_\d{4}-\d\d-\d\d$/.test(inf) && !this._abierto){ this._abierto = true; const [a, b] = inf.split('_'); informe(a, b, REF[p.get('ref')] ? p.get('ref') : 'trump'); } },
  informe:informe, analisis:analisis, _prueba:{ datosInforme, semanas, CORTE, V, armarSeries, periodosDe, H, desdeTexto }
};
})();
