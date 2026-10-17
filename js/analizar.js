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
const C = { ink3:'#8A857A', verde:'#2F6657', vino:'#7E302B', rojo:'#C4605A', ocre:'#8F7F2E', ink:'#2B2926', ink2:'#5C5952', gris:'#9A958A', arena:'#DDD5BE', arena2:'#EDE8D8', linea:'#E2DED0', fondo:'#FCFBF7', salvia:'#778E88' };
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
const ICO = {
  pdf:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  wa:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2a8.7 8.7 0 0 0-7.5 13.1L3.3 20.8l4.6-1.2A8.7 8.7 0 1 0 12 3.2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 8.3c.2-.4.5-.4.7-.4h.5c.2 0 .4.1.5.4l.6 1.5c.1.2 0 .4-.1.6l-.5.6c-.1.1-.1.3 0 .5.6 1 1.4 1.8 2.5 2.4.2.1.4.1.5-.1l.6-.7c.1-.2.4-.2.6-.1l1.4.7c.2.1.4.3.3.6-.1.9-.9 1.7-1.9 1.7-2.8 0-5.9-3-5.9-5.8 0-.7.1-1.3.2-1.9z" fill="currentColor"/></svg>',
  x:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  iz:'<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  de:'<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  nar:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h10M5 17h7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  amp:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  red:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M10 14l-7 7M14 10l7-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  gira:'<svg viewBox="0 0 24 24"><path d="M7 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM19 8a5 5 0 0 1 0 8M21 6v4h-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' };
function abrirVisor(o){
  cerrarVisor(); const el = document.createElement('div'); el.className = 'inf'; el.setAttribute('role','dialog'); el.setAttribute('aria-label', o.titulo);
  const L = o.laminas;
  el.innerHTML = '<div class="inf-st" id="inf-st"><div class="inf-tr" id="inf-tr">'+L.map((l,i) => '<section class="inf-sl'+(l.cls ? ' '+l.cls : '')+'" data-i="'+i+'" aria-roledescription="lámina" aria-label="'+esc(l.tit)+'">'+l.html+
      (l.hz && l.hz.length ? '<aside class="inf-hz" hidden><span class="inf-hz-e">Narrativa</span><h4>'+esc(l.tit)+'</h4><ol>'+l.hz.map((h,j) => '<li style="--d:'+(j*0.14+0.12)+'s">'+h+'</li>').join('')+'</ol></aside>'+
        '<button class="inf-nb" data-infhz aria-expanded="false" title="Ver la narrativa de esta lámina">'+ICO.nar+'<span>Narrativa</span><b>'+l.hz.length+'</b></button>' : '')+
      '<footer class="inf-pie"><span>'+esc(l.fte || '')+'</span><span>'+esc(o.pie || '')+' · '+(i+1)+' / '+L.length+'</span></footer></section>').join('')+'</div></div>'+
    '<div class="inf-ctl"><div class="inf-ctl-t"><b>'+esc(o.titulo)+'</b><span>'+esc(o.sub || '')+'</span></div>'+
      '<div class="inf-ctl-b"><button data-infpdf title="Descargar PDF">'+ICO.pdf+'<span>PDF</span></button><button class="wa" data-infwa title="Compartir por WhatsApp">'+ICO.wa+'<span>WhatsApp</span></button>'+
      '<button data-infx title="Cerrar (Esc)" aria-label="Cerrar">'+ICO.x+'</button></div></div>'+
    '<button class="inf-fl iz" data-infmov="-1" aria-label="Lámina anterior">'+ICO.iz+'</button><button class="inf-fl de" data-infmov="1" aria-label="Lámina siguiente">'+ICO.de+'</button>'+
    '<nav class="inf-pt" aria-label="Láminas">'+L.map((l,i) => '<button data-infir="'+i+'" title="'+esc(l.tit)+'" aria-label="'+esc(l.tit)+'"></button>').join('')+'</nav>'+
    '<div class="inf-gira" aria-hidden="true">'+ICO.gira+'Gira el teléfono para ver la lámina completa</div><div class="inf-msg" id="inf-msg" role="status"></div>';
  document.body.appendChild(el); document.body.classList.add('en-inf');
  VISOR = { el:el, o:o, i:0, ch:[] };
  medir(); dibujar(); ir(Math.max(0, Math.min(L.length-1, o.inicio || 0)), true);
  setTimeout(() => { if (VISOR) contarNums(VISOR.el.querySelector('.inf-sl.activa')); }, 200);
  if (document.documentElement.requestFullscreen && !document.fullscreenElement && o.completa!==false) document.documentElement.requestFullscreen().catch(() => {});
  eventosVisor(el);
}
function cerrarVisor(){ if (!VISOR) return; VISOR.ch.forEach(c => c.dispose()); VISOR.el.remove(); document.body.classList.remove('en-inf'); window.removeEventListener('resize', alCambiar); document.removeEventListener('keydown', teclas); VISOR = null;
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); }
// La lámina más grande que cabe en la pantalla, siempre 16:9, con aire arriba y abajo para los controles
function medir(){ if (!VISOR) return; const w = innerWidth, h = innerHeight, W = Math.min(w-16, (h-104)*16/9), st = $('inf-st');
  st.style.width = W+'px'; st.style.height = (W*9/16)+'px'; VISOR.U = W/100; VISOR.el.style.setProperty('--u', VISOR.U+'px'); }
const FUENTE = "Barlow, 'Segoe UI', system-ui, sans-serif";
// opciones de cada gráfica: la cuadrícula de la plataforma (cuadritos) y una entrada animada
function opcion(g, U){ const op = Object.assign({ textStyle:{ fontFamily:FUENTE }, animationDuration:1100, animationEasing:'cubicOut', animationDurationUpdate:500 }, g.op(U));
  [].concat(op.series || []).forEach((x, k) => { if (x && x.type==='bar' && x.animationDelay==null) x.animationDelay = i => i*12; });
  // barras con su dato en vertical: más aire arriba para que quepa
  if ([].concat(op.series || []).some(x => x && x.type==='bar' && x.label && x.label.show && x.label.rotate===90) && op.grid) op.grid.top = Math.max(op.grid.top || 0, U*4.4);
  return window.IANAMI_CUAD ? window.IANAMI_CUAD(op) : op; }
function dibujar(){ const V0 = VISOR; V0.ch.forEach(c => c.dispose()); V0.ch = []; V0.gr = [];
  V0.o.laminas.forEach((l, i) => (l.graf || []).forEach(g => { const el = V0.el.querySelector('.inf-sl[data-i="'+i+'"] #'+g.id); if (!el) return;
    const ch = echarts.init(el, null, { devicePixelRatio:Math.max(2, window.devicePixelRatio || 1) }); ch.setOption(opcion(g, V0.U)); V0.ch.push(ch); V0.gr.push({ ch, g, i }); })); }
// al llegar a una lámina sus gráficas se vuelven a dibujar con su animación
function animar(i){ const V0 = VISOR; if (!V0 || V0.el.classList.contains('imprimiendo')) return; (V0.gr || []).filter(x => x.i===i).forEach(x => { x.ch.clear(); x.ch.setOption(opcion(x.g, V0.U)); }); }
// ampliar una tarjeta: crece suave hasta todo el ancho mientras la otra se recoge; otro toque la regresa
function ampliar(b){ const card = b.closest('.inf-c'), par = card.parentElement, on = !card.classList.contains('ex-on'), sl = b.closest('.inf-sl');
  const cols = [...par.children].filter(c => !c.classList.contains('inf-sec-k'));
  par.classList.toggle('ex', on); cols.forEach(c => { c.classList.toggle('ex-on', on && c===card); c.classList.toggle('ex-off', on && c!==card); });
  par.style.gridTemplateColumns = on ? cols.map(c => c===card ? '1fr' : '0fr').join(' ') : '';
  par.querySelectorAll('[data-infex]').forEach(x => { x.innerHTML = on ? ICO.red : ICO.amp; x.title = on ? 'Regresar' : 'Ampliar'; });
  // las gráficas se ajustan cuadro por cuadro mientras dura la transición
  const i = +sl.dataset.i, gr = (VISOR.gr || []).filter(x => x.i===i), t0 = performance.now(), paso = t => { gr.forEach(x => x.ch.resize()); if (t-t0<700) requestAnimationFrame(paso); }; requestAnimationFrame(paso); }
// las cifras grandes suben de cero a su valor al llegar a la lámina, como en el resto de la plataforma
function contarNums(sl){ if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = [...sl.querySelectorAll('.num')].filter(e => { if (!e.dataset.f) e.dataset.f = e.childNodes[0] && e.childNodes[0].nodeType===3 ? e.childNodes[0].nodeValue : ''; return /^[\d,]+$/.test(e.dataset.f.trim()); });
  const t0 = performance.now(), dur = 900, paso = t => { const k = Math.min(1, (t-t0)/dur), f = 1-Math.pow(1-k, 3);
    els.forEach(e => { e.childNodes[0].nodeValue = miles(+e.dataset.f.replace(/,/g, '')*f); }); if (k<1) requestAnimationFrame(paso); }; requestAnimationFrame(paso); }
let tCambio = 0; function alCambiar(){ clearTimeout(tCambio); tCambio = setTimeout(() => { medir(); dibujar(); ir(VISOR.i, true); }, 120); }
function ir(i, sin){ const V0 = VISOR; if (!V0) return; const n = V0.o.laminas.length; i = Math.max(0, Math.min(n-1, i)); V0.i = i;
  const tr = $('inf-tr'); tr.style.transition = sin ? 'none' : ''; tr.style.transform = 'translateX('+(-i*100)+'%)';
  V0.el.querySelectorAll('[data-infir]').forEach(b => b.classList.toggle('on', +b.dataset.infir===i));
  V0.el.querySelector('.inf-fl.iz').disabled = i===0; V0.el.querySelector('.inf-fl.de').disabled = i===n-1;
  V0.el.querySelectorAll('.inf-sl').forEach((s,j) => { s.classList.toggle('activa', j===i); s.setAttribute('aria-hidden', j!==i); });
  if (!sin) setTimeout(() => { animar(i); contarNums(V0.el.querySelector('.inf-sl[data-i="'+i+'"]')); }, 260); }
