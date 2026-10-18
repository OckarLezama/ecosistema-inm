// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node glosario_punto.js
// 1) Glosario: el mismo nombre para la misma cifra en todas las secciones.
// 2) En el Pulso un punto no se elige: buscarlo (o hacer clic en él en el mapa) lleva a su proceso con ese punto filtrado —
//    punto de internación → Control › Ingresos; punto de repatriación → Protección al migrante — y el análisis del punto funciona ahí.
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs'); const dir = path.resolve(__dirname, '..');
(async () => { const b = await chromium.launch({ executablePath:process.env.CHROMIUM || undefined }); const errs = []; let mal = 0; const ok = (c, t) => { if (!c){ mal++; console.log('  MAL: '+t); } };
  const txt = f => fs.readFileSync(dir+'/js/'+f, 'utf8');
  ok(!/\['int','Internaciones'\]/.test(txt('control.js')) && !/'Internaciones'/.test(txt('informes.js')), 'el indicador se llama Ingresos en Control e Informes');
  ok(/\['nna','NNA canalizados'/.test(txt('vistazo.js')), 'Resumen: «NNA canalizados» (Canalizados del Pulso suma acompañantes)');
  ok(!/toFixed\(1\)\+' k'/.test(['app.js','control.js','proteccion.js','regulacion.js','analizar.js','consulta.js'].map(txt).join('')), 'miles abreviados como «mil», no «k»');
  for (const [w, h] of [[1600, 900], [390, 844]]){
    const ctx = await b.newContext({ viewport:{ width:w, height:h } }), p = await ctx.newPage(); p.on('pageerror', e => errs.push(w+': '+e.message)); p.on('console', m => { if (m.type()==='error') errs.push(w+' consola: '+m.text()); });
    await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
    const busca = async q => { await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500); await p.fill('#buscar', q); await p.waitForTimeout(500);
      const r = await p.evaluate(() => [...document.querySelectorAll('#res [data-r]')].map(e => e.textContent)); await p.click('#res [data-r]'); await p.waitForTimeout(4000); return r[0] || ''; };
    const en = await busca('cozumel (puerto)');
    const c = await p.evaluate(() => ({ pulso:!document.getElementById('vista-pulso').hidden, chips:[...document.querySelectorAll('#vista-otra .tag-f')].map(e => e.textContent), tab:(document.querySelector('[data-cvista].on') || {}).textContent, punto:!!document.querySelector('#bajo .caja[data-propia]') }));
    ok(!c.pulso && c.chips.some(x => /Cozumel \(puerto\)/.test(x)) && c.tab==='Ingresos', w+' Cozumel abre Control › Ingresos con el punto ('+JSON.stringify(c)+')');
    const rp = await busca('el chaparral, tijuana');
    const d = await p.evaluate(() => ({ pulso:!document.getElementById('vista-pulso').hidden, chips:[...document.querySelectorAll('#vista-otra .tag-f')].map(e => e.textContent) }));
    ok(/Repatriaci/.test(rp) && !d.pulso && d.chips.some(x => /Chaparral/.test(x)), w+' punto de repatriación abre Protección con el punto ('+rp+' '+JSON.stringify(d)+')');
    // el Pulso nunca muestra una tarjeta de punto junto a las del país
    await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500); await p.click('.kc[data-k="ing"]'); await p.waitForTimeout(900);
    ok(!(await p.evaluate(() => [...document.querySelectorAll('#bajo h2 span')].some(e => /Puntos de ingreso|Cozumel/.test(e.textContent)))), w+' el Pulso no tiene tarjetas de puntos');
    await ctx.close(); }
  console.log('glosario y punto: '+(mal ? mal+' MAL' : 'bien')); console.log('errores', JSON.stringify(errs)); await b.close(); if (mal) console.log('MAL '+mal); })();
