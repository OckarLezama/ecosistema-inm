// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node paises_ficha_contexto.js
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path'); const dir=path.resolve(__dirname,'..');
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); const errs=[];
  const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage(); p.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
  await p.route('**/*', r=>{ const u=r.request().url(); if(u.startsWith('file://')) return r.continue(); return r.abort(); });
  await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500);
  const px = (lon,lat) => p.evaluate(([a,b])=>{ const ch=echarts.getInstanceByDom(document.getElementById('lienzo')); const q=ch.convertToPixel('geo',[a,b]); const r=document.getElementById('lienzo').getBoundingClientRect(); return [q[0]+r.left, q[1]+r.top]; }, [lon,lat]);
  const chips = () => p.evaluate(()=>document.getElementById('chips').textContent);
  // hover y clic en un país sin círculo: Argentina
  let q = await px(-64,-34); await p.mouse.move(q[0], q[1]); await p.waitForTimeout(400);
  console.log('hover Argentina:', await p.evaluate(()=>{ const t=[...document.querySelectorAll('div')].find(d=>d.style && /z-index: 9999/.test(d.getAttribute('style')||'') && d.offsetParent); return t ? t.innerText.replace(/\s+/g,' ').slice(0,120) : '(sin tarjeta)'; }));
  await p.mouse.click(q[0], q[1]); await p.waitForTimeout(2500); console.log('clic Argentina → filtro:', await chips(), '| ficha:', await p.evaluate(()=>{ const f=document.getElementById('ficha'); return f && !f.hidden ? f.innerText.replace(/\s+/g,' ') : '(sin ficha)'; }));
  await p.screenshot({path:__dirname+'/capturas/f-arg.png'});
  // estado: clic y segundo clic lo quita
  q = await px(-92.6,16.5); await p.mouse.click(q[0], q[1]); await p.waitForTimeout(800); console.log('clic Chiapas:', await chips());
  q = await px(-120,0); await p.mouse.click(q[0], q[1]); await p.waitForTimeout(800); console.log('clic en el mar:', JSON.stringify(await chips()));
  q = await px(-92.6,16.5); await p.mouse.click(q[0], q[1]); await p.waitForTimeout(800); console.log('segundo clic:', JSON.stringify(await chips()));
  // contexto de Venezuela y de un país sin eventos
  await p.fill('#buscar','venez'); await p.waitForTimeout(150); await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
  console.log('contexto Venezuela:', await p.evaluate(()=>{ const c=[...document.querySelectorAll('#bajo .caja')].find(x=>/Contexto/.test(x.textContent)); return c ? c.innerText.replace(/\s+/g,' ').slice(0,400) : 'no hay'; }));
  await p.screenshot({path:__dirname+'/capturas/f-ven.png'});
  await p.fill('#buscar','canad'); await p.waitForTimeout(150); await p.keyboard.press('Enter'); await p.waitForTimeout(1800);
  console.log('contexto Canadá:', await p.evaluate(()=>[...document.querySelectorAll('#bajo .caja')].some(x=>/Contexto/.test(x.textContent)) ? 'aparece' : 'no aparece'));
  // pantalla completa: números animados al entrar
  await p.click('[data-a="sala"]'); await p.waitForTimeout(500); const v1 = await p.evaluate(()=>document.querySelector('.sl-tr .v, #sl-big').textContent); await p.waitForTimeout(1500); const v2 = await p.evaluate(()=>document.querySelector('.sl-tr .v, #sl-big').textContent);
  console.log('cifra al entrar:', v1, '→', v2);
  console.log('errores', JSON.stringify(errs)); await b.close(); })();
