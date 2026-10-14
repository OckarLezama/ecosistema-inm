// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node pregunta_ayuda.js
// Abre la «i» de Pregunta a INAMI y toca cada ejemplo: todos deben responder sin «¿Quisiste decir?» ni avisos de no entendido.
const { chromium } = require('playwright'); const path=require('path'); const dir=path.resolve(__dirname,'..');
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); const errs=[];
  for (const [vw,vh] of [[1366,800],[400,800]]){
    const p=await (await b.newContext({viewport:{width:vw,height:vh}})).newPage(); p.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
    await p.route('**/*', r=>{ const u=r.request().url(); if(u.startsWith('file://')) return r.continue(); return r.abort(); });
    await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500); await p.click('#b-consulta'); await p.waitForSelector('#cq-q', {timeout:120000}); await p.waitForTimeout(300);
    await p.click('[data-cqi]'); await p.waitForTimeout(200); await p.screenshot({path:__dirname+'/capturas/ayuda-'+vw+'.png'});
    const fuera = await p.evaluate(() => { const a = document.getElementById('cq-ay').getBoundingClientRect(); return a.bottom > innerHeight || a.right > innerWidth || a.left < 0; });
    if (fuera) errs.push('la ayuda se sale de la pantalla en '+vw);
    const ejs = await p.evaluate(() => [...document.querySelectorAll('#cq-ay [data-cqej]')].map(x => x.dataset.cqej));
    for (const e of ejs){ await p.evaluate(() => { const a = document.getElementById('cq-ay'); if (a.hidden) document.querySelector('[data-cqi]').click(); });
      await p.evaluate(t => document.querySelector('#cq-ay [data-cqej="'+t+'"]').click(), e); await p.waitForTimeout(150);
      const r = await p.evaluate(() => ({ f:(document.getElementById('cq-frase')||{}).textContent||'', q:!!document.querySelector('.cq-quis'), av:(document.getElementById('cq-av')||{}).textContent||'' }));
      if (vw===1366) console.log(e.padEnd(48), '→', r.f.slice(0,110), r.av ? ' [aviso: '+r.av.slice(0,80)+']' : '');
      if (r.q || !r.f) errs.push('no responde: '+e); }
    await p.close(); }
  console.log('errores', JSON.stringify(errs)); await b.close(); })();
