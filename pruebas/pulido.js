// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node pulido.js
// 1) El menú no muestra secciones que aún no existen (Prospectiva, Contexto). 2) «Atrás» del navegador regresa a la sección anterior
// sin salir de la plataforma. 3) En las gráficas por mes, el mes incompleto va punteado y con sus días. 4) Celular: nada ensancha
// la página (Pulso, Arma tu informe, procesos), el menú cabe y el combo «Comparar con» se ve.
const { chromium } = require('playwright'); const path = require('path'); const dir = path.resolve(__dirname, '..');
(async () => { const b = await chromium.launch({ executablePath:process.env.CHROMIUM || undefined }); const errs = []; let mal = 0; const ok = (c, t) => { if (!c){ mal++; console.log('  MAL: '+t); } };
  const abre = async (w, h, movil) => { const p = await (await b.newContext({ viewport:{ width:w, height:h }, hasTouch:!!movil, isMobile:!!movil })).newPage(); p.on('pageerror', e => errs.push(w+': '+e.message));
    await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort()); await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(2000); return p; };
  const proceso = (p, i) => p.evaluate(i => { document.querySelector('[data-menu-dir]').click(); document.querySelector('[data-dir="'+i+'"]').click(); }, i);
  const p = await abre(1600, 900);
  const nav = await p.evaluate(() => document.getElementById('nav').textContent);
  ok(!/Prospectiva|Contexto/.test(nav) && /Pulso/.test(nav) && /Bases/.test(nav), 'menú sin secciones vacías ('+nav+')');
  await proceso(p, 0); await p.waitForTimeout(4500);
  // mes incompleto punteado en la gráfica de Control › Ingresos
  const inc = await p.evaluate(() => { const el = document.querySelector('#cv-tr'); const c = el && echarts.getInstanceByDom(el); if (!c) return null; const s = c.getOption().series.filter(x => x.type==='line' && x.lineStyle && Array.isArray(x.lineStyle.type));
    return s.length ? s[0].data.filter(d => d && d.label && d.label.show).map(d => d.label.formatter) : []; });
  ok(inc && inc.length && /días?$/.test(inc[inc.length-1]), 'Control: el mes incompleto va punteado con sus días ('+JSON.stringify(inc)+')');
  await proceso(p, 1); await p.waitForTimeout(4500);
  await p.goBack(); await p.waitForTimeout(2500); ok(/Control migratorio/.test(await p.evaluate(() => document.querySelector('#vista-otra h1').textContent)), 'atrás: de Regulación a Control');
  await p.goBack(); await p.waitForTimeout(2000); ok(await p.evaluate(() => !document.getElementById('vista-pulso').hidden), 'atrás: de Control al Pulso, sin salir de la plataforma');
  await p.goForward(); await p.waitForTimeout(2500); ok(/Control migratorio/.test(await p.evaluate(() => document.querySelector('#vista-otra h1').textContent)), 'adelante: vuelve a Control');
  // Lo que cambió: sin «concentración» (no es un cambio) y nada de temporada (hace un año, mismo sentido y al menos la mitad)
  await p.goBack(); await p.waitForTimeout(2000);
  for (const v of ['30','sem','90']){
    await p.evaluate(v => { const s = document.getElementById('cmp-sel'); if (s){ s.value = v; s.dispatchEvent(new Event('change', { bubbles:true })); } }, v); await p.waitForTimeout(1500);
    const avs = await p.evaluate(() => [...document.querySelectorAll('#analisis .av')].map(e => ({ k:e.querySelector('.av-k').textContent, v:e.querySelector('.av-v').textContent, tx:e.querySelector('.tx').textContent, ya:(e.querySelector('.av-ya')||{}).textContent || '' })));
    ok(avs.every(a => !/concentración/.test(a.k)), 'Lo que cambió ('+v+'): sin concentración');
    avs.filter(a => a.ya).forEach(a => { const dl = +a.v.replace(/[^\d]/g,'') * (/bajaron/.test(a.tx) ? -1 : 1), m = a.ya.match(/([+−])(\d+)%/), ya = m ? +m[2]*(m[1]==='−'?-1:1) : null;
      ok(ya!=null && !(Math.sign(dl)===Math.sign(ya) && Math.abs(ya) >= Math.abs(dl)/2 + 1), 'Lo que cambió ('+v+'): «'+a.tx+'» es de temporada ('+a.ya+')'); }); }
  await p.close();
  // Resumen: si se sale con una hoja abierta, al volver a entrar abre limpio
  { const q = await abre(1600, 900); const vz = s => q.locator('#vistazo').locator(s);
    await q.dblclick('#b-vz'); await vz('.ch').first().waitFor({ timeout:60000 }); await q.waitForTimeout(2200);
    await vz('.ch[data-i="3"]').click(); await q.waitForTimeout(1200);
    const abierta = await q.evaluate(() => document.getElementById('vistazo').shadowRoot.getElementById('app').classList.contains('sel'));
    await q.evaluate(() => window.IANAMI_VISTAZO.cerrar()); await q.waitForTimeout(600);
    await q.evaluate(() => window.IANAMI_VISTAZO.abrir()); await q.waitForTimeout(1500);
    const sigue = await q.evaluate(() => document.getElementById('vistazo').shadowRoot.getElementById('app').classList.contains('sel'));
    ok(abierta && !sigue, 'Resumen: al volver a entrar abre sin la hoja que quedó abierta ('+abierta+' → '+sigue+')'); await q.close(); }
  for (const w of [360, 390, 430]){ const m = await abre(w, 844, true);
    const ancho = () => m.evaluate(() => document.documentElement.scrollWidth);
    ok(await ancho()<=w+1, w+' Pulso no ensancha la página');
    ok(await m.evaluate(() => { const n = document.getElementById('nav'); return [...n.querySelectorAll('button')].every(x => x.getBoundingClientRect().right<=innerWidth+1); }), w+' el menú cabe completo');
    ok(await m.evaluate(() => { const c = document.querySelector('#cmp select'); return !!c && c.getBoundingClientRect().width>40; }), w+' se ve «Comparar con»');
    await m.evaluate(() => { document.querySelector('[data-menu-inf]').click(); document.querySelector('[data-inf="arma"]').click(); }); await m.waitForTimeout(4000);
    ok(await ancho()<=w+1, w+' Arma tu informe no ensancha la página ('+await ancho()+')');
    for (const i of [0,1,2]){ await proceso(m, i); await m.waitForTimeout(4500); ok(await ancho()<=w+1, w+' proceso '+i+' no ensancha la página'); }
    if (w===390){ await m.evaluate(() => { document.querySelector('[data-menu-inf]').click(); document.querySelector('[data-inf="arma"]').click(); }); await m.waitForTimeout(2500); await m.screenshot({ path:__dirname+'/capturas/pulido-arma-390.png' }); }
    await m.close(); }
  console.log('pulido: '+(mal ? mal+' MAL' : 'bien')); console.log('errores', JSON.stringify(errs)); await b.close(); if (mal) console.log('MAL '+mal); })();