function narrativa(sl, on){ const a = sl.querySelector('.inf-hz'), b = sl.querySelector('[data-infhz]'); if (!a) return; on = on==null ? a.hidden : on; a.hidden = !on; b.classList.toggle('on', on); b.setAttribute('aria-expanded', on); }
function teclas(e){ if (!VISOR) return; if (e.key==='ArrowRight' || e.key==='PageDown'){ ir(VISOR.i+1); e.preventDefault(); } else if (e.key==='ArrowLeft' || e.key==='PageUp'){ ir(VISOR.i-1); e.preventDefault(); } else if (e.key==='Escape') cerrarVisor(); }
function eventosVisor(el){
  window.addEventListener('resize', alCambiar); document.addEventListener('keydown', teclas);
  el.addEventListener('click', e => { const T = s => e.target.closest(s); let b;
    if ((b = T('[data-infmov]'))) return ir(VISOR.i + +b.dataset.infmov);
    if ((b = T('[data-infir]'))) return ir(+b.dataset.infir);
    if ((b = T('[data-infhz]'))) return narrativa(b.closest('.inf-sl'));
    if ((b = T('[data-infex]'))) return ampliar(b);
    if (T('[data-infx]')) return cerrarVisor();
    if (T('[data-infpdf]')) return bajarPDF();
    if (T('[data-infwa]')) return whatsapp();
    if (T('[data-infenvia]')) return enviarPDF();
    // tocar fuera de la narrativa la cierra
    const sl = T('.inf-sl'); if (sl && !T('.inf-hz')) narrativa(sl, false); });
  // deslizar con el dedo (tableta): un gesto horizontal de más de 50 px cambia de lámina
  let x0 = null, y0 = 0; const st = $('inf-st');
  st.addEventListener('pointerdown', e => { if (e.target.closest('button, .inf-hz')) return; x0 = e.clientX; y0 = e.clientY; });
  st.addEventListener('pointerup', e => { if (x0==null) return; const dx = e.clientX-x0, dy = e.clientY-y0; x0 = null; if (Math.abs(dx)>50 && Math.abs(dx)>Math.abs(dy)*1.3) ir(VISOR.i + (dx<0 ? 1 : -1)); });
  st.addEventListener('pointercancel', () => { x0 = null; });
}
function aviso(t, accion){ const m = $('inf-msg'); if (!m) return; m.innerHTML = '<span>'+t+'</span>'+(accion || ''); m.classList.add('on'); clearTimeout(aviso.t); aviso.t = setTimeout(() => m.classList.remove('on'), accion ? 15000 : /…$/.test(t) ? 60000 : 4200); }
// PDF: una lámina por página, del tamaño de la lámina, con sus gráficas
// PDF: una lámina por página. Solo se copia el visor (no toda la página) y sin animaciones: así es rápido y sale completo.
let OCUPADO = false;
// Las tipografías se cargan antes de copiar la lámina (en la página y en la copia), para que el PDF salga con la misma letra
window.IANAMI_FUENTES = window.IANAMI_FUENTES || (d => Promise.all(['400','500','600'].map(w => w+' 16px Barlow').concat(['500','600','700'].map(w => w+' 16px "Barlow Condensed"')).map(f => d.fonts.load(f).catch(() => {}))).then(() => d.fonts.ready));
async function hacerPDF(avance){ const V0 = VISOR; if (!window.html2canvas || !window.jspdf) await window.IANAMI_LIBS_PDF(); await window.IANAMI_FUENTES(document);
  const st = $('inf-st'), w = st.offsetWidth, h = st.offsetHeight, { jsPDF } = window.jspdf, doc = new jsPDF({ orientation:'landscape', unit:'px', format:[1600, 900], hotfixes:['px_scaling'] }), i0 = V0.i, n = V0.o.laminas.length;
  const fuera = x => { if (!x.closest || /^(HTML|HEAD|BODY|STYLE|LINK|META|TITLE)$/.test(x.tagName)) return false; if (x.closest('.inf')) return x.classList.contains('inf-nb') || x.classList.contains('inf-hz') || x.classList.contains('inf-ex') || x.classList.contains('inf-ctl') || x.classList.contains('inf-msg'); return !x.contains(V0.el); };
  V0.el.classList.add('imprimiendo');
  try { for (let i=0;i<n;i++){ if (avance) avance(i+1, n); ir(i, true); V0.el.querySelectorAll('[_echarts_instance_]').forEach(g => { const c = echarts.getInstanceByDom(g); c && c.dispatchAction({ type:'hideTip' }); }); await new Promise(r => setTimeout(r, 60)); const sl = V0.el.querySelector('.inf-sl[data-i="'+i+'"]');
      const cv = await html2canvas(sl, { scale:1600/w, backgroundColor:'#FBFAF6', useCORS:true, logging:false, width:w, height:h, ignoreElements:fuera,
        onclone:d => { const e = d.createElement('style'); e.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;box-shadow:none!important}.inf-sl,.inf-sl-port,.inf-st{background:#FBFAF6!important}'; d.head.appendChild(e); d.querySelectorAll('[_echarts_instance_] > div:nth-child(n+2)').forEach(e => { e.style.display = 'none'; }); if (window.IANAMI_COLORFIJO) window.IANAMI_COLORFIJO(d); return window.IANAMI_FUENTES(d); } });
      if (i) doc.addPage([1600, 900], 'landscape'); doc.addImage(cv.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 1600, 900); } }
  finally { V0.el.classList.remove('imprimiendo'); ir(i0, true); }
  return doc; }
const nombrePDF = () => (VISOR.o.archivo || 'informe').replace(/[\\/:*?"<>|]/g, '')+' - descargado '+(() => { const d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); })()+'.pdf';
const avancePDF = pre => (k, n) => aviso(pre+' · lámina '+k+' de '+n+'…');
async function bajarPDF(){ if (!VISOR || OCUPADO) return; OCUPADO = true; try { (await hacerPDF(avancePDF('Preparando el PDF'))).save(nombrePDF()); aviso('PDF descargado.'); } catch(e){ aviso('No se pudo generar el PDF. Inténtalo de nuevo.'); } finally { OCUPADO = false; } }
// WhatsApp: en celular o tableta se manda el PDF con el menú de compartir; en computadora se abre WhatsApp Web con el resumen y se descarga el PDF para adjuntarlo
const textoWA = () => ('*'+VISOR.o.titulo+'*\n'+(VISOR.o.sub || '')).trim()+(VISOR.o.resumen ? '\n\n'+VISOR.o.resumen : '')+(VISOR.o.liga ? '\n\nVer en IA-NAMI: '+VISOR.o.liga : '');
let PDF_LISTO = null;
async function whatsapp(){ if (!VISOR || OCUPADO) return; const tactil = matchMedia('(pointer:coarse)').matches, archivos = tactil && navigator.canShare && navigator.canShare({ files:[new File(['x'], 'a.pdf', { type:'application/pdf' })] });
  if (!archivos){ window.open('https://wa.me/?text='+encodeURIComponent(textoWA()), '_blank', 'noopener');
    OCUPADO = true; try { (await hacerPDF(avancePDF('Se abrió WhatsApp con el resumen; preparando el PDF para adjuntarlo'))).save(nombrePDF()); aviso('PDF descargado: adjúntalo en el chat de WhatsApp que se abrió.'); } catch(e){ aviso('Se abrió WhatsApp con el resumen; el PDF no se pudo generar.'); } finally { OCUPADO = false; } return; }
  OCUPADO = true; try { const doc = await hacerPDF(avancePDF('Preparando el PDF para WhatsApp')); PDF_LISTO = new File([doc.output('blob')], nombrePDF(), { type:'application/pdf' });
    aviso('El PDF está listo.', '<button data-infenvia>Enviar por WhatsApp</button>'); } catch(e){ aviso('No se pudo generar el PDF. Inténtalo de nuevo.'); } finally { OCUPADO = false; } }
async function enviarPDF(){ if (!PDF_LISTO) return; try { await navigator.share({ files:[PDF_LISTO], title:VISOR.o.titulo, text:textoWA() }); $('inf-msg').classList.remove('on'); }
  catch(e){ if (!e || e.name!=='AbortError') aviso('No se pudo abrir el menú de compartir. Descarga el PDF y envíalo desde WhatsApp.'); } }

/* ==== [4] PIEZAS ================================================== */
// Encabezado editorial: antetítulo pequeño, título a la izquierda y la narrativa a la derecha
const enc = (t1, t2, ey) => '<header class="inf-h"><span class="inf-ey">'+(ey || 'Informe migratorio')+'</span><h2><b>'+t1+'</b>'+(t2 ? ' <span>'+t2+'</span>' : '')+'</h2></header>';
const chip = (a, b, txt) => b ? '<span class="inf-chip '+(Math.abs(pct(a, b)-100)<1 ? 'n' : a>=b ? 'u' : 'd')+'">'+flecha(pct(a, b)-100)+'<small>'+txt+'</small></span>' : '';
// Tarjeta de cifra: antetítulo con el periodo, el número, por día y el reparto en una barra delgada
function cifra(o){ const T = o.rp ? o.rp.reduce((x,y) => x+y.v, 0) : 0;
  return '<div class="inf-cf '+(o.tono || '')+'"><div class="inf-cf-e"><b>'+o.eti+'</b><span>'+o.fechas+'</span></div>'+
    '<div class="inf-cf-n"><span class="num">'+miles(o.n)+'</span><span class="u">'+o.uni+'</span></div>'+
    '<div class="inf-cf-s"><span><b>'+miles(o.prom)+'</b> por día</span>'+(o.chip || '')+'</div>'+
    (o.rp ? '<div class="inf-cf-r"><div class="inf-cf-rl">'+o.rp.map(x => '<span><i style="background:'+x.c+'"></i>'+x.nom+' <b>'+pc(x.v, T)+'</b> <em>'+miles(x.v)+'</em></span>').join('')+'</div>'+
      '<div class="inf-cf-rb">'+o.rp.map(x => '<i style="flex:'+Math.max(x.v, T*0.012)+' 1 0;background:'+x.c+'"></i>').join('')+'</div></div>' : '')+'</div>'; }
const kk = (eti, n, sub, cl) => '<div class="inf-kk '+(cl || '')+'"><span>'+eti+'</span><b class="num">'+n+'</b><small>'+sub+'</small></div>';
const caja = (tit, sub, cuerpo, cls) => '<div class="inf-c '+(cls || '')+'"><h3>'+tit+(sub ? '<small>'+sub+'</small>' : '')+(/inf-gr/.test(cuerpo) ? '<button class="inf-ex" data-infex title="Ampliar" aria-label="Ampliar o regresar">'+ICO.amp+'</button>' : '')+'</h3>'+cuerpo+'</div>';
// Gráficas: tamaños en --u, rejilla tenue, ejes discretos
const ejeX = (u, data, o) => Object.assign({ type:'category', data:data, axisTick:{ show:false }, axisLine:{ lineStyle:{ color:'#D6D1C2' } }, axisLabel:{ color:C.ink3, fontSize:u*0.66, hideOverlap:true, margin:u*0.6 } }, o || {});
const ejeY = u => ({ type:'value', splitNumber:4, splitLine:{ lineStyle:{ color:'#EFECE3' } }, axisLabel:{ color:C.ink3, fontSize:u*0.62, formatter:v => miles(v) } });
const ley = (u, l) => ({ top:0, left:0, icon:'roundRect', itemWidth:u*0.9, itemHeight:u*0.32, itemGap:u*1.5, textStyle:{ fontSize:u*0.7, color:C.ink2 }, data:l });
const tip = u => ({ trigger:'axis', confine:true, backgroundColor:'rgba(255,255,255,.97)', borderColor:'#E2DED0', textStyle:{ fontSize:Math.max(12, u*0.78), color:C.ink }, axisPointer:{ lineStyle:{ color:'#C9C4B5' } }, valueFormatter:v => v==null ? '—' : miles(v) });
const linea = (u, nom, data, col, o) => Object.assign({ name:nom, type:'line', data:data, symbol:'circle', symbolSize:data.length>50 ? u*0.38 : u*0.52, showSymbol:true, showAllSymbol:'auto', z:4, lineStyle:{ width:u*0.15, color:col, shadowBlur:u*0.2, shadowColor:'rgba(43,41,38,.12)', shadowOffsetY:u*0.05 },
  itemStyle:{ color:col, borderColor:'#fff', borderWidth:Math.max(1, u*0.09), shadowBlur:u*0.35, shadowColor:'rgba(43,41,38,.3)', shadowOffsetY:u*0.04 },
  label:{ show:true, position:'top', distance:u*0.3, fontSize:u*0.5, color:col, formatter:p => p.value==null ? '' : miles(p.value) }, labelLayout:{ hideOverlap:true },
  emphasis:{ focus:'series', scale:1.6, lineStyle:{ width:u*0.26 }, label:{ show:true, fontSize:u*0.72, fontWeight:700, color:col, backgroundColor:'rgba(255,255,255,.85)', padding:[u*0.08, u*0.2], borderRadius:u*0.15 } },
  blur:{ lineStyle:{ opacity:0.18 }, itemStyle:{ opacity:0.18 }, label:{ opacity:0.12 } } }, o || {});
const punteada = (u, col) => ({ lineStyle:{ width:u*0.12, color:col, type:[u*0.35, u*0.28] }, symbolSize:u*0.38 });
// Etiqueta solo en el último punto y en el máximo: lo demás se lee en el eje
function marcas(data, u, col){ let mx = -1, j = -1; data.forEach((v,i) => { if (v!=null && v>mx){ mx = v; j = i; } }); const ult = data.length-1;
  return data.map((v,i) => (i===ult || i===j) && v!=null ? { value:v, label:{ show:true, position:'top', distance:u*0.35, fontSize:u*0.62, fontWeight:700, color:col, formatter:p => miles(p.value) }, labelLayout:{ hideOverlap:false } } : v); }
const etiq = c => c.g==='m' ? c.l.map(x => MESC[f0(x.a).getMonth()]+' '+String(f0(x.a).getFullYear()).slice(2)) : c.l.map(x => fx(x.a));
// dato de cada barra arriba de ella; con muchas barras, en vertical hacia arriba para que no choque con la de al lado ni con las líneas de abajo
const etqBarra = (u, n, col) => ({ show:true, position:'top', rotate:n>16 ? 90 : 0, align:n>16 ? 'left' : 'center', verticalAlign:'middle', distance:u*0.25, fontSize:u*0.5, color:col || '#8A857A', formatter:p => p.value ? miles(p.value) : '' });
const barra = (u, nom, data, col, o) => Object.assign({ name:nom, type:'bar', data:data, itemStyle:{ color:col, borderRadius:[u*0.18,u*0.18,0,0] }, barMaxWidth:u*1.8, label:etqBarra(u, data.length), labelLayout:{ hideOverlap:true }, emphasis:{ focus:'series', label:{ fontWeight:700 } } }, o || {});
// Narrativa: frases que cuentan qué pasó, con las cifras en negritas
const cuanto = d => { const a = Math.abs(d); return a<1.5 ? 'prácticamente igual que' : (d>0 ? 'subió ' : 'bajó ')+'<b>'+a.toFixed(a<10 ? 1 : 0)+'%</b> contra'; };
const deCada = p => { const c = [[50,'la mitad'],[25,'1 de cada 4'],[75,'3 de cada 4'],[33.3,'1 de cada 3'],[66.7,'2 de cada 3'],[20,'1 de cada 5'],[80,'4 de cada 5'],[10,'1 de cada 10'],[90,'9 de cada 10']].find(x => Math.abs(x[0]-p)<=1.8);
  return c ? c[1] : Math.round(p/10)+' de cada 10'; };

/* ==== [5] INFORME ================================================= */
function datosInforme(a, b, ref){
  const r0 = refIni(ref, b), dias = difDias(a, b)+1, dR = difDias(r0, b)+1, pa = sumaDias(a, -dias), pb = sumaDias(a, -1), sem = esSemana(a, b);
  const eti = sem ? 'Semana' : 'Periodo personalizado', fch = rango(a, b), etR = REF[ref][0]+(ref==='anio' ? ' '+f0(b).getFullYear() : ''), fchR = rango(r0, b);
  let w0 = f0(b).getFullYear()+'-01-01'; while (dSem(w0)!==0) w0 = sumaDias(w0, 1);
  return { a, b, ref, r0, dias, dR, pa, pb, sem, eti, fch, etR, fchR, w0, ant:sem ? 'la semana anterior' : 'el periodo anterior' };
}
const IDX = ['Encuentros con extranjeros por la CBP','Encuentros por sector de la CBP','Mexicanos y extranjeros recibidos de EE. UU.','Mexicanos repatriados por tipo de retorno','Extranjeros rescatados por el INM','Caravanas migrantes','Narrativa de la semana'];
function portadaCifras(X){ const l = [['Encuentros CBP','cbp'],['Repatriados','rep'],['Rescatados por el INM','resc']].map(([n,k]) => { const a = V(k, null, X.a, X.b), b = V(k, null, X.pa, X.pb); return { n, a, b }; });
  return '<div class="inf-port-k">'+l.map(x => '<div><span>'+x.n+'</span><b class="num">'+miles(x.a)+'</b>'+(x.b ? '<em class="'+(Math.abs(pct(x.a, x.b)-100)<1 ? 'n' : x.a>=x.b ? 'u' : 'd')+'">'+flecha(pct(x.a, x.b)-100)+'</em>' : '')+'</div>').join('')+'</div>'; }
function laminaPortada(X){
  return { tit:'Portada', fte:'', cls:'inf-sl-port', html:'<div class="inf-port pt pt-b"><div class="pt-ilu"><img src="assets/portada/ilustracion.webp" alt=""></div><div class="pt-c"><img class="pt-logos" src="assets/portada/logos.webp" alt="Gobernación · Instituto Nacional de Migración"><div class="inf-port-a">'+
    '<h1><b>Informe</b> migratorio</h1><i class="inf-port-r"></i><p class="inf-port-f">'+(X.sem ? 'Semana del <b>'+fx(X.a)+'</b> al <b>'+fxa(X.b)+'</b>' : 'Periodo personalizado · <b>'+rango(X.a, X.b)+'</b>')+'</p>'+
    '<p class="inf-port-p">Comparado con el '+esc(enPer(X))+' · '+X.fchR+'</p>'+portadaCifras(X)+'</div>'+
    '<ol class="inf-port-i">'+IDX.map((t,i) => '<li data-infir="'+(i+1)+'"><b>'+String(i+1).padStart(2,'0')+'</b><span>'+t+'</span><i>'+ICO.de+'</i></li>').join('')+'</ol>'+
    '</div></div>' };
}
// Lámina 1: encuentros de la CBP (en EE. UU.), semana y periodo, por semana en el año y por mes desde el inicio del periodo
function laminaCBP(X){
  const t = V('cbp', null, X.a, X.b), mx = V('cbp', 'mx', X.a, X.b), ex = t-mx, tp = V('cbp', null, X.pa, X.pb), T = V('cbp', null, X.r0, X.b), MX = V('cbp', 'mx', X.r0, X.b);
  const sw = S('cbp', null, X.w0, X.b, 's'), swm = S('cbp', 'mx', X.w0, X.b, 's'), swr = S('resc', null, X.w0, X.b, 's');
  const sm = S('cbp', null, X.r0, X.b, 'm'), smm = S('cbp', 'mx', X.r0, X.b, 'm'), smr = S('resc', null, X.r0, X.b, 'm'), conR = Math.max(...smr.v)<=Math.max(...sm.v)*1.5, lw = etiq(sw.C), lm = etiq(sm.C), sx = sw.v.map((v,i) => v-swm.v[i]), smx = sm.v.map((v,i) => v-smm.v[i]);
  const sec = D('cbp', null, X.a, X.b, 'sec'), ult4 = sw.v.slice(-5, -1), prom4 = ult4.length ? ult4.reduce((x,y)=>x+y,0)/ult4.length : 0, rs = V('resc', null, X.a, X.b), hz = [];
  hz.push('La CBP registró <b>'+miles(t)+'</b> encuentros en la frontera'+(tp ? '; '+cuanto(pct(t, tp)-100)+' '+X.ant+' ('+miles(tp)+')' : '')+'.');
  if (prom4 && X.sem) hz.push('Frente al promedio de las cuatro semanas previas ('+miles(prom4)+'), el nivel '+(Math.abs(pct(t, prom4)-100)<3 ? 'se mantiene <b>estable</b>' : (t>prom4 ? 'está <b>por encima</b>' : 'está <b>por debajo</b>')+' ('+flecha(pct(t, prom4)-100)+')')+'.');
  hz.push('<b>'+cap(deCada(pct(mx, t)))+'</b> encuentros son de mexicanos ('+pc(mx, t)+'); en el '+esc(enPer(X))+' la proporción es '+(Math.abs(pct(mx, t)-pct(MX, T))<3 ? 'casi la misma' : 'de')+' ('+pc(MX, T)+').');
  if (sec.length) hz.push('<b>'+esc(sec[0][0])+'</b> fue el sector con más actividad: '+miles(sec[0][1])+' encuentros, '+pc(sec[0][1], t)+' del total.');
  if (rs && ex) hz.push('Del lado mexicano, el INM rescató a <b>'+miles(rs)+'</b> extranjeros, '+(rs>ex ? 'más que' : 'menos que')+' los <b>'+miles(ex)+'</b> extranjeros que encontró la CBP en su frontera.');
  return { tit:IDX[0], fte:'Fuente: CBP, encuentros en la frontera de EE. UU. con México · rescates: DGCOR · semanas de lunes a domingo', hz:hz,
    html:enc('Encuentros', 'con extranjeros por la CBP', 'Informe migratorio · lámina 1')+'<div class="inf-cfs">'+
      cifra({ eti:X.eti, fechas:X.fch, n:t, uni:'encuentros', prom:t/X.dias, chip:chip(t, tp, 'vs '+X.ant.replace(/^(la|el) /, '')), rp:[{ nom:'Mexicanos', v:mx, c:C.verde }, { nom:'Extranjeros', v:ex, c:C.vino }], tono:'a' })+
      cifra({ eti:X.etR, fechas:X.fchR, n:T, uni:'encuentros', prom:T/X.dR, rp:[{ nom:'Mexicanos', v:MX, c:C.verde }, { nom:'Extranjeros', v:T-MX, c:C.vino }], tono:'b' })+'</div>'+
      '<div class="inf-g2">'+caja('Por semana en '+f0(X.b).getFullYear(), 'punteada: rescates del INM en México', '<div id="g-cbp-s" class="inf-gr"></div>')+
        caja('Por mes', X.fchR+' · barras: total'+(conR ? ' · punteada: rescates del INM' : ' · los rescates por mes están en la lámina 5'), '<div id="g-cbp-m" class="inf-gr"></div>')+'</div>',
    graf:[{ id:'g-cbp-s', op:u => ({ grid:{ left:u*3, right:u*1.6, top:u*2.6, bottom:u*1.8 }, legend:ley(u, ['Total','Mexicanos','Extranjeros','Rescates INM']), tooltip:tip(u), xAxis:ejeX(u, lw), yAxis:ejeY(u),
        series:[linea(u, 'Total', marcas(sw.v, u, C.ink), C.ink), linea(u, 'Mexicanos', swm.v, C.verde), linea(u, 'Extranjeros', sx, C.vino), linea(u, 'Rescates INM', swr.v, C.rojo, punteada(u, C.rojo))] }) },
      { id:'g-cbp-m', op:u => { const ja = sm.C.l.findIndex(c => c.a.slice(0,4)!==sm.C.l[0].a.slice(0,4));
        return { grid:{ left:u*3.4, right:u*1.2, top:u*3, bottom:u*1.8 }, legend:ley(u, ['Total','Mexicanos','Extranjeros'].concat(conR ? ['Rescates INM'] : [])), tooltip:tip(u), xAxis:ejeX(u, lm), yAxis:ejeY(u),
        series:[barra(u, 'Total', sm.v, C.arena, { barMaxWidth:u*2, markLine:ja>0 ? { silent:true, symbol:'none', lineStyle:{ color:C.ink3, type:'dashed', width:1 }, label:{ formatter:sm.C.l[ja].a.slice(0,4), fontSize:u*0.7, fontWeight:600, color:C.ink2 }, data:[{ xAxis:ja-0.5 }] } : undefined }),
          linea(u, 'Mexicanos', smm.v, C.verde), linea(u, 'Extranjeros', smx, C.vino)].concat(conR ? [linea(u, 'Rescates INM', smr.v, C.rojo, punteada(u, C.rojo))] : []) }; } }] };
}
// Lámina 2: sectores de la CBP con el estado mexicano con el que colindan
const SECTOR = { 'San Diego':[[-117.0,32.6],'Baja California'], 'El Centro':[[-115.55,32.75],'Baja California'], 'Yuma':[[-114.6,32.55],'Sonora'], 'Tucson':[[-110.95,31.45],'Sonora'], 'El Paso':[[-106.5,31.75],'Chihuahua'],
  'Big Bend':[[-103.6,29.6],'Chihuahua y Coahuila'], 'Del Rio':[[-100.9,29.4],'Coahuila'], 'Laredo':[[-99.5,27.5],'Coahuila, N. León y Tamaulipas'], 'Rio Grande':[[-98.2,26.2],'Tamaulipas'] };
function mapaRegion(){ if (echarts.getMap('inf-region')) return true; const G = window.IANAMI_GEO; if (!G) return false;
  const CA = new Set(['P_320','P_340','P_222','P_084','P_558','P_188','P_591']);
  echarts.registerMap('inf-region', { type:'FeatureCollection', features:G.features.filter(f => f.properties.t==='m' || f.properties.t==='u' || CA.has(f.properties.key)) }); return true; }
function laminaSectores(X){
  const T = V('cbp', null, X.r0, X.b), MX = V('cbp', 'mx', X.r0, X.b), l = D('cbp', null, X.r0, X.b, 'sec'), lm = new Map(D('cbp', 'mx', X.r0, X.b, 'sec')), ls = new Map(D('cbp', null, X.a, X.b, 'sec')), lp = new Map(D('cbp', null, X.pa, X.pb, 'sec'));
  const fil = l.map(([n,v],i) => ({ n, v, mx:lm.get(n) || 0, ex:v-(lm.get(n) || 0), s:ls.get(n) || 0, p:lp.get(n) || 0, r:i+1 })), hz = [], top3 = fil.slice(0,3).reduce((x,f) => x+f.v, 0);
  if (fil.length>=3) hz.push('Tres sectores concentran <b>'+pc(top3, T)+'</b> de los encuentros del '+esc(enPer(X))+': <b>'+fil.slice(0,3).map(f => esc(f.n)).join(', ').replace(/, ([^,]*)$/, ' y $1')+'</b>.');
  const ext = fil.filter(f => f.v>=1000).sort((a,b) => b.ex/b.v-a.ex/a.v)[0]; if (ext) hz.push('El perfil cambia por sector: en <b>'+esc(ext.n)+'</b> los extranjeros son '+pc(ext.ex, ext.v)+' de los encuentros, contra '+pc(T-MX, T)+' en toda la frontera.');
  const cam = fil.filter(f => f.p>=50).map(f => [f, f.s-f.p]).sort((a,b) => Math.abs(b[1])-Math.abs(a[1]))[0];
  if (cam && cam[1]) hz.push('En la semana, el mayor movimiento fue en <b>'+esc(cam[0].n)+'</b>: pasó de '+miles(cam[0].p)+' a '+miles(cam[0].s)+' encuentros ('+flecha(pct(cam[0].s, cam[0].p)-100)+').');
  const mxv = Math.max(1, ...fil.map(f => f.v));
  // tabla como la del informe: lugar, sector, estado con el que colinda, total, % y el reparto; el color de cada celda crece con su cifra
  const mxM = Math.max(1, ...fil.map(f => f.mx)), mxE = Math.max(1, ...fil.map(f => f.ex)), tinte = (v, m, rgb) => { const a = 0.06+0.6*v/m; return 'background:rgba('+rgb+','+a.toFixed(2)+');'+(a>0.42 ? 'color:#fff' : ''); };
  const tabla = '<table class="inf-tb inf-tb-s"><thead><tr><th></th><th>Sector</th><th>Colinda con</th><th class="x">Total</th><th class="x">%</th><th class="x">Mexicanos</th><th class="x">Extranjeros</th><th class="x">Semana</th></tr></thead><tbody>'+
    fil.map(f => '<tr><td class="rk">'+f.r+'</td><td><b>'+esc(f.n)+'</b><span class="inf-tb-b"><i style="width:'+(f.mx/mxv*100).toFixed(1)+'%;background:'+C.verde+'"></i><i style="width:'+(f.ex/mxv*100).toFixed(1)+'%;background:'+C.vino+'"></i></span></td><td class="m">'+esc((SECTOR[f.n] || [0,''])[1])+'</td>'+
      '<td class="x c" style="'+tinte(f.v, mxv, '143,127,46')+'"><b>'+miles(f.v)+'</b></td><td class="x p">'+pc(f.v, T)+'</td><td class="x c" style="'+tinte(f.mx, mxM, '47,102,87')+'">'+miles(f.mx)+'</td><td class="x c" style="'+tinte(f.ex, mxE, '126,48,43')+'">'+miles(f.ex)+'</td>'+
      '<td class="x">'+miles(f.s)+(f.p ? '<i class="'+(f.s>=f.p ? 'u' : 'd')+'">'+(f.s>=f.p ? '▲' : '▼')+'</i>' : '')+'</td></tr>').join('')+
    '<tr class="tot"><td></td><td><b>Total</b></td><td class="m">frontera norte</td><td class="x"><b>'+miles(T)+'</b></td><td class="x p">100%</td><td class="x">'+miles(MX)+'</td><td class="x">'+miles(T-MX)+'</td><td class="x">'+miles(fil.reduce((x,f) => x+f.s, 0))+'</td></tr></tbody></table>';
  return { tit:IDX[1], fte:'Fuente: CBP · sectores de la Patrulla Fronteriza y puertos de entrada, de mayor a menor · «Semana»: '+X.fch, hz:hz,
    html:enc('Encuentros por sector', esc(X.etR)+' · '+X.fchR, 'Informe migratorio · lámina 2')+
      '<div class="inf-sec"><div class="inf-sec-k">'+kk('Mexicanos', miles(MX), pc(MX, T)+' del total', 'v')+kk('Extranjeros', miles(T-MX), pc(T-MX, T)+' del total', 'r')+kk('Total', miles(T), miles(T/X.dR)+' por día')+'</div>'+
      '<div class="inf-c inf-sec-m inf-mapa"><button class="inf-ex flota" data-infex title="Ampliar" aria-label="Ampliar o regresar">'+ICO.amp+'</button><div id="g-sec" class="inf-gr"></div>'+
        '<div class="inf-mapa-d solo-ex"><span class="inf-ey">Encuentros por sector · '+esc(X.etR)+'</span><ol>'+fil.map(f => '<li><b>'+f.r+'. '+esc(f.n)+'</b><span><em style="color:'+C.verde+'">'+pc(f.mx, f.v)+' mex.</em> · <em style="color:'+C.vino+'">'+pc(f.ex, f.v)+' ext.</em> · semana '+miles(f.s)+'</span><i>'+miles(f.v)+'</i></li>').join('')+'</ol></div></div><div class="inf-c inf-sec-t">'+tabla+'</div></div>',
    graf:[{ id:'g-sec', op:u => { if (!mapaRegion()) return {}; const mv = Math.max(1, ...fil.map(f => f.v));
      return { backgroundColor:'#EAE7DE', geo:{ map:'inf-region', nameProperty:'key', roam:false, silent:true, emphasis:{ disabled:true }, select:{ disabled:true }, tooltip:{ show:false }, boundingCoords:[[-118.6,33.6],[-96.4,25.0]], aspectScale:0.86, layoutCenter:['50%','50%'], layoutSize:'100%',
          itemStyle:{ areaColor:'#F6F4EE', borderColor:'#D3CEC0', borderWidth:0.6 }, regions:window.IANAMI_GEO.features.filter(f => f.properties.t==='m').map(f => ({ name:f.properties.key, itemStyle:{ areaColor:'#FDFCF9', borderColor:'#C6C0B1' }, emphasis:{ disabled:true } })) },
        tooltip:{ confine:true, textStyle:{ fontSize:Math.max(12, u*0.78) }, formatter:p => '<b>'+esc(p.data.n)+'</b><br>'+miles(p.data.v)+' encuentros · '+pc(p.data.mx, p.data.v)+' mexicanos' },
        series:[{ type:'scatter', coordinateSystem:'geo', data:fil.filter(f => SECTOR[f.n]).map(f => ({ n:f.n, v:f.v, mx:f.mx, value:SECTOR[f.n][0].concat(f.v) })),
          symbolSize:d => u*0.7 + Math.sqrt(d[2]/mv)*u*4, itemStyle:{ color:'rgba(126,48,43,.62)', borderColor:'#fff', borderWidth:1.2 },
          label:{ show:true, position:'top', distance:u*0.3, fontSize:u*0.7, color:C.ink, formatter:p => p.data.n+'  {v|'+miles(p.data.v)+'}', rich:{ v:{ fontSize:u*0.66, color:C.ink3 } } }, labelLayout:{ hideOverlap:true } }] }; } }] };
}
// Lámina 3: personas que EE. UU. entrega a México (mexicanos repatriados + extranjeros recibidos)
function laminaRecibidos(X){
  const mx = V('rep', null, X.a, X.b), ex = V('rec', null, X.a, X.b), t = mx+ex, tp = V('rep', null, X.pa, X.pb)+V('rec', null, X.pa, X.pb);
  const MX = V('rep', null, X.r0, X.b), EX = V('rec', null, X.r0, X.b), T = MX+EX;
  const aer = V('rep', 'aer', X.a, X.b), ter = mx-aer, pa = BASES.rep.dims.p.vals, AE = pa.map((n,i) => /vuelos/.test(n) ? i : -1).filter(i => i>=0);
  // vuelos PRIM: días con llegada y personas por aeropuerto (el archivo no trae número de vuelos)
  const prim = AE.map(i => { const nom = pa[i].replace(/\s*\(vuelos.*$/,''), Cb = cubetas(X.a, X.b, 'd'), s = serie(Object.assign({ ind:INDK.rep, d0:X.a, d1:X.b, filtros:{ p:[i] } }, medParte(INDK.rep, parteDe(INDK.rep, 'aer'))), Cb);
    return { nom, v:s.reduce((x,y)=>x+y,0), d:s.filter(Boolean).length }; }).filter(x => x.v).sort((a,b) => b.v-a.v);
  const ghF = fin('gh'), ghOk = INDK.gh && ghF>=X.b, ghS = INDK.gh ? V('gh', null, X.a, X.b) : 0, ghL = INDK.gh ? D('gh', null, ini('gh'), ghF, 'pa') : [], ghT = ghL.reduce((x,y) => x+y[1], 0);
  const smx = S('rep', null, X.w0, X.b, 's'), sex = S('rec', null, X.w0, X.b, 's'), lw = etiq(smx.C), st = smx.v.map((v,i) => v+sex.v[i]), hz = [];
  hz.push('EE. UU. entregó a México <b>'+miles(t)+'</b> personas'+(tp ? '; '+cuanto(pct(t, tp)-100)+' '+X.ant : '')+'. Casi todas son mexicanas (<b>'+pc(mx, t)+'</b>).');
  hz.push('La vía aérea domina: <b>'+pc(aer, mx)+'</b> de los mexicanos llegó en vuelos PRIM ('+miles(aer)+') y '+pc(ter, mx)+' por garitas y puentes ('+miles(ter)+').');
  if (prim.length) hz.push('<b>'+esc(prim[0].nom)+'</b> fue el aeropuerto con más llegadas: '+miles(prim[0].v)+' personas en '+prim[0].d+' '+(prim[0].d===1 ? 'día' : 'días')+' con vuelo'+(prim[1] ? ', seguido de '+esc(prim[1].nom)+' ('+miles(prim[1].v)+')' : '')+'.');
  hz.push('Los extranjeros recibidos sumaron <b>'+miles(ex)+'</b> ('+pc(ex, t)+'); en el '+esc(enPer(X))+' representan '+pc(EX, T)+'.');
  const cajaAer = caja('<b>'+miles(aer)+'</b> por vía aérea', 'vuelos PRIM · días con llegada y personas', prim.length ? '<ul class="inf-ls">'+prim.map(p => '<li><span>'+esc(p.nom)+'</span><small>'+p.d+' '+(p.d===1 ? 'día' : 'días')+'</small><b>'+miles(p.v)+'</b></li>').join('')+'</ul>' : '<p class="inf-nt">Sin llegadas aéreas en el periodo.</p>', 'inf-c-k');
  const cajaTer = caja('<b>'+miles(ter + (ghOk ? ghS : 0))+'</b> por vía terrestre', X.fch, '<div class="inf-dos"><div><b class="num">'+miles(ter)+'</b><span>Frontera norte<small>garitas y puentes</small></span></div><div><b class="num">'+(ghOk ? miles(ghS) : '—')+'</b><span>Frontera sur<small>'+(ghOk ? 'Guatemala y Honduras' : 'último dato: '+fx(ghF))+'</small></span></div></div>', 'inf-c-k');
  const cajaGH = INDK.gh ? caja('<b>'+miles(ghT)+'</b> enviados a otros países', 'mexicanos que EE. UU. mandó a Guatemala u Honduras · '+rango(ini('gh'), ghF), '<div class="inf-dos">'+ghL.map(([n,v]) => '<div><b class="num">'+miles(v)+'</b><span>'+esc(n)+'</span></div>').join('')+'</div>', 'inf-c-k') : '';
  return { tit:IDX[2], fte:'Fuente: DGPMV (repatriados; Guatemala y Honduras) y DGCOR (extranjeros recibidos) · la frontera sur ya está contada en Repatriados (Ciudad Hidalgo) · el archivo no trae número de vuelos', hz:hz,
    html:enc('Mexicanos y extranjeros', 'recibidos de EE. UU.', 'Informe migratorio · lámina 3')+'<div class="inf-cfs">'+
      cifra({ eti:X.eti, fechas:X.fch, n:t, uni:'recibidos', prom:t/X.dias, chip:chip(t, tp, 'vs '+X.ant.replace(/^(la|el) /, '')), rp:[{ nom:'Mexicanos', v:mx, c:C.verde }, { nom:'Extranjeros', v:ex, c:C.vino }], tono:'a' })+
      cifra({ eti:X.etR, fechas:X.fchR, n:T, uni:'recibidos', prom:T/X.dR, rp:[{ nom:'Mexicanos', v:MX, c:C.verde }, { nom:'Extranjeros', v:EX, c:C.vino }], tono:'b' })+'</div>'+
      '<div class="inf-g12"><div class="inf-col">'+cajaAer+cajaTer+cajaGH+'</div>'+caja('Personas devueltas por EE. UU., por semana', f0(X.b).getFullYear(), '<div id="g-rec" class="inf-gr"></div>')+'</div>',
    graf:[{ id:'g-rec', op:u => ({ grid:{ left:u*3, right:u*1.6, top:u*2.6, bottom:u*1.8 }, legend:ley(u, ['Total','Mexicanos','Extranjeros']), tooltip:tip(u), xAxis:ejeX(u, lw), yAxis:ejeY(u),
      series:[barra(u, 'Total', st, C.arena, { barMaxWidth:u*1.3, label:{ show:false } }), linea(u, 'Mexicanos', marcas(smx.v, u, C.verde), C.verde), linea(u, 'Extranjeros', sex.v, C.vino)] }) }] };
}
// Lámina 4: repatriados por tipo de retorno (garitas y puentes contra vuelos PRIM), por semana y por año
function laminaRetorno(X){
  const T = V('rep', null, X.r0, X.b), A = V('rep', 'aer', X.r0, X.b); let w0 = X.r0; while (dSem(w0)!==0) w0 = sumaDias(w0, 1);
  const st = S('rep', null, w0, X.b, 's'), sa = S('rep', 'aer', w0, X.b, 's'), ster = st.v.map((v,i) => v-sa.v[i]), lw = etiq(st.C);
  const anos = []; for (let y = f0(X.r0).getFullYear(); y<=f0(X.b).getFullYear(); y++){ const a = maxS([X.r0, y+'-01-01']), b = minS([X.b, y+'-12-31']); const t = V('rep', null, a, b), ae = V('rep', 'aer', a, b); anos.push({ y, a, b, t, ae, te:t-ae }); }
  const ja = st.C.l.findIndex(c => c.a.slice(0,4)!==st.C.l[0].a.slice(0,4)), hz = [];
  if (anos.length>1){ const p = anos[anos.length-2], u = anos[anos.length-1]; hz.push('Cambió la forma de regresar: la vía aérea pasó de <b>'+pc(p.ae, p.t)+'</b> de los repatriados en '+p.y+' a <b>'+pc(u.ae, u.t)+'</b> en '+u.y+'.'); }
  const k1 = st.C.l.findIndex((c,i) => i>0 && sa.v[i]>ster[i] && sa.v[i-1]<=ster[i-1]); if (k1>0) hz.push('Desde la semana del <b>'+fxa(st.C.l[k1].a)+'</b> llegan más mexicanos en vuelos PRIM que por garitas y puentes.');
  const sem = st.v[st.v.length-1], semA = sa.v[sa.v.length-1]; if (sem) hz.push('En la última semana fueron <b>'+miles(sem)+'</b> repatriados; '+pc(semA, sem)+' en vuelos PRIM.');
  const mx = st.v.indexOf(Math.max(...st.v)); if (mx>=0) hz.push('La semana con más repatriados del periodo fue la del <b>'+fxa(st.C.l[mx].a)+'</b>, con '+miles(st.v[mx])+'.');
  return { tit:IDX[3], fte:'Fuente: DGPMV, Repatriados · aérea = vuelos PRIM · semanas de lunes a domingo', hz:hz,
    html:enc('Mexicanos repatriados', 'por tipo de retorno', 'Informe migratorio · lámina 4')+
      '<div class="inf-rt">'+kk(esc(X.etR)+' · '+X.fchR, miles(T), 'mexicanos repatriados')+kk('Terrestre', miles(T-A), pc(T-A, T)+' · garitas y puentes', 'o')+kk('Aérea', miles(A), pc(A, T)+' · vuelos PRIM', 'v')+'</div>'+
      caja('Por semana', 'barras: total · líneas: terrestre y aérea', '<div id="g-ret" class="inf-gr"></div>', 'inf-c-alta')+
      '<div class="inf-anos">'+anos.map(y => '<div class="inf-ano"><span class="inf-ano-y">'+y.y+'</span><b class="num">'+miles(y.t)+'</b><small>'+rango(y.a, y.b)+'</small><div class="inf-ano-b"><i style="flex:'+y.te+' 1 0;background:'+C.ocre+'"></i><i style="flex:'+y.ae+' 1 0;background:'+C.verde+'"></i></div><div class="inf-ano-r"><span>Terrestre <b>'+pc(y.te, y.t)+'</b> '+miles(y.te)+'</span><span>Aérea <b>'+pc(y.ae, y.t)+'</b> '+miles(y.ae)+'</span></div></div>').join('')+'</div>',
    graf:[{ id:'g-ret', op:u => ({ grid:{ left:u*3, right:u*1.6, top:u*2.6, bottom:u*1.8 }, legend:ley(u, ['Total','Terrestre','Aérea']), tooltip:tip(u), xAxis:ejeX(u, lw), yAxis:ejeY(u),
      series:[barra(u, 'Total', st.v, C.arena2, { barCategoryGap:'22%', markLine:ja>0 ? { silent:true, symbol:'none', lineStyle:{ color:C.ink3, type:'dashed', width:1 }, label:{ formatter:st.C.l[ja].a.slice(0,4), fontSize:u*0.72, fontWeight:600, color:C.ink2 }, data:[{ xAxis:ja }] } : undefined }),
        linea(u, 'Terrestre', marcas(ster, u, C.ocre), C.ocre), linea(u, 'Aérea', marcas(sa.v, u, C.verde), C.verde)] }) }] };
}
// Lámina 5: rescatados por el INM, primera vez y reincidencia
function laminaRescates(X){
  const R = (p, a, b) => V('resc', p, a, b), t = R(null, X.a, X.b), pv = R('pv', X.a, X.b), rei = R('rei', X.a, X.b), T = R(null, X.r0, X.b), PV = R('pv', X.r0, X.b), REI = R('rei', X.r0, X.b), tp = R(null, X.pa, X.pb);
  const sm = S('resc', null, X.r0, X.b, 'm'), spv = S('resc', 'pv', X.r0, X.b, 'm'), sre = S('resc', 'rei', X.r0, X.b, 'm'), lm = etiq(sm.C);
  const anos = []; for (let y = f0(X.r0).getFullYear(); y<=f0(X.b).getFullYear(); y++){ const a = maxS([X.r0, y+'-01-01']), b = minS([X.b, y+'-12-31']); anos.push({ y, t:R(null, a, b), pv:R('pv', a, b), re:R('rei', a, b) }); }
  const ua = anos[anos.length-1], hz = [], nat = D('resc', null, X.a, X.b, 'n');
  hz.push('El INM rescató a <b>'+miles(t)+'</b> extranjeros'+(tp ? '; '+cuanto(pct(t, tp)-100)+' '+X.ant+' ('+miles(tp)+')' : '')+'.');
  hz.push('<b>'+cap(deCada(pct(pv, t)))+'</b> fueron rescatados por primera vez ('+pc(pv, t)+'); en el '+esc(enPer(X))+', '+pc(PV, T)+'.');
  if (anos.length>1){ const p = anos[anos.length-2], baja = ua.re/ua.t<=p.re/p.t; hz.push('La reincidencia '+(baja ? 'bajó' : 'subió')+' de <b>'+pc(p.re, p.t)+'</b> en '+p.y+' a <b>'+pc(ua.re, ua.t)+'</b> en '+ua.y+': '+(baja ? 'cada vez más rescates son de personas nuevas' : 'crece la proporción de personas rescatadas más de una vez')+'.'); }
  if (nat.length) hz.push('<b>'+esc(nat[0][0])+'</b> es la nacionalidad con más rescatados ('+miles(nat[0][1])+', '+pc(nat[0][1], t)+')'+(nat[1] ? ', seguida de '+esc(nat[1][0])+' ('+miles(nat[1][1])+')' : '')+'.');
  const eq = (eti, fch, a, b, c, tono) => '<div class="inf-eq '+tono+'"><div class="inf-cf-e"><b>'+eti+'</b><span>'+fch+'</span></div><div class="inf-eq-f">'+
    '<div><b class="num v">'+miles(a)+'</b><small>primera vez</small></div><i>+</i><div><b class="num r">'+miles(b)+'</b><small>reincidencias</small></div><i>=</i><div><b class="num">'+miles(a+b)+'</b><small>rescatados · '+miles(c)+' por día</small></div></div></div>';
  return { tit:IDX[4], fte:'Fuente: DGCOR, reporte de rescates de las O.R. · semanas de lunes a domingo', hz:hz,
    html:enc('Extranjeros rescatados', 'por el INM', 'Informe migratorio · lámina 5')+'<div class="inf-cfs">'+eq(X.eti, X.fch, pv, rei, t/X.dias, 'a')+eq(X.etR, X.fchR, PV, REI, T/X.dR, 'b')+'</div>'+
      caja('Por mes', X.fchR+' · barras: total · líneas: primera vez y reincidencia', '<div id="g-res" class="inf-gr"></div>', 'inf-c-alta')+
      '<p class="inf-fr">En '+ua.y+' se han rescatado <b>'+miles(ua.t)+'</b> extranjeros: '+miles(ua.pv)+' por primera vez y '+miles(ua.re)+' reincidencias.</p>',
    graf:[{ id:'g-res', op:u => ({ grid:{ left:u*3, right:u*1.6, top:u*2.6, bottom:u*1.8 }, legend:ley(u, ['Total','Primera vez','Reincidencia']), tooltip:tip(u), xAxis:ejeX(u, lm), yAxis:ejeY(u),
      series:[barra(u, 'Total', sm.v, C.arena, { barMaxWidth:u*2.2 }), linea(u, 'Primera vez', spv.v, C.verde), linea(u, 'Reincidencia', sre.v, C.vino)] }) }] };
}
// Lámina 6: caravanas (registro de caravanas: nombre, salida y personas estimadas)
// recorrido por la carretera costera de Chiapas y Oaxaca (la 200), de Tapachula hacia el norte: la línea va por tierra hasta donde se disolvió
const CARRETERA = [[-92.263,14.905],[-92.46,15.14],[-92.66,15.32],[-92.9,15.43],[-93.21,15.69],[-93.53,15.93],[-93.75,16.09],[-93.9,16.24],[-94.1,16.38],[-94.35,16.48],[-94.62,16.5],[-94.95,16.55],[-95.1,16.45],[-95.22,16.33]];
function ruta(a, b){ if (Math.abs(a[0]-CARRETERA[0][0])>0.2 || Math.abs(a[1]-CARRETERA[0][1])>0.2) return [a, b];
  const l = CARRETERA.filter(p => p[0] >= b[0]-0.05); return l.concat([b]); }
function laminaCaravanas(X){
  const L = ((window.IANAMI_DATOS || {}).caravanas || []).filter(c => c.f && c.f<=X.b).sort((a,b) => a.f<b.f ? -1 : 1); if (!L.length) return null;
  const desde = L[0].f, enR = L.filter(c => c.f>=X.r0), u0 = L[L.length-1], enS = L.filter(c => c.f>=X.a && c.f<=X.b), mxp = Math.max(1, ...L.map(c => c.p || 0));
  const ETQ = new Set(L.slice().sort((a,b) => (b.p||0)-(a.p||0)).slice(0, 4).map(c => c.n).concat([u0.n])), grande = L.slice().sort((a,b) => (b.p||0)-(a.p||0))[0];
  const hz = ['Desde el '+fxa(desde)+' se registran <b>'+L.length+'</b> caravanas; <b>'+enR.length+'</b> de ellas en el '+esc(enPer(X))+'.'];
  hz.push(enS.length ? 'En la semana salieron <b>'+enS.length+'</b> caravanas.' : 'No salió ninguna caravana en la semana; la más reciente es <b>«'+esc(u0.n)+'»</b>, que partió el '+fxa(u0.f)+' de '+esc(u0.s)+' con '+miles(u0.p || 0)+' personas estimadas.');
  hz.push((grande.f<X.r0 ? 'Las caravanas recientes son más chicas: la' : 'La')+' mayor registrada fue «'+esc(grande.n)+'» ('+fxa(grande.f)+'), con <b>'+miles(grande.p || 0)+'</b> personas.');
  return { tit:IDX[5], fte:'Fuente: registro de caravanas · personas estimadas al salir, según los reportes', hz:hz,
    html:enc('Caravanas', 'migrantes', 'Informe migratorio · lámina 6')+
      '<div class="inf-cv"><div class="inf-cv-k">'+kk('Desde '+fxa(desde), String(L.length), 'caravanas registradas')+kk(esc(X.etR), String(enR.length), 'caravanas', 'r')+
        '<div class="inf-c inf-cv-u"><span class="inf-ey">La más reciente</span><b>«'+esc(u0.n)+'»</b><span>Salió el <b>'+fxa(u0.f)+'</b><br>de '+esc(u0.s)+'</span><span class="num">'+miles(u0.p || 0)+'<small>personas estimadas</small></span></div></div>'+
      '<div class="inf-c inf-cv-g inf-mapa"><h3>¿De dónde salen y hasta dónde llegan?<small>línea: de la salida al lugar donde se disolvió, cuando se registró · en vino, las del '+esc(enPer(X))+'</small><button class="inf-ex" data-infex title="Ampliar" aria-label="Ampliar o regresar">'+ICO.amp+'</button></h3>'+
        '<div class="inf-mapa-w"><div id="g-carm" class="inf-gr"></div><div class="inf-mapa-d"><span class="inf-ey">Caravanas recientes</span><ol>'+L.slice(-8).reverse().map(c => '<li class="'+(c.f>=X.r0 ? 'r' : '')+'"><b>«'+esc(c.n)+'»</b><span>'+fxa(c.f)+' · '+esc(String(c.s).split(',').slice(-2)[0].trim())+(c.d ? ' → '+esc(String(c.d).split(',')[0]) : '')+'</span><i>'+miles(c.p || 0)+'</i></li>').join('')+'</ol></div></div></div></div>',
    graf:[{ id:'g-carm', op:u => { if (!mapaRegion()) return {}; const sal = new Map(); L.forEach(c => { if (!c.sx) return; const k = c.sx.join(','); if (!sal.has(k)) sal.set(k, { c:c.sx, s:c.s, n:0, p:0 }); const x = sal.get(k); x.n++; x.p += c.p || 0; });
        const nomL = s => String(s).split(',').slice(-2)[0].trim(), mxS = Math.max(1, ...[...sal.values()].map(x => x.n)), rut = L.filter(c => c.sx && c.dx);
        return { backgroundColor:'#EAE7DE', geo:{ map:'inf-region', nameProperty:'key', roam:false, silent:true, emphasis:{ disabled:true }, select:{ disabled:true }, tooltip:{ show:false }, boundingCoords:[[-98.6,18.2],[-86.0,13.2]], aspectScale:0.96, layoutCenter:['50%','50%'], layoutSize:'100%',
            itemStyle:{ areaColor:'#F6F4EE', borderColor:'#D3CEC0', borderWidth:0.6 }, regions:window.IANAMI_GEO.features.filter(f => f.properties.t==='m').map(f => ({ name:f.properties.key, itemStyle:{ areaColor:'#FDFCF9', borderColor:'#C6C0B1' }, emphasis:{ disabled:true } })) },
          tooltip:{ confine:true, textStyle:{ fontSize:Math.max(12, u*0.78) } },
          series:[{ type:'lines', coordinateSystem:'geo', zlevel:1, polyline:true, data:rut.map(c => ({ n:c.n, coords:ruta(c.sx, c.dx), lineStyle:{ color:c.f>=X.r0 ? '#7E302B' : '#9A958A', width:u*0.08+Math.sqrt((c.p||0)/mxp)*u*0.3, opacity:0.65 } })),
              effect:{ show:true, period:5, trailLength:0.25, symbol:'circle', symbolSize:u*0.35, color:'#C4605A' }, tooltip:{ formatter:p => '<b>«'+esc(p.data.n)+'»</b>' } },
            { type:'effectScatter', coordinateSystem:'geo', zlevel:2, rippleEffect:{ scale:2.6, brushType:'stroke' }, data:[...sal.values()].map(x => ({ value:x.c, n:x.n, s:x.s, p:x.p })),
              symbolSize:d => u*0.9+Math.sqrt(1)*u*0.4, itemStyle:{ color:'#7E302B', shadowBlur:u*0.4, shadowColor:'rgba(43,41,38,.3)' },
              label:{ show:true, position:'right', fontSize:u*0.72, color:C.ink, formatter:p => nomL(p.data.s)+'  {v|'+p.data.n+' '+(p.data.n===1 ? 'caravana' : 'caravanas')+'}', rich:{ v:{ fontSize:u*0.66, color:C.ink3 } } },
              tooltip:{ formatter:p => '<b>'+esc(p.data.s)+'</b><br>'+p.data.n+' caravanas · '+miles(p.data.p)+' personas estimadas' } },
            { type:'scatter', coordinateSystem:'geo', zlevel:2, symbolSize:u*0.45, itemStyle:{ color:'#fff', borderColor:'#7E302B', borderWidth:1.2 }, data:rut.map(c => ({ value:c.dx, n:c.n, d:c.d })),
              tooltip:{ formatter:p => '«'+esc(p.data.n)+'» se disolvió en '+esc(p.data.d) } }] }; } } ] };
}
function laminaNarrativa(L, X){ const g = L.filter(l => l.hz && l.hz.length);
  return { tit:'Narrativa de la semana', cls:'inf-sl-nar', fte:'Cifras calculadas con las bases del tablero; cada frase solo aparece si hay datos.', html:enc('Narrativa', X.sem ? 'de la semana · '+X.fch : X.fch, 'Informe migratorio · cierre')+
    '<div class="inf-hzt">'+g.map(l => '<div class="inf-c"><span class="inf-ey">'+esc(l.tit)+'</span><ul>'+l.hz.map(h => '<li>'+h+'</li>').join('')+'</ul></div>').join('')+'</div>' }; }
function informe(a, b, ref){
  const X = datosInforme(a, b, ref || 'trump');
  const L = [laminaCBP(X), laminaSectores(X), laminaRecibidos(X), laminaRetorno(X), laminaRescates(X), laminaCaravanas(X)].filter(Boolean);
  const todo = [laminaPortada(X)].concat(L, [laminaNarrativa(L, X)]);
  const u = new URL(location.href); u.search = '?informe='+a+'_'+b+'&ref='+X.ref; u.hash = '';
  const quita = h => h.replace(/<\/?b>/g, '*').replace(/<[^>]+>/g, ''), resumen = L.map(l => '• '+quita(l.hz[0])).join('\n');
  abrirVisor({ titulo:'Informe migratorio', sub:(X.sem ? 'Semana del ' : 'Periodo personalizado ')+X.fch+' · contra el '+enPer(X), pie:'IA-NAMI · Informe migratorio · '+X.fch, laminas:todo, liga:/^https?:/.test(u.protocol) ? u.toString() : '', resumen, archivo:'Informe migratorio '+a+' a '+b });
}

/* ==== [6] ANÁLISIS ================================================ */
// Un análisis: hasta 3 conceptos (indicador o una de sus partes) × hasta 4 valores (nacionalidades o estados) × 1 o 2 periodos.
// Se presenta en láminas: resumen con su evolución, desglose y narrativa.
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
  SS.forEach(s => { const a = s.per.a, b = s.per.b; s.col = SERIES[claves.indexOf(s.clave) % SERIES.length]; s.t = V(s.c.k, s.c.p, a, b, s.f); s.dias = difDias(a, b)+1; s.fin = fin(s.c.k); s.ini = ini(s.c.k);
    s.dReal = difDias(maxS([a, s.ini]), minS([b, s.fin]))+1; s.prom = s.t/Math.max(1, s.dReal); });
  SS.forEach(s => { const par = dos ? SS.find(o => o.clave===s.clave && o.j!==s.j) : null; if (par && s.j===1) s.vs = { txt:'contra '+par.per.nom+', por día', a:par.prom, b:s.prom };
    if (!dos){ const n = s.dias, a0 = sumaDias(s.per.a, -n), a1 = sumaDias(s.per.a, -1); if (a0>=s.ini){ const t0 = V(s.c.k, s.c.p, a0, a1, s.f); if (t0>=30) s.vs = { txt:'contra los '+n+' días anteriores', a:t0, b:s.t }; } } });
  const P0 = A.periodos[A.periodos.length-1], g = cubetas(P0.a, P0.b, 'auto').g;
  // fuera de lo que cubre la base no hay dato (no es cero): esos tramos quedan vacíos
  SS.forEach(s => { s.ser = S(s.c.k, s.c.p, s.per.a, s.per.b, g, s.f); s.ser.v = s.ser.v.map((v,i) => { const c = s.ser.C.l[i]; return c.b<s.ini || c.a>s.fin ? null : v; }); });
  const jB = Math.max(...SS.map(x => x.j)), base = SS.find(s => s.j===jB), act = SS.filter(s => s.j===jB), nX = Math.max(...SS.map(s => s.ser.v.length)), CL = base.ser.C.l, inc = CL.length && CL[CL.length-1].inc;
  const xs = (dos ? [...Array(nX).keys()].map(i => g==='m' ? cap(MESC[f0(CL[Math.min(i, CL.length-1)].a).getMonth()]) : (g==='s' ? 'Sem ' : 'Día ')+(i+1)) : etiq(base.ser.C)).map((x,i) => inc && i===CL.length-1 ? x+' *' : x);
  // desglose: la dimensión que más explica y que no se está comparando
  const dims = BASES[INDK[base.c.k].b].dims, dimD = ['n','e','p','sec','pa','doc','mot'].find(d => dims[d] && d!==A.dim) || null;
  const SD = dimD ? SS.filter(s => BASES[INDK[s.c.k].b].dims[dimD]) : [], des = SD.map(s => new Map(D(s.c.k, s.c.p, s.per.a, s.per.b, dimD, s.f))), iB = Math.max(0, SD.indexOf(base));
  const top = des.length ? [...des[iB].entries()].sort((a,b) => b[1]-a[1]).slice(0, 12).map(x => x[0]) : [], nomD = d => dims[d].nom.toLowerCase();
  // narrativa: cuánto fue, cómo cambió, quién pesa más, cuándo fue el máximo y quién encabeza
  const hz = [];
  act.forEach(s => hz.push('<b>'+esc(s.corto)+'</b>: <b>'+miles(s.t)+'</b>, '+miles(s.prom)+' por día'+(s.vs ? '; '+cuanto(pct(s.vs.b, s.vs.a)-100).replace(' contra', '')+' '+esc(s.vs.txt) : '')+'.'));
  if (claves.length>1){ const o = act.slice().sort((a,b) => b.t-a.t); if (o.length>1 && o[1].t){ const r = o[0].t/o[1].t; hz.push('<b>'+esc(o[0].corto)+'</b> '+(r>=2 ? 'es <b>'+r.toFixed(1)+' veces</b>' : 'supera en <b>'+pc(o[0].t-o[1].t, o[1].t)+'</b> a')+(r>=2 ? ' ' : ' ')+esc(o[1].corto)+'.'); } }
  act.forEach(s => { const v = s.ser.v.map(x => x || 0), i = v.indexOf(Math.max(...v)); if (v.length>2 && v[i]) hz.push('El punto más alto de '+esc(s.corto)+' fue '+(g==='m' ? MESL[f0(s.ser.C.l[i].a).getMonth()]+' de '+f0(s.ser.C.l[i].a).getFullYear() : (g==='s' ? 'la semana del ' : 'el ')+fxa(s.ser.C.l[i].a))+', con <b>'+miles(v[i])+'</b>.'); });
  if (dimD && top.length) hz.push('Por '+nomD(dimD)+', <b>'+esc(top[0])+'</b> concentra '+pc(des[iB].get(top[0]), SD[iB].t)+' de '+esc(SD[iB].corto)+(top[1] ? ', seguido de '+esc(top[1])+' ('+pc(des[iB].get(top[1]), SD[iB].t)+')' : '')+'.');
  const fte = 'Fuente: '+[...new Set(SS.map(s => BASES[INDK[s.c.k].b].fuente))].join(', ')+(av.length ? ' · '+av.join(' ') : '')+(inc ? ' · * periodo incompleto' : '');
  const tit = A.titulo || [...new Set(SS.map(s => cDe(idC(s.c)).nom))].join(' y '), perTxt = dos ? A.periodos.map(p => p.nom).join(' contra ') : rango(P0.a, P0.b);
  const tarj = SS.map(s => '<div class="inf-an-k'+(s.j!==jB ? ' prev' : '')+'" style="--c:'+s.col+'"><span>'+esc(s.corto)+'</span><b class="num">'+miles(s.t)+'</b><small>'+rango(s.per.a, s.per.b)+' · '+miles(s.prom)+' por día</small>'+
    (s.vs ? '<em class="'+(Math.abs(pct(s.vs.b, s.vs.a)-100)<1 ? 'n' : s.vs.b>=s.vs.a ? 'u' : 'd')+'">'+flecha(pct(s.vs.b, s.vs.a)-100)+' <small>'+esc(s.vs.txt)+'</small></em>' : '')+
    (s.fin<s.per.b ? '<em class="n">datos al '+fxa(s.fin)+'</em>' : s.ini>s.per.a ? '<em class="n">datos desde el '+fxa(s.ini)+'</em>' : '')+'</div>').join('');
  const L = [
    { tit:'Resumen', fte:fte, hz:hz, html:enc(esc(tit), esc(perTxt), 'Análisis')+'<div class="inf-an-r n'+Math.min(SS.length, 4)+'">'+tarj+'</div>'+
      caja('Cómo se movió', { d:'por día', s:'por semana', m:'por mes' }[g]+(dos ? ' · periodos alineados; punteado: '+esc(A.periodos[0].nom) : '')+(inc ? ' · * incompleto' : ''), '<div id="g-an-t" class="inf-gr"></div>', 'inf-c-total') } ];
  if (dimD && top.length) L.push({ tit:'Desglose', fte:fte, hz:hz.slice(-2), html:enc('Por '+esc(nomD(dimD)), esc(tit)+' · '+esc(perTxt), 'Análisis')+caja(top.length>=12 ? 'Las 12 con más registros' : 'De mayor a menor', '', '<div id="g-an-d" class="inf-gr"></div>', 'inf-c-total') });
  L.push({ tit:'Narrativa', cls:'inf-sl-nar', fte:fte, html:enc('Narrativa', esc(tit), 'Análisis')+'<div class="inf-hzt uno'+(hz.length<=4 ? ' una' : '')+'"><div class="inf-c"><ul>'+hz.map(h => '<li>'+h+'</li>').join('')+'</ul></div></div>' });
  L[0].graf = [{ id:'g-an-t', op:u => ({ grid:{ left:u*3.2, right:u*2, top:u*2.8, bottom:u*2 }, legend:ley(u, SS.map(s => s.corto)), tooltip:Object.assign(tip(u), dos ? { formatter:ps => ps.map(p => { const s = SS[p.seriesIndex], c = s.ser.C.l[p.dataIndex]; return p.marker+esc(s.corto)+(c ? ' <small>('+rango(c.a, c.b)+')</small>' : '')+': <b>'+(p.value==null ? '—' : miles(p.value))+'</b>'; }).join('<br>') } : {}),
    xAxis:ejeX(u, xs), yAxis:ejeY(u), series:SS.map(s => linea(u, s.corto, s.j===jB ? marcas(s.ser.v, u, s.col) : s.ser.v, s.col, Object.assign({ connectNulls:false }, s.j!==jB ? punteada(u, s.col) : {}, s.j!==jB ? { itemStyle:{ color:'#fff', borderColor:s.col, borderWidth:Math.max(1, u*0.09) } } : {}))) }) }];
  if (dimD && top.length) L[1].graf = [{ id:'g-an-d', op:u => ({ grid:{ left:u*11, right:u*4, top:SD.length>1 ? u*2.4 : u*0.4, bottom:u*0.4 }, legend:SD.length>1 ? ley(u, SD.map(s => s.corto)) : { show:false }, tooltip:Object.assign(tip(u), { axisPointer:{ type:'shadow', shadowStyle:{ color:'rgba(0,0,0,.03)' } } }),
    xAxis:{ type:'value', show:false }, yAxis:{ type:'category', inverse:true, data:top, axisTick:{ show:false }, axisLine:{ show:false }, axisLabel:{ fontSize:u*0.78, color:C.ink, width:u*10, overflow:'truncate' } },
    series:SD.map((s,k) => ({ name:s.corto, type:'bar', data:top.map(n => des[k].get(n) || 0), itemStyle:{ color:s.j!==jB ? 'rgba(0,0,0,0)' : s.col, borderColor:s.col, borderWidth:s.j!==jB ? 1.2 : 0, borderRadius:[0,u*0.2,u*0.2,0] }, barMaxWidth:u*1.3, barGap:'20%',
      label:{ show:SD.length<=3, position:'right', fontSize:u*0.64, color:C.ink2, formatter:p => p.value ? miles(p.value) : '' } })) }) }];
  abrirVisor({ titulo:'Análisis · '+tit, sub:perTxt, pie:'IA-NAMI · Análisis', laminas:L, archivo:'Analisis '+tit, resumen:hz.slice(0, 3).map(h => '• '+h.replace(/<\/?b>/g, '*').replace(/<[^>]+>/g, '')).join('\n') });
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
  return '<div class="an"><div class="an-h"><div><h1>Informe migratorio</h1><p>El informe de la semana, en láminas de pantalla completa que puedes presentar, descargar o compartir.</p></div></div>'+
    '<div class="an-g">'+
    '<section class="an-c an-inf"><div class="an-c-h"><span class="an-ic"><svg viewBox="0 0 24 24"><path d="M4 5h16v11H4zM8 20h8M12 16v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><h2>Informe migratorio</h2><p>Ocho láminas listas para presentar: encuentros CBP, sectores, recibidos de EE. UU., repatriados, rescates y caravanas, cada una con su narrativa.</p></div></div>'+
      '<label class="an-l">Semana<select id="an-sem">'+opW+'<option value="pers">Personalizado…</option></select></label>'+
      '<div class="an-pers" id="an-ip" hidden><label class="an-l">Del<input type="date" id="an-ia"></label><label class="an-l">al<input type="date" id="an-ib"></label></div>'+
      '<label class="an-l">Comparar con<select id="an-ref"><option value="trump">Periodo Trump (desde 20 ene 2025)</option><option value="sheinbaum">Periodo Sheinbaum (desde 1 oct 2024)</option><option value="anio">El año en curso</option></select></label>'+
      '<button class="an-go" data-angen>Generar informe <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'+
      '<p class="an-nt">Datos al <b>'+fxa(CORTE)+'</b> (último día común de CBP, rescates, repatriados y recibidos).</p></section>'+
    '<section class="an-c an-an" hidden><div class="an-c-h"><span class="an-ic"><svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><h2>Análisis y comparaciones</h2><p>Escribe lo que quieres ver o arma la comparación: conceptos, nacionalidades o estados, y periodos.</p></div></div>'+
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
