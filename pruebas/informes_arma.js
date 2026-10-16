// Prueba automática de IA-NAMI. Ejecutar desde la carpeta pruebas: node informes_arma.js
// Informes › Arma tu informe: el menú abre la página; tocar un concepto arma la lámina y sus cifras cuadran con las bases;
// comparar, cambiar punto/estado y periodo funcionan; el buscador encuentra estados y entiende frases; «Mi informe» no repite
// láminas, presenta portada + láminas + narrativa, y la liga compartida reabre el informe. En escritorio, tableta y celular.
const { chromium } = require('playwright'); const path = require('path'); const dir = path.resolve(__dirname, '..');
global.window = {}; global.document = { getElementById(){ return null; } };
for (const f of ['datos.js','control.js','proteccion.js','regulacion.js','vocabulario.js']) require(dir+'/datos/'+f);
require(dir+'/js/consulta.js'); const M = window.IANAMI_MOTOR;
const T = (k, a, b, f) => M.total({ ind:M.INDK[k], d0:a, d1:b, filtros:f || {} }), miles = n => Math.round(n).toLocaleString('en-US');
const fin = k => M.finBase(M.BASES[M.INDK[k].b]);
(async () => { const b = await chromium.launch({ executablePath:process.env.CHROMIUM || undefined }); const errs = []; let mal = 0; const ok = (c, t) => { if (!c){ mal++; console.log('  MAL: '+t); } };
  let liga = null;
  for (const [w,h] of [[1600,900],[1180,820],[400,860]]){
    const ctx = await b.newContext({ viewport:{ width:w, height:h } }), p = await ctx.newPage(); p.on('pageerror', e => errs.push(w+': '+e.message));
    await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
    await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500);
    await p.click('[data-menu-inf]'); await p.waitForTimeout(300); await p.click('[data-inf="arma"]'); await p.waitForSelector('.ar-cb', { timeout:90000 });
    ok(await p.$$eval('.ar-cb', l => l.length)>=10, w+' conceptos por área');
    // rescatados: año en curso contra el año pasado al mismo día
    await p.click('[data-ark="resc"]'); await p.waitForSelector('.ar-kc', { timeout:30000 }); await p.waitForTimeout(800);
    const y = fin('resc').slice(0,4), V = T('resc', y+'-01-01', fin('resc')), W = T('resc', (y-1)+'-01-01', (y-1)+fin('resc').slice(4));
    const k1 = await p.$eval('.ar-kc', e => e.innerText); ok(k1.indexOf(miles(V))>=0 && k1.indexOf(miles(W))>=0, w+' total del año y del año pasado = base ('+miles(V)+' / '+miles(W)+')');
    ok(await p.evaluate(() => [...document.querySelectorAll('#ar-lam .ar-gr')].every(e => echarts.getInstanceByDom(e))), w+' gráficas de la lámina dibujadas');
    // agregar dos veces no repite
    await p.click('#ar-add'); await p.click('#ar-add'); ok((await p.$$('.ar-th')).length===1, w+' la misma lámina no se repite en Mi informe');
    // repatriados por estado
    await p.click('[data-ark="rep"]'); await p.waitForTimeout(800); await p.click('[data-o="iA"][data-v="1"]'); await p.waitForTimeout(800);
    ok(/O\.R\./.test(await p.$eval('#ar-lam .ar-box .ar-h', e => e.innerText).catch(() => '')) || /O\.R\./.test(await p.$eval('#ar-lam', e => e.innerText)), w+' repatriados se pueden ver por estado (O.R.)');
    // un mes: compara contra el mismo mes del año pasado
    await p.click('[data-pop="p"]'); await p.waitForTimeout(300); await p.click('.ar-mg [data-o="p"]'); await p.waitForTimeout(800);
    ok(/contra enero 2025/.test(await p.$eval('[data-pop="cmp"]', e => e.textContent)), w+' enero se compara contra enero del año pasado');
    await p.click('#ar-add');
    // buscador: estado y frase
    await p.fill('#ar-q', 'pue'); await p.waitForTimeout(300); ok(/Puebla/.test(await p.$eval('#ar-dd', e => e.innerText)), w+' el buscador encuentra Puebla');
    await p.fill('#ar-q', 'rescatados cubanos en chiapas este año'); await p.waitForTimeout(400); ok(/Rescatados de Cuba en Chiapas/.test(await p.$eval('#ar-dd', e => e.innerText)), w+' entiende la frase completa');
    await p.keyboard.press('Enter'); await p.waitForTimeout(800); ok(/Cuba/.test(await p.$eval('#ar-lam h2', e => e.innerText)), w+' la frase arma su lámina');
    // presentar: portada, láminas y narrativa
    await p.click('#ar-pres'); await p.waitForTimeout(800); ok(/Lámina 1 de 4/.test(await p.$eval('#ar-vt', e => e.textContent)), w+' portada + 2 láminas + narrativa');
    ok(await p.evaluate(() => !!document.querySelector('#ar-fr .ar-cvp')), w+' la primera lámina es la portada');
    await p.keyboard.press('End'); for (let i=0;i<3;i++){ await p.keyboard.press('ArrowRight'); await p.waitForTimeout(250); }
    ok(await p.evaluate(() => document.querySelectorAll('#ar-fr .ar-cvn li b').length>=4), w+' cierra con la narrativa (frases con cifras)');
    ok(await p.evaluate(() => { const f = document.getElementById('ar-fr'), r = f.getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth+1 && r.top>=0 && r.bottom<=innerHeight+1; }), w+' la lámina presentada cabe completa en la pantalla');
    await p.click('#ar-vx');
    if (w===1600) liga = await p.evaluate(() => { const PR = window.IANAMI_ARMA._prueba.PR; return '?arma='+encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify({ t:'Prueba', l:PR }))))); });
    await p.screenshot({ path:path.join(__dirname,'capturas','arma-'+w+'.png') });
    await ctx.close();
  }
  { const p = await (await b.newContext({ viewport:{ width:1366, height:1024 } })).newPage(); p.on('pageerror', e => errs.push('liga: '+e.message));
    await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
    await p.goto('file://'+dir+'/index.html'+liga); await p.waitForSelector('.ar-th', { timeout:90000 });
    ok((await p.$$('.ar-th')).length===2 && await p.$eval('#ar-tit', e => e.value)==='Prueba', 'la liga compartida reabre Mi informe'); }
  console.log(mal ? 'con problemas '+mal : 'todo bien'); console.log('errores', JSON.stringify(errs)); await b.close(); })();
