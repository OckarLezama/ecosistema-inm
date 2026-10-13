// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node indices_pais.js
// Sustituye datos/indices.js por valores DE PRUEBA (no reales) y revisa que el país muestre sus índices en la ficha,
// en Contexto y en pantalla completa; y que sin datos no aparezca nada.
const { chromium } = require('playwright'); const path=require('path'); const dir=path.resolve(__dirname,'..');
const FALSO = 'window.IANAMI_IDX = '+JSON.stringify({ gen:'prueba', ind:{
  idh:{n:'Índice de Desarrollo Humano',c:'IDH',esc:'0 a 1',mejor:1,f:'PNUD (PRUEBA)',u:'https://hdr.undp.org/data-center',nota:'Valores de prueba.'},
  ief:{n:'Índice de Estados Frágiles',c:'IEF',esc:'0 a 120',mejor:-1,f:'Fund for Peace (PRUEBA)',u:'https://fragilestatesindex.org/',nota:'Valores de prueba.'} },
  p:{ '862':{ idh:[[2018,0.73],[2020,0.70],[2022,0.69]], ief:[[2018,88.1],[2024,92.0]] } } })+';';
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); const errs=[];
  for (const falso of [true,false]){
    const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage(); p.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
    await p.route('**/*', r=>{ const u=r.request().url(); if (falso && u.indexOf('datos/indices.js')>=0) return r.fulfill({contentType:'text/javascript', body:FALSO}); if(u.startsWith('file://')) return r.continue(); return r.abort(); });
    await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500);
    await p.evaluate(() => IANAMI_PULSO.verNat('Venezuela', 'resc')); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => ({ ficha:!!document.querySelector('#ficha:not([hidden]) .fi-ix'), ctx:document.querySelectorAll('.ctx-ix .ix-f').length }));
    console.log(falso ? 'con datos de prueba:' : 'sin datos:', JSON.stringify(r));
    if (falso && (!r.ficha || r.ctx!==2)) errs.push('no aparecen los índices'); if (!falso && (r.ficha || r.ctx)) errs.push('aparecen índices sin datos');
    if (falso){ await p.screenshot({path:__dirname+'/capturas/indices-ficha.png'}); const c = await p.$('.ctx-ix'); if (c){ await c.scrollIntoViewIfNeeded(); await c.screenshot({path:__dirname+'/capturas/indices-contexto.png'}); }
      await p.evaluate(() => IANAMI_PULSO.sala('pulso')); await p.waitForTimeout(2500);
      await p.evaluate(() => { const i = document.getElementById('sl-q'); i.value = 'Venezuela'; i.dispatchEvent(new Event('input')); }); await p.waitForTimeout(300); await p.keyboard.press('Enter').catch(()=>{});
      await p.evaluate(() => document.getElementById('sl-q').dispatchEvent(new KeyboardEvent('keydown', {key:'Enter'}))); await p.waitForTimeout(2500);
      const s = await p.evaluate(() => !!document.querySelector('#ficha:not([hidden]) .fi-ix')); console.log('pantalla completa:', s); if (!s) errs.push('sin índices en pantalla completa');
      await p.screenshot({path:__dirname+'/capturas/indices-sala.png'}); }
    await p.close(); }
  console.log('errores', JSON.stringify(errs)); await b.close(); })();
