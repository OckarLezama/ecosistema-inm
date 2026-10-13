// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node circulos_mapa.js
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path'); const dir=path.resolve(__dirname,'..');
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); const errs=[];
  const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage(); p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/*', r=>{ const u=r.request().url(); if(u.startsWith('file://')) return r.continue(); return r.abort(); });
  await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500);
  const cir = () => p.evaluate(()=>{ const o=echarts.getInstanceByDom(document.getElementById('lienzo')).getOption(); const ch=echarts.getInstanceByDom(document.getElementById('lienzo')); return ['bub','lat'].map(id=>{ const m=ch.getModel().getSeries().find(s=>s.id===id); const dt=m.getData(); const l=[]; for(let i=0;i<Math.min(4,dt.count());i++) l.push(Math.round(dt.getItemVisual(i,'symbolSize'))); return id+':'+dt.count()+' tam '+l.join(','); }).join(' | '); });
  console.log('inicio', await cir());
  await p.fill('#buscar','venez'); await p.waitForTimeout(150); await p.keyboard.press('Enter'); await p.waitForTimeout(3000);
  console.log('Pulso tras buscar', await cir()); await p.screenshot({path:__dirname+'/capturas/c1.png'});
  await p.click('[data-a="sala"]'); await p.waitForTimeout(3000);
  console.log('sala al entrar', await cir());
  await p.fill('#sl-q','colom'); await p.waitForTimeout(150); await p.keyboard.press('Enter'); await p.waitForTimeout(3000);
  console.log('sala tras buscar', await cir());
  console.log('errores', JSON.stringify(errs)); await b.close(); })();
