// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node tarjeta_desglose.js
// Pulso: la cifra de cada tarjeta es igual a la suma de su desglose en la ayuda (ingresos = extranjeros + mexicanos;
// rescatados = 1.ª vez + reincidentes; trámites = expiden + no expiden; encuentros = otros países + mexicanos).
const { chromium } = require('playwright'); const path = require('path'); const dir = path.resolve(__dirname, '..');
const n = s => +String(s).replace(/,/g, '');
(async () => { const b = await chromium.launch({ executablePath:process.env.CHROMIUM || undefined }); const errs = []; let mal = 0; const ok = (c, t) => { if (!c){ mal++; console.log('  MAL: '+t); } else console.log('  bien: '+t); };
  const p = await (await b.newContext({ viewport:{ width:1600, height:950 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
  await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(2000);
  const tip = async k => { await p.hover('.kc[data-k="'+k+'"]'); await p.waitForTimeout(500); return p.$eval('#kpi-tip', e => e.innerText.replace(/\s+/g, ' ')); };
  const card = async k => n((await p.$eval('.kc[data-k="'+k+'"]', e => e.innerText)).match(/\d{1,3}(,\d{3})+|\d+/)[0]);
  let t = await tip('resc'), m = t.match(/Eventos: ([\d,]+) · personas \(1ra vez\): ([\d,]+) · reincidentes: ([\d,]+)/), c = await card('resc');
  ok(m && n(m[1])===c && n(m[2])+n(m[3])===c, 'rescatados: tarjeta '+c+' = eventos = 1.ª vez + reincidentes'+(m ? ' ('+m.slice(1).join(' / ')+')' : ''));
  t = await tip('tram'); m = t.match(/Expiden tarjetas: ([\d,]+) · no expiden: ([\d,]+)/); c = await card('tram');
  ok(m && n(m[1])+n(m[2])===c, 'trámites: tarjeta '+c+' = expiden + no expiden');
  t = await tip('ing'); m = t.match(/Ingresaron al país ([\d,]+) personas: extranjeros ([\d,]+) .* mexicanos ([\d,]+)/);
  ok(m && n(m[1])===n(m[2])+n(m[3]), 'ingresos: total = extranjeros + mexicanos');
  t = await tip('cbp'); m = t.match(/Encuentros ([\d,]+): otros países ([\d,]+) .* mexicanos ([\d,]+)/); c = await card('cbp');
  ok(m && n(m[1])===c && n(m[2])+n(m[3])===c, 'encuentros: tarjeta '+c+' = otros países + mexicanos');
  console.log('con problemas', mal); console.log('errores', JSON.stringify(errs)); await b.close(); })();
