// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node pregunta_diseno.js
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path'); const dir=path.resolve(__dirname,'..'); const QS=JSON.parse(fs.readFileSync(path.join(__dirname,'qs.json')));
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); const errs=[]; let malos=0;
  for (const [vw, fmts, tag] of [[1366,['h','v'],'d'],[400,['h','v'],'m']]){
    const p=await (await b.newContext({viewport:{width:vw,height:900}})).newPage(); p.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
    await p.route('**/*', r=>{ const u=r.request().url(); if(u.startsWith('file://')) return r.continue(); return r.abort(); });
    await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500); await p.click('#b-consulta'); await p.waitForSelector('#cq-q', {timeout:120000}); await p.waitForTimeout(300);
    for (let i=0;i<QS.length;i++){ await p.evaluate(t => { document.getElementById('cq-q').value = t; document.getElementById('cq-f').requestSubmit(); }, QS[i]);
      for (const f of fmts){ await p.evaluate(f => document.querySelector('[data-cqfmt="'+f+'"]').click(), f); await p.waitForTimeout(120);
        const o = await p.evaluate(() => { const h = document.querySelector('.cq-hoja'), H = h.getBoundingClientRect();
          const bad = [...h.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width>0 && r.height>0 && (r.bottom > H.bottom+1 || r.right > H.right+1 || r.left < H.left-1); }).map(e => e.className || e.tagName).slice(0,3);
          const clip = [...h.querySelectorAll('.cq-tit,.cq-hall,.cq-kc .v,.cq-kc .n')].filter(e => e.scrollWidth > e.clientWidth+1).length;
          const cu = h.querySelector('.cq-cuerpo'), pie = h.querySelector('.cq-pie'); const last = [...cu.querySelectorAll('*')].reduce((m,e) => Math.max(m, e.getBoundingClientRect().bottom), 0); return { bad:bad, clip:clip, sw:document.documentElement.scrollWidth, choca: last > pie.getBoundingClientRect().top+1 }; });
        if (o.bad.length || o.clip || o.sw>vw || o.choca){ malos++; console.log('✗', tag, f, i, QS[i], JSON.stringify(o)); await p.locator('.cq-hoja').screenshot({path:__dirname+'/capturas/bad-'+tag+f+i+'.png'}); } } }
  }
  console.log('con problemas', malos, 'errores', JSON.stringify(errs)); await b.close(); })();
