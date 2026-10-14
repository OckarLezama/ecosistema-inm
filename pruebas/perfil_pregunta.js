// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node perfil_pregunta.js
// Perfil de un país o una O.R. en Pregunta a INAMI: que salga con solo el nombre, que nada se salga de la hoja y que al tocar una tarjeta abra ese indicador.
const { chromium } = require('playwright'); const path=require('path'); const dir=path.resolve(__dirname,'..');
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); const errs=[];
  for (const [vw,vh] of [[1366,900],[400,860]]){
  const p=await (await b.newContext({viewport:{width:vw,height:vh}})).newPage(); p.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
  await p.route('**/*', r=>{ const u=r.request().url(); if(u.startsWith('file://')) return r.continue(); return r.abort(); });
  await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500); await p.click('#b-consulta'); await p.waitForSelector('#cq-q', {timeout:120000}); await p.waitForTimeout(300);
  for (const [q,f] of [['Venezuela','h'],['Venezuela','v'],['O.R. Chiapas','h'],['hondureños noviembre','h']]){
    await p.evaluate(t => { document.getElementById('cq-q').value = t; document.getElementById('cq-f').requestSubmit(); }, q); await p.waitForTimeout(200);
    await p.evaluate(f => document.querySelector('[data-cqfmt="'+f+'"]').click(), f); await p.waitForTimeout(300);
    const o = await p.evaluate(() => { const h = document.querySelector('.cq-hoja'), H = h.getBoundingClientRect(); const fuera = [...h.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width>0 && (r.bottom>H.bottom+1 || r.right>H.right+1); }).length;
      return { perfil:h.classList.contains('t-perfil'), cartas:h.querySelectorAll('.pc').length, fuera, fr:(h.querySelector('.pf-fr')||{}).textContent, av:document.getElementById('cq-av').textContent.slice(0,120) }; });
    console.log(vw, q, f, JSON.stringify(o).slice(0,90));
    await p.screenshot({path:__dirname+'/capturas/perfil-'+vw+'-'+q.replace(/\W+/g,'_')+'-'+f+'.png', fullPage:false});
    if (!o.perfil || o.fuera) errs.push('perfil '+q+' '+f+' '+vw); }
  await p.evaluate(() => document.querySelector('.pc[data-cqind="resc"]').click()); await p.waitForTimeout(300);
  console.log('al tocar rescatados:', await p.evaluate(() => document.getElementById('cq-av').textContent.slice(0,100)));
  await p.close(); }
  console.log('errores', JSON.stringify(errs)); await b.close(); })();
