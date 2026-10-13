// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node pregunta_descargas.js
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path'); const dir=path.resolve(__dirname,'..');
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); const errs=[];
  const ctx = await b.newContext({viewport:{width:1366,height:900}, acceptDownloads:true}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
  await p.route('**/*', r=>{ const u=r.request().url();
    for (const [k,f] of [['echarts.min.js','echarts/dist/echarts.min.js'],['html2canvas.min.js','html2canvas/dist/html2canvas.min.js'],['jspdf.umd.min.js','jspdf/dist/jspdf.umd.min.js']]) if(u.includes(k)) return r.fulfill({body:fs.readFileSync(path.join(dir,'lib',path.basename(f))),contentType:'application/javascript'});
    if(u.startsWith('file://')) return r.continue(); return r.abort(); });
  await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500); await p.click('#b-consulta'); await p.waitForTimeout(300);
  const q = async t => { await p.evaluate(t => { document.getElementById('cq-q').value = t; document.getElementById('cq-f').requestSubmit(); }, t); await p.waitForTimeout(300); };
  const baja = async (acc, ruta) => { const [d] = await Promise.all([p.waitForEvent('download', {timeout:60000}), p.click('[data-cqacc="'+acc+'"]')]); await d.saveAs(ruta); return d.suggestedFilename()+' '+fs.statSync(ruta).size; };
  await q('de los rescatados cuántos fueron presentados y cuántos canalizados');
  console.log('pdf h', await baja('pdf', __dirname+'/capturas/c-h.pdf'));
  console.log('png h', await baja('img', __dirname+'/capturas/c-h.png'));
  await p.click('[data-cqfmt="v"]'); await p.waitForTimeout(200);
  console.log('png v', await baja('img', __dirname+'/capturas/c-v.png'));
  console.log('pdf v', await baja('pdf', __dirname+'/capturas/c-v.pdf'));
  // Ver en el tablero
  const ir = async (t, sel) => { await q(t); await p.click('[data-cqacc="ir"]'); await p.waitForTimeout(1800);
    return p.evaluate(() => [document.getElementById('cq').hidden, (document.querySelector('#vista-otra .rg-sub') || {innerText:''}).innerText.split('\n').slice(0,2).join(' / '), [...document.querySelectorAll('#vista-otra .tag-f')].map(x => x.textContent.replace('×','').trim()).join(', '), (document.querySelector('#vista-otra .rango b') || {}).textContent, (document.querySelector('#vista-otra .rg-vistas .on') || {}).textContent]); };
  const abre = async () => { await p.click('#b-consulta'); await p.waitForTimeout(300); };
  console.log('ir 1', JSON.stringify(await ir('rescatados de Venezuela en Chiapas en noviembre'))); await abre();
  console.log('ir 2', JSON.stringify(await ir('repatriados en Matamoros'))); await abre();
  console.log('ir 3', JSON.stringify(await ir('trámites de Cuba contra Haití'))); await abre();
  console.log('ir 4', JSON.stringify(await ir('NNA canalizados de Honduras'))); await abre();
  console.log('ir 5', JSON.stringify(await ir('internaciones aéreas de Colombia')));
  console.log('errores', JSON.stringify(errs)); await b.close(); })();
