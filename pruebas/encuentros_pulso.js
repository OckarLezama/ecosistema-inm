// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node encuentros_pulso.js
// Encuentros CBP en el Pulso: tarjeta en «Desde EE. UU.» (recibidos → repatriados → encuentros), capa de sectores al elegirla,
// sin O.R. (se desactiva con un estado), con nacionalidad, y que las 10 tarjetas quepan en cada pantalla.
const { chromium } = require('playwright'); const path=require('path'); const dir=path.resolve(__dirname,'..');
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); const errs=[];
  for (const [vw,vh] of [[1440,900],[1920,1080],[3840,2160],[1366,768],[1024,768],[400,860]]){
    const p=await (await b.newContext({viewport:{width:vw,height:vh}})).newPage(); p.on('pageerror',e=>errs.push(vw+' '+e.message+' '+(e.stack||'').split('\n')[1]));
    await p.route('**/*', r=>{ const u=r.request().url(); if(u.startsWith('file://')) return r.continue(); return r.abort(); });
    await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1800);
    const orden = await p.evaluate(() => [...document.querySelectorAll('.kg.g-usa .kc')].map(e => e.querySelector('.kc-n').textContent));
    const cabe = await p.evaluate(() => { const l = [...document.querySelectorAll('#kpis .kc')]; return l.filter(e => { const v = e.querySelector('.kc-v'), n = e.querySelector('.kc-n'); return v.scrollWidth>v.clientWidth+1 || n.scrollWidth>n.clientWidth+1 || (innerWidth>=1280 && e.getBoundingClientRect().right>innerWidth+1); }).map(e => e.querySelector('.kc-n').textContent); });
    await p.screenshot({path:__dirname+'/capturas/encuentros-kpis-'+vw+'.png', clip:{x:0,y:0,width:vw,height:Math.min(vh,520)}});
    await p.click('.kc[data-k="cbp"]'); await p.waitForTimeout(900);
    const capa = await p.evaluate(() => { const c = echarts.getInstanceByDom(document.querySelector("#mapa [_echarts_instance_]")); const s = c.getOption().series.find(x => x.id==='cbp'); return { sectores:s.data.length, total:s.data.reduce((a,x)=>a+x.value[2],0), kpi:+document.querySelector('.kc[data-k="cbp"] .kc-v').dataset.v, boton:!!document.querySelector('[data-a="cbp"]') }; });
    await p.screenshot({path:__dirname+'/capturas/encuentros-capa-'+vw+'.png'});
    await p.evaluate(() => window.IANAMI_PULSO.verLugar('e','Chiapas')); await p.waitForTimeout(500);
    const edo = await p.evaluate(() => { const k = document.querySelector('#kpis .kc[disabled] .kc-d'); return [...document.querySelectorAll('#kpis .kc[disabled]')].map(e => e.textContent.trim()).join(' | '); });
    await p.evaluate(() => window.IANAMI_PULSO.verInd('cbp','Venezuela')); await p.waitForTimeout(700);
    const ven = await p.evaluate(() => +document.querySelector('.kc[data-k="cbp"] .kc-v').dataset.v);
    // pantalla completa: Encuentros en el combo de indicadores, con reparto por sector
    await p.evaluate(() => { window.IANAMI_PULSO.sala('pulso'); }); await p.waitForTimeout(1500);
    const sala = await p.evaluate(async () => { const o = document.querySelector('#sl-im [data-ind="cbp"]'); if (!o) return { combo:false }; o.click(); await new Promise(r => setTimeout(r, 1500));
      const s = document.querySelector('#sl-qt [data-por="s"]'); if (s) { s.click(); await new Promise(r => setTimeout(r, 800)); }
      return { combo:true, big:document.getElementById('sl-big').textContent, qt:document.getElementById('sl-qt').textContent, g:document.getElementById('sl-g').textContent.replace(/\s+/g,' ').slice(0,120) }; });
    await p.screenshot({path:__dirname+'/capturas/encuentros-sala-'+vw+'.png'});
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    if (!sala.combo || !/Sector/.test(sala.qt)) errs.push('sala '+vw);
    console.log(vw+'x'+vh, 'sala', JSON.stringify(sala));
    console.log(vw+'x'+vh, 'orden', orden.join(' → '), '| no caben', JSON.stringify(cabe), '| capa', JSON.stringify(capa), '| con Chiapas:', edo, '| Venezuela', ven);
    if (orden.join()!=='Recibidos,Repatriados,Encuentros' || cabe.length || capa.sectores<5 || Math.round(capa.total)!==Math.round(capa.kpi) || capa.boton || !/no aplica por O\.R\./.test(edo) || Math.round(ven)!==48092) errs.push('encuentros '+vw);
    await p.close(); }
  console.log('errores', JSON.stringify(errs)); await b.close(); })();
