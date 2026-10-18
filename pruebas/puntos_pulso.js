// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node puntos_pulso.js
// Tarjeta «Puntos de ingreso» y «Dónde se rechaza · por punto» del Pulso: datos/puntos.js se baja solo al pedirla;
// la suma de todos los puntos cuadra con la tarjeta del indicador; con un estado o una nacionalidad cuadra con las bases;
// clic en un punto que está en el mapa lo selecciona; los nombres de indicadores son los mismos en todas las secciones.
const { chromium } = require('playwright'); const path = require('path'); const dir = path.resolve(__dirname, '..');
global.window = {}; global.document = { getElementById(){ return null; } };
for (const f of ['datos.js','control.js','proteccion.js','regulacion.js','vocabulario.js','puntos.js']) require(dir+'/datos/'+f);
require(dir+'/js/consulta.js'); const M = window.IANAMI_MOTOR, P = window.IANAMI_PUNTOS, DD = window.IANAMI_DATOS;
const suma = (k, f) => { let t = 0; for (let i=0;i<P[k].c.length;i+=5) if (!f || f(P[k].c, i)) t += P[k].c[i+4]; return t; };
const base = (k, filtros) => M.total({ ind:M.INDK[k], d0:'2024-10-01', d1:M.finBase(M.BASES[M.INDK[k].b]), filtros:filtros || {} });
(async () => { const b = await chromium.launch({ executablePath:process.env.CHROMIUM || undefined }); const errs = []; let mal = 0; const ok = (c, t) => { if (!c){ mal++; console.log('  MAL: '+t); } };
  // 1) datos/puntos.js cuadra con las bases completas
  ok(suma('ing')===base('ing'), 'ingresos por punto = base ('+suma('ing')+' / '+base('ing')+')');
  ok(suma('rech')===base('rech'), 'rechazos por punto = base ('+suma('rech')+' / '+base('rech')+')');
  const ven = DD.nats.findIndex(x => x[0]==='Venezuela'), vm = M.BASES.ing.dims.n.vals.indexOf('Venezuela');
  ok(Math.abs(suma('ing', (c,i) => c[i+2]===ven) - base('ing', { n:[vm] }))<1, 'ingresos de Venezuela por punto = base');
  for (const [w, h, tac] of [[1600, 900, false], [3840, 2160, false], [1024, 768, true], [390, 844, true]]){
    const ctx = await b.newContext({ viewport:{ width:w, height:h }, hasTouch:tac, isMobile:tac && w<500 }), p = await ctx.newPage(); const pide = [];
    p.on('pageerror', e => errs.push(w+': '+e.message)); p.on('console', m => { if (m.type()==='error') errs.push(w+' consola: '+m.text()); });
    p.on('request', r => { if (/datos\/puntos\.js/.test(r.url())) pide.push(r.url()); });
    await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
    await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500);
    ok(pide.length===0, w+' puntos.js no se baja al abrir');
    for (const k of ['ing', 'rech']){
      await p.evaluate(k => window.IANAMI_PULSO.verInd(k), k); await p.waitForTimeout(1200);
      const r = await p.evaluate(k => { const c = document.querySelector('[data-ptos="'+k+'"]'), kpi = +document.querySelector('.kc[data-k="'+k+'"] .kc-v').dataset.v;
        const T = window.IANAMI_PUNTOS[k]; let t = 0; for (let i=4;i<T.c.length;i+=5) t += T.c[i];
        const filas = c ? c.querySelectorAll('.barra').length : 0, sale = c ? [...c.querySelectorAll('.barra span:first-child')].some(e => e.getBoundingClientRect().right > c.getBoundingClientRect().right+1) : true;
        return { hay:!!c, filas, kpi, t, sale }; }, k);
      ok(r.hay && r.filas===8, w+' '+k+': tarjeta con 8 puntos ('+r.filas+')'); ok(r.t===r.kpi, w+' '+k+': todos los puntos = tarjeta del indicador ('+r.t+' / '+r.kpi+')'); ok(!r.sale, w+' '+k+': nada se sale de la tarjeta');
    }
    ok(pide.length===1, w+' puntos.js se baja una sola vez ('+pide.length+')');
    // clic en un punto que está en el mapa
    await p.evaluate(() => window.IANAMI_PULSO.verInd('ing')); await p.waitForTimeout(600);
    const nom = await p.evaluate(() => { const x = document.querySelector('[data-ptos="ing"] [data-pto]'); return x ? x.querySelector('span').firstChild.textContent.trim() : null; });
    if (nom){ await p.click('[data-ptos="ing"] [data-pto]'); await p.waitForTimeout(1200);
      ok(await p.evaluate(nom => [...document.querySelectorAll('#bajo .caja[data-propia] h2 span')].some(e => e.textContent.trim()===nom), nom), w+' clic en '+nom+' abre el punto'); }
    if (w===1600) await p.screenshot({ path:__dirname+'/capturas/puntos-pulso-'+w+'.png', fullPage:true });
    // con un estado: solo sus puntos
    await p.evaluate(() => window.IANAMI_PULSO.verInd('rech')); await p.waitForTimeout(500); await p.evaluate(() => { const i = window.IANAMI_DATOS.ests.indexOf('Chiapas'); document.querySelector('#bajo [data-e="'+i+'"]').click(); }); await p.waitForTimeout(900);
    const ch = await p.evaluate(() => { const c = document.querySelector('[data-ptos="rech"]'); return c ? c.textContent : 'SIN TARJETA'; }); if (w===1600) console.log('Chiapas:', ch.slice(0,200));
    ok(ch!=='SIN TARJETA' && /Ciudad Hidalgo|Talism|Tapachula|Suchiate/.test(ch) && !/AICM|Cancún/.test(ch), w+' con Chiapas no aparecen puntos de otros estados');
    await ctx.close(); }
  // 2) nombres iguales en todas las secciones
  const fs = require('fs'), txt = f => fs.readFileSync(dir+'/js/'+f, 'utf8');
  ok(!/\['int','Internaciones'\]/.test(txt('control.js')) && !/'Internaciones'/.test(txt('informes.js')), 'el indicador se llama Ingresos en Control e Informes');
  ok(/\['nna','NNA canalizados'/.test(txt('vistazo.js')), 'Resumen: «NNA canalizados» (no se confunde con Canalizados del Pulso, que suma acompañantes)');
  ok(!/toFixed\(1\)\+' k'/.test(['app.js','control.js','proteccion.js','regulacion.js','analizar.js','consulta.js'].map(txt).join('')), 'miles abreviados como «mil», no «k»');
  console.log('puntos del Pulso: '+(mal ? mal+' MAL' : 'bien')); console.log('errores', JSON.stringify(errs)); await b.close(); if (mal) console.log('MAL '+mal); })();
