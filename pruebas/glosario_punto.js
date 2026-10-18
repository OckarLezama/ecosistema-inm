// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node glosario_punto.js
// 1) Glosario: el mismo nombre para la misma cifra en todas las secciones. 2) Un punto elegido en el Pulso solo vale con su indicador:
// Cozumel con Ingresos y Rechazos; al pasar a Rescatados se quita (no queda su tarjeta con cifras de otro indicador), y la ayuda
// de la tarjeta de arriba no nombra al punto (sus cifras son del país).
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs'); const dir = path.resolve(__dirname, '..');
(async () => { const b = await chromium.launch({ executablePath:process.env.CHROMIUM || undefined }); const errs = []; let mal = 0; const ok = (c, t) => { if (!c){ mal++; console.log('  MAL: '+t); } };
  const txt = f => fs.readFileSync(dir+'/js/'+f, 'utf8');
  ok(!/\['int','Internaciones'\]/.test(txt('control.js')) && !/'Internaciones'/.test(txt('informes.js')), 'el indicador se llama Ingresos en Control e Informes');
  ok(/\['nna','NNA canalizados'/.test(txt('vistazo.js')), 'Resumen: «NNA canalizados» (Canalizados del Pulso suma acompañantes)');
  ok(!/toFixed\(1\)\+' k'/.test(['app.js','control.js','proteccion.js','regulacion.js','analizar.js','consulta.js'].map(txt).join('')), 'miles abreviados como «mil», no «k»');
  for (const [w, h] of [[1600, 900], [390, 844]]){
    const p = await (await b.newContext({ viewport:{ width:w, height:h } })).newPage(); p.on('pageerror', e => errs.push(w+': '+e.message));
    await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
    await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500);
    await p.fill('#buscar', 'cozumel (puerto)'); await p.waitForTimeout(500); await p.click('#res [data-r]'); await p.waitForTimeout(1500);
    const tarjeta = () => p.evaluate(() => [...document.querySelectorAll('#bajo .caja[data-propia] h2 span')].some(e => /Cozumel/.test(e.textContent)));
    ok(await tarjeta(), w+' Cozumel: aparece su tarjeta');
    ok(await p.evaluate(() => document.querySelector('.kc[data-k="ing"]').classList.contains('on')), w+' Cozumel lleva a Ingresos');
    if (w>500){ await p.hover('.kc[data-k="ing"]'); await p.waitForTimeout(900); ok(!/Cozumel/.test(await p.evaluate(() => document.getElementById('kpi-tip').textContent)), w+' la ayuda de arriba no nombra al punto'); }
    await p.click('.kc[data-k="rech"]'); await p.waitForTimeout(900); ok(await tarjeta(), w+' con Rechazos el punto se queda');
    await p.click('.kc[data-k="resc"]'); await p.waitForTimeout(900); ok(!(await tarjeta()), w+' con Rescatados el punto se quita');
    ok(!(await p.evaluate(() => [...document.querySelectorAll('#bajo .tag')].some(e => /Cozumel/.test(e.textContent)))), w+' ninguna tarjeta queda marcada con Cozumel');
    await p.close(); }
  console.log('glosario y punto: '+(mal ? mal+' MAL' : 'bien')); console.log('errores', JSON.stringify(errs)); await b.close(); if (mal) console.log('MAL '+mal); })();
