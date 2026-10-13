// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node play_ver_todo.js
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path'); const dir=path.resolve(__dirname,'..');
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); const errs=[];
  const p=await (await b.newContext({viewport:{width:1440,height:900}})).newPage(); p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/*', r=>{ const u=r.request().url(); if(u.startsWith('file://')) return r.continue(); return r.abort(); });
  await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500);
  console.log('ver todo oculto al inicio:', await p.evaluate(()=>document.getElementById('vertodo').hidden));
  const t0=Date.now(); await p.click('#play'); await p.waitForTimeout(3000); await p.click('#play');
  const dia = await p.evaluate(()=>document.getElementById('tgraf').getAttribute('aria-valuenow'));
  console.log('día tras 3 s:', dia, '| ver todo visible:', await p.evaluate(()=>!document.getElementById('vertodo').hidden));
  await p.screenshot({path:__dirname+'/capturas/p-pulso.png', clip:{x:0,y:480,width:1440,height:300}});
  await p.click('#vertodo'); await p.waitForTimeout(500);
  console.log('tras ver todo:', await p.evaluate(()=>document.getElementById('tgraf').getAttribute('aria-valuenow')+'/'+document.getElementById('tgraf').getAttribute('aria-valuemax')), '| oculto:', await p.evaluate(()=>document.getElementById('vertodo').hidden));
  console.log('errores', JSON.stringify(errs)); await b.close(); })();
