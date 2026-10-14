// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node play_sala_desglose.js
// En pantalla completa, con el play, todo lo que se ve (cifra, desglose y repartos del panorama) debe seguir al día del cursor.
const { chromium } = require('playwright'); const path=require('path'); const dir=process.argv[2] || path.resolve(__dirname,'..');
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); const errs=[]; const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage(); p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/*', r=>{ const u=r.request().url(); if(u.startsWith('file://')) return r.continue(); return r.abort(); });
  await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500); await p.evaluate(() => IANAMI_PULSO.sala('pulso')); await p.waitForTimeout(2500);
  const foto = () => p.evaluate(() => ({ big:document.getElementById('sl-big').textContent, g:[...document.querySelectorAll('#sl-g .v')].map(x => x.textContent).join(' | '), tri:[...document.querySelectorAll('#sl-tri .sl-b100, #sl-tri .sl-bp, #sl-tri b')].map(x=>x.textContent).join('|').slice(0,160) }));
  let mal = 0;
  for (const k of ['', 'ing', 'resc']){
    if (k){ await p.click('#sl-indb'); await p.waitForTimeout(150); await p.click('#sl-im [data-ind="'+k+'"]'); await p.waitForTimeout(1500); }
    const fin = await foto(); await p.click('#sl-pl'); await p.waitForTimeout(2500); const a = await foto(); await p.waitForTimeout(2000); const b2 = await foto(); await p.click('#sl-pl'); await p.waitForTimeout(400);
    const cambiaG = a.g !== b2.g || (k==='' && a.tri !== b2.tri), cambiaBig = a.big !== b2.big;
    console.log((k || 'panorama').padEnd(9), 'cifra se mueve:', cambiaBig, '· complementos se mueven:', cambiaG, '·', (k ? a.g : a.tri).slice(0,90));
    if ((k && !cambiaBig) || !cambiaG) mal++;            // en el panorama no hay cifra grande: cuentan los repartos
    await p.click('#sl-todo').catch(()=>{}); await p.waitForTimeout(800); }
  console.log('con problemas', mal, 'errores', JSON.stringify(errs)); await b.close(); })();
