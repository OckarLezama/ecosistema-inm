// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node tema_pantalla_completa.js
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path'); const dir=path.resolve(__dirname,'..');
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); const errs=[];
  const p=await (await b.newContext({viewport:{width:1440,height:900}, hasTouch:true})).newPage(); p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/*', r=>{ const u=r.request().url(); if(u.startsWith('file://')) return r.continue(); return r.abort(); });
  await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500);
  const vis = () => p.evaluate(()=>{ const b=document.querySelector('#m-her [data-a="tema"]'); return getComputedStyle(b).display!=='none'; });
  const herN = () => p.evaluate(()=>[...document.querySelectorAll('#m-her button')].filter(b=>getComputedStyle(b).display!=='none').length);
  console.log('Pulso: botón oscuro visible =', await vis(), '| botones', await herN());
  await p.click('[data-a="sala"]'); await p.waitForTimeout(1500);
  console.log('Sala: botón oscuro visible =', await vis(), '| botones', await herN());
  await p.click('#m-her [data-a="tema"]'); await p.waitForTimeout(800);
  console.log('Sala: tema =', await p.evaluate(()=>document.getElementById('mapa').dataset.m));
  await p.click('#sl-x'); await p.waitForTimeout(900);
  console.log('Pulso tras salir: tema =', await p.evaluate(()=>document.getElementById('mapa').dataset.m));
  console.log('errores', JSON.stringify(errs)); await b.close(); })();
