// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node pregunta_caravanas.js
// Ficha de caravanas en Pregunta a INAMI: horizontal, vertical y bullets en varios periodos (un año, todo desde oct 2024, un mes, un mes sin caravanas).
// Revisa que las cifras cuadren con el registro, que nada se salga de la hoja, que el mapa se dibuje y que la lista no pase de 6 renglones.
const { chromium } = require('playwright'); const path=require('path'); const dir=path.resolve(__dirname,'..');
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); const errs=[]; let mal=0;
  for (const [vw,vh] of [[1366,900],[400,860]]){
  const p=await (await b.newContext({viewport:{width:vw,height:vh}})).newPage(); p.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
  await p.route('**/*', r=>{ const u=r.request().url(); if(u.startsWith('file://')) return r.continue(); return r.abort(); });
  await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500); await p.click('#b-consulta'); await p.waitForSelector('#cq-q', {timeout:120000}); await p.waitForTimeout(300);
  for (const q of ['caravanas 2026','caravanas 2025','caravanas','caravanas en octubre 2024','caravanas en julio 2026']){
    await p.evaluate(t => { document.getElementById('cq-q').value = t; document.getElementById('cq-f').requestSubmit(); }, q); await p.waitForTimeout(250);
    const modo = await p.$('[data-cqmodo="f"]'); if (modo) { await modo.click(); await p.waitForTimeout(150); }
    for (const f of ['h','v']){
      await p.evaluate(f => document.querySelector('[data-cqfmt="'+f+'"]').click(), f); await p.waitForTimeout(500);
      const o = await p.evaluate(() => { const h = document.querySelector('.cq-hoja'), H = h.getBoundingClientRect();
        const fuera = [...h.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width && !e.closest('.cqc-r .t') && (r.right>H.right+1 || r.bottom>H.bottom+1); }).map(e => e.className || e.tagName).join(',');
        const D = window.IANAMI_DATOS, t = (h.querySelector('.cq-meta b')||{}).textContent;
        const mapa = h.querySelector('.cqc-map'), inst = mapa && window.echarts && echarts.getInstanceByDom(mapa);
        return { car:h.classList.contains('t-car'), fuera, kpis:h.querySelectorAll('.cq-kc').length, n:(h.querySelector('.cq-kc.on .v')||{}).textContent, per:(h.querySelector('.cq-kc:nth-child(2) .v')||{}).textContent,
          filas:h.querySelectorAll('.cqc-r').length, mas:(h.querySelector('.cqc-mas')||{}).textContent||'', hall:(h.querySelector('.cq-hall')||{}).textContent, mapa:!!inst, tl:!!h.querySelector('.cqc-tl canvas, .cqc-tl svg') }; });
      // Cifras esperadas a partir del registro, con el mismo periodo que muestra la hoja
      const esp = await p.evaluate(q => { const D = window.IANAMI_DATOS, x = { 'caravanas 2026':['2026-01-01','2026-12-31'], 'caravanas 2025':['2025-01-01','2025-12-31'], 'caravanas':['2024-10-01','2099-12-31'], 'caravanas en octubre 2024':['2024-10-01','2024-10-31'], 'caravanas en julio 2026':['2026-07-01','2026-07-31'] }[q];
        const L = D.caravanas.filter(c => c.f>=x[0] && c.f<=x[1] && c.f>='2024-10-01'); return { n:L.length, p:L.reduce((t,c)=>t+(c.p||0),0) }; }, q);
      const ok = o.car && !o.fuera && o.mapa && o.tl && o.filas<=6 && o.filas>0 && Number(o.n)===esp.n && (esp.n===0 || o.per==='≈'+esp.p.toLocaleString('en-US')) && (esp.n<=6 || /y \d+ caravanas? más/.test(o.mas));
      if (!ok) mal++; console.log(vw, q.padEnd(26), f, ok ? 'bien' : 'MAL '+JSON.stringify(o)+' esperado '+JSON.stringify(esp), '·', o.hall.slice(0,70));
      await p.screenshot({path:__dirname+'/capturas/caravanas-'+vw+'-'+q.replace(/\W+/g,'_')+'-'+f+'.png', fullPage:false}); }
    // Bullets: el primer renglón dice cuántas y cuántas personas; nunca compara con otros años
    await p.evaluate(() => document.querySelector('[data-cqmodo="b"]').click()); await p.waitForTimeout(300);
    const bt = await p.evaluate(() => (document.querySelector('.cq-bul')||{}).innerText || '');
    const okb = /\d+ caravanas? del .*personas\.|Sin caravanas del/.test(bt) && !/Sin Nombre/.test(bt) && !/Todas, de la más reciente/.test(bt) && !/vs\.|respecto|frente a|que en 20\d\d|más que|menos que/.test(bt);
    if (!okb) mal++; console.log(vw, q.padEnd(26), 'b', okb ? 'bien' : 'MAL '+bt.slice(0,200));
    await p.evaluate(() => document.querySelector('[data-cqmodo="f"]').click()); await p.waitForTimeout(150); }
  await p.close(); }
  console.log('con problemas', mal); console.log('errores', JSON.stringify(errs)); await b.close(); })();
