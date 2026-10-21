// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node ingresos_total.js
// Ingresos = extranjeros + mexicanos (oct 2026) en toda la plataforma: el motor cuadra con el robot y con sus partes, y cada vista
// (Pulso, Infografía, Control › Ingresos, Arma tu informe, Vista tablet, Pregunta a INAMI) muestra el total y dice cuántos son extranjeros y cuántos mexicanos.
// El % de rechazo se sigue midiendo solo contra extranjeros, y México no entra al ranking de países.
const { chromium } = require('playwright'); const path = require('path'); const dir = path.resolve(__dirname, '..');
global.window = {}; global.document = { getElementById(){ return null; } };
for (const f of ['datos.js','control.js','proteccion.js','regulacion.js','vocabulario.js']) require(dir+'/datos/'+f);
require(dir+'/js/consulta.js'); const M = window.IANAMI_MOTOR, D = window.IANAMI_DATOS;
const T = (k, a, b, f) => M.total({ ind:M.INDK[k], d0:a, d1:b, filtros:f || {} }), miles = n => Math.round(n).toLocaleString('en-US');
const ini = D.inicio, fin = M.finBase(M.BASES[M.INDK.ing.b]);
let mal = 0; const errs = [], ok = (c, t) => { if (!c){ mal++; console.log('  MAL: '+t); } else console.log('  bien: '+t); };
// 1. motor contra robot y contra sus partes
const tot = T('ing', ini, fin), ext = T('ingext', ini, fin), mx = T('ingmx', ini, fin), rob = D.daily.ing.slice(0, M.BASES.ing.dias).reduce((a, x) => a+x, 0), robMx = D.daily.ing_mx.slice(0, M.BASES.ing.dias).reduce((a, x) => a+x, 0);
ok(Math.abs(tot-(ext+mx))<1, 'motor: ingresos = extranjeros + mexicanos ('+miles(tot)+' = '+miles(ext)+' + '+miles(mx)+')');
ok(Math.abs(tot-rob)<1 && Math.abs(mx-robMx)<1, 'motor = robot (Control y Pulso leen lo mismo): '+miles(rob)+' / mexicanos '+miles(robMx));
const nat = M.porDim({ ind:M.INDK.ing, d0:ini, d1:fin, filtros:{} }, 'n'), MXi = M.BASES.ing.dims.n.vals.indexOf('México');
ok(nat.every(([i]) => i!==MXi) && nat.length>20, 'ranking por país sin México');
const via = ['aer','ter','mar'].map(p => M.total(Object.assign({ ind:M.INDK.ing, d0:ini, d1:fin, filtros:{} }, M.medParte(M.INDK.ing, M.parteDe(M.INDK.ing, p))))).reduce((a, x) => a+x, 0);
ok(Math.abs(via-tot)<1, 'vías aérea + terrestre + marítima = total');
(async () => { const b = await chromium.launch({ executablePath:process.env.CHROMIUM || undefined });
  const p = await (await b.newContext({ viewport:{ width:1600, height:900 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
  await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1800);
  // 2. Pulso: ayuda de la tarjeta
  await p.hover('.kc[data-k="ing"]'); await p.waitForTimeout(700);
  const tip = await p.evaluate(() => { const e = [...document.querySelectorAll('.tip-tot')].find(x => x.offsetParent); return e ? e.innerText : ''; });
  const nums = (tip.match(/[\d,]{4,}/g) || []).map(x => +x.replace(/,/g, ''));
  ok(/extranjeros/.test(tip) && /mexicanos/.test(tip) && nums.length>=3 && Math.abs(nums[0]-(nums[1]+nums[2]))<=1, 'Pulso: «Ingresaron al país X: extranjeros + mexicanos» cuadra ('+tip.replace(/\s+/g, ' ').slice(0, 110)+')');
  ok(await p.$eval('.kc[data-k="ing"]', e => /extranjeros y mexicanos/.test(e.innerText)), 'Pulso: la tarjeta dice «extranjeros y mexicanos»');
  // 3. Control › Ingresos
  await p.evaluate(() => IANAMI_NAV.ir('control', { vista:'int' })); await p.waitForTimeout(2500);
  const cp = await p.$eval('.cv-totpais', e => e.innerText).catch(() => '');
  ok(/extranjeros/.test(cp) && /mexicanos/.test(cp) && /solo sobre extranjeros/.test(cp), 'Control: total con extranjeros y mexicanos, y aclara la base del % de rechazo');
  const kp = await p.$eval('#cv-kpis', e => e.innerText).catch(() => '');
  ok(/Ingresos \(extranjeros y mexicanos\)/i.test(kp) && /de los extranjeros que llegan/i.test(kp), 'Control: tarjetas «Ingresos (extranjeros y mexicanos)» y «% rechazado de los extranjeros que llegan»');
  await p.click('[data-cdet]'); await p.waitForTimeout(1500);
  const tt = await p.evaluate(() => { const c = echarts.getInstanceByDom(document.getElementById('cv-tt')); const o = c && c.getOption(); return o ? JSON.stringify((o.yAxis || []).concat(o.xAxis || []).map(a => a.data || [])) : ''; });
  ok(tt.length>20 && /Venezuela|Guatemala|EE\. UU\./.test(tt) && !/México/.test(tt), 'Control: totales por nacionalidad sin México');
  // 4. Infografía de Control: ingresos
  await p.click('[data-cvsala]'); await p.waitForTimeout(2800); await p.click('#sl-indb'); await p.waitForTimeout(200); await p.click('#sl-im [data-ind="ing"]'); await p.waitForTimeout(1500);
  const dl = await p.$eval('#sl-dl', e => e.innerText), fr = await p.$eval('#sl-fr', e => e.innerText), cap = await p.$eval('#sl-cap', e => e.innerText);
  ok(/extranjeros y .* mexicanos/.test(dl) && /extranjeros y .* mexicanos/.test(fr) && /Ingresos al país/i.test(cap), 'Infografía: cifra, desglose y frase dicen extranjeros y mexicanos ('+fr.slice(0, 120)+')');
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  // 5. Arma tu informe
  await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500);
  await p.click('[data-menu-inf]'); await p.waitForTimeout(300); await p.click('[data-inf="arma"]'); await p.waitForSelector('.ar-cb', { timeout:90000 });
  await p.click('[data-ark="ing"]'); await p.waitForSelector('.ar-kc', { timeout:30000 }); await p.waitForTimeout(900);
  const ks = await p.$$eval('.ar-kc', l => l.map(e => e.innerText.replace(/\s+/g, ' ')));
  const kx = ks.find(x => /Extranjeros y mexicanos/.test(x)) || '', kt = ks[0] || '', n2 = (kx.match(/[\d,]{3,}/g) || []).map(x => +x.replace(/,/g, '')), n1 = [Math.max(...(kt.match(/\d{1,3}(,\d{3})+/g) || ['0']).map(x => +x.replace(/,/g, '')))];
  ok(n2.length>=2 && n1[0]>0 && Math.abs(n1[0]-(n2[0]+n2[1]))<=1, 'Arma tu informe: total = extranjeros + mexicanos ('+kx.slice(0, 90)+')');
  const hz = await p.evaluate(() => (document.querySelector('#ar-lam') || document.body).innerText);
  ok(!/Primer lugar · país\s*México/.test(hz.replace(/\n/g, ' ')), 'Arma tu informe: México no sale como primer lugar por país');
  // 6. Vista tablet
  await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500);
  await p.dblclick('#b-vz'); const vz = s => p.locator('#vistazo').locator(s); await vz('.ch').first().waitFor({ timeout:60000 }); await p.waitForTimeout(2200);
  await vz('.ch[data-i="0"]').click(); await p.waitForTimeout(1500);
  const ti = await vz('#sh').innerText(); ok(/Extranjeros · mexicanos/i.test(ti) && /\d+% · \d+%/.test(ti), 'Vista tablet: la hoja de Ingresos dice cuántos son extranjeros y cuántos mexicanos');
  await p.keyboard.press('Escape').catch(() => {});
  // 7. Pregunta a INAMI
  await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500); await p.click('#b-consulta'); await p.waitForSelector('#cq-q', { timeout:120000 });
  for (const [q, k] of [['ingresos 2026', 'ing'], ['ingresos de extranjeros 2026', 'ingext'], ['mexicanos que ingresaron 2026', 'ingmx']]){
    await p.evaluate(t => { document.getElementById('cq-q').value = t; document.getElementById('cq-f').requestSubmit(); }, q); await p.waitForTimeout(900);
    const h = await p.$eval('.cq-hoja', e => e.innerText).catch(() => ''), v = T(k, '2026-01-01', fin);
    ok(h.indexOf(miles(v))>=0 && (k!=='ing' || (/Extranjeros/.test(h) && /Mexicanos/.test(h))), 'Pregunta «'+q+'» = '+miles(v)+(k==='ing' ? ', con extranjeros y mexicanos' : '')); }
  console.log('con problemas', mal); console.log('errores', JSON.stringify(errs)); await b.close(); })();
