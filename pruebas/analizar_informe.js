// Prueba automática de IA-NAMI. Ejecutar desde la carpeta pruebas: node analizar_informe.js
// Analizar: el informe semanal arma sus láminas sin errores y sus cifras cuadran con las bases (CBP, rescates, repatriados, recibidos);
// se cambia de lámina con flechas, puntos, teclado y deslizando; los hallazgos se abren; la liga compartida abre el mismo informe;
// el análisis por texto y el armador (conceptos, nacionalidades, periodos) generan láminas. En escritorio, tableta y celular.
const { chromium } = require('playwright'); const path = require('path'); const dir = path.resolve(__dirname, '..');
global.window = {}; global.document = { getElementById(){ return null; } };
for (const f of ['datos.js','control.js','proteccion.js','regulacion.js','vocabulario.js']) require(dir+'/datos/'+f);
require(dir+'/js/consulta.js'); const M = window.IANAMI_MOTOR;
const V = (k, p, a, b) => { const ind = M.INDK[k]; return M.total(Object.assign({ ind, d0:a, d1:b }, p ? M.medParte(ind, M.parteDe(ind, p)) : {})); };
const miles = n => Math.round(n).toLocaleString('en-US');
(async () => { const b = await chromium.launch({ executablePath:process.env.CHROMIUM || undefined }); const errs = []; let mal = 0; const ok = (c, t) => { if (!c){ mal++; console.log('  MAL: '+t); } };
  for (const [w,h] of [[1600,900],[1180,820],[400,860]]){
    const p = await (await b.newContext({ viewport:{ width:w, height:h } })).newPage(); p.on('pageerror', e => errs.push(w+': '+e.message));
    await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
    await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500);
    await p.evaluate(() => { const x = [...document.querySelectorAll('button, a')].find(e => e.textContent.trim()==='Analizar'); if (x) x.click(); });
    await p.waitForSelector('[data-angen]', { timeout:90000 });
    const [a, z] = (await p.$eval('#an-sem', s => s.value)).split('_');
    ok(new Date(a+'T00:00:00').getDay()===1 && new Date(z+'T00:00:00').getDay()===0, w+' la semana va de lunes a domingo ('+a+' – '+z+')');
    await p.click('[data-angen]'); await p.waitForSelector('.inf-sl', { timeout:30000 }); await p.waitForTimeout(800);
    const n = await p.$$eval('.inf-sl', l => l.length); ok(n===8, w+' informe con 8 láminas ('+n+')');
    const txt = await p.$eval('.inf-sl[data-i="1"]', e => e.innerText), cbp = V('cbp', null, a, z), mx = V('cbp', 'mx', a, z);
    ok(txt.indexOf(miles(cbp))>=0 && txt.indexOf(miles(mx))>=0, w+' encuentros CBP de la semana = base ('+miles(cbp)+', MEX '+miles(mx)+')');
    const t5 = await p.$eval('.inf-sl[data-i="5"]', e => e.innerText); ok(t5.indexOf(miles(V('resc', 'pv', a, z)))>=0 && t5.indexOf(miles(V('resc', 'rei', a, z)))>=0, w+' rescates primera vez y reincidencia = base');
    const t3 = await p.$eval('.inf-sl[data-i="3"]', e => e.innerText); ok(t3.indexOf(miles(V('rep', null, a, z)+V('rec', null, a, z)))>=0, w+' recibidos de EE. UU. = repatriados + extranjeros recibidos');
    ok(await p.evaluate(() => [...document.querySelectorAll('.inf-gr')].every(e => echarts.getInstanceByDom(e))), w+' todas las gráficas dibujadas');
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(700); ok(await p.$eval('.inf-sl.activa', e => e.dataset.i)==='1', w+' flecha del teclado avanza');
    const st = await (await p.$('#inf-st')).boundingBox(); await p.mouse.move(st.x+st.width*0.75, st.y+st.height/2); await p.mouse.down(); await p.mouse.move(st.x+st.width*0.25, st.y+st.height/2, { steps:6 }); await p.mouse.up(); await p.waitForTimeout(700);
    ok(await p.$eval('.inf-sl.activa', e => e.dataset.i)==='2', w+' deslizar avanza a la siguiente lámina');
    await p.click('.inf-sl.activa [data-infhz]'); await p.waitForTimeout(600); ok(await p.$eval('.inf-sl.activa .inf-hz', e => !e.hidden && e.querySelectorAll('li').length>0), w+' los hallazgos se abren');
    await p.click('.inf-pt [data-infir="7"]'); await p.waitForTimeout(700); ok(await p.$eval('.inf-sl.activa', e => e.dataset.i)==='7', w+' los puntos llevan a una lámina');
    ok(await p.evaluate(() => { const s = document.getElementById('inf-st'); return s.offsetWidth/s.offsetHeight>1.76 && s.offsetWidth/s.offsetHeight<1.79 && s.offsetWidth<=innerWidth; }), w+' lámina 16:9 dentro de la pantalla');
await p.click('[data-infx]'); await p.waitForTimeout(400);
    // análisis por texto y armador
    await p.fill('#an-txt', 'rescatados de Venezuela y Cuba 2026 contra 2025'); await p.click('.an-q button'); await p.waitForSelector('.inf-sl', { timeout:30000 }); await p.waitForTimeout(600);
    const k = await p.$$eval('.inf-an-k', l => l.length); ok(k===4, w+' 2 nacionalidades × 2 años = 4 tarjetas ('+k+')');
    await p.click('[data-infx]'); await p.waitForTimeout(300);
    await p.evaluate(() => { const s = document.getElementById('an-c'); s.value = 'rep'; s.dispatchEvent(new Event('change', { bubbles:true })); });
    await p.click('[data-anper="trump"]'); await p.click('[data-ancmp="no"]'); await p.click('[data-anver]'); await p.waitForSelector('.inf-sl', { timeout:30000 }); await p.waitForTimeout(600);
    ok(await p.$$eval('.inf-an-k', l => l.length)>=1 && await p.evaluate(() => !!echarts.getInstanceByDom(document.getElementById('g-an-t'))), w+' el armador genera el análisis con su gráfica');
    await p.click('[data-infx]');
    await p.screenshot({ path:path.join(__dirname,'capturas','analizar-'+w+'.png') });
  }
  // liga compartida: abre el mismo informe
  { const p = await (await b.newContext({ viewport:{ width:1366, height:1024 } })).newPage(); p.on('pageerror', e => errs.push('liga: '+e.message));
    await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
    await p.goto('file://'+dir+'/index.html?informe=2026-09-28_2026-10-04&ref=anio'); await p.waitForSelector('.inf-sl', { timeout:90000 });
    ok(/28 sep – 4 oct 2026/.test(await p.$eval('.inf-ctl-t', e => e.textContent)), 'la liga compartida abre la semana pedida'); }
  console.log(mal ? 'con problemas '+mal : 'todo bien'); console.log('errores', JSON.stringify(errs)); await b.close(); })();
