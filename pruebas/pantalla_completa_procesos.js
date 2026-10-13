// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node pantalla_completa_control.js
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path'); const dir=path.resolve(__dirname,'..');

const FONTS='';
const W=+process.argv[2]||1600, H=+process.argv[3]||900;
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); const errs=[];
  const p=await (await b.newContext({viewport:{width:W,height:H}})).newPage(); p.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
  await p.route('**/*', r=>{ const u=r.request().url(); if(u.startsWith('file://')) return r.continue(); return r.abort(); });
  await p.goto('file://'+dir+'/index.html'); await p.evaluate(()=>Promise.all(['900 20px "Big Shoulders Display"','700 13px "Barlow Condensed"','500 13px Barlow'].map(f=>document.fonts.load(f)))); await p.waitForTimeout(1200);
  await p.evaluate(pr=>IANAMI_NAV.ir(pr,{}), process.env.PROC||'control'); await p.waitForTimeout(1200);
  await p.click('[data-cvsala],[data-rsala]'); await p.waitForTimeout(2800); await p.screenshot({path:__dirname+'/capturas/'+(process.env.PROC||'control')+'-pan-'+W+'.png'});
  for (const k of (process.env.PROC==='regulacion' ? ['tram','co','va'] : ['ing','rech','pres','ret'])){ await p.click('#sl-indb'); await p.waitForTimeout(150); await p.click('#sl-im [data-ind="'+k+'"]'); await p.waitForTimeout(1300); await p.screenshot({path:__dirname+'/capturas/k-'+k+'-'+W+'.png'}); }
  await p.click('.sl-por [data-por="p"]').catch(()=>{}); 
  if (process.env.PROC!=='regulacion'){ await p.click('#sl-indb'); await p.click('#sl-im [data-ind="ing"]'); await p.waitForTimeout(500); await p.click('.sl-por [data-por="p"]').catch(()=>console.log('sin selector punto')); await p.waitForTimeout(900); await p.screenshot({path:__dirname+'/capturas/k-ingp-'+W+'.png'}); }
  await p.keyboard.press('Escape'); await p.waitForTimeout(800);
  console.log('al salir:', await p.evaluate(()=>[document.getElementById('vista-pulso').hidden, document.getElementById('vista-otra').hidden, !!document.querySelector('.cv h1'), document.querySelector('.cv h1') && document.querySelector('.cv h1').textContent.trim().slice(0,20)].join(' | ')));
  console.log('errores', JSON.stringify(errs)); await b.close(); })();
